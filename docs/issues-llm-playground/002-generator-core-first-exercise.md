# #2: Generator Core + First Exercise

## Parent

[PRD: Korean LLM Exercise Playground](../prd-llm-playground.md)

## What to Build

The pure `generator.js` module — takes structured lesson data, a grammar point, cumulative vocabulary, and a prompt template, calls the DeepSeek LLM, and returns typed exercise objects. A `POST /generate` endpoint on the server wires this to the frontend. The frontend shows exercise type buttons for the selected lesson and renders exercise cards when generation completes.

One prompt file (`fill-blank-g11.md`) exists for Lesson 1's G1.1 grammar point. Cumulative vocabulary is built at runtime by loading all lesson files up to the selected lesson and deduplicating by Korean string.

## Acceptance Criteria

- [ ] `generator.js` exports `generateExercises({ lesson, grammarPoint, vocab, promptTemplate, count })` and returns `Exercise[]`
- [ ] `generator.js` has zero imports from `http` or any HTTP-related module
- [ ] Cumulative vocabulary: selecting lesson 3 gives vocab from lessons 1, 2, and 3 (deduplicated by Korean string)
- [ ] `prompts/lesson-1/fill-blank-g11.md` exists with template variables `{grammarPattern}`, `{grammarDescription}`, `{examples}`, `{vocabList}`, `{count}`
- [ ] `POST /generate` with `{ lessonId, promptFile, count }` returns exercise objects
- [ ] DeepSeek API call uses `deepseek-chat` model with `response_format: { type: "json_object" }`
- [ ] Exercise objects have required fields: `id`, `type`, `prompt`, `answer`, `hint`, `grammar`, `vocab`
- [ ] Frontend: selecting Lesson 1 shows "Fill-in-the-blank (G1.1)" as an exercise type button
- [ ] Frontend: clicking Generate shows a loading state, then renders exercise cards
- [ ] Exercise cards display prompt, answer, hint, and grammar point

## Blocked By

- #1 — Project Scaffold + Lesson Selector (needs server, lesson data, and selector UI)
