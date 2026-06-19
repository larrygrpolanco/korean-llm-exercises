# Korean LLM Exercise Playground

A zero-dependency Node.js playground for building and iterating on LLM-powered Korean language exercises following the KLEAR textbook. Designed for a Korean language instructor's prompt-engineering feedback loop — tweak a prompt, generate exercises, judge the output, repeat. No infrastructure friction.

## Quick Start

```bash
# 1. Set your DeepSeek API key
cp .env.example .env
# Edit .env and add your key: DEEPSEEK_API_KEY=sk-...

# 2. Start the server (no npm install required)
node server.js

# 3. Open http://localhost:3000
```

**Zero dependencies.** The project uses only Node.js built-in modules (`http`, `fs`, `path`, `https`). No `npm install`, no build tools, no frameworks.

## How It Works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  public/     │────▶│  server.js   │────▶│ generator.js │────▶ DeepSeek API
│  (vanilla    │     │  (thin HTTP  │     │  (pure       │
│  HTML/CSS/JS)│     │   wrapper)   │     │   module)    │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                     │
                            ▼                     ▼
                     ┌──────────────┐     ┌──────────────┐
                     │  data/       │     │  prompts/    │
                     │  (lesson     │     │  (prompt     │
                     │   JSON)      │     │   templates) │
                     └──────────────┘     └──────────────┘
```

1. **Pick a lesson** (1–7) — tabs load dynamically from `data/lesson-*.json`
2. **Pick an exercise type** — buttons auto-discovered from `prompts/lesson-N/*.md`
3. **Click Generate** — cumulative vocabulary is built, prompt template is filled, DeepSeek LLM is called
4. **See results** — exercise cards render with prompt, answer, hint, and grammar tags

## Project Structure

```
├── server.js              # Thin HTTP server + static file serving
├── generator.js            # Pure module: generateExercises()
├── prompts/                # Prompt templates, organized by lesson
│   └── lesson-1/
│       └── fill-blank-g11.md
├── data/                   # Lesson data (vocab + grammar)
│   ├── lesson-1.json       # Greetings / 인사
│   ├── lesson-2.json       # Korean Language Class / 한국어 수업
│   ├── lesson-3.json       # The University Campus / 대학 캠퍼스
│   ├── lesson-4.json       # Weekend Activities / 주말 활동
│   ├── lesson-5.json       # At the Restaurant / 식당에서
│   ├── lesson-6.json       # Shopping / 쇼핑
│   └── lesson-7.json       # Daily Routine / 일상생활
├── public/                 # Playground frontend
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── data_examples/          # Reference data from KLEAR textbook
├── docs/                   # PRD and issue specs
│   ├── prd-llm-playground.md
│   └── issues-llm-playground/
└── .env.example            # API key template
```

## Architecture

### Generator Module (`generator.js`)

A **pure JavaScript module** with zero HTTP server awareness — designed to be portable to a production website later with no refactoring.

```js
const { generateExercises } = require('./generator')

const exercises = await generateExercises({
  lesson,           // LessonData object
  grammarPoint,     // GrammarPoint object
  vocab,            // VocabWord[] (cumulative)
  promptTemplate,   // string (raw prompt file content)
  count             // number (1–10, default 5)
})
// Returns: Exercise[]
```

- Calls DeepSeek API (`deepseek-chat` model) with `response_format: { type: "json_object" }`
- No imports from `http` or any HTTP-related module
- Full raw response surfaced on parse errors for prompt debugging

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
      "examples": [{ "kor": "저는 학생이에요.", "eng": "I am a student." }]
    }
  ]
}
```

### Cumulative Vocabulary

Vocabulary accumulates automatically. Selecting Lesson 3 gives exercises vocabulary from Lessons 1, 2, and 3 — deduplicated by Korean string. The pipeline:

| Lesson | Vocab in file | Cumulative |
|--------|:-----------:|:----------:|
| 1 | 35 | 35 |
| 2 | 45 | 80 |
| 3 | 45 | 124 |
| 4 | 48 | 171 |
| 5 | 49 | 217 |
| 6 | 50 | 265 |
| 7 | 60 | 322 |

### Prompt Auto-Discovery

Exercise type buttons are auto-discovered at runtime from `prompts/lesson-N/*.md` files. Adding a new `.md` file to `prompts/lesson-3/` makes it appear as a button when Lesson 3 is selected — no code changes, no server restart required.

### Prompt Template Variables

Prompt files use these template variables: `{grammarPattern}`, `{grammarDescription}`, `{examples}`, `{vocabList}`, `{count}`.

## API

### `GET /api/lessons`

Returns available lessons dynamically from `data/` directory.

### `GET /api/prompts?lessonId=1`

Returns prompt files available for a lesson, discovered from `prompts/lesson-{id}/`.

### `POST /api/generate`

```json
{
  "lessonId": 1,
  "promptFile": "fill-blank-g11.md",
  "count": 5
}
```

Returns exercise objects or an error with raw LLM response for debugging.

## Features

- **7 complete lessons** with vocabulary and grammar from the KLEAR textbook
- **Dynamic lesson loading** — add a new `data/lesson-N.json` and it appears automatically
- **Dynamic exercise discovery** — add a prompt `.md` file and it appears as a button at runtime
- **Cumulative vocabulary** — exercises only use words the student has learned up to that point
- **Error resilience** — invalid LLM JSON shows raw response for prompt debugging
- **Count control** — request 1–10 exercises per generation
- **Loading spinners, network error states, empty result handling**

## Design Decisions

- **Zero npm dependencies.** Node built-ins only. Start with `node server.js`.
- **Generator is pure.** No HTTP/server awareness — drop it into production later.
- **Frontend is vanilla.** HTML, CSS, JS. No frameworks, no build tools.
- **Prompt files are standalone `.md`.** Open in any editor, tweak, regenerate.
- **Lesson data is flat JSON.** Add new lessons by creating a new file.

## Out of Scope

This is a **prompt-engineering playground**, not a student-facing product.

- No multiple exercise types beyond fill-in-the-blank
- No character continuity (Michael, Sophia, Steve stories)
- No learner personalization
- No streaming / SSE
- No persistence, authentication, or database
- No formal test suite (the UI itself is the validation tool)

## Future: Porting to Production

When a prompt proves solid across enough runs, it's considered "promoted" and ready for porting. The `generator.js` module is designed to drop directly into a production website — it has no coupling to HTTP, frameworks, or playground scaffolding.

## License

MIT
