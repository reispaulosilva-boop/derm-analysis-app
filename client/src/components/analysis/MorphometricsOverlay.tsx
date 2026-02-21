import React from 'react';
import { NormalizedLandmark } from '@mediapipe/tasks-vision';
import {
    calculateIOD,
    calculateDistanceSymmetry,
    MORPHOMETRICS_LANDMARKS
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

    // 1. Extrair os Landmarks Base
    const rightEye = landmarks[MORPHOMETRICS_LANDMARKS.EYE_INNER_RIGHT[0]]; // 362
    const leftEye = landmarks[MORPHOMETRICS_LANDMARKS.EYE_INNER_LEFT[0]];   // 33

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

            <text x={toX(glabela.x) + 10} y={toY(leftEye.y) - 10} fill="#ef4444" fontSize="12" fontWeight="bold">
                IOD REF
            </text>

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
            {/* Distância entre canto esquerdo e o plano sagital */}
            <line
                x1={toX(glabela.x)}
                y1={toY(mouthCornerRight.y)}
                x2={toX(mouthCornerRight.x)}
                y2={toY(mouthCornerRight.y)}
                stroke="#3b82f6"
                strokeWidth="1"
                opacity="0.5"
            />

            {/* 4. Tracking Jawline (Mento Inferior gravitacional) */}
            <circle cx={toX(jawlineCenter.x)} cy={toY(jawlineCenter.y)} r="6" fill="#ec4899" filter="url(#neonGlowMorph)" />
            <path
                d={`M ${toX(landmarks[150].x)} ${toY(landmarks[150].y)} 
                   Q ${toX(jawlineCenter.x)} ${toY(jawlineCenter.y) + 20} 
                   ${toX(landmarks[379].x)} ${toY(landmarks[379].y)}`}
                fill="none"
                stroke="#ec4899"
                strokeWidth="3"
                strokeDasharray="6 6"
                opacity="0.8"
            />

            {/* Render HUD Data Box explicitly on the SVG space */}
            <g transform={`translate(${width - 220}, ${height * 0.4})`}>
                <rect width="200" height="110" rx="8" fill="rgba(0,0,0,0.7)" stroke="#10b981" strokeWidth="1" />
                <text x="15" y="25" fill="#10b981" fontSize="12" fontWeight="bold" letterSpacing="1">MÉTRICAS ESPACIAIS</text>

                <text x="15" y="45" fill="#a1a1aa" fontSize="11">Norma IOD:</text>
                <text x="150" y="45" fill="#ef4444" fontSize="11" fontWeight="bold">{(iod).toFixed(3)}</text>

                <text x="15" y="65" fill="#a1a1aa" fontSize="11">Assimetria G. (C):</text>
                <text x="150" y="65" fill="#f59e0b" fontSize="11" fontWeight="bold">{(mouthSymmetryDeviation).toFixed(4)}</text>

                <text x="15" y="85" fill="#a1a1aa" fontSize="11">Índice Distorção:</text>
                <text x="150" y="85" fill="#3b82f6" fontSize="11" fontWeight="bold">{(symmetryIndex).toFixed(3)}</text>
            </g>
        </svg>
    );
}
