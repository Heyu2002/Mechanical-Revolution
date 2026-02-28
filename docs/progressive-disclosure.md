# Progressive Disclosure for Skills

Progressive disclosure is a design pattern that loads skill content in stages, optimizing context window usage and improving performance.

## Overview

Instead of loading all skill content upfront, the system uses a three-level approach:

```
Level 1: Metadata (name + description)     → Always in system prompt (~100 tokens)
Level 2: Full instructions (SKILL.md body) → Loaded on activation (~5k tokens)
Level 3: Resources (scripts/references)    → Loaded on demand (variable)
```

## Benefits

- **Efficient Context Usage**: Only load what's needed
- **Scalability**: Support 10-50+ skills without context overflow
- **Clear Activation Signal**: Know when skills are being used
- **Better Performance**: Reduced token usage = faster responses

## How It Works

### 1. Setup Skill Loader

```typescript
import { SkillLoader, createActivateSkillTool } from "mechanical-revolution";

const skillLoader = new SkillLoader(".skills");
const skillMetadata = skillLoader.listMetadata();
```

### 2. Create Activate Tool

```typescript
const activateSkillTool = createActivateSkillTool(
  skillLoader,
  skillMetadata.map(s => s.name)
);
```

### 3. Inject Skills into System Prompt

```typescript
import { getDefaultSystemPrompt } from "mechanical-revolution";

const agent = defineAgent({
  name: "assistant",
  instructions: getDefaultSystemPrompt(skillMetadata),
  tools: [activateSkillTool],
  // ...
});
```

### 4. LLM Activates Skills Automatically

When the LLM encounters a task that matches a skill's description, it will:

1. Call `activate_skill` tool with the skill name
2. Receive full instructions and resource list
3. Follow the skill's instructions
4. Load additional resources as needed

## Example

```typescript
import {
  defineAgent,
  Runner,
  loadConfig,
  registerBuiltinProviders,
  SkillLoader,
  createActivateSkillTool,
  getDefaultSystemPrompt,
} from "mechanical-revolution";

const config = loadConfig();
registerBuiltinProviders();

// Initialize skills
const skillLoader = new SkillLoader(".skills");
const skillMetadata = skillLoader.listMetadata();
const activateSkillTool = createActivateSkillTool(
  skillLoader,
  skillMetadata.map(s => s.name)
);

// Define agent with skills
const agent = defineAgent({
  name: "assistant",
  instructions: getDefaultSystemPrompt(skillMetadata),
  provider: "openai",
  model: "gpt-4o",
  tools: [activateSkillTool],
});

// Run
const runner = new Runner(config, [agent]);
const result = await runner.run(
  agent,
  "Use the task-decomposition skill to help me plan this project"
);

console.log(result.output);
console.log("Activated skills:", result.context.metadata.activatedSkills);
```

## Skill Structure

For progressive disclosure to work, skills must follow this structure:

```
.skills/
└── my-skill/
    ├── SKILL.md          # Required: frontmatter + instructions
    ├── agents/
    │   └── openai.yaml   # Optional: UI metadata
    ├── scripts/          # Optional: executable scripts
    ├── references/       # Optional: reference docs
    └── assets/           # Optional: templates/resources
```

### SKILL.md Format

```markdown
---
name: my-skill
description: Brief description that helps LLM decide when to use this skill
---

# My Skill

## Detailed Instructions

Step-by-step instructions that the LLM will follow...

## When to Use

Specific scenarios where this skill applies...

## Resources

- scripts/helper.py - Helper script for data processing
- references/api-docs.md - API documentation
- assets/template.html - HTML template
```

## Activation Flow

```
User Input: "Help me decompose this complex task"
    ↓
LLM sees skill metadata in system prompt:
  - task-decomposition: Decompose complex tasks and delegate...
    ↓
LLM decides to activate skill
    ↓
LLM calls: activate_skill({ name: "task-decomposition" })
    ↓
Tool returns:
  <activated_skill name="task-decomposition">
    <instructions>
      # Task Decomposition Skill
      ...detailed instructions...
    </instructions>
    <available_resources>
      scripts/
        helper.py
      references/
        workflow.md
    </available_resources>
  </activated_skill>
    ↓
LLM follows instructions and completes task
```

## Observability

Track which skills are activated:

```typescript
const result = await runner.run(agent, input);

// Check activated skills
console.log(result.context.metadata.activatedSkills);
// Output: ["task-decomposition", "code-reviewer"]
```

## Best Practices

### 1. Write Clear Descriptions

The description field is critical for activation:

```yaml
# ✅ Good: Specific and actionable
description: Decompose complex tasks and delegate to specialist agents based on their capabilities

# ❌ Bad: Too vague
description: Helps with tasks
```

### 2. Keep Instructions Focused

Skill instructions should be:
- Step-by-step and actionable
- Focused on a specific workflow
- Include examples when helpful
- Reference resources by path

### 3. Organize Resources

```
scripts/     → Executable code (Python, Bash, etc.)
references/  → Documentation to read when needed
assets/      → Templates and output resources
```

### 4. Use Context Hygiene

In skill instructions, remind the LLM:

```markdown
## Context Hygiene

- Keep context small: summarize long sections
- Only load reference files when needed
- Prefer running scripts over retyping code
- Reuse assets instead of recreating
```

## Migration from Eager Loading

If you're currently loading all skills upfront:

### Before (Eager Loading)

```typescript
const skillLoader = new SkillLoader(".skills");
skillLoader.loadAll(); // Loads everything

const agent = defineAgent({
  name: "assistant",
  instructions: DEFAULT_SYSTEM_PROMPT, // No skills info
  // ...
});
```

### After (Progressive Disclosure)

```typescript
const skillLoader = new SkillLoader(".skills");
const skillMetadata = skillLoader.listMetadata(); // Only metadata
const activateSkillTool = createActivateSkillTool(skillLoader, skillMetadata.map(s => s.name));

const agent = defineAgent({
  name: "assistant",
  instructions: getDefaultSystemPrompt(skillMetadata), // Includes skills
  tools: [activateSkillTool], // Add activation tool
  // ...
});
```

## Performance Comparison

### Eager Loading (Old)
- 10 skills × 5k tokens = 50k tokens in every request
- Context window quickly fills up
- Slower responses
- Higher costs

### Progressive Disclosure (New)
- 10 skills × 100 tokens = 1k tokens in system prompt
- Only load 1-2 skills per request (~5-10k tokens)
- Faster responses
- Lower costs
- Can support 50+ skills

## Troubleshooting

### Skill Not Activating

**Problem**: LLM doesn't activate the skill

**Solutions**:
1. Check description is clear and specific
2. Ensure skill name is in available list
3. Verify activate_skill tool is included
4. Check system prompt includes skills section

### Skill Not Found

**Problem**: `activate_skill` returns "not found" error

**Solutions**:
1. Verify SKILL.md exists in `.skills/skill-name/`
2. Check frontmatter has `name` and `description`
3. Ensure skill name matches exactly (case-sensitive)

### Resources Not Loading

**Problem**: LLM can't access scripts/references

**Solutions**:
1. Verify files exist in skill directory
2. Check folder structure is correct
3. Ensure LLM has file reading tools available
4. Provide clear paths in skill instructions

## See Also

- [Skills Documentation](../README.md)
- [Example: Progressive Disclosure](../examples/progressive-disclosure.ts)
- [Test Suite](../tests/progressive-disclosure.test.ts)
