# Claude Code Instructions

## Model Preferences

- Use Opus (`model: "opus"`) for reasoning-heavy subagents: planning, brainstorming, code review, complex implementation.
- Use Sonnet (`model: "sonnet"`) for exploration subagents: codebase search, file lookups, simple information gathering.
- Do not use Haiku unless explicitly requested.

## Skills

- Always use superpowers skills when they apply. Check for applicable skills before starting any task.
- Never skip a skill because the task seems simple — invoke it if there's even a chance it's relevant.
- Use the `subagent-driven-development` skill when implementing features or executing plans with independent tasks.
