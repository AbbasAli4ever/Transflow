import { apiRequest } from "./api";

export type SearchResultType = "customer" | "supplier" | "product" | "account";

export interface SearchResultItem {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  status: string;
  meta: Record<string, unknown>;
}

export interface SearchResponse {
  results: SearchResultItem[];
}

export function searchEntities(q: string, limit = 5): Promise<SearchResponse> {
  const qs = new URLSearchParams({ q, limit: String(limit) });
  return apiRequest<SearchResponse>(`/search?${qs}`);
}
