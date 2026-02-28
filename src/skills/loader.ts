import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

export interface SkillMetadata {
  name: string;
  description: string;
  version: string;
  author?: string;
  agents?: string[];
}

export interface Skill {
  metadata: SkillMetadata;
  content: string;
}

/**
 * SkillLoader — loads and manages skill definitions from .skills directory.
 *
 * Skills are defined in Markdown files with YAML frontmatter.
 * This loader parses the frontmatter and content, making skills
 * available for discovery and documentation.
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
   * Recursively scans for .md files and parses them.
   */
  loadAll(): void {
    if (!existsSync(this.skillsDir)) {
      console.warn(`⚠️  Skills directory not found: ${this.skillsDir}`);
      return;
    }

    try {
      this.loadSkillsFromDir(this.skillsDir);
      console.log(`✓ Loaded ${this.skills.size} skill(s)`);
    } catch (err) {
      console.warn(`Failed to load skills: ${err}`);
    }
  }

  /**
   * Recursively load skills from a directory.
   */
  private loadSkillsFromDir(dir: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recursively load from subdirectories
        this.loadSkillsFromDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") {
        // Parse skill file
        const fileContent = readFileSync(fullPath, "utf-8");
        const skill = this.parseSkill(fileContent);

        if (skill) {
          this.skills.set(skill.metadata.name, skill);
        }
      }
    }
  }

  /**
   * Parse a skill Markdown file with YAML frontmatter.
   *
   * Expected format:
   * ---
   * name: skill-name
   * description: Brief description
   * version: 1.0.0
   * author: Author Name
   * agents:
   *   - agent1
   *   - agent2
   * ---
   *
   * # Skill Content
   * ...
   */
  private parseSkill(content: string): Skill | null {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return null;
    }

    const [, frontmatter, body] = match;
    const metadata = this.parseFrontmatter(frontmatter);

    if (!metadata.name || !metadata.description || !metadata.version) {
      console.warn("Skill missing required fields (name, description, version)");
      return null;
    }

    return {
      metadata,
      content: body.trim(),
    };
  }

  /**
   * Simple YAML frontmatter parser.
   * Handles basic key-value pairs and arrays.
   */
  private parseFrontmatter(frontmatter: string): any {
    const metadata: any = {};
    const lines = frontmatter.split("\n");
    let currentKey: string | null = null;
    let currentArray: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) continue;

      // Array item
      if (trimmed.startsWith("- ")) {
        if (currentKey) {
          currentArray.push(trimmed.substring(2).trim());
        }
        continue;
      }

      // Key-value pair
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex > 0) {
        // Save previous array if exists
        if (currentKey && currentArray.length > 0) {
          metadata[currentKey] = currentArray;
          currentArray = [];
        }

        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();

        currentKey = key;

        if (value) {
          // Simple value
          metadata[key] = value;
          currentKey = null;
        }
        // else: array follows
      }
    }

    // Save last array if exists
    if (currentKey && currentArray.length > 0) {
      metadata[currentKey] = currentArray;
    }

    return metadata;
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
   * Get the number of loaded skills.
   */
  get size(): number {
    return this.skills.size;
  }
}
