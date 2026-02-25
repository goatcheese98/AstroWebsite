import type { APIRoute } from "astro";
import { createAssistantGateway } from "@/lib/assistant/backend-boundary";

export const prerender = false;

function errorStatus(error: unknown, fallback: number): number {
  const status = (error as { status?: unknown })?.status;
  if (typeof status === "number" && status >= 400 && status <= 599) {
    return status;
  }
  return fallback;
}

export const GET: APIRoute = async (context) => {
  try {
    const jobId = context.params.jobId;
    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(context.request.url);
    const clientId = url.searchParams.get("clientId") || undefined;

    const gateway = createAssistantGateway(context);
    const job = await gateway.getJob({ clientId, jobId });

    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ job }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to fetch job",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: errorStatus(error, 400), headers: { "Content-Type": "application/json" } },
    );
  }
};
