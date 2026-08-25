import { useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy, ImageUp, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { GlassesProduct } from "@/data/products";
import type { CalibrationOverride } from "@/lib/vto/calibration";
import { CALIBRATION_FIELDS } from "@/lib/vto/calibration";

interface Props {
  /** The catalog entry being calibrated (base values, before overrides). */
  base: GlassesProduct;
  /** The live product actually being rendered (base + overrides). */
  effective: GlassesProduct;
  hasCustomImage: boolean;
  snippet: string;
  onField: (productId: string, field: keyof CalibrationOverride, value: number) => void;
  onResetFrame: (productId: string) => void;
  onUploadImage: (productId: string, file: File) => void;
  onClearImage: (productId: string) => void;
}

/**
 * Debug-mode panel for fitting real product PNGs: upload an asset, nudge the
 * calibration live against your own face, then copy a ready-to-paste
 * `products.ts` block.
 */
export default function CalibrationStudio({
  base,
  effective,
  hasCustomImage,
  snippet,
  onField,
  onResetFrame,
  onUploadImage,
  onClearImage,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      toast.success("Kode products.ts disalin ke clipboard.");
    } catch {
      toast.error("Clipboard diblokir browser. Gunakan tombol Unduh.");
    }
  };

  const downloadSnippet = () => {
    const blob = new Blob([snippet], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "products.calibrated.ts";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div
      data-testid="calibration-studio"
      className="pointer-events-auto w-full space-y-2 rounded-2xl border border-primary/30 bg-black/85 p-3 font-mono text-[11px] text-white/85 shadow-lg backdrop-blur-xl"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] tracking-[0.18em] text-primary">CALIBRATION STUDIO</p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="calibration-reset-frame"
            onClick={() => onResetFrame(base.id)}
            title="Kembalikan ke nilai katalog"
            className="grid size-6 place-items-center rounded-md border border-white/15 text-white/60 transition-colors duration-200 hover:text-white"
          >
            <RotateCcw className="size-3" />
          </button>
          <button
            type="button"
            data-testid="calibration-collapse-toggle"
            onClick={() => setCollapsed((value) => !value)}
            title={collapsed ? "Buka panel" : "Tutup panel"}
            className="grid size-6 place-items-center rounded-md border border-white/15 text-white/60 transition-colors duration-200 hover:text-white"
          >
            {collapsed ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p data-testid="calibration-frame-name" className="truncate text-xs text-white">
          {base.name} <span className="text-white/40">({base.sku})</span>
        </p>
        {collapsed && (
          <span data-testid="calibration-collapsed-scale" className="shrink-0 text-primary">
            {effective.scaleMultiplier.toFixed(2)}x
          </span>
        )}
      </div>

      {!collapsed && (
        <>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="calibration-upload-button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 px-2 py-1.5 text-[10px] transition-colors duration-200 hover:border-primary/60"
            >
              <ImageUp className="size-3" />
              Upload PNG
            </button>
            {hasCustomImage && (
              <button
                type="button"
                data-testid="calibration-clear-image"
                onClick={() => onClearImage(base.id)}
                title="Hapus PNG sementara"
                className="grid size-7 place-items-center rounded-lg border border-white/15 text-white/60 transition-colors duration-200 hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            data-testid="calibration-file-input"
            type="file"
            accept="image/png,image/webp,image/svg+xml"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUploadImage(base.id, file);
              event.target.value = "";
            }}
          />
          {hasCustomImage && (
            <p data-testid="calibration-custom-image-note" className="text-[9px] leading-tight text-emerald-300">
              PNG sementara aktif — hanya di browser ini, tidak diupload.
            </p>
          )}

          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-white/10 pt-2">
            {CALIBRATION_FIELDS.map((field) => {
              const value = effective[field.key];
              return (
                <label key={field.key} className="block">
                  <span className="flex items-baseline justify-between gap-1">
                    <span className="truncate text-[9px] text-white/55">{field.label}</span>
                    <span data-testid={`calibration-value-${field.key}`} className="shrink-0 text-primary">
                      {value.toFixed(field.step < 0.01 ? 3 : 2)}
                    </span>
                  </span>
                  <input
                    data-testid={`calibration-slider-${field.key}`}
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={value}
                    onChange={(event) => onField(base.id, field.key, Number(event.target.value))}
                    className="w-full accent-[#D4AF37]"
                  />
                </label>
              );
            })}
          </div>

          <div className="flex gap-2 border-t border-white/10 pt-2">
            <button
              type="button"
              data-testid="calibration-copy-button"
              onClick={() => void copySnippet()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-1.5 text-[10px] font-bold text-primary-foreground transition-transform duration-200 active:scale-95"
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? "Tersalin" : "Copy products.ts"}
            </button>
            <button
              type="button"
              data-testid="calibration-download-button"
              onClick={downloadSnippet}
              className="rounded-lg border border-white/15 px-2 py-1.5 text-[10px] transition-colors duration-200 hover:border-primary/60"
            >
              Unduh
            </button>
          </div>
        </>
      )}
    </div>
  );
}
