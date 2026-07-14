"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, MoreVertical, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteProduct,
  duplicateProduct,
  toggleProductAvailability,
} from "@/actions/admin/products";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Per-row actions in the admin product list. */
export function ProductRowActions({
  productId,
  isAvailable,
}: {
  productId: string;
  isAvailable: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function run(
    action: () => Promise<{
      success: boolean;
      error?: string;
      message?: string;
      id?: string;
    }>,
    navigateToId = false,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error ?? "Fehlgeschlagen");
        return;
      }
      toast.success(result.message);
      if (navigateToId && result.id) {
        router.push(`/admin/menu/${result.id}`);
      }
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Aktionen"
          disabled={isPending}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/admin/menu/${productId}`}>Bearbeiten</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => run(() => toggleProductAvailability(productId))}
        >
          <Power /> {isAvailable ? "Pausieren (86)" : "Aktivieren"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => run(() => duplicateProduct(productId), true)}
        >
          <Copy /> Duplizieren
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => {
            if (
              window.confirm(
                "Dieses Gericht wirklich löschen? Bestellungen bleiben erhalten.",
              )
            ) {
              run(() => deleteProduct(productId));
            }
          }}
        >
          <Trash2 /> Löschen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
