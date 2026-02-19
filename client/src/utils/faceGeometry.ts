import { NormalizedLandmark } from '@mediapipe/tasks-vision';

export type FaceShape = 'Oval' | 'Heart' | 'Round' | 'Angular';

export interface FaceMetrics {
    bizygomaticWidth: number;
    bigonialWidth: number;
    facialHeight: number;
    widthRatio: number; // Bizygomatic / Bigonial
    facialIndex: number; // Facial Height / Bizygomatic Width
    chinCurvature: number; // Heuristic for chin sharpness
}

export interface FaceShapeAnalysis {
    shape: FaceShape;
    metrics: FaceMetrics;
    description: string;
}

// MediaPipe Landmark Indices (AB Face Methodology)
const LANDMARKS = {
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
    // We check the angle or width at the chin.
    // A narrow V shape has a smaller distance between adjacent chin points relative to height
    // Or we can simple look at the 'severity' of the taper from gonion to menton.

    // Let's use a simpler heuristic for 'Pointed' vs 'Flat'
    // Measure width slightly above the chin (e.g. landmarks 377 and 148)
    const chinLeft = landmarks[LANDMARKS.CHIN_LEFT];
    const chinRight = landmarks[LANDMARKS.CHIN_RIGHT];
    const chinWidth = calculateDistance(chinLeft, chinRight);
    // Normalize chin width by face width to determine "pointedness"
    const chinBroadness = chinWidth / bizygomaticWidth;

    // 5. Classification Logic (Rule 2)
    let shape: FaceShape = 'Oval';
    let description = 'Rosto com proporções equilibradas e curvas suaves.';

    // HEART (Coração)
    // Bizigomática >> Bigonial
    // Queixo estreito e pontiagudo
    if (widthRatio > 1.45 && chinBroadness < 0.35) {
        shape = 'Heart';
        description = 'Largura bizigomática significativamente maior que a bigonial, com queixo proeminente e afilado.';
    }
    // ROUND (Redondo)
    // Facial Height ≈ Bizygomatic Width (Facial Index ~ 1.0 - 1.25)
    // Jawline arredondada (implicit via logic: similar to square but distinct height ratio)
    else if (facialIndex < 1.25 && widthRatio > 1.2) {
        // widthRatio > 1.2 ensures it's not SQUARE (which has wide jaw)
        shape = 'Round';
        description = 'Altura facial próxima à largura bizigomática, contornos suaves e sem ângulos marcados.';
    }
    // ANGULAR (Quadrado/Retangular)
    // Bigonial proeminente (widthRatio close to 1, e.g., < 1.25)
    // Queixo mais reto/plano
    else if (widthRatio < 1.25) {
        shape = 'Angular';
        description = 'Largura bigonial marcante, próxima à largura bizigomática. Linhas laterais retas e queixo mais plano.';
    }
    // OVAL (Default/Balanced)
    // Bizygomatic > Bigonial but smooth transition
    // Good height vs width proportion
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
            widthRatio,
            facialIndex,
            chinCurvature: chinBroadness
        },
        description
    };
}
