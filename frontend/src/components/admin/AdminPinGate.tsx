import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { STORE_CONFIG } from "@/config/store";

interface Props {
  onSubmit: (pin: string) => void;
  isPending: boolean;
  error: string | null;
}

/** PIN gate for /admin. The PIN itself lives in backend/.env, never in the bundle. */
export default function AdminPinGate({ onSubmit, isPending, error }: Props) {
  const [pin, setPin] = useState("");

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-5">
      <form
        data-testid="admin-pin-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (pin.trim()) onSubmit(pin.trim());
        }}
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-7"
      >
        <div className="mb-6">
          <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-primary/12">
            <Lock className="size-5 text-primary" />
          </div>
          <p className="overline text-[10px] font-semibold text-primary">{STORE_CONFIG.name}</p>
          <h1 className="mt-1 font-heading text-2xl">Admin Katalog</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Masukkan PIN admin untuk mengelola frame, harga, dan stok.
          </p>
        </div>

        <label className="block">
          <span className="text-xs text-muted-foreground">PIN Admin</span>
          <input
            data-testid="admin-pin-input"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="••••••"
            className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 text-center font-mono text-lg tracking-[0.4em] outline-none transition-colors duration-200 focus:border-primary"
          />
        </label>

        {error && (
          <p data-testid="admin-pin-error" className="mt-3 text-xs text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          data-testid="admin-pin-submit"
          disabled={isPending || !pin.trim()}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold tracking-wide text-primary-foreground transition-transform duration-200 hover:scale-[1.01] active:scale-95 disabled:opacity-40"
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          MASUK
        </button>
      </form>
    </div>
  );
}
