export type SearchStatus = "pending" | "running" | "completed" | "failed";

export interface Province {
  name: string;
  capital: string;
  lat: number;
  lng: number;
  defaultRadius: number;
  pillColor: string; // tailwind class
}

export interface Lead {
  place_id: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
  rating: number | null;
  review_count: number | null;
  category: string | null;
  category_id: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  business_status: string | null;
  last_scraped_at: string;
  created_at: string;
}

export interface Search {
  id: string;
  province: string;
  city: string;
  category: string;
  radius_km: number;
  center_lat: number;
  center_lng: number;
  status: SearchStatus;
  total_results: number | null;
  apify_run_id: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ScrapeRequestBody {
  province: string;
  city: string;
  category: string;
  radiusKm: number;
}

export interface SearchStatusResponse {
  search: Search;
  leads: Lead[];
}
