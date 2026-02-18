import { toast } from "sonner";

export interface AIAnalysisResult {
    summary: {
        erythema_score: number;
        spots_score: number;
        wrinkles_score: number;
        pores_score: number;
        texture_score: number;
        overall_health_score: number;
    };
    detected_points: Array<{
        param: "erythema" | "spots" | "wrinkles" | "pores" | "texture";
        x: number;
        y: number;
        score: number;
        note: string;
    }>;
    recommendations: Array<{
        title: string;
        description: string;
        priority: "high" | "medium" | "low";
        type: "product" | "procedure";
    }>;
}

const API_Endpoint = "/api/analyze";

export const aiAnalysisService = {
    async analyzeImage(imageBase64: string): Promise<AIAnalysisResult> {
        try {
            const response = await fetch(API_Endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ image: imageBase64 }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Analysis failed: ${response.statusText}`);
            }

            const data: AIAnalysisResult = await response.json();
            return data;
        } catch (error) {
            console.error("AI Analysis Error:", error);
            throw error;
        }
    }
};
