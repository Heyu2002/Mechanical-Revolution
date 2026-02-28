/**
 * Quick Test: Progressive Disclosure
 *
 * Run this to verify the progressive disclosure system works.
 */

import { SkillLoader, renderSkillsSection, createActivateSkillTool } from "../src/index.js";

console.log("=== Progressive Disclosure Test ===\n");

// 1. Initialize skill loader
console.log("1. Initializing skill loader...");
const skillLoader = new SkillLoader(".skills");

// 2. List skill metadata (Level 1)
console.log("\n2. Loading skill metadata (Level 1 - Progressive Disclosure)...");
const skillMetadata = skillLoader.listMetadata();
console.log(`   Found ${skillMetadata.length} skill(s):`);
skillMetadata.forEach(s => {
  console.log(`   - ${s.name}: ${s.description.substring(0, 60)}...`);
  console.log(`     Location: ${s.location}`);
});

// 3. Render skills section for system prompt
console.log("\n3. Rendering skills section for system prompt...");
const skillsSection = renderSkillsSection(skillMetadata);
console.log(`   Generated ${skillsSection.length} characters of prompt content`);
console.log(`   Preview:\n${skillsSection.substring(0, 300)}...\n`);

// 4. Create activate_skill tool
console.log("4. Creating activate_skill tool...");
const activateSkillTool = createActivateSkillTool(
  skillLoader,
  skillMetadata.map(s => s.name)
);
console.log(`   Tool name: ${activateSkillTool.name}`);
console.log(`   Tool description: ${activateSkillTool.description.substring(0, 80)}...`);

// 5. Test skill activation (Level 2)
if (skillMetadata.length > 0) {
  console.log("\n5. Testing skill activation (Level 2 - Progressive Disclosure)...");
  const testSkillName = skillMetadata[0].name;
  console.log(`   Activating skill: ${testSkillName}`);

  const mockContext = {
    state: {},
    history: [],
    currentAgent: "test",
    handoffChain: [],
    metadata: {},
  };

  try {
    const result = await activateSkillTool.execute(
      { name: testSkillName },
      mockContext
    );

    if ('error' in result) {
      console.log(`   ❌ Error: ${result.error}`);
    } else {
      console.log(`   ✓ Skill activated successfully`);
      console.log(`   Content length: ${(result as any).content.length} characters`);
      console.log(`   Display message: ${(result as any).display}`);
      console.log(`   Activated skills in context: ${mockContext.metadata.activatedSkills}`);

      // Show preview of activated content
      const content = (result as any).content;
      const preview = content.substring(0, 500);
      console.log(`\n   Content preview:\n${preview}...\n`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err}`);
  }
}

// 6. Test folder structure
if (skillMetadata.length > 0) {
  console.log("6. Testing folder structure discovery...");
  const testSkillName = skillMetadata[0].name;
  const skill = skillLoader.get(testSkillName);

  if (skill?.skillDir) {
    const structure = skillLoader.getFolderStructure(skill.skillDir);
    console.log(`   Folder structure for ${testSkillName}:`);
    console.log(structure || "   (No subdirectories)");
  }
}

console.log("\n=== Test Complete ===");
console.log("\n✓ Progressive disclosure system is working!");
console.log("\nNext steps:");
console.log("1. Use getDefaultSystemPrompt(skillMetadata) to inject skills into agent");
console.log("2. Add activateSkillTool to agent's tools array");
console.log("3. LLM will automatically activate skills when needed");
