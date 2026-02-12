import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await request.json();

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  // Get session details
  const { data: session } = await supabase
    .from("capture_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Update status to stitching
  await supabase
    .from("capture_sessions")
    .update({ status: "stitching" })
    .eq("id", sessionId);

  try {
    // List photos in storage
    const { data: files } = await supabase.storage
      .from("photos")
      .list(session.photos_storage_path);

    if (!files || files.length === 0) {
      throw new Error("No photos found in storage");
    }

    // Download photos and send to stitch service
    const formData = new FormData();

    for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
      const { data: blob } = await supabase.storage
        .from("photos")
        .download(`${session.photos_storage_path}/${file.name}`);

      if (blob) {
        formData.append("files", blob, file.name);
      }
    }

    // Call Python stitch service with timeout
    const stitchUrl = process.env.STITCH_SERVICE_URL || "http://localhost:8000";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000); // 2min timeout

    const stitchResponse = await fetch(`${stitchUrl}/stitch`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!stitchResponse.ok) {
      throw new Error("Stitch service returned an error");
    }

    // Get panorama blob from stitch service
    const panoramaBlob = await stitchResponse.blob();
    const panoramaPath = `panoramas/${sessionId}.jpg`;

    // Upload panorama to Supabase Storage
    const panoramaBuffer = await panoramaBlob.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("panoramas")
      .upload(panoramaPath, panoramaBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Panorama upload failed: ${uploadError.message}`);
    }

    // Get public URL for the panorama
    const { data: urlData } = supabase.storage
      .from("panoramas")
      .getPublicUrl(panoramaPath);

    // Update session with panorama info
    await supabase
      .from("capture_sessions")
      .update({
        status: "stitched",
        panorama_storage_path: panoramaPath,
        panorama_url: urlData.publicUrl,
      })
      .eq("id", sessionId);

    return NextResponse.json({
      sessionId,
      panoramaPath,
      panoramaUrl: urlData.publicUrl,
    });
  } catch (err) {
    await supabase
      .from("capture_sessions")
      .update({ status: "failed" })
      .eq("id", sessionId);

    console.error("[stitch]", err);
    const message = err instanceof Error && err.name === "AbortError"
      ? "Stitch service timeout"
      : "Stitching failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
