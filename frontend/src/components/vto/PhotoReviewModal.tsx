import { Download, MessageCircle, RotateCcw } from "lucide-react";
import type { GlassesProduct } from "@/data/products";
import { formatRupiah } from "@/config/store";

interface Props {
  photo: string;
  product: GlassesProduct;
  onRetake: () => void;
  onSave: () => void;
  onAsk: () => void;
}

/** Shown after AMBIL FOTO. The photo stays in the browser unless the user saves it. */
export default function PhotoReviewModal({ photo, product, onRetake, onSave, onAsk }: Props) {
  return (
    <div
      data-testid="photo-review-modal"
      className="absolute inset-0 z-50 flex flex-col items-center justify-between gap-4 bg-black/92 p-4 backdrop-blur-2xl md:p-8"
    >
      <div className="text-center">
        <h2 className="font-heading text-2xl text-white sm:text-3xl">Bagaimana menurutmu?</h2>
        <p className="mt-1 text-xs text-white/55">
          {product.name} · <span className="text-primary">{formatRupiah(product.price)}</span>
        </p>
      </div>

      <div className="relative max-h-[58vh] overflow-hidden rounded-2xl border-2 border-primary/50 shadow-[0_0_50px_rgba(212,175,55,0.2)]">
        <img
          data-testid="captured-photo"
          src={photo}
          alt={`Hasil try-on ${product.name}`}
          className="max-h-[58vh] w-auto object-contain"
        />
      </div>

      <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          data-testid="retake-photo-button"
          onClick={onRetake}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/12"
        >
          <RotateCcw className="size-4" />
          COBA FRAME LAIN
        </button>
        <button
          type="button"
          data-testid="save-photo-button"
          onClick={onSave}
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-transform duration-200 hover:scale-[1.02] active:scale-95"
        >
          <Download className="size-4" />
          SIMPAN FOTO
        </button>
        <button
          type="button"
          data-testid="ask-store-button"
          onClick={onAsk}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-sm font-bold text-[#0B1C10] transition-transform duration-200 hover:scale-[1.02] active:scale-95"
        >
          <MessageCircle className="size-4" />
          TANYAKAN KE TOKO
        </button>
      </div>
    </div>
  );
}
