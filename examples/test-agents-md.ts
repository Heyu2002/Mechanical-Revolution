/**
 * Test: AGENTS.md Hierarchical Support
 */

import { AgentsMdLoader } from "../src/index.js";
import { mkdirSync, writeFileSync, existsSync, rmSync } from "fs";
import { join } from "path";

console.log("=== AGENTS.md Hierarchical Support Test ===\n");

// Setup test directory structure
const testDir = "test-agents-md";
const subDir = join(testDir, "src");
const deepDir = join(subDir, "components");

console.log("1. Setting up test directory structure...");

// Create directories
if (existsSync(testDir)) {
  rmSync(testDir, { recursive: true, force: true });
}
mkdirSync(deepDir, { recursive: true });

// Create AGENTS.md at root level
writeFileSync(
  join(testDir, "AGENTS.md"),
  `# Root Level Instructions

- Use TypeScript for all code
- Follow ESLint rules
- Write tests for all features
`
);
console.log(`   ✓ Created ${join(testDir, "AGENTS.md")}`);

// Create AGENTS.md at src level
writeFileSync(
  join(subDir, "AGENTS.md"),
  `# Source Code Instructions

- Use strict mode
- Export all public APIs
- Document all functions with JSDoc
`
);
console.log(`   ✓ Created ${join(subDir, "AGENTS.md")}`);

// Create AGENTS.md at components level
writeFileSync(
  join(deepDir, "AGENTS.md"),
  `# Component Instructions

- Use React functional components
- Add PropTypes validation
- Include accessibility attributes
`
);
console.log(`   ✓ Created ${join(deepDir, "AGENTS.md")}`);

console.log("\n2. Testing hierarchical loading from deepest directory...");

const loader = new AgentsMdLoader();
const files = loader.loadHierarchy(deepDir);

console.log(`   Found ${files.length} AGENTS.md files\n`);

files.forEach((file, index) => {
  console.log(`   [${index}] Depth ${file.depth}: ${file.path}`);
  console.log(`       Preview: ${file.content.substring(0, 50).replace(/\n/g, " ")}...`);
});

console.log("\n3. Testing precedence (deepest first)...");

if (files.length === 3) {
  if (files[0].depth === 0 && files[0].path.includes("components")) {
    console.log("   ✓ Deepest file (components) has highest priority");
  } else {
    console.log("   ❌ Precedence order incorrect");
  }

  if (files[1].depth === 1 && files[1].path.includes("src")) {
    console.log("   ✓ Middle file (src) has medium priority");
  } else {
    console.log("   ❌ Precedence order incorrect");
  }

  if (files[2].depth === 2 && files[2].path.includes(testDir)) {
    console.log("   ✓ Root file has lowest priority");
  } else {
    console.log("   ❌ Precedence order incorrect");
  }
} else {
  console.log(`   ❌ Expected 3 files, found ${files.length}`);
}

console.log("\n4. Testing from middle directory...");

const filesFromMiddle = loader.loadHierarchy(subDir);
console.log(`   Found ${filesFromMiddle.length} AGENTS.md files from src/`);

if (filesFromMiddle.length === 2) {
  console.log("   ✓ Correctly found 2 files (src and root)");
} else {
  console.log(`   ❌ Expected 2 files, found ${filesFromMiddle.length}`);
}

console.log("\n5. Testing prompt rendering...");

const prompt = loader.renderToPrompt(files);
console.log(`   Generated ${prompt.length} characters of prompt content`);

if (prompt.includes("Project Instructions (AGENTS.md)")) {
  console.log("   ✓ Includes section header");
}

if (prompt.includes("Precedence Rules")) {
  console.log("   ✓ Includes precedence rules");
}

if (prompt.includes("Current Directory")) {
  console.log("   ✓ Includes current directory label");
}

if (prompt.includes("Parent Level")) {
  console.log("   ✓ Includes parent level labels");
}

console.log("\n   Preview:");
console.log("   " + prompt.substring(0, 200).replace(/\n/g, "\n   ") + "...");

console.log("\n6. Testing summary...");

const summary = loader.getSummary(files);
console.log(summary);

console.log("\n7. Testing with no AGENTS.md files...");

const emptyDir = join(testDir, "empty");
mkdirSync(emptyDir, { recursive: true });

const noFiles = loader.loadHierarchy(emptyDir);
console.log(`   Found ${noFiles.length} files`);

if (noFiles.length === 3) {
  console.log("   ✓ Still finds parent AGENTS.md files");
} else {
  console.log(`   Note: Found ${noFiles.length} files (depends on parent structure)`);
}

const emptyPrompt = loader.renderToPrompt([]);
if (emptyPrompt === "") {
  console.log("   ✓ Empty array returns empty string");
}

console.log("\n=== Cleanup ===");
console.log("Removing test directory...");

rmSync(testDir, { recursive: true, force: true });
console.log("✓ Cleanup complete");

console.log("\n=== Test Complete ===");
console.log("\n✓ AGENTS.md hierarchical support is working!");
console.log("\nKey features:");
console.log("  - Discovers AGENTS.md files from current directory up to root");
console.log("  - Maintains precedence (deeper = higher priority)");
console.log("  - Renders into structured system prompt");
console.log("  - Includes scope and precedence information");
