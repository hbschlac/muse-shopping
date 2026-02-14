import { api } from './client';

export interface FashionFeedItem {
  id: string;
  title: string;
  link: string | null;
  summary: string | null;
  image_url: string | null;
  published_at: string | null;
  source_name: string;
  region: string | null;
  country: string | null;
}

export async function getFashionFeed(params?: {
  limit?: number;
  offset?: number;
  region?: string;
  category?: string;
}): Promise<FashionFeedItem[]> {
  const query = new URLSearchParams();
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.offset) query.append('offset', String(params.offset));
  if (params?.region) query.append('region', params.region);
  if (params?.category) query.append('category', params.category);

  const response = await api.get<{ data: FashionFeedItem[] }>(
    `/fashion/feed?${query.toString()}`
  );
  return response.data;
}


export interface FashionContext {
  headlines: Array<{ title: string; link: string | null; source: string }>;
  trends: Array<{ term: string; count: number }>;
}

export async function getFashionContext(params?: { limit?: number }): Promise<FashionContext> {
  const query = new URLSearchParams();
  if (params?.limit) query.append('limit', String(params.limit));
  const response = await api.get<{ data: FashionContext }>(`/fashion/context?${query.toString()}`);
  return response.data;
}
