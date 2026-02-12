import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Globe, Plus } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

interface SharePageProps {
  params: Promise<{ id: string }>;
}

async function getWorldBySlug(slug: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("worlds")
    .select("*")
    .eq("share_slug", slug)
    .eq("is_public", true)
    .single();
  return data;
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { id } = await params;
  const world = await getWorldBySlug(id);

  const title = world ? `${world.title} — Space Clone` : "3D Space — Space Clone";
  const description = world?.description ||
    "Explore this immersive 3D world captured and generated with Space Clone.";
  const thumbnail = world?.thumbnail_url || "/og-default.png";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/share/${id}`,
      siteName: "Space Clone",
      images: [{ url: thumbnail, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [thumbnail],
    },
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;
  const world = await getWorldBySlug(id);

  if (!world || !world.viewer_url) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <Globe className="size-12 text-muted-foreground" />
        <h1 className="text-lg font-semibold">World not found</h1>
        <p className="text-sm text-muted-foreground">This world may not exist or is not public.</p>
        <Button asChild>
          <Link href="/">Go to Space Clone</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-dvh bg-black overflow-hidden">
      {/* Loading state */}
      <div
        className="absolute inset-0 flex items-center justify-center bg-background z-10"
        aria-hidden="true"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">Loading 3D viewer...</span>
        </div>
      </div>

      {/* 3D viewer iframe */}
      <iframe
        src={world.viewer_url}
        className="absolute inset-0 h-full w-full border-0 z-[15]"
        allow="accelerometer; gyroscope; fullscreen"
        allowFullScreen
        title={`3D view: ${world.title}`}
      />

      {/* Branded header */}
      <header className="absolute top-0 inset-x-0 z-30 safe-top">
        <div className="flex items-center justify-between px-4 pt-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-sm px-3.5 py-2 transition-colors hover:bg-black/60"
          >
            <Globe className="size-4 text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold text-white">Space Clone</span>
          </Link>
        </div>
      </header>

      {/* Bottom CTA */}
      <div className="absolute bottom-0 inset-x-0 z-30 safe-bottom">
        <div className="flex items-center justify-between gap-3 px-4 py-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
          <p className="text-sm text-white/70 flex-1 min-w-0">Captured with Space Clone</p>
          <Button asChild size="sm" className="gap-2 touch-target shrink-0">
            <Link href="/capture">
              <Plus className="size-3.5" aria-hidden="true" />
              Create yours
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
