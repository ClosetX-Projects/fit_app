
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Configuração central do Genkit com Google Gemini.
 * Utilizamos a chave de API fornecida e o modelo gemini-2.0-flash para máxima performance.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: 'AIzaSyB9ZsTFzikqIJ3EZ5ET3c77sMkxaAl38VI',
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
