import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public endpoint — no auth required, uses admin client to bypass RLS
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Validate slug format (nanoid generates alphanumeric + _-)
  if (!/^[a-zA-Z0-9_-]{5,21}$/.test(slug)) {
    return NextResponse.json({ error: "Invalid share link" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: world, error } = await supabase
    .from("worlds")
    .select("id, title, description, viewer_url, thumbnail_url, panorama_url, is_public, share_slug, created_at")
    .eq("share_slug", slug)
    .eq("is_public", true)
    .single();

  if (error || !world) {
    return NextResponse.json({ error: "World not found" }, { status: 404 });
  }

  return NextResponse.json({ world });
}
