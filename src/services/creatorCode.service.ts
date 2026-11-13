import { fetchApi } from "./api.ts";

export const getCreatorCode = (code: string) =>
  fetchApi(`/creatorcode?name=${encodeURIComponent(code)}`);