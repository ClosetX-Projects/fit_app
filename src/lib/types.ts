import type { PersonalizedGoalRecommendationsInput } from "@/ai/flows/personalized-goal-recommendations";

export type UserProfile = PersonalizedGoalRecommendationsInput['userData'];
export type BodyComposition = PersonalizedGoalRecommendationsInput['bodyComposition'];
export type BioimpedanceData = PersonalizedGoalRecommendationsInput['bioimpedanceData'];
export type StrengthTests = PersonalizedGoalRecommendationsInput['strengthTestResults'];

export const mockUserData: PersonalizedGoalRecommendationsInput = {
    userData: {
        name: 'Alex Doe',
        age: 30,
        gender: 'Male',
        weight: 85,
        height: 180,
        email: 'alex.doe@example.com',
        whatsapp: '+1-202-555-0174'
    },
    bodyComposition: {
        weight: 85,
        height: 180,
        circumferences: {
            chest: 102,
            waist: 85,
            hips: 98,
        },
        skinfolds: {
            triceps: 12,
            subscapular: 15,
        },
    },
    bioimpedanceData: {
        age: 30,
        height: 180,
        gender: 'Male',
        totalBodyWater: 45,
        protein: 15,
        mineralContent: 5,
        bodyFatMass: 18,
    },
    strengthTestResults: {
        vo2max: 42,
        oneRepMaxTest: {
            benchPress: 100,
            squat: 120,
        },
    },
    workoutConsistency: 75,
};
