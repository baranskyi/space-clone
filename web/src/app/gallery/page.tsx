"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { WorldCard } from "@/components/gallery/world-card";
import { EmptyState } from "@/components/gallery/empty-state";
import { Plus, Globe, Loader2 } from "lucide-react";
import type { WorldRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function GalleryPage() {
  const [worlds, setWorlds] = useState<WorldRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorlds = useCallback(async () => {
    try {
      const res = await fetch("/api/worlds");
      if (res.ok) {
        const data = await res.json();
        setWorlds(data.worlds);
      }
    } catch {
      // Silently fail — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorlds();
  }, [fetchWorlds]);

  // Poll for generating worlds
  useEffect(() => {
    const generating = worlds.some((w) => w.status === "generating" || w.status === "pending");
    if (!generating) return;

    const interval = setInterval(fetchWorlds, 15000);
    return () => clearInterval(interval);
  }, [worlds, fetchWorlds]);

  return (
    <div className="relative min-h-dvh bg-background safe-top safe-bottom">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-40 border-b border-border glass-surface safe-top">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Globe className="size-4 text-primary" aria-hidden="true" />
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">
              Space Clone
            </span>
          </Link>

          <button
            type="button"
            className="touch-target flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-semibold hover:bg-accent transition-colors"
            aria-label="User menu"
          >
            SC
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 text-muted-foreground animate-spin" />
          </div>
        ) : worlds.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-lg font-semibold text-foreground">
                My Spaces
              </h1>
              <span className="text-xs text-muted-foreground tabular-nums">
                {worlds.length} world{worlds.length !== 1 ? "s" : ""}
              </span>
            </div>

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

      {/* FAB */}
      <Link
        href="/capture"
        className={cn(
          "fixed bottom-6 right-6 z-50 safe-bottom",
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
