"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { saveProductConfig } from "@/actions/admin/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Variation = { name: string; price: string; isDefault: boolean };
type Option = { name: string; priceDelta: string; isDefault: boolean };
type Group = {
  name: string;
  minSelect: string;
  maxSelect: string;
  isRequired: boolean;
  options: Option[];
};
type Addon = { name: string; price: string; maxQuantity: string };

export type ProductConfigValues = {
  variations: Variation[];
  optionGroups: Group[];
  addons: Addon[];
};

/**
 * Editor for variations, option groups and add-ons. Saves the whole
 * configuration atomically (server replaces + re-validates).
 */
export function ProductConfigEditor({
  productId,
  initial,
}: {
  productId: string;
  initial: ProductConfigValues;
}) {
  const router = useRouter();
  const [config, setConfig] = React.useState(initial);
  const [isPending, startTransition] = React.useTransition();

  function save() {
    startTransition(async () => {
      const result = await saveProductConfig({
        productId,
        variations: config.variations.map((v) => ({
          name: v.name,
          price: v.price,
          isDefault: v.isDefault,
        })),
        optionGroups: config.optionGroups.map((g) => ({
          name: g.name,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          isRequired: g.isRequired,
          options: g.options.map((o) => ({
            name: o.name,
            priceDelta: o.priceDelta,
            isDefault: o.isDefault,
          })),
        })),
        addons: config.addons.map((a) => ({
          name: a.name,
          price: a.price,
          maxQuantity: a.maxQuantity,
        })),
      });
      if (!result.success) toast.error(result.error);
      else {
        toast.success(result.message);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Portionen, Optionen & Extras
        </CardTitle>
        <CardDescription>
          Wird als Gesamtkonfiguration gespeichert — Warenkorb-Preise berechnen
          sich serverseitig daraus.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ---------- Variations ---------- */}
        <section className="space-y-2">
          <p className="text-sm font-semibold">
            Portionen/Größen{" "}
            <span className="font-normal text-muted-foreground">
              (Preis ersetzt den Grundpreis)
            </span>
          </p>
          {config.variations.map((variation, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <Input
                aria-label="Name der Portion"
                placeholder="z. B. Große Portion"
                className="h-9 w-56"
                value={variation.name}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    variations: c.variations.map((v, j) =>
                      j === i ? { ...v, name: e.target.value } : v,
                    ),
                  }))
                }
              />
              <Input
                aria-label="Preis in Euro"
                placeholder="€"
                inputMode="decimal"
                className="h-9 w-24"
                value={variation.price}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    variations: c.variations.map((v, j) =>
                      j === i ? { ...v, price: e.target.value } : v,
                    ),
                  }))
                }
              />
              <label className="flex items-center gap-1.5 text-xs">
                <Checkbox
                  checked={variation.isDefault}
                  onCheckedChange={(checked) =>
                    setConfig((c) => ({
                      ...c,
                      variations: c.variations.map((v, j) => ({
                        ...v,
                        isDefault: j === i ? checked === true : false,
                      })),
                    }))
                  }
                />
                Standard
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                aria-label="Portion entfernen"
                onClick={() =>
                  setConfig((c) => ({
                    ...c,
                    variations: c.variations.filter((_, j) => j !== i),
                  }))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setConfig((c) => ({
                ...c,
                variations: [
                  ...c.variations,
                  { name: "", price: "", isDefault: c.variations.length === 0 },
                ],
              }))
            }
          >
            <Plus /> Portion
          </Button>
        </section>

        <Separator />

        {/* ---------- Option groups ---------- */}
        <section className="space-y-3">
          <p className="text-sm font-semibold">
            Optionsgruppen{" "}
            <span className="font-normal text-muted-foreground">
              (z. B. Schärfegrad, Beilage — Aufpreis in €)
            </span>
          </p>
          {config.optionGroups.map((group, gi) => (
            <div key={gi} className="space-y-2 rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  aria-label="Gruppenname"
                  placeholder="Gruppenname"
                  className="h-9 w-52"
                  value={group.name}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      optionGroups: c.optionGroups.map((g, j) =>
                        j === gi ? { ...g, name: e.target.value } : g,
                      ),
                    }))
                  }
                />
                <label className="flex items-center gap-1 text-xs">
                  Min.
                  <Input
                    aria-label="Minimale Auswahl"
                    inputMode="numeric"
                    className="h-8 w-14"
                    value={group.minSelect}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        optionGroups: c.optionGroups.map((g, j) =>
                          j === gi ? { ...g, minSelect: e.target.value } : g,
                        ),
                      }))
                    }
                  />
                </label>
                <label className="flex items-center gap-1 text-xs">
                  Max.
                  <Input
                    aria-label="Maximale Auswahl"
                    inputMode="numeric"
                    className="h-8 w-14"
                    value={group.maxSelect}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        optionGroups: c.optionGroups.map((g, j) =>
                          j === gi ? { ...g, maxSelect: e.target.value } : g,
                        ),
                      }))
                    }
                  />
                </label>
                <label className="flex items-center gap-1.5 text-xs">
                  <Checkbox
                    checked={group.isRequired}
                    onCheckedChange={(checked) =>
                      setConfig((c) => ({
                        ...c,
                        optionGroups: c.optionGroups.map((g, j) =>
                          j === gi ? { ...g, isRequired: checked === true } : g,
                        ),
                      }))
                    }
                  />
                  Pflicht
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-8 w-8 text-destructive"
                  aria-label="Gruppe entfernen"
                  onClick={() =>
                    setConfig((c) => ({
                      ...c,
                      optionGroups: c.optionGroups.filter((_, j) => j !== gi),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {group.options.map((option, oi) => (
                <div
                  key={oi}
                  className="ml-4 flex flex-wrap items-center gap-2"
                >
                  <Input
                    aria-label="Optionsname"
                    placeholder="Option"
                    className="h-8 w-48"
                    value={option.name}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        optionGroups: c.optionGroups.map((g, j) =>
                          j === gi
                            ? {
                                ...g,
                                options: g.options.map((o, k) =>
                                  k === oi ? { ...o, name: e.target.value } : o,
                                ),
                              }
                            : g,
                        ),
                      }))
                    }
                  />
                  <Input
                    aria-label="Aufpreis in Euro"
                    placeholder="± €"
                    inputMode="decimal"
                    className="h-8 w-20"
                    value={option.priceDelta}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        optionGroups: c.optionGroups.map((g, j) =>
                          j === gi
                            ? {
                                ...g,
                                options: g.options.map((o, k) =>
                                  k === oi
                                    ? { ...o, priceDelta: e.target.value }
                                    : o,
                                ),
                              }
                            : g,
                        ),
                      }))
                    }
                  />
                  <label className="flex items-center gap-1.5 text-xs">
                    <Checkbox
                      checked={option.isDefault}
                      onCheckedChange={(checked) =>
                        setConfig((c) => ({
                          ...c,
                          optionGroups: c.optionGroups.map((g, j) =>
                            j === gi
                              ? {
                                  ...g,
                                  options: g.options.map((o, k) =>
                                    k === oi
                                      ? { ...o, isDefault: checked === true }
                                      : o,
                                  ),
                                }
                              : g,
                          ),
                        }))
                      }
                    />
                    Vorausgewählt
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    aria-label="Option entfernen"
                    onClick={() =>
                      setConfig((c) => ({
                        ...c,
                        optionGroups: c.optionGroups.map((g, j) =>
                          j === gi
                            ? {
                                ...g,
                                options: g.options.filter((_, k) => k !== oi),
                              }
                            : g,
                        ),
                      }))
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-4"
                onClick={() =>
                  setConfig((c) => ({
                    ...c,
                    optionGroups: c.optionGroups.map((g, j) =>
                      j === gi
                        ? {
                            ...g,
                            options: [
                              ...g.options,
                              { name: "", priceDelta: "0", isDefault: false },
                            ],
                          }
                        : g,
                    ),
                  }))
                }
              >
                <Plus /> Option
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setConfig((c) => ({
                ...c,
                optionGroups: [
                  ...c.optionGroups,
                  {
                    name: "",
                    minSelect: "0",
                    maxSelect: "1",
                    isRequired: false,
                    options: [{ name: "", priceDelta: "0", isDefault: false }],
                  },
                ],
              }))
            }
          >
            <Plus /> Optionsgruppe
          </Button>
        </section>

        <Separator />

        {/* ---------- Add-ons ---------- */}
        <section className="space-y-2">
          <p className="text-sm font-semibold">
            Extras{" "}
            <span className="font-normal text-muted-foreground">
              (mehrfach wählbar, Preis pro Stück)
            </span>
          </p>
          {config.addons.map((addon, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <Input
                aria-label="Extra-Name"
                placeholder="z. B. Extra Käse"
                className="h-9 w-56"
                value={addon.name}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    addons: c.addons.map((a, j) =>
                      j === i ? { ...a, name: e.target.value } : a,
                    ),
                  }))
                }
              />
              <Input
                aria-label="Preis in Euro"
                placeholder="€"
                inputMode="decimal"
                className="h-9 w-24"
                value={addon.price}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    addons: c.addons.map((a, j) =>
                      j === i ? { ...a, price: e.target.value } : a,
                    ),
                  }))
                }
              />
              <label className="flex items-center gap-1 text-xs">
                max.
                <Input
                  aria-label="Maximale Menge"
                  inputMode="numeric"
                  className="h-8 w-14"
                  value={addon.maxQuantity}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      addons: c.addons.map((a, j) =>
                        j === i ? { ...a, maxQuantity: e.target.value } : a,
                      ),
                    }))
                  }
                />
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                aria-label="Extra entfernen"
                onClick={() =>
                  setConfig((c) => ({
                    ...c,
                    addons: c.addons.filter((_, j) => j !== i),
                  }))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setConfig((c) => ({
                ...c,
                addons: [
                  ...c.addons,
                  { name: "", price: "", maxQuantity: "3" },
                ],
              }))
            }
          >
            <Plus /> Extra
          </Button>
        </section>

        <Button type="button" variant="gold" loading={isPending} onClick={save}>
          Konfiguration speichern
        </Button>
      </CardContent>
    </Card>
  );
}
