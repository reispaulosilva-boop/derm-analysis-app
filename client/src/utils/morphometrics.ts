import { NormalizedLandmark } from '@mediapipe/tasks-vision';

// ============================================================================
// Mapeamento Anatômico Específico (Whitepaper Tabela 2)
// Identificadores (Índices) baseados na documentação global Sinker/Sagger
// ============================================================================
export const MORPHOMETRICS_LANDMARKS = {
    // Pálpebras e Contorno Ocular (Encurtamento da fenda palpebral, aferição da ptose via MRD1/MRD2 e frouxidão do tecido ocular)
    EYE_OUTER_LEFT: 33,   // Canto Lateral Esquerdo
    EYE_INNER_LEFT: 133,  // Canto Medial Esquerdo
    EYE_INNER_RIGHT: 362, // Canto Medial Direito
    EYE_OUTER_RIGHT: 263, // Canto Lateral Direito
    EYE_CENTERS: [157, 159, 145, 386, 374],

    // Linha Mandibular Inferior / Jawline (Avaliação da formação de "Jowls", flacidez submandibular e abertura do ângulo gonial)
    JAWLINE_MARGINS: [150, 152, 379, 234, 454], // 152 = Menton (ponto inferior central)
    MENTON: 152,

    // Sulcos Nasolabiais / Nasolabial Folds (Aprofundamento da depressão Z e quantificação da prega originada da ptose)
    NOSTRIL_BASE_LEFT: 129,
    NOSTRIL_BASE_RIGHT: 358,

    // Comissuras Labiais e Prega de Marionete (Avaliação das linhas de marionete e relaxamento tracionado)
    MOUTH_CORNER_LEFT: 78,
    MOUTH_CORNER_RIGHT: 308,

    // Tesselação de Regiões Malares / Bochechas (Integração volumétrica para identificar fenótipos Sinker e atrofia severa)
    MALAR_PROMINENCE_LEFT: 207,
    MALAR_PROMINENCE_RIGHT: 427,
};

// ============================================================================
// Formulações Matemáticas e Algoritmos para Quantificação Morfométrica
// ============================================================================

/**
 * Normalização Geométrica e Invariância Estereoscópica de Escala
 * Calcula a Distância Interocular (IOD) usando as coordenadas 3D para gerar 
 * um fator escalar imune a ruídos de proximidade de câmera.
 *
 * Fórmula (5.1): IOD = sqrt((x_E_R - x_E_L)^2 + (y_E_R - y_E_L)^2 + (z_E_R - z_E_L)^2)
 */
export function calculateIOD(rightEyeCenter: NormalizedLandmark, leftEyeCenter: NormalizedLandmark): number {
    return Math.sqrt(
        Math.pow(rightEyeCenter.x - leftEyeCenter.x, 2) +
        Math.pow(rightEyeCenter.y - leftEyeCenter.y, 2) +
        Math.pow(rightEyeCenter.z - leftEyeCenter.z, 2)
    );
}

/**
 * Simetria de Distância Euclidiana Bisseccional (Distance Symmetry)
 * Mede as distorções de repouso entre as duas metades da face, rebatendo 
 * um ponto contralateralmente para o lado homólogo pelo plano de reflexão mediossagital.
 *
 * Fórmula (5.2): d_i = sqrt((p^R_{i,x} - p^{rL}_{i,x})^2 + (p^R_{i,y} - p^{rL}_{i,y})^2 + (p^R_{i,z} - p^{rL}_{i,z})^2)
 *
 * @param rightPoint Coordenada real do landmark na direita (ex: canto labial 308)
 * @param leftPoint Coordenada real do landmark na esquerda (ex: canto labial 78)
 * @param sagittalPlaneX Cota X base que atua como o espelho (geralmente a ponta do nariz ou centro glabelar)
 */
export function calculateDistanceSymmetry(
    rightPoint: NormalizedLandmark,
    leftPoint: NormalizedLandmark,
    sagittalPlaneX: number
): number {
    // Estabelecemos as coordenadas "rebatidas" do lado esquerdo através do plano Espelho Sagital.
    // Em visão frontal, um desvio à esquerda do centro deve espelhar no mesmo desvio à direita.
    const distToCenterL = sagittalPlaneX - leftPoint.x;
    const reflectedLeftX = sagittalPlaneX + distToCenterL;

    // As posições Y e Z da reflexão assumem plano perfeitamente reto para simplificação fotogramétrica direta
    const reflectedLeftY = leftPoint.y;
    const reflectedLeftZ = leftPoint.z;

    return Math.sqrt(
        Math.pow(rightPoint.x - reflectedLeftX, 2) +
        Math.pow(rightPoint.y - reflectedLeftY, 2) +
        Math.pow(rightPoint.z - reflectedLeftZ, 2)
    );
}

/**
 * Quantidade de Deslocamento Absoluto (Absolute Vectorial Movement Displacement)
 * Quantifica o deslocamento transacional vetorial dos pontos flexíveis 
 * (usado tipicamente em testes dinâmicos de frouxidão da bochecha/jawline face à gravidade).
 * 
 * Fórmula (5.2): m_i = sqrt((s_{i,x} - n_{i,x})^2 + (s_{i,y} - n_{i,y})^2 + (s_{i,z} - n_{i,z})^2)
 */
export function calculateAbsoluteDisplacement(
    naturalPoint: NormalizedLandmark,
    flexedPoint: NormalizedLandmark
): number {
    return Math.sqrt(
        Math.pow(flexedPoint.x - naturalPoint.x, 2) +
        Math.pow(flexedPoint.y - naturalPoint.y, 2) +
        Math.pow(flexedPoint.z - naturalPoint.z, 2)
    );
}

/**
 * Volumetria Tridimensional Complexa e Extração de Sub-Tetraedro.
 * Modela a área poligonal superficial até o plano basal anatômico fixo em 
 * prismas. Calcula o volume das figuras espaciais irredutíveis.
 * 
 * Fórmula (5.3): V_tetra = |(vA - vD) . ((vB - vD) x (vC - vD))| / 6
 * 
 * @param vA Vértice Superficial 1
 * @param vB Vértice Superficial 2
 * @param vC Vértice Superficial 3
 * @param vD Ponto anatômico basal limitante profundo (ancoragem interna)
 */
export function calculateTetrahedronVolume(
    vA: NormalizedLandmark,
    vB: NormalizedLandmark,
    vC: NormalizedLandmark,
    vD: NormalizedLandmark
): number {
    // Definição dos vetores a partir do ponto subjacente base (vD) em X, Y, Z
    const adX = vA.x - vD.x;
    const adY = vA.y - vD.y;
    const adZ = vA.z - vD.z;

    const bdX = vB.x - vD.x;
    const bdY = vB.y - vD.y;
    const bdZ = vB.z - vD.z;

    const cdX = vC.x - vD.x;
    const cdY = vC.y - vD.y;
    const cdZ = vC.z - vD.z;

    // Resolvendo Produto Vetorial (Cross Product): (vB - vD) x (vC - vD)
    const crossX = (bdY * cdZ) - (bdZ * cdY);
    const crossY = (bdZ * cdX) - (bdX * cdZ);
    const crossZ = (bdX * cdY) - (bdY * cdX);

    // Resolvendo Produto Escalar Absoluto (Dot Product): (vA - vD) . Cross
    const dotProduct = Math.abs((adX * crossX) + (adY * crossY) + (adZ * crossZ));

    // O determinante matricial gerado resulta no volume do tetraedro derivado daquele polígono particular
    return dotProduct / 6.0;
}
