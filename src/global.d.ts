import type messages from "@/i18n/messages/vi";
import type { AppLocale } from "@/i18n/config";

declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof messages;
  }
}
