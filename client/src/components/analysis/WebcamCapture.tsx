import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw, X, ScanFace, Info, Activity, SwitchCamera } from 'lucide-react';
import { mediaPipeService } from '@/services/MediaPipeService';
import { toast } from 'sonner';
import { FaceLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import FaceMeshOverlay from './FaceMeshOverlay';
import MDCodesOverlay from './MDCodesOverlay';
import MAPPrecisionOverlay from './MAPPrecisionOverlay';
import { evaluateFaceShape, type FaceShapeAnalysis, LANDMARKS } from '@/utils/faceGeometry';
import { motion } from 'framer-motion';
import { saveCanvasImage } from '@/utils/imageHelpers';
import { Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import { FACE_OVAL_INDICES, solveCatmullRom } from '@/components/analysis/FaceMeshOverlay';

interface WebcamCaptureProps {
    onCapture: (imageData: string, toggles: { faceShape: boolean, mdCodes: boolean, mapPrecision?: boolean }) => void;
    onClose: () => void;
}

export default function WebcamCapture({ onCapture, onClose }: WebcamCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const requestRef = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

    // Evaluation States
    const [showFaceAnalysis, setShowFaceAnalysis] = useState(false);
    const [showMDCodes, setShowMDCodes] = useState(false);
    const [showMAPPrecision, setShowMAPPrecision] = useState(false);
    const [faceMeshResults, setFaceMeshResults] = useState<any>(null);
    const [faceShape, setFaceShape] = useState<FaceShapeAnalysis | null>(null);
    const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
    const [scale, setScale] = useState(1);
    const [isDownloading, setIsDownloading] = useState(false);

    // Calculate object-cover scale
    useEffect(() => {
        const handleResize = () => {
            if (!containerRef.current || videoDimensions.width === 0) return;
            const { width: cW, height: cH } = containerRef.current.getBoundingClientRect();
            const s = Math.max(cW / videoDimensions.width, cH / videoDimensions.height);
            setScale(s);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [videoDimensions]);


    // Initialize Camera
    useEffect(() => {
        let mounted = true;
        let localStream: MediaStream | null = null;

        const startCamera = async () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            setIsCameraReady(false);

            try {
                localStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: facingMode
                    }
                });

                if (mounted) {
                    setStream(localStream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = localStream;
                        // Important: wait for video to load metadata to get dimensions
                        videoRef.current.onloadedmetadata = () => {
                            if (mounted) {
                                setIsCameraReady(true);
                                setVideoDimensions({ width: videoRef.current!.videoWidth, height: videoRef.current!.videoHeight });
                            }
                            videoRef.current?.play().catch(e => console.error("Error playing video:", e));
                        };
                    }
                } else {
                    localStream.getTracks().forEach(track => track.stop());
                }
            } catch (err) {
                console.error("Error accessing webcam:", err);
                toast.error("Erro ao acessar a câmera. Verifique as permissões.");
                onClose();
            }
        };

        startCamera();

        return () => {
            mounted = false;
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
            // Switch back to IMAGE mode when closing camera
            mediaPipeService.setRunningMode("IMAGE").catch(console.error);
        };
    }, [facingMode]);

    // Real-time Detection Loop
    const predictWebcam = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !isCameraReady) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        // Match canvas size to video
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        try {
            // Ensure we are in VIDEO mode
            await mediaPipeService.setRunningMode("VIDEO");

            const startTimeMs = performance.now();
            const results = await mediaPipeService.detectVideo(video, startTimeMs);

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw results
            if (results && results.faceLandmarks) {
                setFaceMeshResults(results);

                if (showFaceAnalysis && results.faceLandmarks.length > 0) {
                    const shape = evaluateFaceShape(results.faceLandmarks[0]);
                    setFaceShape(shape);
                } else if (!showFaceAnalysis && faceShape) {
                    setFaceShape(null);
                }

                // If no custom overlays are active, optionally draw basic wireframes
                if (!showFaceAnalysis && !showMDCodes && !showMAPPrecision) {
                    const drawingUtils = new DrawingUtils(ctx);
                    for (const landmarks of results.faceLandmarks) {
                        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: "#C0C0C070", lineWidth: 1 });
                        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: "#E0E0E0" });
                    }
                }
            } else {
                setFaceMeshResults(null);
                setFaceShape(null);
            }
        } catch (error) {
            console.error("Error in webcam prediction:", error);
        }

        requestRef.current = requestAnimationFrame(predictWebcam);
    }, [isCameraReady, showFaceAnalysis, showMDCodes, showMAPPrecision]);

    // Start loop when ready
    useEffect(() => {
        if (isCameraReady) {
            predictWebcam();
        }
    }, [isCameraReady, predictWebcam]);

    const captureToCanvas = () => {
        if (!videoRef.current) return;

        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");

        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL("image/jpeg");

            // Switch back to IMAGE mode before analyzing
            mediaPipeService.setRunningMode("IMAGE").then(() => {
                onCapture(dataUrl, { faceShape: showFaceAnalysis, mdCodes: showMDCodes, mapPrecision: showMAPPrecision });
            });
        }
    };

    const handleDownloadCapture = async (withOverlay: boolean) => {
        if (!videoRef.current) return;
        setIsDownloading(true);
        const toastId = toast.loading("Preparando imagem...");

        try {
            const video = videoRef.current;
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");

            if (!ctx) throw new Error("Erro ao criar contexto de imagem");

            // 1. Draw original photo
            ctx.save();
            if (facingMode === "user") {
                // Mirror for frontal camera to get a natural look
                ctx.scale(-1, 1);
                ctx.translate(-canvas.width, 0);
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            ctx.restore();

            // 2. Draw overlay if requested
            if (withOverlay) {
                // Determine landmarks based on facing mode, just like the SVG overlay does
                const processedLandmarks = faceMeshResults?.faceLandmarks?.length > 0
                    ? (facingMode === "user" ? faceMeshResults.faceLandmarks[0].map((pt: any) => ({ ...pt, x: 1 - pt.x })) : faceMeshResults.faceLandmarks[0])
                    : null;

                if (processedLandmarks) {
                    const cw = canvas.width;
                    const ch = canvas.height;
                    const toX = (idx: number) => processedLandmarks[idx].x * cw;
                    const toY = (idx: number) => processedLandmarks[idx].y * ch;

                    // ── Helper: draw a dot ──
                    const drawDot = (x: number, y: number, color: string, radius: number = 6) => {
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(x, y, radius, 0, 2 * Math.PI);
                        ctx.fillStyle = color;
                        ctx.fill();
                        ctx.strokeStyle = "white";
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                        ctx.restore();
                    };

                    // ── Helper: draw a measurement line ──
                    const drawLine = (x1: number, y1: number, x2: number, y2: number, color: string, dashed: boolean = false) => {
                        ctx.save();
                        ctx.beginPath();
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 4;
                        ctx.shadowColor = color;
                        ctx.shadowBlur = 8;
                        if (dashed) ctx.setLineDash([10, 6]);
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                        ctx.stroke();
                        ctx.restore();
                    };

                    const drawMAPPath = (indices: number[], color: string, lineWidth: number) => {
                        if (indices.length === 0) return;
                        ctx.save();
                        ctx.beginPath();
                        ctx.strokeStyle = color;
                        ctx.lineWidth = lineWidth;
                        ctx.lineCap = "round";
                        ctx.lineJoin = "round";
                        ctx.globalAlpha = 0.8;
                        ctx.shadowColor = color;
                        ctx.shadowBlur = 10;

                        indices.forEach((idx, i) => {
                            const x = processedLandmarks[idx].x * cw;
                            const y = processedLandmarks[idx].y * ch;
                            if (i === 0) ctx.moveTo(x, y);
                            else ctx.lineTo(x, y);
                        });
                        ctx.stroke();

                        // Draw Points
                        ctx.globalAlpha = 1;
                        ctx.shadowBlur = 0;
                        indices.forEach(idx => {
                            const x = processedLandmarks[idx].x * cw;
                            const y = processedLandmarks[idx].y * ch;
                            ctx.beginPath();
                            ctx.arc(x, y, 4, 0, 2 * Math.PI);
                            ctx.fillStyle = "#ffffff";
                            ctx.fill();
                        });
                        ctx.restore();
                    };

                    if (showFaceAnalysis) {
                        try {
                            const ovalPoints = FACE_OVAL_INDICES.map(idx => ({
                                x: processedLandmarks[idx].x * cw,
                                y: processedLandmarks[idx].y * ch,
                            }));
                            const closedPoints = [...ovalPoints, ovalPoints[0], ovalPoints[1], ovalPoints[2]];
                            const pathStr = solveCatmullRom(closedPoints, 0.75);

                            const path2d = new Path2D(pathStr);

                            ctx.save();
                            ctx.strokeStyle = "#00ffff";
                            ctx.lineWidth = 4;
                            ctx.globalAlpha = 0.4;
                            ctx.shadowColor = "#00ffff";
                            ctx.shadowBlur = 12;
                            ctx.stroke(path2d);
                            ctx.restore();

                            ctx.save();
                            ctx.strokeStyle = "#00ffff";
                            ctx.lineWidth = 2;
                            ctx.globalAlpha = 0.8;
                            ctx.stroke(path2d);
                            ctx.restore();

                            const zyLx = toX(LANDMARKS.ZYGOMA_LEFT), zyLy = toY(LANDMARKS.ZYGOMA_LEFT);
                            const zyRx = toX(LANDMARKS.ZYGOMA_RIGHT), zyRy = toY(LANDMARKS.ZYGOMA_RIGHT);
                            drawLine(zyLx, zyLy, zyRx, zyRy, "#00ffff", true);
                            drawDot(zyLx, zyLy, "#00ffff");
                            drawDot(zyRx, zyRy, "#00ffff");

                            // 2. Bigonial Width (Magenta)
                            const goLx = toX(LANDMARKS.GONION_LEFT_ALT), goLy = toY(LANDMARKS.GONION_LEFT_ALT);
                            const goRx = toX(LANDMARKS.GONION_RIGHT_ALT), goRy = toY(LANDMARKS.GONION_RIGHT_ALT);
                            drawLine(goLx, goLy, goRx, goRy, "#ff00ff", true);
                            drawDot(goLx, goLy, "#ff00ff");
                            drawDot(goRx, goRy, "#ff00ff");

                            // 3. Facial Height (Amber)
                            const glX = toX(LANDMARKS.GLABELLA), glY = toY(LANDMARKS.GLABELLA);
                            const meX = toX(LANDMARKS.MENTON), meY = toY(LANDMARKS.MENTON);
                            drawLine(glX, glY, meX, meY, "#fbbf24", false);
                            drawDot(glX, glY, "#fbbf24");
                            drawDot(meX, meY, "#fbbf24");

                            // 4. Chin Shape Curve (Lime)
                            ctx.save();
                            ctx.beginPath();
                            ctx.strokeStyle = "#a3e635";
                            ctx.lineWidth = 4;
                            ctx.globalAlpha = 0.8;
                            ctx.shadowColor = "#a3e635";
                            ctx.shadowBlur = 8;
                            ctx.moveTo(goRx, goRy);
                            ctx.quadraticCurveTo(meX, meY + (ch * 0.05), goLx, goLy);
                            ctx.stroke();
                            ctx.restore();

                            // ── 2b. Summary Card (Face Shape Result) ──
                            if (faceShape) {
                                const cardX = cw * 0.03;
                                const cardY = ch * 0.03;
                                const cardW = cw * 0.32;
                                const cardH = ch * 0.28;
                                const padding = cardW * 0.06;

                                // Card background
                                ctx.save();
                                ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
                                ctx.beginPath();
                                const r = 16;
                                ctx.moveTo(cardX + r, cardY);
                                ctx.lineTo(cardX + cardW - r, cardY);
                                ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + r, r);
                                ctx.lineTo(cardX + cardW, cardY + cardH - r);
                                ctx.arcTo(cardX + cardW, cardY + cardH, cardX + cardW - r, cardY + cardH, r);
                                ctx.lineTo(cardX + r, cardY + cardH);
                                ctx.arcTo(cardX, cardY + cardH, cardX, cardY + cardH - r, r);
                                ctx.lineTo(cardX, cardY + r);
                                ctx.arcTo(cardX, cardY, cardX + r, cardY, r);
                                ctx.closePath();
                                ctx.fill();

                                // Card border
                                ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
                                ctx.lineWidth = 1.5;
                                ctx.shadowBlur = 0;
                                ctx.stroke();
                                ctx.restore();

                                let yOffset = cardY + padding;
                                const fontSize = Math.max(14, cardW * 0.07);
                                const titleSize = Math.max(20, cardW * 0.12);

                                // "Resultado" label
                                ctx.save();
                                ctx.font = `600 ${fontSize * 0.85}px Arial, sans-serif`;
                                ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
                                ctx.fillText("RESULTADO", cardX + padding, yOffset + fontSize);
                                yOffset += fontSize + 6;

                                // Face shape name
                                ctx.font = `bold ${titleSize}px Arial, sans-serif`;
                                ctx.fillStyle = "white";
                                ctx.fillText(faceShape.shape, cardX + padding, yOffset + titleSize);
                                yOffset += titleSize + 12;

                                // Separator
                                ctx.beginPath();
                                ctx.moveTo(cardX + padding, yOffset);
                                ctx.lineTo(cardX + cardW - padding, yOffset);
                                ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
                                ctx.lineWidth = 1;
                                ctx.stroke();
                                yOffset += 12;

                                // Metric bars
                                const metrics = [
                                    { label: "Bizigomática", value: faceShape.metrics.bizygomaticWidth, color: "#22d3ee" },
                                    { label: "Bigonial", value: faceShape.metrics.bigonialWidth, color: "#e879f9" },
                                    { label: "Altura Facial", value: faceShape.metrics.facialHeight, color: "#fbbf24" },
                                ];

                                const barMax = cardW - padding * 2;
                                const barH = Math.max(4, cardH * 0.025);

                                metrics.forEach((m) => {
                                    // Label and value
                                    ctx.font = `500 ${fontSize * 0.7}px Arial, sans-serif`;
                                    ctx.fillStyle = m.color;
                                    ctx.fillText(m.label, cardX + padding, yOffset + fontSize * 0.7);
                                    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
                                    ctx.textAlign = "right";
                                    ctx.fillText((m.value * 100).toFixed(1), cardX + cardW - padding, yOffset + fontSize * 0.7);
                                    ctx.textAlign = "left";
                                    yOffset += fontSize * 0.7 + 4;

                                    // Background bar
                                    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
                                    ctx.fillRect(cardX + padding, yOffset, barMax, barH);

                                    // Value bar
                                    ctx.fillStyle = m.color;
                                    ctx.fillRect(cardX + padding, yOffset, Math.min(m.value * 1.2, 1) * barMax, barH);
                                    yOffset += barH + 10;
                                });

                                // Ratio line
                                ctx.font = `400 ${fontSize * 0.6}px Arial, sans-serif`;
                                ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
                                ctx.fillText("Proporção (Med/Inf)", cardX + padding, yOffset + fontSize * 0.6);
                                ctx.fillStyle = "white";
                                ctx.textAlign = "right";
                                ctx.fillText(faceShape.metrics.midLowerRatio.toFixed(2), cardX + cardW - padding, yOffset + fontSize * 0.6);
                                ctx.textAlign = "left";
                                ctx.restore();
                            }
                        } catch (e) {
                            console.error("Error drawing face analysis overlay on canvas", e);
                        }
                    }

                    if (showMAPPrecision) {
                        const glabela = [10, 151, 9, 8, 168, 6].filter(i => i < processedLandmarks.length);
                        const periocularLeft = [33, 161, 160, 159, 158, 157, 133].filter(i => i < processedLandmarks.length);
                        const periocularRight = [263, 388, 387, 386, 385, 384, 362].filter(i => i < processedLandmarks.length);
                        const malarLeft = [116, 117, 118, 119, 120, 121].filter(i => i < processedLandmarks.length);
                        const malarRight = [345, 346, 347, 348, 349, 350].filter(i => i < processedLandmarks.length);

                        // Upper Third / Fronte
                        drawMAPPath(glabela, "#8b5cf6", 4);
                        drawMAPPath(periocularLeft, "#3b82f6", 3.5);
                        drawMAPPath(periocularRight, "#3b82f6", 3.5);

                        // Middle Third / Malar
                        drawMAPPath(malarLeft, "#10b981", 4.5);
                        drawMAPPath(malarRight, "#10b981", 4.5);
                    }

                    if (showMDCodes) {
                        try {
                            const { MD_CODES_CLINICAL } = require('../../utils/mdCodesClinical');
                            ctx.save();
                            ctx.font = 'bold 12px Arial';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';

                            Object.entries(MD_CODES_CLINICAL).forEach(([code, data]: [string, any]) => {
                                let x = 0; let y = 0;
                                let count = 0;

                                const indices = data.landmarkIndices || [];
                                indices.forEach((idx: number) => {
                                    if (idx < processedLandmarks.length) {
                                        x += processedLandmarks[idx].x * cw;
                                        y += processedLandmarks[idx].y * ch;
                                        count++;
                                    }
                                });

                                if (count > 0) {
                                    x /= count;
                                    y /= count;

                                    // Draw circle
                                    ctx.beginPath();
                                    ctx.arc(x, y, 14, 0, 2 * Math.PI);
                                    ctx.fillStyle = data.color + '80'; // 50% opacity
                                    ctx.fill();

                                    ctx.lineWidth = 2;
                                    ctx.strokeStyle = data.color;
                                    ctx.stroke();

                                    // Draw text
                                    ctx.fillStyle = '#FFFFFF';
                                    ctx.fillText(code, x, y);
                                }
                            });
                            ctx.restore();
                        } catch (e) {
                            console.error("Error drawing MD Codes on canvas", e);
                        }
                    }
                }
            }

            // 3. Save Image
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const filename = `camera-inteligente-${withOverlay ? "com-marcadores" : "original"}-${timestamp}.jpg`;

            await saveCanvasImage(canvas, filename);
            toast.success("Imagem salva com sucesso!", { id: toastId });

        } catch (error) {
            console.error("Erro ao baixar imagem:", error);
            toast.error("Erro ao salvar a imagem. Tente novamente.", { id: toastId });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div ref={containerRef} className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
                {/* Mirror effect for better UX (only for frontal camera) */}
                <video
                    ref={videoRef}
                    className={`absolute inset-0 w-full h-full object-cover transform ${facingMode === "user" ? "-scale-x-100" : ""}`}
                    playsInline
                    muted
                />
                <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 w-full h-full object-cover transform ${facingMode === "user" ? "-scale-x-100" : ""} pointer-events-none`}
                />

                {/* SVG Configured Overlays */}
                {videoDimensions.width > 0 && faceMeshResults?.faceLandmarks?.length > 0 && (
                    <div
                        className="absolute top-1/2 left-1/2 pointer-events-none z-10"
                        style={{
                            width: videoDimensions.width,
                            height: videoDimensions.height,
                            transform: `translate(-50%, -50%) scale(${scale})`
                        }}
                    >
                        {(() => {
                            // Video is mirrored on screen via CSS transform -scale-x-100 for frontal camera.
                            // To match the SVG without inverting text, we flip the X coordinates of the landmarks manually
                            // only when facingMode is 'user', and leave the SVG container un-flipped.
                            const processedLandmarks = facingMode === "user"
                                ? faceMeshResults.faceLandmarks[0].map((pt: any) => ({ ...pt, x: 1 - pt.x }))
                                : faceMeshResults.faceLandmarks[0];
                            const processedResults = { faceLandmarks: [processedLandmarks] };

                            return (
                                <>
                                    {showFaceAnalysis && (
                                        <FaceMeshOverlay
                                            results={processedResults as any}
                                            width={videoDimensions.width}
                                            height={videoDimensions.height}
                                        />
                                    )}
                                    {showMDCodes && (
                                        <MDCodesOverlay
                                            landmarks={processedLandmarks as any}
                                            width={videoDimensions.width}
                                            height={videoDimensions.height}
                                        />
                                    )}
                                    {showMAPPrecision && (
                                        <MAPPrecisionOverlay
                                            landmarks={processedLandmarks as any}
                                            width={videoDimensions.width}
                                            height={videoDimensions.height}
                                        />
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* Summary Card for Face Shape */}
                {showFaceAnalysis && faceShape && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="absolute top-4 left-4 z-50 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl min-w-[160px] scale-75 md:scale-90 origin-top-left pointer-events-none"
                    >
                        <div className="space-y-3">
                            <div className="border-b border-white/10 pb-2 mb-2">
                                <h3 className="text-xs text-white/60 font-medium uppercase tracking-wider">Resultado</h3>
                                <p className="text-xl font-bold text-white mt-0.5">{faceShape.shape}</p>
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-cyan-400">Largura Bizigomática</span>
                                    </div>
                                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(faceShape.metrics.bizygomaticWidth * 120, 100)}%` }} className="h-full bg-cyan-400" />
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-white/10 mt-1">
                                    <div className="flex justify-between text-[9px]">
                                        <span className="text-white/60">Proporção (Med/Inf)</span>
                                        <span className="text-white font-mono">{(faceShape.metrics.midLowerRatio).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {!isCameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center text-white z-50">
                        <RefreshCw className="w-8 h-8 animate-spin" />
                    </div>
                )}
            </div>

            <div className="h-24 bg-black/80 flex items-center justify-between px-6 md:px-8 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-50">
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 rounded-full w-12 h-12"
                        onClick={onClose}
                    >
                        <X className="w-6 h-6" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 rounded-full w-12 h-12"
                        onClick={() => setFacingMode(prev => prev === "user" ? "environment" : "user")}
                    >
                        <SwitchCamera className="w-6 h-6" />
                    </Button>
                </div>

                <Button
                    size="lg"
                    className="rounded-full w-16 h-16 border-4 border-white bg-transparent hover:bg-white/20 p-1 mx-2 shrink-0 transition-transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    onClick={captureToCanvas}
                    disabled={!isCameraReady}
                >
                    <div className="w-full h-full bg-white rounded-full" />
                </Button>

                {/* Avaliação em Tempo Real Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="default"
                            className={`rounded-xl px-4 md:px-6 flex flex-col items-center justify-center gap-1.5 h-auto py-2.5 transition-all shadow-lg ${showFaceAnalysis || showMDCodes || showMAPPrecision
                                ? "bg-cyan-600 hover:bg-cyan-500 text-white border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)]"
                                : "bg-zinc-800/80 hover:bg-zinc-700 text-cyan-400 border border-cyan-500/50 backdrop-blur-md"
                                }`}
                        >
                            <ScanFace className="w-6 h-6" />
                            <span className="text-[10px] md:text-xs uppercase font-bold tracking-wider">Avaliação em Tempo Real</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 mb-2 border-white/10 bg-black/80 backdrop-blur-xl">
                        <div className="px-2 py-1.5 text-[10px] text-white/50 uppercase font-bold tracking-widest mb-1">
                            Avaliação em Tempo Real
                        </div>
                        <DropdownMenuItem
                            onClick={() => setShowFaceAnalysis(!showFaceAnalysis)}
                            className="cursor-pointer text-white focus:bg-white/10"
                        >
                            <ScanFace className="w-4 h-4 mr-2" />
                            <span>Forma Facial</span>
                            {showFaceAnalysis && (
                                <span className="ml-auto text-xs font-mono text-cyan-500">(Ativo)</span>
                            )}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={() => setShowMDCodes(!showMDCodes)}
                            className="cursor-pointer text-white focus:bg-white/10"
                        >
                            <Info className="w-4 h-4 mr-2" />
                            <span>MD Codes</span>
                            {showMDCodes && (
                                <span className="ml-auto text-xs font-mono text-cyan-500">(Ativo)</span>
                            )}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={() => setShowMAPPrecision(!showMAPPrecision)}
                            className="cursor-pointer text-white focus:bg-white/10"
                        >
                            <Activity className="w-4 h-4 mr-2" />
                            <span>MAP Precision (Terços)</span>
                            {showMAPPrecision && (
                                <span className="ml-auto text-xs font-mono text-cyan-500">(Ativo)</span>
                            )}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Download Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className="rounded-xl px-4 flex flex-col items-center justify-center gap-1.5 h-auto py-2.5 transition-all shadow-lg bg-zinc-800/80 hover:bg-zinc-700 text-white border border-white/20 backdrop-blur-md"
                            disabled={isDownloading || !isCameraReady}
                            title="Salvar Foto"
                        >
                            {isDownloading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <Download className="w-6 h-6" />
                            )}
                            <span className="text-[10px] md:text-xs uppercase font-bold tracking-wider">Salvar</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-auto mb-2 border-white/10 bg-black/80 backdrop-blur-xl">
                        <DropdownMenuItem onClick={() => handleDownloadCapture(false)} className="cursor-pointer text-white focus:bg-white/10">
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Salvar Original
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadCapture(true)} className="cursor-pointer text-white focus:bg-white/10">
                            <ScanFace className="w-4 h-4 mr-2" />
                            Salvar com Análise
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
