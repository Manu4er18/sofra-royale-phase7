"use server";

import { revalidatePath } from "next/cache";
import { compare, hash } from "bcryptjs";

import { db } from "@/lib/db";
import { auth, signOut } from "@/lib/auth";
import {
  addressSchema,
  changePasswordSchema,
  deleteAccountSchema,
  notificationPreferencesSchema,
  profileSchema,
} from "@/lib/validations/account";
import { getErrorMessage } from "@/lib/utils";

export type AccountActionResult =
  | { success: true; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function updateProfile(
  rawInput: unknown,
): Promise<AccountActionResult> {
  try {
    const user = await requireUser();
    if (!user) return { success: false, error: "Bitte melden Sie sich an." };

    const parsed = profileSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: "Bitte überprüfen Sie Ihre Eingaben.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }
    const { name, phone, marketingOptIn } = parsed.data;

    if (phone) {
      const phoneTaken = await db.user.findFirst({
        where: { phone, id: { not: user.id } },
        select: { id: true },
      });
      if (phoneTaken) {
        return {
          success: false,
          error: "Diese Telefonnummer wird bereits verwendet.",
        };
      }
    }

    await db.user.update({
      where: { id: user.id },
      data: { name, phone: phone || null, marketingOptIn },
    });

    revalidatePath("/account", "layout");
    return { success: true, message: "Profil aktualisiert." };
  } catch (error) {
    console.error("[updateProfile]", getErrorMessage(error));
    return { success: false, error: "Profil konnte nicht gespeichert werden." };
  }
}

// ---------------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------------

export async function changePassword(
  rawInput: unknown,
): Promise<AccountActionResult> {
  try {
    const user = await requireUser();
    if (!user) return { success: false, error: "Bitte melden Sie sich an." };

    const parsed = changePasswordSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: "Bitte überprüfen Sie Ihre Eingaben.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    if (!dbUser?.hashedPassword) {
      return {
        success: false,
        error:
          "Dieses Konto nutzt Google-Login und hat kein Passwort. Nutzen Sie „Passwort vergessen“, um eines zu setzen (Phase 6).",
      };
    }

    const valid = await compare(
      parsed.data.currentPassword,
      dbUser.hashedPassword,
    );
    if (!valid) {
      return { success: false, error: "Das aktuelle Passwort ist falsch." };
    }

    await db.user.update({
      where: { id: user.id },
      data: { hashedPassword: await hash(parsed.data.newPassword, 12) },
    });
    await db.activityLog.create({
      data: { userId: user.id, action: "user.password_changed" },
    });

    return { success: true, message: "Passwort geändert." };
  } catch (error) {
    console.error("[changePassword]", getErrorMessage(error));
    return { success: false, error: "Passwort konnte nicht geändert werden." };
  }
}

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

const MAX_ADDRESSES = 8;

export async function saveAddress(
  rawInput: unknown,
): Promise<AccountActionResult> {
  try {
    const user = await requireUser();
    if (!user) return { success: false, error: "Bitte melden Sie sich an." };

    const parsed = addressSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: "Bitte überprüfen Sie Ihre Eingaben.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }
    const { id, isDefault, label, addressLine2, deliveryNotes, ...fields } =
      parsed.data;

    const data = {
      ...fields,
      label: label || null,
      addressLine2: addressLine2 || null,
      deliveryNotes: deliveryNotes || null,
      isDefault: isDefault ?? false,
    };

    await db.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.address.updateMany({
          where: { userId: user.id },
          data: { isDefault: false },
        });
      }
      if (id) {
        const existing = await tx.address.findFirst({
          where: { id, userId: user.id },
        });
        if (!existing) throw new Error("Adresse nicht gefunden.");
        await tx.address.update({ where: { id }, data });
      } else {
        const count = await tx.address.count({ where: { userId: user.id } });
        if (count >= MAX_ADDRESSES) {
          throw new Error(`Maximal ${MAX_ADDRESSES} Adressen möglich.`);
        }
        await tx.address.create({
          data: {
            ...data,
            userId: user.id,
            isDefault: data.isDefault || count === 0,
          },
        });
      }
    });

    revalidatePath("/account/addresses");
    return { success: true, message: "Adresse gespeichert." };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteAddress(
  addressId: string,
): Promise<AccountActionResult> {
  try {
    const user = await requireUser();
    if (!user) return { success: false, error: "Bitte melden Sie sich an." };

    const address = await db.address.findFirst({
      where: { id: addressId, userId: user.id },
    });
    if (!address) return { success: false, error: "Adresse nicht gefunden." };

    await db.address.delete({ where: { id: addressId } });
    revalidatePath("/account/addresses");
    return { success: true, message: "Adresse gelöscht." };
  } catch (error) {
    console.error("[deleteAddress]", getErrorMessage(error));
    return { success: false, error: "Adresse konnte nicht gelöscht werden." };
  }
}

// ---------------------------------------------------------------------------
// Notification preferences
// ---------------------------------------------------------------------------

export async function saveNotificationPreferences(
  rawInput: unknown,
): Promise<AccountActionResult> {
  try {
    const user = await requireUser();
    if (!user) return { success: false, error: "Bitte melden Sie sich an." };

    const parsed = notificationPreferencesSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: "Ungültige Einstellungen." };
    }

    await db.userProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, notificationPreferences: parsed.data },
      update: { notificationPreferences: parsed.data },
    });

    revalidatePath("/account/notifications");
    return { success: true, message: "Einstellungen gespeichert." };
  } catch (error) {
    console.error("[saveNotificationPreferences]", getErrorMessage(error));
    return { success: false, error: "Speichern fehlgeschlagen." };
  }
}

// ---------------------------------------------------------------------------
// Account deletion (anonymization — orders remain for bookkeeping)
// ---------------------------------------------------------------------------

export async function deleteAccount(
  rawInput: unknown,
): Promise<AccountActionResult> {
  try {
    const user = await requireUser();
    if (!user) return { success: false, error: "Bitte melden Sie sich an." };

    const parsed = deleteAccountSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: "Bestätigung erforderlich." };
    }

    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return { success: false, error: "Konto nicht gefunden." };

    if (dbUser.hashedPassword) {
      const valid = await compare(
        parsed.data.confirmation,
        dbUser.hashedPassword,
      );
      if (!valid) {
        return { success: false, error: "Das Passwort ist falsch." };
      }
    } else if (parsed.data.confirmation !== "LÖSCHEN") {
      return {
        success: false,
        error: "Bitte geben Sie LÖSCHEN ein, um zu bestätigen.",
      };
    }

    // Anonymize instead of hard delete: orders/invoices must survive
    // (steuerliche Aufbewahrungspflicht), personal data is removed.
    await db.$transaction([
      db.session.deleteMany({ where: { userId: user.id } }),
      db.account.deleteMany({ where: { userId: user.id } }),
      db.address.deleteMany({ where: { userId: user.id } }),
      db.favorite.deleteMany({ where: { userId: user.id } }),
      db.notification.deleteMany({ where: { userId: user.id } }),
      db.user.update({
        where: { id: user.id },
        data: {
          name: "Gelöschtes Konto",
          email: `deleted-${user.id}@deleted.invalid`,
          phone: null,
          image: null,
          hashedPassword: null,
          isActive: false,
          deletedAt: new Date(),
          marketingOptIn: false,
        },
      }),
      db.activityLog.create({
        data: { userId: user.id, action: "user.account_deleted" },
      }),
    ]);

    await signOut({ redirect: false });
    return { success: true, message: "Ihr Konto wurde gelöscht." };
  } catch (error) {
    console.error("[deleteAccount]", getErrorMessage(error));
    return { success: false, error: "Konto konnte nicht gelöscht werden." };
  }
}
