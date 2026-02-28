# 任务分解与分配系统 - 快速开始

## 🎉 实现完成

任务分解与分配系统已成功实现！这个系统允许 Orchestrator agent 智能地将复杂任务分解并分配给专家 agents。

## ✅ 核心功能

1. **Agent 能力描述** - 每个 agent 可以声明自己的 skills、useCases 和 limitations
2. **Orchestrator Agent** - 主协调 agent，负责任务分析、分解和分配
3. **动态能力注入** - 自动将所有 agent 的能力描述注入到 Orchestrator 的 prompt 中
4. **Skill 系统** - 使用 Markdown 文件定义可复用的任务处理模式
5. **完整示例** - 包含研究+编码、数据分析等场景

## 🚀 快速测试

### 1. 测试核心功能（无需 API key）

```bash
# 测试 Agent capabilities 和 Orchestrator instructions
npx tsx examples/test-core-functionality.ts

# 测试 Skill Loader
npx tsx examples/test-skill-loader.ts
```

### 2. 运行完整示例（需要 API key）

```bash
# 1. 配置 API keys
cp config/config.example.json config/config.json
# 编辑 config/config.json，填入你的 API keys

# 2. 运行任务分解示例
npx tsx examples/task-decomposition-demo.ts
```

## 📖 使用示例

### 定义专家 Agents

```typescript
import {
  defineAgent,
  RESEARCHER_PROMPT,
  CODER_PROMPT,
} from "mechanical-revolution";

const researchAgent = defineAgent({
  name: "researcher",
  instructions: RESEARCHER_PROMPT,
  provider: "openai",
  model: "gpt-4o",
  tools: [searchTool],
  capabilities: {
    summary: "Web research and information synthesis specialist",
    skills: ["web_search", "fact_verification", "information_synthesis"],
    useCases: ["Answering factual questions", "Finding latest information"],
    limitations: ["Cannot perform calculations", "Cannot write code"],
  },
});

const coderAgent = defineAgent({
  name: "coder",
  instructions: CODER_PROMPT,
  provider: "anthropic",
  model: "claude-opus-4",
  capabilities: {
    summary: "Software development specialist",
    skills: ["code_writing", "debugging", "refactoring"],
    useCases: ["Writing production code", "Creating examples"],
    limitations: ["Cannot perform web searches"],
  },
});
```

### 创建 Orchestrator

```typescript
import { createOrchestratorInstructions, handoff } from "mechanical-revolution";

const allAgents = [researchAgent, coderAgent];

const orchestrator = defineAgent({
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
  ],
});
```

### 运行任务

```typescript
import { Runner, loadConfig, registerBuiltinProviders } from "mechanical-revolution";

const config = loadConfig();
registerBuiltinProviders();

const runner = new Runner(config, [orchestrator, ...allAgents]);

const result = await runner.run(
  orchestrator,
  "研究 React 19 Server Components 并创建一个简单的示例组件"
);

console.log(result.output);
console.log(`Task flow: ${result.flow.tasks.map(t => t.targetAgent).join(' → ')}`);
```

## 📚 Skills 系统

### 查看可用 Skills

```typescript
import { SkillLoader } from "mechanical-revolution";

const loader = new SkillLoader();
loader.loadAll();

// 列出所有 skills
const skills = loader.list();
skills.forEach(skill => {
  console.log(`${skill.name} (v${skill.version})`);
  console.log(`  ${skill.description}`);
});

// 获取特定 skill 的详细信息
const taskDecomp = loader.get("task-decomposition");
console.log(taskDecomp.content);
```

### 可用的 Skills

1. **task-decomposition** - 任务分解与智能分配（核心 skill）
2. **research-and-code** - 研究技术并编写代码
3. **data-analysis** - 数据分析 + 计算 + 可视化

查看详细文档：
- `.skills/task-decomposition.md`
- `.skills/examples/research-and-code.md`
- `.skills/examples/data-analysis.md`

## 🎯 适用场景

### ✅ 推荐使用

- **跨领域任务**：研究 + 编码、计算 + 可视化
- **多步骤流程**：研究 → 分析 → 实现
- **复杂问题**：需要多个专家协作
- **知识驱动**：需要最新信息指导实现

### 示例任务

```
✓ "研究 React 19 Server Components 并创建示例组件"
✓ "计算 10000 元在 5% 年利率下 10 年的复利，然后用 Python 写一个函数实现它"
✓ "了解 WebSocket 的工作原理，然后用 Node.js 实现一个简单的聊天服务器"
✓ "分析销售数据，计算同比增长率，并生成 Python 可视化代码"
```

## 📁 项目结构

```
src/
├── types.ts                    # ✨ 新增 AgentCapabilities 接口
├── agent.ts                    # ✨ 新增 createOrchestratorInstructions()
├── index.ts                    # ✨ 导出新增类型和函数
├── skill-loader.ts             # ✨ 新增 Skill 加载器
└── prompts/
    ├── agents.ts               # ✨ 新增 ORCHESTRATOR_PROMPT
    └── index.ts                # ✨ 导出 Orchestrator prompt

.skills/
├── README.md                   # ✨ Skill 系统说明
├── task-decomposition.md       # ✨ 任务分解 Skill
└── examples/
    ├── research-and-code.md    # ✨ 研究+编码场景
    └── data-analysis.md        # ✨ 数据分析场景

examples/
├── task-decomposition-demo.ts  # ✨ 完整示例
├── test-core-functionality.ts  # ✨ 核心功能测试
└── test-skill-loader.ts        # ✨ Skill Loader 测试
```

## 🔍 验证测试

所有测试已通过：

```bash
✅ TypeScript 类型检查通过
✅ Skill Loader 成功加载 3 个 skills
✅ Agent capabilities 定义正确
✅ createOrchestratorInstructions 生成正确的 prompt
✅ 动态 instructions 函数工作正常
```

## 📖 详细文档

- **实现总结**：`IMPLEMENTATION_SUMMARY.md`
- **Skill 系统**：`.skills/README.md`
- **任务分解 Skill**：`.skills/task-decomposition.md`
- **完整示例**：`examples/task-decomposition-demo.ts`

## 🎓 下一步

1. **配置 API keys**：编辑 `config/config.json`
2. **运行示例**：`npx tsx examples/task-decomposition-demo.ts`
3. **尝试 CLI**：`npm run dev`（未来可添加 `/skills` 命令）
4. **创建自己的 Orchestrator**：参考示例代码
5. **定义新的 Skills**：在 `.skills/` 目录创建新的 `.md` 文件

## 💡 提示

- 为每个 agent 定义清晰的 `capabilities`
- Orchestrator 会根据 capabilities 自动选择合适的 agent
- 使用 `result.flow.tasks` 查看完整的任务执行链
- 查看 `.skills/` 目录了解更多使用模式

---

🎉 **任务分解与分配系统已就绪，开始使用吧！**
