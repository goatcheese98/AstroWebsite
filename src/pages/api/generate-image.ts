import type { APIRoute } from 'astro';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Enable server-side rendering for this endpoint
export const prerender = false;

const apiKey = import.meta.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
    console.error('❌ GOOGLE_GEMINI_API_KEY is not set in environment variables');
} else {
    console.log(`✅ GOOGLE_GEMINI_API_KEY loaded: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`);
}

export const POST: APIRoute = async ({ request }) => {
    try {
        // Check if API key is available
        if (!apiKey) {
            return new Response(JSON.stringify({
                error: 'API key not configured',
                details: 'GOOGLE_GEMINI_API_KEY environment variable is missing',
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

        const { prompt, model = 'gemini-2.5-flash-image' } = body;

        if (!prompt || typeof prompt !== 'string') {
            return new Response(JSON.stringify({
                error: 'Prompt is required',
                details: 'Please provide a text prompt for image generation',
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Initialize the Gemini API client
        const genAI = new GoogleGenerativeAI(apiKey);

        // Choose model based on quality preference
        // gemini-2.5-flash-image: Lower cost, good quality
        // gemini-3-pro-image: Higher cost (140-250 credits), best quality
        const selectedModel = model === 'gemini-3-pro-image'
            ? 'gemini-3-pro-image'
            : 'gemini-2.5-flash-image';

        console.log(`🎨 Generating image with model: ${selectedModel}`);
        console.log(`📝 Prompt: ${prompt}`);

        const generativeModel = genAI.getGenerativeModel({ model: selectedModel });

        // Generate image from prompt
        const result = await generativeModel.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: prompt,
                        },
                    ],
                },
            ],
            generationConfig: {
                // Configure generation parameters if needed
                temperature: 0.9,
            },
        });

        const response = await result.response;

        // Extract image data from response
        // Note: The actual response format may vary - adjust based on API documentation
        const imageData = response.candidates?.[0]?.content?.parts?.[0];

        if (!imageData) {
            return new Response(JSON.stringify({
                error: 'No image generated',
                details: 'The model did not return image data',
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Return base64 image data
        return new Response(JSON.stringify({
            success: true,
            imageData: imageData,
            model: selectedModel,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Gemini API error:', error);

        // Handle specific error types
        let errorMessage = 'Failed to generate image';
        let errorDetails = error instanceof Error ? error.message : 'Unknown error';

        if (errorDetails.includes('quota')) {
            errorMessage = 'API quota exceeded';
            errorDetails = 'You have exceeded your API usage quota. Please try again later.';
        } else if (errorDetails.includes('invalid')) {
            errorMessage = 'Invalid request';
            errorDetails = 'The image generation request was invalid. Please check your prompt.';
        }

        return new Response(JSON.stringify({
            error: errorMessage,
            details: errorDetails,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
