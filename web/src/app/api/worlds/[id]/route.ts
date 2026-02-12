import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Try to get world — RLS will handle own worlds, public worlds accessible to anyone
  const { data: world, error } = await supabase
    .from("worlds")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !world) {
    return NextResponse.json({ error: "World not found" }, { status: 404 });
  }

  return NextResponse.json({ world });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updates = await request.json();

  // Only allow updating certain fields with validation
  const allowed: Record<string, unknown> = {};
  if ("title" in updates) {
    if (typeof updates.title !== "string" || updates.title.length > 200) {
      return NextResponse.json({ error: "Title must be a string under 200 chars" }, { status: 400 });
    }
    allowed.title = updates.title;
  }
  if ("description" in updates) {
    if (typeof updates.description !== "string" || updates.description.length > 2000) {
      return NextResponse.json({ error: "Description must be a string under 2000 chars" }, { status: 400 });
    }
    allowed.description = updates.description;
  }
  if ("is_public" in updates) {
    if (typeof updates.is_public !== "boolean") {
      return NextResponse.json({ error: "is_public must be a boolean" }, { status: 400 });
    }
    allowed.is_public = updates.is_public;
  }

  const { data: world, error } = await supabase
    .from("worlds")
    .update(allowed)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !world) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ world });
}
