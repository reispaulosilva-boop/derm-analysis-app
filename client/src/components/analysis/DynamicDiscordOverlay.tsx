/**
 * DynamicDiscordOverlay
 * 
 * Real-time SVG overlay for the live camera that visualizes muscular
 * hyperactivity zones detected via blendshapes. Shows heat zones over
 * the face and a HUD panel with per-zone activity bars.
 */
import { NormalizedLandmark } from '@mediapipe/tasks-vision';
import {
    type DynamicDiscordResult,
    type ZoneDiscordResult,
    HYPERACTIVITY_THRESHOLD,
    ACTIVITY_THRESHOLD,
    getZoneColor,
} from '../../utils/dynamicDiscord';

interface DynamicDiscordOverlayProps {
    result: DynamicDiscordResult;
    landmarks: NormalizedLandmark[];
    width: number;
    height: number;
}

export default function DynamicDiscordOverlay({
    result,
    landmarks,
    width,
    height,
}: DynamicDiscordOverlayProps) {
    if (!result || !landmarks || landmarks.length === 0) return null;

    const tx = (idx: number) => (landmarks[idx]?.x ?? 0) * width;
    const ty = (idx: number) => (landmarks[idx]?.y ?? 0) * height;

    // Calculate centroid of anchor landmarks for a zone
    const getZoneCentroid = (anchorIndices: number[]) => {
        const valid = anchorIndices.filter(i => i < landmarks.length);
        if (valid.length === 0) return { x: 0, y: 0 };
        const sumX = valid.reduce((s, i) => s + tx(i), 0);
        const sumY = valid.reduce((s, i) => s + ty(i), 0);
        return { x: sumX / valid.length, y: sumY / valid.length };
    };

    // Get radius for zone ellipse based on anchor spread
    const getZoneRadius = (anchorIndices: number[]) => {
        const valid = anchorIndices.filter(i => i < landmarks.length);
        if (valid.length < 2) return { rx: 20, ry: 15 };
        const xs = valid.map(i => tx(i));
        const ys = valid.map(i => ty(i));
        const rx = (Math.max(...xs) - Math.min(...xs)) / 2 + 10;
        const ry = (Math.max(...ys) - Math.min(...ys)) / 2 + 10;
        return { rx: Math.max(rx, 15), ry: Math.max(ry, 12) };
    };

    const activeZones = result.zones.filter((z: ZoneDiscordResult) => z.score > ACTIVITY_THRESHOLD);

    // HUD dimensions
    const hudHeight = 140;
    const hudY = height - hudHeight - 10;
    const barWidth = Math.min(120, (width - 40) / result.zones.length - 8);

    return (
        <svg
            className="absolute inset-0 z-40 pointer-events-none"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
        >
            <defs>
                {/* Glow filter for hyperactive zones */}
                <filter id="dd-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="dd-glow-strong" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="14" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                {/* Background blur for HUD */}
                <filter id="dd-bg-blur">
                    <feGaussianBlur stdDeviation="4" />
                </filter>
            </defs>

            {/* ─── Heat Zone Ellipses ─── */}
            {activeZones.map((zr: ZoneDiscordResult) => {
                const centroid = getZoneCentroid(zr.zone.anchorLandmarks);
                const { rx, ry } = getZoneRadius(zr.zone.anchorLandmarks);
                const color = getZoneColor(zr.score);
                const isHot = zr.isHyperactive;

                return (
                    <g key={zr.zone.id}>
                        {/* Outer glow for hyperactive zones */}
                        {isHot && (
                            <ellipse
                                cx={centroid.x}
                                cy={centroid.y}
                                rx={rx + 8}
                                ry={ry + 8}
                                fill="none"
                                stroke="rgba(239, 68, 68, 0.6)"
                                strokeWidth="2"
                                filter="url(#dd-glow-strong)"
                            >
                                <animate
                                    attributeName="stroke-opacity"
                                    values="0.3;0.8;0.3"
                                    dur="1.5s"
                                    repeatCount="indefinite"
                                />
                            </ellipse>
                        )}

                        {/* Zone ellipse */}
                        <ellipse
                            cx={centroid.x}
                            cy={centroid.y}
                            rx={rx}
                            ry={ry}
                            fill={color}
                            stroke={isHot ? '#ef4444' : 'rgba(255,255,255,0.3)'}
                            strokeWidth={isHot ? 2 : 1}
                            filter={isHot ? 'url(#dd-glow)' : undefined}
                        />

                        {/* Score label */}
                        <text
                            x={centroid.x}
                            y={centroid.y - ry - 8}
                            fill={isHot ? '#fca5a5' : 'rgba(255,255,255,0.8)'}
                            fontSize="11"
                            fontWeight="bold"
                            textAnchor="middle"
                            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                        >
                            {zr.zone.labelPt}
                        </text>
                        <text
                            x={centroid.x}
                            y={centroid.y + 4}
                            fill="white"
                            fontSize={isHot ? '16' : '13'}
                            fontWeight="bold"
                            textAnchor="middle"
                            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}
                        >
                            {Math.round(zr.score * 100)}%
                        </text>

                        {/* Neurotoxin badge for hyperactive zones */}
                        {isHot && (
                            <g>
                                <circle
                                    cx={centroid.x + rx - 4}
                                    cy={centroid.y - ry + 4}
                                    r={10}
                                    fill="#ef4444"
                                    stroke="white"
                                    strokeWidth="1.5"
                                >
                                    <animate
                                        attributeName="r"
                                        values="9;12;9"
                                        dur="1s"
                                        repeatCount="indefinite"
                                    />
                                </circle>
                                {/* Syringe icon (simple) */}
                                <text
                                    x={centroid.x + rx - 4}
                                    y={centroid.y - ry + 8}
                                    fill="white"
                                    fontSize="11"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                >
                                    💉
                                </text>
                            </g>
                        )}
                    </g>
                );
            })}

            {/* ─── Bottom HUD Panel ─── */}
            <g>
                {/* HUD Background */}
                <rect
                    x={4}
                    y={hudY}
                    width={width - 8}
                    height={hudHeight}
                    rx={12}
                    fill="rgba(0, 0, 0, 0.75)"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth={1}
                />

                {/* Title */}
                <text
                    x={16}
                    y={hudY + 20}
                    fill="rgba(255,255,255,0.6)"
                    fontSize="10"
                    fontWeight="bold"
                    letterSpacing="2"
                >
                    DISCÓRDIA DINÂMICA
                </text>

                {/* Global score */}
                <text
                    x={width - 16}
                    y={hudY + 20}
                    fill={result.hyperactiveCount > 0 ? '#fca5a5' : '#6ee7b7'}
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="end"
                >
                    {result.hyperactiveCount > 0
                        ? `⚠ ${result.hyperactiveCount} HIPERATIVA(S)`
                        : '✓ NORMAL'}
                </text>

                {/* Per-zone activity bars */}
                {result.zones.map((zr: ZoneDiscordResult, i: number) => {
                    const barX = 12 + i * (barWidth + 6);
                    const barBaseY = hudY + 100;
                    const maxBarHeight = 55;
                    const filledHeight = Math.max(2, zr.score * maxBarHeight);
                    const barColor = zr.isHyperactive
                        ? '#ef4444'
                        : zr.score > 0.35
                            ? '#f59e0b'
                            : '#10b981';

                    return (
                        <g key={zr.zone.id + '-bar'}>
                            {/* Bar background */}
                            <rect
                                x={barX}
                                y={barBaseY - maxBarHeight}
                                width={barWidth}
                                height={maxBarHeight}
                                rx={3}
                                fill="rgba(255,255,255,0.06)"
                            />
                            {/* Bar fill */}
                            <rect
                                x={barX}
                                y={barBaseY - filledHeight}
                                width={barWidth}
                                height={filledHeight}
                                rx={3}
                                fill={barColor}
                                opacity={0.85}
                            />
                            {/* Threshold line */}
                            <line
                                x1={barX}
                                y1={barBaseY - HYPERACTIVITY_THRESHOLD * maxBarHeight}
                                x2={barX + barWidth}
                                y2={barBaseY - HYPERACTIVITY_THRESHOLD * maxBarHeight}
                                stroke="rgba(239, 68, 68, 0.5)"
                                strokeWidth={1}
                                strokeDasharray="3,2"
                            />
                            {/* Zone label */}
                            <text
                                x={barX + barWidth / 2}
                                y={barBaseY + 14}
                                fill="rgba(255,255,255,0.6)"
                                fontSize="8"
                                fontWeight="600"
                                textAnchor="middle"
                            >
                                {zr.zone.labelPt.length > 10
                                    ? zr.zone.labelPt.substring(0, 8) + '…'
                                    : zr.zone.labelPt}
                            </text>
                            {/* Score value */}
                            <text
                                x={barX + barWidth / 2}
                                y={barBaseY - filledHeight - 4}
                                fill={barColor}
                                fontSize="9"
                                fontWeight="bold"
                                textAnchor="middle"
                            >
                                {Math.round(zr.score * 100)}
                            </text>
                        </g>
                    );
                })}

                {/* Summary text */}
                <text
                    x={12}
                    y={hudY + hudHeight - 8}
                    fill="rgba(255,255,255,0.45)"
                    fontSize="9"
                >
                    {result.summary.length > 80
                        ? result.summary.substring(0, 77) + '…'
                        : result.summary}
                </text>
            </g>
        </svg>
    );
}
