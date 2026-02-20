import { useState, useCallback, useEffect } from 'react';
import { FaceLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { mediaPipeService } from '../services/MediaPipeService';

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

    // Initialize singleton on mount
    useEffect(() => {
        let isMounted = true;

        const init = async () => {
            try {
                await mediaPipeService.initialize();
                if (isMounted) setIsLoading(false);
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err : new Error('Failed to load FaceLandmarker'));
                    setIsLoading(false);
                }
            }
        };

        const landmarker = mediaPipeService.getLandmarker();
        if (landmarker) {
            setIsLoading(false);
        } else {
            init();
        }

        return () => { isMounted = false; };
    }, []);

    const detectFace = useCallback(async (imageElement: HTMLImageElement): Promise<NormalizedLandmark[] | null> => {
        try {
            // Ensure service is ready (though we check isLoading)
            const detectionResult = await mediaPipeService.detect(imageElement);

            if (detectionResult) {
                setResults(detectionResult);
                if (detectionResult.faceLandmarks && detectionResult.faceLandmarks.length > 0) {
                    return detectionResult.faceLandmarks[0];
                }
            }
            return null;
        } catch (err) {
            console.error('Error detecting face:', err);
            setError(err instanceof Error ? err : new Error('Failed to detect face'));
            return null;
        }
    }, []);

    return { isLoading, error, results, detectFace };
};
