import { formatPrice } from "@/lib/utils";

/**
 * Lightweight SSR bar chart for daily revenue (no client JS).
 * Uses the brand gold for bars; accessible via a summarizing caption.
 */
export function RevenueBars({
  data,
}: {
  data: Array<{ date: string; total: number }>;
}) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const totalSum = data.reduce((s, d) => s + d.total, 0);

  return (
    <figure className="space-y-3">
      <div
        className="flex h-48 items-end gap-0.5"
        role="img"
        aria-label={`Tagesumsatz der letzten ${data.length} Tage, Gesamt ${formatPrice(totalSum)}`}
      >
        {data.map((d) => (
          <div
            key={d.date}
            className="group relative flex-1"
            style={{ height: "100%" }}
          >
            <div
              className="absolute bottom-0 w-full rounded-t bg-gold/80 transition-colors group-hover:bg-gold"
              style={{ height: `${(d.total / max) * 100}%` }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-popover px-1.5 py-0.5 text-xs shadow group-hover:block">
              {new Date(d.date).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
              })}
              : {formatPrice(d.total)}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="text-xs text-muted-foreground">
        Balken = Tagesumsatz. Zeitraum-Gesamt: {formatPrice(totalSum)}
      </figcaption>
    </figure>
  );
}

/** Horizontal breakdown bars for category/cuisine/payment splits. */
export function BreakdownBars({
  data,
  emptyLabel = "Keine Daten im Zeitraum.",
}: {
  data: Array<{ name: string; revenue: number }>;
  emptyLabel?: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.revenue));
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.name} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{d.name}</span>
            <span className="font-medium">{formatPrice(d.revenue)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gold"
              style={{ width: `${(d.revenue / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
