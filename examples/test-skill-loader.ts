/**
 * Test Skill Loader functionality
 */

import { SkillLoader } from "../src/index.js";

console.log("=== Skill Loader Test ===\n");

const loader = new SkillLoader();

console.log("Loading skills from .skills directory...");
loader.loadAll();

console.log("\n─── Available Skills ───\n");
const skills = loader.list();

if (skills.length === 0) {
  console.log("No skills found.");
} else {
  skills.forEach((skill) => {
    console.log(`📚 ${skill.name} (v${skill.version})`);
    console.log(`   ${skill.description}`);
    if (skill.author) {
      console.log(`   Author: ${skill.author}`);
    }
    if (skill.agents && skill.agents.length > 0) {
      console.log(`   Agents: ${skill.agents.join(", ")}`);
    }
    console.log();
  });
}

console.log("─── Skill Details ───\n");

const taskDecomp = loader.get("task-decomposition");
if (taskDecomp) {
  console.log("✓ Found 'task-decomposition' skill");
  console.log(`  Metadata: ${JSON.stringify(taskDecomp.metadata, null, 2)}`);
  console.log(`  Content length: ${taskDecomp.content.length} characters`);
  console.log(`  First 200 chars: ${taskDecomp.content.substring(0, 200)}...`);
} else {
  console.log("✗ 'task-decomposition' skill not found");
}

console.log("\n─── Test Complete ───");
console.log(`Total skills loaded: ${loader.size}`);
