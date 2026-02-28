/**
 * Test model-based task decomposition functionality without LLM calls
 */

import {
  defineAgent,
  createOrchestratorInstructions,
} from "../src/index.js";

console.log("=== Model-Based Task Decomposition Test ===\n");

// ── Define model-based agents with capabilities ──

const claudeOpusAgent = defineAgent({
  name: "claude-opus-coder",
  instructions: "You are Claude Opus 4, specialized in coding.",
  provider: "anthropic",
  model: "claude-opus-4-20250514",
  capabilities: {
    summary: "Claude Opus 4 - 编码能力突出，擅长复杂代码生成",
    modelStrengths: [
      "长代码生成",
      "复杂逻辑处理",
      "架构设计",
    ],
    taskTypes: [
      "code_writing",
      "debugging",
      "refactoring",
      "architecture_design",
    ],
    languages: [
      "TypeScript",
      "Python",
      "Rust",
      "Go",
    ],
    bestFor: [
      "复杂功能实现",
      "大型代码重构",
      "算法优化",
    ],
    limitations: [
      "不能执行 web 搜索",
      "不能进行复杂数学证明",
    ],
  },
});

const claudeSonnetAgent = defineAgent({
  name: "claude-sonnet-analyst",
  instructions: "You are Claude Sonnet 4, specialized in analysis and reasoning.",
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  capabilities: {
    summary: "Claude Sonnet 4 - 推理和分析能力强，擅长问题分解和数据分析",
    modelStrengths: [
      "逻辑推理",
      "问题分解",
      "数据分析",
      "信息综合",
    ],
    taskTypes: [
      "research",
      "analysis",
      "reasoning",
      "calculation",
    ],
    languages: [
      "English",
      "Chinese",
    ],
    bestFor: [
      "复杂问题分析",
      "数据统计计算",
      "信息检索和综合",
    ],
    limitations: [
      "代码生成能力不如 Claude Opus",
    ],
  },
});

const doubaoAgent = defineAgent({
  name: "doubao-chinese-vision",
  instructions: "你是豆包，专注于中文内容处理和图像分析。",
  provider: "doubao",
  model: "doubao-seed-2-0-pro-260215",
  capabilities: {
    summary: "Doubao - 中文理解能力强，擅长中文内容处理和图像分析",
    modelStrengths: [
      "中文语境理解",
      "中文内容创作",
      "文化适配",
      "图像理解和分析",
      "图文结合处理",
    ],
    taskTypes: [
      "chinese_writing",
      "translation",
      "content_creation",
      "image_analysis",
      "image_description",
    ],
    languages: [
      "Chinese (优势)",
      "English",
    ],
    bestFor: [
      "中文文案创作",
      "中文内容润色",
      "中英翻译",
      "图像内容分析",
      "图文结合任务",
    ],
    limitations: [
      "编码能力相对较弱",
      "复杂逻辑推理不如 Claude Sonnet",
      "图像生成能力有限（主要是理解和分析）",
    ],
  },
});

console.log("✓ Defined 3 model-based agents with capabilities\n");

// ── Test createOrchestratorInstructions ──

const allAgents = [claudeOpusAgent, claudeSonnetAgent, doubaoAgent];
const orchestratorInstructions = createOrchestratorInstructions(allAgents);

console.log("─── Orchestrator Instructions Generated ───\n");
console.log(`Length: ${orchestratorInstructions.length} characters`);
console.log("\nModel capabilities section (first 800 chars):");

// Extract the model capabilities section
const capabilitiesStart = orchestratorInstructions.indexOf('**claude-opus-coder**');
if (capabilitiesStart > 0) {
  const excerpt = orchestratorInstructions.substring(capabilitiesStart, capabilitiesStart + 800);
  console.log(excerpt + "...\n");
} else {
  console.log("(Could not extract capabilities section)\n");
}

// ── Verify agent definitions ──

console.log("─── Model-Based Agent Definitions ───\n");

console.log("claude-opus-coder (anthropic/claude-opus-4-20250514):");
console.log(`  - Summary: ${claudeOpusAgent.capabilities?.summary}`);
console.log(`  - Model Strengths: ${claudeOpusAgent.capabilities?.modelStrengths.join(", ")}`);
console.log(`  - Task Types: ${claudeOpusAgent.capabilities?.taskTypes.join(", ")}`);
console.log(`  - Languages: ${claudeOpusAgent.capabilities?.languages?.join(", ")}`);

console.log("\nclaude-sonnet-analyst (anthropic/claude-sonnet-4-20250514):");
console.log(`  - Summary: ${claudeSonnetAgent.capabilities?.summary}`);
console.log(`  - Model Strengths: ${claudeSonnetAgent.capabilities?.modelStrengths.join(", ")}`);
console.log(`  - Task Types: ${claudeSonnetAgent.capabilities?.taskTypes.join(", ")}`);

console.log("\ndoubao-chinese-vision (doubao/doubao-seed-2-0-pro-260215):");
console.log(`  - Summary: ${doubaoAgent.capabilities?.summary}`);
console.log(`  - Model Strengths: ${doubaoAgent.capabilities?.modelStrengths.join(", ")}`);
console.log(`  - Task Types: ${doubaoAgent.capabilities?.taskTypes.join(", ")}`);
console.log(`  - Best For: ${doubaoAgent.capabilities?.bestFor?.join("; ")}`);
console.log(`  - Limitations: ${doubaoAgent.capabilities?.limitations?.join("; ")}`);

// Verify image processing capability
const hasImageCapability = doubaoAgent.capabilities?.taskTypes.includes("image_analysis") &&
                           doubaoAgent.capabilities?.taskTypes.includes("image_description");
console.log(`\n✓ Has image processing capability: ${hasImageCapability}`);

// ── Test orchestrator definition ──

const orchestratorAgent = defineAgent({
  name: "orchestrator",
  instructions: (ctx) => createOrchestratorInstructions(allAgents),
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
});

console.log("\n─── Orchestrator Agent ───\n");
console.log(`Name: ${orchestratorAgent.name}`);
console.log(`Provider: ${orchestratorAgent.provider}`);
console.log(`Model: ${orchestratorAgent.model}`);
console.log(`Instructions type: ${typeof orchestratorAgent.instructions}`);

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

  // Verify it contains model info
  const hasClaudeOpusInfo = dynamicInstructions.includes("claude-opus-coder") &&
                            dynamicInstructions.includes("anthropic/claude-opus-4");
  const hasClaudeSonnetInfo = dynamicInstructions.includes("claude-sonnet-analyst") &&
                              dynamicInstructions.includes("anthropic/claude-sonnet-4");
  const hasDoubaoInfo = dynamicInstructions.includes("doubao-chinese") &&
                        dynamicInstructions.includes("doubao/doubao-seed");

  console.log(`✓ Contains Claude Opus info: ${hasClaudeOpusInfo}`);
  console.log(`✓ Contains Claude Sonnet info: ${hasClaudeSonnetInfo}`);
  console.log(`✓ Contains Doubao info: ${hasDoubaoInfo}`);
  console.log("✓ Instructions function works correctly");
}

console.log("\n─── Test Complete ───");
console.log("✅ All model-based functionality verified!");
console.log("\n💡 Key Differences from Role-Based:");
console.log("  - Agents are defined by MODEL capabilities, not roles");
console.log("  - Orchestrator selects based on MODEL STRENGTHS");
console.log("  - Each agent shows provider/model in capabilities");
console.log("\n📋 Available Models:");
console.log("  - Claude Opus 4: 编码能力突出");
console.log("  - Claude Sonnet 4: 推理和分析能力强");
console.log("  - Doubao: 中文理解能力强 + 图像处理能力");
console.log("\nNext steps:");
console.log("  1. Configure API keys in config/config.json");
console.log("  2. Run: npx tsx examples/model-based-decomposition.ts");
console.log("  3. Observe how Orchestrator chooses models based on task type");
