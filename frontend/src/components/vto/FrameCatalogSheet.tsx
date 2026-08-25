import { useMemo } from "react";
import { Sparkles, X } from "lucide-react";
import type { GlassesProduct } from "@/data/products";
import { formatRupiah } from "@/config/store";
import type { FaceShapeId } from "@/lib/vto/faceShape";
import { FACE_SHAPE_LABELS } from "@/lib/vto/faceShape";
import { FACE_SHAPE_ADVICE, isRecommendedFrame, sortByRecommendation } from "@/data/faceShapeRecommendations";
import ProductCard from "@/components/vto/ProductCard";
import FaceShapePicker from "@/components/vto/FaceShapePicker";

interface Props {
  open: boolean;
  products: GlassesProduct[];
  selected: GlassesProduct;
  faceShape: FaceShapeId | null;
  detectedFaceShape: FaceShapeId | null;
  isManualShape: boolean;
  onOverrideShape: (shape: FaceShapeId) => void;
  onResetShape: () => void;
  onSelect: (product: GlassesProduct) => void;
  onClose: () => void;
}

/** Bottom sheet catalog. Selection is applied to the tracker immediately. */
export default function FrameCatalogSheet({
  open,
  products,
  selected,
  faceShape,
  detectedFaceShape,
  isManualShape,
  onOverrideShape,
  onResetShape,
  onSelect,
  onClose,
}: Props) {
  // Recommended frames float to the top; nothing is ever hidden.
  const ordered = useMemo(() => sortByRecommendation(products, faceShape), [products, faceShape]);

  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end" data-testid="frame-catalog-sheet">
      <button
        type="button"
        aria-label="Tutup katalog"
        data-testid="catalog-backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />
      <div className="relative max-h-[86%] overflow-y-auto rounded-t-3xl border-t border-[#2A2F3D] bg-[#12151B] p-4 pb-6 shadow-[0_-12px_40px_rgba(0,0,0,0.7)] animate-sheet-up">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl text-white">Model Kacamata</h2>
            <p className="text-xs text-white/50">
              {faceShape
                ? "Frame yang cocok untuk bentuk wajah Anda ditampilkan lebih dulu."
                : "Pilih frame, lalu lihat langsung di wajah Anda."}
            </p>
          </div>
          <button
            type="button"
            data-testid="close-catalog-button"
            onClick={onClose}
            aria-label="Tutup katalog"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 text-white/70 transition-colors duration-200 hover:bg-white/10"
          >
            <X className="size-4" />
          </button>
        </div>

        {faceShape && (
          <div
            data-testid="face-shape-advice"
            className="mb-4 flex items-start gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/8 p-3"
          >
            <Sparkles className="mt-0.5 size-4 shrink-0 text-emerald-300" />
            <p className="text-xs leading-relaxed text-emerald-100/90">
              <span className="font-semibold">Wajah {FACE_SHAPE_LABELS[faceShape]}.</span>{" "}
              {FACE_SHAPE_ADVICE[faceShape].advice}
            </p>
          </div>
        )}

        <div className="mb-4">
          <FaceShapePicker
            effectiveShape={faceShape}
            detectedShape={detectedFaceShape}
            isManual={isManualShape}
            onOverride={onOverrideShape}
            onResetToAuto={onResetShape}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ordered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              selected={product.id === selected.id}
              recommended={isRecommendedFrame(faceShape, product.sku)}
              onSelect={onSelect}
            />
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#2A2F3D] bg-[#1A1E27] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-white/40">FRAME TERPILIH</p>
            <p data-testid="selected-frame-name" className="font-heading text-lg text-white">
              {selected.name}
            </p>
            <p data-testid="selected-frame-price" className="text-sm font-semibold text-primary">
              {formatRupiah(selected.price)}
            </p>
            <p className="mt-1 text-[11px] text-white/45">
              {selected.color} · {selected.size} · Bridge {selected.bridgeWidth}mm · {selected.sku}
            </p>
          </div>
          <button
            type="button"
            data-testid="try-this-frame-button"
            onClick={onClose}
            className="rounded-2xl bg-primary px-6 py-3 text-sm font-bold tracking-wide text-primary-foreground transition-transform duration-200 hover:scale-[1.02] active:scale-95"
          >
            COBA FRAME INI
          </button>
        </div>
      </div>
    </div>
  );
}
