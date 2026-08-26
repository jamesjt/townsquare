/**
 * Golem fork (FT-1200): THE ACCOUNT — the platform login, spoken from the app.
 *
 * The site is served beside the platform with `/api` proxied same-origin
 * (deploy/Caddyfile.botc-snippet in production, vue.config.js's dev proxy in
 * dev), so the platform's auth endpoints are simply here: cookies ride every
 * request, and signing in on the main site IS being signed in here. This
 * module is the only place the app speaks to `/api/auth/*`; every other
 * surface reads the result off the session store (`session.account`).
 *
 * The contract (server/auth/routes.ts, frozen):
 *   GET  /api/auth/me      → 200 { user: PublicUser | null }   (never 401)
 *   POST /api/auth/login   { email, password } → 200 { user } | 401 { message }
 *   POST /api/auth/signup  { email, password (min 8), name? }
 *                          → 201 { user } | 409 "Email already registered"
 *                            (signup can also be refused outright by the
 *                             platform's `createAccount` feature flag — the
 *                             server's own message is what the user sees)
 *   POST /api/auth/logout  → 200 { ok: true }
 *
 * WHAT IS KEPT, AND WHAT NEVER IS. The store holds `{ id, name, email }` —
 * the opaque account id, the display name, and the email FOR THE PANEL'S OWN
 * "who am I" line only. No password ever touches this module's state, no
 * token is stored (the session is a cookie the browser owns), and nothing
 * account-shaped is written to localStorage. The email never crosses the
 * game's wire — the only identity fact that ever leaves this client is the
 * opaque id, direct to the host (see socket.js's claim path).
 */

const API = "/api/auth";

/** PublicUser → the app's own slim account fact. */
const slim = (user) =>
  user ? { id: user.id, name: user.name || null, email: user.email } : null;

/**
 * Read the server's message out of a failed response, falling back to a
 * plain sentence — the server's own words are the error surface here
 * (a 401's "Invalid email or password", the flag refusal, a 409), spoken
 * as-is in the app's panel.
 */
async function messageOf(res, fallback) {
  try {
    const body = await res.json();
    if (body && typeof body.message === "string" && body.message) {
      return body.message;
    }
    // A feature-flag refusal (403 { error: "feature_disabled", feature })
    // carries no `message` — it carries the switched-off feature's own label
    // (shared/protocols/feature-flags.ts's flagDeniedBody), so the refusal
    // can still be said in words: "Create account is switched off right now."
    if (body && body.error === "feature_disabled") {
      return `${body.feature || "That"} is switched off right now.`;
    }
  } catch {
    // an empty or non-JSON body — the fallback speaks
  }
  return fallback;
}

/**
 * Ask who this browser is and seed the store. Best-effort like every golem
 * call: an unreachable platform means "signed out" for now, never a broken
 * app. Called once at boot (main.js).
 */
export async function initAccount(store) {
  try {
    const res = await fetch(`${API}/me`);
    if (!res.ok) return;
    const { user } = await res.json();
    store.commit("session/setAccount", slim(user));
  } catch {
    // no platform in reach — the app runs signed out, as it always could
  }
}

/** Sign in. Resolves to the account; throws Error(server's message). */
export async function login(store, email, password) {
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(await messageOf(res, "Couldn't sign in — try again."));
  }
  const { user } = await res.json();
  const account = slim(user);
  store.commit("session/setAccount", account);
  return account;
}

/**
 * Create an account (auto-signs-in on success). `name` is optional — it
 * becomes the table name the seats prefill with. Throws Error(server's
 * message): a taken email's 409, the flag refusal, a validation 400.
 */
export async function signup(store, email, password, name) {
  const body = { email, password };
  const trimmed = (name || "").trim();
  if (trimmed) body.name = trimmed;
  const res = await fetch(`${API}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      await messageOf(res, "Couldn't create the account — try again."),
    );
  }
  const { user } = await res.json();
  const account = slim(user);
  store.commit("session/setAccount", account);
  return account;
}

/** Sign out. The cookie dies server-side; the store forgets either way. */
export async function logout(store) {
  try {
    await fetch(`${API}/logout`, { method: "POST" });
  } catch {
    // unreachable server — the local fact still clears; the cookie will be
    // refused or expired whenever the platform is next in reach
  }
  store.commit("session/setAccount", null);
}
