import type { TranslationKey } from "@/lib/i18n";

const SYSTEM_MESSAGE_KEYS: Record<string, TranslationKey> = {
  "Video call requested by customer.": "call.timeline.customerRequest",
  "Video call started by team.": "call.timeline.staffRequest",
  "Video call accepted.": "call.timeline.accepted",
  "Video call declined.": "call.timeline.declined",
  "Video call ended.": "call.timeline.ended",
};

export function translateSystemMessage(
  body: string | null,
  t: (key: TranslationKey) => string,
) {
  if (!body) return body;
  const key = SYSTEM_MESSAGE_KEYS[body];
  return key ? t(key) : body;
}
