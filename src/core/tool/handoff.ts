import type {
  AgentConfig,
  AgentContext,
  HandoffTarget,
  HandoffResult,
  Message,
  ProviderToolSchema,
} from "../../types.js";

/**
 * Create a handoff target — declares that an agent can transfer control to another.
 *
 * @example
 * const researchAgent = defineAgent({ ... });
 * const analystAgent = defineAgent({
 *   ...
 *   handoffs: [
 *     handoff(researchAgent, { description: "Hand off to researcher for web searches" }),
 *   ],
 * });
 */
export function handoff(
  agent: AgentConfig,
  options?: {
    description?: string;
    contextFilter?: (ctx: AgentContext) => AgentContext;
    inputFilter?: (history: Message[]) => Message[];
  }
): HandoffTarget {
  return {
    agent,
    description:
      options?.description ?? `Transfer to ${agent.name} agent`,
    contextFilter: options?.contextFilter,
    inputFilter: options?.inputFilter,
  };
}

/**
 * Convert handoff targets to tool schemas so the LLM can "call" a handoff,
 * plus a resolver to map tool calls back to HandoffResults.
 *
 * This is the Handoff-as-Tool pattern: handoffs appear as callable tools
 * named `handoff_to_<agent_name>`, letting the LLM decide when to hand off.
 */
export function handoffsToTools(handoffs: HandoffTarget[]): {
  schemas: ProviderToolSchema[];
  resolve: (
    toolName: string,
    ctx: AgentContext,
    history: Message[]
  ) => HandoffResult | null;
} {
  const schemas: ProviderToolSchema[] = handoffs.map((h) => ({
    type: "function",
    function: {
      name: `handoff_to_${h.agent.name}`,
      description: h.description,
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Brief reason for the handoff",
          },
        },
        required: [],
      },
    },
  }));

  const resolve = (
    toolName: string,
    ctx: AgentContext,
    history: Message[]
  ): HandoffResult | null => {
    const target = handoffs.find(
      (h) => `handoff_to_${h.agent.name}` === toolName
    );
    if (!target) return null;

    const filteredCtx = target.contextFilter
      ? target.contextFilter(ctx)
      : ctx;
    const filteredHistory = target.inputFilter
      ? target.inputFilter(history)
      : history;

    return {
      targetAgent: target.agent.name,
      context: {
        ...filteredCtx,
        currentAgent: target.agent.name,
        handoffChain: [...ctx.handoffChain, target.agent.name],
      },
      history: filteredHistory,
    };
  };

  return { schemas, resolve };
}

/**
 * Check if a tool call name is a handoff tool.
 */
export function isHandoffTool(toolName: string): boolean {
  return toolName.startsWith("handoff_to_");
}
