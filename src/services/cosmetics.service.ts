import { fetchLocal } from "./analytics.service"
import type { CosmeticsResponse } from "@/types/cosmetics.types"

export const getCosmetics = (params: URLSearchParams, signal?: AbortSignal) => fetchLocal<CosmeticsResponse>(`/cosmetics?${params}`, signal)
