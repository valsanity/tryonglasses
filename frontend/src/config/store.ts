/**
 * Single source of truth for store-level configuration.
 * Change the WhatsApp number here and nowhere else.
 */
export const STORE_CONFIG = {
  name: "OPTIK SINAR BARU",
  tagline: "Temukan kacamata yang cocok untukmu secara virtual.",
  /** Replace with the real store number in international format, e.g. "6281234567890" */
  whatsappNumber: "GANTI_DENGAN_NOMOR_TOKO",
  whatsappMessageTemplate:
    "Halo Optik Sinar Baru, saya tertarik dengan frame {frameName}. Apakah frame ini masih tersedia?",
} as const;

/** Tracking engine defaults — tweak here, never inside components. */
export const TRACKING_CONFIG = {
  /** 0 = frozen, 1 = no smoothing. Higher reacts faster but jitters more. */
  smoothingFactor: 0.45,
  /** Frames without a face before the overlay is hidden. */
  lostFaceGraceFrames: 8,
  modelAssetPath: "/models/face_landmarker.task",
  wasmBasePath: "/mediapipe/wasm",
} as const;

export function buildWhatsAppUrl(frameName: string): string {
  const message = STORE_CONFIG.whatsappMessageTemplate.replace("{frameName}", frameName);
  const number = STORE_CONFIG.whatsappNumber.replace(/\D/g, "");
  const base = number ? `https://wa.me/${number}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function formatRupiah(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}
