# korean-llm-exercises

LLM-powered Korean exercise generator using the **KLEAR** textbook.  
Frontend-agnostic — produces typed JSON that any website, app, or CLI can consume.

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Add your DeepSeek API key
cp .env.example .env
# Edit .env → paste your key from https://platform.deepseek.com

# 3. Run the demo
npm run demo
```

You should see 5 fill-in-the-blank exercises for Lesson 1 grammar point G1.1.

## Project structure

```
korean-llm-exercises/
├── packages/
│   └── core/                   # The engine library
│       └── src/
│           ├── types.ts        # All TypeScript interfaces
│           ├── index.ts        # Public API (generateExercises)
│           ├── content/
│           │   └── lesson-1.ts # Lesson 1: vocab, grammar, examples
│           ├── llm/
│           │   └── deepseek.ts # DeepSeek LLM adapter
│           └── prompts/
│               └── fill-blank.ts   # Fill-in-the-blank prompt + generator
├── scripts/
│   └── demo.ts                 # Quick demo script
├── data_examples/              # Reference data from past projects
├── tsconfig.base.json          # Shared TS config
└── package.json                # Monorepo root (npm workspaces)
```

## Using the library

```ts
import { generateExercises, lesson1 } from "klear-core";

const set = await generateExercises({
  lesson: lesson1,          // lesson data
  grammarId: "G1.1",       // which grammar point
  vocab: ["학생", "선생님"], // optional: limit vocabulary
  count: 5,                 // how many exercises
});

// set.exercises is typed Exercise[]
// → [ { id, type, prompt, answer, hint, grammar, vocab }, ... ]
```

## Exercise output format

Every exercise is a plain JSON object:

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

No UI assumptions. Render it however you want: React, Vue, a CLI, flashcards, etc.

## Adding more lesson data

Edit or add files in `packages/core/src/content/`.  
They follow the `Lesson` interface:

```ts
interface Lesson {
  id: number;
  titleEn: string;
  titleKr: string;
  grammar: GrammarPoint[];    // pattern, description, examples
  vocabulary: VocabularyWord[]; // korean, english
}
```

## Adding new exercise types

1. Add the type to `types.ts` (`ExerciseType`, plus the new interface)
2. Create a prompt file in `packages/core/src/prompts/`
3. Wire it into `index.ts`

## License

MIT — see [LICENSE](./LICENSE)
