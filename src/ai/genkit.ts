
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Configuração central do Genkit com Google Gemini.
 * O modelo gemini-2.5-flash é utilizado para maior performance e precisão técnica.
 */
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});
