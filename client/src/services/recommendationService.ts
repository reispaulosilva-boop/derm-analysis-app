
import { type ParamId } from "@/pages/Analysis";

export interface Recommendation {
    id: string;
    type: "procedure" | "product" | "routine";
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    tags?: string[];
}

export interface AnalysisSummary {
    date: Date;
    scores: Record<ParamId, number>;
}

// ─── Knowledge Base (Mock Rules) ───
// In a real app, this would come from a database or CMS
const RULES = [
    {
        condition: (scores: Record<ParamId, number>) => (scores.erythema || 0) > 7,
        recommendation: {
            type: "procedure" as const,
            title: "Laser V-Beam (Pulsed Dye Laser)",
            description: "Indicado para tratar a vascularização intensa detectada. O laser atua especificamente na hemoglobina, reduzindo a vermelhidão difusa e vasos visíveis.",
            priority: "high" as const,
            tags: ["Clínico", "Vascular"],
        },
    },
    {
        condition: (scores: Record<ParamId, number>) => (scores.erythema || 0) > 4 && (scores.erythema || 0) <= 7,
        recommendation: {
            type: "product" as const,
            title: "Sérum Calmante com Niacinamida",
            description: "Para controle do eritema moderado. A Niacinamida ajuda a fortalecer a barreira cutânea e reduzir a inflamação.",
            priority: "medium" as const,
            tags: ["Home Care", "Anti-inflamatório"],
        },
    },
    {
        condition: (scores: Record<ParamId, number>) => (scores.spots || 0) > 6,
        recommendation: {
            type: "procedure" as const,
            title: "Laser Lavieen ou Luz Pulsada",
            description: "Para tratar as discromias identificadas. O tratamento visa uniformizar o tom da pele removendo o excesso de melanina.",
            priority: "high" as const,
            tags: ["Clínico", "Pigmento"],
        },
    },
    {
        condition: (scores: Record<ParamId, number>) => (scores.spots || 0) > 3 && (scores.spots || 0) <= 6,
        recommendation: {
            type: "product" as const,
            title: "Culltal Cistamina ou Ácido Tranexâmico",
            description: "Uso tópico para clareamento progressivo de manchas solares e melasma.",
            priority: "medium" as const,
            tags: ["Home Care", "Clareador"],
        },
    },
    {
        condition: (scores: Record<ParamId, number>) => (scores.wrinkles || 0) > 5,
        recommendation: {
            type: "procedure" as const,
            title: "Protocolo de Bioestimulador + Toxina",
            description: "Sugestão de associação de Sculptra/Radiesse para firmeza e Toxina Botulínica para rugas dinâmicas.",
            priority: "high" as const,
            tags: ["Injetável", "Rejuvenescimento"],
        },
    },
    {
        condition: (scores: Record<ParamId, number>) => (scores.pores || 0) > 6,
        recommendation: {
            type: "procedure" as const,
            title: "Microagulhamento Robótico (Morpheus/Secret)",
            description: "Para refinamento da textura e redução de poros dilatados através de estímulo de colágeno profundo.",
            priority: "medium" as const,
            tags: ["Tecnologia", "Textura"],
        },
    },
    {
        condition: (scores: Record<ParamId, number>) => (scores.texture || 0) > 7,
        recommendation: {
            type: "product" as const,
            title: "Ácidos Renovadores Noturnos",
            description: "Glicólico ou Retinóico para renovação celular acelerada e melhora da textura epidérmica.",
            priority: "medium" as const,
            tags: ["Home Care", "Renovação"],
        },
    },
];

export const recommendationService = {
    generateRecommendations(scores: Record<ParamId, number>): Recommendation[] {
        const results: Recommendation[] = [];

        RULES.forEach((rule, index) => {
            if (rule.condition(scores)) {
                results.push({
                    id: `rec-${index}-${Date.now()}`,
                    ...rule.recommendation,
                });
            }
        });

        // Sort by priority (high first)
        return results.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    },
};
