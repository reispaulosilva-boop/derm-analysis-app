import { NormalizedLandmark } from '@mediapipe/tasks-vision';

export type FaceShape = 'Oval' | 'Heart' | 'Round' | 'Angular';

export interface FaceMetrics {
    bizygomaticWidth: number;
    bigonialWidth: number;
    facialHeight: number;
    chinShape: 'pointed' | 'rounded' | 'square';
    midLowerRatio: number; // Bizygomatic / Bigonial
    facialIndex: number; // Facial Height / Bizygomatic Width
}

export interface FaceShapeAnalysis {
    shape: FaceShape;
    metrics: FaceMetrics;
    description: string;
}

// MediaPipe Landmark Indices (AB Face Methodology)
export const LANDMARKS = {
    // Bizygomatic Width (Zygoma - widest part of midface)
    ZYGOMA_LEFT: 454,
    ZYGOMA_RIGHT: 234,

    // Bigonial Width (Gonion - jaw angle)
    GONION_LEFT: 361, // 288 is often used, but 361 might be better for gonial angle in some mappings. Let's stick to standard dense mesh points. 
    // Refined: 58 (Right) and 288 (Left) are robust for Gonion.
    GONION_RIGHT_ALT: 58,
    GONION_LEFT_ALT: 288,

    // Facial Height
    GLABELLA: 10, // Top point
    MENTON: 152, // Bottom of chin

    // Chin Shape (for curvature analysis)
    CHIN_LEFT: 377,
    CHIN_RIGHT: 148,
};

/**
 * Calculates the Euclidean distance between two landmarks.
 * Uses 3D coordinates if available and meaningful (z is often relative in MediaPipe).
 * For 2D face shape analysis from a single image, 2D normalized coordinates (x, y) 
 * adjusted for aspect ratio are usually sufficient and often more robust against 3D depth noise 
 * unless the face is significantly rotated.
 * 
 * However, to adhere to "3D geometry" request:
 * We will use x, y, (and potentially z if we trust the depth for width calculations).
 * 
 * Note: MediaPipe x, y are normalized [0,1]. z is scale-invariant (roughly same scale as x).
 * To get true "ratio" metrics, normalized Euclidean distance is fine as units cancel out in ratios.
 */
function calculateDistance(p1: NormalizedLandmark, p2: NormalizedLandmark): number {
    return Math.sqrt(
        Math.pow(p2.x - p1.x, 2) +
        Math.pow(p2.y - p1.y, 2) +
        Math.pow(p2.z - p1.z, 2)
    );
}

/**
 * Evaluates the face shape based on "AB Face" methodology rules by Dr. André Braz.
 * 
 * @param landmarks The 468 face landmarks from MediaPipe
 * @returns FaceShapeAnalysis object containing classification and metrics
 */
export function evaluateFaceShape(landmarks: NormalizedLandmark[]): FaceShapeAnalysis {
    // 1. Extract Key Landmarks
    const zygomaLeft = landmarks[LANDMARKS.ZYGOMA_LEFT];
    const zygomaRight = landmarks[LANDMARKS.ZYGOMA_RIGHT];
    const gonionLeft = landmarks[LANDMARKS.GONION_LEFT_ALT];
    const gonionRight = landmarks[LANDMARKS.GONION_RIGHT_ALT];
    const glabella = landmarks[LANDMARKS.GLABELLA];
    const menton = landmarks[LANDMARKS.MENTON];

    // 2. Define Metrics (Rule 1)

    // Largura Bizigomática (Terço Médio)
    const bizygomaticWidth = calculateDistance(zygomaLeft, zygomaRight);

    // Largura Bigonial (Terço Inferior)
    const bigonialWidth = calculateDistance(gonionLeft, gonionRight);

    // Altura Facial (Glabela ao Mento)
    const facialHeight = calculateDistance(glabella, menton);

    // 3. Calculate Ratios
    const widthRatio = bizygomaticWidth / bigonialWidth; // > 1 indicates tapering. Close to 1 indicates angular/square.
    const facialIndex = facialHeight / bizygomaticWidth; // > 1.35 approx is long/oval, ~1.0 is round/square

    // 4. Analyze Chin Shape (Heuristic)
    const chinLeft = landmarks[LANDMARKS.CHIN_LEFT];
    const chinRight = landmarks[LANDMARKS.CHIN_RIGHT];
    const chinWidth = calculateDistance(chinLeft, chinRight);
    const chinBroadness = chinWidth / bizygomaticWidth;

    // DEBUG: Log metrics for calibration
    console.log(`[FaceAnalysis] CheekWidth (Bizygomatic): ${bizygomaticWidth.toFixed(4)}`);
    console.log(`[FaceAnalysis] JawWidth (Bigonial): ${bigonialWidth.toFixed(4)}`);
    console.log(`[FaceAnalysis] FaceHeight: ${facialHeight.toFixed(4)}`);
    console.log(`[FaceAnalysis] WidthRatio (WR): ${widthRatio.toFixed(4)}`);
    console.log(`[FaceAnalysis] FacialIndex (FI): ${facialIndex.toFixed(4)}`);
    console.log(`[FaceAnalysis] ChinBroadness: ${chinBroadness.toFixed(4)}`);

    // 5. Classification Logic (Strict Hierarchy)
    let shape: FaceShape = 'Oval';
    let description = '';

    // CASO 1: ROSTO CORAÇÃO (Heart Shape)
    // "Distância bizigomática é maior que a bigonial... com estreitamento notável no queixo"
    // WR > 1.35 indicates the cheekbones are significantly wider than the jaw.
    // We add a check for chin broadness to ensure it's tapering.
    if (widthRatio > 1.35 && chinBroadness < 0.38) {
        shape = 'Heart';
        description = 'Largura bizigomática maior que a bigonial, com queixo proeminente e afilado (triângulo invertido).';
    }
    // CASO 2: ROSTO ANGULAR (Square/Rectangular)
    // "Linhas retas... distância bizigomática pode ser igual ou próxima à bigonial"
    // WR < 1.15 implies the jaw width is very close to cheek width (within 15%).
    // This captures strong square jaws.
    else if (widthRatio < 1.15) {
        shape = 'Angular';
        description = 'Largura bigonial marcante, próxima à largura bizigomática. Linhas laterais retas e contorno forte.';
    }
    // CASO 3: ROSTO REDONDO (Round Shape)
    // "Rosto largo no terço médio... altura visualmente próxima à largura"
    // Short face (FI < 1.35) combined with a balanced but not square width ratio.
    else if (facialIndex < 1.35) {
        // Automatically falls into range 1.15 <= WR <= 1.35 due to previous checks
        shape = 'Round';
        description = 'Altura facial próxima à largura bizigomática, contornos suaves e sem ângulos marcados.';
    }
    // CASO 4: ROSTO OVAL (Oval Shape)
    // "Proporções equilibradas... rosto mais longo que o redondo"
    // Balanced width ratio (1.15 - 1.35) and longer face (FI >= 1.35).
    else {
        shape = 'Oval';
        description = 'Largura bizigomática maior que a bigonial com transição suave. Proporções verticais e horizontais equilibradas.';
    }

    return {
        shape,
        metrics: {
            bizygomaticWidth,
            bigonialWidth,
            facialHeight,
            chinShape: chinBroadness > 0.4 ? 'square' : chinBroadness > 0.28 ? 'rounded' : 'pointed',
            midLowerRatio: widthRatio, // Bizygomatic / Bigonial
            facialIndex, // Facial Height / Bizygomatic Width
        },
        description
    };
}
