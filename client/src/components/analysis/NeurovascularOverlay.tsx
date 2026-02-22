/**
 * NeurovascularOverlay
 * 
 * SVG overlay that renders facial danger zones (arteries, nerves, foramina)
 * over the face mesh. Shows arterial paths as red flowing lines, nerve
 * foramina as pulsating warning points, and a legend panel.
 */
import { NormalizedLandmark } from '@mediapipe/tasks-vision';
import {
    DANGER_ZONES,
    getRiskLevelStyle,
    type DangerZone,
    type RiskLevel,
} from '../../utils/neurovascularRisk';

interface NeurovascularOverlayProps {
    landmarks: NormalizedLandmark[];
    width: number;
    height: number;
}

export default function NeurovascularOverlay({
    landmarks,
    width,
    height,
}: NeurovascularOverlayProps) {
    if (!landmarks || landmarks.length === 0) return null;

    const tx = (idx: number) => (landmarks[idx]?.x ?? 0) * width;
    const ty = (idx: number) => (landmarks[idx]?.y ?? 0) * height;

    // Build an SVG path string from landmark indices
    const buildPath = (indices: number[]): string => {
        const valid = indices.filter(i => i < landmarks.length);
        if (valid.length < 2) return '';

        // Use quadratic curves for smoother arterial paths
        let d = `M ${tx(valid[0])} ${ty(valid[0])}`;

        for (let i = 1; i < valid.length; i++) {
            const prev = valid[i - 1];
            const curr = valid[i];
            // Midpoint for smooth curves
            const mx = (tx(prev) + tx(curr)) / 2;
            const my = (ty(prev) + ty(curr)) / 2;

            if (i === 1) {
                d += ` Q ${tx(prev)} ${ty(prev)}, ${mx} ${my}`;
            } else {
                d += ` T ${tx(curr)} ${ty(curr)}`;
            }
        }

        return d;
    };

    // Legend dimensions
    const legendX = 8;
    const legendY = 8;
    const legendW = Math.min(200, width * 0.45);

    return (
        <svg
            className="absolute inset-0 z-35 pointer-events-none"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
        >
            <defs>
                {/* Glow filters per risk level */}
                <filter id="nv-glow-critical" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="nv-glow-high" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="nv-glow-moderate" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* Animated dash for arterial flow */}
                <style>{`
                    @keyframes nv-flow {
                        to { stroke-dashoffset: -24; }
                    }
                    .nv-arterial-flow {
                        animation: nv-flow 1.2s linear infinite;
                    }
                    @keyframes nv-pulse {
                        0%, 100% { r: 6; opacity: 0.8; }
                        50% { r: 10; opacity: 0.4; }
                    }
                    .nv-foramen-pulse {
                        animation: nv-pulse 1.5s ease-in-out infinite;
                    }
                `}</style>
            </defs>

            {/* ─── Render Danger Zones ─── */}
            {DANGER_ZONES.map((zone: DangerZone) => {
                const style = getRiskLevelStyle(zone.level);
                const glowFilter = `url(#nv-glow-${zone.level})`;

                return (
                    <g key={zone.id}>
                        {/* Arterial paths */}
                        {zone.renderAsPath && zone.pathLandmarks.length >= 2 && (() => {
                            const pathD = buildPath(zone.pathLandmarks);
                            if (!pathD) return null;

                            return (
                                <>
                                    {/* Glow underlay */}
                                    <path
                                        d={pathD}
                                        fill="none"
                                        stroke={zone.color}
                                        strokeWidth={style.strokeWidth + 4}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        opacity={0.2}
                                        filter={glowFilter}
                                    />
                                    {/* Main arterial line */}
                                    <path
                                        d={pathD}
                                        fill="none"
                                        stroke={zone.color}
                                        strokeWidth={style.strokeWidth}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        opacity={style.opacity}
                                        strokeDasharray={zone.level === 'critical' ? '8,4' : style.dashArray}
                                        className={zone.level === 'critical' ? 'nv-arterial-flow' : ''}
                                    />
                                    {/* Start/end point markers */}
                                    {zone.pathLandmarks.length > 0 && (
                                        <>
                                            <circle
                                                cx={tx(zone.pathLandmarks[0])}
                                                cy={ty(zone.pathLandmarks[0])}
                                                r={4}
                                                fill={zone.color}
                                                stroke="white"
                                                strokeWidth={1}
                                                opacity={0.9}
                                            />
                                            <circle
                                                cx={tx(zone.pathLandmarks[zone.pathLandmarks.length - 1])}
                                                cy={ty(zone.pathLandmarks[zone.pathLandmarks.length - 1])}
                                                r={4}
                                                fill={zone.color}
                                                stroke="white"
                                                strokeWidth={1}
                                                opacity={0.9}
                                            />
                                        </>
                                    )}
                                </>
                            );
                        })()}

                        {/* Foramina / Point markers */}
                        {zone.pointLandmarks.map((idx: number) => {
                            if (idx >= landmarks.length) return null;
                            const x = tx(idx);
                            const y = ty(idx);

                            return (
                                <g key={`${zone.id}-pt-${idx}`}>
                                    {/* Pulsating outer ring */}
                                    <circle
                                        cx={x}
                                        cy={y}
                                        r={8}
                                        fill="none"
                                        stroke={zone.color}
                                        strokeWidth={1.5}
                                        className="nv-foramen-pulse"
                                    />
                                    {/* Solid center */}
                                    <circle
                                        cx={x}
                                        cy={y}
                                        r={5}
                                        fill={zone.color}
                                        stroke="white"
                                        strokeWidth={1.5}
                                        opacity={0.9}
                                        filter={glowFilter}
                                    />
                                    {/* Cross marker for foramina */}
                                    <line
                                        x1={x - 3} y1={y}
                                        x2={x + 3} y2={y}
                                        stroke="white" strokeWidth={1.5}
                                    />
                                    <line
                                        x1={x} y1={y - 3}
                                        x2={x} y2={y + 3}
                                        stroke="white" strokeWidth={1.5}
                                    />
                                    {/* Label */}
                                    <text
                                        x={x}
                                        y={y - 14}
                                        fill={zone.color}
                                        fontSize="9"
                                        fontWeight="bold"
                                        textAnchor="middle"
                                        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                                    >
                                        {zone.label}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Path label — positioned at midpoint */}
                        {zone.renderAsPath && zone.pathLandmarks.length >= 2 && (() => {
                            const midIdx = Math.floor(zone.pathLandmarks.length / 2);
                            const midLm = zone.pathLandmarks[midIdx];
                            if (midLm >= landmarks.length) return null;

                            return (
                                <text
                                    x={tx(midLm) + 12}
                                    y={ty(midLm) - 8}
                                    fill={zone.color}
                                    fontSize="9"
                                    fontWeight="bold"
                                    style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                                >
                                    {zone.label}
                                </text>
                            );
                        })()}
                    </g>
                );
            })}

            {/* ─── Legend Panel ─── */}
            <g>
                <rect
                    x={legendX}
                    y={legendY}
                    width={legendW}
                    height={88}
                    rx={8}
                    fill="rgba(0, 0, 0, 0.75)"
                    stroke="rgba(239, 68, 68, 0.3)"
                    strokeWidth={1}
                />
                {/* Title */}
                <text
                    x={legendX + 10}
                    y={legendY + 16}
                    fill="rgba(255,255,255,0.7)"
                    fontSize="9"
                    fontWeight="bold"
                    letterSpacing="1.5"
                >
                    ⚠ MAPA NEUROVASCULAR
                </text>

                {/* Risk level indicators */}
                {([
                    { level: 'critical' as RiskLevel, label: 'Crítico — Artéria terminal', color: '#ef4444' },
                    { level: 'high' as RiskLevel, label: 'Alto — Ramo arterial/neural', color: '#f97316' },
                    { level: 'moderate' as RiskLevel, label: 'Moderado — Forame neural', color: '#eab308' },
                ]).map((item, i) => (
                    <g key={item.level}>
                        <circle
                            cx={legendX + 16}
                            cy={legendY + 34 + i * 18}
                            r={4}
                            fill={item.color}
                        />
                        <text
                            x={legendX + 26}
                            y={legendY + 37 + i * 18}
                            fill="rgba(255,255,255,0.65)"
                            fontSize="8.5"
                        >
                            {item.label}
                        </text>
                    </g>
                ))}
            </g>
        </svg>
    );
}
