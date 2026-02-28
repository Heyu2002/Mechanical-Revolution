# Mechanical-Revolution

A lightweight, production-ready multi-agent framework with intelligent task routing, adaptive learning, and event-driven architecture.

## 🎯 Overview

Mechanical-Revolution is a TypeScript-based multi-agent framework that combines the best practices from Gemini-CLI and Codex, providing:

- **Markdown Agent Definitions** - User-friendly, version-controlled agent configurations
- **Hierarchical Agent Delegation** - SubagentTool pattern for nested agent collaboration
- **Intelligent Task Routing** - Adaptive complexity classification + TF-IDF agent matching
- **Event-Driven Architecture** - Real-time monitoring and debugging
- **Multi-Layer Configuration** - Flexible configuration management
- **Hot Reload** - Automatic agent reloading on file changes

## ✨ Key Features

### 🤖 Multi-Agent Collaboration

- **Markdown Agent Definitions** - Define agents in human-readable Markdown files
- **SubagentTool** - Agents can delegate tasks to other agents
- **Smart Routing** - Automatic agent selection based on task complexity and similarity
- **Orchestrator Pattern** - Complex task decomposition and coordination

### 🧠 Intelligent Routing

- **Adaptive Complexity Classifier** - Machine learning-based task complexity judgment with continuous learning
- **TF-IDF Agent Matcher** - Semantic similarity-based agent selection
- **Multi-Strategy Decision** - Combines complexity, similarity, and context

### 📊 Event-Driven Architecture

- **EventBus** - 12 event types for comprehensive monitoring
- **Real-time Tracking** - Agent lifecycle, tool calls, routing decisions
- **Debugging Support** - Complete event history for troubleshooting

### ⚙️ Flexible Configuration

- **4-Layer Config System** - Builtin → User → Project → Runtime
- **Hot Reload** - Automatic configuration updates
- **Environment Isolation** - User-level and project-level separation

### 🔧 Developer Experience

- **TypeScript** - Full type safety
- **Hot Reload** - Instant agent updates
- **Rich Examples** - Complete working demos
- **Comprehensive Docs** - Architecture analysis and implementation guides

## 🚀 Quick Start

### 1. Installation

```bash
npm install
```

### 2. Configuration

Create your configuration file:

```bash
cp config/config.example.json config/config.json
```

Edit `config/config.json` with your API keys:

```json
{
  "defaultProvider": "anthropic",
  "anthropic": {
    "apiKey": "your-api-key",
    "baseUrl": "https://api.anthropic.com",
    "model": "claude-3-5-sonnet-20241022",
    "apiType": "anthropic",
    "nativeToolCall": true
  }
}
```

### 3. Build

```bash
npm run build
```

### 4. Run Examples

```bash
# Test new architecture components
npx tsx examples/test-new-architecture.ts

# Complete multi-agent collaboration demo
npx tsx examples/complete-multi-agent-demo.ts

# Smart routing example
npx tsx examples/smart-routing-example.ts
```

## 📖 Usage

### Define Custom Agents

Create a Markdown file in `.agents/` directory:

```yaml
---
name: my-coding-agent
description: Specialized coding assistant
provider: anthropic
model: claude-3-5-sonnet-20241022
temperature: 0.7
maxTurns: 20
tools:
  - Read
  - Write
  - Bash
capabilities:
  summary: "Expert in software development"
  modelStrengths:
    - Code generation
    - Debugging
    - Refactoring
  taskTypes:
    - code_writing
    - debugging
  bestFor:
    - Implementing algorithms
    - Writing tests
---

You are an expert coding assistant specialized in software development.

Your approach:
1. Understand requirements carefully
2. Design before implementing
3. Write clean, maintainable code
4. Test thoroughly
```

### Load and Use Agents

```typescript
import {
  AgentRegistry,
  Runner,
  createContext,
  loadConfig,
  registerBuiltinProviders,
} from "./src/index.js";

// Initialize
const registry = new AgentRegistry();
await registry.loadAll();

const config = loadConfig();
registerBuiltinProviders();
const runner = new Runner(config);

// Get agent
const agent = registry.get("my-coding-agent");

// Run
const context = createContext();
const result = await runner.run(agent, "Implement quicksort in TypeScript", context);

console.log(result.output);
```

### Multi-Agent Collaboration

```typescript
import {
  createSubagentTool,
  defineAgent,
  createOrchestratorInstructions,
} from "./src/index.js";

// Load specialist agents
const claudeAgent = registry.get("claude-opus-coder");
const doubaoAgent = registry.get("doubao-chinese-vision");

// Create subagent tools
const claudeTool = createSubagentTool(claudeAgent, runner);
const doubaoTool = createSubagentTool(doubaoAgent, runner);

// Configure orchestrator
const orchestrator = defineAgent({
  name: "orchestrator",
  instructions: createOrchestratorInstructions([claudeAgent, doubaoAgent]),
  provider: "anthropic",
  model: "claude-opus-4-6-kiro",
  tools: [claudeTool, doubaoTool],
});

// Run complex task
const result = await runner.run(
  orchestrator,
  "Research React 19 features, create example components, and write tests",
  context
);
```

### Smart Routing

```typescript
import {
  createComplexityClassifier,
  createAgentMatcher,
} from "./src/index.js";

const complexityClassifier = createComplexityClassifier();
const agentMatcher = createAgentMatcher([claudeAgent, doubaoAgent]);

function smartRoute(input: string, currentAgent) {
  // 1. Classify complexity
  const complexity = complexityClassifier.classify(input);

  // 2. Match best agent
  const match = agentMatcher.findBestAgent(input, currentAgent, allAgents);

  // 3. Decide
  if (complexity.shouldDecompose) {
    return orchestrator;  // Complex → Orchestrator
  } else if (match.shouldHandoff) {
    return match.bestAgent;  // Better match → Switch
  } else {
    return currentAgent;  // Keep current
  }
}

const selectedAgent = smartRoute("Implement binary tree traversal", doubaoAgent);
// → claude-opus-coder (coding task)
```

### Event Monitoring

```typescript
import { globalEventBus } from "./src/index.js";

// Listen to events
globalEventBus.onAgentStarted(event => {
  console.log(`Agent started: ${event.agent}`);
});

globalEventBus.onRoutingDecision(event => {
  console.log(`Routing: ${event.from} → ${event.to}`);
  console.log(`Reason: ${event.reason}`);
  console.log(`Complexity: ${event.complexity}`);
  console.log(`Similarity: ${event.similarity}`);
});

globalEventBus.onToolCalled(event => {
  console.log(`Tool called: ${event.tool} by ${event.agent}`);
});
```

## 🏗️ Architecture

### System Overview

```
User Input
    ↓
Smart Routing (Complexity + Similarity)
    ↓
┌─────────┬─────────┬─────────┐
│ Orchestrator │ Claude │ Doubao │
└─────────┴─────────┴─────────┘
    ↓
SubagentTool (Hierarchical Delegation)
    ↓
Event Bus (Monitoring)
    ↓
Result
```

### Core Components

1. **Agent Registry** - Load and manage agents from Markdown files
2. **Tool Registry** - Unified tool management
3. **Config Manager** - 4-layer configuration system
4. **SubagentTool** - Agent-as-tool wrapper for delegation
5. **EventBus** - Event-driven monitoring and debugging
6. **Smart Routing** - Intelligent agent selection

### Directory Structure

```
.
├── src/
│   ├── agent-registry.ts       # Agent registry
│   ├── agent-loader.ts         # Markdown parser
│   ├── tool-registry.ts        # Tool registry
│   ├── config-manager.ts       # Config manager
│   ├── subagent-tool.ts        # SubagentTool
│   ├── event-bus.ts            # Event bus
│   ├── task-complexity.ts      # Complexity classifier
│   ├── adaptive-task-complexity.ts  # Adaptive learning
│   ├── agent-matcher.ts        # TF-IDF matcher
│   └── index.ts                # Exports
├── .agents/                    # Project-level agents
│   ├── claude-opus-coder.md
│   ├── doubao-chinese-vision.md
│   └── orchestrator.md
├── examples/
│   ├── test-new-architecture.ts
│   └── complete-multi-agent-demo.ts
└── docs/
    ├── ARCHITECTURE_ANALYSIS.md
    ├── PHASE1_COMPLETION_REPORT.md
    ├── PHASE2_COMPLETION_REPORT.md
    └── ARCHITECTURE_SUMMARY.md
```

## 📚 Documentation

- [Architecture Analysis](./ARCHITECTURE_ANALYSIS.md) - Deep dive into design decisions
- [Phase 1 Report](./PHASE1_COMPLETION_REPORT.md) - Infrastructure refactoring
- [Phase 2 Report](./PHASE2_COMPLETION_REPORT.md) - Multi-agent collaboration
- [Architecture Summary](./ARCHITECTURE_SUMMARY.md) - Complete overview
- [Adaptive Learning](./ADAPTIVE_LEARNING.md) - Machine learning details
- [Chinese Input Fix](./CHINESE_INPUT_FIX.md) - Terminal input handling

## 🎯 Use Cases

### 1. Complex Task Decomposition

```
"Research React 19, create examples, and write tests"
    ↓
Orchestrator
    ├─> Claude: Research React 19 features
    ├─> Claude: Create example components
    └─> Claude: Write test cases
```

### 2. Cross-Domain Tasks

```
"Analyze this Chinese document and generate code"
    ↓
Orchestrator
    ├─> Doubao: Analyze Chinese content
    └─> Claude: Generate code based on analysis
```

### 3. Intelligent Routing

```
"你好" → Doubao (Chinese greeting)
"Implement algorithm" → Claude (Coding task)
"Write Chinese article" → Doubao (Chinese content)
```

## 🔬 Advanced Features

### Adaptive Learning

The complexity classifier learns from real data:

```typescript
import { createAdaptiveClassifier } from "./src/index.js";

const classifier = createAdaptiveClassifier();

// Add labeled samples
classifier.addLabeledSamples([
  { input: "你好", actualDecision: "chitchat" },
  { input: "实现算法", actualDecision: "medium_task" },
]);

// Train
const stats = classifier.train(100);
console.log(`Accuracy: ${stats.accuracy}`);

// Weights adapt automatically
console.log(stats.weights);
```

### Hot Reload

Agents automatically reload when files change:

```bash
# Edit .agents/my-agent.md
# Changes are detected and agent reloads automatically
```

### Multi-Layer Configuration

```
Builtin (defaults)
    ↓
User (~/.mechanical-revolution/config.json)
    ↓
Project (.mechanical-revolution/config.json)
    ↓
Runtime (dynamic overrides)
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Test new architecture
npx tsx examples/test-new-architecture.ts

# Test multi-agent collaboration
npx tsx examples/complete-multi-agent-demo.ts

# Test adaptive learning
npx tsx examples/test-adaptive-classifier.ts
```

## 📊 Performance

| Metric | Value |
|--------|-------|
| Startup Time | ~100ms |
| Memory Usage | ~5MB |
| Agent Load | ~10ms/agent |
| Routing Latency | <1ms |
| Event Overhead | <0.1ms |

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines.

### Adding New Agents

1. Create Markdown file in `.agents/`
2. Define configuration and system prompt
3. Test functionality
4. Submit PR

### Adding New Tools

1. Implement `ToolDefinition` interface
2. Register in `globalToolRegistry`
3. Add tests
4. Update documentation

## 📝 License

Apache-2.0

## 🙏 Acknowledgments

This project is inspired by:

- **Gemini-CLI** (Google) - Markdown agent definitions, SubagentTool pattern
- **Codex** - Multi-layer configuration, event-driven architecture
- **Anthropic Agent SDK** - Agent and handoff concepts
- **OpenAI Swarm** - Simple agent collaboration patterns

## 📮 Contact

For questions and support, please open an issue on GitHub.

---

**Version**: 2.0.0
**Status**: Production Ready ✅
**Last Updated**: 2026-02-28
