import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { FaceLandmarker, FilesetResolver, FaceLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';

interface FaceMeshResult {
    landmarks: NormalizedLandmark[];
    faceBlendshapes: any; // Using any for simplicity as blendshapes might be complex
}

interface UseFaceMesh {
    isLoading: boolean;
    error: Error | null;
    results: FaceLandmarkerResult | null;
    detectFace: (imageElement: HTMLImageElement) => Promise<NormalizedLandmark[] | null>;
}

export const useFaceMesh = (): UseFaceMesh => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [results, setResults] = useState<FaceLandmarkerResult | null>(null);
    const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);

    useEffect(() => {
        let isMounted = true;

        const createFaceLandmarker = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
                );

                if (!isMounted) return;

                const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                        delegate: "GPU"
                    },
                    outputFaceBlendshapes: true,
                    runningMode: "IMAGE",
                    numFaces: 1
                });

                if (isMounted) {
                    faceLandmarkerRef.current = faceLandmarker;
                    setIsLoading(false);
                } else {
                    faceLandmarker.close();
                }

            } catch (err: any) {
                if (isMounted) {
                    setError(err instanceof Error ? err : new Error('Failed to load FaceLandmarker'));
                    setIsLoading(false);
                }
            }
        };

        createFaceLandmarker();

        return () => {
            isMounted = false;
            if (faceLandmarkerRef.current) {
                faceLandmarkerRef.current.close();
                faceLandmarkerRef.current = null;
            }
        };
    }, []);

    const detectFace = useCallback(async (imageElement: HTMLImageElement): Promise<NormalizedLandmark[] | null> => {
        if (!faceLandmarkerRef.current) {
            if (isLoading) {
                console.warn('FaceLandmarker is still loading.');
                return null;
            }
            if (error) {
                console.error('FaceLandmarker failed to load:', error);
                return null;
            }
            // Should not happen if correctly handled
            return null;
        }

        try {
            // Run detection
            const detectionResult = faceLandmarkerRef.current.detect(imageElement);
            setResults(detectionResult);

            if (detectionResult.faceLandmarks && detectionResult.faceLandmarks.length > 0) {
                return detectionResult.faceLandmarks[0];
            }
            return null;
        } catch (err) {
            console.error('Error detecting face:', err);
            setError(err instanceof Error ? err : new Error('Failed to detect face'));
            return null;
        }
    }, [isLoading, error]);

    return { isLoading, error, results, detectFace };
};
