
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
  1: "Muito Mal: Risco de lesão. Considere repouso total.",
  2: "Mal: Recuperação insuficiente. Reduza drasticamente a carga.",
  3: "Regular: Ainda fadigado. Treine com moderação.",
  4: "Regular/Bom: Fadiga leve. Treino normal possível.",
  5: "Bom: Recuperação estável.",
  6: "Muito Bom: Praticamente recuperado.",
  7: "Excelente: Pronto para alta performance.",
  8: "Superior: Máxima capacidade física.",
  9: "Imbatível: Sem qualquer sinal de fadiga.",
  10: "Perfeito: Estado físico e mental ideal."
};
