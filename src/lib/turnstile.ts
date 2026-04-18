interface SiteverifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

export function isTurnstileConfigured(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

export async function verifyTurnstile(
  token: string | undefined,
  ip?: string,
): Promise<{ ok: boolean; configured: boolean }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, configured: false };

  if (!token) return { ok: false, configured: true };

  const params = new URLSearchParams();
  params.append("secret", secret);
  params.append("response", token);
  if (ip && ip !== "unknown") params.append("remoteip", ip);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: params,
    });
    const data = (await res.json()) as SiteverifyResponse;
    if (!data.success) {
      console.warn("[turnstile] verification failed:", data["error-codes"]);
    }
    return { ok: data.success === true, configured: true };
  } catch (err) {
    console.error("[turnstile] request error:", err);
    return { ok: false, configured: true };
  }
}
