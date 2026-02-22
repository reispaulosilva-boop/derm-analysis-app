/**
 * MetricPanel — 3D Metric Measurements Display
 * 
 * Displays anatomical metric measurements (in mm) derived from
 * Procrustes analysis. Shows calibration data, key measurements
 * organized by facial region, and volumetric estimates.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ruler, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    type ProcrustesResult,
    type VolumetricRegion,
    computeVolumetricEstimates,
} from '../../utils/procrustesMetric';

interface MetricPanelProps {
    result: ProcrustesResult;
    onClose: () => void;
}

// ─── Measurement Row ───
function MeasurementRow({
    label,
    value,
    unit = 'mm',
    reference,
}: {
    label: string;
    value: number;
    unit?: string;
    reference?: string;
}) {
    return (
        <div className="flex items-center justify-between py-0.5">
            <span className="text-[10px] text-white/55">{label}</span>
            <div className="flex items-center gap-1">
                <span className="text-[11px] font-mono font-bold tabular-nums text-cyan-300">
                    {value}
                </span>
                <span className="text-[8px] text-white/30">{unit}</span>
                {reference && (
                    <span className="text-[8px] text-white/20 ml-1">({reference})</span>
                )}
            </div>
        </div>
    );
}

// ─── Region Section ───
function RegionSection({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-0.5">
            <div className="text-[8px] font-bold uppercase tracking-widest text-white/25 border-b border-white/5 pb-0.5 mb-0.5">
                {title}
            </div>
            {children}
        </div>
    );
}

// ─── Volume Bar ───
function VolumeBar({
    label,
    volume_ml,
    percentOfReference,
}: {
    label: string;
    volume_ml: number;
    percentOfReference: number;
}) {
    const barColor = percentOfReference >= 80
        ? '#10b981'
        : percentOfReference >= 50
            ? '#f59e0b'
            : '#ef4444';

    return (
        <div className="space-y-0.5">
            <div className="flex justify-between items-center">
                <span className="text-[9px] text-white/50">{label}</span>
                <span className="text-[9px] font-mono tabular-nums" style={{ color: barColor }}>
                    {volume_ml} mL ({percentOfReference}%)
                </span>
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percentOfReference, 100)}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: barColor }}
                />
            </div>
        </div>
    );
}

// ─── Main Panel ───
export default function MetricPanel({ result, onClose }: MetricPanelProps) {
    const { measurements: m, calibration } = result;
    const volumetrics = computeVolumetricEstimates(result.metricLandmarks);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="absolute top-16 right-4 z-50 pointer-events-auto w-64"
            >
                <div className="bg-black/85 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-white/5 sticky top-0 bg-black/90 backdrop-blur-xl z-10">
                        <div className="flex items-center gap-2">
                            <Ruler className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                                Medidas 3D (mm)
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-white/40 hover:text-white"
                            onClick={onClose}
                        >
                            <X className="w-3 h-3" />
                        </Button>
                    </div>

                    {/* Calibration Info */}
                    <div className="px-3 py-2 bg-emerald-950/20 border-b border-white/5">
                        <div className="flex items-center gap-1.5 mb-1">
                            <AlertCircle className="w-3 h-3 text-emerald-400/60" />
                            <span className="text-[8px] text-white/40">
                                Calibração: IPD ref. = {calibration.referenceIPD_mm}mm |
                                Confiança: {Math.round(calibration.confidence * 100)}%
                            </span>
                        </div>
                        <div className="text-[8px] text-white/25">
                            Fator = {calibration.scaleFactor.toFixed(1)}mm/u |
                            IPD norm = {calibration.normalizedIPD.toFixed(4)}
                        </div>
                    </div>

                    {/* Measurements */}
                    <div className="px-3 py-2 space-y-2">
                        <RegionSection title="Dimensões Globais">
                            <MeasurementRow label="Dist. Interpupilar (IPD)" value={m.ipd_mm} reference="~63" />
                            <MeasurementRow label="Largura Bizigomática" value={m.bizygomaticWidth_mm} reference="~130" />
                            <MeasurementRow label="Largura Bigonial" value={m.bigonialWidth_mm} reference="~97" />
                            <MeasurementRow label="Altura Facial" value={m.facialHeight_mm} reference="~120" />
                        </RegionSection>

                        <RegionSection title="Terços Faciais">
                            <MeasurementRow label="Terço Superior" value={m.upperThird_mm} />
                            <MeasurementRow label="Terço Médio" value={m.middleThird_mm} />
                            <MeasurementRow label="Terço Inferior" value={m.lowerThird_mm} />
                        </RegionSection>

                        <RegionSection title="Nariz">
                            <MeasurementRow label="Largura Nasal" value={m.nasalWidth_mm} reference="~35" />
                            <MeasurementRow label="Projeção Nasal" value={m.nasalHeight_mm} />
                        </RegionSection>

                        <RegionSection title="Região Perioral">
                            <MeasurementRow label="Largura da Boca" value={m.mouthWidth_mm} reference="~50" />
                            <MeasurementRow label="Altura Labial" value={m.lipHeight_mm} />
                            <MeasurementRow label="Altura Mentoniana" value={m.chinHeight_mm} />
                        </RegionSection>

                        <RegionSection title="Região Periorbital">
                            <MeasurementRow label="Fenda Palpebral (E)" value={m.palpebraLeftWidth_mm} reference="~28" />
                            <MeasurementRow label="Fenda Palpebral (D)" value={m.palpebraRightWidth_mm} reference="~28" />
                            <MeasurementRow label="Profund. Malar (E)" value={m.malarDepthLeft_mm} />
                            <MeasurementRow label="Profund. Malar (D)" value={m.malarDepthRight_mm} />
                        </RegionSection>
                    </div>

                    {/* Volumetric Estimates */}
                    <div className="px-3 py-2 border-t border-white/5 space-y-1.5">
                        <div className="text-[8px] font-bold uppercase tracking-widest text-white/25 pb-0.5">
                            Volumetria Estimada (% do referencial jovem)
                        </div>
                        {volumetrics.map(v => (
                            <VolumeBar
                                key={v.region.id}
                                label={v.region.labelPt}
                                volume_ml={v.volume_ml}
                                percentOfReference={v.percentOfReference}
                            />
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="px-3 py-1.5 bg-white/[0.02] border-t border-white/5">
                        <p className="text-[7px] text-white/20 text-center">
                            Valores estimados via Procrustes (IPD = {calibration.referenceIPD_mm}mm).
                            Não substitui tomografia.
                        </p>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
