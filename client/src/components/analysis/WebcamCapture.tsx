import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw, X, ScanFace, Info } from 'lucide-react';
import { mediaPipeService } from '@/services/MediaPipeService';
import { toast } from 'sonner';
import { FaceLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import FaceMeshOverlay from './FaceMeshOverlay';
import MDCodesOverlay from './MDCodesOverlay';
import { evaluateFaceShape, type FaceShapeAnalysis } from '@/utils/faceGeometry';
import { motion } from 'framer-motion';

interface WebcamCaptureProps {
    onCapture: (imageData: string, toggles: { faceShape: boolean, mdCodes: boolean }) => void;
    onClose: () => void;
}

export default function WebcamCapture({ onCapture, onClose }: WebcamCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const requestRef = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Evaluation States
    const [showFaceAnalysis, setShowFaceAnalysis] = useState(false);
    const [showMDCodes, setShowMDCodes] = useState(false);
    const [faceMeshResults, setFaceMeshResults] = useState<any>(null);
    const [faceShape, setFaceShape] = useState<FaceShapeAnalysis | null>(null);
    const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
    const [scale, setScale] = useState(1);

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
            try {
                localStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: "user"
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
    }, []);

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
                if (!showFaceAnalysis && !showMDCodes) {
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
    }, [isCameraReady, showFaceAnalysis, showMDCodes]);

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
                onCapture(dataUrl, { faceShape: showFaceAnalysis, mdCodes: showMDCodes });
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div ref={containerRef} className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
                {/* Mirror effect for better UX */}
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
                    playsInline
                    muted
                />
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none"
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
                            // Video is mirrored on screen via CSS transform -scale-x-100.
                            // To match the SVG without inverting text, we flip the X coordinates of the landmarks manually
                            // and leave the SVG container un-flipped.
                            const mirroredLandmarks = faceMeshResults.faceLandmarks[0].map((pt: any) => ({ ...pt, x: 1 - pt.x }));
                            const mirroredResults = { faceLandmarks: [mirroredLandmarks] };

                            return (
                                <>
                                    {showFaceAnalysis && (
                                        <FaceMeshOverlay
                                            results={mirroredResults as any}
                                            width={videoDimensions.width}
                                            height={videoDimensions.height}
                                        />
                                    )}
                                    {showMDCodes && (
                                        <MDCodesOverlay
                                            landmarks={mirroredLandmarks as any}
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

            <div className="h-24 bg-black/80 flex items-center justify-between px-8 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-50">
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 rounded-full w-12 h-12"
                    onClick={onClose}
                >
                    <X className="w-6 h-6" />
                </Button>

                <Button
                    size="lg"
                    className="rounded-full w-16 h-16 border-4 border-white bg-transparent hover:bg-white/20 p-1 mx-4 shrink-0 transition-transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
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
                            className={`rounded-xl px-4 md:px-6 flex flex-col items-center justify-center gap-1.5 h-auto py-2.5 transition-all shadow-lg ${showFaceAnalysis || showMDCodes
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
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
