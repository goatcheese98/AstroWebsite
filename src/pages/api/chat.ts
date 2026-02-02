import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';
import { validateChatRequest } from '@/lib/schemas';
import type { ChatResponse, ChatErrorResponse } from '@/lib/schemas';
import { CLAUDE_CONFIG } from '@/lib/api-config';
import { getExcalidrawSystemPrompt, buildCanvasContext } from '@/lib/prompts/excalidraw-system-prompt';
import { checkAuthentication } from '@/lib/api-auth';

// Enable server-side rendering for this endpoint
export const prerender = false;

const apiKey = import.meta.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.error('❌ ANTHROPIC_API_KEY is not set in environment variables');
} else {
  // Only log that key is loaded, never log the actual key
  console.log('✅ ANTHROPIC_API_KEY loaded successfully');
}

const client = new Anthropic({
  apiKey: apiKey || 'dummy-key', // Fallback to prevent initialization error
});

export const POST: APIRoute = async ({ request }) => {
  try {
    // Check authentication (if enabled)
    const authError = checkAuthentication(request);
    if (authError) return authError;

    // Check if API key is available
    if (!apiKey) {
      const errorResponse: ChatErrorResponse = {
        error: 'API key not configured',
        details: 'ANTHROPIC_API_KEY environment variable is missing',
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate request body with Zod
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      const errorResponse: ChatErrorResponse = {
        error: 'Invalid JSON in request body',
        details: parseError instanceof Error ? parseError.message : 'Malformed JSON',
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate with Zod schema (replaces all manual validation!)
    const validation = validateChatRequest(body);
    if (!validation.success) {
      const errorResponse: ChatErrorResponse = {
        error: validation.error,
        details: validation.details,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: validation.statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extract validated data (already sanitized and type-safe!)
    const { messages, model: selectedModel, canvasState } = validation.data;
    const screenshot = (body as any).screenshot; // Screenshot is optional

    // Build canvas context for system prompt
    const canvasContext = buildCanvasContext(canvasState);
    const systemPrompt = getExcalidrawSystemPrompt(canvasContext);

    // Prepare messages with optional screenshot
    const formattedMessages = messages.map((msg, index) => {
      // Add screenshot to the last user message if available
      if (screenshot && index === messages.length - 1 && msg.role === 'user') {
        // Extract base64 data from data URL
        const base64Data = screenshot.split(',')[1];
        const mediaType = screenshot.split(';')[0].split(':')[1] || 'image/png';

        return {
          role: msg.role,
          content: [
            {
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: mediaType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
                data: base64Data,
              },
            },
            {
              type: 'text' as const,
              text: msg.content,
            },
          ],
        };
      }

      return {
        role: msg.role,
        content: msg.content,
      };
    });

    // Call Claude API (messages are already validated and sanitized)
    const response = await client.messages.create({
      model: selectedModel,
      max_tokens: CLAUDE_CONFIG.MAX_TOKENS,
      system: systemPrompt,
      messages: formattedMessages,
    });

    // Extract text response
    const textContent = response.content.find((block) => block.type === 'text');
    const assistantMessage = textContent?.type === 'text' ? textContent.text : 'I apologize, but I could not generate a response.';

    const successResponse: ChatResponse = {
      message: assistantMessage,
      model: selectedModel,
    };

    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Claude API error:', error);

    const errorResponse: ChatErrorResponse = {
      error: 'Failed to get AI response',
      details: error instanceof Error ? error.message : 'Unknown error',
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
