import { useState, useMemo } from "react";
import { MD_CODES_CLINICAL, MDCodeClinical } from "@/utils/mdCodesClinical";
import { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info, Syringe, ScanFace, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MDCodesOverlayProps {
    landmarks: NormalizedLandmark[];
    width: number;
    height: number;
}

const REGION_COLORS: Record<string, string> = {
    foundation: "#3b82f6", // Blue (Structure)
    contour: "#10b981",    // Green (Shape)
    refinement: "#8b5cf6", // Purple (Detail)
};

const getShapeStyle = (id: string, isSelected: boolean, defaultColor: string) => {
    let shape = 'circle';
    let bgColor = defaultColor;
    let clipPath = 'none';

    let w = isSelected ? 22 : 15;
    let h = isSelected ? 22 : 15;
    let br = '50%';

    if (['F1', 'F2', 'F3'].includes(id)) {
        shape = 'triangle';
        bgColor = '#ef4444'; // Red
        clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
        br = '0';
        w = isSelected ? 24 : 18;
        h = isSelected ? 21 : 16;
    } else if (['G1'].includes(id)) {
        shape = 'arrow-up';
        bgColor = '#ef4444'; // Red
        clipPath = 'polygon(50% 0%, 100% 35%, 75% 35%, 75% 100%, 25% 100%, 25% 35%, 0% 35%)';
        br = '0';
        w = isSelected ? 20 : 15;
        h = isSelected ? 24 : 18;
    } else if (['G2', 'O1', 'O2', 'O3', 'E1', 'E2', 'E3', 'T1', 'T2', 'Tt1', 'Tt2', 'Tt3', 'Ck2', 'Ck3', 'N1', 'N2', 'N3', 'N4', 'N5'].includes(id)) {
        shape = 'circle';
        bgColor = '#ef4444'; // Red
    } else if (['Jw2'].includes(id)) {
        shape = 'rect-vertical';
        bgColor = '#3b82f6'; // Blue
        br = '4px';
        w = isSelected ? 17 : 11;
        h = isSelected ? 25 : 18;
    } else if (['Ck4'].includes(id)) {
        shape = 'triangle';
        bgColor = '#3b82f6'; // Blue
        clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
        br = '0';
        w = isSelected ? 24 : 18;
        h = isSelected ? 21 : 16;
    } else if (['NL1'].includes(id)) {
        shape = 'arrow-down';
        bgColor = '#ef4444'; // Red
        clipPath = 'polygon(25% 0%, 75% 0%, 75% 65%, 100% 65%, 50% 100%, 0% 65%, 25% 65%)';
        br = '0';
        w = isSelected ? 20 : 15;
        h = isSelected ? 24 : 18;
    } else if (['NL2', 'NL3'].includes(id)) {
        shape = 'arrow-down';
        bgColor = '#3b82f6'; // Blue
        clipPath = 'polygon(25% 0%, 75% 0%, 75% 65%, 100% 65%, 50% 100%, 0% 65%, 25% 65%)';
        br = '0';
        w = isSelected ? 20 : 15;
        h = isSelected ? 24 : 18;
    }

    return { shape, bgColor, clipPath, w, h, br };
};

export default function MDCodesOverlay({
    landmarks,
    width,
    height,
}: MDCodesOverlayProps) {
    const [selectedCode, setSelectedCode] = useState<MDCodeClinical | null>(null);

    // Helper to get coordinates
    const getCoords = (indexOrIndices: number | number[]) => {
        if (!landmarks) return null;

        if (Array.isArray(indexOrIndices)) {
            let totalX = 0;
            let totalY = 0;
            let count = 0;

            indexOrIndices.forEach(idx => {
                if (idx < landmarks.length) {
                    totalX += landmarks[idx].x;
                    totalY += landmarks[idx].y;
                    count++;
                }
            });

            if (count === 0) return null;

            return {
                x: (totalX / count) * width,
                y: (totalY / count) * height,
            };
        } else {
            if (indexOrIndices >= landmarks.length) return null;
            return {
                x: landmarks[indexOrIndices].x * width,
                y: landmarks[indexOrIndices].y * height,
            };
        }
    };

    return (
        <div className="absolute inset-0 z-30 pointer-events-none">
            {/* ─── Markers Layer ─── */}
            <div className="absolute inset-0 w-full h-full pointer-events-auto">
                {Object.entries(MD_CODES_CLINICAL).map(([region, codes]) => {
                    const color = REGION_COLORS[region] || "#ffffff";

                    return codes.map((codeItem) => {
                        const rightCoords = getCoords(codeItem.indices.right);
                        const leftCoords = getCoords(codeItem.indices.left);
                        const isSelected = selectedCode?.id === codeItem.id;

                        // Render function for a single marker
                        const renderMarker = (coords: { x: number; y: number } | null, side: 'R' | 'L') => {
                            if (!coords) return null;

                            return (
                                <motion.div
                                    key={`${codeItem.id}-${side}`}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute cursor-pointer group"
                                    style={{
                                        left: coords.x,
                                        top: coords.y,
                                        transform: "translate(-50%, -50%)",
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedCode(codeItem);
                                    }}
                                >
                                    {/* Alert Ring */}
                                    {codeItem.clinical.alert && (
                                        <div className="absolute inset-0 rounded-full border border-red-500 animate-ping opacity-75 md:w-6 md:h-6 w-5 h-5 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 pointer-events-none" />
                                    )}

                                    {/* Core Marker */}
                                    <div
                                        className={`relative transition-all duration-300 flex items-center justify-center
                                            ${isSelected ? 'z-20' : 'z-10 hover:scale-[1.15]'}
                                        `}
                                        style={{
                                            width: `${getShapeStyle(codeItem.id, isSelected, color).w}px`,
                                            height: `${getShapeStyle(codeItem.id, isSelected, color).h}px`,
                                            backgroundColor: getShapeStyle(codeItem.id, isSelected, color).bgColor,
                                            clipPath: getShapeStyle(codeItem.id, isSelected, color).clipPath !== 'none' ? getShapeStyle(codeItem.id, isSelected, color).clipPath : undefined,
                                            borderRadius: getShapeStyle(codeItem.id, isSelected, color).clipPath !== 'none' ? 0 : getShapeStyle(codeItem.id, isSelected, color).br,
                                            border: getShapeStyle(codeItem.id, isSelected, color).clipPath !== 'none' ? 'none' : '1.5px solid white',
                                            boxShadow: getShapeStyle(codeItem.id, isSelected, color).clipPath !== 'none' ? 'none' : `0 2px 6px rgba(0,0,0,0.3)`,
                                            filter: getShapeStyle(codeItem.id, isSelected, color).clipPath !== 'none' ? `drop-shadow(0px 2px 3px rgba(0,0,0,0.5)) drop-shadow(0px 0px 1px rgba(255,255,255,0.8))` : 'none',
                                        }}
                                    >
                                        <span
                                            className="text-[6px] sm:text-[7px] font-bold text-white pointer-events-none tracking-tighter"
                                            style={{
                                                transform: getShapeStyle(codeItem.id, isSelected, color).shape === 'triangle' ? 'translateY(15%)'
                                                    : getShapeStyle(codeItem.id, isSelected, color).shape === 'arrow-up' ? 'translateY(15%)'
                                                        : getShapeStyle(codeItem.id, isSelected, color).shape === 'arrow-down' ? 'translateY(-15%)'
                                                            : 'translateY(0)',
                                                textShadow: "0px 1px 2px rgba(0,0,0,0.8)" // Enhanced readability inside shapes
                                            }}
                                        >
                                            {codeItem.id}
                                        </span>
                                    </div>

                                    {/* Tooltip (Hover) */}
                                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 backdrop-blur text-white text-[10px] rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-30`}>
                                        {codeItem.name} • {codeItem.clinical.tool}
                                    </div>
                                </motion.div>
                            );
                        };

                        return (
                            <div key={codeItem.id}>
                                {renderMarker(rightCoords, 'R')}
                                {/* Only render left if different index (centered points like chin use one) */}
                                {codeItem.indices.left !== codeItem.indices.right && renderMarker(leftCoords, 'L')}
                            </div>
                        );
                    });
                })}
            </div>

            {/* ─── Clinical Card (Details Panel) ─── */}
            <AnimatePresence>
                {selectedCode && (
                    <motion.div
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        className="absolute top-0 right-0 h-full w-80 bg-black/60 backdrop-blur-xl border-l border-white/10 p-6 z-40 shadow-2xl overflow-y-auto pointer-events-auto"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <span style={{ color: REGION_COLORS[Object.keys(MD_CODES_CLINICAL).find(key => MD_CODES_CLINICAL[key].some(c => c.id === selectedCode.id)) || 'white'] }}>
                                        {selectedCode.id}
                                    </span>
                                    <span className="text-lg font-light opacity-80">{selectedCode.name}</span>
                                </h2>
                                <p className="text-xs text-white/50 uppercase tracking-wider mt-1 font-mono">
                                    {selectedCode.purpose}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedCode(null)}
                                className="text-white/50 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Alert Box */}
                        {selectedCode.clinical.alert && (
                            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-red-400">Zona de Alerta</h4>
                                    <p className="text-xs text-red-200/80 mt-1 leading-relaxed">
                                        {selectedCode.clinical.alert_reason}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Clinical Data Grid */}
                        <div className="space-y-4">
                            {/* Volume & Tool */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                    <div className="text-xs text-white/40 uppercase mb-1">Volume Ativo</div>
                                    <div className="text-xl font-mono text-cyan-400 font-medium">
                                        {selectedCode.clinical.active_volume} <span className="text-xs text-white/40">mL</span>
                                    </div>
                                </div>
                                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                    <div className="text-xs text-white/40 uppercase mb-1">Instrumento</div>
                                    <div className="flex items-center gap-2 text-sm text-white font-medium">
                                        <Syringe className="w-4 h-4 text-emerald-400" />
                                        {selectedCode.clinical.tool}
                                    </div>
                                </div>
                            </div>

                            {/* Depth */}
                            <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                                <div className="flex items-center gap-2 text-xs text-white/40 uppercase mb-2">
                                    <ScanFace className="w-4 h-4" /> Plano de Aplicação
                                </div>
                                <p className="text-white text-sm font-medium leading-relaxed">
                                    {selectedCode.clinical.depth}
                                </p>
                            </div>

                            {/* Technique */}
                            <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                                <div className="flex items-center gap-2 text-xs text-white/40 uppercase mb-2">
                                    <Info className="w-4 h-4" /> Técnica
                                </div>
                                <p className="text-white text-sm font-medium leading-relaxed">
                                    {selectedCode.clinical.technique}
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 border-t border-white/10 pt-4">
                            <p className="text-[10px] text-white/30 text-center italic">
                                Referência: MD Codes™ Methodological Approach
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
