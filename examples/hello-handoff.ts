/**
 * Mechanical Revolution — Multi-Agent Handoff Example
 *
 * Demonstrates agents using DIFFERENT providers handing off to each other:
 * - triage agent (doubao) → classifies and routes
 * - researcher agent (openai/gpt-4o) → handles research
 * - mathematician agent (anthropic/claude) → handles math
 *
 * Each agent explicitly specifies its own provider/model.
 * No "default provider" — the handoff chain crosses LLM boundaries.
 *
 * Usage:
 *   npx tsx examples/hello-handoff.ts
 */

import {
  defineAgent,
  defineTool,
  handoff,
  Runner,
  loadConfig,
  registerBuiltinProviders,
  createContext,
  TRIAGE_PROMPT,
  RESEARCHER_PROMPT,
  MATHEMATICIAN_PROMPT,
} from "../src/index.js";
import { z } from "zod";

// ── Load config ──
const config = loadConfig();
registerBuiltinProviders();

// ── Tools ──

const searchTool = defineTool({
  name: "web_search",
  description: "Search the web for information",
  parameters: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query }) => ({
    results: [
      `[Simulated] Top result for "${query}": This is a mock search result.`,
      `[Simulated] Related: More information about ${query}.`,
    ],
  }),
});

const calculatorTool = defineTool({
  name: "calculator",
  description: "Perform basic math calculations",
  parameters: z.object({
    expression: z.string().describe("Math expression, e.g. '2 + 2'"),
  }),
  execute: async ({ expression }) => {
    try {
      const result = Function(`"use strict"; return (${expression})`)();
      return { result: String(result) };
    } catch {
      return { error: "Invalid expression" };
    }
  },
});

// ── Agents (each with its own provider/model) ──

// Research agent — uses OpenAI GPT-4o
const researchAgent = defineAgent({
  name: "researcher",
  instructions: RESEARCHER_PROMPT,
  provider: "openai",
  model: "gpt-4o",
  tools: [searchTool],
});

// Math agent — uses Anthropic Claude
const mathAgent = defineAgent({
  name: "mathematician",
  instructions: MATHEMATICIAN_PROMPT,
  provider: "anthropic",
  model: "claude-opus-4-6-kiro",
  tools: [calculatorTool],
});

// Triage agent — uses Doubao (routes to specialists)
const triageAgent = defineAgent({
  name: "triage",
  instructions: TRIAGE_PROMPT,
  provider: "doubao",
  model: "doubao-seed-2-0-pro-260215",
  handoffs: [
    handoff(researchAgent, {
      description: "Hand off to the research specialist (OpenAI GPT-4o) for information lookup",
    }),
    handoff(mathAgent, {
      description: "Hand off to the math specialist (Anthropic Claude) for calculations",
    }),
  ],
});

// ── Run ──

async function main() {
  const allAgents = [triageAgent, researchAgent, mathAgent];
  const runner = new Runner(config, allAgents);

  console.log("=== Mechanical Revolution — Cross-Provider Handoff Demo ===\n");
  console.log("Agent setup:");
  console.log("  🤖 triage      → doubao/doubao-seed-2-0-pro-260215");
  console.log("  🤖 researcher  → openai/gpt-4o");
  console.log("  🤖 mathematician → anthropic/claude-opus-4-6-kiro");
  console.log();

  // Test 1: triage (doubao) → researcher (openai)
  console.log('─── Test 1: "What is quantum computing?" ───\n');
  const ctx1 = createContext();
  const result1 = await runner.run(triageAgent, "What is quantum computing?", ctx1);
  console.log(`\nFinal output (from ${result1.lastAgent}):\n${result1.output}\n`);

  // Test 2: triage (doubao) → mathematician (anthropic)
  console.log('─── Test 2: "What is 42 * 17 + 3?" ───\n');
  const ctx2 = createContext();
  const result2 = await runner.run(triageAgent, "What is 42 * 17 + 3?", ctx2);
  console.log(`\nFinal output (from ${result2.lastAgent}):\n${result2.output}\n`);

  // Test 3: triage responds directly (no handoff)
  console.log('─── Test 3: "Hello!" ───\n');
  const ctx3 = createContext();
  const result3 = await runner.run(triageAgent, "Hello!", ctx3);
  console.log(`\nFinal output (from ${result3.lastAgent}):\n${result3.output}\n`);
}

main().catch(console.error);
