"use client";

import { useEffect, useRef, useState } from "react";
import { productById } from "@/lib/catalog";
import { money, percent } from "@/lib/money";
import { SHOPPERS, shopperById, type Shopper } from "@/lib/shoppers";
import { BackendBadge, type BackendInfo } from "@/components/backend-badge";
import { CheckoutDialog, type CheckoutLine } from "@/components/checkout-dialog";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "cn";

type ShelfItem = {
  id: string;
  name: string;
  maker: string;
  category: string;
  priceCents: number;
  grossMarginCents: number;
  stock: number;
  swatch: string;
  blurb: string;
  tasteFit: number;
  score: number;
  because: string | null;
  inStock: boolean;
};

type FloorMath = {
  pieces: number;
  tasteMarginCents: number;
  baselineMarginCents: number;
  delta: number | null;
};

type TranscriptMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  backend?: BackendInfo;
  offer?: string[];
  floorMath?: FloorMath;
};

type CartLine = { productId: string; quantity: number };

type TasteMeta = { id: string; label: string; note: string };

function intro(shopper: Shopper): TranscriptMessage {
  return {
    id: `intro-${shopper.id}`,
    role: "assistant",
    content: `${shopper.name} is on the floor. The shelf is ranked from their taste — ${shopper.line} Ask what to set aside, or use a prompt. This note did not call a model.`,
    backend: {
      id: "local-planner",
      label: "Shelf ranked from the taste graph — this note did not call a model",
      model: null,
      host: null,
      usedFallback: false,
      detail: null,
    },
  };
}

function affirmative(message: string): boolean {
  return /^(yes|yeah|yep|please|do it|add( both| them| it)?|set (them|it|both) aside|i('|’)ll take (them|it|both))\b/i.test(
    message.trim(),
  );
}

function addProducts(cart: CartLine[], ids: string[], stockOf: (id: string) => number): CartLine[] {
  const next = cart.map((line) => ({ ...line }));
  for (const id of ids) {
    const stock = stockOf(id);
    const existing = next.find((line) => line.productId === id);
    if (existing) {
      if (existing.quantity < stock) existing.quantity += 1;
    } else if (stock > 0) {
      next.push({ productId: id, quantity: 1 });
    }
  }
  return next;
}

export function ShopFloor() {
  const [shopperId, setShopperId] = useState("amina");
  const shopper = shopperById(shopperId) ?? SHOPPERS[0];
  const [messages, setMessages] = useState<TranscriptMessage[]>(() => [intro(shopper)]);
  const [draft, setDraft] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [shelf, setShelf] = useState<ShelfItem[]>([]);
  const [shelfState, setShelfState] = useState<"loading" | "ready" | "error">("loading");
  const [shelfError, setShelfError] = useState<string | null>(null);
  const [taste, setTaste] = useState<TasteMeta | null>(null);
  const [paymentNote, setPaymentNote] = useState(
    "Mock sandbox. Nothing is charged until you point checkout at PayPal sandbox credentials.",
  );
  const [loading, setLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const shopperRef = useRef(shopper.id);

  function stockOf(id: string): number {
    return shelf.find((item) => item.id === id)?.stock ?? productById(id)?.stock ?? 0;
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { payment?: { note?: string } };
      })
      .then((health) => {
        if (!cancelled && health?.payment?.note) setPaymentNote(health.payment.note);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setShelfState("loading");
      setShelfError(null);
      fetch(`/api/shelf?shopper=${shopper.id}`, { cache: "no-store" })
        .then(async (response) => {
          const payload = (await response.json()) as { error?: string; shelf?: ShelfItem[]; taste?: TasteMeta };
          if (!response.ok) throw new Error(payload.error ?? "The shelf did not load.");
          return payload;
        })
        .then((payload) => {
          if (cancelled) return;
          setShelf(payload.shelf ?? []);
          setTaste(payload.taste ?? null);
          setShelfState("ready");
        })
        .catch((caught: unknown) => {
          if (cancelled) return;
          setShelfState("error");
          setShelfError(caught instanceof Error ? caught.message : "The shelf did not load.");
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [shopper.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, loading]);

  function selectShopper(id: string) {
    const next = shopperById(id);
    if (!next || next.id === shopper.id) return;
    shopperRef.current = next.id;
    setShopperId(next.id);
    setMessages([intro(next)]);
    setCart([]);
    setChatError(null);
    setDraft("");
  }

  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading) return;

    const lastOffer = [...messages].reverse().find((entry) => entry.role === "assistant")?.offer ?? [];
    const named = shelf
      .filter((item) => message.toLowerCase().includes(item.name.toLowerCase()))
      .map((item) => item.id);
    const toAdd = named.length > 0 ? named : affirmative(message) ? lastOffer : [];
    const nextCart = toAdd.length > 0 ? addProducts(cart, toAdd, stockOf) : cart;
    if (toAdd.length > 0) setCart(nextCart);

    const history = messages
      .filter((entry) => entry.id.startsWith("m-"))
      .slice(-6)
      .map((entry) => ({ role: entry.role, content: entry.content }));

    const sentFor = shopper.id;
    setMessages((current) => [
      ...current,
      { id: `m-${crypto.randomUUID()}`, role: "user", content: message },
    ]);
    setDraft("");
    setLoading(true);
    setChatError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopperId: shopper.id,
          message,
          history,
          cart: nextCart,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        say?: string;
        offer?: string[];
        backend?: BackendInfo;
        shelf?: ShelfItem[];
        floorMath?: FloorMath;
        taste?: TasteMeta;
      };
      if (!response.ok || !payload.say || !payload.backend) {
        throw new Error(payload.error ?? "The floor did not answer.");
      }
      if (shopperRef.current !== sentFor) return;
      setMessages((current) => [
        ...current,
        {
          id: `m-${crypto.randomUUID()}`,
          role: "assistant",
          content: payload.say ?? "",
          backend: payload.backend,
          offer: payload.offer ?? [],
          floorMath: payload.floorMath,
        },
      ]);
      if (payload.shelf && payload.shelf.length > 0) setShelf(payload.shelf);
      if (payload.taste) setTaste(payload.taste);
    } catch (caught) {
      setChatError(caught instanceof Error ? caught.message : "The floor did not answer.");
    } finally {
      setLoading(false);
    }
  }

  const resolvedCart: CheckoutLine[] = cart.flatMap((line) => {
    const product = productById(line.productId);
    if (!product) return [];
    return [
      {
        productId: product.id,
        name: product.name,
        quantity: line.quantity,
        lineCents: product.priceCents * line.quantity,
      },
    ];
  });
  const totalCents = resolvedCart.reduce((sum, line) => sum + line.lineCents, 0);

  const shelfPanel = (
    <section id="floor" className="rounded-xl border border-border bg-card">
      <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="font-serif text-xl">The shelf</h2>
        <p className="text-xs text-muted-foreground">{taste ? taste.label : "Ranking…"}</p>
      </div>
      {shelfState === "loading" && (
        <div className="flex flex-col gap-3 p-4" aria-hidden="true">
          <div className="h-16 animate-pulse rounded-md bg-muted" />
          <div className="h-16 animate-pulse rounded-md bg-muted" />
          <div className="h-16 animate-pulse rounded-md bg-muted" />
        </div>
      )}
      {shelfState === "error" && (
        <p role="alert" className="p-4 text-sm text-destructive">
          {shelfError}
        </p>
      )}
      {shelfState === "ready" && shelf.filter((item) => item.inStock).length === 0 && (
        <p className="p-4 text-sm text-muted-foreground">
          Nothing in stock fits this request. Restock from the desk, or ask without a budget.
        </p>
      )}
      {shelfState === "ready" && (
        <ul>
          {shelf.map((item, index) => {
            const inBag = cart.find((line) => line.productId === item.id)?.quantity ?? 0;
            const canAdd = item.inStock && inBag < item.stock;
            return (
              <li key={item.id} className="grid grid-cols-[auto_1fr] gap-3 border-b border-border px-4 py-4 last:border-b-0">
                <div
                  className="relative size-14 shrink-0 rounded-md"
                  style={{ background: item.swatch }}
                  aria-hidden="true"
                >
                  <span className="absolute bottom-1 left-1 rounded bg-foreground/85 px-1 font-serif text-sm text-background">
                    {index + 1}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-lg leading-tight">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.maker} · {item.inStock ? `${item.stock} on the shelf` : "sold through"}
                      </p>
                    </div>
                    <p className="shrink-0 font-serif tabular-nums">{money(item.priceCents)}</p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{item.because ?? item.blurb}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-block h-1 w-16 overflow-hidden rounded-full bg-border">
                        <span
                          className="block h-full bg-copper"
                          style={{ width: `${Math.round(item.tasteFit * 100)}%` }}
                        />
                      </span>
                      taste fit {Math.round(item.tasteFit * 100)}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!canAdd}
                      aria-label={`Set aside ${item.name}`}
                      onClick={() => setCart((current) => addProducts(current, [item.id], stockOf))}
                    >
                      {canAdd ? "Set aside" : "None left"}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  const bagPanel = (
    <section id="bag" className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-serif text-xl">The bag</h2>
      {resolvedCart.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Nothing set aside. The shelf is the suggestion. The bag is the sale.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {resolvedCart.map((line) => (
            <li key={line.productId} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0">
                {line.name}
                <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                  {money(line.lineCents)}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  aria-label={`Remove one ${line.name}`}
                  onClick={() =>
                    setCart((current) =>
                      current.flatMap((entry) => {
                        if (entry.productId !== line.productId) return [entry];
                        if (entry.quantity <= 1) return [];
                        return [{ ...entry, quantity: entry.quantity - 1 }];
                      }),
                    )
                  }
                >
                  –
                </Button>
                <span className="w-6 text-center tabular-nums">{line.quantity}</span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  aria-label={`Add another ${line.name}`}
                  disabled={line.quantity >= stockOf(line.productId)}
                  onClick={() => setCart((current) => addProducts(current, [line.productId], stockOf))}
                >
                  +
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 flex items-baseline justify-between border-t border-border pt-3 font-serif text-lg">
        <span>Total</span>
        <span className="tabular-nums">{money(totalCents)}</span>
      </p>
      <Button
        type="button"
        className="mt-3 h-10 w-full"
        disabled={resolvedCart.length === 0}
        onClick={() => setCheckoutOpen(true)}
      >
        Sandbox checkout
      </Button>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{paymentNote}</p>
    </section>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-6">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Who just walked in</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {SHOPPERS.map((person) => {
              const selected = person.id === shopper.id;
              return (
                <button
                  key={person.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectShopper(person.id)}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-left transition-colors",
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card hover:bg-muted",
                  )}
                >
                  <span className="block font-serif text-lg leading-tight">{person.name}</span>
                  <span className={cn("mt-1 block text-sm", selected ? "text-background/75" : "text-muted-foreground")}>
                    {person.line}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 md:hidden">
          <Button type="button" variant="outline" size="sm" onClick={() => jump("talk")}>
            Talk
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => jump("floor")}>
            Shelf
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => jump("bag")}>
            Bag
          </Button>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
          <section id="talk" className="flex flex-col rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-serif text-xl">The floor</h2>
              <p className="text-sm text-muted-foreground">
                Signals: {shopper.signals.map((signal) => signal.name).join(", ")}
              </p>
            </div>
            <ScrollArea className="h-80">
              <div className="flex flex-col gap-4 p-4" aria-live="polite">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={cn(
                      "max-w-[40rem] text-sm leading-relaxed",
                      message.role === "user" ? "ml-auto rounded-lg bg-foreground px-3 py-2 text-background" : "",
                    )}
                  >
                    <p>{message.content}</p>
                    {message.role === "assistant" && message.backend && <BackendBadge backend={message.backend} />}
                    {message.floorMath && message.floorMath.pieces > 0 && (
                      <p className="mt-2 border-t border-border pt-2 text-xs leading-relaxed text-muted-foreground">
                        Floor math, not the model: if these {message.floorMath.pieces} sell, gross margin is{" "}
                        {money(message.floorMath.tasteMarginCents)} versus{" "}
                        {money(message.floorMath.baselineMarginCents)} for the same number of bestsellers
                        {message.floorMath.delta == null ? "" : ` (${percent(message.floorMath.delta)})`}.
                      </p>
                    )}
                    {message.offer && message.offer.length > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="mt-3"
                        onClick={() => setCart((current) => addProducts(current, message.offer ?? [], stockOf))}
                      >
                        Set aside {message.offer.length === 1 ? message.offer.map((id) => shelf.find((item) => item.id === id)?.name ?? "this").join("") : "these"}
                      </Button>
                    )}
                  </article>
                ))}
                {loading && <p className="text-sm text-muted-foreground">Working the floor…</p>}
                <div ref={endRef} />
              </div>
            </ScrollArea>
            {chatError && (
              <p role="alert" className="px-4 pb-2 text-sm text-destructive">
                {chatError}
              </p>
            )}
            <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
              {shopper.prompts.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto py-1 text-left whitespace-normal"
                  disabled={loading}
                  onClick={() => void send(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
            <form
              className="flex gap-2 border-t border-border p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void send(draft);
              }}
            >
              <label className="sr-only" htmlFor="clerk-message">
                Message the floor
              </label>
              <Input
                id="clerk-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`What should we set aside for ${shopper.name.split(" ")[0]}?`}
                className="h-10"
                disabled={loading}
              />
              <Button type="submit" className="h-10" disabled={loading || draft.trim().length === 0}>
                Ask
              </Button>
            </form>
          </section>

          <div className="flex flex-col gap-6">
            {shelfPanel}
            {bagPanel}
          </div>
        </div>
      </main>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        shopperName={shopper.name}
        lines={resolvedCart}
        totalCents={totalCents}
        paymentNote={paymentNote}
        onConfirm={async () => {
          const response = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              shopperId: shopper.id,
              lines: cart,
            }),
          });
          const payload = (await response.json()) as {
            error?: string;
            order?: {
              paypalOrderId: string;
              provider: string;
              totalCents: number;
              charged: false;
              note: string;
              approvalUrl: string | null;
            };
            stock?: Record<string, number>;
          };
          if (!response.ok || !payload.order) {
            throw new Error(payload.error ?? "Checkout failed.");
          }
          if (payload.stock) {
            const stock = payload.stock;
            setShelf((current) =>
              current.map((item) => ({
                ...item,
                stock: stock[item.id] ?? item.stock,
                inStock: (stock[item.id] ?? 0) > 0,
              })),
            );
          }
          setCart([]);
          return payload.order;
        }}
      />
    </div>
  );
}
