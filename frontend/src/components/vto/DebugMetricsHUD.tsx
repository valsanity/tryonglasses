import type { DebugMetrics } from "@/hooks/useTryOnEngine";

interface Props {
  metrics: DebugMetrics;
  smoothingFactor: number;
  onSmoothingChange: (value: number) => void;
}

function Row({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="truncate text-[9px] text-slate-300">{label}</span>
      <span data-testid={testId} className="shrink-0 text-emerald-400">
        {value}
      </span>
    </div>
  );
}

/** Calibration HUD. Rendered only when debug mode is on. */
export default function DebugMetricsHUD({ metrics, smoothingFactor, onSmoothingChange }: Props) {
  return (
    <div
      data-testid="debug-hud"
      className="pointer-events-auto w-60 rounded-xl border border-emerald-500/30 bg-black/85 p-2.5 font-mono text-[11px] text-emerald-400 shadow-lg backdrop-blur-md"
    >
      <p className="mb-1.5 text-[9px] tracking-[0.2em] text-emerald-300">DEBUG MODE: ON</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        <Row label="FPS" value={String(metrics.fps)} testId="debug-fps" />
        <Row label="Marks" value={String(metrics.landmarkCount)} testId="debug-landmarks" />
        <Row label="Eye Dist" value={`${metrics.eyeDistance.toFixed(1)}px`} testId="debug-eye-distance" />
        <Row label="Rot" value={`${metrics.rotationDeg.toFixed(1)}°`} testId="debug-rotation" />
        <Row label="Yaw" value={`${metrics.yawDeg.toFixed(1)}°`} testId="debug-yaw" />
        <Row label="Pitch" value={`${metrics.pitchDeg.toFixed(1)}°`} testId="debug-pitch" />
        <Row label="Scale" value={metrics.scale.toFixed(2)} testId="debug-scale" />
        <Row label="Lat" value={`${metrics.latencyMs.toFixed(0)}ms`} testId="debug-latency" />
      </div>
      <label className="mt-1.5 flex items-center gap-2 border-t border-emerald-500/20 pt-1.5">
        <span className="shrink-0 text-[9px] text-slate-300">Smooth {smoothingFactor.toFixed(2)}</span>
        <input
          data-testid="debug-smoothing-slider"
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={smoothingFactor}
          onChange={(event) => onSmoothingChange(Number(event.target.value))}
          className="w-full accent-emerald-400"
        />
      </label>
    </div>
  );
}
