import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FaceLandmarkerResult } from '@mediapipe/tasks-vision';

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

/**
 * Catmull-Rom spline to SVG path conversion
 */
function solveCatmullRom(data: { x: number, y: number }[], k: number = 1) {
    if (k == null) k = 1;
    const size = data.length;
    const last = size - 2;
    let path = `M${Math.round(data[0].x)},${Math.round(data[0].y)}`;

    for (let i = 0; i < size - 1; i++) {
        const p0 = i === 0 ? data[0] : data[i - 1];
        const p1 = data[i];
        const p2 = data[i + 1];
        const p3 = i === last ? p2 : data[i + 2];

        const cp1x = p1.x + (p2.x - p0.x) / 6 * k;
        const cp1y = p1.y + (p2.y - p0.y) / 6 * k;

        const cp2x = p2.x - (p3.x - p1.x) / 6 * k;
        const cp2y = p2.y - (p3.y - p1.y) / 6 * k;

        path += ` C${Math.round(cp1x)},${Math.round(cp1y)} ${Math.round(cp2x)},${Math.round(cp2y)} ${Math.round(p2.x)},${Math.round(p2.y)}`;
    }

    return path;
}

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

    // Generate smooth path data for face oval
    const faceOvalPath = useMemo(() => {
        const points = FACE_OVAL_INDICES.map(index => getPoint(index));
        // Close the loop by appending the first few points again for smoothness
        const closedPoints = [...points, points[0], points[1], points[2]];
        // We only need to solve up to the first point appended to close it visually
        // Actually, solveCatmullRom generates a path from 0 to N-1.
        // For a closed loop with Catmull-Rom, we need to handle wrapping carefully or just duplicate enough points.
        // A simpler approach for "Apple Design" smoothing is just to use enough points.

        // Let's use the closedPoints logic but generate path only for the original segment length + closure
        // Standard SVG path smoothing often uses 'S' command or calculating control points.
        return solveCatmullRom(closedPoints, 0.75); // 0.75 tension
    }, [landmarks, width, height]);

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
                    <stop offset="100%" stopColor="#00ffff" /> {/* Electric Cyan */}
                </linearGradient>

                {/* Glow Filter: Blurred copy behind sharp line */}
                <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                    {/* Thicker blur for the glow */}
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                        {/* The glow */}
                        <feMergeNode in="coloredBlur" />
                        {/* The original sharp line will be drawn on top by the shape itself if we don't merge here, 
                 but merging simplifies applied filters. 
                 However, to get "sharp line + blur", we usually draw the shape twice or use drop-shadow.
                 Let's stick to drop-shadow for simplicity + blur. */}
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Scanner Effect */}
            {!scannerComplete && (
                <motion.line
                    x1="0" y1="0" x2="100%" y2="0"
                    stroke="#00ffff"
                    strokeWidth="2"
                    initial={{ y1: 0, y2: 0, opacity: 0 }}
                    animate={{ y1: height, y2: height, opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 2, ease: "linear" }}
                    onAnimationComplete={() => setScannerComplete(true)}
                    style={{ filter: "drop-shadow(0 0 8px #00ffff)" }}
                />
            )}

            {/* Jawline / Face Oval Animation */}
            {/* Layer 1: The Glow (Blurred) */}
            {scannerComplete && (
                <>
                    <motion.path
                        d={faceOvalPath}
                        fill="none"
                        stroke="#00ffff"
                        strokeWidth="4"
                        strokeOpacity="0.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#neon-glow)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                            pathLength: 1,
                            opacity: [0.2, 0.5, 0.2]
                        }}
                        transition={{
                            pathLength: { duration: 2, ease: "easeInOut" },
                            opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                        }}
                    />
                    {/* Layer 2: The Sharp Line */}
                    <motion.path
                        d={faceOvalPath}
                        fill="none"
                        stroke="#00ffff"
                        strokeWidth="1.5" /* Thinner line request */
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                            pathLength: 1,
                            opacity: [0.6, 1, 0.6]
                        }}
                        transition={{
                            pathLength: { duration: 2, ease: "easeInOut" },
                            opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                        }}
                    />
                </>
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
                            stroke="#ef4444" // Keep red for alerts
                            strokeWidth="2"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1.5, opacity: 0 }}
                            transition={{
                                delay: 2 + (index * 0.2),
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeOut"
                            }}
                        />

                        <motion.circle
                            r="2"
                            fill="#ef4444"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 2 + (index * 0.2) }}
                        />

                        {/* Connecting line to mesh point */}
                        <motion.line
                            x1="0" y1="0" x2="0" y2="0" // In this component, we anchor to the mesh point, so 0,0 is the anchor.
                            // If we wanted to draw a line FROM the original POI TO the anchor, we'd need to inverse transform.
                            // But current logic snaps the whole marker to the anchor.
                            stroke="#ef4444"
                            strokeWidth="1"
                        />
                    </g>
                );
            })}
        </svg>
    );
};

export default FaceMeshOverlay;
