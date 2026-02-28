import type { Guardrail, GuardrailResult, AgentContext } from "../../types.js";

/**
 * Define a guardrail for input or output validation.
 *
 * @example
 * const noSecrets = defineGuardrail({
 *   name: "no_secrets",
 *   type: "output",
 *   validate: async (content) => ({
 *     passed: !content.includes("SECRET"),
 *     action: "block",
 *     message: "Output contains sensitive data",
 *   }),
 * });
 */
export function defineGuardrail(config: Guardrail): Guardrail {
  return config;
}

/**
 * Run multiple guardrails in parallel. Returns all results.
 * If any guardrail with action "block" fails, the overall check fails.
 */
export async function runGuardrails(
  guardrails: Guardrail[],
  content: string,
  ctx: AgentContext
): Promise<{ passed: boolean; results: Array<{ name: string } & GuardrailResult> }> {
  if (guardrails.length === 0) {
    return { passed: true, results: [] };
  }

  const results = await Promise.all(
    guardrails.map(async (g) => {
      const result = await g.validate(content, ctx);
      return { name: g.name, ...result };
    })
  );

  const blocked = results.some((r) => !r.passed && r.action === "block");

  return { passed: !blocked, results };
}

// ─── Built-in Guardrails ───

/**
 * Block output that exceeds a character limit.
 */
export function maxLengthGuardrail(maxChars: number): Guardrail {
  return {
    name: "max_length",
    type: "output",
    validate: async (content) => ({
      passed: content.length <= maxChars,
      action: "block",
      message:
        content.length > maxChars
          ? `Output exceeds ${maxChars} characters (got ${content.length})`
          : undefined,
    }),
  };
}

/**
 * Block content matching any of the given regex patterns.
 */
export function contentFilterGuardrail(
  blockedPatterns: RegExp[],
  action: "block" | "warn" | "log" = "block"
): Guardrail {
  return {
    name: "content_filter",
    type: "output",
    validate: async (content) => {
      const match = blockedPatterns.find((p) => p.test(content));
      return {
        passed: !match,
        action,
        message: match ? `Content matched blocked pattern: ${match.source}` : undefined,
      };
    },
  };
}
