import { RotateCcw } from "lucide-react";
import type { FaceShapeId } from "@/lib/vto/faceShape";
import { FACE_SHAPE_IDS, FACE_SHAPE_LABELS } from "@/lib/vto/faceShape";

interface Props {
  /** The shape currently driving recommendations (auto or manual). */
  effectiveShape: FaceShapeId | null;
  detectedShape: FaceShapeId | null;
  isManual: boolean;
  onOverride: (shape: FaceShapeId) => void;
  onResetToAuto: () => void;
}

/** Lets the customer correct the automatic classification. */
export default function FaceShapePicker({
  effectiveShape,
  detectedShape,
  isManual,
  onOverride,
  onResetToAuto,
}: Props) {
  return (
    <div data-testid="face-shape-picker" className="rounded-2xl border border-[#2A2F3D] bg-[#161920] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] tracking-[0.2em] text-white/40">
          {isManual ? "BENTUK WAJAH (MANUAL)" : "BENTUK WAJAH TERDETEKSI"}
        </p>
        {isManual && detectedShape && (
          <button
            type="button"
            data-testid="reset-face-shape-button"
            onClick={onResetToAuto}
            className="flex items-center gap-1 text-[10px] text-primary transition-opacity duration-200 hover:opacity-70"
          >
            <RotateCcw className="size-3" />
            Otomatis ({FACE_SHAPE_LABELS[detectedShape]})
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {FACE_SHAPE_IDS.map((shape) => {
          const active = shape === effectiveShape;
          return (
            <button
              key={shape}
              type="button"
              data-testid={`face-shape-option-${shape}`}
              aria-pressed={active}
              onClick={() => onOverride(shape)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors duration-200 ${
                active
                  ? "border-primary bg-primary text-primary-foreground font-semibold"
                  : "border-white/12 text-white/70 hover:border-primary/50 hover:text-white"
              }`}
            >
              {FACE_SHAPE_LABELS[shape]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
