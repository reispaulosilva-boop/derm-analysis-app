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
  Download,
  ScanFace, // New Icon
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { consultationService, patientService } from "@/services/patientService";
import { recommendationService, type Recommendation } from "@/services/recommendationService";
import { RecommendationModal } from "@/components/analysis/RecommendationModal";
import { Save, FileText, Sparkles, Loader2, Info } from "lucide-react";
import { aiAnalysisService, type AIAnalysisResult } from "@/services/aiAnalysisService";
import { useFaceMesh } from "@/hooks/useFaceMesh";
import FaceMeshOverlay from "@/components/analysis/FaceMeshOverlay";
import { evaluateFaceShape, type FaceShapeAnalysis } from "@/utils/faceGeometry";

// ─── Analysis Parameters ───
const ANALYSIS_PARAMS = [
  { id: "erythema", label: "Eritema", color: "#ef4444", bgColor: "rgba(239,68,68,0.25)" },
  { id: "spots", label: "Manchas", color: "#f59e0b", bgColor: "rgba(245,158,11,0.25)" },
  { id: "wrinkles", label: "Rugas", color: "#a78bfa", bgColor: "rgba(167,139,250,0.25)" },
  { id: "pores", label: "Poros", color: "#3b82f6", bgColor: "rgba(59,130,246,0.25)" },
  { id: "texture", label: "Textura", color: "#8b5cf6", bgColor: "rgba(139,92,246,0.25)" },
  { id: "undereye", label: "Olheiras", color: "#60a5fa", bgColor: "rgba(96,165,250,0.25)" },
  { id: "dullness", label: "Viço", color: "#fbbf24", bgColor: "rgba(251,191,36,0.25)" },
  { id: "dehydration", label: "Hidratação", color: "#2dd4bf", bgColor: "rgba(45,212,191,0.25)" },
  { id: "firmness", label: "Firmeza", color: "#f472b6", bgColor: "rgba(244,114,182,0.25)" },
  { id: "acne", label: "Acne", color: "#dc2626", bgColor: "rgba(220,38,38,0.25)" },
  { id: "blackheads", label: "Cravos", color: "#4b5563", bgColor: "rgba(75,85,99,0.25)" },
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
  const offset = circumference - (score / 100) * circumference;

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

// ─── Analysis Overlay Component (HUD Style) ───
function AnalysisOverlay({
  image,
  markers,
  recommendations,
  onClose,
}: {
  image: string;
  markers: Marker[];
  recommendations: Recommendation[];
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm font-sans"
    >
      {/* ─── Scanning Effect ─── */}
      <motion.div
        initial={{ top: "0%" }}
        animate={{ top: "100%" }}
        transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_rgba(34,211,238,0.8)] z-0 pointer-events-none opacity-50"
      />

      {/* ─── Header ─── */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-cyan-400">
            <Sparkles className="w-4 h-4" />
            <span className="font-bold tracking-widest text-xs uppercase">AI DIAGNOSTICS</span>
          </div>
          <div className="h-px w-10 bg-cyan-500/30"></div>
          <span className="text-xs text-white/50 font-mono">{markers.length} DETECTIONS</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="w-full h-full flex relative">
        {/* ─── Center: Main Visualization (Transparent) ─── */}
        <div className="flex-1 relative">
          {/* Markers (HUD Style) */}
          {markers.map((marker, i) => {
            const param = ANALYSIS_PARAMS.find(p => p.id === marker.param)!;
            const isRightSide = marker.x > 50;

            return (
              <motion.div
                key={marker.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + (i * 0.1) }}
                className="absolute z-20"
                style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
              >
                {/* Target Reticle */}
                <div className="relative w-8 h-8 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                  <div className="absolute inset-0 border border-white/30 rounded-full animate-ping opacity-20" />
                  <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white]" />
                  {/* Rotating brackets */}
                  <div className="absolute inset-0 border-t border-b border-primary/50 rounded-full w-full h-full animate-spin-slow" />
                </div>

                {/* Connector Line & Label */}
                <div className={`absolute top-0 ${isRightSide ? "right-8 flex-row-reverse" : "left-8"} flex items-center pointer-events-none w-[200px]`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: 40 }}
                    transition={{ delay: 0.8 + (i * 0.1), duration: 0.4 }}
                    className={`h-[1px] bg-white/40 ${isRightSide ? "origin-right" : "origin-left"}`}
                  />
                  <div className={`h-[1px] w-4 bg-white/40 -rotate-45 ${isRightSide ? "origin-bottom-left" : "origin-top-left"}`} />

                  <motion.div
                    initial={{ opacity: 0, x: isRightSide ? 10 : -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2 + (i * 0.1) }}
                    className={`flex flex-col ${isRightSide ? "items-end text-right mr-2" : "items-start ml-2"}`}
                  >
                    <div className="bg-black/70 backdrop-blur-md border border-white/20 px-2 py-1 rounded shadow-lg">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary block" style={{ color: param.color }}>{param.label}</span>
                      <span className="text-[10px] font-mono text-white/80">{marker.score}% SEVERITY</span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ─── Right Panel: Recommendations (Floating Glass) ─── */}
        <div className="w-80 h-full flex flex-col justify-center px-6 pointer-events-auto z-30">
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/70 border-b border-white/10 pb-2 mb-2">
              Treatment Plan
            </h3>
            {recommendations.map((rec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.5 + (i * 0.1) }}
                className="group relative pl-4 border-l-2 border-primary/30 hover:border-primary transition-colors py-1"
              >
                <p className="text-[10px] uppercase tracking-wider text-primary/80 mb-0.5 font-bold">
                  {rec.title}
                </p>
                <p className="text-xs text-white/90 leading-relaxed group-hover:text-white transition-colors">
                  {rec.description}
                </p>
              </motion.div>
            ))}

            <Button onClick={onClose} className="mt-4 w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50">
              Close Analysis
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───
export default function Analysis() {
  const [showOverlayAnalysis, setShowOverlayAnalysis] = useState(false);
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

  // ─── AI Analysis State ───
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiDisclaimer, setAiDisclaimer] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // ─── Face Mesh Hook ───
  // We keep it always loaded but only trigger detect when needed or image loads if enabled
  const { detectFace, results: faceMeshResults } = useFaceMesh();
  const imageRef = useRef<HTMLImageElement>(null);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
  const [showFaceAnalysis, setShowFaceAnalysis] = useState(false); // Toggle state
  const [faceShape, setFaceShape] = useState<FaceShapeAnalysis | null>(null);

  const handleImageLoad = useCallback(async () => {
    if (imageRef.current) {
      setImgDimensions({
        width: imageRef.current.width,
        height: imageRef.current.height,
      });
      // Just detect on load to be ready, but don't show yet
      await detectFace(imageRef.current);
    }
  }, [detectFace]);

  // Calculate Face Shape when results change
  useEffect(() => {
    if (faceMeshResults && faceMeshResults.faceLandmarks && faceMeshResults.faceLandmarks.length > 0) {
      const analysis = evaluateFaceShape(faceMeshResults.faceLandmarks[0]);
      setFaceShape(analysis);
    }
  }, [faceMeshResults]);

  // Update dimensions on window resize
  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current) {
        setImgDimensions({
          width: imageRef.current.width,
          height: imageRef.current.height,
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // ─── AI Analysis Handler ───
  const handleAiScan = async () => {
    if (!image) return;

    setIsAiScanning(true);
    const toastId = toast.loading("Analisando imagem com IA...", {
      description: "Identificando eritema, manchas, rugas e textura..."
    });

    try {
      const result = await aiAnalysisService.analyzeImage(image);

      // 1. Map detected points to markers (keep 0-100 score)
      const newMarkers: Marker[] = result.detected_points.map(p => ({
        id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        x: p.x,
        y: p.y,
        param: p.param,
        score: Math.round(p.score),
        note: `${p.label} (${p.severity_label})`
      }));

      setMarkers(current => [...current, ...newMarkers]);

      toast.success("Análise concluída!", { id: toastId });
      setAiDisclaimer(true);
      setShowMarkers(true);
      setShowOverlayAnalysis(true); // Open overlay automatically

      // Map AI treatment recommendations to the app's Recommendation type
      if (result.treatment_recommendations && result.treatment_recommendations.length > 0) {
        const aiRecs: Recommendation[] = result.treatment_recommendations.map((r, i) => ({
          id: `ai-rec-${i}`,
          type: 'product' as const,
          title: r.concern,
          description: r.product,
          priority: 'medium' as const,
          tags: ["IA", "Skincare"]
        }));
        setRecommendations(aiRecs);
      }

    } catch (error) {
      console.error(error);
      toast.error("Falha na análise via IA", {
        id: toastId,
        description: error instanceof Error ? error.message : "Tente novamente mais tarde."
      });
    } finally {
      setIsAiScanning(false);
    }
  };

  // --- FUNÇÃO: Toggle da IA (Curiosidade) ---
  const toggleAIAnalysis = () => {
    // Se já tiver marcadores, apenas alterna a visibilidade (efeito "aparece/desaparece")
    if (markers.length > 0) {
      setShowMarkers(!showMarkers);
      return;
    }

    // Se não tiver marcadores, chama a API
    handleAiScan();
  };

  // --- FUNÇÃO: Salvar no Celular (Local) ---
  const handleDownload = async (withOverlay: boolean) => {
    if (!image) return;
    setIsDownloading(true);
    const toastId = toast.loading("Preparando imagem...");

    try {
      const imgElement = new Image();
      imgElement.src = image;
      imgElement.crossOrigin = "anonymous"; // Importante para evitar erros de CORS se a imagem vier de fora

      await new Promise((resolve) => {
        imgElement.onload = resolve;
      });

      // Cria um canvas temporário com as dimensões REAIS da imagem
      const canvas = document.createElement("canvas");
      canvas.width = imgElement.naturalWidth;
      canvas.height = imgElement.naturalHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Erro ao criar contexto de imagem");

      // 1. Desenha a foto original
      ctx.drawImage(imgElement, 0, 0);

      // 2. Se o usuário quiser o overlay (análise), desenha os marcadores
      if (withOverlay && markers.length > 0) {
        markers.forEach((marker) => {
          const x = (marker.x / 100) * canvas.width;
          const y = (marker.y / 100) * canvas.height;
          const paramInfo = ANALYSIS_PARAMS.find(p => p.id === marker.param);
          const color = paramInfo?.color || "#ffffff";

          // Círculo
          ctx.beginPath();
          ctx.arc(x, y, 15, 0, 2 * Math.PI); // Raio do marcador (ajuste se a imagem for muito grande)
          ctx.lineWidth = 4;
          ctx.strokeStyle = color;
          ctx.stroke();

          // Ponto central
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();

          // Label (Opcional - Estilo Minimalista)
          ctx.font = "bold 24px Arial";
          ctx.fillStyle = color;
          ctx.fillText(`${marker.score.toFixed(1)}`, x + 20, y + 10);
        });
      }

      // 3. Converte para Link de Download
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const link = document.createElement("a");
      link.href = dataUrl;
      // Nome do arquivo com data
      link.download = `SkinScope-${withOverlay ? 'Analise' : 'Foto'}-${new Date().getTime()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Foto salva na galeria!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar imagem.", { id: toastId });
    } finally {
      setIsDownloading(false);
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
        score: 50,
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
        m.id === id ? { ...m, score: Math.max(0, Math.min(100, score)) } : m
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
          paramMarkers.reduce((sum, m) => sum + m.score, 0) /
          paramMarkers.length
        )
        : 0;
    return { ...param, count: paramMarkers.length, avgScore };
  }).filter((p) => p.count > 0);

  // Render Overlay if active
  // Note: We render main component AND overlay
  return (
    <div
      className={`min-h-[100dvh] flex flex-col bg-background ${isFullscreen ? "fixed inset-0 z-50" : ""
        }`}
    >
      <AnimatePresence>
        {showOverlayAnalysis && image && (
          <AnalysisOverlay
            image={image}
            markers={markers}
            recommendations={recommendations}
            onClose={() => setShowOverlayAnalysis(false)}
          />
        )}
      </AnimatePresence>

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
                className={`touch-target rounded-xl ${showOverlayAnalysis ? "bg-primary/20 text-primary" : ""}`}
                onClick={() => setShowOverlayAnalysis(!showOverlayAnalysis)}
                title="Toggle AI Analysis Overlay"
              >
                <Sparkles className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="touch-target rounded-xl"
                onClick={() => setIsFullscreen(true)}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`touch-target rounded-xl ${showFaceAnalysis ? "bg-cyan-500/20 text-cyan-400" : ""}`}
                onClick={() => {
                  const newState = !showFaceAnalysis;
                  setShowFaceAnalysis(newState);
                  if (newState && faceShape) {
                    toast.info(`Formato identificado: ${faceShape.shape}`, {
                      description: faceShape.description,
                      duration: 5000,
                    });
                  }
                }}
                title="Análise de Geometria Facial"
              >
                <ScanFace className="w-4 h-4" />
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
                  ref={imageRef}
                  src={image}
                  alt="Foto do paciente"
                  className="max-w-full max-h-full object-contain select-none pointer-events-none"
                  draggable={false}
                  onLoad={handleImageLoad}
                  crossOrigin="anonymous"
                />


                {/* Face Mesh Overlay */}

                {/* Face Mesh Overlay & Shape Analysis */}
                {showFaceAnalysis && faceMeshResults && imgDimensions.width > 0 && (
                  <>
                    {/* Visual Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div style={{ width: imgDimensions.width, height: imgDimensions.height, position: 'relative' }}>
                        <FaceMeshOverlay
                          results={faceMeshResults}
                          width={imgDimensions.width}
                          height={imgDimensions.height}
                          pointsOfInterest={markers.map(m => ({
                            x: (m.x / 100) * imgDimensions.width,
                            y: (m.y / 100) * imgDimensions.height,
                            label: ''
                          }))}
                        />
                      </div>
                    </div>

                    {/* Face Shape Badge */}
                    {faceShape && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40"
                      >
                        <div className="px-4 py-2 bg-cyan-950/80 backdrop-blur-md border border-cyan-500/50 rounded-full flex items-center gap-3 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                          <ScanFace className="w-4 h-4 text-cyan-400" />
                          <div className="flex flex-col">
                            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest leading-none">GEOMETRIA FACIAL</span>
                            <span className="text-sm font-bold text-white leading-none mt-1">{faceShape.shape}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </>
                )}
              </div>

              {/* Overlay heatmap effect */}
              {showOverlay && markers.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {markers.map((marker) => {
                    const param = getParamInfo(marker.param);
                    const radius = 20 + marker.score * 0.5;
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

              {/* AI Disclaimer Banner */}
              <AnimatePresence>
                {aiDisclaimer && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-4 left-4 right-4 z-40 mx-auto max-w-md"
                  >
                    <div className="bg-blue-950/90 backdrop-blur-md border border-blue-500/30 p-3 rounded-xl flex items-start gap-3 shadow-xl">
                      <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-blue-100 font-medium">Análise Assistida por IA</p>
                        <p className="text-xs text-blue-200/80 mt-1">
                          Os resultados são gerados automaticamente para fins estéticos e de triagem.
                          NÃO substitui o diagnóstico médico profissional.
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-blue-300 hover:text-white -mr-1 -mt-1"
                        onClick={() => setAiDisclaimer(false)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Markers — Tech Infographic Style */}
              {showMarkers &&
                markers.map((marker) => {
                  const param = getParamInfo(marker.param);
                  const isSelected = selectedMarker === marker.id;
                  const severityLabel = marker.score < 34 ? "MILD" : marker.score < 67 ? "MODERATE" : "SIGNIFICANT";
                  return (
                    <motion.div
                      key={marker.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute pointer-events-auto z-10 group"
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
                      {/* Ponto Central Brilhante */}
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor: param.color,
                          boxShadow: `0 0 10px ${param.color}, 0 0 20px ${param.color}80`,
                        }}
                      />

                      {/* Linha fina conectora (efeito infográfico) */}
                      <div
                        className="absolute top-[5px] left-[5px] w-8 h-[1px] origin-left -rotate-45"
                        style={{ backgroundColor: `${param.color}80` }}
                      />

                      {/* Label Flutuante — always visible when selected, hover otherwise */}
                      <div
                        className={`absolute top-[-30px] left-[25px] bg-black/70 backdrop-blur-md border-l-2 px-3 py-1.5 whitespace-nowrap transition-all duration-200 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          }`}
                        style={{ borderLeftColor: param.color }}
                      >
                        <span
                          className="font-bold block uppercase tracking-wider text-[10px]"
                          style={{ color: param.color }}
                        >
                          {param.label} • {marker.score}%
                        </span>
                        <span className="font-light text-[9px] text-gray-300">
                          {severityLabel}
                        </span>
                        {marker.note && (
                          <span className="block text-[9px] text-gray-400 mt-0.5 max-w-[150px] truncate">
                            {marker.note}
                          </span>
                        )}
                      </div>
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
                            max={100}
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
                      className={`touch-target rounded-xl font-medium bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500/30 shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all ${isAiScanning ? "animate-pulse" : ""}`}
                      onClick={toggleAIAnalysis}
                      disabled={isAiScanning}
                    >
                      {isAiScanning ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analisando
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          AI Scan
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

                    {/* Novo Botão de Download com Dropdown ou Lógica Simples */}
                    {image && (
                      <div className="flex gap-1">
                        {/* Salvar Foto Pura */}
                        <Button
                          variant="outline"
                          className="touch-target rounded-xl"
                          onClick={() => handleDownload(false)}
                          disabled={isDownloading}
                          title="Salvar Foto Original"
                        >
                          <Download className="w-4 h-4" />
                        </Button>

                        {/* Salvar Foto com Análise (só aparece se tiver marcadores) */}
                        {markers.length > 0 && (
                          <Button
                            variant="outline"
                            className="touch-target rounded-xl border-primary/50 text-primary"
                            onClick={() => handleDownload(true)}
                            disabled={isDownloading}
                            title="Salvar com Análise"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            <span className="text-xs font-bold">AI</span>
                          </Button>
                        )}
                      </div>
                    )}

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
                        Plano
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
