import type { ShopResponse } from "@/types/shop.types"

export async function getShop(signal?: AbortSignal): Promise<ShopResponse> {
  const response = await fetch("/api/shop?language=es", { signal })
  const body = await response.text()
  let payload: ShopResponse & { error?: string }
  try {
    payload = JSON.parse(body)
  } catch {
    throw new Error("La tienda no respondió correctamente. Comprueba que el backend esté iniciado con npm run dev:full.")
  }
  if (!response.ok) throw new Error(payload?.error || "No se pudo cargar la tienda. Inténtalo de nuevo.")
  if (!Array.isArray(payload?.data?.entries)) throw new Error("La respuesta de la tienda no contiene ofertas válidas.")
  return payload
}
