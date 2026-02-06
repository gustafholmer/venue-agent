# Claude Code Instructions

## Model Preferences

- Use Opus (`model: "opus"`) for reasoning-heavy subagents: planning, brainstorming, code review, complex implementation.
- Use Sonnet (`model: "sonnet"`) for exploration subagents: codebase search, file lookups, simple information gathering.
- Do not use Haiku unless explicitly requested.
