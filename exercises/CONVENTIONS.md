# Exercise Module Conventions

## Big Picture

```
exercises/
└── L1-narration/            ← each folder is one exercise
    ├── exercise.json         ← config: lesson, grammar, prompt file
    ├── prompt.md             ← LLM prompt template (if LLM-powered)
    ├── index.html            ← the exercise's own page
    ├── app.js                ← frontend: call /api/generate, render the JSON
    └── styles.css            ← exercise-specific styles
```

The server (`server.js`, at the repo root) auto-discovers folders in `exercises/`.  Drop a new folder, restart, and it appears on the main page.  No registration step.

---

## exercise.json – the config contract

```json
{
  "name": "L1 Narration Exercise",
  "description": "Optional blurb shown on the main page.",
  "lessonId": 1,
  "grammarIndex": 0,
  "promptFile": "prompt.md"
}
```

| Field            | Required?                            | Default | What it does |
|------------------|--------------------------------------|---------|--------------|
| `name`           | yes                                  | —       | Display name on the main page |
| `description`    | no                                   | `""`    | Short blurb on the main page |
| `lessonId`       | only for LLM exercises               | —       | Which lesson's vocab/grammar to load |
| `grammarIndex`   | no                                   | `0`     | Which grammar entry inside the lesson file |
| `promptFile`     | only for LLM exercises               | —       | Path to the prompt template (relative to the exercise folder) |

**Static exercises** omit `promptFile` and `lessonId`.  They never call the LLM.  See `L1-fill-in-country`.

**LLM exercises** need `lessonId` + `promptFile`.  `grammarIndex` is optional and defaults to `0` (the first grammar entry in `data/lesson-N.json`).

---

## prompt.md – the LLM contract

This is a template with `{placeholders}` that get substituted at runtime:

| Placeholder            | Resolves to |
|------------------------|-------------|
| `{grammarPattern}`     | e.g. `"N1은/는 N2이에요/예요"` |
| `{grammarDescription}` | e.g. `"Topic-comment equational expression…"` |
| `{examples}`           | Bullet list: `"- 저는 학생이에요. → I am a student."` |
| `{vocabList}`          | Comma-separated: `"학생 (student), 저 (I), …"` – **cumulative** across lessons 1..N |
| `{count}`              | The `?count=N` query param (clamped to 1–10, default 5) |

**Why cumulative vocab?** A Lesson 3 exercise gets vocabulary from Lessons 1, 2, *and* 3 (deduplicated by Korean string).  The student only sees words they've already "learned."

**The prompt is the schema.**  `generator.js` does zero field validation.  The prompt defines exactly what JSON shape the LLM should return.  The exercise's `app.js` renders that JSON however it wants.

Key prompt-writing conventions (consistent across existing exercises):

1. Say `"Output EXACTLY this JSON (no markdown):"` and show the exact JSON schema.
2. Use `"vocab"` as the key for the active word list the LLM pulled from.
3. Use `"sections"` for the exercise blocks – an array of `{ "title": "…", "exercises": [ … ] }`.
4. Each exercise item is `{ "prompt": "…", "answer": "…" }`.

---

## app.js – the frontend contract

Each `app.js` owns its rendering.  There is no shared component library.  The pattern is:

1. Grab the button, count input, loading/error/results elements.
2. On click → `fetch("/api/generate/:slug", { method: "POST", body: JSON.stringify({ count }) })`.
3. On error (non-2xx) → show `data.error` + optionally `data.raw` (the malformed LLM JSON, surfaced for prompt debugging).
4. On success → call a `render(data)` function that builds the DOM from `data.sections` / `data.narration` / whatever keys the prompt promised.

The two existing LLM exercises show the range:

- **L1-narration**:  Tabs per section.  `data.narration` shown first as a header.  Fill-in-the-blank inputs derived from `___` in prompt text.  Name highlighting via `**name**` → `<span>`.
- **L2-form-changes**:  Sections stacked vertically.  Simple `prompt → input` layout.  No tabs, no narration.

**The frontend is free-form.  The only contract is that it calls `POST /api/generate/:slug` and handles the JSON that comes back.**

---

## generator.js – what it does (and does not)

(`generator.js` lives at the repo root, shared by all exercises.)

```
fillTemplate(template, grammar, vocab, count)
  └─ substitutes placeholders into the raw prompt.md text

callDeepSeek(fullPrompt)
  └─ POSTs to api.deepseek.com/chat/completions
     model: deepseek-chat
     response_format: { type: "json_object" }
     temperature: 0.7
     timeout: 30s

parseResponse(rawBody)
  └─ extracts choices[0].message.content
  └─ strips markdown ``` fences if present
  └─ JSON.parses — throws with err.rawContent on failure
     (server catches this, returns 422 + raw content for debugging)

generate({ promptTemplate, grammarPoint, vocab, count })
  └─ the one public function
  └─ returns parsed JSON as-is — no validation
```

**It does not:**

- Validate field names, types, or presence.
- Know about any exercise's expected shape.
- Persist anything.

---

## server.js – wiring

(`server.js` lives at the repo root.)

Route table:

| Method | Path                        | What |
|--------|-----------------------------|------|
| GET    | `/`                         | Main exercise selector (`public/index.html`) |
| GET    | `/api/exercises`            | JSON list of all exercise folders with metadata |
| POST   | `/api/generate/:slug`       | Load config + prompt + lesson + cumulative vocab → call `generate()` → return JSON |
| GET    | `/exercises/:slug/`         | Serve `exercises/:slug/index.html` |
| GET    | `/exercises/:slug/file.ext` | Serve exercise static assets (css, js, images) |

For `POST /api/generate/:slug`, the server:

1. Reads `exercise.json` → extracts `lessonId`, `grammarIndex`, `promptFile`.
2. Reads `data/lesson-N.json` → picks grammar entry at `grammarIndex`.
3. Calls `buildVocab(lessonId)` → loads lessons 1..N, deduplicates by Korean string.
4. Reads `prompt.md` from the exercise folder.
5. Calls `generate({ promptTemplate, grammarPoint, vocab, count })`.
6. Parses `count` from the request body (clamped 1–10, default 5).

On error, returns `{ error: "…", raw: "…" }` (422 for invalid LLM JSON, 500 for API failures, 400/404 for config problems).

---

## Lesson data (`data/lesson-N.json`)

```json
{
  "id": 1,
  "title": "Greetings / 인사",
  "vocab": [
    { "korean": "학생", "english": "student", "pos": "noun" }
  ],
  "grammar": [
    {
      "id": "G1.1",
      "pattern": "N1은/는 N2이에요/예요",
      "description": "Topic-comment equational expression…",
      "examples": [
        { "kor": "저는 학생이에요.", "eng": "I am a student." }
      ]
    }
  ]
}
```

- `grammar` is an array.  `grammarIndex` in `exercise.json` picks which one.
- `vocab` can include particles (`은`, `이`, `도`) – the LLM prompt should guide the LLM on whether to use them as exercise targets vs. just as context words.

---

## Types of exercises

### 1. LLM-powered exercises

Need: `exercise.json` with `lessonId` + `promptFile`, plus a `prompt.md`.

The LLM generates fresh exercises every time.  The frontend calls `/api/generate` and renders the JSON.

Examples: `L1-narration`, `L2-form-changes`.

### 2. Static exercises

Need: `exercise.json` with just `name` (no `promptFile`, no `lessonId`).

No LLM call.  The frontend is entirely self-contained.  It can load static data from its own folder or be hardcoded.

Example: `L1-fill-in-country`.

### 3. Future: hybrid?

Nothing prevents an exercise from doing both – static scaffolding with some LLM-generated content.  The `promptFile` presence/absence is the only discriminator; `app.js` can fetch from any endpoint it wants.

---

## Adding a new exercise – checklist

- [ ] Create a folder: `exercises/L<N>-<slug>/` (the `L<N>-` prefix is a convention, not enforced)
- [ ] Add `exercise.json` with `name`, `description?`, `lessonId?`, `grammarIndex?`, `promptFile?`
- [ ] Add `index.html` (minimal – a `<body>` with the right element IDs)
- [ ] Add `app.js` (the `fetch` → `render` loop)
- [ ] Add `styles.css` (exercise-specific styles; the main page has its own inline styles)
- [ ] If LLM-powered: add `prompt.md` using the standard placeholders
- [ ] Restart `node server.js`
- [ ] Open `http://localhost:3000` – the exercise appears automatically

---

## Consistency checklist

When creating a new exercise, match the existing ones on these points:

| Thing                      | Convention |
|----------------------------|------------|
| Folder name                | `L<N>-<description>` (e.g. `L3-particle-practice`) |
| Config keys                | `name`, `description`, `lessonId`, `grammarIndex`, `promptFile` – no extras unless needed |
| Prompt file                | `prompt.md` unless there's a good reason for a different name |
| Prompt placeholder syntax  | `{grammarPattern}`, `{vocabList}`, etc. – same keys as the template engine |
| Prompt output schema root  | `{ "sections": [ … ], "vocab": [ … ] }` – `sections` holds exercise blocks, `vocab` is the word list |
| Exercise item shape        | `{ "prompt": "…", "answer": "…" }` |
| Error handling in app.js   | Check `res.ok`, show `data.error` + optionally `data.raw` |
| Check / Reveal buttons     | `btn-check` + `btn-reveal` classes, `check()` + `reveal()` functions |
| Answer comparison          | `trim().replace(/\s+/g, " ")` to normalize whitespace |
| Button ID                  | `generate-btn` |
| Count input ID             | `count` (type=number, min 1, max 10) |
| Loading element ID         | `loading` |
| Error element ID           | `error` |
| Results element ID         | `results` |

---

## Freedom to experiment

These conventions are *what currently exists*, not a straitjacket.  The architecture is intentionally loose:

- **A prompt can define any JSON shape.**  If a new exercise needs a `story` key or a `matching` key instead of `sections`, that's fine.  `generator.js` doesn't care.  The prompt *is* the schema.
- **A frontend can render anything.**  Tabs, accordions, drag-and-drop, multiple choice – whatever the HTML/CSS/JS can do.  No shared component library to fight.
- **Hybrid exercises are possible.**  An exercise could mix static data with LLM-generated content.  The `promptFile`/`lessonId` fields in `exercise.json` are only used by the `POST /api/generate/:slug` route; your `app.js` can call any endpoint.
- **Lesson data can grow.**  Add a `lesson-8.json` in `data/` and it's automatically picked up for cumulative vocab.  Add new fields to lesson JSON (`kanji`, `audio`, `notes`) – existing exercises ignore them.
- **The generator can be swapped.**  `generator.js` is one file with one public function.  Change the model, provider, or temperature there.  Every exercise benefits.
