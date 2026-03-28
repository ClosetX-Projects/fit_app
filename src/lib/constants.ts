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

export const BORG_SCALE_MESSAGES: Record<number, string> = {
  0: "Repouso",
  1: "Demasiado Leve",
  2: "Muito Leve",
  3: "Muito Leve-Leve",
  4: "Leve",
  5: "Leve-Moderado",
  6: "Moderado",
  7: "Moderado-Intenso",
  8: "Intenso",
  9: "Muito Intenso",
  10: "Exaustivo"
};

export const BORG_SCALE_COLORS: Record<number, string> = {
  0: "bg-blue-500",
  1: "bg-yellow-100",
  2: "bg-yellow-200",
  3: "bg-yellow-300",
  4: "bg-yellow-400",
  5: "bg-yellow-500",
  6: "bg-orange-400",
  7: "bg-orange-500",
  8: "bg-red-500",
  9: "bg-red-600",
  10: "bg-red-700"
};

export const FEELING_SCALE_MESSAGES: Record<number, string> = {
  5: "Muito Bom",
  4: "Bom+",
  3: "Bom",
  2: "Relativamente Bom",
  1: "Pouco Bom",
  0: "Neutro",
  "-1": "Pouco Ruim",
  "-2": "Relativamente Ruim",
  "-3": "Ruim",
  "-4": "Muito Ruim-",
  "-5": "Muito Ruim"
};

export const TRAINING_METHODS = [
  "Múltiplas Séries",
  "Bi-set",
  "Tri-set",
  "Pirâmide",
  "Drop-set",
  "Cluster Set",
  "GVT",
  "Rest-Pause"
];

export const PROGRESSION_TYPES = [
  "Linear",
  "Ondulatória"
];
