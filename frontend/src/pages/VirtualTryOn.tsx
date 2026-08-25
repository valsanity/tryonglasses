import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bug, FlipHorizontal2, RefreshCw, SwitchCamera } from "lucide-react";
import { toast } from "sonner";
import type { GlassesProduct } from "@/data/products";
import { PRODUCTS } from "@/data/products";
import { STORE_CONFIG, TRACKING_CONFIG, buildWhatsAppUrl } from "@/config/store";
import { useCamera } from "@/hooks/useCamera";
import { useFaceLandmarker } from "@/hooks/useFaceLandmarker";
import { useTryOnEngine } from "@/hooks/useTryOnEngine";
import CameraControls from "@/components/vto/CameraControls";
import DebugMetricsHUD from "@/components/vto/DebugMetricsHUD";
import FaceShapeChip from "@/components/vto/FaceShapeChip";
import type { FaceShapeId } from "@/lib/vto/faceShape";
import type { BannerTone } from "@/components/vto/FaceStatusBanner";
import FaceStatusBanner from "@/components/vto/FaceStatusBanner";
import FrameCatalogSheet from "@/components/vto/FrameCatalogSheet";
import FrameQuickBar from "@/components/vto/FrameQuickBar";
import PhotoReviewModal from "@/components/vto/PhotoReviewModal";
import PrivacyBadge from "@/components/vto/PrivacyBadge";

export default function VirtualTryOn() {
  const [searchParams] = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const autoStartedRef = useRef(false);

  const [debug, setDebug] = useState(searchParams.get("debug") === "1");
  const [smoothingFactor, setSmoothingFactor] = useState<number>(TRACKING_CONFIG.smoothingFactor);
  const [selected, setSelected] = useState<GlassesProduct>(PRODUCTS[0]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [mirrored, setMirrored] = useState(true);
  const [flashing, setFlashing] = useState(false);
  /** Non-null once the customer corrects the automatic classification. */
  const [manualFaceShape, setManualFaceShape] = useState<FaceShapeId | null>(null);

  const camera = useCamera();
  // Load the landmarker immediately, in parallel with the camera permission
  // prompt, so tracking starts the moment the stream is live.
  const model = useFaceLandmarker(true);

  const engine = useTryOnEngine({
    videoRef: camera.videoRef,
    canvasRef,
    landmarkerRef: model.landmarkerRef,
    product: selected,
    mirrored,
    debug,
    smoothingFactor,
    enabled: camera.status === "ready",
  });

  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    void camera.start();
  }, [camera]);

  useEffect(() => {
    setMirrored(camera.facingMode === "user");
  }, [camera.facingMode]);

  const banner = useMemo<{ tone: BannerTone; text: string }>(() => {
    if (camera.status === "requesting") return { tone: "loading", text: "Meminta izin kamera..." };
    if (camera.errorMessage) return { tone: "error", text: camera.errorMessage };
    if (camera.status !== "ready") return { tone: "loading", text: "Menyiapkan kamera..." };
    if (model.status === "loading") return { tone: "loading", text: "Memuat model deteksi wajah..." };
    if (model.status === "error") return { tone: "error", text: model.errorMessage ?? "Model gagal dimuat." };
    if (camera.isPaused) return { tone: "warn", text: "Kamera dijeda. Tekan Lanjut untuk melanjutkan." };
    if (engine.faceStatus === "multiple")
      return { tone: "error", text: "Pastikan hanya satu wajah yang berada di depan kamera." };
    if (engine.faceStatus === "searching")
      return { tone: "warn", text: "Posisikan wajahmu di depan kamera." };
    return { tone: "ok", text: "Wajah terdeteksi — kacamata mengikuti gerakan Anda." };
  }, [camera.status, camera.errorMessage, camera.isPaused, model.status, model.errorMessage, engine.faceStatus]);

  const handleShutter = useCallback(() => {
    const dataUrl = engine.capturePhoto();
    if (!dataUrl) {
      toast.error("Foto gagal diambil. Pastikan kamera aktif.");
      return;
    }
    setFlashing(true);
    window.setTimeout(() => setFlashing(false), 220);
    camera.videoRef.current?.pause();
    setPhoto(dataUrl);
    setSheetOpen(false);
  }, [engine, camera.videoRef]);

  const handleRetake = useCallback(() => {
    setPhoto(null);
    void camera.videoRef.current?.play().catch(() => undefined);
    setSheetOpen(true);
  }, [camera.videoRef]);

  const handleSave = useCallback(() => {
    if (!photo) return;
    const link = document.createElement("a");
    link.href = photo;
    link.download = `optik-sinar-baru-${selected.sku}.png`;
    link.click();
    toast.success("Foto disimpan ke perangkat Anda.");
  }, [photo, selected.sku]);

  const handleAsk = useCallback(() => {
    window.open(buildWhatsAppUrl(selected.name), "_blank", "noopener,noreferrer");
  }, [selected.name]);

  const handleSelect = useCallback((product: GlassesProduct) => {
    setSelected(product);
  }, []);

  const effectiveFaceShape = manualFaceShape ?? engine.detectedFaceShape;

  const showRetry =
    camera.status === "denied" ||
    camera.status === "error" ||
    camera.status === "unavailable" ||
    camera.status === "unsupported";

  return (
    <div className="relative h-dvh w-full select-none overflow-hidden bg-black">
      <video
        ref={camera.videoRef}
        data-testid="camera-video"
        playsInline
        muted
        autoPlay
        className="absolute inset-0 size-full object-cover"
        style={{ transform: mirrored ? "scaleX(-1)" : undefined }}
      />
      <canvas
        ref={canvasRef}
        data-testid="glasses-overlay-canvas"
        className="pointer-events-none absolute inset-0 size-full"
      />

      {flashing && <div className="pointer-events-none absolute inset-0 z-40 bg-white animate-shutter-flash" />}

      {/* Top HUD */}
      <div className="absolute inset-x-3 top-3 z-30 flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/60 p-2.5 backdrop-blur-xl sm:inset-x-4 sm:top-4">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to="/"
            data-testid="back-to-home-link"
            aria-label="Kembali ke halaman utama"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 text-white/80 transition-colors duration-200 hover:bg-white/10"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold tracking-[0.18em] text-white">
              {STORE_CONFIG.name}
            </p>
            <p className="flex items-center gap-1.5 text-[10px] text-white/50">
              <span
                className={`size-1.5 rounded-full ${
                  camera.status === "ready" && !camera.isPaused
                    ? "bg-emerald-400 animate-live-blink"
                    : "bg-white/30"
                }`}
              />
              Virtual Try-On
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            data-testid="debug-toggle"
            onClick={() => setDebug((value) => !value)}
            aria-label="Toggle Metrik Debug"
            title="Debug mode"
            className={`grid size-9 place-items-center rounded-xl border border-white/10 transition-colors duration-200 hover:bg-white/10 ${
              debug ? "text-emerald-400" : "text-white/25"
            }`}
          >
            <Bug className="size-4" />
          </button>
          <button
            type="button"
            data-testid="mirror-toggle-button"
            onClick={() => setMirrored((value) => !value)}
            aria-label="Cerminkan Video Kamera"
            className={`grid size-9 place-items-center rounded-xl border border-white/10 transition-colors duration-200 hover:bg-white/10 ${
              mirrored ? "text-primary" : "text-white/60"
            }`}
          >
            <FlipHorizontal2 className="size-4" />
          </button>
          {camera.hasMultipleCameras && (
            <button
              type="button"
              data-testid="switch-camera-button"
              onClick={() => void camera.switchCamera()}
              aria-label="Ganti Kamera Depan atau Belakang"
              className="grid size-9 place-items-center rounded-xl border border-white/10 text-white/80 transition-colors duration-200 hover:bg-white/10"
            >
              <SwitchCamera className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Status + debug */}
      <div className="absolute inset-x-3 top-20 z-30 flex flex-col items-center gap-3 sm:inset-x-4">
        <FaceStatusBanner tone={banner.tone} text={banner.text} />
        {showRetry && (
          <button
            type="button"
            data-testid="retry-camera-button"
            onClick={() => void camera.start()}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
          >
            <RefreshCw className="size-3.5" />
            COBA LAGI
          </button>
        )}
        {debug && (
          <div className="self-start">
            <DebugMetricsHUD
              metrics={engine.metrics}
              smoothingFactor={smoothingFactor}
              onSmoothingChange={setSmoothingFactor}
            />
          </div>
        )}
      </div>

      {/* Face reticle */}
      {engine.faceStatus !== "tracked" && camera.status === "ready" && (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
          <div className="animate-reticle-pulse h-[42vh] w-[62vw] max-w-72 rounded-[45%] border-2 border-dashed border-primary/45" />
        </div>
      )}

      {/* Bottom stack */}
      <div className="absolute inset-x-3 bottom-4 z-30 flex flex-col gap-3 sm:inset-x-4 sm:bottom-6">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <FaceShapeChip
            shape={effectiveFaceShape}
            analyzing={engine.faceStatus === "tracked"}
            isManual={manualFaceShape !== null}
            onOpenCatalog={() => setSheetOpen(true)}
          />
          <PrivacyBadge />
        </div>
        <FrameQuickBar product={selected} onChangeFrame={() => setSheetOpen(true)} onAsk={handleAsk} />
        <CameraControls
          onShutter={handleShutter}
          onOpenCatalog={() => setSheetOpen(true)}
          onTogglePause={camera.togglePause}
          isPaused={camera.isPaused}
          catalogCount={PRODUCTS.length}
          disabled={camera.status !== "ready"}
        />
      </div>

      <FrameCatalogSheet
        open={sheetOpen}
        products={PRODUCTS}
        selected={selected}
        faceShape={effectiveFaceShape}
        detectedFaceShape={engine.detectedFaceShape}
        isManualShape={manualFaceShape !== null}
        onOverrideShape={setManualFaceShape}
        onResetShape={() => setManualFaceShape(null)}
        onSelect={handleSelect}
        onClose={() => setSheetOpen(false)}
      />

      {photo && (
        <PhotoReviewModal
          photo={photo}
          product={selected}
          onRetake={handleRetake}
          onSave={handleSave}
          onAsk={handleAsk}
        />
      )}
    </div>
  );
}
