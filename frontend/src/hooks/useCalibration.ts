import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PRODUCTS } from "@/data/products";
import type { CalibrationMap, CalibrationOverride } from "@/lib/vto/calibration";
import { buildProductsSnippet, loadCalibration, saveCalibration } from "@/lib/vto/calibration";

/**
 * Owns Calibration Studio state: slider overrides (persisted to localStorage)
 * and session-only PNG previews (object URLs — never uploaded anywhere).
 */
export function useCalibration() {
  const [overrides, setOverrides] = useState<CalibrationMap>(() =>
    typeof window === "undefined" ? {} : loadCalibration(),
  );
  const [customImages, setCustomImages] = useState<Record<string, string>>({});
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    saveCalibration(overrides);
  }, [overrides]);

  // Revoke every object URL we created when the screen unmounts.
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const setField = useCallback(
    (productId: string, field: keyof CalibrationOverride, value: number) => {
      setOverrides((current) => ({
        ...current,
        [productId]: { ...current[productId], [field]: value },
      }));
    },
    [],
  );

  const resetFrame = useCallback((productId: string) => {
    setOverrides((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
  }, []);

  const resetAll = useCallback(() => setOverrides({}), []);

  const setCustomImage = useCallback((productId: string, file: File) => {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.push(url);
    setCustomImages((current) => ({ ...current, [productId]: url }));
  }, []);

  const clearCustomImage = useCallback((productId: string) => {
    setCustomImages((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
  }, []);

  const snippet = useMemo(() => buildProductsSnippet(PRODUCTS, overrides), [overrides]);

  return {
    overrides,
    customImages,
    setField,
    resetFrame,
    resetAll,
    setCustomImage,
    clearCustomImage,
    snippet,
  };
}
