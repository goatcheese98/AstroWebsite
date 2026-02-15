// Type for Excalidraw element skeleton (used by mermaid-to-excalidraw)
type ExcalidrawElementSkeleton = any;

// Lazy-loaded converter module
let mermaidConverter: typeof import("@excalidraw/mermaid-to-excalidraw") | null = null;

/**
 * Lazy load the mermaid-to-excalidraw converter
 * This keeps the bundle size smaller until Mermaid is actually needed
 */
async function loadMermaidConverter() {
  if (!mermaidConverter) {
    try {
      mermaidConverter = await import("@excalidraw/mermaid-to-excalidraw");
      console.log("✅ Mermaid converter loaded");
    } catch (err) {
      console.error("❌ Failed to load Mermaid converter:", err);
      throw new Error("Failed to load Mermaid converter. Please check your installation.");
    }
  }
  return mermaidConverter;
}

/**
 * Convert Mermaid diagram syntax to Excalidraw elements
 * 
 * @param mermaidCode - The Mermaid diagram source code
 * @returns Promise with elements array and any files (for images)
 * 
 * @example
 * const { elements, files } = await convertMermaidToCanvas(`
 *   flowchart TD
 *     A[Start] --> B{Decision}
 *     B -->|Yes| C[Success]
 *     B -->|No| D[Failure]
 * `);
 */
export async function convertMermaidToCanvas(
  mermaidCode: string
): Promise<{ elements: ExcalidrawElementSkeleton[]; files?: any }> {
  const converter = await loadMermaidConverter();
  
  try {
    // Clean up the code - remove markdown code block markers if present
    const cleanCode = mermaidCode
      .replace(/^```mermaid\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    if (!cleanCode) {
      throw new Error("Empty Mermaid code provided");
    }

    console.log("🧜‍♀️ Converting Mermaid diagram:", cleanCode.substring(0, 100) + "...");

    const result = await converter.parseMermaidToExcalidraw(cleanCode, {
      themeVariables: {
        fontSize: "20px",
      },
      flowchart: {
        curve: "basis", // Smooth curves for better visuals
      },
    });

    console.log(`✅ Converted Mermaid to ${result.elements.length} Excalidraw elements`);

    return {
      elements: result.elements,
      files: result.files,
    };
  } catch (err) {
    console.error("❌ Mermaid conversion failed:", err);
    throw err;
  }
}

/**
 * Check if text contains Mermaid diagram syntax
 * 
 * @param text - Text to check
 * @returns boolean indicating if this looks like Mermaid code
 * 
 * @example
 * isMermaidDiagram("flowchart TD\n  A --> B") // true
 * isMermaidDiagram("Hello world") // false
 */
export function isMermaidDiagram(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  
  const cleanText = text.trim().toLowerCase();
  
  // Check for explicit mermaid code block
  if (cleanText.startsWith("```mermaid")) return true;
  
  // Check for common Mermaid diagram types
  const mermaidKeywords = [
    "flowchart ",
    "graph ",
    "sequenceDiagram",
    "classDiagram",
    "stateDiagram",
    "erDiagram",
    "gantt",
    "pie",
    "mindmap",
    "timeline",
    "journey",
  ];
  
  const firstLine = cleanText.split("\n")[0] || "";
  return mermaidKeywords.some(keyword => firstLine.startsWith(keyword));
}

/**
 * Extract Mermaid code blocks from AI response text
 * 
 * @param text - Full AI response text
 * @returns Array of extracted Mermaid code blocks
 * 
 * @example
 * extractMermaidCode("Here's a diagram:\n```mermaid\nflowchart TD\nA --> B\n```")
 * // Returns: ["flowchart TD\nA --> B"]
 */
export function extractMermaidCode(text: string): string[] {
  if (!text) return [];
  
  const diagrams: string[] = [];
  
  // Pattern 1: Markdown code blocks with mermaid
  const codeBlockPattern = /```mermaid\s*\n([\s\S]*?)\n```/gi;
  let match;
  while ((match = codeBlockPattern.exec(text)) !== null) {
    if (match[1] && match[1].trim()) {
      diagrams.push(match[1].trim());
    }
  }
  
  // Pattern 2: Inline mermaid (no code block, just the diagram)
  // This catches cases where AI outputs mermaid without markdown
  if (diagrams.length === 0 && isMermaidDiagram(text)) {
    // Extract what looks like the diagram
    const lines = text.split("\n");
    const diagramLines: string[] = [];
    let inDiagram = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Start of diagram
      if (!inDiagram && isMermaidDiagram(trimmed)) {
        inDiagram = true;
        diagramLines.push(line);
        continue;
      }
      
      // Continue diagram (non-empty lines or arrows)
      if (inDiagram) {
        if (trimmed === "" || trimmed.startsWith("#")) {
          // End of diagram on empty line or comment
          break;
        }
        diagramLines.push(line);
      }
    }
    
    if (diagramLines.length > 0) {
      diagrams.push(diagramLines.join("\n"));
    }
  }
  
  return diagrams;
}

/**
 * Remove Mermaid code blocks from text (for display purposes)
 * 
 * @param text - Full AI response text
 * @returns Text with Mermaid blocks replaced with placeholder
 * 
 * @example
 * removeMermaidBlocks("Diagram:\n```mermaid\nA --> B\n```\nDone")
 * // Returns: "Diagram:\n\n✅ **Diagram generated**\n\nDone"
 */
export function removeMermaidBlocks(text: string): string {
  if (!text) return text;
  
  return text.replace(
    /```mermaid\s*\n[\s\S]*?\n```/gi,
    "\n\n✅ **Diagram generated**\n"
  );
}

/**
 * Supported Mermaid diagram types
 * Based on @excalidraw/mermaid-to-excalidraw capabilities
 */
export const SUPPORTED_DIAGRAM_TYPES = {
  flowchart: {
    name: "Flowchart",
    description: "Process flows, decision trees, workflows",
    directions: ["TD", "LR", "RL", "BT"],
    example: `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Success]
    B -->|No| D[Failure]`,
  },
  sequence: {
    name: "Sequence Diagram",
    description: "API calls, service interactions, message flows",
    example: `sequenceDiagram
    Client->>Server: Request
    Server->>Database: Query
    Database-->>Server: Result
    Server-->>Client: Response`,
  },
  class: {
    name: "Class Diagram",
    description: "Object-oriented design, relationships",
    example: `classDiagram
    Animal <|-- Dog
    Animal : +String name
    Dog : +bark()`,
  },
  state: {
    name: "State Diagram",
    description: "State machines, transitions",
    example: `stateDiagram
    [*] --> Idle
    Idle --> Active: start
    Active --> Idle: stop`,
  },
} as const;

/**
 * Get a helpful message about supported diagram types
 * Useful for UI hints or tooltips
 */
export function getSupportedTypesMessage(): string {
  return Object.values(SUPPORTED_DIAGRAM_TYPES)
    .map((type) => `• **${type.name}**: ${type.description}`)
    .join("\n");
}

export default {
  convertMermaidToCanvas,
  isMermaidDiagram,
  extractMermaidCode,
  removeMermaidBlocks,
  SUPPORTED_DIAGRAM_TYPES,
  getSupportedTypesMessage,
};
