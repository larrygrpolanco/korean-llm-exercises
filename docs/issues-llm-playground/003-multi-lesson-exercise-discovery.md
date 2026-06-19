# #3: Multi-Lesson Data + Exercise Type Discovery

## Parent

[PRD: Korean LLM Exercise Playground](../prd-llm-playground.md)

## What to Build

Complete the lesson data for Lessons 2–7 based on the KLEAR textbook and reference data in `data_examples/`. Implement auto-discovery of prompt files so that exercise type buttons appear based on what `.md` files exist in each lesson's prompt directory — no hardcoded lists. The lesson selector loads dynamically from the available data files rather than being statically hardcoded.

## Acceptance Criteria

- [ ] `data/lesson-2.json` through `data/lesson-7.json` exist with vocabulary and grammar
- [ ] Lesson selector tabs are populated dynamically from files in `data/` directory
- [ ] Exercise type buttons for a lesson are discovered from `prompts/lesson-N/*.md` files at runtime
- [ ] Adding a new `.md` file to `prompts/lesson-3/` makes it appear as a button when Lesson 3 is selected (no code change, no restart if possible or documented)
- [ ] All 7 lessons generate exercises end-to-end
- [ ] Cumulative vocabulary works correctly across all 7 lessons

## Blocked By

- #2 — Generator Core + First Exercise (needs the generator + prompt system to discover against)
