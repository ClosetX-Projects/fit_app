
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Configuração central do Genkit com Google Gemini.
 * A API Key é lida automaticamente do ambiente (GOOGLE_GENAI_API_KEY).
 */
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});
