import React from 'react';
import { NormalizedLandmark } from '@mediapipe/tasks-vision';
import {
    calculateIOD,
    calculateDistanceSymmetry,
    MORPHOMETRICS_LANDMARKS,
    FACIAL_EVAL_LANDMARKS,
    extractFacialMetrics
} from '@/utils/morphometrics';
import { motion } from 'framer-motion';

interface MorphometricsOverlayProps {
    landmarks: NormalizedLandmark[];
    width: number;
    height: number;
}

export default function MorphometricsOverlay({ landmarks, width, height }: MorphometricsOverlayProps) {
    if (!landmarks || landmarks.length === 0) return null;

    // Helper to map normalized coordinates to Canvas/SVG pixels
    const toX = (normX: number) => normX * width;
    const toY = (normY: number) => normY * height;

    const px = (idx: number) => ({
        x: toX(landmarks[idx].x),
        y: toY(landmarks[idx].y)
    });

    // 1. Extrair os Landmarks Base (Distância Intercantal Externa - Lateral a Lateral)
    const rightEye = landmarks[MORPHOMETRICS_LANDMARKS.EYE_OUTER_RIGHT]; // 263
    const leftEye = landmarks[MORPHOMETRICS_LANDMARKS.EYE_OUTER_LEFT];   // 33

    // Glabela ou ponta do nariz para eixo de reflexão Sagital X
    const glabela = landmarks[10];

    // Calculos Morfometricos Base:
    const iod = calculateIOD(rightEye, leftEye);

    // Avaliação do Terço Inferior (Marionete/Jawline)
    const mouthCornerRight = landmarks[MORPHOMETRICS_LANDMARKS.MOUTH_CORNER_RIGHT];
    const mouthCornerLeft = landmarks[MORPHOMETRICS_LANDMARKS.MOUTH_CORNER_LEFT];

    // Calcula Assimetria Rebatida (Distance Symmetry) no ponto das comissuras
    const mouthSymmetryDeviation = calculateDistanceSymmetry(mouthCornerRight, mouthCornerLeft, glabela.x);
    // Normalizar pelo IOD para ter um índice constante
    const symmetryIndex = mouthSymmetryDeviation / iod;

    // Cálculo vetorial basal mandibular (simples altura relativa)
    const jawlineCenter = landmarks[MORPHOMETRICS_LANDMARKS.MENTON];

    // --- Novas Métricas Aprofundadas ---
    const metrics = extractFacialMetrics(landmarks, width, height);

    // Coordenadas para Terços Faciais
    const ptForehead = px(FACIAL_EVAL_LANDMARKS.forehead_top);
    const ptGlabela = px(FACIAL_EVAL_LANDMARKS.glabela);
    const ptNasalBase = px(FACIAL_EVAL_LANDMARKS.nasal_base);
    const ptChin = px(FACIAL_EVAL_LANDMARKS.chin);
    const ptJawLeft = px(FACIAL_EVAL_LANDMARKS.jaw_left);
    const ptJawRight = px(FACIAL_EVAL_LANDMARKS.jaw_right);

    return (
        <svg
            width={width}
            height={height}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 30 }}
        >
            {/* Definições de Filtros de Brilho */}
            <defs>
                <filter id="neonGlowMorph" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* 1. Eixo Plano Sagital Mediano (Linha Bissetriz) */}
            <line
                x1={toX(glabela.x)}
                y1={0}
                x2={toX(glabela.x)}
                y2={height}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="8 8"
                opacity="0.6"
            />

            {/* Marcadores de Terços Faciais */}
            {[ptForehead, ptGlabela, ptNasalBase].map((pt, i) => (
                <line
                    key={`third-line-${i}`}
                    x1={pt.x - 30}
                    y1={pt.y}
                    x2={ptJawLeft.x + 30}
                    y2={pt.y}
                    stroke="#ffffff"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.5"
                />
            ))}
            {[ptForehead, ptGlabela, ptNasalBase, ptChin].map((pt, i) => (
                <circle key={`third-pt-${i}`} cx={pt.x} cy={pt.y} r="3" fill="#ff5050" />
            ))}
            <text x={ptGlabela.x + 10} y={(ptForehead.y + ptGlabela.y) / 2} fill="#ffffff" fontSize="10" opacity="0.8">
                Terço Sup. ({metrics.third_upper_pct}%)
            </text>
            <text x={ptGlabela.x + 10} y={(ptGlabela.y + ptNasalBase.y) / 2} fill="#ffffff" fontSize="10" opacity="0.8">
                Terço Méd. ({metrics.third_middle_pct}%)
            </text>
            <text x={ptNasalBase.x + 10} y={(ptNasalBase.y + ptChin.y) / 2} fill="#ffffff" fontSize="10" opacity="0.8">
                Terço Inf. ({metrics.third_lower_pct}%)
            </text>

            {/* Marcador Largura Facial */}
            <line
                x1={ptJawLeft.x}
                y1={ptJawLeft.y}
                x2={ptJawRight.x}
                y2={ptJawRight.y}
                stroke="#ffc800"
                strokeWidth="1.5"
                opacity="0.7"
            />
            <circle cx={ptJawLeft.x} cy={ptJawLeft.y} r="3" fill="#ffc800" />
            <circle cx={ptJawRight.x} cy={ptJawRight.y} r="3" fill="#ffc800" />

            {/* 2. Marcador IOD (Distância Interocular) Base */}
            <line
                x1={toX(leftEye.x)}
                y1={toY(leftEye.y)}
                x2={toX(rightEye.x)}
                y2={toY(rightEye.y)}
                stroke="#ef4444"
                strokeWidth="2"
                filter="url(#neonGlowMorph)"
            />
            <circle cx={toX(leftEye.x)} cy={toY(leftEye.y)} r="4" fill="#ef4444" />
            <circle cx={toX(rightEye.x)} cy={toY(rightEye.y)} r="4" fill="#ef4444" />

            {/* 3. Análise Vetorial de Assimetria: Comissuras Labiais (Linha de Marionete) */}
            <line
                x1={toX(mouthCornerLeft.x)}
                y1={toY(mouthCornerLeft.y)}
                x2={toX(mouthCornerRight.x)}
                y2={toY(mouthCornerRight.y)}
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="4 4"
            />
            <circle cx={toX(mouthCornerLeft.x)} cy={toY(mouthCornerLeft.y)} r="5" fill="#f59e0b" />
            <circle cx={toX(mouthCornerRight.x)} cy={toY(mouthCornerRight.y)} r="5" fill="#f59e0b" />

            {/* Draw reflected symmetry point bounds to visualize the deviation */}
            <line
                x1={toX(glabela.x)}
                y1={toY(mouthCornerRight.y)}
                x2={toX(mouthCornerRight.x)}
                y2={toY(mouthCornerRight.y)}
                stroke="#3b82f6"
                strokeWidth="1"
                opacity="0.5"
            />

            {/* HUD Data Box adaptado para exibir as novas métricas */}
            <g transform={`translate(${width - 240}, 20)`}>
                <rect width="220" height="230" rx="8" fill="rgba(10,15,30,0.85)" stroke="#10b981" strokeWidth="1" />
                <text x="15" y="25" fill="#10b981" fontSize="12" fontWeight="bold" letterSpacing="1">ANÁLISE ESPACIAL</text>

                <text x="15" y="50" fill="#a1a1aa" fontSize="11">Índice Facial (H/W):</text>
                <text x="160" y="50" fill={Math.abs(metrics.facial_index - 1.3) < 0.1 ? "#10b981" : "#ef4444"} fontSize="11" fontWeight="bold">{metrics.facial_index}</text>

                <text x="15" y="70" fill="#a1a1aa" fontSize="11">Simetria Ocular:</text>
                <text x="160" y="70" fill={metrics.eye_symmetry_pct < 5 ? "#10b981" : "#f59e0b"} fontSize="11" fontWeight="bold">{metrics.eye_symmetry_pct}%</text>

                <text x="15" y="90" fill="#a1a1aa" fontSize="11">Quinto Central:</text>
                <text x="160" y="90" fill={Math.abs(metrics.fifth_3_pct - 20) < 2 ? "#10b981" : "#3b82f6"} fontSize="11" fontWeight="bold">{metrics.fifth_3_pct}%</text>

                <text x="15" y="110" fill="#a1a1aa" fontSize="11">Índice Nasal (W/H):</text>
                <text x="160" y="110" fill={Math.abs(metrics.nasal_index - 0.67) < 0.1 ? "#10b981" : "#f59e0b"} fontSize="11" fontWeight="bold">{metrics.nasal_index}</text>

                <text x="15" y="130" fill="#a1a1aa" fontSize="11">Lábio (Sup/Inf):</text>
                <text x="160" y="130" fill={Math.abs(metrics.upper_lower_lip_ratio - 0.5) < 0.1 ? "#10b981" : "#3b82f6"} fontSize="11" fontWeight="bold">{metrics.upper_lower_lip_ratio}</text>

                <text x="15" y="150" fill="#a1a1aa" fontSize="11">Assimetria Global:</text>
                <text x="160" y="150" fill={metrics.global_asymmetry_px < 10 ? "#10b981" : "#ef4444"} fontSize="11" fontWeight="bold">{metrics.global_asymmetry_px}px</text>

                <path d="M 15 165 L 205 165" stroke="#3f3f46" strokeWidth="1" strokeDasharray="2 2" />

                <text x="15" y="185" fill="#a1a1aa" fontSize="11">Assimetria M. (C):</text>
                <text x="160" y="185" fill="#f59e0b" fontSize="11" fontWeight="bold">{(mouthSymmetryDeviation).toFixed(4)}</text>

                <text x="15" y="205" fill="#a1a1aa" fontSize="11">Índice Distorção:</text>
                <text x="160" y="205" fill="#3b82f6" fontSize="11" fontWeight="bold">{(symmetryIndex).toFixed(3)}</text>
            </g>
        </svg>
    );
}
