import type { AuthResponse, Profile } from '@workspace/api-client-react';

const ACCESS = 'bunsen_access_token';
const REFRESH = 'bunsen_refresh_token';
const EXPIRES = 'bunsen_expires_at';
const PROFILE = 'bunsen_profile';

/** Refresh this long before the token actually expires. */
const SKEW_SECONDS = 60;

// localStorage throws outright in some contexts (Safari private mode,
// blocked site data), so every access is guarded.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* nothing useful to do — the session just won't survive a reload */
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function storeSession(session: AuthResponse): void {
  write(ACCESS, session.access_token);
  write(REFRESH, session.refresh_token);
  write(PROFILE, JSON.stringify(session.profile));
  if (session.expires_at != null) {
    write(EXPIRES, String(session.expires_at));
  } else {
    remove(EXPIRES);
  }
}

export function clearSession(): void {
  [ACCESS, REFRESH, EXPIRES, PROFILE].forEach(remove);
}

export function isSignedIn(): boolean {
  return Boolean(read(ACCESS));
}

export function storedProfile(): Profile | null {
  const raw = read(PROFILE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

function expiresSoon(): boolean {
  const raw = read(EXPIRES);
  // Sessions stored before expiry tracking existed have no value here.
  // Treat the token as usable and let a 401 surface normally.
  if (!raw) return false;
  const expiresAt = Number(raw);
  if (!Number.isFinite(expiresAt)) return false;
  return expiresAt - SKEW_SECONDS <= Math.floor(Date.now() / 1000);
}

let inFlight: Promise<string | null> | null = null;

async function refresh(): Promise<string | null> {
  const refreshToken = read(REFRESH);
  if (!refreshToken) {
    clearSession();
    return null;
  }

  // Deliberately a plain fetch rather than the generated client: that client
  // routes through customFetch, which calls the token getter below — so
  // refreshing through it would recurse. '/api' matches orval's baseUrl.
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    // Refresh tokens are single-use and can be revoked; a failure here is a
    // hard sign-out, not something to retry.
    clearSession();
    return null;
  }

  const session = (await response.json()) as AuthResponse;
  storeSession(session);
  return session.access_token;
}

/**
 * Token getter for the API client. Refreshes shortly before expiry so a
 * request is never sent with a token that is about to be rejected, which is
 * what previously stranded users on "your session may have expired" while a
 * perfectly good refresh token sat unused. Concurrent callers share one
 * in-flight refresh.
 */
export async function accessToken(): Promise<string | null> {
  const current = read(ACCESS);
  if (!current) return null;
  if (!expiresSoon()) return current;

  inFlight ??= refresh().finally(() => {
    inFlight = null;
  });

  return inFlight;
}
