# Issues: Korean LLM Exercise Playground

Parent PRD: [prd-llm-playground.md](../prd-llm-playground.md)

## Dependency Graph

```
#1 (Scaffold + Lesson Selector)
 └─► #2 (Generator Core + First Exercise)
      ├─► #3 (Multi-Lesson + Exercise Discovery)
      └─► #4 (Error Handling + Polish)
```

# 3 and #4 are independent of each other and can be grabbed in parallel after #2 completes.

## Summary

| # | Title | User Stories | Status |
|---|-------|-------------|--------|
| 1 | Project Scaffold + Lesson Selector | 1, 10, 12 | ⬜ Todo |
| 2 | Generator Core + First Exercise | 2, 3, 4, 5, 7, 9, 11 | ⬜ Todo |
| 3 | Multi-Lesson Data + Exercise Type Discovery | 2, 8, 10 | ⬜ Todo |
| 4 | Error Handling + Polish | 3, 6 | ⬜ Todo |
