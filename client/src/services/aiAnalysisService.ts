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

// ─── Image Compression ───
// Vercel Hobby plan has a 4.5MB request body limit.
// A high-res photo as base64 easily exceeds this.
// We resize and compress the image on a canvas before sending.
const MAX_DIMENSION = 1024; // max width or height in px
const JPEG_QUALITY = 0.7;   // JPEG compression quality

async function compressImageBase64(dataUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;

            // Scale down if needed
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

            // Convert to JPEG base64 with compression
            const compressed = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
            resolve(compressed);
        };
        img.onerror = () => reject(new Error("Failed to load image for compression"));
        img.src = dataUrl;
    });
}

export const aiAnalysisService = {
    async analyzeImage(imageBase64: string): Promise<AIAnalysisResult> {
        // Compress image before sending to stay under Vercel's 4.5MB limit
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
