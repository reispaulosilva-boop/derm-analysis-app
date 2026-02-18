import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const apiKey = process.env.GEMINI_API_KEY;

// Schema definition for structured output
const schema: Schema = {
    description: "Dermatological analysis results",
    type: SchemaType.OBJECT,
    properties: {
        summary: {
            type: SchemaType.OBJECT,
            properties: {
                erythema_score: { type: SchemaType.NUMBER, description: "0-10 score for redness" },
                spots_score: { type: SchemaType.NUMBER, description: "0-10 score for spots/pigmentation" },
                wrinkles_score: { type: SchemaType.NUMBER, description: "0-10 score for wrinkles" },
                pores_score: { type: SchemaType.NUMBER, description: "0-10 score for enlarged pores" },
                texture_score: { type: SchemaType.NUMBER, description: "0-10 score for skin texture uniformity" },
                overall_health_score: { type: SchemaType.NUMBER, description: "0-10 overall skin health score" },
            },
            required: ["erythema_score", "spots_score", "wrinkles_score", "pores_score", "texture_score", "overall_health_score"],
        },
        detected_points: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    param: {
                        type: SchemaType.STRING,
                        enum: ["erythema", "spots", "wrinkles", "pores", "texture"],
                        description: "The parameter type being marked"
                    },
                    x: { type: SchemaType.NUMBER, description: "Horizontal position percentage (0-100)" },
                    y: { type: SchemaType.NUMBER, description: "Vertical position percentage (0-100)" },
                    score: { type: SchemaType.NUMBER, description: "Severity score at this specific point (0-10)" },
                    note: { type: SchemaType.STRING, description: "Short clinical observation note" },
                },
                required: ["param", "x", "y", "score", "note"],
            },
        },
        recommendations: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    title: { type: SchemaType.STRING },
                    description: { type: SchemaType.STRING },
                    priority: { type: SchemaType.STRING, enum: ["high", "medium", "low"] },
                    type: { type: SchemaType.STRING, enum: ["product", "procedure"] },
                },
                required: ["title", "description", "priority", "type"],
            },
        },
    },
    required: ["summary", "detected_points", "recommendations"],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS handling
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
    );

    if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    if (!apiKey) {
        return res.status(500).json({ error: "Server configuration error: GEMINI_API_KEY is missing" });
    }

    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({ error: "Image data is required" });
        }

        // Process base64 image (remove header if present)
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash", // Using the fast and capable flash model
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const prompt = `Atue como um assistente dermatológico especialista. Analise a imagem facial fornecida estritamente para fins de triagem estética (NÃO DIAGNÓSTICO MÉDICO). Avalie os seguintes parâmetros em uma escala de 0 a 10 (onde 10 é severo/muito visível e 0 é ausente): Eritema, Manchas, Rugas, Poros, Textura. Identifique também as coordenadas aproximadas (0-100% x, y) das áreas mais críticas para cada problema.`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg", // Assuming JPEG, but generic image handling usually works fine
                },
            },
        ]);

        const responseText = result.response.text();
        const analysisResult = JSON.parse(responseText);

        return res.status(200).json(analysisResult);
    } catch (error: any) {
        console.error("Error analyzing image:", error);
        return res.status(500).json({
            error: "Failed to analyze image",
            details: error.message || "Unknown error",
        });
    }
}
