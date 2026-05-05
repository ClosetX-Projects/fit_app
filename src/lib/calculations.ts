/**
 * Calcula a Taxa Metabólica Basal (TMB) usando a equação de Harris-Benedict (conforme imagem fornecida).
 * 
 * @param biotipo - 'masculino' | 'feminino'
 * @param peso - Peso em kg
 * @param altura - Altura em cm
 * @param idade - Idade em anos
 */
export function calcularTMB(
  biotipo: 'masculino' | 'feminino',
  peso: number,
  altura: number,
  idade: number
): number {
  if (biotipo === 'masculino') {
    return 88.36 + (13.4 * peso) + (4.8 * altura) - (5.7 * idade);
  } else {
    return 447.6 + (9.2 * peso) + (3.1 * altura) - (4.3 * idade);
  }
}

/**
 * Calcula o Percentual de Gordura Corporal usando a fórmula de 3 dobras (Jackson & Pollock)
 * e a equação de Siri para conversão de densidade (conforme fórmulas fornecidas).
 * 
 * @param biotipo - 'masculino' | 'feminino'
 * @param idade - Idade em anos
 * @param dobras - Objeto contendo as medidas das dobras em mm
 */
export function calcularPercentualGordura(
  biotipo: 'masculino' | 'feminino',
  idade: number,
  dobras: {
    subescapular?: number;
    tricipital?: number;
    peitoral?: number;
    suprailiaca?: number;
    coxa?: number;
  }
): number {
  let densidade: number;

  if (biotipo === 'masculino') {
    const somaDobras = (dobras.subescapular || 0) + (dobras.tricipital || 0) + (dobras.peitoral || 0);
    densidade = 1.1125025 - (0.0013125 * somaDobras) + (0.0000055 * Math.pow(somaDobras, 2)) - (0.000244 * idade);
  } else {
    const somaDobras = (dobras.tricipital || 0) + (dobras.suprailiaca || 0) + (dobras.coxa || 0);
    densidade = 1.099492 - (0.0009929 * somaDobras) + (0.0000023 * Math.pow(somaDobras, 2)) - (0.0001392 * idade);
  }

  const percentualGordura = ((4.95 / densidade) - 4.5) * 100;
  return Math.max(0, percentualGordura); // Garante que não seja negativo
}

/**
 * Calcula a composição corporal completa (Massa Gorda e Massa Magra).
 */
export function calcularComposicaoCorporal(
  peso: number,
  percentualGordura: number
) {
  const massaGorda = peso * (percentualGordura / 100);
  const massaMagra = peso - massaGorda;

  return {
    massaGordaKg: massaGorda,
    massaMagraKg: massaMagra,
    percentualGordura: percentualGordura
  };
}
