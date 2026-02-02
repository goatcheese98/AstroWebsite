import type { APIRoute } from 'astro';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { validateImageRequest } from '@/lib/schemas';
import type {
  ImageGenerationResponse,
  ImageGenerationErrorResponse,
  GeminiPart,
} from '@/lib/schemas';
import { GEMINI_CONFIG } from '@/lib/api-config';
import { checkAuthentication } from '@/lib/api-auth';

// Enable server-side rendering for this endpoint
export const prerender = false;

const apiKey = import.meta.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GOOGLE_GEMINI_API_KEY is not set in environment variables');
} else {
  console.log('✅ GOOGLE_GEMINI_API_KEY loaded successfully');
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Check authentication (if enabled)
    const authError = checkAuthentication(request);
    if (authError) return authError;

    // Check if API key is available
    if (!apiKey) {
      const errorResponse: ImageGenerationErrorResponse = {
        error: 'API key not configured',
        details: 'GOOGLE_GEMINI_API_KEY environment variable is missing',
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      const errorResponse: ImageGenerationErrorResponse = {
        error: 'Invalid JSON in request body',
        details: parseError instanceof Error ? parseError.message : 'Malformed JSON',
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extract data - support both simple prompt and image+prompt
    const { prompt, model: selectedModel, imageData, mode = 'text' } = body as any;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string') {
      const errorResponse: ImageGenerationErrorResponse = {
        error: 'Invalid prompt',
        details: 'Prompt is required and must be a string',
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (import.meta.env.DEV) {
      console.log(`🎨 Generating image with model: ${selectedModel || GEMINI_CONFIG.DEFAULT_MODEL}`);
      console.log(`📝 Mode: ${mode}`);
      console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);
      if (imageData) {
        console.log(`🖼️ Has reference image: ${imageData.length} chars`);
      }
    }

    // Initialize the Gemini API client
    const genAI = new GoogleGenerativeAI(apiKey);
    const generativeModel = genAI.getGenerativeModel({ 
      model: selectedModel || GEMINI_CONFIG.DEFAULT_MODEL 
    });

    // Build parts array - include image if provided
    const parts: any[] = [];
    
    // If we have an image (screenshot), add it first so Gemini can see it
    if (imageData && mode === 'visual') {
      // Remove data URL prefix if present
      const base64Data = imageData.includes(',') 
        ? imageData.split(',')[1] 
        : imageData;
      
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: base64Data,
        },
      });
      
      console.log('📸 Added screenshot to prompt');
    }
    
    // Add the text prompt
    parts.push({ text: prompt });

    // Generate image
    const result = await generativeModel.generateContent({
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      generationConfig: {
        temperature: GEMINI_CONFIG.TEMPERATURE,
      },
    });

    const response = await result.response;

    // Extract image data from response
    const responseParts = response.candidates?.[0]?.content?.parts;

    if (!responseParts || responseParts.length === 0) {
      const errorResponse: ImageGenerationErrorResponse = {
        error: 'No image generated',
        details: 'The model did not return any content parts',
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Find the image part
    const imagePart = responseParts.find((part: GeminiPart) => part.inlineData);

    if (!imagePart?.inlineData?.data) {
      if (import.meta.env.DEV) {
        console.error('❌ No image data found in response parts');
        console.log('Response parts:', JSON.stringify(responseParts, null, 2));
      }
      const errorResponse: ImageGenerationErrorResponse = {
        error: 'No image generated',
        details: 'The model did not return image data in the expected format',
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (import.meta.env.DEV) {
      console.log('✅ Image generated successfully');
      console.log(`📦 MIME type: ${imagePart.inlineData.mimeType}`);
      console.log(`📏 Base64 data length: ${imagePart.inlineData.data.length} characters`);
    }

    // Return base64 image data
    const successResponse: ImageGenerationResponse = {
      success: true,
      imageData: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || 'image/png',
      model: selectedModel || GEMINI_CONFIG.DEFAULT_MODEL,
    };

    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
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

    const errorResponse: ImageGenerationErrorResponse = {
      error: errorMessage,
      details: errorDetails,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
