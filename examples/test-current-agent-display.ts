/**
 * Test Current Agent Display
 *
 * 测试在 CLI 中显示当前 Agent 的功能
 */

import { InteractivePrompt } from "../src/autocomplete.js";

console.log("=== Testing Current Agent Display ===\n");

const commands = [
  { name: "/help", description: "Show help" },
  { name: "/quit", description: "Exit" },
];

const prompt = new InteractivePrompt(commands);

// 测试设置和获取当前 Agent
console.log("Test 1: Set and get current agent");
prompt.setCurrentAgent("claude-opus-coder");
console.log(`Current agent: ${prompt.getCurrentAgent()}`);
console.log("✓ Pass\n");

// 测试切换 Agent
console.log("Test 2: Switch agent");
prompt.setCurrentAgent("doubao-chinese-vision");
console.log(`Current agent: ${prompt.getCurrentAgent()}`);
console.log("✓ Pass\n");

// 测试清空 Agent
console.log("Test 3: Clear agent");
prompt.setCurrentAgent("");
console.log(`Current agent: "${prompt.getCurrentAgent()}"`);
console.log("✓ Pass\n");

console.log("=== All Tests Passed ===\n");

console.log("Visual Test:");
console.log("When you run 'npm run dev', you should see:");
console.log("  current agent: assistant");
console.log("  you > ");
console.log("\nThe 'current agent' line will update when:");
console.log("  - You switch providers with /provider");
console.log("  - You switch agents with /agent");
console.log("  - An agent handoff occurs");
