/**
 * Architecture reference for AI CLI frameworks
 * Based on deep analysis of Gemini CLI and Codex
 *
 * This can be injected into system prompts to provide
 * architectural guidance and best practices.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load architecture reference from Markdown file
 */
function loadArchitectureReference(): string {
  try {
    const mdPath = join(__dirname, 'ARCHITECTURE.md');
    return readFileSync(mdPath, 'utf-8');
  } catch (error) {
    console.warn('Failed to load ARCHITECTURE.md, using fallback');
    return FALLBACK_ARCHITECTURE_REFERENCE;
  }
}

/**
 * Fallback architecture reference (in case MD file is not available)
 */
const FALLBACK_ARCHITECTURE_REFERENCE = `
# AI CLI Framework Architecture Reference

## Core Principles
1. Modular Layered Architecture (CLI, Core, Provider layers)
2. UI and core logic completely decoupled
3. Event-driven architecture with observability

## Key Patterns
- Skills/Tools: Markdown-based definitions
- Agent Registry: Dynamic loading from .agents/
- Task Flow: Structured execution tracking
- EventBus: Centralized event handling

## Design Principles
- Single Responsibility
- Dependency Inversion
- Open/Closed
- Interface Segregation
`;

/**
 * Architecture reference content (loaded from ARCHITECTURE.md)
 */
export const ARCHITECTURE_REFERENCE = loadArchitectureReference();

/**
 * Get architecture reference for injection into system prompts
 */
export function getArchitectureReference(): string {
  return ARCHITECTURE_REFERENCE;
}
