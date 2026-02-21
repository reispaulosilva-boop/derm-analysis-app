/**
 * useLiveBlendshapes Hook
 * 
 * Runs MediaPipe FaceLandmarker in VIDEO mode on a live video feed,
 * extracting blendshapes and landmarks at ~15fps for real-time
 * Dynamic Discord analysis.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { NormalizedLandmark, Classifications } from '@mediapipe/tasks-vision';
import { mediaPipeService } from '../services/MediaPipeService';
import { analyzeDynamicDiscord, type DynamicDiscordResult } from '../utils/dynamicDiscord';

interface UseLiveBlendshapesResult {
    /** Whether the MediaPipe model is ready */
    isReady: boolean;
    /** Current face landmarks (normalized) */
    landmarks: NormalizedLandmark[] | null;
    /** Raw blendshapes from current frame */
    blendshapes: Classifications | null;
    /** Processed Dynamic Discord result */
    discordResult: DynamicDiscordResult | null;
    /** Any error during initialization or detection */
    error: Error | null;
}

/** Target FPS for analysis — balance between responsiveness and battery */
const TARGET_FPS = 15;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

export function useLiveBlendshapes(
    videoRef: React.RefObject<HTMLVideoElement | null>,
    enabled: boolean
): UseLiveBlendshapesResult {
    const [isReady, setIsReady] = useState(false);
    const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
    const [blendshapes, setBlendshapes] = useState<Classifications | null>(null);
    const [discordResult, setDiscordResult] = useState<DynamicDiscordResult | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const rafIdRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(0);
    const isRunningRef = useRef(false);

    // Initialize and set VIDEO mode
    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;

        const init = async () => {
            try {
                await mediaPipeService.initialize();
                await mediaPipeService.setRunningMode('VIDEO');
                if (!cancelled) {
                    setIsReady(true);
                    setError(null);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err : new Error('Failed to initialize MediaPipe for VIDEO'));
                }
            }
        };

        init();

        return () => {
            cancelled = true;
        };
    }, [enabled]);

    // Detection loop
    const detect = useCallback(async () => {
        if (!enabled || !isReady || !videoRef.current) {
            isRunningRef.current = false;
            return;
        }

        const video = videoRef.current;

        // Guard: video must be playing and have dimensions
        if (video.paused || video.ended || video.readyState < 2) {
            rafIdRef.current = requestAnimationFrame(() => detect());
            return;
        }

        const now = performance.now();
        const elapsed = now - lastFrameTimeRef.current;

        if (elapsed >= FRAME_INTERVAL_MS) {
            lastFrameTimeRef.current = now - (elapsed % FRAME_INTERVAL_MS);

            try {
                const result = await mediaPipeService.detectVideo(video, Math.round(now));

                if (result) {
                    if (result.faceLandmarks?.length) {
                        setLandmarks(result.faceLandmarks[0]);
                    } else {
                        setLandmarks(null);
                    }

                    if (result.faceBlendshapes?.length) {
                        const bs = result.faceBlendshapes[0];
                        setBlendshapes(bs);
                        setDiscordResult(analyzeDynamicDiscord(bs));
                    } else {
                        setBlendshapes(null);
                        setDiscordResult(null);
                    }
                }
            } catch (err) {
                // Don't crash the loop on transient errors
                console.warn('[useLiveBlendshapes] Detection error:', err);
            }
        }

        if (isRunningRef.current) {
            rafIdRef.current = requestAnimationFrame(() => detect());
        }
    }, [enabled, isReady, videoRef]);

    // Start / stop the detection loop
    useEffect(() => {
        if (enabled && isReady) {
            isRunningRef.current = true;
            rafIdRef.current = requestAnimationFrame(() => detect());
        } else {
            isRunningRef.current = false;
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        }

        return () => {
            isRunningRef.current = false;
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, [enabled, isReady, detect]);

    // Cleanup: reset to IMAGE mode when disabled
    useEffect(() => {
        return () => {
            // When unmounting or disabling, switch back to IMAGE mode
            mediaPipeService.setRunningMode('IMAGE').catch(() => {
                // Silently ignore — may not be initialized
            });
        };
    }, []);

    return { isReady, landmarks, blendshapes, discordResult, error };
}
