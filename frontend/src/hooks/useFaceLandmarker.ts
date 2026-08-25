import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { TRACKING_CONFIG } from "@/config/store";

export type ModelStatus = "loading" | "ready" | "error";

interface UseFaceLandmarkerResult {
  landmarkerRef: React.RefObject<FaceLandmarker | null>;
  status: ModelStatus;
  errorMessage: string | null;
}

/**
 * Loads the real MediaPipe Face Landmarker in VIDEO running mode.
 * WASM runtime and the .task model are served from this app's own /public,
 * so there is no third-party CDN dependency and no frame ever leaves the device.
 */
export function useFaceLandmarker(enabled: boolean): UseFaceLandmarkerResult {
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const [status, setStatus] = useState<ModelStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let created: FaceLandmarker | null = null;

    (async () => {
      try {
        setStatus("loading");
        const fileset = await FilesetResolver.forVisionTasks(TRACKING_CONFIG.wasmBasePath);
        created = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: TRACKING_CONFIG.modelAssetPath,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 2,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: true,
        });
        if (cancelled) {
          created.close();
          return;
        }
        landmarkerRef.current = created;
        setStatus("ready");
        console.info("[vto] FaceLandmarker ready");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(
          "Model deteksi wajah gagal dimuat. Periksa koneksi Anda lalu muat ulang halaman.",
        );
        console.error("FaceLandmarker load failed", err);
      }
    })();

    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [enabled]);

  return { landmarkerRef, status, errorMessage };
}
