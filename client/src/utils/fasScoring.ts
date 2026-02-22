/**
 * FAS Scoring Engine — Galderma Facial Assessment Scale (5 Domains)
 * 
 * Computes a holistic quantitative score across 5 clinical domains:
 * 1. Skin Quality — texture/photodamage (heuristic, requires image analysis)
 * 2. Face Shape — geometric classification quality
 * 3. Proportions — deviation from balanced thirds/fifths
 * 4. Symmetry — bilateral deviation (IOD-normalized)
 * 5. Expression — dynamic muscular discord
 * 
 * Each domain scores 0–100 (100 = ideal). Global FAS = weighted average.
 * Based on SKILL.md §5 — Galderma FAS™.
 */
import { type FaceShapeAnalysis } from './faceGeometry';
import { type FacialMetrics } from './morphometrics';
import { type DynamicDiscordResult } from './dynamicDiscord';

// ─── Domain Result ───

export interface FASDomainScore {
    id: string;
    label: string;
    labelPt: string;
    /** Score 0–100 (100 = ideal/youthful) */
    score: number;
    /** Classification label */
    grade: 'Excelente' | 'Bom' | 'Moderado' | 'Atenção' | 'Crítico';
    /** Brief interpretation */
    interpretation: string;
    /** Color for visualization */
    color: string;
    /** Weight in global score calculation */
    weight: number;
    /** Whether real data was used (false = heuristic/placeholder) */
    hasRealData: boolean;
}

export interface FASResult {
    domains: FASDomainScore[];
    /** Global weighted score 0–100 */
    globalScore: number;
    /** Global grade */
    globalGrade: 'Excelente' | 'Bom' | 'Moderado' | 'Atenção' | 'Crítico';
    /** Clinical summary */
    summary: string;
    timestamp: number;
}

// ─── Helpers ───

function getGrade(score: number): 'Excelente' | 'Bom' | 'Moderado' | 'Atenção' | 'Crítico' {
    if (score >= 85) return 'Excelente';
    if (score >= 70) return 'Bom';
    if (score >= 50) return 'Moderado';
    if (score >= 30) return 'Atenção';
    return 'Crítico';
}

function getGradeColor(grade: string): string {
    switch (grade) {
        case 'Excelente': return '#10b981';
        case 'Bom': return '#22d3ee';
        case 'Moderado': return '#f59e0b';
        case 'Atenção': return '#f97316';
        case 'Crítico': return '#ef4444';
        default: return '#6b7280';
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

// ─── Domain Scorers ───

/**
 * Domain 1: Skin Quality
 * Without true texture analysis (requires separate image processing),
 * we provide a baseline heuristic placeholder.
 * In a full implementation, this would use:
 * - Texture variance analysis
 * - Color histogram for pigmentation
 * - Wrinkle detection via edge analysis
 */
function scoreSkinQuality(): FASDomainScore {
    return {
        id: 'skin_quality',
        label: 'Skin Quality',
        labelPt: 'Qualidade da Pele',
        score: 0,
        grade: 'Moderado',
        interpretation: 'Análise de textura requer processamento de imagem dedicado. Ative a IA para este domínio.',
        color: '#6b7280',
        weight: 0.15,
        hasRealData: false,
    };
}

/**
 * Domain 2: Face Shape
 * Evaluates how well-defined and balanced the face shape classification is.
 * Uses the clarity of the geometric ratios (how far from ambiguous boundaries).
 */
function scoreFaceShape(faceShape: FaceShapeAnalysis | null): FASDomainScore {
    if (!faceShape) {
        return {
            id: 'face_shape',
            label: 'Face Shape',
            labelPt: 'Formato do Rosto',
            score: 0,
            grade: 'Moderado',
            interpretation: 'Dados de formato facial não disponíveis.',
            color: '#6b7280',
            weight: 0.20,
            hasRealData: false,
        };
    }

    const { facialIndex, midLowerRatio } = faceShape.metrics;

    // Score based on how well-defined the proportions are
    // Ideal: balanced oval (FI ~1.35-1.45, WR ~1.20-1.30)
    const fiDeviation = Math.abs(facialIndex - 1.40) / 0.40; // normalized deviation
    const wrDeviation = Math.abs(midLowerRatio - 1.25) / 0.35;
    const avgDeviation = (fiDeviation + wrDeviation) / 2;
    const score = clamp(Math.round((1 - avgDeviation) * 100), 20, 100);

    return {
        id: 'face_shape',
        label: 'Face Shape',
        labelPt: 'Formato do Rosto',
        score,
        grade: getGrade(score),
        interpretation: `${faceShape.shape} — Índice facial ${facialIndex.toFixed(2)}, proporção ${midLowerRatio.toFixed(2)}.`,
        color: getGradeColor(getGrade(score)),
        weight: 0.20,
        hasRealData: true,
    };
}

/**
 * Domain 3: Proportions
 * Evaluates facial thirds and fifths distribution.
 * Ideal: each third = 33.3%, each fifth = 20%.
 */
function scoreProportions(metrics: FacialMetrics | null): FASDomainScore {
    if (!metrics) {
        return {
            id: 'proportions',
            label: 'Proportions',
            labelPt: 'Proporções',
            score: 0,
            grade: 'Moderado',
            interpretation: 'Dados proporcionais não disponíveis.',
            color: '#6b7280',
            weight: 0.25,
            hasRealData: false,
        };
    }

    // Thirds deviation from ideal 33.3%
    const idealThird = 33.33;
    const thirdsDeviation = (
        Math.abs(metrics.third_upper_pct - idealThird) +
        Math.abs(metrics.third_middle_pct - idealThird) +
        Math.abs(metrics.third_lower_pct - idealThird)
    ) / 3;

    // Fifths deviation from ideal 20%
    const idealFifth = 20;
    const fifthsDeviation = (
        Math.abs(metrics.fifth_1_pct - idealFifth) +
        Math.abs(metrics.fifth_2_pct - idealFifth) +
        Math.abs(metrics.fifth_3_pct - idealFifth) +
        Math.abs(metrics.fifth_4_pct - idealFifth) +
        Math.abs(metrics.fifth_5_pct - idealFifth)
    ) / 5;

    // Combined: penalize deviation (max deviation ~30pct points → score ~25)
    const combinedDeviation = (thirdsDeviation * 0.6 + fifthsDeviation * 0.4) / 25;
    const score = clamp(Math.round((1 - combinedDeviation) * 100), 15, 100);

    const dominantThird = metrics.third_lower_pct > metrics.third_upper_pct + 3
        ? 'terço inferior dominante'
        : metrics.third_upper_pct > metrics.third_lower_pct + 3
            ? 'terço superior dominante'
            : 'terços equilibrados';

    return {
        id: 'proportions',
        label: 'Proportions',
        labelPt: 'Proporções',
        score,
        grade: getGrade(score),
        interpretation: `Terços: ${metrics.third_upper_pct}/${metrics.third_middle_pct}/${metrics.third_lower_pct}% — ${dominantThird}.`,
        color: getGradeColor(getGrade(score)),
        weight: 0.25,
        hasRealData: true,
    };
}

/**
 * Domain 4: Symmetry
 * Bilateral symmetry assessment using eye, brow, and global asymmetry metrics.
 */
function scoreSymmetry(metrics: FacialMetrics | null): FASDomainScore {
    if (!metrics) {
        return {
            id: 'symmetry',
            label: 'Symmetry',
            labelPt: 'Simetria',
            score: 0,
            grade: 'Moderado',
            interpretation: 'Dados de simetria não disponíveis.',
            color: '#6b7280',
            weight: 0.25,
            hasRealData: false,
        };
    }

    // eye_symmetry_pct and brow_symmetry_pct are deviation percentages (lower = more symmetric)
    // global_asymmetry_px is in pixel units
    const eyeScore = clamp(100 - metrics.eye_symmetry_pct * 5, 0, 100);
    const browScore = clamp(100 - metrics.brow_symmetry_pct * 5, 0, 100);

    // Global asymmetry: normalize by face width for scale-invariance
    const normalizedAsym = metrics.global_asymmetry_px / (metrics.face_width_px + 1e-9);
    const globalScore = clamp(100 - normalizedAsym * 800, 0, 100);

    const score = Math.round(eyeScore * 0.35 + browScore * 0.25 + globalScore * 0.40);

    let interpretation = '';
    if (score >= 85) interpretation = 'Simetria bilateral excelente. Desvios mínimos.';
    else if (score >= 70) interpretation = `Simetria boa. Desvio ocular ${metrics.eye_symmetry_pct.toFixed(1)}%, sobrancelhas ${metrics.brow_symmetry_pct.toFixed(1)}%.`;
    else interpretation = `Assimetria notável. Olhos: ${metrics.eye_symmetry_pct.toFixed(1)}%, sobrancelhas: ${metrics.brow_symmetry_pct.toFixed(1)}%.`;

    return {
        id: 'symmetry',
        label: 'Symmetry',
        labelPt: 'Simetria',
        score,
        grade: getGrade(score),
        interpretation,
        color: getGradeColor(getGrade(score)),
        weight: 0.25,
        hasRealData: true,
    };
}

/**
 * Domain 5: Expression (Dynamic Discord)
 * Uses blendshape analysis to score muscular hyperactivity.
 * Higher discord = lower score (more treatment needed).
 */
function scoreExpression(discordResult: DynamicDiscordResult | null): FASDomainScore {
    if (!discordResult) {
        return {
            id: 'expression',
            label: 'Expression',
            labelPt: 'Expressão',
            score: 0,
            grade: 'Moderado',
            interpretation: 'Análise dinâmica não realizada. Ative a Discórdia Dinâmica na câmera ao vivo.',
            color: '#6b7280',
            weight: 0.15,
            hasRealData: false,
        };
    }

    // Invert: lower global discord = better expression score
    const score = clamp(100 - discordResult.globalScore, 10, 100);
    const hyperCount = discordResult.hyperactiveCount;

    let interpretation = '';
    if (hyperCount === 0) {
        interpretation = 'Nenhuma zona hiperativa. Equilíbrio muscular facial normal.';
    } else {
        const zoneNames = discordResult.zones
            .filter(z => z.isHyperactive)
            .map(z => z.zone.labelPt)
            .join(', ');
        interpretation = `${hyperCount} zona(s) hiperativa(s): ${zoneNames}. Considerar neurotoxina.`;
    }

    return {
        id: 'expression',
        label: 'Expression',
        labelPt: 'Expressão',
        score,
        grade: getGrade(score),
        interpretation,
        color: getGradeColor(getGrade(score)),
        weight: 0.15,
        hasRealData: true,
    };
}

// ─── Main Scoring Function ───

export interface FASInputData {
    faceShape?: FaceShapeAnalysis | null;
    facialMetrics?: FacialMetrics | null;
    discordResult?: DynamicDiscordResult | null;
}

/**
 * Computes the full 5-domain FAS score.
 */
export function computeFASScore(data: FASInputData): FASResult {
    const domains: FASDomainScore[] = [
        scoreSkinQuality(),
        scoreFaceShape(data.faceShape ?? null),
        scoreProportions(data.facialMetrics ?? null),
        scoreSymmetry(data.facialMetrics ?? null),
        scoreExpression(data.discordResult ?? null),
    ];

    // Weighted global score (only count domains with real data)
    const activeDomains = domains.filter(d => d.hasRealData);
    let globalScore: number;

    if (activeDomains.length === 0) {
        globalScore = 0;
    } else {
        const totalWeight = activeDomains.reduce((sum, d) => sum + d.weight, 0);
        globalScore = Math.round(
            activeDomains.reduce((sum, d) => sum + d.score * d.weight, 0) / totalWeight
        );
    }

    const globalGrade = getGrade(globalScore);

    // Summary
    const activeCount = activeDomains.length;
    const weakest = activeDomains.length > 0
        ? activeDomains.reduce((min, d) => d.score < min.score ? d : min)
        : null;

    let summary: string;
    if (activeCount === 0) {
        summary = 'Nenhum domínio analisado. Carregue uma imagem e ative as análises.';
    } else {
        summary = `FAS Global: ${globalScore}/100 (${globalGrade}). ${activeCount}/5 domínios ativos.`;
        if (weakest && weakest.score < 60) {
            summary += ` Prioridade: ${weakest.labelPt} (${weakest.score}/100).`;
        }
    }

    return {
        domains,
        globalScore,
        globalGrade,
        summary,
        timestamp: Date.now(),
    };
}
