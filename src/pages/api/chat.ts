import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';

// Enable server-side rendering for this endpoint
export const prerender = false;

const apiKey = import.meta.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY is not set in environment variables');
} else {
    console.log(`✅ ANTHROPIC_API_KEY loaded: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`);
}

const client = new Anthropic({
    apiKey: apiKey || 'dummy-key', // Fallback to prevent initialization error
});

export const POST: APIRoute = async ({ request }) => {
    try {
        // Check if API key is available
        if (!apiKey) {
            return new Response(JSON.stringify({
                error: 'API key not configured',
                details: 'ANTHROPIC_API_KEY environment variable is missing',
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Parse request body
        let body;
        try {
            body = await request.json();
        } catch (parseError) {
            return new Response(JSON.stringify({
                error: 'Invalid JSON in request body',
                details: parseError instanceof Error ? parseError.message : 'Malformed JSON',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const { messages, model = 'claude-sonnet-4-20250514', canvasState } = body;

        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: 'Messages array is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Validate model - only allow Sonnet and Haiku
        const allowedModels = ['claude-sonnet-4-20250514', 'claude-haiku-4-20250514'];
        const selectedModel = allowedModels.includes(model) ? model : 'claude-sonnet-4-20250514';

        // Build context about canvas state
        let canvasContext = '';
        if (canvasState && canvasState.description) {
            canvasContext = `\n\n## Current Canvas State\n${canvasState.description}\n\nYou can see what's already on the canvas and can add to it, modify it, or provide feedback about it.`;
        }

        const response = await client.messages.create({
            model: selectedModel,
            max_tokens: 4096,
            system: `You are an expert at creating Excalidraw diagrams. When given a description, output ONLY a valid JSON array of Excalidraw element skeletons.${canvasContext}

## CRITICAL: Output Format

Return a JSON array inside a code block. Each element is a simplified "skeleton" that will be converted to a full Excalidraw element.

### Rectangle Example:
\`\`\`json
[
  {
    "type": "rectangle",
    "x": 100,
    "y": 100,
    "width": 200,
    "height": 100,
    "backgroundColor": "#a5d8ff",
    "strokeColor": "#1971c2",
    "label": {
      "text": "Frontend"
    }
  }
]
\`\`\`

### Ellipse Example:
\`\`\`json
[
  {
    "type": "ellipse",
    "x": 400,
    "y": 100,
    "width": 150,
    "height": 150,
    "backgroundColor": "#b2f2bb",
    "strokeColor": "#2f9e44"
  }
]
\`\`\`

### Diamond Example:
\`\`\`json
[
  {
    "type": "diamond",
    "x": 100,
    "y": 300,
    "width": 180,
    "height": 120,
    "backgroundColor": "#ffec99",
    "strokeColor": "#f59f00",
    "label": {
      "text": "Decision"
    }
  }
]
\`\`\`

### Text Example:
\`\`\`json
[
  {
    "type": "text",
    "x": 150,
    "y": 50,
    "text": "System Architecture",
    "fontSize": 24,
    "strokeColor": "#1e1e1e"
  }
]
\`\`\`

### Arrow Example:
\`\`\`json
[
  {
    "type": "arrow",
    "x": 300,
    "y": 150,
    "points": [[0, 0], [100, 0]],
    "strokeColor": "#1e1e1e",
    "endArrowhead": "arrow"
  }
]
\`\`\`

### Line Example:
\`\`\`json
[
  {
    "type": "line",
    "x": 100,
    "y": 200,
    "points": [[0, 0], [200, 100]],
    "strokeColor": "#1e1e1e"
  }
]
\`\`\`

## Element Properties

### Required for ALL elements:
- **type**: "rectangle" | "ellipse" | "diamond" | "text" | "arrow" | "line"
- **x**: number (horizontal position in pixels)
- **y**: number (vertical position in pixels)

### For shapes (rectangle, ellipse, diamond):
- **width**: number (required)
- **height**: number (required)
- **backgroundColor**: string (hex color, e.g., "#a5d8ff")
- **strokeColor**: string (hex color, e.g., "#1971c2")
- **label**: { text: string } (optional, adds centered text)

### For text:
- **text**: string (required)
- **fontSize**: number (default: 20)
- **strokeColor**: string (text color)

### For arrows and lines:
- **points**: number[][] (required, e.g., [[0,0], [100,0]])
- **strokeColor**: string
- **endArrowhead**: "arrow" | "dot" (for arrows only)

## Color Palette
- **Blue**: backgroundColor: "#a5d8ff", strokeColor: "#1971c2"
- **Green**: backgroundColor: "#b2f2bb", strokeColor: "#2f9e44"
- **Yellow**: backgroundColor: "#ffec99", strokeColor: "#f59f00"
- **Red**: backgroundColor: "#ffc9c9", strokeColor: "#e03131"
- **Purple**: backgroundColor: "#d0bfff", strokeColor: "#7950f2"
- **Gray**: backgroundColor: "#e9ecef", strokeColor: "#495057"

## Layout Guidelines
1. Start at x: 100, y: 100
2. Space elements 50-100px apart horizontally
3. Space elements 150-200px apart vertically
4. Standard sizes: rectangles 200x100, circles 150x150
5. Use consistent spacing for clean layouts

## Response Format
Provide a brief explanation, then the JSON array:

"I'll create a simple architecture diagram with three components.

\`\`\`json
[
  {
    "type": "rectangle",
    "x": 100,
    "y": 100,
    "width": 180,
    "height": 100,
    "backgroundColor": "#a5d8ff",
    "strokeColor": "#1971c2",
    "label": { "text": "Frontend" }
  },
  {
    "type": "rectangle",
    "x": 350,
    "y": 100,
    "width": 180,
    "height": 100,
    "backgroundColor": "#b2f2bb",
    "strokeColor": "#2f9e44",
    "label": { "text": "API" }
  },
  {
    "type": "arrow",
    "x": 280,
    "y": 150,
    "points": [[0, 0], [70, 0]],
    "strokeColor": "#1e1e1e",
    "endArrowhead": "arrow"
  }
]
\`\`\`"

IMPORTANT: Output ONLY the JSON array in a code block. Do not include extra properties - the conversion function will add them automatically.`,
            messages: messages.map((msg: { role: string; content: string }) => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
            })),
        });

        const textContent = response.content.find((block) => block.type === 'text');
        const assistantMessage = textContent?.type === 'text' ? textContent.text : 'I apologize, but I could not generate a response.';

        return new Response(JSON.stringify({
            message: assistantMessage,
            model: selectedModel,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Claude API error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to get AI response',
            details: error instanceof Error ? error.message : 'Unknown error',
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
