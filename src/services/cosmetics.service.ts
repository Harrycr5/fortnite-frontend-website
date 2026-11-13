import { fetchApi } from "./api.ts";

export const getCosmetics = () =>
  fetchApi("/cosmetics");