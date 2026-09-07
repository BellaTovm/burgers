import type { NextFunction, Request, Response } from "express";
import type { Profile } from "@workspace/api-zod";
import {
  getSupabaseClient,
  getUserScopedClient,
  SupabaseConfigurationError,
} from "../lib/supabase";

export type AppRole = "customer" | "manager" | "admin";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: AppRole;
  /**
   * The caller's access token, so routes can build a user-scoped Supabase
   * client and have RLS apply. Never serialise this into a response body.
   */
  accessToken: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedUser;
    }
  }
}

function bearerToken(req: Request): string | null {
  const value = req.header("authorization");
  if (!value?.startsWith("Bearer ")) return null;
  const token = value.slice("Bearer ".length).trim();
  return token || null;
}

function isRole(value: unknown): value is AppRole {
  return value === "customer" || value === "manager" || value === "admin";
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    // Token verification goes through the Auth API, which needs no session.
    const {
      data: { user },
      error: userError,
    } = await getSupabaseClient().auth.getUser(token);

    if (userError || !user) {
      res.status(401).json({ error: "Your session is invalid or expired." });
      return;
    }

    // The profile read must be user-scoped: `profiles` is protected by
    // `auth.uid() = id`, so the shared anon client would match no rows.
    const { data: profile, error: profileError } = await getUserScopedClient(token)
      .from("profiles")
      .select("id, email, role")
      .eq("id", user.id)
      .maybeSingle<Profile>();

    if (profileError) {
      req.log.error({ err: profileError }, "Unable to load user profile");
      res.status(500).json({ error: "Unable to load your account profile." });
      return;
    }

    if (!profile) {
      // handle_new_user() creates a profile for every auth user, so this is
      // a genuine data inconsistency rather than a new-account case.
      req.log.error({ userId: user.id }, "Authenticated user has no profile row");
      res.status(403).json({ error: "Your account is missing a profile." });
      return;
    }

    if (!isRole(profile.role)) {
      res.status(403).json({ error: "Your account does not have an app role." });
      return;
    }

    req.auth = {
      id: user.id,
      email: profile.email || user.email || "",
      role: profile.role,
      accessToken: token,
    };
    next();
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      res.status(503).json({ error: error.message });
      return;
    }
    req.log.error({ err: error }, "Authentication middleware failed");
    res.status(500).json({ error: "Authentication service unavailable." });
  }
}

export function requireRole(...roles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    if (!roles.includes(req.auth.role)) {
      res
        .status(403)
        .json({ error: "You do not have permission for this action." });
      return;
    }

    next();
  };
}
