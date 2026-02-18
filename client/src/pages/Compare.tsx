/**
 * SkinScope — Before & After Comparison Page (Enhanced)
 * Design: "SkinScope" — Dark theme, teal accents, medical device aesthetic
 * Features: Dual photo upload, interactive slider comparison, side-by-side,
 *           date labels, fullscreen presentation mode, opacity blend mode
 * Optimized for iPhone 15 Pro touch + Apple TV display
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Upload,
  SplitSquareHorizontal,
  GripVertical,
  Maximize2,
  X,
  RotateCcw,
  Columns2,
  Blend,
  Camera,
  Calendar,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

type ViewMode = "slider" | "sideBySide" | "blend";

export default function Compare() {
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [blendOpacity, setBlendOpacity] = useState(50);
  const [viewMode, setViewMode] = useState<ViewMode>("slider");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [beforeDate, setBeforeDate] = useState("");
  const [afterDate, setAfterDate] = useState("");
  const [showDateInput, setShowDateInput] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(
    (type: "before" | "after") =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
          toast.error("Selecione uma imagem válida.");
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const result = ev.target?.result as string;
          if (type === "before") {
            setBeforeImage(result);
          } else {
            setAfterImage(result);
          }
        };
        reader.readAsDataURL(file);
        e.target.value = "";
      },
    []
  );

  const handleSliderInteraction = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.max(2, Math.min(98, x)));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      handleSliderInteraction(e.clientX);
    },
    [handleSliderInteraction]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      handleSliderInteraction(e.clientX);
    },
    [isDragging, handleSliderInteraction]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(true);
      handleSliderInteraction(e.touches[0].clientX);
    },
    [handleSliderInteraction]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      handleSliderInteraction(e.touches[0].clientX);
    },
    [isDragging, handleSliderInteraction]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetComparison = () => {
    setBeforeImage(null);
    setAfterImage(null);
    setSliderPosition(50);
    setBlendOpacity(50);
    setBeforeDate("");
    setAfterDate("");
  };

  const cycleViewMode = () => {
    const modes: ViewMode[] = ["slider", "sideBySide", "blend"];
    const currentIndex = modes.indexOf(viewMode);
    setViewMode(modes[(currentIndex + 1) % modes.length]);
  };

  const getViewModeIcon = () => {
    switch (viewMode) {
      case "slider":
        return <SplitSquareHorizontal className="w-4 h-4" />;
      case "sideBySide":
        return <Columns2 className="w-4 h-4" />;
      case "blend":
        return <Blend className="w-4 h-4" />;
    }
  };

  const getViewModeLabel = () => {
    switch (viewMode) {
      case "slider":
        return "Slider";
      case "sideBySide":
        return "Lado a Lado";
      case "blend":
        return "Sobreposição";
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFullscreen]);

  const hasImages = beforeImage && afterImage;

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
            <h1 className="text-lg font-semibold truncate">Antes & Depois</h1>
            <p className="text-xs text-muted-foreground truncate">
              {hasImages
                ? `Modo: ${getViewModeLabel()}`
                : "Carregue duas fotos para comparar"}
            </p>
          </div>
          {hasImages && (
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="touch-target rounded-xl"
                onClick={() => setShowDateInput(!showDateInput)}
              >
                <Calendar
                  className={`w-4 h-4 ${showDateInput ? "text-primary" : ""}`}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="touch-target rounded-xl"
                onClick={cycleViewMode}
              >
                {getViewModeIcon()}
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

      {/* ─── Fullscreen Controls ─── */}
      {isFullscreen && (
        <div className="fixed top-4 right-4 z-[60] flex gap-2">
          <button
            onClick={cycleViewMode}
            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white"
          >
            {getViewModeIcon()}
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
        {!hasImages ? (
          /* ─── Upload State ─── */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center gap-6 px-6"
          >
            <div className="flex gap-4 w-full max-w-sm">
              {/* Before upload */}
              <div
                onClick={() => beforeInputRef.current?.click()}
                className={`flex-1 aspect-[3/4] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all active:scale-[0.98] overflow-hidden ${beforeImage
                  ? "border-amber-500/40 p-0"
                  : "border-border/60 bg-card/30 hover:border-amber-500/30"
                  }`}
              >
                {beforeImage ? (
                  <img
                    src={beforeImage}
                    alt="Antes"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Camera className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="text-center px-2">
                      <p className="text-sm font-medium text-foreground">
                        Antes
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Foto inicial
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* After upload */}
              <div
                onClick={() => afterInputRef.current?.click()}
                className={`flex-1 aspect-[3/4] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all active:scale-[0.98] overflow-hidden ${afterImage
                  ? "border-emerald-500/40 p-0"
                  : "border-border/60 bg-card/30 hover:border-emerald-500/30"
                  }`}
              >
                {afterImage ? (
                  <img
                    src={afterImage}
                    alt="Depois"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Camera className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="text-center px-2">
                      <p className="text-sm font-medium text-foreground">
                        Depois
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Foto atual
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground/60 text-center">
              Selecione as fotos do rolo de câmera do seu iPhone
            </p>

            <input
              ref={beforeInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload("before")}
              className="hidden"
            />
            <input
              ref={afterInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload("after")}
              className="hidden"
            />
          </motion.div>
        ) : (
          /* ─── Comparison Views ─── */
          <>
            {/* Date inputs bar */}
            <AnimatePresence>
              {showDateInput && !isFullscreen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-card/50 border-b border-border/30"
                >
                  <div className="flex gap-3 px-4 py-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-amber-500 font-medium uppercase tracking-wider">
                        Data Antes
                      </label>
                      <input
                        type="date"
                        value={beforeDate}
                        onChange={(e) => setBeforeDate(e.target.value)}
                        className="w-full bg-transparent border-b border-border/50 text-sm text-foreground py-1 focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider">
                        Data Depois
                      </label>
                      <input
                        type="date"
                        value={afterDate}
                        onChange={(e) => setAfterDate(e.target.value)}
                        className="w-full bg-transparent border-b border-border/50 text-sm text-foreground py-1 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {viewMode === "slider" ? (
              /* ─── Slider Mode ─── */
              <div
                ref={containerRef}
                className="flex-1 relative overflow-hidden bg-black/50 select-none cursor-ew-resize"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* After image (full background) */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={afterImage}
                    alt="Depois"
                    className="max-w-full max-h-full object-contain"
                    draggable={false}
                  />
                </div>

                {/* Before image (clipped) */}
                <div
                  className="absolute inset-0 flex items-center justify-center overflow-hidden"
                  style={{
                    clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                  }}
                >
                  <img
                    src={beforeImage}
                    alt="Antes"
                    className="max-w-full max-h-full object-contain"
                    draggable={false}
                  />
                </div>

                {/* Slider line */}
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-white/90 z-10 shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                  style={{ left: `${sliderPosition}%` }}
                >
                  {/* Handle */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-xl flex items-center justify-center border-[3px] border-primary">
                    <GripVertical className="w-4 h-4 text-primary" />
                  </div>
                </div>

                {/* Labels */}
                <div className="absolute top-4 left-4 z-10">
                  <div className="flex flex-col gap-1">
                    <span className="px-3 py-1 rounded-full bg-amber-500/90 text-white text-xs font-semibold backdrop-blur-sm shadow-lg">
                      Antes
                    </span>
                    {beforeDate && (
                      <span className="px-2 py-0.5 rounded-md bg-black/60 text-white/80 text-[10px] backdrop-blur-sm text-center">
                        {new Date(beforeDate + "T12:00:00").toLocaleDateString(
                          "pt-BR",
                          { day: "2-digit", month: "short", year: "numeric" }
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <div className="absolute top-4 right-4 z-10">
                  <div className="flex flex-col gap-1 items-end">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-semibold backdrop-blur-sm shadow-lg">
                      Depois
                    </span>
                    {afterDate && (
                      <span className="px-2 py-0.5 rounded-md bg-black/60 text-white/80 text-[10px] backdrop-blur-sm text-center">
                        {new Date(afterDate + "T12:00:00").toLocaleDateString(
                          "pt-BR",
                          { day: "2-digit", month: "short", year: "numeric" }
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : viewMode === "sideBySide" ? (
              /* ─── Side by Side Mode ─── */
              <div className="flex-1 flex gap-1 p-2 overflow-hidden">
                <div className="flex-1 relative rounded-xl overflow-hidden bg-black/50">
                  <img
                    src={beforeImage}
                    alt="Antes"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 flex flex-col gap-1">
                    <span className="px-3 py-1 rounded-full bg-amber-500/90 text-white text-xs font-semibold backdrop-blur-sm">
                      Antes
                    </span>
                    {beforeDate && (
                      <span className="px-2 py-0.5 rounded-md bg-black/60 text-white/80 text-[10px] backdrop-blur-sm">
                        {new Date(beforeDate + "T12:00:00").toLocaleDateString(
                          "pt-BR",
                          { day: "2-digit", month: "short" }
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1 relative rounded-xl overflow-hidden bg-black/50">
                  <img
                    src={afterImage}
                    alt="Depois"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-semibold backdrop-blur-sm">
                      Depois
                    </span>
                    {afterDate && (
                      <span className="px-2 py-0.5 rounded-md bg-black/60 text-white/80 text-[10px] backdrop-blur-sm">
                        {new Date(afterDate + "T12:00:00").toLocaleDateString(
                          "pt-BR",
                          { day: "2-digit", month: "short" }
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ─── Blend/Opacity Mode ─── */
              <div className="flex-1 relative overflow-hidden bg-black/50">
                {/* Before image (base) */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={beforeImage}
                    alt="Antes"
                    className="max-w-full max-h-full object-contain"
                    draggable={false}
                  />
                </div>
                {/* After image (overlay with opacity) */}
                <div
                  className="absolute inset-0 flex items-center justify-center transition-opacity duration-150"
                  style={{ opacity: blendOpacity / 100 }}
                >
                  <img
                    src={afterImage}
                    alt="Depois"
                    className="max-w-full max-h-full object-contain"
                    draggable={false}
                  />
                </div>

                {/* Opacity slider */}
                <div className="absolute bottom-4 left-4 right-4 z-10">
                  <div className="bg-black/70 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-amber-500 font-medium uppercase tracking-wider">
                        Antes
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={blendOpacity}
                        onChange={(e) =>
                          setBlendOpacity(parseInt(e.target.value))
                        }
                        className="flex-1 h-1.5 rounded-full appearance-none bg-white/20 accent-primary"
                      />
                      <span className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider">
                        Depois
                      </span>
                    </div>
                    <div className="text-center mt-1">
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {blendOpacity}% sobreposição
                      </span>
                    </div>
                  </div>
                </div>

                {/* Labels */}
                <div className="absolute top-4 left-4 z-10">
                  <span className="px-3 py-1 rounded-full bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
                    Sobreposição
                  </span>
                </div>
              </div>
            )}

            {/* ─── Bottom Controls ─── */}
            {!isFullscreen && (
              <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                className="bg-card/95 backdrop-blur-xl border-t border-border/50 px-4 py-3 safe-bottom shrink-0"
              >
                {/* View mode tabs */}
                <div className="flex gap-1 mb-3 bg-muted/50 rounded-xl p-1">
                  {(
                    [
                      {
                        mode: "slider" as ViewMode,
                        icon: <SplitSquareHorizontal className="w-3.5 h-3.5" />,
                        label: "Slider",
                      },
                      {
                        mode: "sideBySide" as ViewMode,
                        icon: <Columns2 className="w-3.5 h-3.5" />,
                        label: "Lado a Lado",
                      },
                      {
                        mode: "blend" as ViewMode,
                        icon: <Blend className="w-3.5 h-3.5" />,
                        label: "Sobreposição",
                      },
                    ] as const
                  ).map(({ mode, icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${viewMode === mode
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 touch-target rounded-xl text-xs"
                    onClick={() => beforeInputRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Trocar Antes
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 touch-target rounded-xl text-xs"
                    onClick={() => afterInputRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Trocar Depois
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="touch-target rounded-xl text-muted-foreground shrink-0"
                    onClick={resetComparison}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>

                {/* Hidden file inputs */}
                <input
                  ref={beforeInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload("before")}
                  className="hidden"
                />
                <input
                  ref={afterInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload("after")}
                  className="hidden"
                />
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
