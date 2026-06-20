# Korean LLM Exercise Playground

A zero-dependency Node.js playground for building and iterating on LLM-powered Korean language exercises following the KLEAR textbook. Designed for prompt engineering — tweak a prompt, generate exercises, judge the output, repeat. No infrastructure friction.

## Quick Start

```bash
# 1. Set your DeepSeek API key
cp .env.example .env
# Edit .env: DEEPSEEK_API_KEY=sk-...

# 2. Start the server
node server.js

# 3. Open http://localhost:3000
```

**Zero dependencies.** Uses only Node.js built-ins (`http`, `fs`, `path`, `https`). No `npm install`, no build tools, no frameworks.

## How It Works

```
┌──────────────────┐     ┌──────────────┐     ┌──────────────┐
│  exercises/      │────▶│  server.js   │────▶│ generator.js │────▶ DeepSeek API
│  (self-contained │     │  (thin HTTP  │     │  (single     │
│   HTML/CSS/JS +  │     │   router)    │     │   function)  │
│   prompt.md)     │     └──────────────┘     └──────────────┘
└──────────────────┘            │
                                ▼
                         ┌──────────────┐
                         │  data/       │
                         │  (lesson     │
                         │   JSON)      │
                         └──────────────┘
```

1. **Main page** lists available exercises, auto-discovered from the `exercises/` directory
2. **Click an exercise** to open it — each is a self-contained folder with its own UI and prompt
3. **Click Generate** — the server loads the exercise's config, lesson data, cumulative vocabulary, and prompt template, then calls the DeepSeek LLM
4. **See results** — the exercise renders the response however it wants

## Project Structure

```
├── server.js              # Thin HTTP router + static file serving
├── generator.js            # One function: generate()
├── data/                   # Lesson data (vocab + grammar)
│   ├── lesson-1.json       # Greetings / 인사
│   ├── lesson-2.json       # Korean Language Class / 한국어 수업
│   ├── lesson-3.json       # The University Campus / 대학 캠퍼스
│   ├── lesson-4.json       # At Home / 집
│   ├── lesson-5.json       # At the Bookstore / 서점에서
│   ├── lesson-6.json       # My Day / 나의 하루
│   └── lesson-7.json       # The Weekend / 주말
├── exercises/              # Self-contained exercise modules
│   ├── narration/          # Story + fill-in-the-blank (Lesson 1)
│   │   ├── exercise.json   # Config: name, lessonId, grammarIndex, promptFile
│   │   ├── index.html
│   │   ├── app.js
│   │   ├── styles.css
│   │   └── prompt.md       # LLM prompt template
│   ├── form-changes/       # Dictionary ↔ polite form (Lesson 2)
│   │   └── ...
│   └── fill-in-country/    # Static exercise — no LLM needed
│       └── ...
├── public/                 # Main page (exercise selector)
│   └── index.html
├── data_examples/          # Reference data from KLEAR textbook
└── .env.example
```

## Exercise Modules

Each folder in `exercises/` is a self-contained module. It contains everything needed to run that exercise — HTML, CSS, JS, and (for LLM-powered ones) a prompt template.

### `exercise.json`

Every exercise folder has an `exercise.json` that tells the server how to generate exercises:

```json
{
  "name": "Narration Exercise",
  "description": "LLM generates a story, then creates 3 sections of fill-in-the-blank exercises.",
  "lessonId": 1,
  "grammarIndex": 0,
  "promptFile": "prompt.md"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Display name on the main page |
| `description` | No | Short description on the main page |
| `lessonId` | Only for LLM exercises | Which lesson's vocab/grammar to use |
| `grammarIndex` | No (default: 0) | Which grammar point in the lesson |
| `promptFile` | Only for LLM exercises | Path to the prompt template (relative to the exercise folder) |

**Static exercises** (like `fill-in-country`) omit `promptFile` and `lessonId` — they don't call the LLM at all.

### Adding a new exercise

1. Create a folder in `exercises/`
2. Add an `exercise.json` with name and (for LLM exercises) `lessonId` + `promptFile`
3. Add `index.html`, `app.js`, `styles.css`
4. For LLM exercises, add a `prompt.md` with `{grammarPattern}`, `{grammarDescription}`, `{examples}`, `{vocabList}`, `{count}` placeholders
5. Restart the server

That's it. The main page discovers it automatically.

## Architecture

### `generator.js` — one function

```js
const { generate } = require('./generator')

const result = await generate({
  promptTemplate,   // raw prompt .md content
  grammarPoint,     // { pattern, description, examples }
  vocab,            // [{ korean, english }] — cumulative
  count             // number (1–10, default 5)
})
// Returns: whatever JSON the LLM emits
```

- Calls DeepSeek API (`deepseek-chat`) with `response_format: { type: "json_object" }`
- No field validation — the prompt defines the output schema, the exercise renders it
- Full raw response surfaced on parse errors for prompt debugging

### `server.js` — thin router

Two API routes plus static file serving:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/exercises` | List all exercises with metadata |
| `POST` | `/api/generate/:slug` | Generate exercises for a given exercise |
| `GET` | `/` | Main exercise selector page |
| `GET` | `/exercises/:slug/` | Exercise index page |
| `GET` | `/exercises/:slug/file.ext` | Exercise static assets |

### Lesson Data (`data/lesson-*.json`)

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
      "description": "Topic-comment equational expression",
      "examples": [
        { "kor": "저는 학생이에요.", "eng": "I am a student." }
      ]
    }
  ]
}
```

### Cumulative Vocabulary

Vocabulary accumulates across lessons. Selecting Lesson 3 gives exercises vocabulary from Lessons 1, 2, and 3 — deduplicated by Korean string.

| Lesson | Vocab in file | Cumulative |
|--------|:-----------:|:----------:|
| 1 | 35 | 35 |
| 2 | 45 | 80 |
| 3 | 45 | 124 |
| 4 | 48 | 171 |
| 5 | 49 | 217 |
| 6 | 50 | 265 |
| 7 | 60 | 322 |

### Prompt Template Variables

Prompt files use `{placeholders}` substituted at runtime:

- `{grammarPattern}` — the grammar pattern (e.g. "N1은/는 N2이에요/예요")
- `{grammarDescription}` — the grammar description
- `{examples}` — example sentences (formatted as bullet list)
- `{vocabList}` — cumulative vocabulary (formatted as `word (translation), ...`)
- `{count}` — number of exercises requested

## Features

- **7 complete lessons** with vocabulary and grammar from the KLEAR textbook
- **Self-contained exercises** — each folder owns its UI, prompt, and config
- **Auto-discovery** — drop a new folder into `exercises/` and it appears on the main page
- **Cumulative vocabulary** — exercises only use words the student has learned
- **Error resilience** — invalid LLM JSON shows raw response for prompt debugging
- **Static and LLM exercises** — some exercises don't need the LLM at all
- **Count control** — request 1–10 exercises per generation

## Design Decisions

- **Zero npm dependencies.** Node built-ins only.
- **Generator is a single function.** No field validation — the prompt defines the schema.
- **Each exercise is an island.** No shared assets, no coupling between exercises.
- **Prompts live with their exercise.** No separate `prompts/` directory.
- **Frontend is vanilla.** HTML, CSS, JS. No frameworks, no build tools.
- **Lesson data is flat JSON.** Add new lessons by creating a new file.

## Out of Scope

This is a **prompt-engineering playground**, not a student-facing product.

- No persistence, authentication, or database
- No streaming / SSE
- No learner personalization
- No formal test suite

## License

MIT
