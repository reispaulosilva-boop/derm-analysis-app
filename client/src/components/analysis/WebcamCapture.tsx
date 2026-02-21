import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw, X, SwitchCamera } from 'lucide-react';
import { toast } from 'sonner';

interface WebcamCaptureProps {
    onCapture: (imageData: string, toggles: { faceShape: boolean, mdCodes: boolean, mapPrecision?: boolean }) => void;
    onClose: () => void;
}

export default function WebcamCapture({ onCapture, onClose }: WebcamCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

    // Initialize Camera stably without any AI loops
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
                        width: { ideal: 1920 }, // Try to get higher quality directly
                        height: { ideal: 1080 },
                        facingMode: facingMode
                    }
                });

                if (mounted) {
                    setStream(localStream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = localStream;
                        videoRef.current.onloadedmetadata = () => {
                            if (mounted) {
                                setIsCameraReady(true);
                            }
                            videoRef.current?.play().catch(e => console.error("Error playing video:", e));
                        };
                    }
                } else {
                    localStream.getTracks().forEach(track => track.stop());
                }
            } catch (err) {
                console.error("Error accessing webcam:", err);
                toast.error("Erro ao acessar a câmera. Verifique as permissões de acesso da lente no seu navegador/celular.");
                onClose();
            }
        };

        startCamera();

        return () => {
            mounted = false;
            // Immediate teardown of camera tracks gracefully when unmounting
            if (localStream) {
                localStream.getTracks().forEach(track => {
                    track.stop();
                    console.log('Camera track forcefully released.');
                });
            }
        };
    }, [facingMode, onClose]);

    // Simple, reliable vanilla canvas extraction
    const captureToCanvas = useCallback(() => {
        if (!videoRef.current) return;

        try {
            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext("2d");

            if (ctx) {
                // If frontal camera, flip the snapshot to act as a mirror
                if (facingMode === "user") {
                    ctx.scale(-1, 1);
                    ctx.translate(-canvas.width, 0);
                }

                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

                // Extrair Base64 na mais alta qualidade JPEG possível (1.0 = Max)
                const dataUrl = canvas.toDataURL("image/jpeg", 1.0);

                // Pass the image directly forward, ignoring the overlays inside the live view
                onCapture(dataUrl, { faceShape: false, mdCodes: false, mapPrecision: false });
            }
        } catch (error) {
            console.error("Erro Fatal no processamento do pixel:", error);
            toast.error("Erro ao congelar o seu frame fotográfico!");
        }
    }, [facingMode, onCapture]);

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">

                {/* Visualizer Limpo */}
                <video
                    ref={videoRef}
                    className={`absolute inset-0 w-full h-full object-cover transform transition-transform duration-300 ${facingMode === "user" ? "-scale-x-100" : ""}`}
                    playsInline
                    autoPlay
                    muted
                />

                {/* Loading State Spinner Base */}
                {!isCameraReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white z-50 transition-opacity">
                        <RefreshCw className="w-10 h-10 animate-spin mb-4 text-cyan-500" />
                        <span className="text-sm uppercase tracking-widest font-semibold text-white/70">Iniciando Lente Ótica...</span>
                    </div>
                )}
            </div>

            {/* Navigation Bar Limpa e Direta */}
            <div className="h-28 bg-black/90 backdrop-blur-lg flex items-center justify-between px-6 pb-safe shadow-[0_-15px_50px_rgba(0,0,0,0.8)] z-50 relative border-t border-white/5">

                {/* Left Controls - Sair */}
                <div className="flex z-10">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 rounded-full w-12 h-12"
                        onClick={onClose}
                    >
                        <X className="w-7 h-7" />
                    </Button>
                </div>

                {/* Center Capture Button - Design de Disparo Maciço */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <Button
                        size="lg"
                        className="rounded-full w-20 h-20 border-4 border-white bg-transparent hover:bg-white/10 p-1.5 shrink-0 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.15)] focus:ring-4 ring-cyan-500/50"
                        onClick={captureToCanvas}
                        disabled={!isCameraReady}
                        aria-label="Capturar Foto"
                    >
                        <div className="w-full h-full bg-white rounded-full transition-transform active:scale-90" />
                    </Button>
                </div>

                {/* Right Controls - Inversão Câmera */}
                <div className="flex z-10">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 rounded-full w-12 h-12"
                        onClick={() => setFacingMode(prev => prev === "user" ? "environment" : "user")}
                        disabled={!isCameraReady}
                    >
                        <SwitchCamera className="w-7 h-7" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
