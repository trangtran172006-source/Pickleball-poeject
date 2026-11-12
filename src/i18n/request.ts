import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, LOCALE_COOKIE, TIME_ZONE } from "./config";

export default getRequestConfig(async () => {
  const store = await cookies();
  const saved = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved) ? saved : defaultLocale;
  const messages = (await import(`./messages/${locale}/index.ts`)).default;

  return { locale, messages, timeZone: TIME_ZONE };
});
