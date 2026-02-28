/**
 * Test AI-driven task routing
 */

import {
  createChatDetector,
  createAIRouter,
  AgentRegistry,
  loadConfig,
  registerBuiltinProviders,
} from "../src/index.js";
import * as path from "path";

console.log("=== AI-Driven Task Routing Test ===\n");

// Register providers first
registerBuiltinProviders();

// Load config
const config = loadConfig();
const defaultProviderName = config.defaultProvider || Object.keys(config.providers)[0];
const defaultProviderConfig = config.providers[defaultProviderName];

// Load agents
const registry = new AgentRegistry({
  projectAgentsDir: path.join(process.cwd(), ".agents"),
  enableHotReload: false,
});

await registry.loadAll();
const agents = registry.list();

console.log(`Loaded ${agents.length} agents:\n`);
for (const agent of agents) {
  console.log(`  - ${agent.name}: ${agent.capabilities?.summary}`);
}
console.log();

// Initialize routing components
const chatDetector = createChatDetector();
const aiRouter = createAIRouter(agents, defaultProviderName, defaultProviderConfig);

// Test cases
const testCases = [
  { input: "你好", expectedType: "simple_chat" },
  { input: "帮我写一个快速排序算法", expectedAgent: "claude-opus-coder" },
  { input: "帮我生成一个有效回文子串算法", expectedAgent: "claude-opus-coder" },
  { input: "帮我翻译这段文字", expectedAgent: "doubao-chinese-vision" },
  { input: "分析这张图片的内容", expectedAgent: "doubao-chinese-vision" },
  { input: "这是一个复杂的多步骤任务，需要研究、编码和测试", expectedAgent: "orchestrator" },
];

console.log("─── Testing Routing Decisions ───\n");

for (const testCase of testCases) {
  console.log(`Input: "${testCase.input}"`);

  // Step 1: Chat detection
  const chatResult = chatDetector.detect(testCase.input);
  console.log(`  Chat detection: ${chatResult.isSimpleChat ? "Simple chat" : "Task"} (${(chatResult.confidence * 100).toFixed(1)}%)`);

  if (!chatResult.isSimpleChat) {
    // Step 2: AI routing
    try {
      const routingDecision = await aiRouter.route(testCase.input);
      console.log(`  AI Decision:`);
      console.log(`    - Target: ${routingDecision.targetAgent}`);
      console.log(`    - Task type: ${routingDecision.taskType}`);
      console.log(`    - Confidence: ${(routingDecision.confidence * 100).toFixed(1)}%`);
      console.log(`    - Reasoning: ${routingDecision.reasoning}`);

      // Check if matches expected
      if (testCase.expectedAgent) {
        const match = routingDecision.targetAgent === testCase.expectedAgent;
        console.log(`    - Result: ${match ? "✅ PASS" : "❌ FAIL"} (expected: ${testCase.expectedAgent})`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : error}`);
    }
  } else {
    // Simple chat
    if (testCase.expectedType === "simple_chat") {
      console.log(`  Result: ✅ PASS (correctly identified as simple chat)`);
    } else {
      console.log(`  Result: ❌ FAIL (expected: ${testCase.expectedType})`);
    }
  }

  console.log();
}

console.log("─── Test Complete ───");
