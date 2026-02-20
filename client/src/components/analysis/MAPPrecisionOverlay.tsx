import { NormalizedLandmark } from '@mediapipe/tasks-vision';

interface MAPPrecisionOverlayProps {
    landmarks: NormalizedLandmark[];
    width: number;
    height: number;
}

export default function MAPPrecisionOverlay({ landmarks, width, height }: MAPPrecisionOverlayProps) {
    if (!landmarks || landmarks.length === 0) return null;

    // Upper Third - Glabela / Fronte
    const glabela = [10, 151, 9, 8, 168, 6];

    // Upper Third - Periocular
    const periocularLeft = [33, 161, 160, 159, 158, 157, 133];
    const periocularRight = [263, 388, 387, 386, 385, 384, 362];

    // Middle Third - Malar / Zygomatic
    const malarLeft = [116, 117, 118, 119, 120, 121];
    const malarRight = [345, 346, 347, 348, 349, 350];

    const createPath = (indices: number[], close = false) => {
        const validIndices = indices.filter(i => i < landmarks.length);
        if (validIndices.length === 0) return '';

        const path = validIndices.map((idx, i) => {
            const pt = landmarks[idx];
            const cmd = i === 0 ? 'M' : 'L';
            return `${cmd} ${pt.x * width} ${pt.y * height}`;
        }).join(' ');

        return close ? `${path} Z` : path;
    };

    const drawPoints = (indices: number[], color: string, glowColor: string) => {
        return indices.filter(i => i < landmarks.length).map(idx => {
            const pt = landmarks[idx];
            return (
                <g key={idx}>
                    <circle
                        cx={pt.x * width}
                        cy={pt.y * height}
                        r={6}
                        fill={glowColor}
                        className="animate-ping opacity-30"
                    />
                    <circle
                        cx={pt.x * width}
                        cy={pt.y * height}
                        r={2.5}
                        fill={color}
                    />
                </g>
            );
        });
    };

    return (
        <svg
            className="absolute inset-0 z-30 pointer-events-none"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
        >
            <defs>
                <linearGradient id="glabelaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="periocularGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="malarGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* Upper Third - Glabela / Fronte */}
            <path
                d={createPath(glabela, false)}
                fill="none"
                stroke="url(#glabelaGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
            />
            {drawPoints(glabela, "#ffffff", "#c4b5fd")}

            {/* Upper Third - Periocular */}
            <path
                d={createPath(periocularLeft, false)}
                fill="none"
                stroke="url(#periocularGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
            />
            <path
                d={createPath(periocularRight, false)}
                fill="none"
                stroke="url(#periocularGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
            />
            {drawPoints(periocularLeft, "#ffffff", "#93c5fd")}
            {drawPoints(periocularRight, "#ffffff", "#93c5fd")}

            {/* Middle Third - Malar / Zygomatic */}
            <path
                d={createPath(malarLeft, false)}
                fill="none"
                stroke="url(#malarGrad)"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
            />
            <path
                d={createPath(malarRight, false)}
                fill="none"
                stroke="url(#malarGrad)"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
            />
            {drawPoints(malarLeft, "#ffffff", "#6ee7b7")}
            {drawPoints(malarRight, "#ffffff", "#6ee7b7")}

            {/* Info Labels */}
            <g className="opacity-90">
                {/* Upper Third Label */}
                {glabela[0] < landmarks.length && (
                    <text
                        x={landmarks[glabela[0]].x * width}
                        y={(landmarks[glabela[0]].y * height) - 20}
                        fill="#8b5cf6"
                        fontSize="12"
                        fontWeight="bold"
                        textAnchor="middle"
                        filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.8))"
                    >
                        TERÇO SUPERIOR
                    </text>
                )}

                {/* Middle Third Labels */}
                {malarLeft[2] < landmarks.length && (
                    <text
                        x={(landmarks[malarLeft[2]].x * width) - 15}
                        y={(landmarks[malarLeft[2]].y * height) + 30}
                        fill="#10b981"
                        fontSize="11"
                        fontWeight="bold"
                        textAnchor="end"
                        filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.8))"
                    >
                        TERÇO MÉDIO (MALAR)
                    </text>
                )}
                {malarRight[2] < landmarks.length && (
                    <text
                        x={(landmarks[malarRight[2]].x * width) + 15}
                        y={(landmarks[malarRight[2]].y * height) + 30}
                        fill="#10b981"
                        fontSize="11"
                        fontWeight="bold"
                        textAnchor="start"
                        filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.8))"
                    >
                        TERÇO MÉDIO (MALAR)
                    </text>
                )}
            </g>
        </svg>
    );
}
