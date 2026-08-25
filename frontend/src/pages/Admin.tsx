import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Glasses, LogOut, Plus } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiDelete, apiGet, apiPost, apiPut, apiUpload } from "@/lib/api";
import { beginSession, endSession } from "@/lib/session";
import type { AdminSession, FrameDto, FramePayload, ImageProcessResult } from "@/data/frames";
import { STORE_CONFIG, formatRupiah } from "@/config/store";
import AdminPinGate from "@/components/admin/AdminPinGate";
import AdminFrameCard from "@/components/admin/AdminFrameCard";

const EMPTY_NEW_FRAME = { sku: "", name: "", price: 0 };

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const body = error.body as { detail?: unknown } | null;
    if (body && typeof body.detail === "string") return body.detail;
  }
  return fallback;
}

export default function Admin() {
  const queryClient = useQueryClient();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newFrame, setNewFrame] = useState(EMPTY_NEW_FRAME);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const session = useQuery({
    queryKey: ["admin", "session"],
    queryFn: () => apiGet<AdminSession>("/admin/me"),
    retry: false,
  });
  const authenticated = session.data?.authenticated === true;

  const frames = useQuery({
    queryKey: ["admin", "frames"],
    queryFn: () => apiGet<FrameDto[]>("/admin/frames"),
    enabled: authenticated,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "frames"] });
    void queryClient.invalidateQueries({ queryKey: ["frames"] });
  };

  const login = useMutation({
    mutationFn: (pin: string) => apiPost<AdminSession>("/admin/login", { pin }),
    onSuccess: () => {
      setLoginError(null);
      beginSession();
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error) => setLoginError(errorMessage(error, "Gagal masuk. Coba lagi.")),
  });

  const createFrame = useMutation({
    mutationFn: (payload: FramePayload) => apiPost<FrameDto>("/admin/frames", payload),
    onSuccess: (frame) => {
      toast.success(`Frame ${frame.name} dibuat. Upload fotonya sekarang.`);
      setNewFrame(EMPTY_NEW_FRAME);
      setShowNew(false);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, "Frame gagal dibuat.")),
  });

  const saveFrame = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FramePayload }) =>
      apiPut<FrameDto>(`/admin/frames/${id}`, payload),
    onMutate: ({ id }) => setSavingId(id),
    onSuccess: () => {
      toast.success("Perubahan disimpan.");
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, "Perubahan gagal disimpan.")),
    onSettled: () => setSavingId(null),
  });

  const removeFrame = useMutation({
    mutationFn: (id: string) => apiDelete<{ deleted: string }>(`/admin/frames/${id}`),
    onSuccess: () => {
      toast.success("Frame dihapus.");
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, "Frame gagal dihapus.")),
  });

  const uploadImage = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const form = new FormData();
      form.append("file", file);
      return apiUpload<ImageProcessResult>(`/admin/frames/${id}/image`, form);
    },
    onMutate: ({ id }) => setUploadingId(id),
    onSuccess: (result) => {
      if (result.warning) toast.warning(result.warning);
      else
        toast.success(
          `Latar dihapus & kalibrasi otomatis: scale ${result.frame.scale_multiplier.toFixed(2)}x`,
        );
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, "Foto gagal diproses.")),
    onSettled: () => setUploadingId(null),
  });

  const stats = useMemo(() => {
    const rows = frames.data ?? [];
    return {
      total: rows.length,
      visible: rows.filter((row) => row.active && row.has_image).length,
      missingPhoto: rows.filter((row) => !row.has_image).length,
      stock: rows.reduce((sum, row) => sum + row.stock, 0),
    };
  }, [frames.data]);

  if (session.isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background text-sm text-muted-foreground">
        Memuat...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <AdminPinGate
        onSubmit={(pin) => login.mutate(pin)}
        isPending={login.isPending}
        error={loginError}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-5">
          <div>
            <p className="overline text-[10px] font-semibold text-primary">{STORE_CONFIG.name}</p>
            <h1 className="font-heading text-xl">Admin Katalog</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/coba"
              data-testid="admin-open-tryon"
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs transition-colors duration-200 hover:border-primary/60"
            >
              <Glasses className="size-3.5" />
              Buka Try-On
            </Link>
            <button
              type="button"
              data-testid="admin-logout"
              onClick={() => void endSession("/admin")}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground transition-colors duration-200 hover:text-destructive"
            >
              <LogOut className="size-3.5" />
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-6">
        <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total frame", value: String(stats.total), testId: "stat-total" },
            { label: "Tampil di katalog", value: String(stats.visible), testId: "stat-visible" },
            { label: "Belum ada foto", value: String(stats.missingPhoto), testId: "stat-missing" },
            { label: "Total stok", value: String(stats.stock), testId: "stat-stock" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-border bg-card p-4">
              <dt className="text-[10px] tracking-[0.16em] text-muted-foreground">{item.label}</dt>
              <dd data-testid={item.testId} className="mt-1 font-heading text-2xl">
                {frames.isLoading ? "—" : item.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-heading text-lg">Inventori</h2>
          <button
            type="button"
            data-testid="admin-new-frame-button"
            onClick={() => setShowNew((value) => !value)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-transform duration-200 active:scale-95"
          >
            <Plus className="size-3.5" />
            Tambah Frame
          </button>
        </div>

        {showNew && (
          <form
            data-testid="admin-new-frame-form"
            onSubmit={(event) => {
              event.preventDefault();
              createFrame.mutate(newFrame);
            }}
            className="mb-5 grid gap-3 rounded-2xl border border-primary/30 bg-card p-4 sm:grid-cols-4"
          >
            <label className="block sm:col-span-1">
              <span className="text-[10px] text-muted-foreground">SKU</span>
              <input
                data-testid="new-frame-sku"
                required
                value={newFrame.sku}
                onChange={(event) => setNewFrame((v) => ({ ...v, sku: event.target.value }))}
                placeholder="OSB-007"
                className="w-full rounded-lg border border-input bg-background px-2 py-1.5 font-mono text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[10px] text-muted-foreground">Nama frame</span>
              <input
                data-testid="new-frame-name"
                required
                value={newFrame.name}
                onChange={(event) => setNewFrame((v) => ({ ...v, name: event.target.value }))}
                placeholder="Aviator Silver"
                className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block sm:col-span-1">
              <span className="text-[10px] text-muted-foreground">Harga (Rp)</span>
              <input
                data-testid="new-frame-price"
                type="number"
                min={0}
                value={newFrame.price}
                onChange={(event) => setNewFrame((v) => ({ ...v, price: Number(event.target.value) }))}
                className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <div className="flex items-center gap-2 sm:col-span-4">
              <button
                type="submit"
                data-testid="new-frame-submit"
                disabled={createFrame.isPending}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
              >
                SIMPAN FRAME
              </button>
              <p className="text-[11px] text-muted-foreground">
                Setelah dibuat, upload fotonya — latar belakang dihapus otomatis dan kalibrasi dihitung sendiri.
              </p>
            </div>
          </form>
        )}

        {frames.isError && (
          <p data-testid="admin-frames-error" className="rounded-2xl border border-destructive/40 p-4 text-sm text-destructive">
            Gagal memuat inventori. Muat ulang halaman.
          </p>
        )}

        {frames.isLoading && (
          <p data-testid="admin-frames-loading" className="rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
            Memuat inventori...
          </p>
        )}

        <div className="space-y-3">
          {(frames.data ?? []).map((frame) => (
            <AdminFrameCard
              key={frame.id}
              frame={frame}
              isSaving={savingId === frame.id}
              isUploading={uploadingId === frame.id}
              onSave={(id, payload) => saveFrame.mutate({ id, payload })}
              onDelete={(target) => {
                if (window.confirm(`Hapus ${target.name} (${target.sku})?`)) {
                  removeFrame.mutate(target.id);
                }
              }}
              onUpload={(id, file) => uploadImage.mutate({ id, file })}
            />
          ))}
        </div>

        {frames.data && frames.data.length === 0 && (
          <p data-testid="admin-empty" className="rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
            Belum ada frame. Klik "Tambah Frame" untuk mulai mengisi inventori.
          </p>
        )}

        <p className="mt-6 text-[11px] text-muted-foreground">
          Total nilai stok:{" "}
          {formatRupiah((frames.data ?? []).reduce((sum, row) => sum + row.price * row.stock, 0))}
        </p>
      </main>
    </div>
  );
}
