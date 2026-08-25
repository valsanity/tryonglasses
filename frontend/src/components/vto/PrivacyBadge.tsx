import { ShieldCheck } from "lucide-react";

export default function PrivacyBadge({ className = "" }: { className?: string }) {
  return (
    <p
      data-testid="privacy-badge"
      className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[11px] text-white/80 backdrop-blur-md ${className}`}
    >
      <ShieldCheck className="size-3.5 shrink-0 text-emerald-400" />
      Video kamera diproses langsung di perangkat Anda.
    </p>
  );
}
