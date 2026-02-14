"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/capture");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 safe-top safe-bottom">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Space Clone</h1>
          <p className="mt-2 text-sm text-white/50">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-medium text-white/60">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-none border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-space-cyan/50 focus:outline-none focus:ring-1 focus:ring-space-cyan/50"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-xs font-medium text-white/60">Password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-none border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-space-cyan/50 focus:outline-none focus:ring-1 focus:ring-space-cyan/50"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-none bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full touch-target">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-sm text-white/40">
          No account?{" "}
          <Link href="/register" className="text-space-cyan hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
