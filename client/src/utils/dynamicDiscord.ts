/**
 * Dynamic Discord Analysis Engine
 * 
 * Analyzes MediaPipe's 52 blendshape coefficients to detect and quantify
 * muscular hyperactivity across facial zones. Follows the SKILL.md protocol:
 * threshold > 0.65 → hyperactive zone → prioritize neurotoxin treatment.
 */
import { Classifications } from '@mediapipe/tasks-vision';

// ─── Clinical Zone Definitions ───
export interface ClinicalZone {
    id: string;
    label: string;
    labelPt: string;
    muscle: string;
    /** Blendshape category names that map to this zone */
    blendshapes: string[];
    /** Color used for visualization when inactive */
    color: string;
    /** Color used when hyperactive (> threshold) */
    alertColor: string;
    /** Landmark indices to anchor the visual overlay */
    anchorLandmarks: number[];
}

export const CLINICAL_ZONES: ClinicalZone[] = [
    {
        id: 'forehead',
        label: 'Forehead',
        labelPt: 'Fronte',
        muscle: 'Frontalis',
        blendshapes: ['browInnerUp', 'browOuterUpLeft', 'browOuterUpRight'],
        color: '#8b5cf6',
        alertColor: '#ef4444',
        anchorLandmarks: [10, 151, 9, 8, 107, 336],
    },
    {
        id: 'glabella',
        label: 'Glabella',
        labelPt: 'Glabela',
        muscle: 'Corrugator / Procerus',
        blendshapes: ['browDownLeft', 'browDownRight'],
        color: '#a78bfa',
        alertColor: '#ef4444',
        anchorLandmarks: [9, 8, 168, 6],
    },
    {
        id: 'periorbital_left',
        label: 'Periorbital L',
        labelPt: 'Periorbital E',
        muscle: 'Orbicularis Oculi (L)',
        blendshapes: ['eyeSquintLeft', 'eyeBlinkLeft', 'cheekSquintLeft'],
        color: '#3b82f6',
        alertColor: '#ef4444',
        anchorLandmarks: [33, 133, 157, 158, 159, 160, 161],
    },
    {
        id: 'periorbital_right',
        label: 'Periorbital R',
        labelPt: 'Periorbital D',
        muscle: 'Orbicularis Oculi (R)',
        blendshapes: ['eyeSquintRight', 'eyeBlinkRight', 'cheekSquintRight'],
        color: '#3b82f6',
        alertColor: '#ef4444',
        anchorLandmarks: [263, 362, 384, 385, 386, 387, 388],
    },
    {
        id: 'perioral',
        label: 'Perioral',
        labelPt: 'Perioral',
        muscle: 'Orbicularis Oris',
        blendshapes: ['mouthPucker', 'mouthFunnel', 'mouthShrugUpper', 'mouthShrugLower'],
        color: '#f59e0b',
        alertColor: '#ef4444',
        anchorLandmarks: [0, 13, 14, 17, 37, 267],
    },
    {
        id: 'smile',
        label: 'Smile Lines',
        labelPt: 'Sulco Nasolabial',
        muscle: 'Zigomático Maior / Levantador',
        blendshapes: ['mouthSmileLeft', 'mouthSmileRight', 'cheekPuff'],
        color: '#10b981',
        alertColor: '#ef4444',
        anchorLandmarks: [61, 291, 205, 425],
    },
    {
        id: 'depressor',
        label: 'Marionette',
        labelPt: 'Marionete / DAO',
        muscle: 'Depressor Anguli Oris',
        blendshapes: ['mouthFrownLeft', 'mouthFrownRight', 'mouthLowerDownLeft', 'mouthLowerDownRight'],
        color: '#ec4899',
        alertColor: '#ef4444',
        anchorLandmarks: [78, 308, 152],
    },
];

// ─── Result Types ───

export interface ZoneDiscordResult {
    zone: ClinicalZone;
    /** Average activation score (0.0 – 1.0) */
    score: number;
    /** Whether the zone exceeds the hyperactivity threshold */
    isHyperactive: boolean;
    /** Individual blendshape scores for this zone */
    details: { name: string; score: number }[];
}

export interface DynamicDiscordResult {
    /** Per-zone results */
    zones: ZoneDiscordResult[];
    /** Global discord score (0–100) */
    globalScore: number;
    /** Number of hyperactive zones */
    hyperactiveCount: number;
    /** Clinical summary */
    summary: string;
    /** Timestamp */
    timestamp: number;
}

// ─── Constants ───

/** Per SKILL.md: blendshape score > 0.65 = hyperactive */
export const HYPERACTIVITY_THRESHOLD = 0.65;

/** Minimum score to even register as "active" for visual feedback */
export const ACTIVITY_THRESHOLD = 0.15;

// ─── Analysis Function ───

/**
 * Analyzes a MediaPipe blendshapes result and returns the dynamic discord
 * assessment for all clinical zones.
 */
export function analyzeDynamicDiscord(
    faceBlendshapes: Classifications | null | undefined
): DynamicDiscordResult {
    const emptyResult: DynamicDiscordResult = {
        zones: CLINICAL_ZONES.map(zone => ({
            zone,
            score: 0,
            isHyperactive: false,
            details: [],
        })),
        globalScore: 0,
        hyperactiveCount: 0,
        summary: 'Sem dados de blendshape disponíveis.',
        timestamp: Date.now(),
    };

    if (!faceBlendshapes?.categories?.length) {
        return emptyResult;
    }

    const categories = faceBlendshapes.categories;
    const getScore = (name: string): number =>
        categories.find(c => c.categoryName === name)?.score ?? 0;

    const zoneResults: ZoneDiscordResult[] = CLINICAL_ZONES.map(zone => {
        const details = zone.blendshapes.map(bs => ({
            name: bs,
            score: getScore(bs),
        }));

        // Weighted average: use max-biased scoring to catch peak activations
        const scores = details.map(d => d.score);
        const maxScore = Math.max(...scores, 0);
        const avgScore = scores.length > 0
            ? scores.reduce((sum, s) => sum + s, 0) / scores.length
            : 0;

        // Blend: 60% max + 40% avg — peaks matter more clinically
        const compositeScore = maxScore * 0.6 + avgScore * 0.4;

        return {
            zone,
            score: compositeScore,
            isHyperactive: compositeScore > HYPERACTIVITY_THRESHOLD,
            details,
        };
    });

    const hyperactiveCount = zoneResults.filter(z => z.isHyperactive).length;
    const activeZones = zoneResults.filter(z => z.score > ACTIVITY_THRESHOLD);

    // Global score: weighted by zone importance (periorbital and forehead weigh more)
    const totalWeightedScore = zoneResults.reduce((sum, z) => sum + z.score, 0);
    const globalScore = Math.min(
        100,
        Math.round((totalWeightedScore / CLINICAL_ZONES.length) * 100)
    );

    // Generate clinical summary
    let summary: string;
    if (hyperactiveCount === 0) {
        if (activeZones.length === 0) {
            summary = 'Repouso facial detectado. Musculatura em estado basal.';
        } else {
            summary = `${activeZones.length} zona(s) com atividade leve. Dentro dos limites fisiológicos.`;
        }
    } else {
        const hyperNames = zoneResults
            .filter(z => z.isHyperactive)
            .map(z => z.zone.labelPt)
            .join(', ');
        summary = `⚠️ ${hyperactiveCount} zona(s) hiperativa(s): ${hyperNames}. Considerar neurotoxina prioritária.`;
    }

    return {
        zones: zoneResults,
        globalScore,
        hyperactiveCount,
        summary,
        timestamp: Date.now(),
    };
}

/**
 * Returns a color interpolated between green → yellow → red based on score.
 */
export function getZoneColor(score: number): string {
    if (score < ACTIVITY_THRESHOLD) return 'rgba(255,255,255,0.05)';
    if (score < 0.35) return 'rgba(16, 185, 129, 0.4)';   // green
    if (score < 0.50) return 'rgba(245, 158, 11, 0.5)';    // yellow
    if (score < HYPERACTIVITY_THRESHOLD) return 'rgba(249, 115, 22, 0.6)'; // orange
    return 'rgba(239, 68, 68, 0.75)'; // red — hyperactive
}

/**
 * Returns the opacity for a zone based on its score.
 */
export function getZoneOpacity(score: number): number {
    if (score < ACTIVITY_THRESHOLD) return 0.05;
    return Math.min(0.85, 0.2 + score * 0.8);
}
