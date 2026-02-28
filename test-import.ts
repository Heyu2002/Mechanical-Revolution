// Test build-time embedding
import { DEFAULT_SYSTEM_PROMPT, ORCHESTRATOR_PROMPT, ARCHITECTURE_REFERENCE } from './src/core/prompts.generated.js';

console.log('✓ DEFAULT_SYSTEM_PROMPT:', DEFAULT_SYSTEM_PROMPT.substring(0, 50) + '...');
console.log('✓ ORCHESTRATOR_PROMPT:', ORCHESTRATOR_PROMPT.substring(0, 50) + '...');
console.log('✓ ARCHITECTURE_REFERENCE:', ARCHITECTURE_REFERENCE.substring(0, 50) + '...');
console.log('\n✨ All prompts embedded successfully!');
