# Mechanical Revolution - 目录结构

```
src/
│
├── 📁 cli/                       # CLI 模块 - 用户交互层
│   ├── 📁 commands/             # 命令处理
│   │   ├── constants.ts        # 命令定义
│   │   ├── handler.ts          # 命令处理器
│   │   └── index.ts
│   ├── 📁 ui/                   # UI 组件
│   │   ├── banner.ts           # Banner 和帮助
│   │   ├── colors.ts           # 颜色常量
│   │   ├── flow-renderer.ts   # 任务流渲染器
│   │   ├── provider-names.ts  # Provider 名称映射
│   │   └── index.ts
│   └── autocomplete.ts         # 自动补全
│
├── 📁 core/                      # 核心框架 - 业务逻辑层
│   ├── 📁 agent/                # Agent 系统
│   │   ├── agent.ts            # Agent 定义
│   │   ├── registry.ts         # Agent 注册表
│   │   ├── loader.ts           # Markdown 加载器
│   │   └── index.ts
│   ├── 📁 runner/               # 执行引擎
│   │   ├── runner.ts           # 主执行器
│   │   ├── context.ts          # 执行上下文
│   │   └── index.ts
│   ├── 📁 tool/                 # 工具系统
│   │   ├── tool.ts             # 工具定义
│   │   ├── handoff.ts          # Handoff 工具
│   │   └── index.ts
│   ├── 📁 guardrail/            # 护栏系统
│   │   ├── guardrail.ts
│   │   └── index.ts
│   └── index.ts
│
├── 📁 routing/                   # 路由系统 - 核心创新
│   ├── chat-detector.ts         # 简单对话检测
│   ├── ai-router.ts             # AI 任务路由
│   └── index.ts
│
├── 📁 memory/                    # 记忆系统
│   ├── task-memory.ts           # 任务记忆
│   └── index.ts
│
├── 📁 providers/                 # Provider 抽象层
│   ├── base.ts                  # 基础 Provider
│   ├── anthropic.ts             # Claude Provider
│   ├── openai.ts                # OpenAI Provider
│   ├── registry.ts              # Provider 注册表
│   ├── tool-prompt.ts           # 工具调用 Prompt
│   └── index.ts
│
├── 📁 skills/                    # Skills 系统
│   ├── loader.ts                # Skill 加载器
│   └── index.ts
│
├── 📁 observability/             # 可观测性
│   ├── tracing.ts               # 追踪系统
│   ├── task-flow.ts             # 任务流追踪
│   ├── event-bus.ts             # 事件总线
│   └── index.ts
│
├── 📁 config/                    # 配置管理
│   ├── config.ts                # 配置加载
│   └── index.ts
│
├── 📁 prompts/                   # Prompt 管理
│   ├── system.ts                # 系统 Prompt
│   ├── agents.ts                # Agent Prompts
│   └── index.ts
│
├── 📁 utils/                     # 工具函数
│   ├── logger.ts                # 日志工具
│   └── stream.ts                # 流处理
│
├── types.ts                      # 类型定义
├── index.ts                      # 主导出（公共 API）
└── cli.ts                        # CLI 入口
```

## 模块依赖关系

```
┌─────────────────────────────────────────────────────────┐
│                         CLI                             │
│  (用户交互、命令处理、UI 渲染)                           │
└────────────────┬────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────┐
│                    Core + Routing                       │
│  (核心逻辑、Agent 系统、任务路由)                        │
└────────────┬───────────────────────────────────────────┘
             │
             ↓
┌────────────────────────────────────────────────────────┐
│              Memory + Skills + Observability            │
│  (记忆管理、技能系统、可观测性)                          │
└────────────┬───────────────────────────────────────────┘
             │
             ↓
┌────────────────────────────────────────────────────────┐
│                 Providers + Config                      │
│  (LLM 抽象、配置管理)                                    │
└────────────────────────────────────────────────────────┘
```

## 设计原则

### 1. 单一职责
每个模块只负责一个领域

### 2. 依赖方向
- CLI → Core → Providers
- 上层依赖下层，下层不依赖上层

### 3. 导出策略
- 每个模块有自己的 `index.ts`
- 主 `src/index.ts` 重新导出所有公共 API
- CLI 内部实现不导出

### 4. 可扩展性
- 为未来功能预留空间
- 模块化设计便于替换和扩展
