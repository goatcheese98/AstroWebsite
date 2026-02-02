import type { APIRoute } from 'astro';
import { getExcalidrawSystemPrompt, buildCanvasContext } from '@/lib/prompts/excalidraw-system-prompt';
import { checkAuthentication } from '@/lib/api-auth';

// Enable server-side rendering for this endpoint
export const prerender = false;

const MOONSHOT_API_KEY = import.meta.env.MOONSHOT_API_KEY || process.env.MOONSHOT_API_KEY;

if (!MOONSHOT_API_KEY) {
  console.error('❌ MOONSHOT_API_KEY is not set in environment variables');
} else {
  console.log('✅ MOONSHOT_API_KEY loaded successfully');
}

// Kimi/Moonshot API configuration
const KIMI_CONFIG = {
  BASE_URL: 'https://api.moonshot.ai/v1',
  DEFAULT_MODEL: 'kimi-k2-0711-preview', // Kimi K2.5 model
  MAX_TOKENS: 2048,
  TEMPERATURE: 0.3,
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Check authentication (if enabled)
    const authError = checkAuthentication(request);
    if (authError) return authError;

    // Check if API key is available
    if (!MOONSHOT_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'API key not configured',
          details: 'MOONSHOT_API_KEY environment variable is missing',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON in request body',
          details: parseError instanceof Error ? parseError.message : 'Malformed JSON',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { messages, model, canvasState } = body as any;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          details: 'Messages array is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Build canvas context for system prompt
    const canvasContext = buildCanvasContext(canvasState);
    const systemPrompt = getExcalidrawSystemPrompt(canvasContext);

    console.log('🌙 Calling Kimi API with model:', model || KIMI_CONFIG.DEFAULT_MODEL);
    console.log('📊 Canvas context:', canvasContext?.substring(0, 100) + '...');

    // Call Kimi/Moonshot API (OpenAI-compatible)
    const response = await fetch(`${KIMI_CONFIG.BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || KIMI_CONFIG.DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          })),
        ],
        temperature: KIMI_CONFIG.TEMPERATURE,
        max_tokens: KIMI_CONFIG.MAX_TOKENS,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Kimi API error:', errorData);
      return new Response(
        JSON.stringify({
          error: 'Kimi API error',
          details: errorData.error?.message || `HTTP ${response.status}`,
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      return new Response(
        JSON.stringify({
          error: 'Empty response from Kimi',
          details: 'No message content in response',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Kimi response received, length:', assistantMessage.length);

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        model: data.model || KIMI_CONFIG.DEFAULT_MODEL,
        provider: 'kimi',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('❌ Kimi API error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to get AI response',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
