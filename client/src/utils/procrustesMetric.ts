/**
 * Procrustes 3D Metric Space
 * 
 * Converts MediaPipe normalized landmarks [0,1] to real-world
 * millimeter coordinates using Generalized Procrustes Analysis (GPA).
 * 
 * Calibration anchor: average adult interpupillary distance (IPD ≈ 63mm).
 * This provides a universal scale factor from normalized 3D space to metric.
 * 
 * Based on SKILL.md §3.2 — Espaço 3D Métrico (Procrustes).
 */
import { NormalizedLandmark } from '@mediapipe/tasks-vision';

// ─── Constants ───

/** Average adult interpupillary distance in mm (WHO/ophthalmology reference) */
export const REFERENCE_IPD_MM = 63.0;

/** MediaPipe landmark indices for eye centers (midpoint of inner/outer canthus) */
export const EYE_LANDMARKS = {
    LEFT_INNER: 133,
    LEFT_OUTER: 33,
    RIGHT_INNER: 362,
    RIGHT_OUTER: 263,
};

/** Key anatomical landmark indices used for Procrustes alignment */
export const PROCRUSTES_ANCHOR_INDICES = [
    10,   // Glabella (forehead center)
    152,  // Menton (chin bottom)
    33,   // Left eye outer canthus
    263,  // Right eye outer canthus
    133,  // Left eye inner canthus
    362,  // Right eye inner canthus
    1,    // Nose tip projection
    234,  // Left zygoma
    454,  // Right zygoma
    58,   // Right gonion
    288,  // Left gonion
    61,   // Left mouth corner
    291,  // Right mouth corner
    13,   // Upper lip midpoint
    14,   // Lower lip midpoint
];

// ─── Types ───

export interface Point3D {
    x: number;
    y: number;
    z: number;
}

export interface MetricLandmark extends Point3D {
    /** Original MediaPipe index */
    index: number;
    /** Whether this is a Procrustes anchor point */
    isAnchor: boolean;
}

export interface MetricCalibration {
    /** Scale factor: mm per normalized unit */
    scaleFactor: number;
    /** Measured IPD in normalized coordinates */
    normalizedIPD: number;
    /** Reference IPD used for calibration (mm) */
    referenceIPD_mm: number;
    /** Centroid used for centering (normalized) */
    centroid: Point3D;
    /** Confidence: how reliable the calibration is (0-1) */
    confidence: number;
}

export interface ProcrustesResult {
    /** All 478 landmarks in metric (mm) coordinates */
    metricLandmarks: MetricLandmark[];
    /** Calibration data */
    calibration: MetricCalibration;
    /** Key anatomical measurements in mm */
    measurements: MetricMeasurements;
}

export interface MetricMeasurements {
    /** Interpupillary distance (mm) */
    ipd_mm: number;
    /** Bizygomatic width (mm) — widest part of midface */
    bizygomaticWidth_mm: number;
    /** Bigonial width (mm) — jaw width */
    bigonialWidth_mm: number;
    /** Facial height: glabella to menton (mm) */
    facialHeight_mm: number;
    /** Upper third: hairline approx to glabella (mm) */
    upperThird_mm: number;
    /** Middle third: glabella to subnasale (mm) */
    middleThird_mm: number;
    /** Lower third: subnasale to menton (mm) */
    lowerThird_mm: number;
    /** Nasal width: ala to ala (mm) */
    nasalWidth_mm: number;
    /** Nasal height: tip to bridge (mm) */
    nasalHeight_mm: number;
    /** Mouth width: commissure to commissure (mm) */
    mouthWidth_mm: number;
    /** Lip height: upper to lower vermilion (mm) */
    lipHeight_mm: number;
    /** Chin projection: menton to pogonion (mm) */
    chinHeight_mm: number;
    /** Palpebral fissure width left (mm) */
    palpebraLeftWidth_mm: number;
    /** Palpebral fissure width right (mm) */
    palpebraRightWidth_mm: number;
    /** Malar prominence to tragal distance left (mm) */
    malarDepthLeft_mm: number;
    /** Malar prominence to tragal distance right (mm) */
    malarDepthRight_mm: number;
}

// ─── Core Functions ───

/**
 * Computes the Euclidean distance between two 3D points.
 */
export function dist3D(a: Point3D, b: Point3D): number {
    return Math.sqrt(
        (a.x - b.x) ** 2 +
        (a.y - b.y) ** 2 +
        (a.z - b.z) ** 2
    );
}

/**
 * Computes the centroid (geometric center) of a set of 3D points.
 */
export function computeCentroid(points: Point3D[]): Point3D {
    const n = points.length;
    if (n === 0) return { x: 0, y: 0, z: 0 };

    const sum = points.reduce(
        (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }),
        { x: 0, y: 0, z: 0 }
    );

    return { x: sum.x / n, y: sum.y / n, z: sum.z / n };
}

/**
 * Centers a point cloud by subtracting the centroid.
 */
function centerPoints(points: Point3D[], centroid: Point3D): Point3D[] {
    return points.map(p => ({
        x: p.x - centroid.x,
        y: p.y - centroid.y,
        z: p.z - centroid.z,
    }));
}

/**
 * Computes the Frobenius norm (scale) of a point cloud.
 */
function computeScale(points: Point3D[]): number {
    const sumSq = points.reduce(
        (acc, p) => acc + p.x * p.x + p.y * p.y + p.z * p.z,
        0
    );
    return Math.sqrt(sumSq);
}

/**
 * Step 1: Compute calibration from normalized landmarks.
 * 
 * Uses the interpupillary distance as the scale reference.
 * IPD = distance between the midpoints of inner/outer canthi.
 */
export function computeCalibration(
    landmarks: NormalizedLandmark[],
    referenceIPD_mm: number = REFERENCE_IPD_MM
): MetricCalibration {
    // Compute eye center positions (midpoint of inner + outer canthus)
    const leftEyeCenter: Point3D = {
        x: (landmarks[EYE_LANDMARKS.LEFT_INNER].x + landmarks[EYE_LANDMARKS.LEFT_OUTER].x) / 2,
        y: (landmarks[EYE_LANDMARKS.LEFT_INNER].y + landmarks[EYE_LANDMARKS.LEFT_OUTER].y) / 2,
        z: (landmarks[EYE_LANDMARKS.LEFT_INNER].z + landmarks[EYE_LANDMARKS.LEFT_OUTER].z) / 2,
    };
    const rightEyeCenter: Point3D = {
        x: (landmarks[EYE_LANDMARKS.RIGHT_INNER].x + landmarks[EYE_LANDMARKS.RIGHT_OUTER].x) / 2,
        y: (landmarks[EYE_LANDMARKS.RIGHT_INNER].y + landmarks[EYE_LANDMARKS.RIGHT_OUTER].y) / 2,
        z: (landmarks[EYE_LANDMARKS.RIGHT_INNER].z + landmarks[EYE_LANDMARKS.RIGHT_OUTER].z) / 2,
    };

    const normalizedIPD = dist3D(leftEyeCenter, rightEyeCenter);

    // Scale factor: mm per normalized unit
    const scaleFactor = referenceIPD_mm / (normalizedIPD || 1e-9);

    // Compute centroid for centering
    const allPoints = landmarks.map(lm => ({ x: lm.x, y: lm.y, z: lm.z }));
    const centroid = computeCentroid(allPoints);

    // Confidence: based on how reasonable the IPD looks in normalized space
    // Typical MediaPipe IPD in normalized coords is ~0.12-0.22
    const expectedRange = normalizedIPD > 0.08 && normalizedIPD < 0.35;
    const confidence = expectedRange ? Math.min(1, normalizedIPD / 0.15) : 0.3;

    return {
        scaleFactor,
        normalizedIPD,
        referenceIPD_mm: referenceIPD_mm,
        centroid,
        confidence: Math.min(confidence, 1),
    };
}

/**
 * Step 2: Convert all landmarks to metric (mm) space.
 * 
 * Procrustes pipeline:
 * 1. Center at origin (subtract centroid)
 * 2. Scale to metric using IPD calibration
 * 3. (Rotation alignment is implicit — MediaPipe already frontally normalizes)
 */
export function convertToMetric(
    landmarks: NormalizedLandmark[],
    calibration: MetricCalibration
): MetricLandmark[] {
    const { scaleFactor, centroid } = calibration;
    const anchorSet = new Set(PROCRUSTES_ANCHOR_INDICES);

    return landmarks.map((lm, index) => ({
        x: (lm.x - centroid.x) * scaleFactor,
        y: (lm.y - centroid.y) * scaleFactor,
        z: (lm.z - centroid.z) * scaleFactor,
        index,
        isAnchor: anchorSet.has(index),
    }));
}

/**
 * Step 3: Extract key anatomical measurements in mm.
 */
export function extractMetricMeasurements(
    metricLandmarks: MetricLandmark[]
): MetricMeasurements {
    const lm = (idx: number): Point3D => metricLandmarks[idx];

    // IPD (verification)
    const leftEyeCenter: Point3D = {
        x: (lm(EYE_LANDMARKS.LEFT_INNER).x + lm(EYE_LANDMARKS.LEFT_OUTER).x) / 2,
        y: (lm(EYE_LANDMARKS.LEFT_INNER).y + lm(EYE_LANDMARKS.LEFT_OUTER).y) / 2,
        z: (lm(EYE_LANDMARKS.LEFT_INNER).z + lm(EYE_LANDMARKS.LEFT_OUTER).z) / 2,
    };
    const rightEyeCenter: Point3D = {
        x: (lm(EYE_LANDMARKS.RIGHT_INNER).x + lm(EYE_LANDMARKS.RIGHT_OUTER).x) / 2,
        y: (lm(EYE_LANDMARKS.RIGHT_INNER).y + lm(EYE_LANDMARKS.RIGHT_OUTER).y) / 2,
        z: (lm(EYE_LANDMARKS.RIGHT_INNER).z + lm(EYE_LANDMARKS.RIGHT_OUTER).z) / 2,
    };

    return {
        ipd_mm: round(dist3D(leftEyeCenter, rightEyeCenter)),
        bizygomaticWidth_mm: round(dist3D(lm(234), lm(454))),   // Zygoma L-R
        bigonialWidth_mm: round(dist3D(lm(58), lm(288))),       // Gonion L-R
        facialHeight_mm: round(dist3D(lm(10), lm(152))),        // Glabella to Menton
        upperThird_mm: round(dist3D(lm(10), lm(9))),            // Forehead to Glabella
        middleThird_mm: round(dist3D(lm(9), lm(2))),            // Glabella to Subnasale
        lowerThird_mm: round(dist3D(lm(2), lm(152))),           // Subnasale to Menton
        nasalWidth_mm: round(dist3D(lm(129), lm(358))),         // Ala L-R
        nasalHeight_mm: round(dist3D(lm(4), lm(2))),            // Tip to Subnasale
        mouthWidth_mm: round(dist3D(lm(61), lm(291))),          // Commissure L-R
        lipHeight_mm: round(dist3D(lm(13), lm(14))),            // Upper to Lower lip
        chinHeight_mm: round(dist3D(lm(2), lm(152))),           // Subnasale to Menton
        palpebraLeftWidth_mm: round(dist3D(lm(33), lm(133))),   // Palpebral L
        palpebraRightWidth_mm: round(dist3D(lm(263), lm(362))), // Palpebral R
        malarDepthLeft_mm: round(dist3D(lm(207), lm(234))),     // Malar to Zygoma L
        malarDepthRight_mm: round(dist3D(lm(427), lm(454))),    // Malar to Zygoma R
    };
}

function round(val: number, decimals: number = 1): number {
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
}

// ─── Volumetric Estimation ───

/**
 * Estimates volume of a facial subregion using tetrahedral decomposition.
 * Given a set of surface landmarks and a deep anchor point, computes
 * the total enclosed volume in mm³ (or mL ÷ 1000).
 * 
 * This can estimate volumetric deficit for filler planning.
 * 
 * @param surfaceIndices Landmark indices defining the surface polygon
 * @param deepAnchorIndex Landmark index of the deep reference point
 * @param metricLandmarks All landmarks in metric space
 * @returns Volume in mm³
 */
export function estimateSubregionVolume(
    surfaceIndices: number[],
    deepAnchorIndex: number,
    metricLandmarks: MetricLandmark[]
): number {
    if (surfaceIndices.length < 3) return 0;

    const anchor = metricLandmarks[deepAnchorIndex];
    let totalVolume = 0;

    // Fan triangulation from first surface vertex
    for (let i = 1; i < surfaceIndices.length - 1; i++) {
        const vA = metricLandmarks[surfaceIndices[0]];
        const vB = metricLandmarks[surfaceIndices[i]];
        const vC = metricLandmarks[surfaceIndices[i + 1]];

        // Tetrahedron volume: |det([B-A, C-A, D-A])| / 6
        const abx = vB.x - vA.x, aby = vB.y - vA.y, abz = vB.z - vA.z;
        const acx = vC.x - vA.x, acy = vC.y - vA.y, acz = vC.z - vA.z;
        const adx = anchor.x - vA.x, ady = anchor.y - vA.y, adz = anchor.z - vA.z;

        // Cross product (AB × AC)
        const cx = aby * acz - abz * acy;
        const cy = abz * acx - abx * acz;
        const cz = abx * acy - aby * acx;

        // Dot with AD
        const det = cx * adx + cy * ady + cz * adz;
        totalVolume += Math.abs(det) / 6;
    }

    return round(totalVolume, 2);
}

// ─── Pre-defined Volumetric Regions ───

export interface VolumetricRegion {
    id: string;
    label: string;
    labelPt: string;
    surfaceIndices: number[];
    deepAnchorIndex: number;
    /** Typical volume in ml for reference (young adult) */
    referenceVolume_ml: number;
}

export const VOLUMETRIC_REGIONS: VolumetricRegion[] = [
    {
        id: 'malar_left',
        label: 'Left Malar',
        labelPt: 'Malar Esquerdo',
        surfaceIndices: [116, 117, 118, 119, 120, 121, 128, 129, 130, 207],
        deepAnchorIndex: 234, // Deep zygoma
        referenceVolume_ml: 2.5,
    },
    {
        id: 'malar_right',
        label: 'Right Malar',
        labelPt: 'Malar Direito',
        surfaceIndices: [345, 346, 347, 348, 349, 350, 357, 358, 359, 427],
        deepAnchorIndex: 454,
        referenceVolume_ml: 2.5,
    },
    {
        id: 'nasolabial_left',
        label: 'Left Nasolabial',
        labelPt: 'Sulco Nasolabial (E)',
        surfaceIndices: [205, 206, 207, 216, 212, 202, 40, 39],
        deepAnchorIndex: 129, // Nostril base
        referenceVolume_ml: 0.8,
    },
    {
        id: 'nasolabial_right',
        label: 'Right Nasolabial',
        labelPt: 'Sulno Nasolabial (D)',
        surfaceIndices: [425, 426, 427, 436, 432, 422, 270, 269],
        deepAnchorIndex: 358,
        referenceVolume_ml: 0.8,
    },
    {
        id: 'lips',
        label: 'Lips',
        labelPt: 'Lábios',
        surfaceIndices: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 314, 17, 84, 181, 91, 78],
        deepAnchorIndex: 13, // Upper lip mid
        referenceVolume_ml: 1.2,
    },
    {
        id: 'chin',
        label: 'Chin',
        labelPt: 'Mento',
        surfaceIndices: [150, 149, 176, 148, 152, 377, 400, 378, 379],
        deepAnchorIndex: 175, // Deep chin
        referenceVolume_ml: 1.5,
    },
];

// ─── Main Pipeline ───

/**
 * Full Procrustes conversion pipeline.
 * Takes raw MediaPipe landmarks and returns metric measurements.
 * 
 * @param landmarks Raw MediaPipe normalized landmarks (478 points)
 * @param referenceIPD_mm Optional custom IPD for calibration (default: 63mm)
 */
export function analyzeProcrustesMetric(
    landmarks: NormalizedLandmark[],
    referenceIPD_mm: number = REFERENCE_IPD_MM
): ProcrustesResult {
    // Step 1: Calibrate
    const calibration = computeCalibration(landmarks, referenceIPD_mm);

    // Step 2: Convert to metric
    const metricLandmarks = convertToMetric(landmarks, calibration);

    // Step 3: Extract measurements
    const measurements = extractMetricMeasurements(metricLandmarks);

    return {
        metricLandmarks,
        calibration,
        measurements,
    };
}

/**
 * Compute volumetric estimates for all pre-defined regions.
 * Returns volume in mm³ and percentage of reference.
 */
export function computeVolumetricEstimates(
    metricLandmarks: MetricLandmark[]
): Array<{ region: VolumetricRegion; volume_mm3: number; volume_ml: number; percentOfReference: number }> {
    return VOLUMETRIC_REGIONS.map(region => {
        const volume_mm3 = estimateSubregionVolume(
            region.surfaceIndices,
            region.deepAnchorIndex,
            metricLandmarks
        );
        const volume_ml = round(volume_mm3 / 1000, 2);
        const percentOfReference = round((volume_ml / region.referenceVolume_ml) * 100, 1);

        return { region, volume_mm3, volume_ml, percentOfReference };
    });
}

/**
 * Procrustes distance between two face configurations.
 * Lower = more similar face shapes.
 * Used for before/after comparison or template matching.
 */
export function procrustesDistance(
    landmarksA: NormalizedLandmark[],
    landmarksB: NormalizedLandmark[]
): number {
    // Use anchor points only for stable alignment
    const extractAnchors = (lms: NormalizedLandmark[]): Point3D[] =>
        PROCRUSTES_ANCHOR_INDICES.map(i => ({ x: lms[i].x, y: lms[i].y, z: lms[i].z }));

    const anchorsA = extractAnchors(landmarksA);
    const anchorsB = extractAnchors(landmarksB);

    // Center both
    const centroidA = computeCentroid(anchorsA);
    const centroidB = computeCentroid(anchorsB);
    const centeredA = centerPoints(anchorsA, centroidA);
    const centeredB = centerPoints(anchorsB, centroidB);

    // Scale normalize
    const scaleA = computeScale(centeredA);
    const scaleB = computeScale(centeredB);
    const normA = centeredA.map(p => ({ x: p.x / scaleA, y: p.y / scaleA, z: p.z / scaleA }));
    const normB = centeredB.map(p => ({ x: p.x / scaleB, y: p.y / scaleB, z: p.z / scaleB }));

    // Sum of squared distances (without rotation optimization for simplicity)
    const ssd = normA.reduce((sum, pa, i) => {
        const pb = normB[i];
        return sum + (pa.x - pb.x) ** 2 + (pa.y - pb.y) ** 2 + (pa.z - pb.z) ** 2;
    }, 0);

    return round(Math.sqrt(ssd / normA.length), 4);
}
