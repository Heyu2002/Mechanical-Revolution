import type { AgentContext } from "../../types.js";

/**
 * Create a fresh AgentContext with default values.
 * The context flows through the entire agent chain and carries shared state.
 */
export function createContext<T extends Record<string, unknown> = Record<string, unknown>>(
  initial?: Partial<AgentContext<T>>
): AgentContext<T> {
  return {
    state: (initial?.state ?? {}) as T,
    history: initial?.history ?? [],
    currentAgent: initial?.currentAgent ?? "",
    handoffChain: initial?.handoffChain ?? [],
    metadata: initial?.metadata ?? {},
  };
}

/**
 * Clone a context (shallow copy of state, deep copy of arrays).
 * Used during handoffs to avoid mutation side effects.
 */
export function cloneContext(ctx: AgentContext): AgentContext {
  return {
    state: { ...ctx.state },
    history: [...ctx.history],
    currentAgent: ctx.currentAgent,
    handoffChain: [...ctx.handoffChain],
    metadata: { ...ctx.metadata },
  };
}
