import type { APIContext } from "astro";

function runtimeEnv(context: APIContext): Record<string, string> | undefined {
  const runtime = (context.locals as any).runtime as { env?: Record<string, string> } | undefined;
  return runtime?.env;
}

export async function resolveAssistantOwnerId(
  context: APIContext,
  providedClientId?: string,
): Promise<string> {
  const auth = resolveAssistantIdentity(context);
  if (auth.userId) {
    return `user:${auth.userId}`;
  }

  const headerClientId = context.request.headers.get("x-assistant-client-id") || undefined;
  const clientId = providedClientId || headerClientId;
  if (!clientId || !clientId.trim()) {
    throw new Error("clientId is required for anonymous assistant sessions");
  }

  return `anon:${clientId.trim()}`;
}

export function resolveAssistantIdentity(context: APIContext): {
  userId?: string;
} {
  try {
    const authFn = (context.locals as any).auth;
    if (typeof authFn !== "function") {
      return {};
    }

    const result = authFn();
    const userId = result?.userId;
    if (typeof userId === "string" && userId.trim()) {
      return { userId: userId.trim() };
    }
  } catch {
    // Ignore auth lookup failures and continue as anonymous.
  }

  return {};
}

export function resolveAnthropicApiKey(context: APIContext): string | undefined {
  const env = runtimeEnv(context);
  return env?.ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
}

export function resolveAssistantBackendConfig(context: APIContext): {
  baseUrl?: string;
  apiKey?: string;
} {
  const env = runtimeEnv(context);

  const baseUrl = (
    env?.AI_BACKEND_BASE_URL ||
    import.meta.env.AI_BACKEND_BASE_URL ||
    process.env.AI_BACKEND_BASE_URL
  )?.trim();

  const apiKey = (
    env?.AI_BACKEND_API_KEY ||
    import.meta.env.AI_BACKEND_API_KEY ||
    process.env.AI_BACKEND_API_KEY
  )?.trim();

  if (!baseUrl) {
    return {};
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey,
  };
}
