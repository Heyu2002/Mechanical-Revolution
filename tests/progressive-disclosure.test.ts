/**
 * Test: Progressive Disclosure System
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SkillLoader } from "../src/core/skills.js";
import { renderSkillsSection, renderActivatedSkill } from "../src/core/skill-prompt.js";
import { createActivateSkillTool } from "../src/core/tool/activate-skill.js";
import type { AgentContext } from "../src/types.js";

describe("Progressive Disclosure System", () => {
  let skillLoader: SkillLoader;

  beforeEach(() => {
    skillLoader = new SkillLoader(".skills");
  });

  describe("SkillLoader", () => {
    it("should list skill metadata without loading full content", () => {
      const metadata = skillLoader.listMetadata();

      expect(metadata).toBeDefined();
      expect(Array.isArray(metadata)).toBe(true);

      if (metadata.length > 0) {
        const skill = metadata[0];
        expect(skill.name).toBeDefined();
        expect(skill.description).toBeDefined();
        expect(skill.location).toBeDefined();
      }
    });

    it("should load full skill content on demand", () => {
      const metadata = skillLoader.listMetadata();
      if (metadata.length === 0) {
        console.warn("No skills found, skipping test");
        return;
      }

      const skillName = metadata[0].name;
      const skill = skillLoader.get(skillName);

      expect(skill).toBeDefined();
      expect(skill?.metadata.name).toBe(skillName);
      expect(skill?.content).toBeDefined();
      expect(skill?.content.length).toBeGreaterThan(0);
    });

    it("should return folder structure for skills with directories", () => {
      const metadata = skillLoader.listMetadata();
      if (metadata.length === 0) {
        console.warn("No skills found, skipping test");
        return;
      }

      const skillName = metadata[0].name;
      const skill = skillLoader.get(skillName);

      if (skill?.skillDir) {
        const structure = skillLoader.getFolderStructure(skill.skillDir);
        expect(typeof structure).toBe("string");
        // Structure might be empty if no subdirectories exist
      }
    });
  });

  describe("renderSkillsSection", () => {
    it("should render empty string for no skills", () => {
      const result = renderSkillsSection([]);
      expect(result).toBe("");
    });

    it("should render skills section with metadata", () => {
      const skills = [
        {
          name: "test-skill",
          description: "A test skill for unit testing",
          location: ".skills/test-skill/SKILL.md",
        },
      ];

      const result = renderSkillsSection(skills);

      expect(result).toContain("Available Skills");
      expect(result).toContain("test-skill");
      expect(result).toContain("A test skill for unit testing");
      expect(result).toContain("activate_skill");
      expect(result).toContain("Progressive Disclosure");
    });

    it("should render multiple skills", () => {
      const skills = [
        { name: "skill-1", description: "First skill", location: "path1" },
        { name: "skill-2", description: "Second skill", location: "path2" },
      ];

      const result = renderSkillsSection(skills);

      expect(result).toContain("skill-1");
      expect(result).toContain("skill-2");
      expect(result).toContain("First skill");
      expect(result).toContain("Second skill");
    });
  });

  describe("renderActivatedSkill", () => {
    it("should render activated skill with instructions", () => {
      const result = renderActivatedSkill(
        "test-skill",
        "# Test Skill\n\nThis is a test.",
        "scripts/\n  test.py"
      );

      expect(result).toContain('<activated_skill name="test-skill">');
      expect(result).toContain("<instructions>");
      expect(result).toContain("# Test Skill");
      expect(result).toContain("<available_resources>");
      expect(result).toContain("scripts/");
      expect(result).toContain("</activated_skill>");
    });

    it("should handle empty folder structure", () => {
      const result = renderActivatedSkill(
        "test-skill",
        "Content",
        ""
      );

      expect(result).toContain("(No additional resources)");
    });
  });

  describe("createActivateSkillTool", () => {
    it("should create a valid tool definition", () => {
      const tool = createActivateSkillTool(skillLoader, ["test-skill"]);

      expect(tool.name).toBe("activate_skill");
      expect(tool.description).toContain("Activate a specialized skill");
      expect(tool.description).toContain("test-skill");
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeDefined();
    });

    it("should execute and return error for non-existent skill", async () => {
      const tool = createActivateSkillTool(skillLoader, ["test-skill"]);

      const ctx: AgentContext = {
        state: {},
        history: [],
        currentAgent: "test",
        handoffChain: [],
        metadata: {},
      };

      const result = await tool.execute({ name: "non-existent" }, ctx);

      expect(result).toHaveProperty("error");
      expect((result as any).error).toContain("not found");
    });

    it("should execute and activate existing skill", async () => {
      const metadata = skillLoader.listMetadata();
      if (metadata.length === 0) {
        console.warn("No skills found, skipping test");
        return;
      }

      const skillName = metadata[0].name;
      const tool = createActivateSkillTool(skillLoader, [skillName]);

      const ctx: AgentContext = {
        state: {},
        history: [],
        currentAgent: "test",
        handoffChain: [],
        metadata: {},
      };

      const result = await tool.execute({ name: skillName }, ctx);

      expect(result).toHaveProperty("content");
      expect((result as any).content).toContain("<activated_skill");
      expect((result as any).content).toContain(skillName);
      expect(ctx.metadata.activatedSkills).toContain(skillName);
    });
  });
});
