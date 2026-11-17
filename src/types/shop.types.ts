export interface ShopItem {
  id: string
  name?: string
  title?: string
  description?: string
  artist?: string
  albumArt?: string
  type?: { value: string; displayValue: string }
  rarity?: { value: string; displayValue: string }
  images?: {
    featured?: string | null
    icon?: string | null
    smallIcon?: string | null
    large?: string | null
    small?: string | null
  }
}

export interface ShopEntry {
  offerId: string
  regularPrice: number
  finalPrice: number
  inDate?: string
  outDate?: string
  giftable?: boolean
  refundable?: boolean
  sortPriority?: number
  bundle?: { name: string; info?: string; image?: string }
  banner?: { value: string }
  offerTag?: { text: string }
  layout?: { id: string; name?: string; category?: string; index?: number; rank?: number }
  colors?: { color1?: string; color3?: string }
  newDisplayAsset?: {
    renderImages?: { image: string }[]
    materialInstances?: { images?: { OfferImage?: string } }[]
  }
  brItems?: ShopItem[]
  cars?: ShopItem[]
  instruments?: ShopItem[]
  tracks?: ShopItem[]
  legoKits?: ShopItem[]
}

export interface ShopData {
  date: string
  hash: string
  vbuckIcon?: string
  entries: ShopEntry[]
}

export interface ShopResponse {
  status: number
  data: ShopData
}
