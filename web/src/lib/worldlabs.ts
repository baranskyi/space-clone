// SERVER-ONLY — do not import in client components
import "server-only";

const API_BASE = "https://api.worldlabs.ai/marble/v1";

function headers() {
  const apiKey = process.env.WORLDLABS_API_KEY;
  if (!apiKey) {
    throw new Error("WORLDLABS_API_KEY is not configured");
  }
  return {
    "Content-Type": "application/json",
    "WLT-Api-Key": apiKey,
  };
}

export async function prepareUpload(fileName: string, extension: string) {
  const res = await fetch(`${API_BASE}/media-assets:prepare_upload`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      file_name: fileName,
      extension,
      kind: "image",
    }),
  });
  if (!res.ok) throw new Error(`prepareUpload failed: ${res.status}`);
  return res.json() as Promise<{
    media_asset: { media_asset_id: string };
    upload_url: string;
  }>;
}

export async function uploadFile(uploadUrl: string, file: Blob, mimeType: string) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: file,
  });
  if (!res.ok) throw new Error(`uploadFile failed: ${res.status}`);
}

export async function generateWorld(params: {
  displayName: string;
  mediaAssetId: string;
  isPano: boolean;
  textPrompt?: string;
}) {
  const res = await fetch(`${API_BASE}/worlds:generate`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      display_name: params.displayName,
      world_prompt: {
        type: "image",
        image_prompt: {
          source: "media_asset",
          media_asset_id: params.mediaAssetId,
          is_pano: params.isPano,
        },
        ...(params.textPrompt ? { text_prompt: params.textPrompt } : {}),
      },
    }),
  });
  if (!res.ok) throw new Error(`generateWorld failed: ${res.status}`);
  return res.json() as Promise<{ name: string }>;
}

export async function getOperation(operationId: string) {
  const res = await fetch(`${API_BASE}/operations/${operationId}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`getOperation failed: ${res.status}`);
  return res.json() as Promise<{
    name: string;
    done: boolean;
    metadata: {
      progress: { status: string; percent_complete?: number };
    };
    response?: {
      world: World;
    };
  }>;
}

export async function getWorld(worldId: string) {
  const res = await fetch(`${API_BASE}/worlds/${worldId}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`getWorld failed: ${res.status}`);
  return res.json() as Promise<World>;
}

export interface World {
  world_id: string;
  display_name: string;
  status: string;
  assets: {
    splat_url?: string;
    mesh_url?: string;
    panorama_url?: string;
    thumbnail_url?: string;
  };
  created_at: string;
}
