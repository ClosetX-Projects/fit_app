import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Configuração central do Genkit com Google Gemini.
 * Utilizamos a chave de API fornecida e o modelo gemini-2.5-flash para máxima performance e suporte a esquemas Zod.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: 'AIzaSyBGRjP3-3MSJaVmmtDRPCGmiMV_RMFpLCc',
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
