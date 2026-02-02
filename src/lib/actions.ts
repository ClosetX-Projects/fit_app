'use server';

import { personalizedGoalRecommendations, type PersonalizedGoalRecommendationsInput } from '@/ai/flows/personalized-goal-recommendations';

export async function getAIGoalRecommendations(data: PersonalizedGoalRecommendationsInput) {
  try {
    const result = await personalizedGoalRecommendations(data);
    return { success: true, goals: result.goalSuggestions };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to generate recommendations. Please check your API key and try again.' };
  }
}
