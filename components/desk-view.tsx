"use client";

import { useEffect, useState } from "react";
import { money, percent } from "@/lib/money";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

type ShopperReport = {
  shopperId: string;
  shopperName: string;
  tasteTop: { id: string; name: string; grossMarginCents: number }[];
  tasteMarginCents: number;
  baselineMarginCents: number;
  delta: number | null;
};

type DeskPayload = {
  report: {
    formula: string;
    baselineNames: string[];
    baselineMarginCents: number;
    shoppers: ShopperReport[];
    recall: {
      visits: number;
      tasteRate: number;
      popularityRate: number;
      tasteHits: number;
      tasteItems: number;
      popularityHits: number;
      popularityItems: number;
    };
    note: string;
  };
  orders: {
    id: string;
    createdAt: string;
    shopperName: string;
    totalCents: number;
    grossMarginCents: number;
    provider: string;
    paypalOrderId: string;
    charged: false;
    note: string;
    lines: { name: string; quantity: number; lineCents: number }[];
  }[];
};

export function DeskView() {
  const [data, setData] = useState<DeskPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/desk", { cache: "no-store" });
      if (!response.ok) throw new Error("The desk did not load.");
      setData((await response.json()) as DeskPayload);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The desk did not load.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function restock() {
    setResetting(true);
    try {
      const response = await fetch("/api/floor/reset", { method: "POST" });
      if (!response.ok) throw new Error("Could not restock the floor.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not restock the floor.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6">
        <div className="max-w-2xl">
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Northline Goods</p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">The desk</h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            What the taste ranking does to gross margin, on eight counter visits. The language model
            writes the floor note. It does not compute this page.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {!data && !error && <p className="text-sm text-muted-foreground">Opening the books…</p>}

        {data && (
          <>
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-serif text-2xl">The formula</h2>
              <p className="mt-3 text-sm leading-relaxed">{data.report.formula}</p>
              <p className="mt-3 text-sm text-muted-foreground">{data.report.note}</p>
              <p className="mt-4 text-sm">
                Bestsellers held up as the baseline: {data.report.baselineNames.join(", ")}. Their
                combined gross margin is {money(data.report.baselineMarginCents)}.
              </p>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Taste top 3</p>
                <p className="mt-2 font-serif text-4xl tabular-nums">
                  {Math.round(data.report.recall.tasteRate * 100)}%
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  of items actually bought also sat in that shopper&apos;s taste top 3 (
                  {data.report.recall.tasteHits} of {data.report.recall.tasteItems},{" "}
                  {data.report.recall.visits} visits).
                </p>
              </article>
              <article className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Bestsellers top 3</p>
                <p className="mt-2 font-serif text-4xl tabular-nums">
                  {Math.round(data.report.recall.popularityRate * 100)}%
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  of those same purchases showed up in the storewide bestsellers (
                  {data.report.recall.popularityHits} of {data.report.recall.popularityItems}).
                </p>
              </article>
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="font-serif text-2xl">If the top three sell</h2>
              <div className="grid gap-3 lg:grid-cols-3">
                {data.report.shoppers.map((shopper) => (
                  <article key={shopper.shopperId} className="rounded-xl border border-border bg-card p-5">
                    <h3 className="font-serif text-xl">{shopper.shopperName}</h3>
                    <p className="mt-2 font-serif text-3xl tabular-nums">
                      {shopper.delta == null ? "—" : percent(shopper.delta)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      gross margin versus the bestsellers ({money(shopper.tasteMarginCents)} vs{" "}
                      {money(shopper.baselineMarginCents)})
                    </p>
                    <ul className="mt-4 flex flex-col gap-2 text-sm">
                      {shopper.tasteTop.map((item) => (
                        <li key={item.id} className="flex justify-between gap-3">
                          <span>{item.name}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {money(item.grossMarginCents)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-2xl">Sandbox orders</h2>
                <Button type="button" variant="outline" onClick={() => void restock()} disabled={resetting}>
                  {resetting ? "Restocking…" : "Restock the floor"}
                </Button>
              </div>
              {data.orders.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No sandbox order yet. Check someone out on the floor and the order lands here, still
                  uncaptured.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-4">
                  {data.orders.map((order) => (
                    <li key={order.id} className="border-t border-border pt-3 text-sm">
                      <p className="font-medium">
                        {order.shopperName} · {money(order.totalCents)} · margin {money(order.grossMarginCents)}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {order.paypalOrderId} · {order.provider} · charged: no
                      </p>
                      <p className="mt-1">{order.lines.map((line) => `${line.quantity} × ${line.name}`).join(", ")}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
