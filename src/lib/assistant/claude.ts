import Anthropic from "@anthropic-ai/sdk";

interface GenerateTextOptions {
  apiKey: string;
  prompt: string;
  model?: string;
  system?: string;
  maxTokens?: number;
}

export async function generateTextWithClaude(options: GenerateTextOptions): Promise<string> {
  const client = new Anthropic({ apiKey: options.apiKey });

  const response = await client.messages.create({
    model: options.model || "claude-sonnet-4-20250514",
    system: options.system,
    max_tokens: options.maxTokens ?? 2500,
    messages: [{ role: "user", content: options.prompt }],
  });

  const block = response.content.find((item) => item.type === "text");
  return block?.type === "text" ? block.text : "";
}

export async function* streamTextWithClaude(options: GenerateTextOptions): AsyncGenerator<string> {
  const client = new Anthropic({ apiKey: options.apiKey });

  const stream = await client.messages.create({
    model: options.model || "claude-sonnet-4-20250514",
    system: options.system,
    max_tokens: options.maxTokens ?? 2500,
    messages: [{ role: "user", content: options.prompt }],
    stream: true,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta") {
      const delta = (event as { delta: { type: string; text?: string } }).delta;
      if (delta.type === "text_delta" && typeof delta.text === "string") {
        yield delta.text;
      }
    }
  }
}
