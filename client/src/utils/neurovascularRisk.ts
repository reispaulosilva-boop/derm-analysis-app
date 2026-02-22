/**
 * Neurovascular Risk Map — Danger Zone Definitions
 * 
 * Maps facial danger zones (arteries, nerves, foramina) to MediaPipe
 * Face Mesh landmark indices. Used to generate visual alerts when
 * injection points overlap critical vascular/neural structures.
 * 
 * Based on SKILL.md §6 — Mapa de Risco Neurovascular.
 */

export type RiskLevel = 'critical' | 'high' | 'moderate';

export interface DangerZone {
    id: string;
    /** Display name (Portuguese) */
    label: string;
    /** Anatomical structure at risk */
    structure: string;
    /** Clinical risk description */
    risk: string;
    /** Severity level */
    level: RiskLevel;
    /** MediaPipe landmark indices that define this zone's path */
    pathLandmarks: number[];
    /** Additional single-point landmarks to mark (foramina, etc.) */
    pointLandmarks: number[];
    /** Color for this zone's visualization */
    color: string;
    /** Whether to render as a path (true) or as point markers (false) */
    renderAsPath: boolean;
}

export const DANGER_ZONES: DangerZone[] = [
    // ─── Arteries ───
    {
        id: 'facial_artery',
        label: 'A. Facial',
        structure: 'Artéria Facial → Angular',
        risk: 'Injeção retrógrada → isquemia, necrose cutânea ou cegueira retiniana',
        level: 'critical',
        // Path: from mandibular notch up through nasolabial to medial canthus
        pathLandmarks: [
            // Emerges at mandible (antegonial notch)
            132,  // Lower jaw area
            58,   // Gonion right region
            // Travels up through nasolabial
            214,  // Near nasolabial fold
            210,  // Mid nasolabial
            // Continues as angular artery toward medial canthus
            122,  // Near infraorbital
            232,  // Near nose lateral wall
        ],
        pointLandmarks: [],
        color: '#ef4444', // red
        renderAsPath: true,
    },
    {
        id: 'facial_artery_left',
        label: 'A. Facial (E)',
        structure: 'Artéria Facial → Angular (Esquerda)',
        risk: 'Injeção retrógrada → isquemia, necrose cutânea ou cegueira retiniana',
        level: 'critical',
        pathLandmarks: [
            361,  // Lower jaw area (left)
            288,  // Gonion left region
            434,  // Near nasolabial fold (left)
            430,  // Mid nasolabial (left)
            351,  // Near infraorbital (left)
            452,  // Near nose lateral wall (left)
        ],
        pointLandmarks: [],
        color: '#ef4444',
        renderAsPath: true,
    },
    {
        id: 'labial_arteries',
        label: 'A. Labiais',
        structure: 'Artérias Labiais Superior e Inferior (submucosas)',
        risk: 'Injeção intra-arterial labial → necrose labial',
        level: 'critical',
        // Upper and lower lip arterial path
        pathLandmarks: [
            // Upper lip arc (behind vermillion border)
            61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
        ],
        pointLandmarks: [78, 308], // Commissures — highest risk
        color: '#dc2626',
        renderAsPath: true,
    },
    {
        id: 'temporal_artery',
        label: 'A. Temporal Sup.',
        structure: 'Artéria Temporal Superficial (ramos frontal e parietal)',
        risk: 'Dissecção vascular na fossa temporal',
        level: 'high',
        // Temporal region — lateral to eye
        pathLandmarks: [
            // Right temporal
            54, 103, 67, 109, 10,
        ],
        pointLandmarks: [],
        color: '#f97316', // orange
        renderAsPath: true,
    },
    {
        id: 'temporal_artery_left',
        label: 'A. Temporal Sup. (E)',
        structure: 'Artéria Temporal Superficial (Esquerda)',
        risk: 'Dissecção vascular na fossa temporal',
        level: 'high',
        pathLandmarks: [
            284, 332, 297, 338, 10,
        ],
        pointLandmarks: [],
        color: '#f97316',
        renderAsPath: true,
    },

    // ─── Foramina (Nerve Exits) ───
    {
        id: 'supraorbital_foramen',
        label: 'Forame Supraorbital',
        structure: 'N. Supraorbital (NC V₁)',
        risk: 'Anestesia frontal inadvertida',
        level: 'moderate',
        pathLandmarks: [],
        pointLandmarks: [
            // Right: above medial portion of orbit
            71,   // Supraorbital ridge right
            301,  // Supraorbital ridge left
        ],
        color: '#eab308', // yellow
        renderAsPath: false,
    },
    {
        id: 'infraorbital_foramen',
        label: 'Forame Infraorbital',
        structure: 'N. Infraorbital (NC V₂)',
        risk: 'Bloqueio neural → anestesia do terço médio',
        level: 'high',
        pathLandmarks: [],
        pointLandmarks: [
            123,  // Infraorbital area right
            352,  // Infraorbital area left
        ],
        color: '#f97316',
        renderAsPath: false,
    },
    {
        id: 'mental_foramen',
        label: 'Forame Mentoniano',
        structure: 'N. Mentoniano (NC V₃)',
        risk: 'Parestesia labial inferior e mentoniana',
        level: 'moderate',
        pathLandmarks: [],
        pointLandmarks: [
            199,  // Mental region right
            428,  // Mental region left
        ],
        color: '#eab308',
        renderAsPath: false,
    },
];

/**
 * Returns style properties based on risk level.
 */
export function getRiskLevelStyle(level: RiskLevel) {
    switch (level) {
        case 'critical':
            return {
                strokeWidth: 3,
                dashArray: '',
                opacity: 0.85,
                glowIntensity: 12,
                badgeColor: '#ef4444',
                badgeText: '⚠ CRÍTICO',
            };
        case 'high':
            return {
                strokeWidth: 2.5,
                dashArray: '6,3',
                opacity: 0.7,
                glowIntensity: 8,
                badgeColor: '#f97316',
                badgeText: '⚠ ALTO',
            };
        case 'moderate':
            return {
                strokeWidth: 2,
                dashArray: '4,4',
                opacity: 0.6,
                glowIntensity: 5,
                badgeColor: '#eab308',
                badgeText: '⚡ MODERADO',
            };
    }
}
