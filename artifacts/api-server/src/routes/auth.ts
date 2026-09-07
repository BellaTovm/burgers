import { Router, type IRouter, type Response } from "express";
import type { Profile } from "@workspace/api-zod";
import { LogInBody, RefreshSessionBody, SignUpBody } from "@workspace/api-zod";
import {
  getSupabaseClient,
  getSupabaseCredentials,
  getUserScopedClient,
  SupabaseConfigurationError,
} from "../lib/supabase";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

function sendSupabaseError(res: Response, error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "Supabase request failed.";
  res.status(400).json({ error: message });
}

/**
 * Reads the caller's own profile row.
 *
 * There is no insert fallback: `handle_new_user()` is an AFTER INSERT trigger
 * on auth.users, so a profile already exists by the time signup returns. The
 * previous insert-on-miss path could never succeed anyway — `profiles` has no
 * INSERT policy, so RLS rejected it and login failed with a 401.
 */
async function loadProfile(accessToken: string, userId: string) {
  const { data, error } = await getUserScopedClient(accessToken)
    .from("profiles")
    .select("id, email, role")
    .eq("id", userId)
    .maybeSingle<Profile>();

  if (error) throw error;
  return data;
}

router.post("/auth/signup", async (req, res) => {
  const parsed = SignUpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Enter a valid email and a password of at least 6 characters.",
    });
    return;
  }

  try {
    const { data, error } = await getSupabaseClient().auth.signUp(parsed.data);
    if (error) {
      sendSupabaseError(res, error);
      return;
    }

    // With email confirmation enabled, Supabase returns no session and the
    // user must verify before signing in.
    if (!data.user || !data.session) {
      res.status(201).json({
        access_token: "",
        refresh_token: "",
        expires_at: null,
        user: { id: data.user?.id ?? "", email: data.user?.email ?? null },
        profile: {
          id: data.user?.id ?? "",
          email: data.user?.email ?? parsed.data.email,
          role: "customer",
        },
      });
      return;
    }

    const profile = await loadProfile(data.session.access_token, data.user.id);
    if (!profile) {
      req.log.error({ userId: data.user.id }, "Profile missing after signup");
      res.status(500).json({ error: "Your account was created but its profile is missing." });
      return;
    }

    res.status(201).json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at ?? null,
      user: { id: data.user.id, email: data.user.email ?? null },
      profile,
    });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      res.status(503).json({ error: error.message });
      return;
    }
    req.log.error({ err: error }, "Signup failed");
    sendSupabaseError(res, error);
  }
});

router.post("/auth/login", async (req, res) => {
  const parsed = LogInBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid email and password." });
    return;
  }

  try {
    const { data, error } =
      await getSupabaseClient().auth.signInWithPassword(parsed.data);

    if (error || !data.user || !data.session) {
      res.status(401).json({ error: error?.message ?? "Unable to sign in." });
      return;
    }

    const profile = await loadProfile(data.session.access_token, data.user.id);
    if (!profile) {
      req.log.error({ userId: data.user.id }, "Signed-in user has no profile row");
      res.status(500).json({ error: "Your account is missing a profile." });
      return;
    }

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at ?? null,
      user: { id: data.user.id, email: data.user.email ?? null },
      profile,
    });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      res.status(503).json({ error: error.message });
      return;
    }
    req.log.error({ err: error }, "Login failed");
    res.status(500).json({ error: "Unable to sign in right now." });
  }
});

router.post("/auth/refresh", async (req, res) => {
  const parsed = RefreshSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A refresh token is required." });
    return;
  }

  try {
    const { data, error } = await getSupabaseClient().auth.refreshSession({
      refresh_token: parsed.data.refresh_token,
    });

    if (error || !data.user || !data.session) {
      // Expired, already-used or revoked token. The client should treat this
      // as a hard sign-out rather than retrying.
      res.status(401).json({ error: "Your session has expired. Please sign in again." });
      return;
    }

    const profile = await loadProfile(data.session.access_token, data.user.id);
    if (!profile) {
      req.log.error({ userId: data.user.id }, "Refreshed user has no profile row");
      res.status(500).json({ error: "Your account is missing a profile." });
      return;
    }

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at ?? null,
      user: { id: data.user.id, email: data.user.email ?? null },
      profile,
    });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      res.status(503).json({ error: error.message });
      return;
    }
    req.log.error({ err: error }, "Session refresh failed");
    res.status(401).json({ error: "Your session has expired. Please sign in again." });
  }
});

router.post("/auth/logout", requireAuth, async (req, res) => {
  // Actually revoke the session. This used to return 204 without telling
  // Supabase anything, leaving the access token valid until it expired.
  try {
    const { url, anonKey } = getSupabaseCredentials();
    const response = await fetch(`${url}/auth/v1/logout?scope=global`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${req.auth!.accessToken}`,
      },
    });

    if (!response.ok && response.status !== 401) {
      req.log.warn({ status: response.status }, "Supabase logout failed");
    }
  } catch (error) {
    // Still report success: the client must be able to clear local state
    // even if revocation fails, or the user gets stuck signed in.
    req.log.warn({ err: error }, "Supabase logout request errored");
  }

  res.status(204).send();
});

router.get(
  "/auth/me",
  requireAuth,
  requireRole("customer", "manager", "admin"),
  (req, res) => {
    // Explicit fields: req.auth carries the access token, which must never
    // be echoed back in a response body.
    const { id, email, role } = req.auth!;
    res.json({ id, email, role });
  },
);

export default router;
