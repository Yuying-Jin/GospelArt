import { Locale } from '@/i18n-config';

export const getMessage = async (locale: Locale) =>
    (await import(`../messages/${locale}.json`)).default;
