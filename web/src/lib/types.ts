export interface CaptureSession {
  id: string;
  user_id: string;
  status: "capturing" | "uploading" | "stitching" | "stitched" | "generating" | "done" | "failed";
  photo_count: number;
  photos_storage_path: string | null;
  panorama_storage_path: string | null;
  panorama_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorldRecord {
  id: string;
  user_id: string;
  session_id: string | null;
  world_labs_id: string | null;
  operation_id: string | null;
  status: "pending" | "generating" | "ready" | "failed";
  title: string;
  description: string | null;
  viewer_url: string | null;
  thumbnail_url: string | null;
  panorama_url: string | null;
  splat_url: string | null;
  mesh_url: string | null;
  is_public: boolean;
  share_slug: string | null;
  created_at: string;
  updated_at: string;
}
