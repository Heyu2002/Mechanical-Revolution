# 快速参考指南

## 🚀 5 分钟快速开始

### 1. 安装和构建

```bash
npm install
npm run build
```

### 2. 运行示例

```bash
# 测试新架构
npx tsx examples/test-new-architecture.ts

# 完整多 Agent 协作
npx tsx examples/complete-multi-agent-demo.ts
```

## 📖 常用操作

### 创建自定义 Agent

```bash
# 1. 创建文件
cat > .agents/my-agent.md << 'EOF'
---
name: my-agent
description: My custom agent
provider: anthropic
model: claude-3-5-sonnet-20241022
temperature: 0.7
tools: [Read, Write]
capabilities:
  summary: "Custom agent"
  modelStrengths: [task1, task2]
  taskTypes: [type1, type2]
---

You are a custom agent...
EOF

# 2. 使用
const agent = registry.get("my-agent");
const result = await runner.run(agent, input, context);
```

### 加载所有 Agent

```typescript
import { AgentRegistry } from "./src/index.js";

const registry = new AgentRegistry();
await registry.loadAll();

// 列出所有 Agent
registry.list().forEach(agent => {
  console.log(agent.name);
});

// 搜索 Agent
const results = registry.search("编码");
```

### 使用 SubagentTool

```typescript
import { createSubagentTool, defineAgent } from "./src/index.js";

// 创建 SubagentTool
const tool = createSubagentTool(childAgent, runner);

// 配置父 Agent
const parentAgent = defineAgent({
  name: "parent",
  instructions: "...",
  tools: [tool],  // 添加 SubagentTool
});

// LLM 会自动决策何时调用
```

### 监听事件

```typescript
import { globalEventBus } from "./src/index.js";

// 监听 Agent 启动
globalEventBus.onAgentStarted(event => {
  console.log(`Agent started: ${event.agent}`);
});

// 监听路由决策
globalEventBus.onRoutingDecision(event => {
  console.log(`${event.from} → ${event.to}: ${event.reason}`);
});

// 监听所有事件
globalEventBus.onAny(event => {
  console.log(event);
});
```

### 配置管理

```typescript
import { ConfigManager } from "./src/index.js";

const manager = new ConfigManager();

// 获取配置
const config = manager.getConfig();

// 获取特定值
const value = manager.get("autonomousMode");

// 运行时覆盖
manager.override("autonomousMode", true);
```

### 智能路由

```typescript
import {
  createComplexityClassifier,
  createAgentMatcher,
} from "./src/index.js";

const classifier = createComplexityClassifier();
const matcher = createAgentMatcher(allAgents);

// 判断复杂度
const complexity = classifier.classify(input);
console.log(complexity.decision);  // chitchat | simple_query | medium_task | complex_task

// 匹配 Agent
const match = matcher.findBestAgent(input, currentAgent, allAgents);
console.log(match.bestAgent.name);
console.log(match.similarity);
```

## 🔧 配置文件

### 用户级配置

```bash
# ~/.mechanical-revolution/config.json
{
  "autonomousMode": false,
  "providers": {
    "anthropic": {
      "apiKey": "your-key",
      "model": "claude-3-5-sonnet-20241022"
    }
  }
}
```

### 项目级配置

```bash
# .mechanical-revolution/config.json
{
  "workspace": "./workspace",
  "tracing": {
    "enabled": true,
    "output": "file"
  }
}
```

## 📁 目录结构

```
.
├── .agents/                    # 项目级 Agent
│   ├── claude-opus-coder.md
│   ├── doubao-chinese-vision.md
│   └── orchestrator.md
├── .mechanical-revolution/     # 项目级配置
│   └── config.json
├── ~/.mechanical-revolution/   # 用户级配置
│   ├── agents/                 # 用户级 Agent
│   └── config.json
├── src/                        # 源代码
├── examples/                   # 示例
└── docs/                       # 文档
```

## 🎯 常见场景

### 场景 1: 简单任务

```typescript
// 直接使用单个 Agent
const agent = registry.get("claude-opus-coder");
const result = await runner.run(agent, "实现快速排序", context);
```

### 场景 2: 复杂任务

```typescript
// 使用 Orchestrator 分解任务
const orchestrator = registry.get("orchestrator");
const result = await runner.run(
  orchestrator,
  "研究 React 19，创建示例，编写测试",
  context
);
```

### 场景 3: 智能路由

```typescript
// 自动选择最合适的 Agent
const selectedAgent = smartRoute(input, currentAgent);
const result = await runner.run(selectedAgent, input, context);
```

### 场景 4: 事件监控

```typescript
// 监控整个执行过程
globalEventBus.onAny(event => {
  logger.log(event);
});

const result = await runner.run(agent, input, context);
```

## 🐛 调试技巧

### 1. 查看 Agent 列表

```typescript
const agents = registry.list();
console.table(agents.map(a => ({
  name: a.name,
  provider: a.provider,
  model: a.model,
  source: a.source,
})));
```

### 2. 查看配置层

```typescript
const layers = configManager.listLayers();
console.log(layers);

const exported = configManager.export();
console.log(JSON.stringify(exported, null, 2));
```

### 3. 监听所有事件

```typescript
globalEventBus.onAny(event => {
  console.log(`[${event.type}]`, event);
});
```

### 4. 查看任务流

```typescript
const result = await runner.run(agent, input, context);
console.log(result.flow);
console.log(`Total tasks: ${result.flow.tasks.length}`);
```

## 📊 性能优化

### 1. 禁用热重载

```typescript
const registry = new AgentRegistry({
  enableHotReload: false,  // 生产环境禁用
});
```

### 2. 缓存 Agent

```typescript
// 一次加载，多次使用
await registry.loadAll();
const agent = registry.get("my-agent");  // 从缓存获取
```

### 3. 减少事件监听

```typescript
// 只监听必要的事件
globalEventBus.onAgentStarted(handler);
// 不要使用 onAny() 在生产环境
```

## 🔒 安全建议

### 1. 保护 API Key

```bash
# 不要提交到 Git
echo "config/config.json" >> .gitignore
echo ".mechanical-revolution/config.json" >> .gitignore
```

### 2. 验证 Agent 来源

```typescript
const agent = registry.get("my-agent");
if (agent.source !== "builtin") {
  console.warn("Using non-builtin agent");
}
```

### 3. 限制工具权限

```typescript
// 只给必要的工具
const agent = defineAgent({
  tools: [readTool],  // 不给 writeTool
});
```

## 📚 更多资源

- [完整文档](./ARCHITECTURE_SUMMARY.md)
- [架构分析](./ARCHITECTURE_ANALYSIS.md)
- [Phase 1 报告](./PHASE1_COMPLETION_REPORT.md)
- [Phase 2 报告](./PHASE2_COMPLETION_REPORT.md)
- [实施清单](./IMPLEMENTATION_CHECKLIST.md)

## 💡 提示和技巧

### 1. Agent 命名

```yaml
# 使用描述性名称
name: claude-opus-coder  # ✅ 好
name: agent1             # ❌ 不好
```

### 2. 工具选择

```yaml
# 只给必要的工具
tools: [Read, Write]     # ✅ 好
tools: [Read, Write, Bash, Grep, Glob, ...]  # ❌ 太多
```

### 3. 温度设置

```yaml
# 编码任务用低温度
temperature: 0.3  # 编码

# 创意任务用高温度
temperature: 0.9  # 写作
```

### 4. 最大轮次

```yaml
# 简单任务
maxTurns: 5

# 复杂任务
maxTurns: 20

# Orchestrator
maxTurns: 30
```

## 🎓 学习路径

### 初学者

1. 运行 `test-new-architecture.ts`
2. 阅读 `.agents/` 中的示例
3. 创建自己的 Agent
4. 运行 `complete-multi-agent-demo.ts`

### 进阶

1. 理解 SubagentTool 原理
2. 实现自定义工具
3. 配置智能路由
4. 使用事件系统

### 高级

1. 阅读架构文档
2. 理解自适应学习
3. 扩展框架功能
4. 贡献代码

## ❓ 常见问题

### Q: Agent 没有加载？

```typescript
// 检查文件路径
console.log(registry.list());

// 检查文件格式
// 确保有 --- 分隔符和正确的 YAML
```

### Q: 工具找不到？

```typescript
// 注册工具
toolRegistry.register(myTool);

// 检查工具名称
console.log(toolRegistry.listNames());
```

### Q: 配置不生效？

```typescript
// 检查配置层
const exported = configManager.export();
console.log(exported);

// 确认优先级
// Builtin < User < Project < Runtime
```

### Q: 事件没有触发？

```typescript
// 确保在执行前监听
globalEventBus.onAgentStarted(handler);
await runner.run(agent, input, context);

// 不要在执行后监听
```

## 🚀 快速命令

```bash
# 构建
npm run build

# 开发模式
npm run dev

# 类型检查
npm run typecheck

# 测试新架构
npx tsx examples/test-new-architecture.ts

# 完整示例
npx tsx examples/complete-multi-agent-demo.ts

# 智能路由
npx tsx examples/smart-routing-example.ts

# 自适应学习
npx tsx examples/test-adaptive-classifier.ts
```

---

**提示**: 这是一个快速参考指南。详细信息请查看完整文档。
