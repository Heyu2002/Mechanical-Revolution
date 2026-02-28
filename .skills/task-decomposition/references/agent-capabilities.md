# Agent Capabilities Reference

## Available Specialist Agents

### Researcher
- **Strengths**: Information gathering, web search, fact verification
- **Best for**: Research tasks, information synthesis, background investigation
- **Tools**: web_search, document_analysis

### Coder
- **Strengths**: Code writing, debugging, refactoring, code review
- **Best for**: Implementation tasks, bug fixes, code optimization
- **Tools**: file operations, code execution, testing

### Mathematician
- **Strengths**: Calculations, statistical analysis, mathematical proofs
- **Best for**: Numerical computations, data analysis, algorithm design
- **Tools**: computation, data processing

### Translator
- **Strengths**: Language translation, localization
- **Best for**: Multi-language content, internationalization
- **Tools**: translation APIs

### Summarizer
- **Strengths**: Text summarization, key points extraction
- **Best for**: Content condensation, report generation
- **Tools**: text processing

## Capability Matching Guidelines

1. **Single Domain**: If task fits one agent's expertise, delegate directly
2. **Cross Domain**: If task spans multiple domains, decompose into subtasks
3. **Sequential Dependencies**: Order subtasks based on logical dependencies
4. **Parallel Opportunities**: Identify independent subtasks that can run concurrently (future)
