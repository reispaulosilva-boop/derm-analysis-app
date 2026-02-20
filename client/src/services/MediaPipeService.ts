import { FaceLandmarker, FilesetResolver, FaceLandmarkerResult } from '@mediapipe/tasks-vision';

class MediaPipeSingleton {
    private static instance: MediaPipeSingleton;
    private faceLandmarker: FaceLandmarker | null = null;
    private initPromise: Promise<void> | null = null;

    private constructor() { }

    public static getInstance(): MediaPipeSingleton {
        if (!MediaPipeSingleton.instance) {
            MediaPipeSingleton.instance = new MediaPipeSingleton();
        }
        return MediaPipeSingleton.instance;
    }

    public async initialize(): Promise<void> {
        if (this.faceLandmarker) return;

        if (!this.initPromise) {
            this.initPromise = (async () => {
                console.log('Initializing MediaPipe FaceLandmarker...');
                try {
                    const vision = await FilesetResolver.forVisionTasks(
                        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
                    );

                    this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                            delegate: "GPU"
                        },
                        outputFaceBlendshapes: true,
                        outputFacialTransformationMatrixes: true,
                        runningMode: "IMAGE",
                        numFaces: 1
                    });
                    console.log('MediaPipe FaceLandmarker initialized successfully.');
                } catch (error) {
                    console.error('Failed to initialize MediaPipe FaceLandmarker:', error);
                    this.initPromise = null; // Reset promise to allow retry
                    throw error;
                }
            })();
        }

        return this.initPromise;
    }

    public getLandmarker(): FaceLandmarker | null {
        return this.faceLandmarker;
    }

    public async setRunningMode(mode: "IMAGE" | "VIDEO"): Promise<void> {
        if (!this.faceLandmarker) {
            await this.initialize();
        }
        if (this.faceLandmarker) {
            await this.faceLandmarker.setOptions({ runningMode: mode });
        }
    }

    public async detectVideo(video: HTMLVideoElement, startTimeMs: number): Promise<FaceLandmarkerResult | null> {
        if (!this.faceLandmarker) {
            await this.initialize();
        }

        if (!this.faceLandmarker) {
            throw new Error("MediaPipe FaceLandmarker not initialized");
        }

        return this.faceLandmarker.detectForVideo(video, startTimeMs);
    }

    public async detect(image: HTMLImageElement | HTMLVideoElement): Promise<FaceLandmarkerResult | null> {
        if (!this.faceLandmarker) {
            await this.initialize();
        }

        if (!this.faceLandmarker) {
            throw new Error("MediaPipe FaceLandmarker not initialized");
        }

        return this.faceLandmarker.detect(image);
    }
}

export const mediaPipeService = MediaPipeSingleton.getInstance();
