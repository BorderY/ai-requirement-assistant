type HealthPayload = {
  ok: boolean;
  message: string;
  durationMs: number;
  target?: string;
  status?: number;
  details?: string;
  proxy: {
    nodeUseEnvProxy: string;
    hasHttpProxy: boolean;
    hasHttpsProxy: boolean;
  };
};

function buildProxyState() {
  return {
    nodeUseEnvProxy: process.env.NODE_USE_ENV_PROXY ?? "unset",
    hasHttpProxy: Boolean(process.env.HTTP_PROXY),
    hasHttpsProxy: Boolean(process.env.HTTPS_PROXY),
  };
}

export async function GET() {
  const startedAt = Date.now();
  const proxy = buildProxyState();
  const baseURL = process.env.PACKYCODE_BASE_URL;
  const apiKey = process.env.PACKYCODE_API_KEY;
  const timeoutMs = Number(process.env.PACKYCODE_HEALTH_TIMEOUT_MS || 8000);

  if (!baseURL) {
    return Response.json(
      {
        ok: false,
        message: "PACKYCODE_BASE_URL is missing",
        durationMs: Date.now() - startedAt,
        proxy,
      } satisfies HealthPayload,
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        message: "PACKYCODE_API_KEY is missing",
        durationMs: Date.now() - startedAt,
        proxy,
      } satisfies HealthPayload,
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const target = new URL("models", baseURL).toString();

  try {
    const response = await fetch(target, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });

    const bodyPreview = (await response.text()).slice(0, 240);
    const durationMs = Date.now() - startedAt;
    const ok = response.ok;

    return Response.json(
      {
        ok,
        message: ok ? "network is reachable" : "upstream returned non-2xx",
        durationMs,
        target,
        status: response.status,
        details: bodyPreview || undefined,
        proxy,
      } satisfies HealthPayload,
      { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : "unknown error";

    return Response.json(
      {
        ok: false,
        message: "network check failed",
        durationMs,
        target,
        details: message,
        proxy,
      } satisfies HealthPayload,
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
