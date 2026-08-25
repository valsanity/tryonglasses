import { Check, Sparkles } from "lucide-react";
import type { GlassesProduct } from "@/data/products";
import { formatRupiah } from "@/config/store";

interface Props {
  product: GlassesProduct;
  selected: boolean;
  recommended: boolean;
  onSelect: (product: GlassesProduct) => void;
}

export default function ProductCard({ product, selected, recommended, onSelect }: Props) {
  return (
    <button
      type="button"
      data-testid={`frame-card-${product.id}`}
      data-recommended={recommended}
      aria-pressed={selected}
      onClick={() => onSelect(product)}
      className={`group relative flex w-full flex-col gap-2 rounded-2xl border p-3 text-left transition-[transform,border-color,box-shadow] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 ${
        selected
          ? "border-primary bg-[#222734] shadow-[0_0_24px_rgba(212,175,55,0.18)]"
          : "border-[#2A2F3D] bg-[#1A1E27] hover:border-primary/50"
      }`}
    >
      {selected && (
        <span
          data-testid={`frame-selected-badge-${product.id}`}
          className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"
        >
          <Check className="size-3" />
        </span>
      )}
      <div className="grid h-14 place-items-center rounded-xl bg-black/40">
        <img src={product.image} alt={product.name} className="h-10 w-full object-contain px-2" />
      </div>
      <div>
        {recommended && (
          <span
            data-testid={`frame-match-badge-${product.id}`}
            className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-bold tracking-wider text-emerald-300"
          >
            <Sparkles className="size-2.5" />
            COCOK
          </span>
        )}
        <p className="text-sm font-semibold text-white">{product.name}</p>
        <p className="font-mono text-[10px] text-white/40">{product.sku}</p>
        <p data-testid={`frame-price-${product.id}`} className="mt-0.5 text-xs font-semibold text-primary">
          {formatRupiah(product.price)}
        </p>
      </div>
    </button>
  );
}
