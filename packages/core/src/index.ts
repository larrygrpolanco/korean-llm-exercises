import type { ExerciseSet, FillBlankExercise, GenerateOptions } from "./types.js";
import { getDeepSeekClient } from "./llm/deepseek.js";
import { generateFillBlank } from "./prompts/fill-blank.js";

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate exercises for a given lesson and grammar point.
 * Returns a typed ExerciseSet that any frontend can consume.
 *
 * @example
 * ```ts
 * import { generateExercises, lesson1 } from "klear-core";
 *
 * const set = await generateExercises({
 *   lesson: lesson1,
 *   grammarId: "G1.1",
 *   vocab: ["학생", "선생님", "한국 사람"],
 *   count: 5,
 * });
 * console.log(set.exercises);
 * ```
 */
export async function generateExercises(
  options: GenerateOptions
): Promise<ExerciseSet> {
  const grammar = options.lesson.grammar.find((g) => g.id === options.grammarId);
  if (!grammar) {
    throw new Error(
      `Grammar point "${options.grammarId}" not found in lesson ${options.lesson.id}.`
    );
  }

  const client = getDeepSeekClient();

  const exercises: FillBlankExercise[] = await generateFillBlank(client, options);

  return {
    lessonId: options.lesson.id,
    grammarId: options.grammarId,
    exercises,
    generatedAt: new Date().toISOString(),
  };
}

// ── Re-exports ─────────────────────────────────────────────────────────────

export { lesson1 } from "./content/lesson-1.js";
export { createDeepSeekClient, getDeepSeekClient } from "./llm/deepseek.js";
export * from "./types.js";
