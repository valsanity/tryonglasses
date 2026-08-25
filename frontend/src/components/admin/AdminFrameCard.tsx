import { useRef, useState } from "react";
import { Check, ImageUp, Loader2, Sparkles, Trash2 } from "lucide-react";
import type { FrameDto, FramePayload } from "@/data/frames";
import { frameImageUrl } from "@/data/frames";
import { formatRupiah } from "@/config/store";
import { CALIBRATION_FIELDS } from "@/lib/vto/calibration";

const CALIBRATION_KEY_MAP = {
  scaleMultiplier: "scale_multiplier",
  offsetX: "offset_x",
  offsetY: "offset_y",
  rotationOffset: "rotation_offset",
  opacity: "opacity",
} as const;

interface Props {
  frame: FrameDto;
  isSaving: boolean;
  isUploading: boolean;
  onSave: (id: string, payload: FramePayload) => void;
  onDelete: (frame: FrameDto) => void;
  onUpload: (id: string, file: File) => void;
}

export default function AdminFrameCard({
  frame,
  isSaving,
  isUploading,
  onSave,
  onDelete,
  onUpload,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<FramePayload>({});

  const value = <K extends keyof FramePayload>(key: K): NonNullable<FramePayload[K]> =>
    (draft[key] ?? (frame[key as keyof FrameDto] as NonNullable<FramePayload[K]>));

  const dirty = Object.keys(draft).length > 0;
  const set = (key: keyof FramePayload, next: string | number | boolean) =>
    setDraft((current) => ({ ...current, [key]: next }));

  return (
    <article
      data-testid={`admin-frame-${frame.sku}`}
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-start gap-4">
        <div className="grid h-20 w-32 shrink-0 place-items-center rounded-xl bg-black/40">
          {frame.has_image ? (
            <img
              data-testid={`admin-frame-image-${frame.sku}`}
              src={frameImageUrl(frame)}
              alt={frame.name}
              className="h-16 w-full object-contain px-2"
            />
          ) : (
            <span className="text-[10px] text-muted-foreground">Belum ada foto</span>
          )}
        </div>

        <div className="min-w-[190px] flex-1 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] text-muted-foreground">Nama</span>
              <input
                data-testid={`admin-name-${frame.sku}`}
                value={String(value("name"))}
                onChange={(event) => set("name", event.target.value)}
                className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-muted-foreground">SKU</span>
              <input
                data-testid={`admin-sku-${frame.sku}`}
                value={String(value("sku"))}
                onChange={(event) => set("sku", event.target.value)}
                className="w-full rounded-lg border border-input bg-background px-2 py-1.5 font-mono text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-muted-foreground">Harga (Rp)</span>
              <input
                data-testid={`admin-price-${frame.sku}`}
                type="number"
                value={Number(value("price"))}
                onChange={(event) => set("price", Number(event.target.value))}
                className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-muted-foreground">Stok</span>
              <input
                data-testid={`admin-stock-${frame.sku}`}
                type="number"
                value={Number(value("stock"))}
                onChange={(event) => set("stock", Number(event.target.value))}
                className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-muted-foreground">Warna</span>
              <input
                data-testid={`admin-color-${frame.sku}`}
                value={String(value("color"))}
                onChange={(event) => set("color", event.target.value)}
                className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-muted-foreground">Ukuran</span>
              <input
                data-testid={`admin-size-${frame.sku}`}
                value={String(value("size"))}
                onChange={(event) => set("size", event.target.value)}
                className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
              />
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Harga tampil: <span className="text-primary">{formatRupiah(Number(value("price")))}</span>
            {frame.auto_calibrated && (
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-400">
                <Sparkles className="size-3" />
                kalibrasi otomatis
              </span>
            )}
          </p>
        </div>

        <div className="w-full space-y-1.5 sm:w-52">
          <p className="text-[10px] tracking-[0.16em] text-muted-foreground">KALIBRASI</p>
          {CALIBRATION_FIELDS.map((field) => {
            const apiKey = CALIBRATION_KEY_MAP[field.key];
            const current = Number(value(apiKey));
            return (
              <label key={field.key} className="block">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[9px] text-muted-foreground">{field.label}</span>
                  <span
                    data-testid={`admin-calib-value-${apiKey}-${frame.sku}`}
                    className="font-mono text-[10px] text-primary"
                  >
                    {current.toFixed(field.step < 0.01 ? 3 : 2)}
                  </span>
                </span>
                <input
                  data-testid={`admin-calib-${apiKey}-${frame.sku}`}
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={current}
                  onChange={(event) => set(apiKey, Number(event.target.value))}
                  className="w-full accent-[#D4AF37]"
                />
              </label>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <button
          type="button"
          data-testid={`admin-upload-${frame.sku}`}
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs transition-colors duration-200 hover:border-primary/60 disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImageUp className="size-3.5" />}
          {frame.has_image ? "Ganti Foto" : "Upload Foto"}
        </button>
        <input
          ref={fileRef}
          data-testid={`admin-file-${frame.sku}`}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(frame.id, file);
            event.target.value = "";
          }}
        />

        <button
          type="button"
          data-testid={`admin-toggle-active-${frame.sku}`}
          onClick={() => onSave(frame.id, { active: !frame.active })}
          className={`rounded-xl border px-3 py-2 text-xs transition-colors duration-200 ${
            frame.active
              ? "border-emerald-400/40 text-emerald-300"
              : "border-border text-muted-foreground"
          }`}
        >
          {frame.active ? "Tampil di katalog" : "Disembunyikan"}
        </button>

        <button
          type="button"
          data-testid={`admin-save-${frame.sku}`}
          onClick={() => {
            onSave(frame.id, draft);
            setDraft({});
          }}
          disabled={!dirty || isSaving}
          className="ml-auto flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-transform duration-200 active:scale-95 disabled:opacity-40"
        >
          {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          {dirty ? "Simpan" : "Tersimpan"}
        </button>

        <button
          type="button"
          data-testid={`admin-delete-${frame.sku}`}
          onClick={() => onDelete(frame)}
          className="grid size-9 place-items-center rounded-xl border border-border text-muted-foreground transition-colors duration-200 hover:border-destructive/60 hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </article>
  );
}
