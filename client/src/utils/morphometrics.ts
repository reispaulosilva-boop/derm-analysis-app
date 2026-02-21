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

// ============================================================================
// Métricas Faciais para Avaliação Estética (Baseado no script Python)
// ============================================================================

export const FACIAL_EVAL_LANDMARKS = {
    // Contorno facial
    chin: 152,
    forehead_top: 10,
    jaw_left: 234,
    jaw_right: 454,

    // Terços horizontais
    glabela: 9,
    nasal_base: 2,

    // Olhos
    eye_left_inner: 133,
    eye_left_outer: 33,
    eye_right_inner: 362,
    eye_right_outer: 263,
    eye_left_top: 159,
    eye_left_bot: 145,
    eye_right_top: 386,
    eye_right_bot: 374,

    // Sobrancelhas
    brow_left_peak: 66,
    brow_right_peak: 296,

    // Nariz
    nasal_tip: 4,
    ala_left: 129,
    ala_right: 358,

    // Lábios
    lip_top: 13,
    lip_bot: 14,
    lip_left: 61,
    lip_right: 291,
    cupid_left: 37,
    cupid_right: 267,

    // Mento
    mento: 175,

    // Malar
    malar_left: 116,
    malar_right: 345,
} as const;

export interface FacialMetrics {
    face_width_px: number;
    face_height_px: number;
    facial_index: number;

    third_upper_pct: number;
    third_middle_pct: number;
    third_lower_pct: number;

    fifth_1_pct: number;
    fifth_2_pct: number;
    fifth_3_pct: number;
    fifth_4_pct: number;
    fifth_5_pct: number;

    eye_left_width_px: number;
    eye_right_width_px: number;
    eye_symmetry_pct: number;
    interpupillary_dist_px: number;

    brow_left_height_px: number;
    brow_right_height_px: number;
    brow_symmetry_pct: number;

    nasal_width_px: number;
    nasal_height_px: number;
    nasal_index: number;

    lip_width_px: number;
    lip_height_px: number;
    lip_index: number;
    upper_lower_lip_ratio: number;

    chin_projection_pct: number;
    global_asymmetry_px: number;
}

function dist2D(a: { x: number, y: number }, b: { x: number, y: number }): number {
    return Math.hypot(b.x - a.x, b.y - a.y);
}

export function extractFacialMetrics(landmarks: NormalizedLandmark[], width: number, height: number): FacialMetrics {
    const px = (idx: number) => ({
        x: landmarks[idx].x * width,
        y: landmarks[idx].y * height
    });

    const g = (key: keyof typeof FACIAL_EVAL_LANDMARKS) => px(FACIAL_EVAL_LANDMARKS[key]);

    // Pontos principais
    const forehead = g("forehead_top");
    const glabela = g("glabela");
    const nas_base = g("nasal_base");
    const chin = g("chin");
    const jaw_l = g("jaw_left");
    const jaw_r = g("jaw_right");

    const face_w = dist2D(jaw_l, jaw_r);
    const face_h = dist2D(forehead, chin);

    // --- Terços ---
    const t_upper = dist2D(forehead, glabela);
    const t_middle = dist2D(glabela, nas_base);
    const t_lower = dist2D(nas_base, chin);
    const total_t = t_upper + t_middle + t_lower;

    // --- Quintos ---
    const el_out = g("eye_left_outer");
    const el_in = g("eye_left_inner");
    const er_in = g("eye_right_inner");
    const er_out = g("eye_right_outer");

    const f1 = el_out.x - jaw_l.x;
    const f2 = dist2D(el_out, el_in);
    const f3 = dist2D(el_in, er_in);
    const f4 = dist2D(er_in, er_out);
    const f5 = jaw_r.x - er_out.x;
    const total_f = f1 + f2 + f3 + f4 + f5;

    // --- Olhos ---
    const eye_l_w = dist2D(g("eye_left_outer"), g("eye_left_inner"));
    const eye_r_w = dist2D(g("eye_right_outer"), g("eye_right_inner"));
    const eye_sym = Math.abs(eye_l_w - eye_r_w) / Math.max(eye_l_w, eye_r_w) * 100;

    const pupil_l = {
        x: (el_out.x + el_in.x) / 2,
        y: (g("eye_left_top").y + g("eye_left_bot").y) / 2
    };
    const pupil_r = {
        x: (er_out.x + er_in.x) / 2,
        y: (g("eye_right_top").y + g("eye_right_bot").y) / 2
    };
    const ipd = dist2D(pupil_l, pupil_r);

    // --- Sobrancelhas ---
    const brow_l_h = dist2D(g("brow_left_peak"), g("eye_left_outer"));
    const brow_r_h = dist2D(g("brow_right_peak"), g("eye_right_outer"));
    const brow_sym = Math.abs(brow_l_h - brow_r_h) / Math.max(brow_l_h, brow_r_h) * 100;

    // --- Nariz ---
    const nas_w = dist2D(g("ala_left"), g("ala_right"));
    const nas_h = dist2D(g("nasal_tip"), g("nasal_base"));
    const nas_idx = nas_w / (nas_h + 1e-9);

    // --- Lábios ---
    const lip_w = dist2D(g("lip_left"), g("lip_right"));
    const lip_h = dist2D(g("lip_top"), g("lip_bot"));
    const lip_idx = lip_w / (lip_h + 1e-9);

    // Proporção superior/inferior do lábio
    const lip_mid_y = (g("lip_top").y + g("lip_bot").y) / 2;
    const upper_h = Math.abs(g("cupid_left").y - g("lip_top").y);
    const lower_h = Math.abs(g("lip_bot").y - lip_mid_y);
    const ul_ratio = upper_h / (lower_h + 1e-9);

    // --- Mento ---
    const chin_h = dist2D(nas_base, chin);
    const chin_proj = dist2D(g("mento"), chin) / (chin_h + 1e-9) * 100;

    // --- Assimetria global ---
    const pairs = [
        [g("eye_left_outer"), g("eye_right_outer")],
        [g("ala_left"), g("ala_right")],
        [g("malar_left"), g("malar_right")],
        [g("lip_left"), g("lip_right")],
        [g("brow_left_peak"), g("brow_right_peak")],
    ] as const;

    // Espelha o lado direito e calcula desvio vertical
    const asym_vals = pairs.map(([l, r]) => Math.abs(l.y - r.y));
    const global_asym = asym_vals.reduce((sum, val) => sum + val, 0) / asym_vals.length;

    // Utilitário para arredondamento
    const round = (val: number, decimals: number = 1) => {
        const factor = Math.pow(10, decimals);
        return Math.round(val * factor) / factor;
    };

    return {
        face_width_px: round(face_w, 1),
        face_height_px: round(face_h, 1),
        facial_index: round(face_h / (face_w + 1e-9), 3),

        third_upper_pct: round(t_upper / total_t * 100, 1),
        third_middle_pct: round(t_middle / total_t * 100, 1),
        third_lower_pct: round(t_lower / total_t * 100, 1),

        fifth_1_pct: round(f1 / total_f * 100, 1),
        fifth_2_pct: round(f2 / total_f * 100, 1),
        fifth_3_pct: round(f3 / total_f * 100, 1),
        fifth_4_pct: round(f4 / total_f * 100, 1),
        fifth_5_pct: round(f5 / total_f * 100, 1),

        eye_left_width_px: round(eye_l_w, 1),
        eye_right_width_px: round(eye_r_w, 1),
        eye_symmetry_pct: round(eye_sym, 1),
        interpupillary_dist_px: round(ipd, 1),

        brow_left_height_px: round(brow_l_h, 1),
        brow_right_height_px: round(brow_r_h, 1),
        brow_symmetry_pct: round(brow_sym, 1),

        nasal_width_px: round(nas_w, 1),
        nasal_height_px: round(nas_h, 1),
        nasal_index: round(nas_idx, 3),

        lip_width_px: round(lip_w, 1),
        lip_height_px: round(lip_h, 1),
        lip_index: round(lip_idx, 3),
        upper_lower_lip_ratio: round(ul_ratio, 3),

        chin_projection_pct: round(chin_proj, 1),

        global_asymmetry_px: round(global_asym, 1),
    };
}

