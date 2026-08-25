import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "denied"
  | "unsupported"
  | "unavailable"
  | "error";

export type FacingMode = "user" | "environment";

interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  errorMessage: string | null;
  facingMode: FacingMode;
  hasMultipleCameras: boolean;
  isPaused: boolean;
  start: () => Promise<void>;
  stop: () => void;
  switchCamera: () => Promise<void>;
  togglePause: () => void;
}

const MESSAGES: Record<Exclude<CameraStatus, "idle" | "requesting" | "ready">, string> = {
  denied: "Silakan izinkan akses kamera untuk mencoba kacamata secara virtual.",
  unsupported: "Browser Anda tidak mendukung akses kamera (getUserMedia). Coba Chrome versi terbaru.",
  unavailable: "Kamera tidak ditemukan pada perangkat ini.",
  error: "Kamera tidak dapat dibuka. Tutup aplikasi lain yang sedang memakai kamera, lalu coba lagi.",
};

/** Owns the MediaStream lifecycle. All video is client-side; nothing is uploaded. */
export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
    setIsPaused(false);
  }, []);

  const open = useCallback(async (mode: FacingMode) => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setErrorMessage(MESSAGES.unsupported);
      return;
    }
    setStatus("requesting");
    setErrorMessage(null);
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play().catch(() => undefined);
      }
      setFacingMode(mode);
      setIsPaused(false);
      setStatus("ready");

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setHasMultipleCameras(devices.filter((d) => d.kind === "videoinput").length > 1);
      } catch {
        setHasMultipleCameras(false);
      }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setStatus("denied");
        setErrorMessage(MESSAGES.denied);
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setStatus("unavailable");
        setErrorMessage(MESSAGES.unavailable);
      } else {
        setStatus("error");
        setErrorMessage(MESSAGES.error);
      }
    }
  }, []);

  const start = useCallback(async () => {
    await open(facingMode);
  }, [open, facingMode]);

  const switchCamera = useCallback(async () => {
    await open(facingMode === "user" ? "environment" : "user");
  }, [open, facingMode]);

  const togglePause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => undefined);
      setIsPaused(false);
    } else {
      video.pause();
      setIsPaused(true);
    }
  }, []);

  useEffect(() => stop, [stop]);

  return {
    videoRef,
    status,
    errorMessage,
    facingMode,
    hasMultipleCameras,
    isPaused,
    start,
    stop,
    switchCamera,
    togglePause,
  };
}
