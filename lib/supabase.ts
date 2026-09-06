const SUPABASE_URL = "https://ngsadfoekvtapctolrmw.supabase.co";
const SUPABASE_KEY = "sb_publishable_Xmbt9RmJp4dEFm_AAc3RwA_wR68RT63";
const STORAGE_KEY = "reptrack-user";
export type User = { id: string; user_metadata?: { display_name?: string } };
export type Session = { access_token: string; refresh_token: string; user: User };

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function getSession(): Promise<Session | null> {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as Session; } catch { localStorage.removeItem(STORAGE_KEY); return null; }
}

export async function createAccount(name: string, existingId?: string): Promise<Session> {
  const clean = name.trim();
  let id = existingId;
  if (!id) {
    try {
      const url = new URL("/rest/v1/profiles", SUPABASE_URL);
      url.searchParams.set("select", "id,display_name");
      url.searchParams.set("display_name", `eq.${clean}`);
      url.searchParams.set("limit", "1");
      const res = await fetch(url.toString(), { headers: { apikey: SUPABASE_KEY } });
      if (res.ok) id = (await res.json())[0]?.id;
    } catch {}
  }
  const session: Session = { access_token: "", refresh_token: "", user: { id: id || newId(), user_metadata: { display_name: clean } } };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export async function updateProfileName(session: Session, name: string) {
  const next: Session = { ...session, user: { ...session.user, user_metadata: { display_name: name.trim() } } };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function deleteAccount(session: Session) {
  await db(`exercises?user_id=eq.${session.user.id}`, { method: "DELETE" }, session);
  await db(`workouts?user_id=eq.${session.user.id}`, { method: "DELETE" }, session);
  await db(`profiles?id=eq.${session.user.id}`, { method: "DELETE" }, session);
  localStorage.removeItem(STORAGE_KEY);
}

export async function db<T = any>(path: string, options: RequestInit = {}, session: Session): Promise<T> {
  const url = new URL(`/rest/v1/${path}`, SUPABASE_URL);
  const res = await fetch(url.toString(), { ...options, headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json", "x-user-id": session.user.id, ...(options.headers || {}) } });
  if (!res.ok) { const text = await res.text(); throw new Error(text || `Database request failed (${res.status})`); }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
