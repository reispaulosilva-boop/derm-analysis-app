/**
 * SkinScope — Skin Analysis Page (Enhanced)
 * Design: "SkinScope" — Dark theme, teal accents, medical device aesthetic
 * Features: Photo upload, interactive markers with notes, parameter gauges,
 *           zoom/pan, fullscreen presentation mode, overlay heatmap
 * Optimized for iPhone 15 Pro touch + Apple TV display
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Eye,
  EyeOff,
  Maximize2,
  MessageSquare,
  Layers,
  Camera,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { consultationService, patientService } from "@/services/patientService";
import { recommendationService, type Recommendation } from "@/services/recommendationService";
import { RecommendationModal } from "@/components/analysis/RecommendationModal";
import { Save, FileText } from "lucide-react";

// ─── Analysis Parameters ───
const ANALYSIS_PARAMS = [
  { id: "erythema", label: "Eritema", color: "#ef4444", bgColor: "rgba(239,68,68,0.25)" },
  { id: "spots", label: "Manchas", color: "#f59e0b", bgColor: "rgba(245,158,11,0.25)" },
  { id: "wrinkles", label: "Rugas", color: "#a78bfa", bgColor: "rgba(167,139,250,0.25)" },
  { id: "pores", label: "Poros", color: "#3b82f6", bgColor: "rgba(59,130,246,0.25)" },
  { id: "texture", label: "Textura", color: "#8b5cf6", bgColor: "rgba(139,92,246,0.25)" },
  { id: "healthy", label: "Saudável", color: "#10b981", bgColor: "rgba(16,185,129,0.25)" },
] as const;

type ParamId = (typeof ANALYSIS_PARAMS)[number]["id"];

interface Marker {
  id: string;
  x: number;
  y: number;
  param: ParamId;
  score: number;
  note: string;
}

// ─── Score Gauge Component ───
function ScoreGauge({
  score,
  color,
  size = 52,
  label,
}: {
  score: number;
  color: string;
  size?: number;
  label?: string;
}) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 10) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="oklch(0.2 0.01 240)"
            strokeWidth={3.5}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center font-semibold tabular-nums"
          style={{ fontSize: size * 0.3, color }}
        >
          {score.toFixed(1)}
        </div>
      </div>
      {label && (
        <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
          {label}
        </span>
      )}
    </div>
  );
}

// ─── Main Component ───
export default function Analysis() {
  const [image, setImage] = useState<string | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [activeParam, setActiveParam] = useState<ParamId>("erythema");
  const [isPlacing, setIsPlacing] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);

  // Recommendations State
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // ─── File Upload ───
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast.error("Selecione uma imagem válida.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target?.result as string);
        setMarkers([]);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setSelectedMarker(null);
      };
      reader.readAsDataURL(file);
      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    []
  );

  // ─── Save Analysis ───
  const handleSave = async () => {
    if (!image) return;

    // Create a loading toast
    const toastId = toast.loading("Salvando análise...");

    try {
      // 1. Create a demo patient (in a real app, you'd select one)
      const patientName = `Paciente ${new Date().toLocaleTimeString()}`;
      const patient = await patientService.createPatient(patientName);

      // 2. Start consultation
      const consultation = await consultationService.createConsultation(patient.id, "Análise rápida via SkinScope");

      // 3. Convert Base64 image to File
      const res = await fetch(image);
      const blob = await res.blob();
      const file = new File([blob], `analysis-${Date.now()}.jpg`, { type: "image/jpeg" });

      // 4. Upload Image
      const uploadData = await consultationService.uploadAnalysisImage(file, `${patient.id}/${file.name}`);
      const publicUrl = await consultationService.getPublicUrl(uploadData.path);

      // 5. Create Image Record
      const imageRecord = await consultationService.createImageRecord(consultation.id, publicUrl);

      // 6. Save Results
      await consultationService.saveAnalysisResults(
        imageRecord.id,
        markers,
        paramSummary
      );

      setRecommendations(recommendationService.generateRecommendations(
        Object.fromEntries(paramSummary.map(p => [p.id, p.avgScore]))
      ));

      toast.success("Análise salva com sucesso!", { id: toastId });
      setShowRecommendations(true);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar. Verifique se as credenciais do Supabase estão configuradas.", { id: toastId });
    }
  };

  // ─── Image Click → Place Marker ───
  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isPlacing || !imageContainerRef.current) return;

      const rect = imageContainerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      if (x < 0 || x > 100 || y < 0 || y > 100) return;

      const newMarker: Marker = {
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        x,
        y,
        param: activeParam,
        score: 5,
        note: "",
      };

      setMarkers((prev) => [...prev, newMarker]);
      setSelectedMarker(newMarker.id);
      setIsPlacing(false);
      toast.success("Marcador adicionado");
    },
    [isPlacing, activeParam]
  );

  // ─── Touch handling for placing markers ───
  const handleImageTouch = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!isPlacing || !imageContainerRef.current) return;
      e.preventDefault();

      const rect = imageContainerRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      const x = ((touch.clientX - rect.left) / rect.width) * 100;
      const y = ((touch.clientY - rect.top) / rect.height) * 100;

      if (x < 0 || x > 100 || y < 0 || y > 100) return;

      const newMarker: Marker = {
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        x,
        y,
        param: activeParam,
        score: 5,
        note: "",
      };

      setMarkers((prev) => [...prev, newMarker]);
      setSelectedMarker(newMarker.id);
      setIsPlacing(false);
      toast.success("Marcador adicionado");
    },
    [isPlacing, activeParam]
  );

  // ─── Marker Operations ───
  const updateMarkerScore = useCallback((id: string, score: number) => {
    setMarkers((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, score: Math.max(0, Math.min(10, score)) } : m
      )
    );
  }, []);

  const updateMarkerNote = useCallback((id: string, note: string) => {
    setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, note } : m)));
  }, []);

  const deleteMarker = useCallback((id: string) => {
    setMarkers((prev) => prev.filter((m) => m.id !== id));
    setSelectedMarker(null);
    toast("Marcador removido");
  }, []);

  // ─── Zoom Controls ───
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.5, 5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.5, 1));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // ─── Pan handling (when zoomed) ───
  const handlePanStart = useCallback(
    (e: React.TouchEvent) => {
      if (isPlacing || zoom <= 1) return;
      if (e.touches.length === 1) {
        setIsPanning(true);
        lastTouchRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    },
    [isPlacing, zoom]
  );

  const handlePanMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPanning || !lastTouchRef.current) return;
      const dx = e.touches[0].clientX - lastTouchRef.current.x;
      const dy = e.touches[0].clientY - lastTouchRef.current.y;
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      lastTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    },
    [isPanning]
  );

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
    lastTouchRef.current = null;
  }, []);

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingNote) {
          setEditingNote(false);
        } else if (isPlacing) {
          setIsPlacing(false);
        } else if (selectedMarker) {
          setSelectedMarker(null);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFullscreen, isPlacing, selectedMarker, editingNote]);

  // Focus note input when editing
  useEffect(() => {
    if (editingNote && noteInputRef.current) {
      noteInputRef.current.focus();
    }
  }, [editingNote]);

  // ─── Derived Data ───
  const getParamInfo = (paramId: ParamId) =>
    ANALYSIS_PARAMS.find((p) => p.id === paramId)!;

  const selectedMarkerData = markers.find((m) => m.id === selectedMarker);

  const paramSummary = ANALYSIS_PARAMS.map((param) => {
    const paramMarkers = markers.filter((m) => m.param === param.id);
    const avgScore =
      paramMarkers.length > 0
        ? Math.round(
          (paramMarkers.reduce((sum, m) => sum + m.score, 0) /
            paramMarkers.length) *
          10
        ) / 10
        : 0;
    return { ...param, count: paramMarkers.length, avgScore };
  }).filter((p) => p.count > 0);

  return (
    <div
      className={`min-h-[100dvh] flex flex-col bg-background ${isFullscreen ? "fixed inset-0 z-50" : ""
        }`}
    >
      {/* ─── Header ─── */}
      {!isFullscreen && (
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 pt-4 pb-2 safe-top shrink-0"
        >
          <Link href="/">
            <Button
              variant="ghost"
              size="icon"
              className="touch-target rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">Análise de Pele</h1>
            <p className="text-xs text-muted-foreground truncate">
              {markers.length > 0
                ? `${markers.length} marcador${markers.length > 1 ? "es" : ""} · ${paramSummary.length} parâmetro${paramSummary.length > 1 ? "s" : ""}`
                : "Carregue uma foto para começar"}
            </p>
          </div>
          {image && (
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="touch-target rounded-xl"
                onClick={() => setShowOverlay(!showOverlay)}
                title="Overlay de análise"
              >
                <Layers
                  className={`w-4 h-4 ${showOverlay ? "text-primary" : ""}`}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="touch-target rounded-xl"
                onClick={() => setShowMarkers(!showMarkers)}
              >
                {showMarkers ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="touch-target rounded-xl"
                onClick={() => setIsFullscreen(true)}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </motion.header>
      )}

      {/* ─── Fullscreen Close ─── */}
      {isFullscreen && (
        <div className="fixed top-4 right-4 z-[60] flex gap-2">
          <button
            onClick={() => setShowMarkers(!showMarkers)}
            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white"
          >
            {showMarkers ? (
              <Eye className="w-5 h-5" />
            ) : (
              <EyeOff className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => setIsFullscreen(false)}
            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex flex-col min-h-0">
        {!image ? (
          /* ─── Upload State ─── */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex items-center justify-center px-6"
          >
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-xs aspect-[3/4] rounded-2xl border-2 border-dashed border-border/60 bg-card/30 backdrop-blur-sm flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/40 transition-colors active:scale-[0.98]"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Camera className="w-7 h-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-foreground font-medium mb-1">
                  Carregar Foto
                </p>
                <p className="text-sm text-muted-foreground">
                  Toque para selecionar do rolo de câmera
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </motion.div>
        ) : (
          /* ─── Analysis View ─── */
          <>
            {/* Image Canvas */}
            <div
              className={`relative flex-1 overflow-hidden bg-black/50 ${isPlacing ? "cursor-crosshair" : ""
                } ${isFullscreen ? "h-screen" : ""}`}
              ref={imageContainerRef}
              onClick={handleImageClick}
              onTouchStart={isPlacing ? handleImageTouch : handlePanStart}
              onTouchMove={!isPlacing ? handlePanMove : undefined}
              onTouchEnd={!isPlacing ? handlePanEnd : undefined}
            >
              <div
                className="w-full h-full flex items-center justify-center transition-transform duration-150"
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                }}
              >
                <img
                  src={image}
                  alt="Foto do paciente"
                  className="max-w-full max-h-full object-contain select-none pointer-events-none"
                  draggable={false}
                />
              </div>

              {/* Overlay heatmap effect */}
              {showOverlay && markers.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {markers.map((marker) => {
                    const param = getParamInfo(marker.param);
                    const radius = 30 + marker.score * 5;
                    return (
                      <div
                        key={`overlay-${marker.id}`}
                        className="absolute rounded-full"
                        style={{
                          left: `${marker.x}%`,
                          top: `${marker.y}%`,
                          width: `${radius}px`,
                          height: `${radius}px`,
                          transform: "translate(-50%, -50%)",
                          background: `radial-gradient(circle, ${param.bgColor} 0%, transparent 70%)`,
                          filter: "blur(8px)",
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* Markers */}
              {showMarkers &&
                markers.map((marker) => {
                  const param = getParamInfo(marker.param);
                  const isSelected = selectedMarker === marker.id;
                  return (
                    <motion.div
                      key={marker.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute pointer-events-auto z-10"
                      style={{
                        left: `${marker.x}%`,
                        top: `${marker.y}%`,
                        transform: "translate(-50%, -50%)",
                        zIndex: isSelected ? 30 : 10,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMarker(isSelected ? null : marker.id);
                      }}
                    >
                      {/* Pulse ring */}
                      <div
                        className="absolute rounded-full marker-pulse"
                        style={{
                          width: 36,
                          height: 36,
                          left: "50%",
                          top: "50%",
                          marginLeft: -18,
                          marginTop: -18,
                          backgroundColor: param.bgColor,
                        }}
                      />
                      {/* Marker dot */}
                      <div
                        className={`relative w-7 h-7 rounded-full border-2 shadow-lg flex items-center justify-center text-[11px] font-bold text-white transition-all ${isSelected
                          ? "border-white scale-125"
                          : "border-white/70"
                          }`}
                        style={{ backgroundColor: param.color }}
                      >
                        {marker.score}
                      </div>
                      {/* Note indicator */}
                      {marker.note && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary border border-background" />
                      )}
                      {/* Label on selection */}
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap"
                        >
                          <div
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium text-white"
                            style={{ backgroundColor: param.color + "CC" }}
                          >
                            {param.label}
                            {marker.note ? ` · ${marker.note.slice(0, 20)}${marker.note.length > 20 ? "…" : ""}` : ""}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}

              {/* Placing indicator */}
              {isPlacing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 border-2 border-dashed border-primary/30 pointer-events-none flex items-end justify-center pb-20"
                >
                  <div className="bg-black/80 backdrop-blur-sm px-5 py-2.5 rounded-full text-sm text-primary font-medium flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Toque na imagem para marcar{" "}
                    <span
                      className="font-bold"
                      style={{
                        color: getParamInfo(activeParam).color,
                      }}
                    >
                      {getParamInfo(activeParam).label}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Zoom controls */}
              <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-20">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 rounded-lg bg-black/50 backdrop-blur-sm text-white hover:bg-black/70"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleZoomIn();
                  }}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 rounded-lg bg-black/50 backdrop-blur-sm text-white hover:bg-black/70"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleZoomOut();
                  }}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                {zoom > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9 rounded-lg bg-black/50 backdrop-blur-sm text-white hover:bg-black/70"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetZoom();
                    }}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Zoom level indicator */}
              {zoom > 1 && (
                <div className="absolute bottom-3 left-3 z-20">
                  <span className="px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-white text-xs font-medium tabular-nums">
                    {zoom.toFixed(1)}x
                  </span>
                </div>
              )}
            </div>

            {/* ─── Bottom Panel ─── */}
            {!isFullscreen && (
              <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                className="bg-card/95 backdrop-blur-xl border-t border-border/50 safe-bottom shrink-0"
              >
                {/* Selected marker detail */}
                <AnimatePresence>
                  {selectedMarkerData && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-b border-border/30"
                    >
                      <div className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: getParamInfo(
                                  selectedMarkerData.param
                                ).color,
                              }}
                            />
                            <span className="text-sm font-semibold">
                              {
                                getParamInfo(selectedMarkerData.param)
                                  .label
                              }
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8"
                              onClick={() => {
                                setEditingNote(!editingNote);
                              }}
                            >
                              <MessageSquare
                                className={`w-4 h-4 ${selectedMarkerData.note || editingNote
                                  ? "text-primary"
                                  : ""
                                  }`}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 text-destructive"
                              onClick={() =>
                                deleteMarker(selectedMarkerData.id)
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8"
                              onClick={() => {
                                setSelectedMarker(null);
                                setEditingNote(false);
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Score slider */}
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs text-muted-foreground w-14">
                            Severidade
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={10}
                            step={1}
                            value={selectedMarkerData.score}
                            onChange={(e) =>
                              updateMarkerScore(
                                selectedMarkerData.id,
                                parseInt(e.target.value)
                              )
                            }
                            className="flex-1 h-1.5 rounded-full appearance-none bg-muted"
                            style={{
                              accentColor: getParamInfo(
                                selectedMarkerData.param
                              ).color,
                            }}
                          />
                          <span
                            className="text-xl font-bold w-8 text-right tabular-nums"
                            style={{
                              color: getParamInfo(selectedMarkerData.param)
                                .color,
                            }}
                          >
                            {selectedMarkerData.score}
                          </span>
                        </div>

                        {/* Note input */}
                        <AnimatePresence>
                          {editingNote && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                            >
                              <textarea
                                ref={noteInputRef}
                                value={selectedMarkerData.note}
                                onChange={(e) =>
                                  updateMarkerNote(
                                    selectedMarkerData.id,
                                    e.target.value
                                  )
                                }
                                placeholder="Adicionar observação clínica..."
                                className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                                rows={2}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Summary gauges */}
                {paramSummary.length > 0 && !selectedMarkerData && (
                  <div className="px-4 py-3 border-b border-border/30">
                    <div className="flex gap-5 overflow-x-auto pb-1 justify-center">
                      {paramSummary.map((p) => (
                        <ScoreGauge
                          key={p.id}
                          score={p.avgScore}
                          color={p.color}
                          size={50}
                          label={p.label}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Parameter selector + actions */}
                <div className="px-4 py-3">
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
                    {ANALYSIS_PARAMS.map((param) => {
                      const count = markers.filter(
                        (m) => m.param === param.id
                      ).length;
                      return (
                        <button
                          key={param.id}
                          onClick={() => setActiveParam(param.id)}
                          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${activeParam === param.id
                            ? "border-white/15 text-white shadow-sm"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                          style={
                            activeParam === param.id
                              ? {
                                backgroundColor: param.bgColor,
                                borderColor: param.color + "30",
                              }
                              : {}
                          }
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: param.color }}
                          />
                          {param.label}
                          {count > 0 && (
                            <span
                              className="ml-0.5 text-[10px] opacity-70"
                            >
                              ({count})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setIsPlacing(!isPlacing);
                        setSelectedMarker(null);
                        setEditingNote(false);
                      }}
                      className={`flex-1 touch-target rounded-xl font-medium ${isPlacing
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
                    >
                      {isPlacing ? (
                        <>
                          <X className="w-4 h-4 mr-2" />
                          Cancelar
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Marcar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="touch-target rounded-xl"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="touch-target rounded-xl"
                      onClick={handleSave}
                      title="Salvar Análise"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                    {markers.length > 0 && (
                      <Button
                        className="touch-target rounded-xl bg-primary text-primary-foreground font-medium"
                        onClick={() => {
                          setRecommendations(recommendationService.generateRecommendations(
                            Object.fromEntries(paramSummary.map(p => [p.id, p.avgScore]))
                          ));
                          setShowRecommendations(true);
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Gerar Plano
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Recommendation Modal */}
            <RecommendationModal
              isOpen={showRecommendations}
              onClose={() => setShowRecommendations(false)}
              recommendations={recommendations}
            />

            {/* Fullscreen summary overlay */}
            {isFullscreen && paramSummary.length > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]">
                <div className="flex gap-4 bg-black/70 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10">
                  {paramSummary.map((p) => (
                    <ScoreGauge
                      key={p.id}
                      score={p.avgScore}
                      color={p.color}
                      size={44}
                      label={p.label}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Hidden file input */}
      {image && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      )}
    </div>
  );
}
