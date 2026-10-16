"use client";

import { useState } from "react";
import { money } from "@/lib/money";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type CheckoutLine = {
  productId: string;
  name: string;
  quantity: number;
  lineCents: number;
};

type CheckoutOrder = {
  paypalOrderId: string;
  provider: string;
  totalCents: number;
  charged: false;
  note: string;
  approvalUrl: string | null;
  status?: string;
};

export function CheckoutDialog({
  open,
  onOpenChange,
  shopperName,
  lines,
  totalCents,
  paymentNote,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopperName: string;
  lines: CheckoutLine[];
  totalCents: number;
  paymentNote: string;
  onConfirm: () => Promise<CheckoutOrder>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<CheckoutOrder | null>(null);

  function close(next: boolean) {
    if (!next) {
      setError(null);
      setOrder(null);
      setPending(false);
    }
    onOpenChange(next);
  }

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const created = await onConfirm();
      setOrder(created);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Sandbox checkout</DialogTitle>
          <DialogDescription>
            {shopperName}. Nothing is captured. This cannot charge a real card.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {lines.map((line) => (
            <li key={line.productId} className="flex items-baseline justify-between gap-3 text-sm">
              <span>
                {line.quantity} × {line.name}
              </span>
              <span className="tabular-nums">{money(line.lineCents)}</span>
            </li>
          ))}
        </ul>
        <p className="flex items-baseline justify-between border-t border-border pt-3 font-serif text-lg">
          <span>Total</span>
          <span className="tabular-nums">{money(totalCents)}</span>
        </p>
        <p className="text-sm text-muted-foreground">{paymentNote}</p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {order && (
          <div className="rounded-lg border border-border bg-muted/60 p-3 text-sm">
            <p className="font-medium">Order {order.paypalOrderId}</p>
            <p className="mt-1 text-muted-foreground">
              {order.provider} · status CREATED · charged: no
            </p>
            <p className="mt-2">{order.note}</p>
            {order.approvalUrl && (
              <a
                className="mt-2 inline-block underline underline-offset-4"
                href={order.approvalUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open the sandbox approval page
              </a>
            )}
          </div>
        )}
        <DialogFooter>
          {order ? (
            <Button type="button" onClick={() => close(false)}>
              Done
            </Button>
          ) : (
            <Button type="button" onClick={() => void confirm()} disabled={pending || lines.length === 0}>
              {pending ? "Creating sandbox order…" : "Create sandbox order"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
