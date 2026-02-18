import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const apiKey = process.env.GEMINI_API_KEY;

// ─── System Prompt ───
const SYSTEM_PROMPT = `
Você é uma IA dermatológica de elite. Sua tarefa é analisar a imagem facial para gerar dados que alimentarão um infográfico "Split-Screen" de alta tecnologia.

# CRITÉRIOS DE ANÁLISE (Obrigatório)
Analise a imagem e identifique APENAS as 3 ou 4 preocupações mais proeminentes desta lista exata:
1. "Acne & Blemishes" (acne, espinhas)
2. "Dark Spots & Pigmentation" (manchas, melasma, tom irregular)
3. "Pores & Texture" (poros dilatados, textura irregular)
4. "Wrinkles & Fine Lines" (rugas, linhas de expressão)
5. "Under-eye Concerns" (olheiras, inchaço)
6. "Dullness & Lack of Radiance" (pele opaca, sem viço)
7. "Redness & Inflammation" (eritema, rosácea)
8. "Dehydration & Barrier Damage" (pele seca, descamação)
9. "Loss of Firmness & Elasticity" (flacidez)
10. "Blackheads & Scarring" (cravos, cicatrizes)

# SISTEMA DE PONTUAÇÃO (Score 0-100%)
Para cada item detectado, atribua uma pontuação de severidade baseada na visibilidade visual:
- 0-33%: Mild (Leve)
- 34-66%: Moderate (Moderado)
- 67-100%: Significant (Significativo)

# FORMATO DE RESPOSTA (JSON OBRIGATÓRIO)
Retorne APENAS um objeto JSON. Não use markdown.
{
  "summary": {
    "erythema_score": number, // 0-100 (Redness)
    "spots_score": number,    // 0-100 (Dark Spots)
    "wrinkles_score": number, // 0-100 (Wrinkles)
    "pores_score": number,    // 0-100 (Pores)
    "texture_score": number,  // 0-100 (Texture)
    "overall_score": number   // 0-100 (Skin Health)
  },
  "detected_points": [
    {
      "param": "erythema" | "spots" | "wrinkles" | "pores" | "texture" | "undereye" | "dullness" | "dehydration" | "firmness" | "acne" | "blackheads",
      "x": number, // Posição X em porcentagem (0-100) da face onde o problema é mais visível no lado ESQUERDO da imagem original
      "y": number, // Posição Y em porcentagem (0-100)
      "score": number, // Score específico deste ponto (0-100)
      "label": "string", // Título curto ex: "Deep Wrinkle", "Hyperpigmentation", "Active Acne"
      "severity_label": "Mild" | "Moderate" | "Significant"
    }
  ],
  "treatment_recommendations": [
    {
      "concern": "string", // Ex: "For Dark Spots"
      "product": "string"  // Ex: "Vitamin C Serum Daily"
    }
  ]
}
`;

// ─── JSON Schema for Gemini structured output ───
const schema: Schema = {
    description: "Dermatological analysis results",
    type: SchemaType.OBJECT,
    properties: {
        summary: {
            type: SchemaType.OBJECT,
            properties: {
                erythema_score: { type: SchemaType.NUMBER, description: "Redness & Inflammation score (0-100)" },
                spots_score: { type: SchemaType.NUMBER, description: "Dark Spots & Pigmentation score (0-100)" },
                wrinkles_score: { type: SchemaType.NUMBER, description: "Wrinkles & Fine Lines score (0-100)" },
                pores_score: { type: SchemaType.NUMBER, description: "Pores score (0-100)" },
                texture_score: { type: SchemaType.NUMBER, description: "Texture irregularity score (0-100)" },
                overall_score: { type: SchemaType.NUMBER, description: "Overall skin health score (0-100)" },
            },
            required: ["erythema_score", "spots_score", "wrinkles_score", "pores_score", "texture_score", "overall_score"],
        },
        detected_points: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    param: {
                        type: SchemaType.STRING,
                        format: "enum",
                        enum: ["erythema", "spots", "wrinkles", "pores", "texture", "undereye", "dullness", "dehydration", "firmness", "acne", "blackheads"],
                        description: "The parameter type being marked"
                    },
                    x: { type: SchemaType.NUMBER, description: "Horizontal position percentage (0-100) da face onde o problema é mais visível no lado ESQUERDO da imagem original" },
                    y: { type: SchemaType.NUMBER, description: "Vertical position percentage (0-100)" },
                    score: { type: SchemaType.NUMBER, description: "Severity score at this specific point (0-100)" },
                    label: { type: SchemaType.STRING, description: "Short title describing the issue, e.g. Deep Wrinkle" },
                    severity_label: { type: SchemaType.STRING, format: "enum", enum: ["Mild", "Moderate", "Significant"], description: "Severity category" },
                },
                required: ["param", "x", "y", "score", "label", "severity_label"],
            },
        },
        treatment_recommendations: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    concern: { type: SchemaType.STRING, description: "The skin concern this treats, e.g. For Dark Spots" },
                    product: { type: SchemaType.STRING, description: "Recommended product or treatment, e.g. Vitamin C Serum Daily" },
                },
                required: ["concern", "product"],
            },
        },
    },
    required: ["summary", "detected_points", "treatment_recommendations"],
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
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const result = await model.generateContent([
            SYSTEM_PROMPT,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg",
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
