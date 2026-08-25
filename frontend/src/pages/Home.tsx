import { Link } from "react-router-dom";
import { Camera, Glasses, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { PRODUCTS } from "@/data/products";
import { STORE_CONFIG, buildWhatsAppUrl, formatRupiah } from "@/config/store";

const FEATURES = [
  { icon: Camera, title: "Kamera Real-Time", body: "Kacamata mengikuti posisi, ukuran, dan kemiringan kepala Anda." },
  { icon: ShieldCheck, title: "Privasi Terjaga", body: "Seluruh pemrosesan wajah berjalan di perangkat Anda, tanpa upload." },
  { icon: Glasses, title: "6 Model Pilihan", body: "Dari acetate klasik hitam sampai titanium gold ultra ringan." },
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <div>
          <p className="overline text-[11px] font-semibold text-primary">Optik</p>
          <p className="font-heading text-lg leading-tight tracking-tight sm:text-xl">SINAR BARU</p>
        </div>
        <a
          href={buildWhatsAppUrl("Konsultasi Frame")}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="header-whatsapp-link"
          className="flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-xs text-white/80 transition-colors duration-200 hover:border-primary/60 hover:text-primary"
        >
          <MessageCircle className="size-3.5" />
          Hubungi Toko
        </a>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <section className="grid items-center gap-10 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div className="animate-rise-in">
            <p className="overline flex items-center gap-2 text-[11px] font-semibold text-primary">
              <Sparkles className="size-3.5" />
              Virtual Try-On
            </p>
            <h1 className="mt-4 font-heading text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              OPTIK
              <br />
              <span className="text-primary">SINAR BARU</span>
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground sm:text-lg">
              {STORE_CONFIG.tagline}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/coba"
                data-testid="cta-try-on-button"
                className="rounded-2xl bg-primary px-8 py-4 text-sm font-bold tracking-[0.12em] text-primary-foreground transition-transform duration-200 hover:scale-[1.03] active:scale-95"
              >
                COBA SEKARANG
              </Link>
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-emerald-400" />
                Diproses di perangkat Anda
              </span>
            </div>

            <dl className="mt-12 grid gap-5 sm:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="border-l border-border pl-4">
                  <Icon className="mb-2 size-4 text-primary" />
                  <dt className="text-sm font-semibold">{title}</dt>
                  <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-primary/10 blur-3xl" />
            <div className="overflow-hidden rounded-[2rem] border border-border bg-card">
              <img
                src="https://images.unsplash.com/photo-1518991669955-9c7e78ec80ca?crop=entropy&cs=srgb&fm=jpg&w=900&q=80"
                alt="Model mengenakan kacamata premium"
                className="h-72 w-full object-cover sm:h-96"
                loading="lazy"
              />
              <div className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-[10px] tracking-[0.2em] text-muted-foreground">KOLEKSI 2026</p>
                  <p className="font-heading text-lg">Titanium & Acetate</p>
                </div>
                <Glasses className="size-7 text-primary" />
              </div>
            </div>
          </div>
        </section>

        <section className="pt-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl">Model Kacamata</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {PRODUCTS.length} frame siap dicoba langsung lewat kamera.
              </p>
            </div>
            <Link
              to="/coba"
              data-testid="catalog-try-on-link"
              className="shrink-0 text-xs font-semibold text-primary transition-opacity duration-200 hover:opacity-70"
            >
              Coba semua →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {PRODUCTS.map((product) => (
              <article
                key={product.id}
                data-testid={`home-product-${product.id}`}
                className="rounded-2xl border border-border bg-card p-3 transition-[transform,border-color] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-primary/50"
              >
                <div className="grid h-16 place-items-center rounded-xl bg-black/40">
                  <img src={product.image} alt={product.name} className="h-11 w-full object-contain px-2" />
                </div>
                <p className="mt-3 text-sm font-semibold">{product.name}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{product.sku}</p>
                <p className="mt-1 text-xs font-semibold text-primary">{formatRupiah(product.price)}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-8 sm:px-8">
        <p className="mx-auto max-w-6xl text-xs text-muted-foreground">
          © {new Date().getFullYear()} {STORE_CONFIG.name} · Virtual Try-On diproses sepenuhnya di perangkat Anda.
        </p>
      </footer>
    </div>
  );
}
