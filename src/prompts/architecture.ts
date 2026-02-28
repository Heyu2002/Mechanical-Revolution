/**
 * Architecture reference for AI CLI frameworks
 * Based on deep analysis of Gemini CLI and Codex
 *
 * This can be injected into system prompts to provide
 * architectural guidance and best practices.
 */

export const ARCHITECTURE_REFERENCE = `
# AI CLI Framework Architecture Reference

## Core Architectural Principles

### 1. Modular Layered Architecture

**Separation of Concerns**:
- **CLI Layer**: User interaction, commands, UI rendering
- **Core Layer**: Business logic, agent system, execution engine
- **Provider Layer**: LLM abstraction, API integration

**Key Principle**: UI and core logic must be completely decoupled.
The core should be usable by other applications (Web UI, API, etc.).

### 2. Directory Organization

\`\`\`
src/
├── cli/              # CLI layer (commands, UI, REPL)
├── core/             # Core framework (agent, runner, tool, guardrail)
├── routing/          # Task routing (chat detection, AI router)
├── memory/           # Memory management
├── skills/           # Skills system
├── observability/    # Tracing, metrics, events
├── providers/        # LLM provider abstraction
├── config/           # Configuration management
└── prompts/          # Prompt management
\`\`\`

## Key Technology Patterns

### CLI UI

**Ink (React for CLI)** - Declarative terminal UI:
\`\`\`typescript
import { Box, Text } from 'ink';

<Box flexDirection="column">
  <Text color="cyan">Task Flow</Text>
  <Spinner type="dots" />
</Box>
\`\`\`

### Protocols

**Model Context Protocol (MCP)**: Standardized tool/resource interface
**Agent-to-Agent (A2A)**: Multi-agent communication protocol

### Observability

**Three Pillars**:
- **Traces**: Request path tracking
- **Metrics**: Quantitative data (duration, tokens, errors)
- **Logs**: Structured event logging

### Code Analysis

**Tree-sitter**: Precise syntax parsing for code understanding

## Implementation Patterns

### 1. Skills/Tools System

**Markdown Definition** (user-friendly):
\`\`\`markdown
---
name: web-search
description: Search the web
---

# Web Search Skill
...
\`\`\`

### 2. Agent Registry

**Dynamic Loading**:
\`\`\`typescript
class AgentRegistry {
  async loadFromDirectory(dir: string) {
    // Scan .agents/ directory
    // Parse Markdown definitions
    // Register agents
  }
}
\`\`\`

### 3. Event-Driven Architecture

**EventBus Pattern**:
\`\`\`typescript
eventBus.on('agent:started', (data) => {
  tracer.startSpan(data.agent);
});
\`\`\`

### 4. Task Flow Tracking

**Structured Recording**:
\`\`\`typescript
interface TaskFlow {
  id: string;
  tasks: TaskNode[];
  startTime: number;
  endTime?: number;
}
\`\`\`

## Performance Optimization

1. **Parallel Processing**: Execute independent operations concurrently
2. **Streaming**: Real-time feedback for better UX
3. **Caching**: Multi-layer cache (memory + disk)

## Security Patterns

1. **Sandboxing**: Isolated execution environment
2. **Input Validation**: Guardrails for safety
3. **Rate Limiting**: Prevent abuse

## User Experience

1. **Progressive Feedback**: Show status at each step
2. **Error Recovery**: Graceful degradation and retry
3. **Auto-completion**: Command and argument suggestions

## Design Principles

1. **Single Responsibility**: Each module has one clear purpose
2. **Dependency Inversion**: Depend on abstractions, not implementations
3. **Open/Closed**: Open for extension, closed for modification
4. **Interface Segregation**: Minimal necessary interfaces

## Future Extensions

1. **Monorepo**: When packages need independent releases
2. **MCP Integration**: Standardized tool interface
3. **Plugin System**: Community-contributed extensions
4. **OpenTelemetry**: Complete observability stack
`;

/**
 * Get architecture reference for injection into system prompts
 */
export function getArchitectureReference(): string {
  return ARCHITECTURE_REFERENCE;
}
