import { Camera, Glasses, Pause, Play } from "lucide-react";

interface Props {
  onShutter: () => void;
  onOpenCatalog: () => void;
  onTogglePause: () => void;
  isPaused: boolean;
  catalogCount: number;
  disabled: boolean;
}

/** Bottom control dock: catalog trigger, shutter, pause. */
export default function CameraControls({
  onShutter,
  onOpenCatalog,
  onTogglePause,
  isPaused,
  catalogCount,
  disabled,
}: Props) {
  return (
    <div
      data-testid="camera-controls-dock"
      className="pointer-events-auto flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-black/75 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:px-6"
    >
      <button
        type="button"
        data-testid="open-catalog-button"
        onClick={onOpenCatalog}
        aria-label="Buka Katalog Model Kacamata"
        className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-white transition-colors duration-200 hover:border-primary/60 hover:bg-white/10"
      >
        <Glasses className="size-5 text-primary" />
        <span className="hidden text-xs leading-tight sm:block">
          Model
          <br />
          Kacamata ({catalogCount})
        </span>
        <span className="text-xs sm:hidden">({catalogCount})</span>
      </button>

      <button
        type="button"
        data-testid="shutter-button"
        onClick={onShutter}
        disabled={disabled}
        aria-label="Ambil Foto Kacamata"
        className="group relative grid size-16 place-items-center rounded-full border-[3px] border-primary bg-black/40 transition-transform duration-100 ease-out active:scale-95 disabled:opacity-40 sm:size-18"
      >
        <span className="grid size-12 place-items-center rounded-full bg-white text-black transition-colors duration-200 group-hover:bg-primary sm:size-13">
          <Camera className="size-5" />
        </span>
      </button>

      <button
        type="button"
        data-testid="pause-camera-button"
        onClick={onTogglePause}
        aria-label={isPaused ? "Lanjutkan Kamera" : "Jeda Kamera"}
        className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white transition-colors duration-200 hover:border-primary/60 hover:bg-white/10"
      >
        {isPaused ? <Play className="size-5 text-primary" /> : <Pause className="size-5 text-primary" />}
        <span className="hidden text-xs sm:block">{isPaused ? "Lanjut" : "Jeda"}</span>
      </button>
    </div>
  );
}
