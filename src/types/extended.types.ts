export interface CashOffer {
  id: string
  title: string
  description: string
  image: string | null
  url: string | null
  country: string
  currency: string | null
  price: number | null
  originalPrice: number | null
  expires: string | null
  subscription: boolean
  items: { name: string; quantity: number | null }[]
}
export interface CashShop { offers: CashOffer[]; fetchedAt: string; country: string }

