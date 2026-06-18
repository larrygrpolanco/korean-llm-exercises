import type { Lesson } from "../types.js";

export const lesson1: Lesson = {
  id: 1,
  titleEn: "Greetings",
  titleKr: "인사",

  grammar: [
    {
      id: "G1.1",
      pattern: "N1은/는 N2이에요/예요",
      description:
        "Equational expression: 'N1 is N2.' Use 은 after consonant-ending nouns, 는 after vowel-ending nouns. With copula: 이에요 after consonants, 예요 after vowels.",
      examples: [
        { korean: "저는 학생이에요.", english: "I am a student." },
        { korean: "마이클은 대학생이에요.", english: "Michael is a college student." },
        { korean: "저는 김유미예요.", english: "I am Yumi Kim." },
      ],
    },
    {
      id: "G1.2",
      pattern: "Omission of redundant elements",
      description:
        "Subjects and topics are often omitted in Korean when they are obvious from context.",
      examples: [
        { korean: "3학년이에요.", english: "[I] am a junior." },
        { korean: "뭐예요?", english: "What is [it/your name]?" },
      ],
    },
    {
      id: "G1.3",
      pattern: "N도 (also/too)",
      description:
        "The particle 도 means 'also' or 'too.' It replaces 은/는 or 이/가 to show parallelism.",
      examples: [
        { korean: "저도 1학년이에요.", english: "I am also a freshman." },
        { korean: "마이클 정도 한국 사람이에요.", english: "Michael Jung is also Korean." },
      ],
    },
    {
      id: "G1.4",
      pattern: "Yes/no questions (rising intonation)",
      description:
        "In Korean, word order stays the same for questions. Only intonation rises at the end.",
      examples: [
        { korean: "한국 사람이에요?", english: "Are you Korean?" },
        { korean: "네, 한국 사람이에요.", english: "Yes, I am Korean." },
      ],
    },
    {
      id: "G1.5",
      pattern: "N1은/는 N2이/가 아니에요",
      description:
        "Negative equational expression: 'N1 is not N2.' Use 이 after consonant-ending nouns, 가 after vowel-ending nouns, followed by 아니에요.",
      examples: [
        { korean: "소피아 왕은 한국 사람이 아니에요.", english: "Sophia Wang is not Korean." },
        { korean: "저는 1학년이 아니에요.", english: "I am not a freshman." },
      ],
    },
  ],

  vocabulary: [
    { korean: "학생", english: "student" },
    { korean: "선생님", english: "teacher" },
    { korean: "대학생", english: "college student" },
    { korean: "1학년", english: "freshman" },
    { korean: "2학년", english: "sophomore" },
    { korean: "3학년", english: "junior" },
    { korean: "4학년", english: "senior" },
    { korean: "한국", english: "Korea" },
    { korean: "미국", english: "the United States" },
    { korean: "중국", english: "China" },
    { korean: "일본", english: "Japan" },
    { korean: "영국", english: "United Kingdom" },
    { korean: "사람", english: "person, people" },
    { korean: "이름", english: "name" },
    { korean: "저", english: "I (humble)" },
    { korean: "한국 사람", english: "Korean (person)" },
    { korean: "미국 사람", english: "American (person)" },
    { korean: "중국 사람", english: "Chinese (person)" },
    { korean: "일본 사람", english: "Japanese (person)" },
    { korean: "영국 사람", english: "British (person)" },
    { korean: "네", english: "yes" },
    { korean: "아니요", english: "no" },
    { korean: "뭐", english: "what" },
  ],
};
