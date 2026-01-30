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
        // gemini-2.5-flash-image: Lower cost ($0.039 per image), good quality
        // gemini-3-pro-image-preview: Higher cost ($0.134-$0.24 per image), best quality
        const selectedModel = model === 'gemini-3-pro-image-preview'
            ? 'gemini-3-pro-image-preview'
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
        // Gemini returns images in parts array with inlineData containing base64
        const parts = response.candidates?.[0]?.content?.parts;

        if (!parts || parts.length === 0) {
            return new Response(JSON.stringify({
                error: 'No image generated',
                details: 'The model did not return any content parts',
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Find the image part (should have inlineData with base64)
        const imagePart = parts.find((part: any) => part.inlineData);

        if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
            console.error('❌ No image data found in response parts:', JSON.stringify(parts, null, 2));
            return new Response(JSON.stringify({
                error: 'No image generated',
                details: 'The model did not return image data in the expected format',
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.log('✅ Image generated successfully');
        console.log(`📦 MIME type: ${imagePart.inlineData.mimeType}`);
        console.log(`📏 Base64 data length: ${imagePart.inlineData.data.length} characters`);

        // Return base64 image data
        return new Response(JSON.stringify({
            success: true,
            imageData: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType || 'image/png',
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

        if (errorDetails.includes('quota') || errorDetails.includes('RESOURCE_EXHAUSTED')) {
            errorMessage = 'API quota exceeded';
            errorDetails = 'Image generation requires a paid billing account. Gemini image models have no free tier. Enable billing at https://aistudio.google.com/ to use this feature.';
        } else if (errorDetails.includes('invalid')) {
            errorMessage = 'Invalid request';
            errorDetails = 'The image generation request was invalid. Please check your prompt.';
        } else if (errorDetails.includes('PERMISSION_DENIED') || errorDetails.includes('billing')) {
            errorMessage = 'Billing not enabled';
            errorDetails = 'This feature requires billing to be enabled. Visit https://aistudio.google.com/ to set up billing for image generation.';
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
