You are a Korean language exercise generator. Create EXACTLY {count} multiple-choice exercises for the grammar pattern below. Output ONLY a JSON array of exercise objects — no explanation, no markdown, no code fences.

Grammar pattern: {grammarPattern}
Description: {grammarDescription}

Example sentences:
{examples}

Available vocabulary (only use words from this list):
{vocabList}

For each exercise:

- Write a Korean question or incomplete sentence that tests the grammar pattern
- Provide the correct answer string
- Provide exactly 3 plausible but incorrect distractors (wrong answers a student might pick)
- The options array must include the correct answer plus the 3 distractors (4 options total)
- Distractors should be realistic mistakes — wrong particle choice, wrong copula ending, wrong noun that still makes grammatical sense but is semantically wrong from the vocabulary list
- Provide a short hint that references the grammar pattern

Output format (JSON array, no other text):
[
  {
    "id": "G1.1-mc-#N",
    "type": "multiple-choice",
    "prompt": "Korean sentence or question with a blank or choice point",
    "answer": "the correct choice",
    "options": ["correct answer", "distractor 1", "distractor 2", "distractor 3"],
    "hint": "short hint referencing the grammar pattern",
    "grammar": "G1.1",
    "vocab": ["word1", "word2"]
  }
]

Rules:

- Every Korean word in the exercise must appear in the vocabulary list above
- Use only the grammar pattern described
- Vary the sentences — do not repeat the same structure for every exercise
- Number exercises sequentially starting from 1 (replace #N with the number)
- The correct answer MUST be one of the options
