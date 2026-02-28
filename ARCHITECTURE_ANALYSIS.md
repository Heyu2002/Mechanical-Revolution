# Multi-Agent 架构深度分析与改进建议

## 项目对比分析

### 三个项目的定位

| 特性 | Codex | Gemini-CLI | Mechanical-Revolution (当前) |
|------|-------|------------|------------------------------|
| **语言** | Rust + Node.js | TypeScript | TypeScript |
| **规模** | 50+ crates, 100k+ LOC | Monorepo, 20+ packages | 单包, ~5k LOC |
| **定位** | 生产级 IDE 集成 | Google 官方 CLI 工具 | 轻量级多模型框架 |
| **多 Agent** | 真并发 (多线程) | 层级委派 (单进程) | 顺序切换 (handoff) |
| **状态管理** | 持久化 (JSONL + SQLite) | 内存 + 可选持久化 | 纯内存 |
| **沙箱** | OS 级别 (Landlock/Windows Sandbox) | 无 | 无 |
| **配置** | 多层 TOML (继承) | Markdown + YAML | 简单对象 |
| **工具系统** | 注册表 + MCP | 声明式 + MCP | 函数式 |
| **适用场景** | 企业级 IDE | 通用 CLI | 快速原型/研究 |

---

## 核心架构差异

### 1. Agent 定义方式

#### **Codex 方式：角色 + 配置层**
```rust
// 内置角色
AgentRole::Explorer  // 快速探索，只读工具
AgentRole::Worker    // 生产工作，完整权限
AgentRole::Awaiter   // 长时等待，监控进程

// 配置层叠加
spawn_agent(message, role="worker", fork_context=true)
  → 应用 worker.toml 配置
  → 覆盖 model, tools, permissions
```

**优势**：
- 角色语义清晰
- 配置复用性强
- 易于扩展新角色

#### **Gemini-CLI 方式：Markdown 定义**
```yaml
---
name: codebase-investigator
description: Explores codebase structure
kind: local
tools: [Read, Glob, Grep, LSP]
model: gemini-2.5-flash
max_turns: 15
timeout_mins: 5
---

You are a codebase investigator...
```

**优势**：
- 人类可读性强
- 版本控制友好
- 支持热重载
- 支持远程 Agent (A2A 协议)

#### **当前方式：代码定义**
```typescript
const claudeOpusAgent = defineAgent({
  name: "claude-opus-coder",
  instructions: "You are Claude Opus...",
  provider: "anthropic",
  model: "claude-opus-4-6-kiro",
  capabilities: {
    summary: "编码能力突出",
    modelStrengths: ["长代码生成", "复杂逻辑"],
    taskTypes: ["code_writing", "debugging"],
  },
});
```

**问题**：
- 配置与代码耦合
- 难以动态加载
- 用户无法自定义

---

### 2. 多 Agent 协作模式

#### **Codex：真并发 + 消息传递**
```rust
// 父 Agent 生成子 Agent
spawn_agent("分析这个文件", role="explorer")
  → 创建新线程
  → 独立 Session + Context
  → 通过 channel 通信

// 父 Agent 等待子 Agent
wait(agent_id, timeout=300)
  → 轮询子 Agent 状态
  → 获取完成结果

// 父 Agent 发送消息
send_input(agent_id, "继续分析")
  → 异步消息队列
```

**特点**：
- 真正的并发执行
- Agent 之间隔离
- 支持长时运行
- 可以 fork context

#### **Gemini-CLI：层级委派 + SubagentTool**
```typescript
// Agent 作为工具调用
const subagentTool = new SubagentTool(childAgent);

// 父 Agent 调用
parentAgent.tools = [subagentTool];
  → LLM 决定调用 subagent
  → 创建子 Agent 执行器
  → 等待完成并返回结果
  → 父 Agent 继续处理

// 调度器管理
Scheduler
  → 验证工具调用
  → 用户确认 (如需要)
  → 执行工具 (并行/串行)
  → 返回结果
```

**特点**：
- LLM 自主决策何时委派
- 子 Agent 同步执行
- 结果自动返回父 Agent
- 支持工具并行执行

#### **当前方式：顺序 Handoff**
```typescript
// 简单切换
orchestrator → handoff(claudeAgent) → 执行 → 返回
  → orchestrator 继续
  → handoff(doubaoAgent) → 执行 → 返回
```

**问题**：
- 无法并发
- 无法保持多个 Agent 活跃
- 无法 Agent 间通信

---

### 3. 工具系统架构

#### **Codex：注册表 + 路由器**
```rust
ToolRegistry
  ├─ Built-in tools (Read, Write, Bash, etc.)
  ├─ MCP tools (动态加载)
  └─ Custom tools (用户定义)

ToolRouter::dispatch(tool_call)
  → 根据 payload 类型路由
  → 权限检查 (ExecPolicy)
  → 沙箱执行
  → 返回结果
```

**特点**：
- 工具动态注册
- 支持 MCP 协议
- 权限策略控制
- 沙箱隔离

#### **Gemini-CLI：声明式 + 调度器**
```typescript
// 工具定义
class ReadTool extends Tool {
  name = "Read";
  description = "Read file contents";

  async execute(params) {
    // 实现
  }
}

// 调度器管理
Scheduler
  → PolicyEngine (策略检查)
  → ConfirmationBus (用户确认)
  → ToolExecutor (执行)
  → 并行/串行控制
```

**特点**：
- 声明式工具定义
- 策略引擎集成
- 用户确认流程
- 智能调度 (并行优化)

#### **当前方式：函数式**
```typescript
// 简单函数
handoff(agent, description)
  → 返回工具定义
  → LLM 调用
  → Runner 执行
```

**问题**：
- 无工具注册机制
- 无权限控制
- 无并行优化

---

### 4. 配置管理

#### **Codex：多层配置 + 继承**
```toml
# ~/.codex/config.toml (用户级)
[model]
default = "claude-3-5-sonnet"

# .codex/config.toml (项目级)
[model]
default = "gpt-4"  # 覆盖用户配置

# worker.toml (角色级)
[model]
default = "claude-opus-4"  # 覆盖项目配置

# 最终配置 = 内置 < 用户 < 项目 < 角色 < 运行时
```

**特点**：
- 配置继承链
- 优先级清晰
- 支持覆盖

#### **Gemini-CLI：设置 + Agent 定义**
```json
// ~/.gemini/settings.json
{
  "model": "gemini-2.5-flash",
  "agentOverrides": {
    "codebase-investigator": {
      "model": "gemini-2.5-pro"
    }
  }
}

// .gemini/agents/my-agent.md
---
model: gemini-2.5-flash  # Agent 自己的配置
---
```

**特点**：
- 设置与 Agent 分离
- 支持 Agent 级覆盖
- 用户/项目级配置

#### **当前方式：代码硬编码**
```typescript
const config = loadConfig();  // 从文件加载
const agent = defineAgent({
  model: "claude-opus-4-6-kiro",  // 硬编码
});
```

**问题**：
- 配置不灵活
- 无法动态调整
- 无继承机制

---

## 架构改进建议

基于两个项目的分析，我建议对 Mechanical-Revolution 进行以下改进：

### 改进方向 1：采用 Markdown 定义 Agent（推荐）

**理由**：
- ✅ 保持轻量级（不需要 Rust 的复杂性）
- ✅ 用户友好（Markdown 易读易写）
- ✅ 版本控制友好
- ✅ 支持热重载
- ✅ 与 Gemini-CLI 对齐（成熟方案）

**实现**：
```
.agents/
├── claude-opus-coder.md
├── doubao-chinese.md
└── orchestrator.md
```

**Agent 定义格式**：
```yaml
---
name: claude-opus-coder
description: Claude Opus 4 专注编码任务
provider: anthropic
model: claude-opus-4-6-kiro
temperature: 0.7
max_turns: 20

capabilities:
  summary: 编码能力突出，擅长复杂代码生成
  modelStrengths:
    - 长代码生成
    - 复杂逻辑处理
    - 算法实现
  taskTypes:
    - code_writing
    - debugging
    - refactoring
  languages:
    - TypeScript
    - Python
    - Rust

tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
---

You are Claude Opus 4, a world-class coding assistant.

Your strengths:
- Writing clean, maintainable code
- Implementing complex algorithms
- Debugging and optimization

When given a coding task:
1. Analyze requirements carefully
2. Design before implementing
3. Write tests when appropriate
4. Explain your approach
```

---

### 改进方向 2：实现 Agent 注册表

**参考 Gemini-CLI 的 AgentRegistry**：

```typescript
// src/agent-registry.ts
export class AgentRegistry {
  private agents = new Map<string, AgentConfig>();
  private watchers = new Map<string, FSWatcher>();

  // 加载 Agent
  async loadAll() {
    // 1. 内置 Agent
    this.loadBuiltinAgents();

    // 2. 用户级 Agent (~/.mechanical-revolution/agents/)
    await this.loadFromDirectory(getUserAgentsDir());

    // 3. 项目级 Agent (.agents/)
    await this.loadFromDirectory(getProjectAgentsDir());

    // 4. 启动热重载
    this.watchDirectories();
  }

  // 从 Markdown 加载
  async loadFromFile(path: string) {
    const content = await fs.readFile(path, 'utf-8');
    const agent = parseAgentMarkdown(content);
    this.register(agent);
  }

  // 注册 Agent
  register(agent: AgentConfig) {
    this.agents.set(agent.name, agent);
    this.emit('agent-registered', agent);
  }

  // 获取 Agent
  get(name: string): AgentConfig | undefined {
    return this.agents.get(name);
  }

  // 列出所有 Agent
  list(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  // 热重载
  private watchDirectories() {
    const dirs = [getUserAgentsDir(), getProjectAgentsDir()];
    dirs.forEach(dir => {
      const watcher = fs.watch(dir, (event, filename) => {
        if (filename?.endsWith('.md')) {
          this.loadFromFile(path.join(dir, filename));
        }
      });
      this.watchers.set(dir, watcher);
    });
  }
}
```

---

### 改进方向 3：改进多 Agent 协作（SubagentTool）

**参考 Gemini-CLI 的 SubagentTool**：

```typescript
// src/subagent-tool.ts
export class SubagentTool implements Tool {
  constructor(
    private agent: AgentConfig,
    private runner: Runner
  ) {}

  get name() {
    return `delegate_to_${this.agent.name}`;
  }

  get description() {
    return `Delegate task to ${this.agent.name}: ${this.agent.capabilities?.summary}`;
  }

  get parameters() {
    return {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "The task to delegate to this agent"
        },
        context: {
          type: "string",
          description: "Additional context for the task"
        }
      },
      required: ["task"]
    };
  }

  async execute(params: { task: string; context?: string }) {
    // 创建子 Agent 上下文
    const childContext = createContext({
      parentAgent: this.currentAgent,
      task: params.task,
      context: params.context
    });

    // 执行子 Agent
    const result = await this.runner.run(
      this.agent,
      params.task,
      childContext
    );

    // 返回结果给父 Agent
    return {
      success: true,
      output: result.output,
      lastAgent: result.lastAgent
    };
  }
}

// 使用
const orchestrator = defineAgent({
  name: "orchestrator",
  instructions: createOrchestratorInstructions(allAgents),
  tools: [
    new SubagentTool(claudeAgent, runner),
    new SubagentTool(doubaoAgent, runner),
  ]
});
```

---

### 改进方向 4：实现工具注册表

**参考 Codex 的 ToolRegistry**：

```typescript
// src/tool-registry.ts
export class ToolRegistry {
  private tools = new Map<string, Tool>();

  // 注册工具
  register(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  // 批量注册
  registerAll(tools: Tool[]) {
    tools.forEach(tool => this.register(tool));
  }

  // 获取工具
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  // 列出工具
  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  // 转换为 LLM 工具定义
  toToolDefinitions(): ToolDefinition[] {
    return this.list().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }

  // 执行工具
  async execute(name: string, params: any): Promise<any> {
    const tool = this.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool.execute(params);
  }
}

// 使用
const registry = new ToolRegistry();
registry.registerAll([
  new ReadTool(),
  new WriteTool(),
  new BashTool(),
  new SubagentTool(claudeAgent, runner),
  new SubagentTool(doubaoAgent, runner),
]);
```

---

### 改进方向 5：多层配置系统

**参考 Codex 的配置层**：

```typescript
// src/config-manager.ts
export class ConfigManager {
  private layers: ConfigLayer[] = [];

  constructor() {
    // 配置层优先级（从低到高）
    this.layers = [
      new BuiltinConfigLayer(),      // 内置默认
      new UserConfigLayer(),          // ~/.mechanical-revolution/config.json
      new ProjectConfigLayer(),       // .mechanical-revolution/config.json
      new RuntimeConfigLayer(),       // 运行时覆盖
    ];
  }

  // 获取最终配置
  get<T>(key: string): T | undefined {
    // 从高优先级到低优先级查找
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const value = this.layers[i].get(key);
      if (value !== undefined) {
        return value;
      }
    }
    return undefined;
  }

  // 合并所有层
  merge(): Config {
    return this.layers.reduce((acc, layer) => {
      return deepMerge(acc, layer.getAll());
    }, {});
  }

  // 运行时覆盖
  override(key: string, value: any) {
    this.layers[this.layers.length - 1].set(key, value);
  }
}

// 配置文件格式
// ~/.mechanical-revolution/config.json
{
  "model": {
    "default": "claude-3-5-sonnet",
    "temperature": 0.7
  },
  "agents": {
    "claude-opus-coder": {
      "model": "claude-opus-4-6-kiro",
      "temperature": 0.5
    }
  },
  "routing": {
    "complexity_threshold": 70,
    "similarity_threshold": 0.15
  }
}
```

---

### 改进方向 6：事件驱动架构

**参考 Gemini-CLI 的 MessageBus**：

```typescript
// src/event-bus.ts
export class EventBus extends EventEmitter {
  // Agent 事件
  onAgentStarted(handler: (agent: string) => void) {
    this.on('agent:started', handler);
  }

  onAgentCompleted(handler: (agent: string, result: any) => void) {
    this.on('agent:completed', handler);
  }

  // 工具事件
  onToolCalled(handler: (tool: string, params: any) => void) {
    this.on('tool:called', handler);
  }

  onToolCompleted(handler: (tool: string, result: any) => void) {
    this.on('tool:completed', handler);
  }

  // 路由事件
  onRouting(handler: (decision: RoutingDecision) => void) {
    this.on('routing:decision', handler);
  }

  // 学习事件
  onLearning(handler: (stats: LearningStats) => void) {
    this.on('learning:updated', handler);
  }
}

// 使用
const eventBus = new EventBus();

eventBus.onAgentStarted((agent) => {
  console.log(`Agent started: ${agent}`);
});

eventBus.onRouting((decision) => {
  console.log(`Routing: ${decision.from} → ${decision.to}`);
  console.log(`Reason: ${decision.reason}`);
});
```

---

## 推荐实施路线图

### Phase 1: 基础架构重构（1-2 周）

**优先级：高**

1. ✅ **Agent 注册表**
   - 实现 `AgentRegistry`
   - 支持 Markdown 加载
   - 热重载机制

2. ✅ **配置管理**
   - 实现 `ConfigManager`
   - 多层配置支持
   - 用户/项目级配置

3. ✅ **工具注册表**
   - 实现 `ToolRegistry`
   - 统一工具接口
   - 动态注册机制

### Phase 2: 多 Agent 协作（1-2 周）

**优先级：高**

1. ✅ **SubagentTool**
   - Agent 作为工具
   - 层级委派
   - 结果聚合

2. ✅ **改进 Orchestrator**
   - 动态感知可用 Agent
   - 智能任务分解
   - 并行执行支持（可选）

3. ✅ **TaskFlow 追踪**
   - 记录 Agent 调用链
   - 可视化任务流
   - 调试支持

### Phase 3: 高级特性（2-3 周）

**优先级：中**

1. ⏳ **事件系统**
   - 实现 `EventBus`
   - 事件驱动架构
   - 插件支持

2. ⏳ **持久化**
   - 对话历史保存
   - Agent 状态恢复
   - 学习数据持久化

3. ⏳ **远程 Agent**
   - A2A 协议支持
   - 远程 Agent 调用
   - 认证机制

### Phase 4: 生产特性（3-4 周）

**优先级：低**

1. ⏳ **权限控制**
   - 工具权限策略
   - 用户确认流程
   - 审计日志

2. ⏳ **性能优化**
   - 并行工具执行
   - 缓存机制
   - 流式响应

3. ⏳ **监控和调试**
   - 性能指标
   - 错误追踪
   - 调试工具

---

## 总结

### 核心改进点

1. **Agent 定义**：代码定义 → Markdown 定义
2. **Agent 管理**：硬编码 → 注册表 + 热重载
3. **多 Agent**：简单 handoff → SubagentTool + 层级委派
4. **工具系统**：函数式 → 注册表 + 统一接口
5. **配置**：硬编码 → 多层配置 + 继承
6. **架构**：同步 → 事件驱动

### 保持的优势

- ✅ TypeScript 单语言（不需要 Rust）
- ✅ 轻量级（不需要 Codex 的复杂性）
- ✅ 快速原型（不需要企业级特性）
- ✅ 自适应学习（独特优势）

### 借鉴的精华

- ✅ Gemini-CLI 的 Markdown Agent 定义
- ✅ Gemini-CLI 的 SubagentTool 模式
- ✅ Codex 的多层配置系统
- ✅ Codex 的工具注册表
- ✅ 两者的事件驱动架构

通过这些改进，Mechanical-Revolution 将成为一个**轻量但强大**的多 Agent 框架，兼具易用性和扩展性。
