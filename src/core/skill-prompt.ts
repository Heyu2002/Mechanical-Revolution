import type { SkillMetadata } from "./skills.js";

/**
 * Render skills section for system prompt (progressive disclosure - Level 1).
 * Only includes metadata (name + description), not full content.
 *
 * @param skills - List of available skill metadata
 * @returns Formatted skills section for system prompt
 */
export function renderSkillsSection(skills: SkillMetadata[]): string {
  if (skills.length === 0) {
    return '';
  }

  const skillsList = skills
    .map(s => `- **${s.name}**: ${s.description}`)
    .join('\n');

  return `
## Available Skills

You have access to the following specialized skills. A skill is a set of detailed instructions and resources for handling specific types of tasks.

${skillsList}

### How to Use Skills

**Discovery**: The list above shows all skills available in this session.

**Trigger Rules**:
- If the user explicitly names a skill (e.g., "use the task-decomposition skill")
- OR if the task clearly matches a skill's description
- Then you MUST activate that skill using the \`activate_skill\` tool

**Progressive Disclosure**:
1. After deciding to use a skill, call \`activate_skill\` with the skill name
2. You will receive detailed instructions and available resources
3. Follow the skill's instructions carefully
4. Load reference files only when the skill instructions mention them
5. Prefer running scripts over retyping code
6. Reuse assets/templates instead of recreating them

**Context Hygiene**:
- Keep context small: summarize long sections instead of pasting them
- Only load extra files when needed
- Avoid deep reference-chasing
- When multiple reference files exist, choose only the relevant ones
`.trim();
}

/**
 * Render activated skill content (progressive disclosure - Level 2).
 * Returns the full skill instructions and available resources.
 *
 * @param skillName - Name of the activated skill
 * @param content - Full skill content (SKILL.md body)
 * @param folderStructure - Directory structure of skill resources
 * @returns Formatted activated skill content
 */
export function renderActivatedSkill(
  skillName: string,
  content: string,
  folderStructure: string
): string {
  return `<activated_skill name="${skillName}">
<instructions>
${content}
</instructions>

<available_resources>
${folderStructure || '(No additional resources)'}
</available_resources>

<usage_notes>
- Follow the instructions above carefully
- Reference files are in the skill directory and can be read using file tools
- Scripts can be executed directly
- Assets are templates/resources for output generation
</usage_notes>
</activated_skill>`;
}
