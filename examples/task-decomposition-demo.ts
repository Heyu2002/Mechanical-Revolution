/**
 * Mechanical Revolution — Task Decomposition Demo
 *
 * Demonstrates the Orchestrator agent decomposing complex tasks and
 * delegating to specialist agents based on their capabilities.
 *
 * Architecture:
 * - orchestrator (openai/gpt-4o) → master coordinator
 * - researcher (openai/gpt-4o) → web research specialist
 * - coder (anthropic/claude) → code writing specialist
 * - mathematician (openai/gpt-4o) → math computation specialist
 *
 * Usage:
 *   npx tsx examples/task-decomposition-demo.ts
 */

import {
  defineAgent,
  defineTool,
  handoff,
  Runner,
  loadConfig,
  registerBuiltinProviders,
  createContext,
  createOrchestratorInstructions,
  RESEARCHER_PROMPT,
  CODER_PROMPT,
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
  execute: async ({ query }) => {
    // Simulated search results
    if (query.toLowerCase().includes("react 19")) {
      return {
        results: [
          "[Simulated] React 19 introduces Server Components for better performance and streaming",
          "[Simulated] New features: async components, improved hydration, automatic batching",
          "[Simulated] Server Components allow rendering on the server without sending JS to client",
        ],
      };
    }
    return {
      results: [
        `[Simulated] Top result for "${query}": This is a mock search result.`,
        `[Simulated] Related: More information about ${query}.`,
      ],
    };
  },
});

const calculatorTool = defineTool({
  name: "calculator",
  description: "Perform basic math calculations",
  parameters: z.object({
    expression: z.string().describe("Math expression, e.g. '2 + 2' or '10000 * (1 + 0.05)^10'"),
  }),
  execute: async ({ expression }) => {
    try {
      // Simple eval for demo purposes (don't use in production!)
      const result = Function(`"use strict"; return (${expression})`)();
      return { result: String(result) };
    } catch (err) {
      return { error: "Invalid expression", details: String(err) };
    }
  },
});

// ── Specialist Agents with Capabilities ──

const researchAgent = defineAgent({
  name: "researcher",
  instructions: RESEARCHER_PROMPT,
  provider: "openai",
  model: "gpt-4o",
  tools: [searchTool],
  capabilities: {
    summary: "Web research and information synthesis specialist",
    skills: [
      "web_search",
      "fact_verification",
      "information_synthesis",
      "comparative_analysis",
      "current_events_lookup",
    ],
    useCases: [
      "Answering factual questions",
      "Finding latest information",
      "Comparing products/technologies",
    ],
    limitations: [
      "Cannot perform calculations",
      "Cannot write code",
    ],
  },
});

const coderAgent = defineAgent({
  name: "coder",
  instructions: CODER_PROMPT,
  provider: "anthropic",
  model: "claude-opus-4-20250514",
  capabilities: {
    summary: "Software development and code writing specialist",
    skills: [
      "code_writing",
      "debugging",
      "refactoring",
      "code_review",
      "testing",
      "architecture_design",
    ],
    useCases: [
      "Writing production code",
      "Fixing bugs",
      "Code optimization",
      "Creating examples and demos",
    ],
    limitations: [
      "Cannot perform web searches",
      "Cannot do complex mathematical proofs",
    ],
  },
});

const mathAgent = defineAgent({
  name: "mathematician",
  instructions: MATHEMATICIAN_PROMPT,
  provider: "openai",
  model: "gpt-4o",
  tools: [calculatorTool],
  capabilities: {
    summary: "Mathematical computation and analysis specialist",
    skills: [
      "calculations",
      "statistical_analysis",
      "mathematical_proofs",
      "financial_calculations",
      "data_analysis",
    ],
    useCases: [
      "Solving equations",
      "Data analysis",
      "Financial calculations",
      "Statistical computations",
    ],
    limitations: [
      "Cannot search the web",
      "Cannot write production code",
    ],
  },
});

// ── Orchestrator Agent ──

const allAgents = [researchAgent, coderAgent, mathAgent];

const orchestratorAgent = defineAgent({
  name: "orchestrator",
  instructions: (ctx) => createOrchestratorInstructions(allAgents),
  provider: "openai",
  model: "gpt-4o",
  handoffs: [
    handoff(researchAgent, {
      description: "Delegate research tasks to the research specialist",
    }),
    handoff(coderAgent, {
      description: "Delegate coding tasks to the code specialist",
    }),
    handoff(mathAgent, {
      description: "Delegate mathematical tasks to the math specialist",
    }),
  ],
});

// ── Run ──

async function main() {
  const runner = new Runner(config, [orchestratorAgent, ...allAgents]);

  console.log("=== Mechanical Revolution — Task Decomposition Demo ===\n");
  console.log("Agent setup:");
  console.log("  🎯 orchestrator   → openai/gpt-4o (master coordinator)");
  console.log("  🔍 researcher     → openai/gpt-4o (research specialist)");
  console.log("  💻 coder          → anthropic/claude-opus-4 (code specialist)");
  console.log("  🔢 mathematician  → openai/gpt-4o (math specialist)");
  console.log();

  // Test 1: Research + Code (cross-domain task)
  console.log("─── Test 1: Research + Code ───");
  console.log('Input: "研究 React 19 Server Components 并创建一个简单的示例组件"\n');

  const ctx1 = createContext();
  const result1 = await runner.run(
    orchestratorAgent,
    "研究 React 19 Server Components 并创建一个简单的示例组件",
    ctx1
  );

  console.log(`\n✓ Final output (from ${result1.lastAgent}):\n${result1.output}\n`);
  console.log(`Task flow: ${result1.flow.tasks.map(t => t.targetAgent).join(' → ')}\n`);
  console.log("─".repeat(60) + "\n");

  // Test 2: Math + Code
  console.log("─── Test 2: Math + Code ───");
  console.log('Input: "计算 10000 元在 5% 年利率下 10 年的复利，然后用 Python 写一个函数实现它"\n');

  const ctx2 = createContext();
  const result2 = await runner.run(
    orchestratorAgent,
    "计算 10000 元在 5% 年利率下 10 年的复利，然后用 Python 写一个函数实现它",
    ctx2
  );

  console.log(`\n✓ Final output (from ${result2.lastAgent}):\n${result2.output}\n`);
  console.log(`Task flow: ${result2.flow.tasks.map(t => t.targetAgent).join(' → ')}\n`);
  console.log("─".repeat(60) + "\n");

  // Test 3: Simple greeting (direct response, no delegation)
  console.log("─── Test 3: Simple Greeting ───");
  console.log('Input: "你好！"\n');

  const ctx3 = createContext();
  const result3 = await runner.run(orchestratorAgent, "你好！", ctx3);

  console.log(`\n✓ Final output (from ${result3.lastAgent}):\n${result3.output}\n`);
  console.log(`Task flow: ${result3.flow.tasks.map(t => t.targetAgent).join(' → ')}\n`);
  console.log("─".repeat(60) + "\n");

  // Test 4: Single domain task (research only)
  console.log("─── Test 4: Single Domain (Research) ───");
  console.log('Input: "What are the key features of React 19?"\n');

  const ctx4 = createContext();
  const result4 = await runner.run(
    orchestratorAgent,
    "What are the key features of React 19?",
    ctx4
  );

  console.log(`\n✓ Final output (from ${result4.lastAgent}):\n${result4.output}\n`);
  console.log(`Task flow: ${result4.flow.tasks.map(t => t.targetAgent).join(' → ')}\n`);
  console.log("─".repeat(60) + "\n");

  console.log("✅ All tests completed!");
}

main().catch(console.error);
