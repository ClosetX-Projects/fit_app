/**
 * @fileOverview Tabelas de pontuação e lógica de cálculo para o IAFG (Senior Fitness Test)
 * Referência: Rikli & Jones, 2001, 2008, 2013.
 */

export type SFTResults = {
  chairStandReps: number;
  armCurlReps: number;
  sixMinWalkDist: number;
  chairSitAndReach: number;
  backScratch: number;
  tugTime: number;
};

type ScoreRange = {
  veryWeak: number;
  weak: number;
  regular: number;
  good: number;
};

export function getIAFG(gender: string, age: number, results: SFTResults) {
  const isMale = gender === 'male';
  
  // Determinar faixa etária
  let ageGroup: '60-64' | '65-69' | '70-74' | '75-79' | '80-84' | '85-89' | '90-94' = '60-64';
  if (age >= 90) ageGroup = '90-94';
  else if (age >= 85) ageGroup = '85-89';
  else if (age >= 80) ageGroup = '80-84';
  else if (age >= 75) ageGroup = '75-79';
  else if (age >= 70) ageGroup = '70-74';
  else if (age >= 65) ageGroup = '65-69';

  const calculateScore = (val: number, ranges: ScoreRange, points: [number, number, number, number, number], inverted = false) => {
    if (!inverted) {
      if (val < ranges.veryWeak) return points[0];
      if (val <= ranges.weak) return points[1];
      if (val <= ranges.regular) return points[2];
      if (val <= ranges.good) return points[3];
      return points[4];
    } else {
      // Para TUG (menor tempo é melhor)
      if (val > ranges.veryWeak) return points[0];
      if (val >= ranges.weak) return points[1];
      if (val >= ranges.regular) return points[2];
      if (val >= ranges.good) return points[3];
      return points[4];
    }
  };

  const p125 = [2.5, 5, 7.5, 10, 12.5] as [number, number, number, number, number];
  const p25 = [5, 10, 15, 20, 25] as [number, number, number, number, number];

  // 1. LEVANTAR E SENTAR
  const chairStandRanges: Record<string, Record<string, ScoreRange>> = {
    male: {
      '60-64': { veryWeak: 14, weak: 15, regular: 17, good: 20 },
      '65-69': { veryWeak: 12, weak: 14, regular: 16, good: 19 },
      '70-74': { veryWeak: 12, weak: 13, regular: 16, good: 18 },
      '75-79': { veryWeak: 11, weak: 13, regular: 15, good: 18 },
      '80-84': { veryWeak: 10, weak: 11, regular: 13, good: 16 },
      '85-89': { veryWeak: 8, weak: 10, regular: 12, good: 15 },
      '90-94': { veryWeak: 8, weak: 9, regular: 11, good: 13 },
    },
    female: {
      '60-64': { veryWeak: 13, weak: 15, regular: 17, good: 20 },
      '65-69': { veryWeak: 13, weak: 14, regular: 16, good: 19 },
      '70-74': { veryWeak: 12, weak: 13, regular: 16, good: 18 },
      '75-79': { veryWeak: 11, weak: 13, regular: 15, good: 18 },
      '80-84': { veryWeak: 11, weak: 12, regular: 14, good: 16 },
      '85-89': { veryWeak: 10, weak: 11, regular: 13, good: 15 },
      '90-94': { veryWeak: 9, weak: 10, regular: 12, good: 15 },
    }
  };

  // 2. FLEXÃO DE ANTEBRAÇO
  const armCurlRanges: Record<string, Record<string, ScoreRange>> = {
    male: {
      '60-64': { veryWeak: 16, weak: 18, regular: 20, good: 23 },
      '65-69': { veryWeak: 15, weak: 17, regular: 20, good: 23 },
      '70-74': { veryWeak: 14, weak: 16, regular: 19, good: 22 },
      '75-79': { veryWeak: 13, weak: 15, regular: 17, good: 20 },
      '80-84': { veryWeak: 13, weak: 15, regular: 17, good: 20 },
      '85-89': { veryWeak: 11, weak: 13, regular: 15, good: 17 },
      '90-94': { veryWeak: 10, weak: 11, regular: 13, good: 15 },
    },
    female: {
      '60-64': { veryWeak: 14, weak: 15, regular: 18, good: 21 },
      '65-69': { veryWeak: 12, weak: 14, regular: 17, good: 20 },
      '70-74': { veryWeak: 12, weak: 14, regular: 16, good: 19 },
      '75-79': { veryWeak: 11, weak: 13, regular: 16, good: 18 },
      '80-84': { veryWeak: 10, weak: 11, regular: 14, good: 17 },
      '85-89': { veryWeak: 8, weak: 10, regular: 13, good: 16 },
      '90-94': { veryWeak: 7, weak: 9, regular: 11, good: 14 },
    }
  };

  // 3. CAMINHADA 6 MINUTOS
  const walkRanges: Record<string, Record<string, ScoreRange>> = {
    male: {
      '60-64': { veryWeak: 598, weak: 651, regular: 697, good: 751 },
      '65-69': { veryWeak: 545, weak: 605, regular: 657, good: 718 },
      '70-74': { veryWeak: 527, weak: 586, regular: 638, good: 698 },
      '75-79': { veryWeak: 450, weak: 524, regular: 586, good: 661 },
      '80-84': { veryWeak: 424, weak: 494, regular: 554, good: 625 },
      '85-89': { veryWeak: 359, weak: 442, regular: 512, good: 596 },
      '90-94': { veryWeak: 280, weak: 366, regular: 440, good: 527 },
    },
    female: {
      '60-64': { veryWeak: 533, weak: 582, regular: 624, good: 674 },
      '65-69': { veryWeak: 484, weak: 543, regular: 593, good: 653 },
      '70-74': { veryWeak: 467, weak: 524, regular: 572, good: 630 },
      '75-79': { veryWeak: 414, weak: 480, regular: 538, good: 605 },
      '80-84': { veryWeak: 365, weak: 433, regular: 491, good: 560 },
      '85-89': { veryWeak: 319, weak: 394, regular: 458, good: 534 },
      '90-94': { veryWeak: 252, weak: 326, regular: 388, good: 463 },
    }
  };

  // 4. SENTAR E ALCANÇAR
  const sitReachRanges: Record<string, Record<string, ScoreRange>> = {
    male: {
      '60-64': { veryWeak: -3.4, weak: -0.6, regular: 1.8, good: 4.6 },
      '65-69': { veryWeak: -3.9, weak: -1.1, regular: 1.1, good: 3.9 },
      '70-74': { veryWeak: -3.9, weak: -1.2, regular: 1.1, good: 3.8 },
      '75-79': { veryWeak: -5.0, weak: -2.3, regular: 0.1, good: 2.8 },
      '80-84': { veryWeak: -6.2, weak: -3.2, regular: -0.8, good: 2.2 },
      '85-89': { veryWeak: -5.9, weak: -3.5, regular: -1.3, good: 1.1 },
      '90-94': { veryWeak: -7.2, weak: -4.7, regular: -2.5, good: 0.0 },
    },
    female: {
      '60-64': { veryWeak: -1.3, weak: 1.1, regular: 3.1, good: 5.5 },
      '65-69': { veryWeak: -1.0, weak: 1.1, regular: 2.9, good: 5.0 },
      '70-74': { veryWeak: -1.7, weak: 0.5, regular: 2.3, good: 4.5 },
      '75-79': { veryWeak: -2.0, weak: 0.2, regular: 2.1, good: 4.4 },
      '80-84': { veryWeak: -2.6, weak: -0.4, regular: 1.4, good: 3.6 },
      '85-89': { veryWeak: -3.2, weak: -1.0, regular: 0.8, good: 3.0 },
      '90-94': { veryWeak: -5.1, weak: -2.7, regular: -0.7, good: 1.7 },
    }
  };

  // 5. ALCANÇAR ATRÁS DAS COSTAS
  const backScratchRanges: Record<string, Record<string, ScoreRange>> = {
    male: {
      '60-64': { veryWeak: -7.4, weak: -4.6, regular: -2.2, good: 0.6 },
      '65-69': { veryWeak: -8.2, weak: -5.3, regular: -2.9, good: 0.0 },
      '70-74': { veryWeak: -8.6, weak: -5.7, regular: -3.3, good: -0.4 },
      '75-79': { veryWeak: -9.9, weak: -6.9, regular: -4.3, good: -1.3 },
      '80-84': { veryWeak: -10.5, weak: -7.1, regular: -4.3, good: -1.2 },
      '85-89': { veryWeak: -10.2, weak: -7.4, regular: -5.0, good: -2.2 },
      '90-94': { veryWeak: -11.2, weak: -8.4, regular: -6.0, good: -3.2 },
    },
    female: {
      '60-64': { veryWeak: -3.6, weak: -1.6, regular: 0.2, good: 1.9 },
      '65-69': { veryWeak: -4.3, weak: -2.1, regular: -0.3, good: 1.9 },
      '70-74': { veryWeak: -4.9, weak: -2.6, regular: -0.8, good: 1.5 },
      '75-79': { veryWeak: -5.5, weak: -3.1, regular: -1.1, good: 1.3 },
      '80-84': { veryWeak: -6.1, weak: -3.7, regular: -1.6, good: 0.9 },
      '85-89': { veryWeak: -7.7, weak: -5.0, regular: -2.8, good: -0.1 },
      '90-94': { veryWeak: -8.9, weak: -5.8, regular: -3.2, good: -0.1 },
    }
  };

  // 6. TUG (INVERTIDO)
  const tugRanges: Record<string, Record<string, ScoreRange>> = {
    male: {
      '60-64': { veryWeak: 5.8, weak: 5.0, regular: 4.4, good: 3.6 },
      '65-69': { veryWeak: 6.1, weak: 5.4, regular: 4.8, good: 4.1 },
      '70-74': { veryWeak: 6.4, weak: 5.6, regular: 5.5, good: 4.9 },
      '75-79': { veryWeak: 7.5, weak: 6.4, regular: 6.3, good: 5.3 },
      '80-84': { veryWeak: 7.9, weak: 6.9, regular: 6.8, good: 5.9 },
      '85-89': { veryWeak: 9.4, weak: 7.9, regular: 7.8, good: 6.4 },
      '90-94': { veryWeak: 10.5, weak: 8.8, regular: 8.7, good: 7.3 },
    },
    female: {
      '60-64': { veryWeak: 6.2, weak: 5.5, regular: 5.4, good: 4.8 },
      '65-69': { veryWeak: 6.6, weak: 5.9, regular: 5.8, good: 5.2 },
      '70-74': { veryWeak: 7.3, weak: 6.4, regular: 6.3, good: 5.5 },
      '75-79': { veryWeak: 7.6, weak: 6.7, regular: 6.6, good: 5.8 },
      '80-84': { veryWeak: 9.0, weak: 8.9, regular: 7.7, good: 6.6 },
      '85-89': { veryWeak: 10.0, weak: 9.9, regular: 8.4, good: 7.2 },
      '90-94': { veryWeak: 12.1, weak: 12.0, regular: 10.1, good: 8.5 },
    }
  };

  const key = isMale ? 'male' : 'female';
  
  const score1 = calculateScore(results.chairStandReps, chairStandRanges[key][ageGroup], p125);
  const score2 = calculateScore(results.armCurlReps, armCurlRanges[key][ageGroup], p125);
  const score3 = calculateScore(results.sixMinWalkDist, walkRanges[key][ageGroup], p25);
  const score4 = calculateScore(results.chairSitAndReach, sitReachRanges[key][ageGroup], p125);
  const score5 = calculateScore(results.backScratch, backScratchRanges[key][ageGroup], p125);
  const score6 = calculateScore(results.tugTime, tugRanges[key][ageGroup], p25, true);

  const total = score1 + score2 + score3 + score4 + score5 + score6;

  let classification = "Muito bom";
  if (total < 20) classification = "Muito fraco";
  else if (total < 40) classification = "Fraco";
  else if (total < 60) classification = "Regular";
  else if (total < 80) classification = "Bom";

  return {
    total,
    classification,
    breakdown: {
      chairStand: score1,
      armCurl: score2,
      sixMinWalk: score3,
      sitReach: score4,
      backScratch: score5,
      tug: score6
    }
  };
}
