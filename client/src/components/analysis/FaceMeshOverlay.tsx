import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaceLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';

interface PointOfInterest {
    x: number;
    y: number;
    label?: string;
}

interface FaceMeshOverlayProps {
    results: FaceLandmarkerResult | null;
    width: number;
    height: number;
    pointsOfInterest?: PointOfInterest[];
}

// MediaPipe Face Mesh Face Oval indices
const FACE_OVAL_INDICES = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
    152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
];

const FaceMeshOverlay: React.FC<FaceMeshOverlayProps> = ({ results, width, height, pointsOfInterest = [] }) => {
    const [scannerComplete, setScannerComplete] = useState(false);

    if (!results || !results.faceLandmarks || results.faceLandmarks.length === 0) {
        return null;
    }

    const landmarks = results.faceLandmarks[0];

    // Helper to get coordinates
    const getPoint = (index: number) => {
        const landmark = landmarks[index];
        return {
            x: landmark.x * width,
            y: landmark.y * height,
        };
    };

    // Generate path data for face oval
    const faceOvalPath = FACE_OVAL_INDICES.map((index, i) => {
        const point = getPoint(index);
        return `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
    }).join(' ') + ' Z'; // Close the loop

    // Find nearest landmark to a point of interest
    const getNearestLandmark = (targetX: number, targetY: number) => {
        let minDistance = Infinity;
        let nearestPoint = { x: 0, y: 0 };

        landmarks.forEach((landmark) => {
            const lx = landmark.x * width;
            const ly = landmark.y * height;
            const distance = Math.sqrt(Math.pow(lx - targetX, 2) + Math.pow(ly - targetY, 2));

            if (distance < minDistance) {
                minDistance = distance;
                nearestPoint = { x: lx, y: ly };
            }
        });

        return nearestPoint;
    };

    return (
        <svg
            width={width}
            height={height}
            className="absolute top-0 left-0 pointer-events-none z-20"
            style={{ overflow: 'visible' }}
        >
            <defs>
                <linearGradient id="neon-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" /> {/* Cyan-500 */}
                    <stop offset="100%" stopColor="#10b981" /> {/* Emerald-500 */}
                </linearGradient>

                <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#06b6d4" floodOpacity="0.5" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Scanner Effect */}
            {!scannerComplete && (
                <motion.line
                    x1="0" y1="0" x2="100%" y2="0"
                    stroke="url(#neon-gradient)"
                    strokeWidth="3"
                    strokeOpacity="0.8"
                    initial={{ y1: 0, y2: 0, opacity: 0 }}
                    animate={{ y1: height, y2: height, opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 2, ease: "linear" }}
                    onAnimationComplete={() => setScannerComplete(true)}
                    style={{ filter: "drop-shadow(0 0 8px #06b6d4)" }}
                />
            )}

            {/* Jawline / Face Oval Animation */}
            {scannerComplete && (
                <motion.path
                    d={faceOvalPath}
                    fill="none"
                    stroke="url(#neon-gradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#neon-glow)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{
                        pathLength: 1,
                        opacity: [0.4, 0.8, 0.4]
                    }}
                    transition={{
                        pathLength: { duration: 2, ease: "easeInOut" },
                        opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                    }}
                />
            )}

            {/* Diagnostic Markers */}
            {scannerComplete && pointsOfInterest.map((poi, index) => {
                const anchor = getNearestLandmark(poi.x, poi.y);

                return (
                    <g key={index} transform={`translate(${anchor.x}, ${anchor.y})`}>
                        {/* Pulsating Circle */}
                        <motion.circle
                            r="4"
                            fill="none"
                            stroke="#ef4444" // Red-500
                            strokeWidth="2"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1.5, opacity: 0 }}
                            transition={{
                                delay: 2 + (index * 0.2), // Wait for face contour + index delay
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeOut"
                            }}
                        />

                        {/* Static Center */}
                        <motion.circle
                            r="2"
                            fill="#ef4444"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 2 + (index * 0.2) }}
                        />

                        {poi.label && (
                            <text
                                x="10"
                                y="5"
                                fill="white"
                                fontSize="10"
                                className="font-mono"
                                style={{ textShadow: '0 0 5px black' }}
                            >
                                {poi.label}
                            </text>
                        )}

                        {/* Connecting line to mesh point (optional visual flair) */}
                        <motion.line
                            x1="0" y1="0" x2="0" y2="0"
                            stroke="#ef4444"
                            strokeWidth="1"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 0.5 }}
                            transition={{ delay: 2 + (index * 0.2), duration: 0.5 }}
                        />
                    </g>
                );
            })}
        </svg>
    );
};

export default FaceMeshOverlay;
