import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join } from "path";

export interface SkillMetadata {
  name: string;
  description: string;
  version?: string;
  author?: string;
  agents?: string[];
}

export interface Skill {
  metadata: SkillMetadata;
  content: string;
  skillDir?: string;  // Path to skill directory (for references, scripts, etc.)
}

/**
 * SkillLoader — loads and manages skill definitions from .skills directory.
 *
 * Supports two formats:
 * 1. Legacy: .skills/skill-name.md (flat structure)
 * 2. Standard: .skills/skill-name/SKILL.md (Codex-style structure with agents/, references/, scripts/)
 *
 * @example
 * const loader = new SkillLoader();
 * loader.loadAll();
 *
 * const skills = loader.list();
 * console.log(skills); // [{ name: "task-decomposition", ... }]
 *
 * const skill = loader.get("task-decomposition");
 * console.log(skill.content); // Full markdown content
 */
export class SkillLoader {
  private skillsDir: string;
  private skills: Map<string, Skill> = new Map();

  constructor(skillsDir: string = ".skills") {
    this.skillsDir = skillsDir;
  }

  /**
   * Load all skills from the .skills directory.
   * Scans for both legacy .md files and standard SKILL.md in subdirectories.
   */
  loadAll(): void {
    if (!existsSync(this.skillsDir)) {
      console.warn(`⚠️  Skills directory not found: ${this.skillsDir}`);
      return;
    }

    try {
      const entries = readdirSync(this.skillsDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(this.skillsDir, entry.name);

        if (entry.isDirectory()) {
          // Check for SKILL.md in subdirectory (standard structure)
          const skillMdPath = join(fullPath, 'SKILL.md');
          if (existsSync(skillMdPath)) {
            const fileContent = readFileSync(skillMdPath, "utf-8");
            const skill = this.parseSkill(fileContent, fullPath);
            if (skill) {
              this.skills.set(skill.metadata.name, skill);
            }
          }
        } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") {
          // Legacy format: .md file directly in .skills/
          const fileContent = readFileSync(fullPath, "utf-8");
          const skill = this.parseSkill(fileContent);
          if (skill) {
            this.skills.set(skill.metadata.name, skill);
          }
        }
      }

      console.log(`✓ Loaded ${this.skills.size} skill(s)`);
    } catch (err) {
      console.warn(`Failed to load skills: ${err}`);
    }
  }

  /**
   * Parse a skill from Markdown content with YAML frontmatter.
   */
  private parseSkill(content: string, skillDir?: string): Skill | null {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      console.warn("Skill file missing frontmatter");
      return null;
    }

    const [, frontmatter, body] = match;
    const metadata = this.parseFrontmatter(frontmatter);

    if (!metadata.name || !metadata.description) {
      console.warn("Skill missing required metadata (name, description)");
      return null;
    }

    return {
      metadata,
      content: body.trim(),
      skillDir,
    };
  }

  /**
   * Parse YAML frontmatter into metadata object.
   * Simple parser for basic key-value and list formats.
   */
  private parseFrontmatter(yaml: string): SkillMetadata {
    const metadata: any = {};
    const lines = yaml.split("\n");
    let currentKey: string | null = null;
    let currentList: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // List item
      if (trimmed.startsWith("- ")) {
        if (currentKey) {
          currentList.push(trimmed.substring(2).trim());
        }
        continue;
      }

      // Key-value pair
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex > 0) {
        // Save previous list if any
        if (currentKey && currentList.length > 0) {
          metadata[currentKey] = currentList;
          currentList = [];
        }

        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();

        currentKey = key;
        if (value) {
          metadata[key] = value;
          currentKey = null;
        }
      }
    }

    // Save final list if any
    if (currentKey && currentList.length > 0) {
      metadata[currentKey] = currentList;
    }

    return metadata as SkillMetadata;
  }

  /**
   * Get a skill by name.
   */
  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  /**
   * List all loaded skills (metadata only).
   */
  list(): SkillMetadata[] {
    return Array.from(this.skills.values()).map((s) => s.metadata);
  }

  /**
   * Check if a skill exists.
   */
  has(name: string): boolean {
    return this.skills.has(name);
  }

  /**
   * Clear all loaded skills.
   */
  clear(): void {
    this.skills.clear();
  }
}
