"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WorldCard } from "@/components/gallery/world-card";
import { EmptyState } from "@/components/gallery/empty-state";
import { Plus, Globe } from "lucide-react";
import type { WorldRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Gallery / Home Screen
 * =====================
 * The main hub where users see all their generated 3D worlds.
 *
 * Layout:
 * - Sticky top bar: App name (left) + avatar placeholder (right)
 * - 2-column responsive grid of WorldCards
 * - Empty state when no worlds exist
 * - Floating Action Button for new capture (bottom-right)
 *
 * Responsive behavior:
 * - 320-428px (mobile): 2 columns, 12px gap
 * - 768px+ (tablet): 3 columns, 16px gap
 * - 1280px+ (desktop): 4 columns, contained at max-w-5xl
 *
 * Data:
 * - Currently uses mock data. In production, this fetches from Supabase
 *   via server component or SWR/React Query client-side.
 */

/* ==========================================================================
   Mock data for development -- replace with Supabase query
   ========================================================================== */
const MOCK_WORLDS: WorldRecord[] = [
  {
    id: "w-1",
    user_id: "u-1",
    session_id: "s-1",
    world_labs_id: "wl-1",
    operation_id: null,
    status: "ready",
    title: "Living Room",
    description: "My apartment living room captured on a sunny afternoon",
    viewer_url: "https://marble.worldlabs.ai/viewer/abc123",
    thumbnail_url: null,
    panorama_url: null,
    splat_url: null,
    mesh_url: null,
    is_public: true,
    share_slug: "living-room-abc",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "w-2",
    user_id: "u-1",
    session_id: "s-2",
    world_labs_id: null,
    operation_id: "op-2",
    status: "generating",
    title: "Office Space",
    description: "Coworking space downtown",
    viewer_url: null,
    thumbnail_url: null,
    panorama_url: null,
    splat_url: null,
    mesh_url: null,
    is_public: false,
    share_slug: null,
    created_at: new Date(Date.now() - 300000).toISOString(),
    updated_at: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: "w-3",
    user_id: "u-1",
    session_id: "s-3",
    world_labs_id: "wl-3",
    operation_id: null,
    status: "ready",
    title: "Rooftop Garden",
    description: "The garden terrace on the 12th floor",
    viewer_url: "https://marble.worldlabs.ai/viewer/def456",
    thumbnail_url: null,
    panorama_url: null,
    splat_url: null,
    mesh_url: null,
    is_public: true,
    share_slug: "rooftop-garden-def",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "w-4",
    user_id: "u-1",
    session_id: "s-4",
    world_labs_id: null,
    operation_id: null,
    status: "pending",
    title: "Kitchen",
    description: null,
    viewer_url: null,
    thumbnail_url: null,
    panorama_url: null,
    splat_url: null,
    mesh_url: null,
    is_public: false,
    share_slug: null,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "w-5",
    user_id: "u-1",
    session_id: "s-5",
    world_labs_id: null,
    operation_id: null,
    status: "failed",
    title: "Backyard Attempt",
    description: "Too dark, generation failed",
    viewer_url: null,
    thumbnail_url: null,
    panorama_url: null,
    splat_url: null,
    mesh_url: null,
    is_public: false,
    share_slug: null,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

export default function GalleryPage() {
  /* In production: useSWR / server component fetching from Supabase */
  const [worlds] = useState<WorldRecord[]>(MOCK_WORLDS);
  const isEmpty = worlds.length === 0;

  return (
    <div className="relative min-h-dvh bg-background safe-top safe-bottom">
      {/* ============================================================
          Sticky top bar
          ============================================================ */}
      <header className="sticky top-0 z-40 border-b border-border glass-surface safe-top">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          {/* App identity */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Globe className="size-4 text-primary" aria-hidden="true" />
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">
              Space Clone
            </span>
          </Link>

          {/* User avatar placeholder */}
          <button
            type="button"
            className="touch-target flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-semibold hover:bg-accent transition-colors"
            aria-label="User menu"
          >
            SC
          </button>
        </div>
      </header>

      {/* ============================================================
          Main content
          ============================================================ */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            {/* Section header */}
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-lg font-semibold text-foreground">
                My Spaces
              </h1>
              <span className="text-xs text-muted-foreground tabular-nums">
                {worlds.length} world{worlds.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Grid -- 2 columns mobile, 3 tablet, 4 desktop */}
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4"
              role="list"
              aria-label="Your 3D worlds"
            >
              {worlds.map((world, i) => (
                <div
                  key={world.id}
                  role="listitem"
                  className="animate-space-fade-in"
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
                >
                  <WorldCard world={world} />
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* ============================================================
          Floating Action Button -- new capture
          ============================================================ */}
      <Link
        href="/capture"
        className={cn(
          "fixed bottom-6 right-6 z-50 safe-bottom safe-right",
          "flex size-14 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground",
          "shadow-lg shadow-space-cyan/20",
          "transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-space-cyan/30",
          "active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
        aria-label="Create new space"
      >
        <Plus className="size-6" aria-hidden="true" />
      </Link>
    </div>
  );
}
