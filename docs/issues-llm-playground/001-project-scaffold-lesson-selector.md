# #1: Project Scaffold + Lesson Selector

## Parent

[PRD: Korean LLM Exercise Playground](../prd-llm-playground.md)

## What to Build

A zero-dependency Node.js HTTP server that serves a single-page frontend. The frontend displays 7 lesson tabs at the top of the page. Clicking a tab selects it (visual highlight) and logs the selection to the browser console. Lesson 1 exists as a structured JSON data file with vocabulary and grammar from the KLEAR textbook.

The server uses only Node.js built-in modules (`http`, `fs`, `path`). The frontend uses vanilla HTML, CSS, and JavaScript — no frameworks, no build tools, no npm install.

## Acceptance Criteria

- [ ] `node server.js` starts the server without errors and without `npm install`
- [ ] Visiting `http://localhost:3000` renders the page
- [ ] 7 lesson tabs (1–7) are visible at the top of the page
- [ ] Clicking a lesson tab highlights it visually and deselects the previously selected tab
- [ ] Clicking a lesson tab logs the selected lesson ID to the browser console
- [ ] `data/lesson-1.json` exists with KLEAR Lesson 1 vocabulary and grammar
- [ ] `.env` file is parsed at server startup (DEEPSEEK_API_KEY loaded, not yet used)
- [ ] Server serves static files from `public/` directory
- [ ] No npm dependencies in `package.json` (if it exists, no `dependencies` field)

## Blocked By

None — can start immediately
