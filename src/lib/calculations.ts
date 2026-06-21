export type Sex = 'masculino' | 'feminino';

export type BodyFatProtocol =
  | 'jackson_pollock_3_homens'
  | 'jackson_pollock_7_homens_negros_atletas'
  | 'jackson_7_mulheres_negras_hispanicas'
  | 'jackson_4_mulheres_atletas'
  | 'jackson_3_mulheres_brancas'
  | 'evans_2005'
  | 'slaughter_1988_meninos_panturrilha'
  | 'slaughter_1988_meninas_panturrilha'
  | 'slaughter_1985_meninos_triceps_subescapular'
  | 'slaughter_1985_meninas_triceps_subescapular'
  | 'tran_weltman_mulheres_brancas'
  | 'tran_weltman_homens_brancos'
  | 'tran_weltman_mulheres_obesas'
  | 'tran_weltman_homens_obesos';

export const BODY_FAT_PROTOCOLS: Array<{
  id: BodyFatProtocol;
  label: string;
  sex: Sex | 'ambos';
  age: string;
  requiredFields: string[];
}> = [
  { id: 'jackson_pollock_3_homens', label: 'Jackson & Pollock 3 dobras - homens brancos', sex: 'masculino', age: '18-61', requiredFields: ['pectoral', 'abdominal', 'thigh'] },
  { id: 'jackson_pollock_7_homens_negros_atletas', label: 'Jackson & Pollock 7 dobras - homens negros/atletas', sex: 'masculino', age: '18-61', requiredFields: ['pectoral', 'midAxillary', 'triceps', 'subscapular', 'abdominal', 'suprailiac', 'thigh'] },
  { id: 'jackson_7_mulheres_negras_hispanicas', label: 'Jackson 7 dobras - mulheres negras/hispanicas', sex: 'feminino', age: '18-55', requiredFields: ['pectoral', 'abdominal', 'thigh', 'triceps', 'subscapular', 'suprailiac', 'midAxillary'] },
  { id: 'jackson_4_mulheres_atletas', label: 'Jackson 4 dobras - mulheres atletas', sex: 'feminino', age: '18-29', requiredFields: ['triceps', 'suprailiac', 'abdominal', 'thigh'] },
  { id: 'jackson_3_mulheres_brancas', label: 'Jackson 3 dobras - mulheres brancas', sex: 'feminino', age: '18-55', requiredFields: ['triceps', 'suprailiac', 'thigh'] },
  { id: 'evans_2005', label: 'Evans 2005 - atletas universitarios', sex: 'ambos', age: '18-34', requiredFields: ['abdominal', 'thigh', 'triceps'] },
  { id: 'slaughter_1988_meninos_panturrilha', label: 'Slaughter 1988 - meninos, triceps + panturrilha', sex: 'masculino', age: '6-17', requiredFields: ['triceps', 'midLeg'] },
  { id: 'slaughter_1988_meninas_panturrilha', label: 'Slaughter 1988 - meninas, triceps + panturrilha', sex: 'feminino', age: '6-17', requiredFields: ['triceps', 'midLeg'] },
  { id: 'slaughter_1985_meninos_triceps_subescapular', label: 'Slaughter 1985 - meninos, triceps + subescapular', sex: 'masculino', age: '7-17', requiredFields: ['triceps', 'subscapular'] },
  { id: 'slaughter_1985_meninas_triceps_subescapular', label: 'Slaughter 1985 - meninas, triceps + subescapular', sex: 'feminino', age: '7-17', requiredFields: ['triceps', 'subscapular'] },
  { id: 'tran_weltman_mulheres_brancas', label: 'Tran & Weltman - mulheres brancas', sex: 'feminino', age: '15-79', requiredFields: ['abdomen', 'hip', 'height'] },
  { id: 'tran_weltman_homens_brancos', label: 'Tran & Weltman - homens brancos', sex: 'masculino', age: '15-78', requiredFields: ['abdomen', 'hip', 'waist', 'weight'] },
  { id: 'tran_weltman_mulheres_obesas', label: 'Tran & Weltman - mulheres obesas', sex: 'feminino', age: '20-60', requiredFields: ['abdomen', 'height', 'weight'] },
  { id: 'tran_weltman_homens_obesos', label: 'Tran & Weltman - homens obesos', sex: 'masculino', age: '24-68', requiredFields: ['abdomen', 'weight'] },
];

export function normalizeBodyFatProtocol(value: string | undefined, sex: Sex): BodyFatProtocol {
  if (value === 'jackson_3' || value === 'pollock_3') {
    return sex === 'masculino' ? 'jackson_pollock_3_homens' : 'jackson_3_mulheres_brancas';
  }
  if (value === 'jackson_7') {
    return sex === 'masculino' ? 'jackson_pollock_7_homens_negros_atletas' : 'jackson_7_mulheres_negras_hispanicas';
  }
  if (BODY_FAT_PROTOCOLS.some((item) => item.id === value)) return value as BodyFatProtocol;
  return sex === 'masculino' ? 'jackson_pollock_3_homens' : 'jackson_3_mulheres_brancas';
}

export function calcularTMB(biotipo: Sex, peso: number, altura: number, idade: number): number {
  if (biotipo === 'masculino') {
    return 88.36 + 13.4 * peso + 4.8 * altura - 5.7 * idade;
  }
  return 447.6 + 9.2 * peso + 3.1 * altura - 4.3 * idade;
}

export function calcularPercentualGordura(
  biotipo: Sex,
  idade: number,
  dobras: {
    subescapular?: number;
    tricipital?: number;
    peitoral?: number;
    suprailiaca?: number;
    coxa?: number;
    abdominal?: number;
    axilarMedia?: number;
    pernaMedial?: number;
  },
  protocolo?: BodyFatProtocol
): number {
  const selected = protocolo || normalizeBodyFatProtocol(undefined, biotipo);
  const siri = (densidade: number) => Math.max(0, ((4.95 / densidade) - 4.5) * 100);
  const sum = (...values: Array<number | undefined>): number =>
    values.reduce<number>((acc, value) => acc + Number(value || 0), 0);

  switch (selected) {
    case 'jackson_pollock_3_homens': {
      const x3 = sum(dobras.peitoral, dobras.abdominal, dobras.coxa);
      return siri(1.109380 - 0.0008267 * x3 + 0.0000016 * x3 ** 2 - 0.0002574 * idade);
    }
    case 'jackson_pollock_7_homens_negros_atletas': {
      const s = sum(dobras.peitoral, dobras.axilarMedia, dobras.tricipital, dobras.subescapular, dobras.abdominal, dobras.suprailiaca, dobras.coxa);
      return siri(1.11200 - 0.00043499 * s + 0.00000055 * s ** 2 - 0.00028826 * idade);
    }
    case 'jackson_7_mulheres_negras_hispanicas': {
      const s = sum(dobras.peitoral, dobras.abdominal, dobras.coxa, dobras.tricipital, dobras.subescapular, dobras.suprailiaca, dobras.axilarMedia);
      return siri(1.0970 - 0.00046971 * s + 0.00000056 * s ** 2 - 0.00012828 * idade);
    }
    case 'jackson_4_mulheres_atletas': {
      const s = sum(dobras.tricipital, dobras.suprailiaca, dobras.abdominal, dobras.coxa);
      return siri(1.096095 - 0.0006952 * s + 0.0000011 * s ** 2 - 0.0000714 * idade);
    }
    case 'jackson_3_mulheres_brancas': {
      const s = sum(dobras.tricipital, dobras.suprailiaca, dobras.coxa);
      return siri(1.0994921 - 0.0009929 * s + 0.0000023 * s ** 2 - 0.0001392 * idade);
    }
    case 'evans_2005': {
      const s = sum(dobras.abdominal, dobras.coxa, dobras.tricipital);
      return Math.max(0, 8.997 + 0.2468 * s - 6.343 * (biotipo === 'masculino' ? 1 : 0));
    }
    case 'slaughter_1988_meninos_panturrilha': {
      return Math.max(0, 0.735 * sum(dobras.tricipital, dobras.pernaMedial) + 1.0);
    }
    case 'slaughter_1988_meninas_panturrilha': {
      return Math.max(0, 0.610 * sum(dobras.tricipital, dobras.pernaMedial) + 5.1);
    }
    case 'slaughter_1985_meninos_triceps_subescapular': {
      const s = sum(dobras.tricipital, dobras.subescapular);
      if (s < 35) {
        const offset = idade <= 8 ? 1.7 : idade <= 10 ? 2.5 : idade <= 12 ? 3.4 : idade <= 14 ? 4.4 : 5.5;
        return Math.max(0, 1.21 * s - 0.008 * s ** 2 - offset);
      }
      return Math.max(0, 0.783 * s + 1.6);
    }
    case 'slaughter_1985_meninas_triceps_subescapular': {
      const s = sum(dobras.tricipital, dobras.subescapular);
      return Math.max(0, s < 35 ? 1.33 * s - 0.013 * s ** 2 - 2.5 : 0.546 * s + 9.7);
    }
    default:
      return 0;
  }
}

export function calcularComposicaoCorporal(peso: number, percentualGordura: number) {
  const massaGorda = peso * (percentualGordura / 100);
  const massaMagra = peso - massaGorda;

  return {
    massaGordaKg: massaGorda,
    massaMagraKg: massaMagra,
    percentualGordura,
  };
}
