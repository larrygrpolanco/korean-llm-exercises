import type { FillBlankExercise, GenerateOptions, GrammarPoint, LlmClient } from "../types.js";

// ── Prompt template ────────────────────────────────────────────────────────

function buildSystemPrompt(grammar: GrammarPoint): string {
  return `You are an expert Korean language exercise generator. You create exercises based on the KLEAR (Korean Language Education and Research) textbook.

You are generating FILL-IN-THE-BLANK exercises for the following grammar point:

PATTERN: ${grammar.pattern}
DESCRIPTION: ${grammar.description}

Rules for creating exercises:
1. Create a short, natural Korean dialogue or sentence with ONE blank (marked as ___).
2. The blank should test the grammar pattern above.
3. The correct answer must be a Korean word or phrase that fills the blank.
4. Include a brief hint in English about which grammar pattern to use.
5. Vary the contexts — some statements, some questions, some negative sentences if the grammar allows.
6. Use ONLY the vocabulary words provided.
7. Every exercise must use the grammar pattern ${grammar.pattern}.

Output as a JSON object with a single key "exercises" containing an array of objects, each with:
- "prompt": the Korean sentence with ___ for the blank
- "answer": the correct Korean word/phrase for the blank
- "hint": a short English hint about the grammar
- "vocab": array of Korean vocabulary words used in this exercise`;
}

function buildUserPrompt(options: GenerateOptions): string {
  const grammar = options.lesson.grammar.find((g) => g.id === options.grammarId);
  if (!grammar) {
    throw new Error(`Grammar point "${options.grammarId}" not found in lesson ${options.lesson.id}.`);
  }

  const vocab = options.vocab
    ? options.lesson.vocabulary.filter((v) => options.vocab!.includes(v.korean))
    : options.lesson.vocabulary;

  const vocabList = vocab.map((v) => `${v.korean} (${v.english})`).join(", ");

  const exampleSentences = grammar.examples
    .map((e) => `${e.korean} = ${e.english}`)
    .join("\n");

  return `Grammar: ${grammar.pattern}
Description: ${grammar.description}

Example sentences:
${exampleSentences}

Vocabulary to use (stick to these words):
${vocabList}

Generate ${options.count ?? 5} fill-in-the-blank exercises.`;
}

// ── JSON parsing (handles markdown code fences) ────────────────────────────

function parseExerciseJson(raw: string): { exercises: FillBlankExercise[] } {
  // Strip markdown code fences if present
  let json = raw.trim();
  if (json.startsWith("```")) {
    json = json.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  try {
    const parsed = JSON.parse(json);
    return parsed;
  } catch {
    throw new Error(
      `Failed to parse LLM response as JSON. Raw response:\n${raw.slice(0, 500)}`
    );
  }
}

// ── Generator ──────────────────────────────────────────────────────────────

export async function generateFillBlank(
  client: LlmClient,
  options: GenerateOptions
): Promise<FillBlankExercise[]> {
  const grammar = options.lesson.grammar.find((g) => g.id === options.grammarId);
  if (!grammar) {
    throw new Error(`Grammar "${options.grammarId}" not found in lesson ${options.lesson.id}.`);
  }

  const count = options.count ?? 5;

  const systemPrompt = buildSystemPrompt(grammar);
  const userPrompt = buildUserPrompt(options);

  const raw = await client.chat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  const parsed = parseExerciseJson(raw);

  if (!Array.isArray(parsed.exercises)) {
    throw new Error("LLM response missing 'exercises' array.");
  }

  // Tag each exercise with metadata
  const vocabWords = (options.vocab ?? options.lesson.vocabulary.map((v) => v.korean));

  return parsed.exercises.slice(0, count).map((ex, i) => ({
    id: `${options.grammarId}-fb-${i + 1}`,
    type: "fill-in-the-blank" as const,
    prompt: ex.prompt,
    answer: ex.answer,
    hint: ex.hint,
    grammar: options.grammarId,
    vocab: ex.vocab ?? vocabWords,
  }));
}
