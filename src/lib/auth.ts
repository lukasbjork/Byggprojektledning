// Enkel sessionshantering för en användare: en HMAC-signerad cookie
// som innehåller utgångstid. Web Crypto används så att koden fungerar
// både i proxy (edge-kompatibel) och i Node.

export const SESSION_COOKIE = "bygg_session";
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 dagar

async function hmacHex(value: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(secret: string): Promise<string> {
  const expires = Date.now() + SESSION_MAX_AGE_S * 1000;
  const sig = await hmacHex(String(expires), secret);
  return `${expires}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string
): Promise<boolean> {
  if (!token || !secret) return false;
  const [expires, sig] = token.split(".");
  if (!expires || !sig) return false;
  if (!/^\d+$/.test(expires) || Number(expires) < Date.now()) return false;
  const expected = await hmacHex(expires, secret);
  // Konstanttidsjämförelse för att inte läcka signaturen via timing
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
