---
name: phased-plan-writer
description: >
  Write, review, or update agent-agnostic phased implementation, audit, migration,
  refactor, or verification plans. Use when the user asks for a phased plan,
  phase-by-phase roadmap, implementation plan broken into phases, migration plan,
  refactor plan, audit plan, verification plan, or a plan file intended for future
  coding agents or LLM sessions. Always read PHASED_PLAN_GUIDE.md as the source
  of truth before drafting or modifying any phased plan.
---

# Phased Plan Writer

Use this skill to create or maintain phased plans that future coding agents can execute without chat history.

## Source Of Truth

- Read [PHASED_PLAN_GUIDE.md](../../../PHASED_PLAN_GUIDE.md) from the vault root before writing, reviewing, or updating a phased plan.
- Treat the guide as authoritative. If these instructions and the guide disagree, follow the guide.
- Do not duplicate the guide in this skill. Load the guide for exact templates, required sections, status markers, and quality checks.
- If the guide cannot be found, stop and report that the required source-of-truth file is missing.

## Workflow

1. Locate the guide at `PHASED_PLAN_GUIDE.md` from the repository root. If the working directory is uncertain, find it with `rg --files -g PHASED_PLAN_GUIDE.md`.
2. Read the guide before drafting or editing the plan.
3. Research the target work enough to preserve concrete context in the plan: exact files, commands, current behavior, constraints, validation signals, and remaining unknowns.
4. Draft or update the phased plan in plain Markdown with no agent-specific frontmatter.
5. Make the plan self-contained for a future agent: include the guide-required visual plan, evidence manifest, current state snapshot, phase overview, detailed phases, verification, handoff, assumptions, and traps.
6. For existing plans, update phase statuses and handoff notes exactly as the guide specifies.
7. Before finishing, check the plan against the guide's quality checklist.

## Output Rules

- If the user asks for a plan file, create or edit the requested Markdown file.
- If the user asks for a plan in chat, return guide-compliant Markdown.
- If there is not enough repo or task context to write an autonomous plan, gather the missing context before drafting.
- Keep plan prose concise and execution-focused; preserve evidence and exact commands instead of broad instructions.
