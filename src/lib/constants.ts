
export const EXERCISE_LIST = [
  "Agachamento Livre",
  "Leg Press 45º",
  "Extensora",
  "Flexora",
  "Supino Reto",
  "Supino Inclinado",
  "Crucifixo",
  "Desenvolvimento",
  "Elevação Lateral",
  "Puxada Alta",
  "Remada Curvada",
  "Rosca Direta",
  "Tríceps Pulley",
  "Prancha Abdominal",
  "Cadeira Adutora",
  "Cadeira Abdutora",
  "Stiff",
  "Levantamento Terra"
];

export const EXERCISE_METADATA: Record<string, { group: string }> = {
  "Agachamento Livre": { group: "Quadríceps" },
  "Leg Press 45º": { group: "Quadríceps" },
  "Extensora": { group: "Quadríceps" },
  "Flexora": { group: "Posterior" },
  "Stiff": { group: "Posterior" },
  "Supino Reto": { group: "Peito" },
  "Supino Inclinado": { group: "Peito" },
  "Crucifixo": { group: "Peito" },
  "Desenvolvimento": { group: "Deltoide" },
  "Elevação Lateral": { group: "Deltoide" },
  "Puxada Alta": { group: "Costas" },
  "Remada Curvada": { group: "Costas" },
  "Rosca Direta": { group: "Biceps" },
  "Tríceps Pulley": { group: "Triceps" },
  "Prancha Abdominal": { group: "Core" },
  "Cadeira Adutora": { group: "Adutores" },
  "Cadeira Abdutora": { group: "Glúteo" },
  "Levantamento Terra": { group: "Costas" }
};

export const RECOVERY_MESSAGES: Record<number, string> = {
  0: "Nenhuma recuperação",
  1: "Muito pouca recuperação",
  2: "Pouca recuperação",
  3: "Recuperação Moderada",
  4: "Boa Recuperação",
  5: "Muito boa recuperação",
  6: "Recuperação Elevada",
  7: "Muito, muito boa recuperação",
  8: "Recuperação Quase Completa",
  9: "Recuperação Superior",
  10: "Totalmente recuperado"
};
