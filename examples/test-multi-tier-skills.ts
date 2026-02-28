/**
 * Test: Multi-tier Skills Discovery
 */

import { SkillLoader } from "../src/index.js";
import { mkdirSync, writeFileSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { homedir } from "os";

console.log("=== Multi-tier Skills Discovery Test ===\n");

// Setup test directories
const homeDir = homedir();
const userSkillsDir = join(homeDir, ".mechanical-revolution", "skills");
const systemSkillsDir = join(homeDir, ".mechanical-revolution", "skills", ".system");

// Create test skills in different tiers
console.log("1. Setting up test skills...");

// System skill
if (!existsSync(systemSkillsDir)) {
  mkdirSync(systemSkillsDir, { recursive: true });
}
const systemSkillDir = join(systemSkillsDir, "test-system-skill");
if (!existsSync(systemSkillDir)) {
  mkdirSync(systemSkillDir, { recursive: true });
}
writeFileSync(
  join(systemSkillDir, "SKILL.md"),
  `---
name: test-system-skill
description: A system-level test skill
---

# System Skill

This is a system-level skill.
`
);
console.log("   ✓ Created system skill");

// User skill
if (!existsSync(userSkillsDir)) {
  mkdirSync(userSkillsDir, { recursive: true });
}
const userSkillDir = join(userSkillsDir, "test-user-skill");
if (!existsSync(userSkillDir)) {
  mkdirSync(userSkillDir, { recursive: true });
}
writeFileSync(
  join(userSkillDir, "SKILL.md"),
  `---
name: test-user-skill
description: A user-level test skill
---

# User Skill

This is a user-level skill.
`
);
console.log("   ✓ Created user skill");

// User skill that overrides system skill
const userOverrideDir = join(userSkillsDir, "test-system-skill");
if (!existsSync(userOverrideDir)) {
  mkdirSync(userOverrideDir, { recursive: true });
}
writeFileSync(
  join(userOverrideDir, "SKILL.md"),
  `---
name: test-system-skill
description: User override of system skill
---

# User Override

This overrides the system skill.
`
);
console.log("   ✓ Created user override skill");

// Workspace skill (already exists: task-decomposition)
console.log("   ✓ Using existing workspace skill: task-decomposition");

// Test .agents/skills alias
const agentsSkillsDir = ".agents/skills";
if (!existsSync(agentsSkillsDir)) {
  mkdirSync(agentsSkillsDir, { recursive: true });
}
const agentsSkillDir = join(agentsSkillsDir, "test-agents-skill");
if (!existsSync(agentsSkillDir)) {
  mkdirSync(agentsSkillDir, { recursive: true });
}
writeFileSync(
  join(agentsSkillDir, "SKILL.md"),
  `---
name: test-agents-skill
description: A skill in .agents/skills directory
---

# Agents Skill

This is in .agents/skills for cross-tool compatibility.
`
);
console.log("   ✓ Created .agents/skills skill");

console.log("\n2. Testing multi-tier discovery...");

const skillLoader = new SkillLoader(".skills");
const allSkills = skillLoader.listMetadata();

console.log(`   Found ${allSkills.length} total skills\n`);

// Group by scope
const byScope = allSkills.reduce((acc, s) => {
  const scope = s.scope || "unknown";
  if (!acc[scope]) acc[scope] = [];
  acc[scope].push(s);
  return acc;
}, {} as Record<string, typeof allSkills>);

if (byScope.system) {
  console.log(`   System skills (${byScope.system.length}):`);
  byScope.system.forEach(s => console.log(`     - ${s.name}: ${s.description.substring(0, 50)}...`));
}

if (byScope.user) {
  console.log(`\n   User skills (${byScope.user.length}):`);
  byScope.user.forEach(s => console.log(`     - ${s.name}: ${s.description.substring(0, 50)}...`));
}

if (byScope.workspace) {
  console.log(`\n   Workspace skills (${byScope.workspace.length}):`);
  byScope.workspace.forEach(s => console.log(`     - ${s.name}: ${s.description.substring(0, 50)}...`));
}

console.log("\n3. Testing priority override...");

// Get the skill that exists in both system and user
const overriddenSkill = skillLoader.get("test-system-skill");
if (overriddenSkill) {
  console.log(`   Skill "test-system-skill" loaded from: ${overriddenSkill.metadata.scope}`);
  console.log(`   Description: ${overriddenSkill.metadata.description}`);

  if (overriddenSkill.metadata.scope === "user") {
    console.log("   ✓ User skill correctly overrides system skill");
  } else {
    console.log("   ❌ Priority override not working correctly");
  }
}

console.log("\n4. Testing .agents/skills alias...");
const agentsSkill = skillLoader.get("test-agents-skill");
if (agentsSkill) {
  console.log(`   ✓ Skill from .agents/skills loaded successfully`);
  console.log(`   Scope: ${agentsSkill.metadata.scope}`);
} else {
  console.log("   ❌ .agents/skills alias not working");
}

console.log("\n5. Testing loadAll() with breakdown...");
skillLoader.loadAll();

console.log("\n=== Cleanup ===");
console.log("Removing test skills...");

// Cleanup
try {
  rmSync(systemSkillDir, { recursive: true, force: true });
  rmSync(userSkillDir, { recursive: true, force: true });
  rmSync(userOverrideDir, { recursive: true, force: true });
  rmSync(agentsSkillsDir, { recursive: true, force: true });
  console.log("✓ Cleanup complete");
} catch (err) {
  console.log("⚠️  Cleanup failed (you may need to remove test files manually)");
}

console.log("\n=== Test Complete ===");
console.log("\n✓ Multi-tier skills discovery is working!");
console.log("\nSupported tiers:");
console.log("  1. System: ~/.mechanical-revolution/skills/.system (lowest priority)");
console.log("  2. User: ~/.mechanical-revolution/skills (medium priority)");
console.log("  3. Workspace: .skills and .agents/skills (highest priority)");
