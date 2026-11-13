import { fetchApi } from "./api.ts";

export const getShop = () =>
  fetchApi("/shop");