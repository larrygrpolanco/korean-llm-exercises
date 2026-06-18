// ── Content types ──────────────────────────────────────────────────────────

export interface VocabularyWord {
  korean: string;
  english: string;
  pos?: string;
}

export interface GrammarExample {
  korean: string;
  english: string;
}

export interface GrammarPoint {
  id: string;
  pattern: string;
  description: string;
  examples: GrammarExample[];
}

export interface Lesson {
  id: number;
  titleEn: string;
  titleKr: string;
  grammar: GrammarPoint[];
  vocabulary: VocabularyWord[];
}

// ── Exercise output types (frontend-agnostic JSON) ─────────────────────────

export type ExerciseType = "fill-in-the-blank";

export interface FillBlankExercise {
  id: string;
  type: "fill-in-the-blank";
  prompt: string;
  answer: string;
  hint?: string;
  grammar: string;
  vocab: string[];
}

export type Exercise = FillBlankExercise; // union grows with more types

// ── Generation options ─────────────────────────────────────────────────────

export interface GenerateOptions {
  lesson: Lesson;
  grammarId: string;
  vocab?: string[];      // limit vocabulary; omit to use all lesson vocab
  count?: number;        // default 5
}

export interface ExerciseSet {
  lessonId: number;
  grammarId: string;
  exercises: Exercise[];
  generatedAt: string;
}

// ── LLM provider interface (pluggable) ─────────────────────────────────────

export interface LlmClient {
  chat(messages: { role: "system" | "user"; content: string }[]): Promise<string>;
}
