import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";
import * as worldlabs from "@/lib/worldlabs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId, title } = await request.json();

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  // Get session with panorama URL
  const { data: session } = await supabase
    .from("capture_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session || !session.panorama_url) {
    return NextResponse.json(
      { error: "Session not found or panorama not ready" },
      { status: 404 }
    );
  }

  try {
    // Update session status
    await supabase
      .from("capture_sessions")
      .update({ status: "generating" })
      .eq("id", sessionId);

    // 1. Prepare upload on World Labs
    const displayName = title || "Space Clone Capture";
    const { media_asset, upload_url } = await worldlabs.prepareUpload(
      `panorama_${sessionId}.jpg`,
      "jpg"
    );

    // 2. Download panorama from Supabase and upload to World Labs
    if (!session.panorama_storage_path) {
      throw new Error("Panorama not stitched yet");
    }
    const { data: panoramaBlob } = await supabase.storage
      .from("panoramas")
      .download(session.panorama_storage_path);

    if (!panoramaBlob) {
      throw new Error("Failed to download panorama from storage");
    }

    await worldlabs.uploadFile(upload_url, panoramaBlob, "image/jpeg");

    // 3. Generate world
    const operation = await worldlabs.generateWorld({
      displayName,
      mediaAssetId: media_asset.media_asset_id,
      isPano: true,
    });

    // Extract operation ID from operation name (format: "operations/{id}")
    const operationId = operation.name.replace("operations/", "");

    // 4. Create world record in DB
    const shareSlug = nanoid(10);
    const { data: world, error: worldError } = await supabase
      .from("worlds")
      .insert({
        user_id: user.id,
        session_id: sessionId,
        operation_id: operationId,
        status: "generating",
        title: displayName,
        is_public: false,
        share_slug: shareSlug,
      })
      .select("id")
      .single();

    if (worldError || !world) {
      throw new Error("Failed to create world record");
    }

    return NextResponse.json({
      worldId: world.id,
      operationId,
      shareSlug,
    });
  } catch (err) {
    await supabase
      .from("capture_sessions")
      .update({ status: "failed" })
      .eq("id", sessionId);

    console.error("[generate]", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
