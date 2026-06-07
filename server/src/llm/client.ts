import fs from 'fs';
import path from 'path';
import { Ollama } from 'ollama';

import { env } from '../config/env';

const ollamaClient = new Ollama({ host: env.OLLAMA_HOST });

const plannerSystemPrompt = fs.readFileSync(
  path.join(__dirname, 'prompts', 'planner-system.txt'),
  'utf8',
);

export type LlmChatRole = 'system' | 'user' | 'assistant';

export type LlmChatMessage = {
  role: LlmChatRole;
  content: string;
};

type ChatOptions = {
  messages: LlmChatMessage[];
  model: string;
  formatJson: boolean;
};

export const llmClient = {
  plannerSystemPrompt,

  async chat({ messages, model, formatJson }: ChatOptions): Promise<string> {
    const response = await ollamaClient.chat({
      model,
      messages,
      options: { temperature: 0.2 },
      format: formatJson ? 'json' : undefined,
    });

    const content = response.message.content.trim();
    if (content.length === 0) {
      throw new Error('Ollama returned an empty response');
    }

    return content;
  },
};
