export function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function percent(delta: number): string {
  const value = Math.round(delta * 100);
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}%`;
}

export function centsToPaypal(cents: number): string {
  return (cents / 100).toFixed(2);
}
