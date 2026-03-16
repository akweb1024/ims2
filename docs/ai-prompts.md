# AI Prompt Standard

All AI endpoints must prepend the base application prompt for consistency.

Use `buildAIPrompt` from `src/lib/ai/basePrompt.ts` for all LLM prompts:

```ts
import { buildAIPrompt } from '@/lib/ai/basePrompt';

const prompt = buildAIPrompt(`
  Your task-specific instructions here.
`);
```

Do not inline the base prompt directly in routes. This keeps future endpoints consistent and easy to update.
