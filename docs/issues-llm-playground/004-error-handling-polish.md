# #4: Error Handling + Polish

## Parent

[PRD: Korean LLM Exercise Playground](../prd-llm-playground.md)

## What to Build

Add resilience and debugging affordances to the Generate flow. When the LLM returns unparseable JSON, show the raw response on the frontend so the instructor can debug the prompt. Add a count control so the instructor can request fewer or more exercises per generation. Add loading spinners and graceful error states throughout the UI.

## Acceptance Criteria

- [ ] When LLM returns invalid JSON, the frontend displays `{ error: "LLM returned invalid JSON", raw: "..." }` with the raw text visible
- [ ] A count input (default 5, range 1–10) appears near the Generate button
- [ ] Changing the count value is sent in the `POST /generate` body and respected by the LLM
- [ ] Loading state: spinner or pulsing text shown during generation, removed when response arrives
- [ ] Network error state: if the server is unreachable, show a clear error message on the frontend
- [ ] Empty state: if the LLM returns an empty array, show "No exercises generated" message

## Blocked By

- #2 — Generator Core + First Exercise (needs the full Generate flow to add error handling to)
