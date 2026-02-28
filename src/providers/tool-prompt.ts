import { randomUUID } from "node:crypto";
import type { ProviderToolSchema, ToolCall } from "../types.js";

/**
 * Build a prompt that describes available tools to the LLM.
 * Used for providers that don't support native tool calling (nativeToolCall=false).
 *
 * The LLM is instructed to respond with a specific JSON format when it wants
 * to call a tool, which we then parse from the text output.
 */
export function buildToolCallPrompt(tools: ProviderToolSchema[]): string {
  const toolDescriptions = tools
    .map((t) => {
      const params = JSON.stringify(t.function.parameters, null, 2);
      return `### ${t.function.name}\n${t.function.description}\nParameters:\n\`\`\`json\n${params}\n\`\`\``;
    })
    .join("\n\n");

  return `## Available Tools

You have access to the following tools. To use a tool, respond with a JSON block in this exact format:

\`\`\`tool_call
{"name": "<tool_name>", "arguments": {<arguments>}}
\`\`\`

IMPORTANT:
- Use the \`\`\`tool_call\`\`\` code fence (not \`\`\`json\`\`\`) when calling a tool.
- Only call ONE tool at a time.
- After calling a tool, wait for the result before continuing.
- If you don't need to use a tool, respond normally without the tool_call block.

${toolDescriptions}`;
}

/**
 * Parse a tool call from the LLM's text output.
 * Looks for the ```tool_call ... ``` pattern.
 *
 * Returns null if no tool call is found in the text.
 */
export function parseToolCallFromText(text: string): ToolCall | null {
  // Try ```tool_call pattern first
  const toolCallMatch = text.match(
    /```tool_call\s*\n?([\s\S]*?)\n?\s*```/
  );

  if (toolCallMatch) {
    return parseToolCallJson(toolCallMatch[1].trim());
  }

  // Fallback: try to find JSON with "name" and "arguments" fields
  const jsonMatch = text.match(
    /\{[\s\S]*?"name"\s*:\s*"[^"]+?"[\s\S]*?"arguments"\s*:\s*\{[\s\S]*?\}[\s\S]*?\}/
  );

  if (jsonMatch) {
    return parseToolCallJson(jsonMatch[0]);
  }

  return null;
}

function parseToolCallJson(jsonStr: string): ToolCall | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.name && typeof parsed.name === "string") {
      return {
        id: `call_${randomUUID().slice(0, 8)}`,
        name: parsed.name,
        arguments:
          typeof parsed.arguments === "string"
            ? parsed.arguments
            : JSON.stringify(parsed.arguments ?? {}),
      };
    }
  } catch {
    // JSON parse failed — not a valid tool call
  }
  return null;
}
