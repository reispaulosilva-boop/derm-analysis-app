export interface AIAnalysisResult {
    summary: {
        erythema_score: number; // 0-100
        spots_score: number;
        wrinkles_score: number;
        pores_score: number;
        texture_score: number;
        overall_score: number;
    };
    detected_points: Array<{
        param: "erythema" | "spots" | "wrinkles" | "pores" | "texture";
        x: number;
        y: number;
        score: number; // 0-100
        label: string; // e.g. "Deep Wrinkle", "Hyperpigmentation"
        severity_label: "Mild" | "Moderate" | "Significant";
    }>;
    treatment_recommendations: Array<{
        concern: string; // e.g. "For Dark Spots"
        product: string; // e.g. "Vitamin C Serum Daily"
    }>;
}

const API_Endpoint = "/api/analyze";

// ─── Image Compression ───
// Vercel Hobby plan has a 4.5MB request body limit.
// We resize and compress the image on a canvas before sending.
const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.7;

async function compressImageBase64(dataUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;

            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                const scale = MAX_DIMENSION / Math.max(width, height);
                width = Math.round(width * scale);
                height = Math.round(height * scale);
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);

            const compressed = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
            resolve(compressed);
        };
        img.onerror = () => reject(new Error("Failed to load image for compression"));
        img.src = dataUrl;
    });
}

export const aiAnalysisService = {
    async analyzeImage(imageBase64: string): Promise<AIAnalysisResult> {
        const compressedImage = await compressImageBase64(imageBase64);

        const response = await fetch(API_Endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ image: compressedImage }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Analysis failed: ${response.statusText}`);
        }

        const data: AIAnalysisResult = await response.json();
        return data;
    }
};
