import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";

export interface AgentsMdFile {
  path: string;
  content: string;
  depth: number; // 0 = current dir, 1 = parent, 2 = grandparent, etc.
}

/**
 * AGENTS.md loader with hierarchical support.
 * Discovers and loads AGENTS.md files from current directory up to root.
 * More deeply nested files take precedence over parent files.
 */
export class AgentsMdLoader {
  /**
   * Load AGENTS.md hierarchy from current working directory up to root.
   * Returns files ordered by depth (0 = deepest/current, higher = ancestors).
   */
  loadHierarchy(cwd: string = process.cwd()): AgentsMdFile[] {
    const files: AgentsMdFile[] = [];
    let currentDir = cwd;
    let depth = 0;

    while (true) {
      const agentsMdPath = join(currentDir, "AGENTS.md");

      if (existsSync(agentsMdPath)) {
        try {
          const content = readFileSync(agentsMdPath, "utf-8");
          files.push({
            path: agentsMdPath,
            content,
            depth,
          });
        } catch (err) {
          // Silently ignore read errors
        }
      }

      // Move to parent directory
      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) {
        // Reached root
        break;
      }
      currentDir = parentDir;
      depth++;
    }

    // Sort by depth (deepest first = highest priority)
    return files.sort((a, b) => a.depth - b.depth);
  }

  /**
   * Render AGENTS.md files into system prompt format.
   * Includes precedence information.
   */
  renderToPrompt(files: AgentsMdFile[]): string {
    if (files.length === 0) {
      return "";
    }

    const sections = files.map((file, index) => {
      const level = index === 0 ? "Current Directory" : `Parent Level ${file.depth}`;
      return `### ${level} (${file.path})

${file.content}`;
    }).join("\n\n");

    return `
## Project Instructions (AGENTS.md)

The following instructions are from AGENTS.md files in this repository. These files provide project-specific guidance and conventions.

**Precedence Rules**:
- More deeply nested AGENTS.md files take precedence over parent files
- Direct user instructions take precedence over AGENTS.md
- When instructions conflict, follow the most specific (deepest) one

${sections}

**Important**: Follow these instructions when working on files within their scope. The scope of an AGENTS.md file is the entire directory tree rooted at the folder that contains it.
`.trim();
  }

  /**
   * Get a simple summary of AGENTS.md files for display.
   */
  getSummary(files: AgentsMdFile[]): string {
    if (files.length === 0) {
      return "No AGENTS.md files found";
    }

    return files
      .map(f => `  - ${f.path} (depth: ${f.depth})`)
      .join("\n");
  }
}
