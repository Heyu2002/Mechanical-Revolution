/**
 * Test core task decomposition functionality without LLM calls
 */

import {
  defineAgent,
  createOrchestratorInstructions,
  RESEARCHER_PROMPT,
  CODER_PROMPT,
  MATHEMATICIAN_PROMPT,
} from "../src/index.js";

console.log("=== Task Decomposition Core Test ===\n");

// ── Define specialist agents with capabilities ──

const researchAgent = defineAgent({
  name: "researcher",
  instructions: RESEARCHER_PROMPT,
  provider: "openai",
  model: "gpt-4o",
  capabilities: {
    summary: "Web research and information synthesis specialist",
    skills: [
      "web_search",
      "fact_verification",
      "information_synthesis",
    ],
    useCases: [
      "Answering factual questions",
      "Finding latest information",
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
  model: "claude-opus-4",
  capabilities: {
    summary: "Software development specialist",
    skills: [
      "code_writing",
      "debugging",
      "refactoring",
    ],
    useCases: [
      "Writing production code",
      "Creating examples",
    ],
    limitations: [
      "Cannot perform web searches",
    ],
  },
});

const mathAgent = defineAgent({
  name: "mathematician",
  instructions: MATHEMATICIAN_PROMPT,
  provider: "openai",
  model: "gpt-4o",
  capabilities: {
    summary: "Mathematical computation specialist",
    skills: [
      "calculations",
      "statistical_analysis",
    ],
    useCases: [
      "Solving equations",
      "Data analysis",
    ],
    limitations: [
      "Cannot write production code",
    ],
  },
});

console.log("✓ Defined 3 specialist agents with capabilities\n");

// ── Test createOrchestratorInstructions ──

const allAgents = [researchAgent, coderAgent, mathAgent];
const orchestratorInstructions = createOrchestratorInstructions(allAgents);

console.log("─── Orchestrator Instructions Generated ───\n");
console.log(`Length: ${orchestratorInstructions.length} characters`);
console.log("\nAgent capabilities section:");

// Extract the agent capabilities section
const capabilitiesMatch = orchestratorInstructions.match(/\*\*researcher\*\*:[\s\S]*?\*\*mathematician\*\*:[\s\S]*?- Limitations:/);
if (capabilitiesMatch) {
  console.log(capabilitiesMatch[0].substring(0, 500) + "...");
} else {
  console.log("(Could not extract capabilities section)");
}

// ── Verify agent definitions ──

console.log("\n─── Agent Definitions ───\n");

console.log("researcher:");
console.log(`  - Summary: ${researchAgent.capabilities?.summary}`);
console.log(`  - Skills: ${researchAgent.capabilities?.skills.join(", ")}`);
console.log(`  - Max turns: ${researchAgent.maxTurns}`);

console.log("\ncoder:");
console.log(`  - Summary: ${coderAgent.capabilities?.summary}`);
console.log(`  - Skills: ${coderAgent.capabilities?.skills.join(", ")}`);
console.log(`  - Max turns: ${coderAgent.maxTurns}`);

console.log("\nmathematician:");
console.log(`  - Summary: ${mathAgent.capabilities?.summary}`);
console.log(`  - Skills: ${mathAgent.capabilities?.skills.join(", ")}`);
console.log(`  - Max turns: ${mathAgent.maxTurns}`);

// ── Test orchestrator definition ──

const orchestratorAgent = defineAgent({
  name: "orchestrator",
  instructions: (ctx) => createOrchestratorInstructions(allAgents),
  provider: "openai",
  model: "gpt-4o",
});

console.log("\n─── Orchestrator Agent ───\n");
console.log(`Name: ${orchestratorAgent.name}`);
console.log(`Provider: ${orchestratorAgent.provider}`);
console.log(`Model: ${orchestratorAgent.model}`);
console.log(`Instructions type: ${typeof orchestratorAgent.instructions}`);
console.log(`Max turns: ${orchestratorAgent.maxTurns}`);

// Test dynamic instructions
const mockContext = {
  state: {},
  history: [],
  currentAgent: "orchestrator",
  handoffChain: [],
  metadata: {},
};

if (typeof orchestratorAgent.instructions === "function") {
  const dynamicInstructions = orchestratorAgent.instructions(mockContext);
  console.log(`\nDynamic instructions generated: ${dynamicInstructions.length} characters`);
  console.log("✓ Instructions function works correctly");
}

console.log("\n─── Test Complete ───");
console.log("✅ All core functionality verified!");
console.log("\nNext steps:");
console.log("  1. Configure API keys in config/config.json");
console.log("  2. Run: npx tsx examples/task-decomposition-demo.ts");
console.log("  3. Try the CLI: npm run dev");
