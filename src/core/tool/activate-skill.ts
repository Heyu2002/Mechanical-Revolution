import { z } from "zod";
import { defineTool } from "./tool.js";
import type { ToolDefinition, AgentContext } from "../../types.js";
import type { SkillLoader } from "../skills.js";
import { renderActivatedSkill } from "../skill-prompt.js";

/**
 * Create the activate_skill tool for progressive disclosure.
 * This tool allows the LLM to activate a skill on-demand and receive its full instructions.
 *
 * @param skillLoader - SkillLoader instance to load skills from
 * @param availableSkillNames - List of available skill names (for validation)
 * @returns ToolDefinition for activate_skill
 */
export function createActivateSkillTool(
  skillLoader: SkillLoader,
  availableSkillNames: string[]
): ToolDefinition {
  return defineTool({
    name: "activate_skill",
    description: `Activate a specialized skill to receive detailed instructions and resources. Available skills: ${availableSkillNames.join(', ')}. Use this when the task matches a skill's description or when the user explicitly requests a skill.`,
    parameters: z.object({
      name: z.string().describe("The name of the skill to activate"),
    }),
    execute: async ({ name }: { name: string }, ctx: AgentContext) => {
      // Load the full skill content
      const skill = skillLoader.get(name);

      if (!skill) {
        return {
          error: `Skill "${name}" not found. Available skills: ${availableSkillNames.join(', ')}`,
        };
      }

      // Get folder structure
      const folderStructure = skill.skillDir
        ? skillLoader.getFolderStructure(skill.skillDir)
        : '';

      // Render the activated skill content
      const activatedContent = renderActivatedSkill(
        skill.metadata.name,
        skill.content,
        folderStructure
      );

      // Store activated skill in context metadata
      if (!ctx.metadata.activatedSkills) {
        ctx.metadata.activatedSkills = [];
      }
      (ctx.metadata.activatedSkills as string[]).push(name);

      return {
        content: activatedContent,
        display: `✓ Skill "${name}" activated`,
      };
    },
  });
}
