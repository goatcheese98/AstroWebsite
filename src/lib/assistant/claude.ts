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
