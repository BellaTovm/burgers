import { Router, type IRouter, type Response } from "express";
import {
  LogInBody,
  SignUpBody,
} from "@workspace/api-zod";
import { getSupabaseClient, SupabaseConfigurationError } from "../lib/supabase";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

function sendSupabaseError(res: Response, error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "Supabase request failed.";
  res.status(400).json({ error: message });
}

async function getOrCreateProfile(
  user: { id: string; email?: string | null },
  supabase: ReturnType<typeof getSupabaseClient>,
) {
  const { data: profile, error: lookupError } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (profile) return profile;

  const { data: created, error: createError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? "",
      role: "customer",
    })
    .select("id, email, role")
    .single();

  if (createError) throw createError;
  return created;
}

router.post("/auth/signup", async (req, res) => {
  const parsed = SignUpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid email and a password of at least 6 characters." });
    return;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp(parsed.data);
    if (error) {
      sendSupabaseError(res, error);
      return;
    }
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

    const profile = await getOrCreateProfile(data.user, supabase);
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
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error || !data.user || !data.session) {
      res.status(401).json({ error: error?.message ?? "Unable to sign in." });
      return;
    }

    const profile = await getOrCreateProfile(data.user, supabase);
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
    res.status(401).json({ error: "Unable to sign in right now." });
  }
});

router.post("/auth/logout", requireAuth, async (_req, res) => {
  res.status(204).send();
});

router.get(
  "/auth/me",
  requireAuth,
  requireRole("customer", "manager", "admin"),
  (req, res) => {
    res.json(req.auth);
  },
);

export default router;