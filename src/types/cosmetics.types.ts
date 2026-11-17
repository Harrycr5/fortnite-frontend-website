export type CosmeticCategory = "br" | "tracks" | "instruments" | "cars" | "lego" | "legoKits" | "beans"
export interface Cosmetic {
  id: string
  category: CosmeticCategory
  name: string
  description: string
  type: string
  typeLabel: string
  rarity: string
  rarityLabel: string
  series: string
  set: string
  introduction: string
  added: string | null
  image: string | null
  thumbnail: string | null
  artist: string
  variants: { type: string; options: { name: string; image: string | null }[] }[]
}
export interface CosmeticsResponse {
  items: Cosmetic[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  catalogTotal: number
  categories: { value: CosmeticCategory; count: number }[]
  types: { value: string; label: string }[]
  rarities: { value: string; label: string }[]
  fetchedAt: string
}
