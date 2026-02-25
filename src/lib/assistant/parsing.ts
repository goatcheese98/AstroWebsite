export function extractCodeBlock(text: string, language: string): string | null {
  const pattern = new RegExp("```" + language + "\\s*\\n([\\s\\S]*?)\\n```", "i");
  const match = text.match(pattern);
  return match?.[1]?.trim() || null;
}

export function buildConversationPrompt(history: Array<{ role: string; text: string }>): string {
  const lines = history.map((item) => `${item.role.toUpperCase()}: ${item.text}`);
  return lines.join("\n\n");
}

export function buildMermaidPrompt(userText: string): string {
  return [
    "Generate only Mermaid syntax for an Excalidraw-ready diagram.",
    "Rules:",
    "- Return only a single Mermaid code block.",
    "- Prefer flowchart TD unless the user asks otherwise.",
    "- Keep labels concise.",
    "",
    `Request: ${userText}`,
  ].join("\n");
}

export function buildD2Prompt(userText: string): string {
  return [
    "Generate only D2 syntax for a clean architecture/flow diagram.",
    "Rules:",
    "- Return only a single d2 code block.",
    "- Keep IDs short and deterministic.",
    "- Use arrows for relationships.",
    "",
    `Request: ${userText}`,
  ].join("\n");
}
