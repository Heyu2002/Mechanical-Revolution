/**
 * Test Task Memory System
 *
 * 测试新的基于 JSON 的任务记忆系统
 */

import { createTaskMemorySystem } from "../src/index.js";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("=== Task Memory System Test ===\n");

// 创建任务记忆系统
const taskMemory = createTaskMemorySystem({
  memoryDir: path.join(__dirname, "..", ".task-memory-test"),
  quickMemorySize: 5,
  deepMemoryEnabled: true,
  autoSave: false, // 手动保存以便测试
});

console.log("✓ Task memory system created\n");

// Test 1: 添加简单任务
console.log("--- Test 1: Add Simple Task ---");
const simpleTaskId = taskMemory.add({
  userInput: "你好",
  taskComplexity: {
    level: "chitchat",
    score: 10,
  },
  executionAgent: "assistant",
  executionProvider: "openai",
  executionModel: "gpt-4o",
  decomposition: {
    isDecomposed: false,
  },
  steps: [
    {
      stepNumber: 1,
      agent: "assistant",
      provider: "openai",
      model: "gpt-4o",
      input: "你好",
      output: "你好！有什么我可以帮助你的吗？",
      startTime: Date.now(),
      endTime: Date.now() + 500,
      duration: 500,
      status: "completed",
    },
  ],
  finalOutput: "你好！有什么我可以帮助你的吗？",
  status: "completed",
  totalDuration: 500,
});

console.log(`✓ Simple task added: ${simpleTaskId}\n`);

// Test 2: 添加复杂任务（需要分解）
console.log("--- Test 2: Add Complex Task with Decomposition ---");
const complexTaskId = taskMemory.add({
  userInput: "研究 React 19 Server Components 并创建一个简单的示例组件",
  taskComplexity: {
    level: "complex_task",
    score: 65,
    features: {
      linguistic: 70,
      structural: 60,
      contextual: 50,
      semantic: 80,
    },
  },
  executionAgent: "orchestrator",
  executionProvider: "openai",
  executionModel: "gpt-4o",
  decomposition: {
    isDecomposed: true,
    orchestrator: "orchestrator",
    reasoning: "This task requires both research and coding, so I'll delegate to specialist agents",
    subtasks: [
      {
        description: "Research React 19 Server Components features",
        assignedAgent: "researcher",
        reason: "Researcher agent excels at web search and information synthesis",
      },
      {
        description: "Create example component based on research",
        assignedAgent: "coder",
        reason: "Coder agent excels at writing production-ready code",
        dependencies: [0], // 依赖第一个子任务
      },
    ],
  },
  steps: [
    {
      stepNumber: 1,
      agent: "orchestrator",
      provider: "openai",
      model: "gpt-4o",
      input: "研究 React 19 Server Components 并创建一个简单的示例组件",
      output: "I'll break this down into research and coding tasks",
      startTime: Date.now(),
      endTime: Date.now() + 800,
      duration: 800,
      status: "completed",
    },
    {
      stepNumber: 2,
      agent: "researcher",
      provider: "openai",
      model: "gpt-4o",
      input: "Research React 19 Server Components features",
      output: "React 19 introduces Server Components for better performance...",
      toolCalls: [
        {
          toolName: "web_search",
          args: { query: "React 19 Server Components" },
          result: { results: ["Feature 1", "Feature 2"] },
        },
      ],
      startTime: Date.now() + 800,
      endTime: Date.now() + 3000,
      duration: 2200,
      status: "completed",
    },
    {
      stepNumber: 3,
      agent: "orchestrator",
      provider: "openai",
      model: "gpt-4o",
      input: "Received research results, now delegating to coder",
      output: "Delegating to coder agent",
      startTime: Date.now() + 3000,
      endTime: Date.now() + 3500,
      duration: 500,
      status: "completed",
    },
    {
      stepNumber: 4,
      agent: "coder",
      provider: "anthropic",
      model: "claude-opus-4-20250514",
      input: "Create example Server Component based on research",
      output: "Here's a simple Server Component example:\n\n```tsx\nexport default async function ServerComponent() {\n  const data = await fetchData();\n  return <div>{data}</div>;\n}\n```",
      startTime: Date.now() + 3500,
      endTime: Date.now() + 6000,
      duration: 2500,
      status: "completed",
    },
    {
      stepNumber: 5,
      agent: "orchestrator",
      provider: "openai",
      model: "gpt-4o",
      input: "Aggregate results from researcher and coder",
      output: "Task completed successfully",
      startTime: Date.now() + 6000,
      endTime: Date.now() + 6500,
      duration: 500,
      status: "completed",
    },
  ],
  finalOutput: "Based on research, React 19 Server Components allow...\n\nHere's an example:\n```tsx\n...\n```",
  status: "completed",
  totalDuration: 6500,
  totalTokens: 2500,
});

console.log(`✓ Complex task added: ${complexTaskId}\n`);

// Test 3: 添加中等任务
console.log("--- Test 3: Add Medium Task ---");
const mediumTaskId = taskMemory.add({
  userInput: "计算 10000 元在 5% 年利率下 10 年的复利",
  taskComplexity: {
    level: "medium_task",
    score: 35,
  },
  executionAgent: "mathematician",
  executionProvider: "openai",
  executionModel: "gpt-4o",
  decomposition: {
    isDecomposed: false,
  },
  steps: [
    {
      stepNumber: 1,
      agent: "mathematician",
      provider: "openai",
      model: "gpt-4o",
      input: "计算 10000 元在 5% 年利率下 10 年的复利",
      output: "使用复利公式: A = P(1 + r)^t\n结果: 16288.95 元",
      toolCalls: [
        {
          toolName: "calculator",
          args: { expression: "10000 * (1 + 0.05) ** 10" },
          result: { result: "16288.946267774416" },
        },
      ],
      startTime: Date.now(),
      endTime: Date.now() + 1500,
      duration: 1500,
      status: "completed",
    },
  ],
  finalOutput: "10000 元在 5% 年利率下 10 年的复利为 16288.95 元",
  status: "completed",
  totalDuration: 1500,
});

console.log(`✓ Medium task added: ${mediumTaskId}\n`);

// Test 4: 获取记忆
console.log("--- Test 4: Get Memory ---");
const retrieved = taskMemory.get(complexTaskId);
if (retrieved) {
  console.log(`✓ Retrieved task: ${retrieved.id}`);
  console.log(`  User input: ${retrieved.userInput}`);
  console.log(`  Complexity: ${retrieved.taskComplexity.level} (${retrieved.taskComplexity.score})`);
  console.log(`  Decomposed: ${retrieved.decomposition.isDecomposed}`);
  console.log(`  Steps: ${retrieved.steps.length}`);
  console.log(`  Heat score: ${retrieved.heatScore}`);
  console.log(`  Access count: ${retrieved.accessCount}`);
} else {
  console.log("✗ Failed to retrieve task");
}
console.log();

// Test 5: 搜索记忆
console.log("--- Test 5: Search Memory ---");
const searchResults = taskMemory.search("React", { limit: 5 });
console.log(`Found ${searchResults.length} result(s):\n`);
for (const result of searchResults) {
  console.log(`  [${result.source}] Score: ${(result.score * 100).toFixed(1)}%`);
  console.log(`  User input: ${result.entry.userInput}`);
  console.log(`  Match reason: ${result.matchReason}`);
  console.log(`  Complexity: ${result.entry.taskComplexity.level}`);
  console.log();
}

// Test 6: 统计信息
console.log("--- Test 6: Statistics ---");
const stats = taskMemory.getStats();
console.log(`Quick memory: ${stats.quickMemoryCount} entries`);
console.log(`Deep memory: ${stats.deepMemoryCount} entries (${stats.deepMemoryDays} days)`);
console.log(`Total: ${stats.totalSize} entries`);
console.log(`Average heat score: ${stats.avgHeatScore.toFixed(1)}`);
console.log(`Complex tasks: ${stats.complexTaskCount}`);
console.log(`Decomposed tasks: ${stats.decomposedTaskCount}`);
console.log();

// Test 7: 保存
console.log("--- Test 7: Save ---");
taskMemory.save();
console.log("✓ Memory saved to disk\n");

// Test 8: LRU 淘汰测试
console.log("--- Test 8: LRU Eviction Test ---");
console.log("Adding more tasks to trigger eviction (limit: 5)...");

for (let i = 0; i < 5; i++) {
  taskMemory.add({
    userInput: `Test task ${i}`,
    taskComplexity: {
      level: "simple_query",
      score: 20,
    },
    executionAgent: "assistant",
    executionProvider: "openai",
    executionModel: "gpt-4o",
    decomposition: {
      isDecomposed: false,
    },
    steps: [
      {
        stepNumber: 1,
        agent: "assistant",
        provider: "openai",
        model: "gpt-4o",
        input: `Test task ${i}`,
        output: `Response ${i}`,
        startTime: Date.now(),
        endTime: Date.now() + 100,
        duration: 100,
        status: "completed",
      },
    ],
    finalOutput: `Response ${i}`,
    status: "completed",
    totalDuration: 100,
  });
}

const statsAfterEviction = taskMemory.getStats();
console.log(`✓ After adding 5 more tasks:`);
console.log(`  Quick memory: ${statsAfterEviction.quickMemoryCount} entries (should be <= 5)`);
console.log(`  Deep memory: ${statsAfterEviction.deepMemoryCount} entries`);
console.log();

// Test 9: 按日期范围搜索
console.log("--- Test 9: Search by Date Range ---");
const today = new Date().toISOString().split("T")[0];
const dateRangeResults = taskMemory.search("", {
  limit: 10,
  minScore: 0,
  source: "deep",
  dateRange: { start: today, end: today },
});
console.log(`Found ${dateRangeResults.length} result(s) for today\n`);

// Test 10: 清理
console.log("--- Test 10: Cleanup ---");
taskMemory.destroy();
console.log("✓ Memory system destroyed\n");

console.log("=== All Tests Completed ===");
