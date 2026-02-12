import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as worldlabs from "@/lib/worldlabs";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const worldId = request.nextUrl.searchParams.get("worldId");

  if (!worldId) {
    return NextResponse.json({ error: "worldId required" }, { status: 400 });
  }

  // Get world record
  const { data: world } = await supabase
    .from("worlds")
    .select("*")
    .eq("id", worldId)
    .eq("user_id", user.id)
    .single();

  if (!world) {
    return NextResponse.json({ error: "World not found" }, { status: 404 });
  }

  // If already ready or failed, return current status
  if (world.status === "ready" || world.status === "failed") {
    return NextResponse.json({
      status: world.status,
      world,
    });
  }

  // Poll World Labs operation
  if (!world.operation_id) {
    return NextResponse.json({ error: "No operation ID" }, { status: 500 });
  }

  try {
    const operation = await worldlabs.getOperation(world.operation_id);

    if (operation.done && operation.response) {
      const wlWorld = operation.response.world;
      const viewerUrl = `https://marble.worldlabs.ai/world/${wlWorld.world_id}`;

      // Update world record with final data
      await supabase
        .from("worlds")
        .update({
          status: "ready",
          world_labs_id: wlWorld.world_id,
          viewer_url: viewerUrl,
          thumbnail_url: wlWorld.assets.thumbnail_url || null,
          panorama_url: wlWorld.assets.panorama_url || null,
          splat_url: wlWorld.assets.splat_url || null,
          mesh_url: wlWorld.assets.mesh_url || null,
        })
        .eq("id", worldId);

      // Also update session status
      if (world.session_id) {
        await supabase
          .from("capture_sessions")
          .update({ status: "done" })
          .eq("id", world.session_id);
      }

      const { data: updatedWorld } = await supabase
        .from("worlds")
        .select("*")
        .eq("id", worldId)
        .single();

      return NextResponse.json({
        status: "ready",
        world: updatedWorld,
      });
    }

    // Still generating
    const progress = operation.metadata?.progress;
    return NextResponse.json({
      status: "generating",
      progress: {
        state: progress?.status || "IN_PROGRESS",
        percent: progress?.percent_complete || null,
      },
    });
  } catch (err) {
    // If World Labs API fails, mark as failed
    const errorMsg = err instanceof Error ? err.message : "Status check failed";

    if (errorMsg.includes("404") || errorMsg.includes("not found")) {
      await supabase
        .from("worlds")
        .update({ status: "failed" })
        .eq("id", worldId);

      return NextResponse.json({ status: "failed", error: errorMsg });
    }

    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
