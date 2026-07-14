"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Path } from "react-hook-form";
import {
  Banknote,
  Bike,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  Store,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import {
  getCheckoutQuote,
  placeOrder,
  type QuoteResult,
} from "@/actions/checkout";
import {
  checkoutSchema,
  type CheckoutFormValues,
  type CheckoutInput,
} from "@/lib/validations/checkout";
import { cn, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CouponForm } from "@/components/checkout/coupon-form";

export type SavedAddress = {
  id: string;
  label: string | null;
  recipientName: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  isDefault: boolean;
};

type Props = {
  isLoggedIn: boolean;
  defaultContact: { name: string; email: string; phone: string };
  savedAddresses: SavedAddress[];
  appliedCoupon: string | null;
  subtotal: number;
};

type ClientQuote = Extract<QuoteResult, { success: true }>["quote"];

const STEPS = ["Kontakt", "Lieferung", "Prüfen & zahlen"] as const;

const METHODS = [
  {
    value: "DELIVERY" as const,
    icon: Bike,
    title: "Lieferung",
    text: "Wir liefern in Ihre Zone",
  },
  {
    value: "PICKUP" as const,
    icon: Store,
    title: "Abholung",
    text: "Königsallee 42, Düsseldorf",
  },
  {
    value: "DINE_IN" as const,
    icon: UtensilsCrossed,
    title: "Vor Ort",
    text: "Am Tisch bestellen & genießen",
  },
];

const TIP_PRESETS = [0, 5, 10, 15] as const;

/**
 * Multi-step checkout. Every displayed total comes from the server
 * (getCheckoutQuote); placeOrder re-validates everything again inside
 * a transaction, so the client can never dictate prices.
 */
export function CheckoutForm({
  isLoggedIn,
  defaultContact,
  savedAddresses,
  appliedCoupon,
  subtotal,
}: Props) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [quote, setQuote] = React.useState<ClientQuote | null>(null);
  const [quoteError, setQuoteError] = React.useState<string | null>(null);
  const [isQuoting, startQuoting] = React.useTransition();
  const [isPlacing, startPlacing] = React.useTransition();

  const defaultAddress =
    savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];

  const form = useForm<CheckoutFormValues, unknown, CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    mode: "onTouched",
    defaultValues: {
      contact: defaultContact,
      deliveryMethod: "DELIVERY",
      addressId: defaultAddress?.id,
      address: undefined,
      saveAddress: false,
      scheduledFor: undefined,
      customerNotes: "",
      tip: 0,
      paymentProvider: "STRIPE",
      couponCode: appliedCoupon ?? undefined,
    },
  });

  const deliveryMethod = form.watch("deliveryMethod");
  const addressId = form.watch("addressId");
  const tip = form.watch("tip");
  const paymentProvider = form.watch("paymentProvider");
  const usingNewAddress = !addressId;

  const watchedPostal = form.watch("address.postalCode");
  const savedPostal = savedAddresses.find(
    (a) => a.id === addressId,
  )?.postalCode;
  const postalCode =
    deliveryMethod === "DELIVERY"
      ? usingNewAddress
        ? watchedPostal
        : savedPostal
      : undefined;

  // ---- live server quote (step 3 + whenever inputs change) -------------
  const refreshQuote = React.useCallback(() => {
    startQuoting(async () => {
      const result = await getCheckoutQuote({
        deliveryMethod,
        postalCode: postalCode || undefined,
        tip,
      });
      if (result.success) {
        setQuote(result.quote);
        setQuoteError(
          result.quote.errors.length > 0 ? result.quote.errors[0]! : null,
        );
      } else {
        setQuote(null);
        setQuoteError(result.error);
      }
    });
  }, [deliveryMethod, postalCode, tip]);

  React.useEffect(() => {
    refreshQuote();
  }, [refreshQuote]);

  // ---- step gating -------------------------------------------------------
  async function nextStep() {
    let fields: Path<CheckoutFormValues>[] = [];
    if (step === 0) {
      fields = ["contact.name", "contact.email", "contact.phone"];
    } else if (step === 1 && deliveryMethod === "DELIVERY" && usingNewAddress) {
      fields = [
        "address.recipientName",
        "address.street",
        "address.houseNumber",
        "address.postalCode",
        "address.city",
      ];
    }
    const valid = fields.length === 0 || (await form.trigger(fields));
    if (!valid) return;

    if (step === 1 && deliveryMethod === "DELIVERY" && !postalCode) {
      toast.error("Bitte eine Lieferadresse angeben.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  // ---- submit ---------------------------------------------------------------
  function onSubmit(values: CheckoutInput) {
    startPlacing(async () => {
      const payload: CheckoutInput = {
        ...values,
        addressId:
          values.deliveryMethod === "DELIVERY" && !usingNewAddress
            ? values.addressId
            : undefined,
        address:
          values.deliveryMethod === "DELIVERY" && usingNewAddress
            ? values.address
            : undefined,
      };
      const result = await placeOrder(payload);
      if (!result.success) {
        toast.error("Bestellung fehlgeschlagen", {
          description: result.error,
        });
        return;
      }
      if (result.requiresPayment) {
        router.push(`/checkout/payment/${result.orderNumber}`);
      } else {
        router.push(`/checkout/result?order=${result.orderNumber}`);
      }
    });
  }

  const canUseCod = deliveryMethod === "DELIVERY";
  const canUsePayAtPickup = deliveryMethod !== "DELIVERY";

  // Keep payment provider consistent with the delivery method.
  React.useEffect(() => {
    if (paymentProvider === "CASH_ON_DELIVERY" && !canUseCod) {
      form.setValue("paymentProvider", "PAY_AT_PICKUP");
    }
    if (paymentProvider === "PAY_AT_PICKUP" && !canUsePayAtPickup) {
      form.setValue("paymentProvider", "CASH_ON_DELIVERY");
    }
  }, [paymentProvider, canUseCod, canUsePayAtPickup, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        {/* ---------- Stepper ---------- */}
        <ol
          className="mb-8 flex items-center gap-2"
          aria-label="Checkout-Schritte"
        >
          {STEPS.map((label, index) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => index < step && setStep(index)}
                disabled={index > step}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium",
                  index <= step ? "text-foreground" : "text-muted-foreground",
                )}
                aria-current={index === step ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    index < step
                      ? "border-gold bg-gold text-gold-foreground"
                      : index === step
                        ? "border-gold text-gold"
                        : "border-border",
                  )}
                >
                  {index < step ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {index < STEPS.length - 1 ? (
                <span className="h-px flex-1 bg-border" aria-hidden />
              ) : null}
            </li>
          ))}
        </ol>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* ================= Step 1: contact ================= */}
            {step === 0 ? (
              <section className="space-y-4 rounded-lg border bg-card p-6">
                <h2 className="font-display text-xl font-semibold">
                  Ihre Kontaktdaten
                </h2>
                {!isLoggedIn ? (
                  <p className="text-sm text-muted-foreground">
                    Sie bestellen als Gast.{" "}
                    <Link
                      href="/login?callbackUrl=/checkout"
                      className="text-primary underline underline-offset-4 dark:text-gold"
                    >
                      Anmelden
                    </Link>{" "}
                    für gespeicherte Adressen und Treuepunkte.
                  </p>
                ) : null}
                <FormField
                  control={form.control}
                  name="contact.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input autoComplete="name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="contact.email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-Mail</FormLabel>
                        <FormControl>
                          <Input type="email" autoComplete="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact.phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon</FormLabel>
                        <FormControl>
                          <Input type="tel" autoComplete="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>
            ) : null}

            {/* ================= Step 2: delivery ================= */}
            {step === 1 ? (
              <section className="space-y-6 rounded-lg border bg-card p-6">
                <h2 className="font-display text-xl font-semibold">
                  Wie möchten Sie genießen?
                </h2>

                <FormField
                  control={form.control}
                  name="deliveryMethod"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {METHODS.map((method) => (
                          <label
                            key={method.value}
                            className={cn(
                              "flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors",
                              field.value === method.value
                                ? "border-gold bg-gold/10"
                                : "hover:bg-accent",
                            )}
                          >
                            <input
                              type="radio"
                              className="sr-only"
                              name="deliveryMethod"
                              value={method.value}
                              checked={field.value === method.value}
                              onChange={() => field.onChange(method.value)}
                            />
                            <method.icon
                              className="h-6 w-6 text-gold"
                              aria-hidden
                            />
                            <span className="font-medium">{method.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {method.text}
                            </span>
                          </label>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {deliveryMethod === "DELIVERY" ? (
                  <div className="space-y-4">
                    <Separator />
                    <h3 className="font-semibold">Lieferadresse</h3>

                    {savedAddresses.length > 0 ? (
                      <div className="space-y-2">
                        {savedAddresses.map((address) => (
                          <label
                            key={address.id}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors",
                              addressId === address.id
                                ? "border-gold bg-gold/10"
                                : "hover:bg-accent",
                            )}
                          >
                            <input
                              type="radio"
                              name="savedAddress"
                              className="mt-1 accent-current"
                              checked={addressId === address.id}
                              onChange={() =>
                                form.setValue("addressId", address.id)
                              }
                            />
                            <span>
                              <span className="font-medium">
                                {address.label ?? address.recipientName}
                              </span>
                              <br />
                              {address.street} {address.houseNumber},{" "}
                              {address.postalCode} {address.city}
                            </span>
                          </label>
                        ))}
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors",
                            usingNewAddress
                              ? "border-gold bg-gold/10"
                              : "hover:bg-accent",
                          )}
                        >
                          <input
                            type="radio"
                            name="savedAddress"
                            className="accent-current"
                            checked={usingNewAddress}
                            onChange={() =>
                              form.setValue("addressId", undefined)
                            }
                          />
                          Neue Adresse eingeben
                        </label>
                      </div>
                    ) : null}

                    {usingNewAddress ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="address.recipientName"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel>Empfänger</FormLabel>
                              <FormControl>
                                <Input
                                  autoComplete="name"
                                  {...field}
                                  value={field.value ?? ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="address.street"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Straße</FormLabel>
                              <FormControl>
                                <Input
                                  autoComplete="address-line1"
                                  {...field}
                                  value={field.value ?? ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="address.houseNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Hausnummer</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="address.postalCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PLZ</FormLabel>
                              <FormControl>
                                <Input
                                  inputMode="numeric"
                                  autoComplete="postal-code"
                                  maxLength={5}
                                  {...field}
                                  value={field.value ?? ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="address.city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ort</FormLabel>
                              <FormControl>
                                <Input
                                  autoComplete="address-level2"
                                  {...field}
                                  value={field.value ?? ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="address.deliveryNotes"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel>
                                Hinweise für die Lieferung{" "}
                                <span className="font-normal text-muted-foreground">
                                  (optional)
                                </span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="z. B. 3. Etage, bitte klingeln"
                                  {...field}
                                  value={field.value ?? ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {isLoggedIn ? (
                          <FormField
                            control={form.control}
                            name="saveAddress"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center gap-2 space-y-0 sm:col-span-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="cursor-pointer font-normal">
                                  Adresse für künftige Bestellungen speichern
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ) : null}
                      </div>
                    ) : null}

                    {/* Zone feedback from the live quote */}
                    {postalCode && postalCode.length === 5 ? (
                      <p
                        className={cn(
                          "rounded-md p-3 text-sm",
                          quote?.zone
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive",
                        )}
                        role="status"
                      >
                        {isQuoting
                          ? "Liefergebiet wird geprüft …"
                          : quote?.zone
                            ? `${quote.zone.zoneName}: Lieferung ${formatPrice(quote.zone.deliveryFee)} · Mindestbestellwert ${formatPrice(quote.zone.minOrderAmount)} · ca. ${quote.zone.estimatedMinutes} Min.`
                            : `Leider liefern wir noch nicht an ${postalCode}. Wählen Sie Abholung oder eine andere Adresse.`}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <Separator />

                <FormField
                  control={form.control}
                  name="scheduledFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wann?</FormLabel>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm",
                            !field.value
                              ? "border-gold bg-gold/10"
                              : "hover:bg-accent",
                          )}
                        >
                          <input
                            type="radio"
                            name="when"
                            className="accent-current"
                            checked={!field.value}
                            onChange={() => field.onChange(undefined)}
                          />
                          So schnell wie möglich
                        </label>
                        <div
                          className={cn(
                            "flex items-center gap-2 rounded-md border p-3 text-sm",
                            field.value && "border-gold bg-gold/10",
                          )}
                        >
                          <input
                            type="radio"
                            name="when"
                            className="accent-current"
                            checked={!!field.value}
                            onChange={() => {
                              const d = new Date(Date.now() + 90 * 60_000);
                              d.setSeconds(0, 0);
                              field.onChange(d.toISOString());
                            }}
                            aria-label="Vorbestellen"
                          />
                          <input
                            type="datetime-local"
                            className="flex-1 bg-transparent focus:outline-none"
                            value={
                              field.value
                                ? new Date(
                                    new Date(field.value).getTime() -
                                      new Date().getTimezoneOffset() * 60_000,
                                  )
                                    .toISOString()
                                    .slice(0, 16)
                                : ""
                            }
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? new Date(e.target.value).toISOString()
                                  : undefined,
                              )
                            }
                            aria-label="Wunschzeit"
                          />
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Anmerkungen zur Bestellung{" "}
                        <span className="font-normal text-muted-foreground">
                          (optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="z. B. Besteck beilegen"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>
            ) : null}

            {/* ================= Step 3: review + payment ================= */}
            {step === 2 ? (
              <section className="space-y-6 rounded-lg border bg-card p-6">
                <h2 className="font-display text-xl font-semibold">
                  Trinkgeld & Zahlung
                </h2>

                {/* Tip */}
                <FormField
                  control={form.control}
                  name="tip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trinkgeld für das Team</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {TIP_PRESETS.map((percent) => {
                          const cents = Math.round((subtotal * percent) / 100);
                          const active = field.value === cents;
                          return (
                            <Button
                              key={percent}
                              type="button"
                              size="sm"
                              variant={active ? "gold" : "outline"}
                              onClick={() => field.onChange(cents)}
                            >
                              {percent === 0
                                ? "Kein Trinkgeld"
                                : `${percent} % (${formatPrice(cents)})`}
                            </Button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Payment method */}
                <FormField
                  control={form.control}
                  name="paymentProvider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zahlungsart</FormLabel>
                      <div className="space-y-2">
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm",
                            field.value === "STRIPE"
                              ? "border-gold bg-gold/10"
                              : "hover:bg-accent",
                          )}
                        >
                          <input
                            type="radio"
                            name="payment"
                            className="accent-current"
                            checked={field.value === "STRIPE"}
                            onChange={() => field.onChange("STRIPE")}
                          />
                          <CreditCard
                            className="h-4 w-4 text-gold"
                            aria-hidden
                          />
                          <span>
                            <span className="font-medium">Online bezahlen</span>
                            <br />
                            <span className="text-muted-foreground">
                              Karte, Apple Pay, Google Pay — sicher über Stripe
                            </span>
                          </span>
                        </label>
                        {canUseCod ? (
                          <label
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm",
                              field.value === "CASH_ON_DELIVERY"
                                ? "border-gold bg-gold/10"
                                : "hover:bg-accent",
                            )}
                          >
                            <input
                              type="radio"
                              name="payment"
                              className="accent-current"
                              checked={field.value === "CASH_ON_DELIVERY"}
                              onChange={() =>
                                field.onChange("CASH_ON_DELIVERY")
                              }
                            />
                            <Banknote
                              className="h-4 w-4 text-gold"
                              aria-hidden
                            />
                            <span className="font-medium">
                              Bar bei Lieferung
                            </span>
                          </label>
                        ) : (
                          <label
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm",
                              field.value === "PAY_AT_PICKUP"
                                ? "border-gold bg-gold/10"
                                : "hover:bg-accent",
                            )}
                          >
                            <input
                              type="radio"
                              name="payment"
                              className="accent-current"
                              checked={field.value === "PAY_AT_PICKUP"}
                              onChange={() => field.onChange("PAY_AT_PICKUP")}
                            />
                            <Wallet className="h-4 w-4 text-gold" aria-hidden />
                            <span className="font-medium">
                              {deliveryMethod === "PICKUP"
                                ? "Bezahlung bei Abholung"
                                : "Bezahlung vor Ort"}
                            </span>
                          </label>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>
            ) : null}

            {/* ---------- Navigation ---------- */}
            <div className="flex items-center justify-between">
              {step > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((s) => s - 1)}
                >
                  <ChevronLeft /> Zurück
                </Button>
              ) : (
                <span />
              )}
              {step < STEPS.length - 1 ? (
                <Button type="button" variant="gold" onClick={nextStep}>
                  Weiter <ChevronRight />
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="gold"
                  size="lg"
                  loading={isPlacing}
                  disabled={!quote || !quote.ok || isQuoting}
                >
                  {paymentProvider === "STRIPE"
                    ? `Jetzt bezahlen — ${quote ? formatPrice(quote.total) : "…"}`
                    : `Zahlungspflichtig bestellen — ${quote ? formatPrice(quote.total) : "…"}`}
                </Button>
              )}
            </div>
          </div>

          {/* ---------- Summary sidebar ---------- */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-4 rounded-lg border bg-card p-6">
              <h2 className="font-display text-lg font-semibold">
                Zusammenfassung
              </h2>
              <CouponForm appliedCode={quote?.couponCode ?? appliedCoupon} />
              <Separator />
              {quote ? (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      Zwischensumme ({quote.itemCount} Artikel)
                    </dt>
                    <dd>{formatPrice(quote.subtotal)}</dd>
                  </div>
                  {quote.discount > 0 ? (
                    <div className="flex justify-between text-success">
                      <dt>Rabatt ({quote.couponCode})</dt>
                      <dd>−{formatPrice(quote.discount)}</dd>
                    </div>
                  ) : null}
                  {deliveryMethod === "DELIVERY" ? (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Lieferung</dt>
                      <dd>
                        {quote.deliveryFee === 0 && quote.zone
                          ? "Gratis"
                          : quote.zone
                            ? formatPrice(quote.deliveryFee)
                            : "—"}
                      </dd>
                    </div>
                  ) : null}
                  {quote.serviceFee > 0 ? (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Servicegebühr</dt>
                      <dd>{formatPrice(quote.serviceFee)}</dd>
                    </div>
                  ) : null}
                  {quote.tip > 0 ? (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Trinkgeld</dt>
                      <dd>{formatPrice(quote.tip)}</dd>
                    </div>
                  ) : null}
                  <Separator />
                  <div className="flex justify-between text-base font-semibold">
                    <dt>Gesamt</dt>
                    <dd>
                      {isQuoting ? (
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-label="Wird berechnet"
                        />
                      ) : (
                        formatPrice(quote.total)
                      )}
                    </dd>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    inkl. {formatPrice(quote.taxTotal)} MwSt.
                  </p>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Summen werden berechnet …
                </p>
              )}
              {quoteError ? (
                <p
                  className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                  role="alert"
                >
                  {quoteError}
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      </form>
    </Form>
  );
}
