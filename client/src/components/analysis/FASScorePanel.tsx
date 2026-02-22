/**
 * FASScorePanel
 * 
 * A floating glass panel that displays the Galderma FAS 5-domain scoring.
 * Shows radial gauges for each domain, a global score, and clinical
 * interpretation text. Designed for the Analysis page overlay.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type FASResult, type FASDomainScore } from '../../utils/fasScoring';

interface FASScorePanelProps {
    result: FASResult;
    onClose: () => void;
}

// ─── Radial Gauge ───
function RadialGauge({
    score,
    color,
    size = 56,
    label,
    hasData,
}: {
    score: number;
    color: string;
    size?: number;
    label: string;
    hasData: boolean;
}) {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-1">
            <div className="relative">
                <svg width={size} height={size} className="transform -rotate-90">
                    {/* Track */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth={3}
                    />
                    {/* Value arc */}
                    {hasData && (
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke={color}
                            strokeWidth={3}
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            className="transition-all duration-700 ease-out"
                        />
                    )}
                </svg>
                <div
                    className="absolute inset-0 flex items-center justify-center font-bold tabular-nums"
                    style={{
                        fontSize: size * 0.28,
                        color: hasData ? color : 'rgba(255,255,255,0.25)',
                    }}
                >
                    {hasData ? score : '—'}
                </div>
            </div>
            <span className="text-[9px] text-white/50 font-medium text-center leading-tight max-w-[60px]">
                {label}
            </span>
        </div>
    );
}

// ─── Grade Badge ───
function GradeBadge({ grade, color }: { grade: string; color: string }) {
    return (
        <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
            style={{
                color,
                borderColor: color + '40',
                backgroundColor: color + '15',
            }}
        >
            {grade}
        </span>
    );
}

// ─── Domain Row ───
function DomainRow({ domain }: { domain: FASDomainScore }) {
    const barWidth = domain.hasRealData ? `${domain.score}%` : '0%';

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-white/70">{domain.labelPt}</span>
                <div className="flex items-center gap-1.5">
                    {domain.hasRealData ? (
                        <>
                            <span className="text-[10px] font-mono tabular-nums" style={{ color: domain.color }}>
                                {domain.score}
                            </span>
                            <GradeBadge grade={domain.grade} color={domain.color} />
                        </>
                    ) : (
                        <span className="text-[9px] text-white/30 italic">sem dados</span>
                    )}
                </div>
            </div>
            {/* Progress bar */}
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: barWidth }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: domain.color }}
                />
            </div>
            {/* Interpretation */}
            {domain.hasRealData && (
                <p className="text-[8px] text-white/35 leading-tight">{domain.interpretation}</p>
            )}
        </div>
    );
}

// ─── Main Panel ───
export default function FASScorePanel({ result, onClose }: FASScorePanelProps) {
    const activeDomains = result.domains.filter(d => d.hasRealData);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="absolute bottom-4 left-4 right-4 z-50 mx-auto max-w-sm pointer-events-auto"
            >
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs font-bold uppercase tracking-widest text-white/70">
                                FAS Score
                            </span>
                            <span className="text-[9px] text-white/30">Galderma</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-white/40 hover:text-white"
                            onClick={onClose}
                        >
                            <X className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    {/* Gauges Row */}
                    <div className="px-4 py-3 flex items-center justify-between gap-1">
                        {/* Global Score (larger) */}
                        <div className="flex flex-col items-center">
                            <RadialGauge
                                score={result.globalScore}
                                color={result.domains.find(d => d.hasRealData)?.color ?? '#6b7280'}
                                size={72}
                                label="GLOBAL"
                                hasData={activeDomains.length > 0}
                            />
                            <GradeBadge
                                grade={result.globalGrade}
                                color={activeDomains.length > 0
                                    ? result.domains.find(d => d.hasRealData)?.color ?? '#6b7280'
                                    : '#6b7280'
                                }
                            />
                        </div>

                        {/* Per-domain gauges */}
                        <div className="flex gap-1 flex-wrap justify-center">
                            {result.domains.map((d: FASDomainScore) => (
                                <RadialGauge
                                    key={d.id}
                                    score={d.score}
                                    color={d.color}
                                    size={48}
                                    label={d.labelPt}
                                    hasData={d.hasRealData}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Domain Details */}
                    <div className="px-4 pb-3 space-y-2">
                        {result.domains.map((d: FASDomainScore) => (
                            <DomainRow key={d.id} domain={d} />
                        ))}
                    </div>

                    {/* Footer Summary */}
                    <div className="px-4 py-2 bg-white/[0.03] border-t border-white/5">
                        <div className="flex items-start gap-2">
                            <Activity className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" />
                            <p className="text-[9px] text-white/40 leading-relaxed">
                                {result.summary}
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
