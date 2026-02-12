import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB per file

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("photos") as File[];

  if (files.length < 2 || files.length > 20) {
    return NextResponse.json(
      { error: `Expected 2-20 photos, got ${files.length}` },
      { status: 400 }
    );
  }

  // Validate each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File ${i}: invalid type "${file.type}". Allowed: JPEG, PNG, WebP` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File ${i}: too large (${Math.round(file.size / 1024 / 1024)}MB). Max 15MB` },
        { status: 400 }
      );
    }
  }

  const sessionId = nanoid(12);
  const storagePath = `photos/${user.id}/${sessionId}`;

  // Create capture session record
  const { data: session, error: dbError } = await supabase
    .from("capture_sessions")
    .insert({
      user_id: user.id,
      status: "uploading",
      photo_count: files.length,
      photos_storage_path: storagePath,
    })
    .select("id")
    .single();

  if (dbError || !session) {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  // Upload each photo to Supabase Storage
  const uploadErrors: string[] = [];

  await Promise.all(
    files.map(async (file, i) => {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${storagePath}/${String(i).padStart(2, "0")}.${ext}`;
      const buffer = await file.arrayBuffer();

      const { error } = await supabase.storage
        .from("photos")
        .upload(path, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (error) uploadErrors.push(`File ${i}: ${error.message}`);
    })
  );

  if (uploadErrors.length > 0) {
    await supabase
      .from("capture_sessions")
      .update({ status: "failed" })
      .eq("id", session.id);

    return NextResponse.json(
      { error: "Upload failed", details: uploadErrors },
      { status: 500 }
    );
  }

  // Mark session as uploaded
  await supabase
    .from("capture_sessions")
    .update({ status: "uploaded" })
    .eq("id", session.id);

  return NextResponse.json({ sessionId: session.id, storagePath });
}
