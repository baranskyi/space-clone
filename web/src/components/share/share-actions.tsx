"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Code2, Check, Copy, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ShareActions -- share and embed buttons with copy-to-clipboard.
 *
 * Design:
 * - Two primary actions: Share link + Copy embed code.
 * - Uses the Web Share API when available (mobile), falls back to clipboard.
 * - Brief "Copied!" confirmation with icon swap for tactile feedback.
 * - Touch-friendly 44px minimum targets.
 */

interface ShareActionsProps {
  worldId: string;
  title: string;
  className?: string;
}

export function ShareActions({ worldId, title, className }: ShareActionsProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/${worldId}`
      : `/share/${worldId}`;

  const embedCode = `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;

  const handleShare = useCallback(async () => {
    /* Try native share first (great on mobile) */
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${title} -- Space Clone`,
          url: shareUrl,
        });
        return;
      } catch {
        /* User cancelled or API failed, fall through to clipboard */
      }
    }

    /* Fallback: copy link */
    await navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, [shareUrl, title]);

  const handleCopyEmbed = useCallback(async () => {
    await navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  }, [embedCode]);

  return (
    <div className={cn("flex gap-3", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        className="gap-2 touch-target"
      >
        {copiedLink ? (
          <Check className="size-4 text-space-success" aria-hidden="true" />
        ) : (
          <Link2 className="size-4" aria-hidden="true" />
        )}
        {copiedLink ? "Copied!" : "Share"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyEmbed}
        className="gap-2 touch-target"
      >
        {copiedEmbed ? (
          <Check className="size-4 text-space-success" aria-hidden="true" />
        ) : (
          <Code2 className="size-4" aria-hidden="true" />
        )}
        {copiedEmbed ? "Copied!" : "Embed"}
      </Button>
    </div>
  );
}
