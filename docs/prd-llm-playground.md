# PRD: Korean LLM Exercise Playground

## Problem Statement

A Korean language instructor needs to build and iterate on LLM-powered exercise generators that follow the KLEAR textbook. Each lesson introduces new vocabulary and grammar points, and exercises must only use words the student has learned up to that lesson. The instructor needs a fast feedback loop — tweak a prompt, generate exercises, judge the output, repeat — without fighting infrastructure. Eventually, the best prompts and exercise-generation logic will be ported to a production website, so the generator core must have no coupling to any frontend framework or HTTP layer.

## Solution

A zero-dependency Node.js playground with two cleanly separated halves. A pure JavaScript module (`generator.js`) takes structured lesson data (vocab, grammar, examples), builds a cumulative vocabulary context, calls the DeepSeek LLM with a prompt template, and returns typed exercise objects. A thin HTTP server wraps this module and serves a single-page HTML/CSS/JS frontend. The frontend lets the instructor pick a lesson, pick an exercise type, click Generate, and see results immediately. When an exercise type is proven solid across enough runs, its prompt file is considered "promoted" and ready for porting.

## User Stories

1. As an instructor, I want to select a lesson (1–7) from a main menu, so that I can focus on exercises for a specific point in the curriculum.

2. As an instructor, I want to see what exercise types are available for the selected lesson, so that I know what I can generate.

3. As an instructor, I want to click a "Generate" button and get exercises back within seconds, so that I can iterate quickly on prompts.

4. As an instructor, I want the LLM to only use vocabulary from lessons the student has completed up to that point, so that exercises are level-appropriate.

5. As an instructor, I want each exercise to target a specific grammar point from the lesson, so that exercises are pedagogically focused.

6. As an instructor, I want to see the raw LLM response when something goes wrong, so that I can debug the prompt.

7. As an instructor, I want prompt files to live as standalone text files organized by lesson, so that I can open them in any editor, tweak them, and have the change take effect on the next generation.

8. As an instructor, I want to add new exercise types or variants by creating a new prompt file, so that expanding the playground requires no code changes.

9. As an instructor, I want the generator module to have no knowledge of HTTP or any frontend framework, so that I can drop it into a production website later with zero refactoring.

10. As an instructor, I want to add new lesson data by creating a new JSON file, so that expanding to later lessons is purely a data entry task.

11. As an instructor, I want vocabulary to accumulate automatically across lessons (Lesson 3 exercises get vocab from Lessons 1, 2, and 3), so that I never rebuild cumulative data manually.

12. As an instructor, I want the entire project to run with a single `node server.js` command and zero `npm install`, so that there is no setup friction.

## Implementation Decisions

### Architecture

- **Generator module is pure.** Zero HTTP awareness. It takes structured input (lesson data, grammar ID, vocab list) and returns exercise objects. This is the portable artifact — everything else is playground scaffolding.
- **Thin server wrapper.** A Node.js built-in `http` module server serves static files from `public/` and handles `POST /generate`. This server is disposable — it exists only for the playground.
- **Zero npm dependencies.** Node built-ins (`fs`, `http`, `https`, `path`) cover all needs. No `dotenv`, no Express, no build tooling.

### Data Model

**Lesson data (JSON):**

Minimal structure — only the fields the LLM needs for exercise generation.

```json
{
  "id": 1,
  "title": "Greetings / 인사",
  "vocab": [
    { "korean": "학생", "english": "student", "pos": "noun" },
    { "korean": "선생님", "english": "teacher", "pos": "noun" }
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

- `vocab` and `grammar` are arrays; later lessons can add `characters` and `conversations` fields when continuity becomes important.
- Cumulative vocabulary is built at runtime by loading all lesson files 1..N and concatenating `vocab` arrays (deduplicated by `korean` string).

**Exercise output:**

```json
{
  "id": "G1.1-fb-1",
  "type": "fill-in-the-blank",
  "prompt": "저는 ___이에요.",
  "answer": "학생",
  "hint": "Use N이에요/예요 pattern",
  "grammar": "G1.1",
  "vocab": ["학생"]
}
```

- Flat objects, no metadata envelope. The instructor judges quality by eye.
- The `type` field matches the exercise category directory/name (e.g., `fill-in-the-blank`).

**Prompt files:**

- Standalone `.md` files containing the full system/user prompt with template variables.
- Organized by lesson: `prompts/lesson-1/fill-blank-g11.md`
- Multiple variants per exercise type supported by naming convention (e.g., `fill-blank-g11.md`, `fill-blank-g13.md` for different grammar points).
- Template variables: `{grammarPattern}`, `{grammarDescription}`, `{examples}`, `{vocabList}`, `{count}`.
- The generator reads the prompt file, substitutes variables, and sends to DeepSeek.

### API Contract

**`POST /generate`**

Request:

```json
{
  "lessonId": 1,
  "promptFile": "fill-blank-g11.md",
  "count": 5
}
```

Response (200):

```json
[
  { "id": "G1.1-fb-1", "type": "fill-in-the-blank", "prompt": "...", "answer": "...", "hint": "...", "grammar": "G1.1", "vocab": ["..."] }
]
```

Response (error):

```json
{ "error": "LLM returned invalid JSON", "raw": "..." }
```

- The server determines grammar point and vocab from `lessonId`; the client only sends which lesson and which prompt file to use.
- `count` controls how many exercises to request from the LLM (default 5).

### Module Interface

The `generator.js` module exports:

```js
async function generateExercises({ lesson, grammarPoint, vocab, promptTemplate, count })
// Returns: Exercise[]
```

- `lesson`: a LessonData object
- `grammarPoint`: a GrammarPoint object (selected by grammar ID internally, but the server resolves this)
- `vocab`: VocabularyWord[] (cumulative, pre-built by the server)
- `promptTemplate`: string (the raw prompt file content, variables already substituted, or the module does substitution)
- `count`: number

### File Organization

```
korean-llm-exercises/
├── server.js              # thin HTTP server + static file serving
├── generator.js            # pure module: generateExercises()
├── prompts/                # prompt templates, organized by lesson
│   └── lesson-1/
│       └── fill-blank-g11.md
├── data/                   # lesson data files
│   └── lesson-1.json
├── public/                 # playground frontend
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── .env                    # DEEPSEEK_API_KEY (gitignored)
└── .gitignore
```

### Frontend Behavior

- Single-page layout: lesson selector (tabs or buttons for 1–7) at top, exercise type buttons below, results area filling the rest.
- Clicking a lesson loads its available prompt files and shows them as exercise type buttons.
- Clicking an exercise type shows a "Generate" button and an optional count input.
- Clicking "Generate" shows a loading state (spinner or text), then renders exercise cards when the response arrives.
- Error responses display the raw LLM output beneath an error message for prompt debugging.
- No persistence, no user accounts, no state beyond what's in the DOM.

### LLM Integration

- Provider: DeepSeek API (`api.deepseek.com`)
- Model: `deepseek-chat`
- API key read from `.env` file at server startup via manual file parsing (no `dotenv` dependency)
- Request sent with `response_format: { type: "json_object" }` to encourage valid JSON output
- Error handling: if the response is not parseable JSON, surface the raw text to the frontend

## Testing Decisions

- **Seam:** The `generateExercises()` module function. Input: structured lesson data, grammar point, vocab list, prompt template, count. Output: exercise objects.
- **What makes a good test:** Structural validation, not correctness. Assert the output is an array, each element has required fields (`id`, `type`, `prompt`, `answer`), vocab in exercises is a subset of provided vocab, no hallucinated grammar points.
- **Form:** A single `test.js` smoke script that runs the generator for each lesson's grammar points and prints pass/fail. No test framework, no assertions library. This is optional — the playground UI itself is the primary validation tool.
- **Non-deterministic output:** The LLM call cannot be meaningfully asserted for correctness. The smoke script validates structure, not pedagogy.

## Out of Scope

- Multiple exercise types beyond fill-in-the-blank (sentence scramble, matching, etc.)
- Character continuity across exercises (Michael, Sophia, Steve stories)
- Learner personalization / seed system (learner name, year, nationality)
- Streaming / SSE for exercise generation
- Persistence or database
- Authentication
- Formal test suite
- Build tooling, TypeScript, bundlers
- Docker or deployment configuration
- Cost tracking or usage analytics

## Further Notes

- This is a **prompt-engineering playground**, not a student-facing product. The UI exists to accelerate the instructor's iteration cycle.
- The KLEAR textbook's Lesson 1 introduces characters Michael, Sophia, and Steve. Their data exists in `data_examples/` and can be added to lesson JSON files later when the instructor wants to test character-continuity exercises.
- All reference data in `data_examples/` should be treated as source material for building `data/` JSON files — it is not consumed by the generator directly.
