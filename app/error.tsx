"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-6">
      <p className="font-serif text-3xl">The floor hit a snag.</p>
      <p className="text-sm text-muted-foreground">{error.message || "Something broke while rendering Vitrine."}</p>
      <Button type="button" onClick={reset} className="w-fit">
        Try again
      </Button>
    </main>
  );
}
