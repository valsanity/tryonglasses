import { AlertTriangle, CheckCircle2, Loader2, ScanFace } from "lucide-react";

export type BannerTone = "ok" | "warn" | "error" | "loading";

const TONE_STYLES: Record<BannerTone, string> = {
  ok: "border-emerald-400/40 text-emerald-200",
  warn: "border-amber-400/40 text-amber-100",
  error: "border-red-400/45 text-red-100",
  loading: "border-white/20 text-white/85",
};

const TONE_ICON: Record<BannerTone, typeof ScanFace> = {
  ok: CheckCircle2,
  warn: ScanFace,
  error: AlertTriangle,
  loading: Loader2,
};

export default function FaceStatusBanner({ tone, text }: { tone: BannerTone; text: string }) {
  const Icon = TONE_ICON[tone];
  return (
    <div
      data-testid="face-status-banner"
      data-tone={tone}
      className={`pointer-events-none flex max-w-[92vw] items-center gap-2 rounded-full border bg-black/75 px-4 py-2 text-center text-xs font-medium backdrop-blur-xl sm:text-sm ${TONE_STYLES[tone]}`}
    >
      <Icon className={`size-4 shrink-0 ${tone === "loading" ? "animate-spin" : ""}`} />
      <span data-testid="face-status-text">{text}</span>
    </div>
  );
}
