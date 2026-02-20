import { Classifications } from "@mediapipe/tasks-vision";

export interface ExpressionAnalysis {
    isNeutral: boolean;
    detectedExpression: string | null;
    score: number;
    warningMessage: string | null;
}

// Thresholds for expression detection
// These values are based on general observation of MediaPipe blendshapes
// and might need tuning.
const THRESHOLDS = {
    SMILE: 0.5,
    BROW_DOWN: 0.5,
    MOUTH_OPEN: 0.3
};

export function analyzeExpression(faceBlendshapes: Classifications): ExpressionAnalysis {
    if (!faceBlendshapes || !faceBlendshapes.categories) {
        return { isNeutral: true, detectedExpression: null, score: 0, warningMessage: null };
    }

    const categories = faceBlendshapes.categories;
    const getScore = (name: string) => categories.find(c => c.categoryName === name)?.score || 0;

    // 1. Smile Detection
    const smileLeft = getScore('mouthSmileLeft');
    const smileRight = getScore('mouthSmileRight');
    const avgSmile = (smileLeft + smileRight) / 2;

    if (avgSmile > THRESHOLDS.SMILE) {
        return {
            isNeutral: false,
            detectedExpression: 'Sorriso',
            score: avgSmile,
            warningMessage: 'Sorriso detectado. Para uma análise precisa, tente manter a expressão neutra.'
        };
    }

    // 2. Frown / Brow Down
    const browDownLeft = getScore('browDownLeft');
    const browDownRight = getScore('browDownRight');
    const avgBrowDown = (browDownLeft + browDownRight) / 2;

    if (avgBrowDown > THRESHOLDS.BROW_DOWN) {
        return {
            isNeutral: false,
            detectedExpression: 'Franzindo a testa',
            score: avgBrowDown,
            warningMessage: 'Expressão tensa detectada. Tente relaxar a testa para evitar falsas rugas.'
        };
    }

    // 3. Mouth Open
    const mouthOpen = getScore('jawOpen');
    if (mouthOpen > THRESHOLDS.MOUTH_OPEN) {
        return {
            isNeutral: false,
            detectedExpression: 'Boca aberta',
            score: mouthOpen,
            warningMessage: 'Boca aberta detectada. Mantenha os lábios fechados e relaxados.'
        };
    }

    return {
        isNeutral: true,
        detectedExpression: null,
        score: 0,
        warningMessage: null
    };
}
