import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export type SkillScope = "system" | "user" | "workspace";

export interface SkillMetadata {
  name: string;
  description: string;
  location?: string; // Path to SKILL.md file
  scope?: SkillScope; // Where the skill comes from
}

export interface Skill {
  metadata: SkillMetadata;
  content: string;
  skillDir?: string;
  scripts?: string[];      // List of files in scripts/ directory
  references?: string[];   // List of files in references/ directory
  assets?: string[];       // List of files in assets/ directory
}

/**
 * Multi-tier skill loader with System → User → Workspace hierarchy.
 * Supports progressive disclosure and priority-based overriding.
 */
export class SkillLoader {
  private workspaceSkillsDirs: string[];
  private userSkillsDir: string;
  private systemSkillsDir: string;

  constructor(workspaceSkillsDir: string = ".skills") {
    // Workspace: .skills and .agents/skills (highest priority)
    this.workspaceSkillsDirs = [workspaceSkillsDir, ".agents/skills"];

    // User: ~/.mechanical-revolution/skills
    const homeDir = homedir();
    this.userSkillsDir = join(homeDir, ".mechanical-revolution", "skills");

    // System: ~/.mechanical-revolution/skills/.system (lowest priority)
    this.systemSkillsDir = join(homeDir, ".mechanical-revolution", "skills", ".system");
  }

  /**
   * Load all skills from the .skills directory.
   * Scans for both legacy .md files and standard SKILL.md in subdirectories.
   *
   * @deprecated Use listMetadata() for progressive disclosure
   */
  loadAll(): void {
    const allMetadata = this.listMetadata();
    console.log(`✓ Loaded ${allMetadata.length} skill(s) from all tiers`);

    // Show breakdown by scope
    const byScope = allMetadata.reduce((acc, s) => {
      acc[s.scope || "unknown"] = (acc[s.scope || "unknown"] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (byScope.system) console.log(`  - System: ${byScope.system}`);
    if (byScope.user) console.log(`  - User: ${byScope.user}`);
    if (byScope.workspace) console.log(`  - Workspace: ${byScope.workspace}`);
  }

  /**
   * Get metadata for all available skills (for progressive disclosure).
   * Discovers skills from all tiers with priority: Workspace > User > System.
   * Higher priority skills override lower priority ones with the same name.
   */
  listMetadata(): SkillMetadata[] {
    const skillMap = new Map<string, SkillMetadata>();

    // 1. Load system skills (lowest priority)
    this.loadMetadataFromDir(this.systemSkillsDir, "system").forEach(s =>
      skillMap.set(s.name, s)
    );

    // 2. Load user skills (override system)
    this.loadMetadataFromDir(this.userSkillsDir, "user").forEach(s =>
      skillMap.set(s.name, s)
    );

    // 3. Load workspace skills (highest priority, override all)
    for (const dir of this.workspaceSkillsDirs) {
      this.loadMetadataFromDir(dir, "workspace").forEach(s =>
        skillMap.set(s.name, s)
      );
    }

    return Array.from(skillMap.values());
  }

  /**
   * Load metadata from a specific directory.
   */
  private loadMetadataFromDir(dir: string, scope: SkillScope): SkillMetadata[] {
    if (!existsSync(dir)) {
      return [];
    }

    const metadata: SkillMetadata[] = [];

    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          const skillMdPath = join(fullPath, 'SKILL.md');
          if (existsSync(skillMdPath)) {
            const content = readFileSync(skillMdPath, "utf-8");
            const meta = this.extractMetadata(content, skillMdPath);
            if (meta) {
              metadata.push({ ...meta, scope });
            }
          }
        } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") {
          const content = readFileSync(fullPath, "utf-8");
          const meta = this.extractMetadata(content, fullPath);
          if (meta) {
            metadata.push({ ...meta, scope });
          }
        }
      }
    } catch (err) {
      // Silently ignore errors (e.g., permission denied)
    }

    return metadata;
  }

  /**
   * Extract only metadata from skill content (without parsing full body).
   */
  private extractMetadata(content: string, location: string): SkillMetadata | undefined {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return undefined;
    }

    const [, frontmatter] = match;
    const metadata = this.parseFrontmatter(frontmatter);

    if (!metadata.name || !metadata.description) {
      return undefined;
    }

    return {
      name: metadata.name,
      description: metadata.description,
      location,
    };
  }

  /**
   * Get a skill by name - reads file on demand.
   * Searches in priority order: Workspace > User > System.
   */
  get(name: string): Skill | undefined {
    // Try workspace directories first (highest priority)
    for (const dir of this.workspaceSkillsDirs) {
      const skill = this.getFromDir(name, dir, "workspace");
      if (skill) return skill;
    }

    // Try user directory
    const userSkill = this.getFromDir(name, this.userSkillsDir, "user");
    if (userSkill) return userSkill;

    // Try system directory (lowest priority)
    const systemSkill = this.getFromDir(name, this.systemSkillsDir, "system");
    if (systemSkill) return systemSkill;

    return undefined;
  }

  /**
   * Get a skill from a specific directory.
   */
  private getFromDir(name: string, dir: string, scope: SkillScope): Skill | undefined {
    if (!existsSync(dir)) {
      return undefined;
    }

    try {
      // Try standard structure first: dir/skill-name/SKILL.md
      const standardPath = join(dir, name, 'SKILL.md');
      if (existsSync(standardPath)) {
        const content = readFileSync(standardPath, "utf-8");
        const skillDir = join(dir, name);
        const skill = this.parseSkill(content, skillDir);
        if (skill) {
          skill.metadata.scope = scope;
          return skill;
        }
      }

      // Try legacy format: dir/skill-name.md
      const legacyPath = join(dir, `${name}.md`);
      if (existsSync(legacyPath)) {
        const content = readFileSync(legacyPath, "utf-8");
        const skill = this.parseSkill(content);
        if (skill) {
          skill.metadata.scope = scope;
          return skill;
        }
      }

      return undefined;
    } catch (err) {
      return undefined;
    }
  }

  /**
   * Get folder structure for a skill directory (for progressive disclosure).
   */
  getFolderStructure(skillDir: string): string {
    if (!existsSync(skillDir)) {
      return '';
    }

    const structure: string[] = [];
    const subdirs = ['scripts', 'references', 'assets'];

    for (const subdir of subdirs) {
      const subdirPath = join(skillDir, subdir);
      if (existsSync(subdirPath)) {
        try {
          const files = readdirSync(subdirPath);
          if (files.length > 0) {
            structure.push(`${subdir}/`);
            files.forEach(file => {
              structure.push(`  ${file}`);
            });
          }
        } catch (err) {
          // Ignore errors
        }
      }
    }

    return structure.join('\n');
  }

  /**
   * List all available skills (metadata only).
   * @deprecated Use listMetadata() instead
   */
  list(): SkillMetadata[] {
    return this.listMetadata();
  }

  /**
   * Check if a skill exists.
   */
  has(name: string): boolean {
    return this.get(name) !== undefined;
  }

  /**
   * Parse a skill from Markdown content with YAML frontmatter.
   */
  private parseSkill(content: string, skillDir?: string): Skill | undefined {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      console.warn("Skill file missing frontmatter");
      return undefined;
    }

    const [, frontmatter, body] = match;
    const metadata = this.parseFrontmatter(frontmatter);

    if (!metadata.name || !metadata.description) {
      console.warn("Skill missing required metadata (name, description)");
      return undefined;
    }

    // Discover resources in skill directory
    let scripts: string[] | undefined;
    let references: string[] | undefined;
    let assets: string[] | undefined;

    if (skillDir) {
      scripts = this.listFilesInDir(join(skillDir, 'scripts'));
      references = this.listFilesInDir(join(skillDir, 'references'));
      assets = this.listFilesInDir(join(skillDir, 'assets'));
    }

    return {
      metadata,
      content: body.trim(),
      skillDir,
      scripts,
      references,
      assets,
    };
  }

  /**
   * List files in a directory (returns undefined if directory doesn't exist).
   */
  private listFilesInDir(dir: string): string[] | undefined {
    if (!existsSync(dir)) {
      return undefined;
    }

    try {
      return readdirSync(dir).filter(f => {
        const stat = readdirSync(dir, { withFileTypes: true }).find(e => e.name === f);
        return stat?.isFile();
      });
    } catch {
      return undefined;
    }
  }

  /**
   * Parse YAML frontmatter into metadata object.
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
}
