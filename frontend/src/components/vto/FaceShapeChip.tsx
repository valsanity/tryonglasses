import { ScanFace, Sparkles } from "lucide-react";
import type { FaceShapeId } from "@/lib/vto/faceShape";
import { FACE_SHAPE_LABELS } from "@/lib/vto/faceShape";

interface Props {
  shape: FaceShapeId | null;
  /** True while a face is tracked but the classifier has not settled yet. */
  analyzing: boolean;
  isManual: boolean;
  matchCount: number;
  onOpenCatalog: () => void;
}

/** On-camera summary of the detected face shape and how many frames suit it. */
export default function FaceShapeChip({ shape, analyzing, isManual, matchCount, onOpenCatalog }: Props) {
  if (!shape) {
    if (!analyzing) return null;
    return (
      <div
        data-testid="face-shape-chip"
        data-state="analyzing"
        className="pointer-events-none flex items-center gap-2 rounded-full border border-white/15 bg-black/75 px-3.5 py-2 text-xs text-white/75 backdrop-blur-xl"
      >
        <ScanFace className="size-3.5 animate-pulse text-primary" />
        Menganalisa bentuk wajah...
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid="face-shape-chip"
      data-state="detected"
      data-shape={shape}
      onClick={onOpenCatalog}
      className="pointer-events-auto flex items-center gap-2 rounded-full border border-primary/45 bg-black/78 px-3.5 py-2 text-xs text-white backdrop-blur-xl transition-colors duration-200 hover:border-primary"
    >
      <Sparkles className="size-3.5 shrink-0 text-primary" />
      <span>
        Wajah <span data-testid="face-shape-label" className="font-semibold text-primary">{FACE_SHAPE_LABELS[shape]}</span>
        {" — "}
        <span data-testid="face-shape-match-count">{matchCount}</span> frame cocok
      </span>
      {isManual && <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-white/60">MANUAL</span>}
    </button>
  );
}
