import type { DebugMetrics } from "@/hooks/useTryOnEngine";

interface Props {
  metrics: DebugMetrics;
  smoothingFactor: number;
  onSmoothingChange: (value: number) => void;
}

function Row({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[10px] text-slate-300">{label}</span>
      <span data-testid={testId} className="text-emerald-400">
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
      className="pointer-events-auto w-52 space-y-1 rounded-xl border border-emerald-500/30 bg-black/85 p-3 font-mono text-[11px] text-emerald-400 shadow-lg backdrop-blur-md"
    >
      <p className="mb-1 text-[10px] tracking-[0.2em] text-emerald-300">DEBUG MODE: ON</p>
      <Row label="FPS" value={String(metrics.fps)} testId="debug-fps" />
      <Row label="Landmarks" value={String(metrics.landmarkCount)} testId="debug-landmarks" />
      <Row label="Eye Distance" value={`${metrics.eyeDistance.toFixed(1)} px`} testId="debug-eye-distance" />
      <Row label="Rotation" value={`${metrics.rotationDeg.toFixed(1)}°`} testId="debug-rotation" />
      <Row label="Yaw" value={`${metrics.yawDeg.toFixed(1)}°`} testId="debug-yaw" />
      <Row label="Pitch" value={`${metrics.pitchDeg.toFixed(1)}°`} testId="debug-pitch" />
      <Row label="Scale" value={metrics.scale.toFixed(2)} testId="debug-scale" />
      <Row label="Latency" value={`${metrics.latencyMs.toFixed(1)} ms`} testId="debug-latency" />
      <label className="mt-2 block space-y-1 border-t border-emerald-500/20 pt-2">
        <span className="text-[10px] text-slate-300">Smoothing {smoothingFactor.toFixed(2)}</span>
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
