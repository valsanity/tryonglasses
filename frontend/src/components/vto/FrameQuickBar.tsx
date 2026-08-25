import { MessageCircle } from "lucide-react";
import type { GlassesProduct } from "@/data/products";
import { formatRupiah } from "@/config/store";

interface Props {
  product: GlassesProduct;
  onChangeFrame: () => void;
  onAsk: () => void;
}

/** Floating summary of the frame currently on the user's face. */
export default function FrameQuickBar({ product, onChangeFrame, onAsk }: Props) {
  return (
    <div
      data-testid="frame-quick-bar"
      className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-black/75 p-2.5 backdrop-blur-xl"
    >
      <img
        src={product.image}
        alt={product.name}
        className="h-9 w-16 shrink-0 object-contain"
        data-testid="quick-bar-frame-image"
      />
      <div className="min-w-0 flex-1">
        <p data-testid="quick-bar-frame-name" className="truncate text-sm font-semibold text-white">
          {product.name}
        </p>
        <p data-testid="quick-bar-frame-price" className="text-xs text-primary">
          {formatRupiah(product.price)}
        </p>
      </div>
      <button
        type="button"
        data-testid="quick-bar-ask-button"
        onClick={onAsk}
        aria-label="Tanyakan Frame Ini"
        className="grid size-9 place-items-center rounded-xl bg-[#25D366] text-[#0B1C10] transition-transform duration-200 hover:scale-105"
      >
        <MessageCircle className="size-4" />
      </button>
      <button
        type="button"
        data-testid="quick-bar-change-frame-button"
        onClick={onChangeFrame}
        className="rounded-xl border border-primary/50 px-3 py-2 text-xs font-semibold text-primary transition-colors duration-200 hover:bg-primary hover:text-primary-foreground"
      >
        Ganti Frame
      </button>
    </div>
  );
}
