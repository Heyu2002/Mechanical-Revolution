import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type {
  ToolDefinition,
  ProviderToolSchema,
  AgentContext,
} from "../../types.js";

/**
 * Define a tool with Zod schema validation.
 *
 * @example
 * const weatherTool = defineTool({
 *   name: "get_weather",
 *   description: "Get current weather for a city",
 *   parameters: z.object({ city: z.string() }),
 *   execute: async ({ city }) => ({ temp: 72, condition: "sunny" }),
 * });
 */
export function defineTool<TInput, TOutput>(
  def: ToolDefinition<TInput, TOutput>
): ToolDefinition<TInput, TOutput> {
  return def;
}

/**
 * Convert a ToolDefinition to the provider-agnostic JSON Schema format.
 * This is what gets sent to the LLM.
 */
export function toolToSchema(tool: ToolDefinition): ProviderToolSchema {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: zodToJsonSchema(tool.parameters, {
        $refStrategy: "none",
      }) as Record<string, unknown>,
    },
  };
}

/**
 * Execute a tool with input validation via Zod.
 * Parses the JSON arguments, validates against the schema, then calls execute.
 */
export async function executeTool(
  tool: ToolDefinition,
  rawArgs: string,
  ctx: AgentContext
): Promise<string> {
  try {
    const parsed = JSON.parse(rawArgs);
    const validated = tool.parameters.parse(parsed);
    const result = await tool.execute(validated, ctx);
    return typeof result === "string" ? result : JSON.stringify(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return JSON.stringify({ error: message });
  }
}
