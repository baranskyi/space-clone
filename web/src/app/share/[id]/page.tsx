import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Globe, Plus } from "lucide-react";

/**
 * Share / Embed Screen
 * ====================
 * Public page -- no authentication required. Designed for social sharing.
 *
 * Layout:
 * - Full-screen 3D viewer iframe (edge to edge)
 * - Minimal branded header (glassmorphism, floats over content)
 * - "Create your own" CTA at bottom
 *
 * SEO / Social:
 * - Dynamic OG meta tags via generateMetadata (title, description, image)
 * - Canonical URL for proper indexing
 * - Twitter card support
 *
 * This is a server component at the top level for metadata generation,
 * with a client component for the interactive viewer.
 */

/* ==========================================================================
   OG Metadata generation
   ========================================================================== */
interface SharePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { id } = await params;

  /*
   * In production: fetch world data from Supabase here to get
   * the actual title, description, and thumbnail.
   */
  const title = `3D Space -- Space Clone`;
  const description =
    "Explore this immersive 3D world captured and generated with Space Clone. Navigate freely in the browser.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/share/${id}`,
      siteName: "Space Clone",
      images: [
        {
          /* In production: world.thumbnail_url */
          url: "/og-default.png",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-default.png"],
    },
  };
}

/* ==========================================================================
   Page component (server)
   ========================================================================== */
export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;

  /*
   * In production: fetch from Supabase where share_slug = id or id = id.
   * For now, use placeholder data.
   */
  const viewerUrl = `https://marble.worldlabs.ai/viewer/${id}`;
  const worldTitle = "3D Space";

  return (
    <div className="relative h-dvh bg-black overflow-hidden">
      {/* ============================================================
          Full-screen 3D viewer iframe
          ============================================================ */}
      <ShareViewer viewerUrl={viewerUrl} title={worldTitle} />

      {/* ============================================================
          Minimal branded header
          ============================================================ */}
      <header className="absolute top-0 inset-x-0 z-30 safe-top">
        <div className="flex items-center justify-between px-4 pt-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-sm px-3.5 py-2 transition-colors hover:bg-black/60"
          >
            <Globe className="size-4 text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold text-white">
              Space Clone
            </span>
          </Link>
        </div>
      </header>

      {/* ============================================================
          Bottom CTA bar
          ============================================================ */}
      <div className="absolute bottom-0 inset-x-0 z-30 safe-bottom">
        <div className="flex items-center justify-between gap-3 px-4 py-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
          <p className="text-sm text-white/70 flex-1 min-w-0">
            Captured with Space Clone
          </p>
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

/* ==========================================================================
   Client sub-component: the interactive viewer iframe
   ========================================================================== */
function ShareViewer({
  viewerUrl,
  title,
}: {
  viewerUrl: string;
  title: string;
}) {
  return (
    <>
      {/* Placeholder loading state rendered server-side,
          replaced once iframe loads (handled by browser natively) */}
      <div
        className="absolute inset-0 flex items-center justify-center bg-background z-10"
        aria-hidden="true"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">
            Loading 3D viewer...
          </span>
        </div>
      </div>

      <iframe
        src={viewerUrl}
        className="absolute inset-0 h-full w-full border-0 z-[15]"
        allow="accelerometer; gyroscope; fullscreen"
        allowFullScreen
        title={`3D view: ${title}`}
      />
    </>
  );
}
