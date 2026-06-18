/**
 * Quick demo: generates Lesson 1 fill-in-the-blank exercises using DeepSeek.
 *
 * Usage:
 *   1. cp .env.example .env   (then add your DEEPSEEK_API_KEY)
 *   2. npm install
 *   3. npm run demo
 */

import "dotenv/config";
import { generateExercises, lesson1 } from "klear-core";

async function main() {
  console.log("📚 Korean LLM Exercise Generator — Demo\n");
  console.log(`Lesson: ${lesson1.titleEn} (${lesson1.titleKr})`);
  console.log("Generating 5 fill-in-the-blank exercises for G1.1 (N1은/는 N2이에요/예요)...\n");

  const set = await generateExercises({
    lesson: lesson1,
    grammarId: "G1.1",
    vocab: ["학생", "선생님", "대학생", "한국 사람", "미국 사람", "중국 사람", "저", "이름"],
    count: 5,
  });

  console.log(`✅ Generated ${set.exercises.length} exercises at ${set.generatedAt}\n`);

  for (const ex of set.exercises) {
    console.log(`─── ${ex.id} ───`);
    console.log(`Prompt: ${ex.prompt}`);
    console.log(`Answer: ${ex.answer}`);
    console.log(`Hint:   ${ex.hint ?? "(none)"}`);
    console.log(`Vocab:  ${ex.vocab.join(", ")}`);
    console.log();
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
