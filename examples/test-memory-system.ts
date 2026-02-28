/**
 * Test Memory System
 *
 * 测试持久化记忆系统的功能
 */

import { createMemorySystem } from "../src/memory-system.js";
import * as path from "path";

console.log("=== Memory System Test ===\n");

// 创建记忆系统
const memory = createMemorySystem({
  memoryDir: path.join(process.cwd(), ".memory"),
  quickMemorySize: 10,
  quickMemoryTTL: 24 * 60 * 60 * 1000, // 24小时
  deepMemoryEnabled: true,
  autoSave: true,
});

console.log("─── Step 1: 添加记忆 ───\n");

// 添加一些记忆
const id1 = memory.add("用户喜欢使用 TypeScript 进行开发", {
  context: "编程偏好",
  tags: ["programming", "typescript"],
  importance: 0.8,
  metadata: { category: "preference" },
});
console.log(`✓ 添加记忆 1: ${id1}`);

const id2 = memory.add("用户正在开发一个多 Agent 协作框架", {
  context: "当前项目",
  tags: ["project", "multi-agent"],
  importance: 0.9,
  metadata: { category: "project" },
});
console.log(`✓ 添加记忆 2: ${id2}`);

const id3 = memory.add("用户询问了如何实现快速排序算法", {
  context: "历史对话",
  tags: ["algorithm", "sorting"],
  importance: 0.6,
  metadata: { category: "conversation" },
});
console.log(`✓ 添加记忆 3: ${id3}`);

const id4 = memory.add("用户的 GitHub 用户名是 Heyu2002", {
  context: "用户信息",
  tags: ["user", "github"],
  importance: 0.7,
  metadata: { category: "user-info" },
});
console.log(`✓ 添加记忆 4: ${id4}`);

const id5 = memory.add("用户喜欢使用 Claude 进行任务路由", {
  context: "系统偏好",
  tags: ["preference", "ai"],
  importance: 0.8,
  metadata: { category: "preference" },
});
console.log(`✓ 添加记忆 5: ${id5}`);

console.log("\n─── Step 2: 搜索记忆 ───\n");

// 搜索记忆
console.log("搜索: \"TypeScript\"");
const results1 = memory.search("TypeScript", { limit: 3 });
for (const result of results1) {
  console.log(`  - [${result.source}] ${result.entry.content} (score: ${(result.score * 100).toFixed(1)}%)`);
}

console.log("\n搜索: \"算法\"");
const results2 = memory.search("算法", { limit: 3 });
for (const result of results2) {
  console.log(`  - [${result.source}] ${result.entry.content} (score: ${(result.score * 100).toFixed(1)}%)`);
}

console.log("\n搜索: \"用户\"");
const results3 = memory.search("用户", { limit: 5 });
for (const result of results3) {
  console.log(`  - [${result.source}] ${result.entry.content} (score: ${(result.score * 100).toFixed(1)}%)`);
}

console.log("\n─── Step 3: 获取记忆 ───\n");

const entry = memory.get(id2);
if (entry) {
  console.log(`记忆 ID: ${entry.id}`);
  console.log(`内容: ${entry.content}`);
  console.log(`上下文: ${entry.context}`);
  console.log(`标签: ${entry.tags?.join(", ")}`);
  console.log(`重要性: ${entry.importance}`);
  console.log(`访问次数: ${entry.accessCount}`);
}

console.log("\n─── Step 4: 统计信息 ───\n");

const stats = memory.getStats();
console.log(`快速记忆数量: ${stats.quickMemoryCount}`);
console.log(`深度记忆数量: ${stats.deepMemoryCount}`);
console.log(`总记忆数量: ${stats.totalSize}`);
console.log(`最早记忆: ${new Date(stats.oldestEntry).toLocaleString()}`);
console.log(`最新记忆: ${new Date(stats.newestEntry).toLocaleString()}`);

console.log("\n─── Step 5: 测试 LRU 淘汰 ───\n");

// 添加更多记忆以触发 LRU 淘汰
console.log("添加 10 个新记忆以触发 LRU 淘汰...");
for (let i = 0; i < 10; i++) {
  memory.add(`测试记忆 ${i + 1}`, {
    context: "测试",
    tags: ["test"],
    importance: 0.3,
  });
}

const statsAfter = memory.getStats();
console.log(`快速记忆数量: ${statsAfter.quickMemoryCount} (应该 <= 10)`);
console.log(`深度记忆数量: ${statsAfter.deepMemoryCount} (应该增加)`);

console.log("\n─── Step 6: 保存记忆 ───\n");

memory.save();
console.log("✓ 记忆已保存到磁盘");

console.log("\n─── Step 7: 测试持久化 ───\n");

// 创建新的记忆系统实例
const memory2 = createMemorySystem({
  memoryDir: path.join(process.cwd(), ".memory"),
});

const stats2 = memory2.getStats();
console.log(`重新加载后的快速记忆数量: ${stats2.quickMemoryCount}`);
console.log(`重新加载后的深度记忆数量: ${stats2.deepMemoryCount}`);

// 搜索之前添加的记忆
const results4 = memory2.search("TypeScript", { limit: 1 });
if (results4.length > 0) {
  console.log(`✓ 成功从持久化存储中找到记忆: ${results4[0].entry.content}`);
}

console.log("\n─── Step 8: 清理 ───\n");

// 销毁记忆系统
memory.destroy();
memory2.destroy();

console.log("✓ 记忆系统已销毁");

console.log("\n─── Test Complete ───");
console.log("\n记忆文件位置:");
console.log(`  - Quick Memory: .memory/quick-memory.md`);
console.log(`  - Deep Memory: .memory/deep-memory.md`);
