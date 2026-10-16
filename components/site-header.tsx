"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

type Health = {
  llm: {
    id: string;
    label: string;
    model: string | null;
    host: string | null;
    ready: boolean;
  };
  taste: { id: string; label: string; note: string };
  payment: { id: string; label: string; note: string; sandboxOnly: boolean };
};

export function SiteHeader() {
  const pathname = usePathname();
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not read the endpoint configuration.");
      setHealth((await response.json()) as Health);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read the endpoint configuration.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const amd = health?.llm.id === "amd-mi300x";

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <Link href="/" className="group">
            <span className="font-serif text-2xl tracking-tight text-foreground">Vitrine</span>
            <span className="ml-3 hidden text-sm text-muted-foreground sm:inline">
              Floor tool · Northline Goods
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/"
              className={cn(
                "rounded-md px-2.5 py-1",
                pathname === "/" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Floor
            </Link>
            <Link
              href="/desk"
              className={cn(
                "rounded-md px-2.5 py-1",
                pathname === "/desk" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Desk
            </Link>
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "rounded-full px-2.5 py-1 text-[0.72rem] tracking-wide",
              amd ? "bg-pine text-paper" : "border border-border text-muted-foreground",
            )}
          >
            {error
              ? error
              : health
                ? `Configured: ${health.llm.label}`
                : "Checking the endpoint…"}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => void load()}>
            Recheck
          </Button>
        </div>
      </div>
    </header>
  );
}
