import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
    locales: ['en', 'zh-CN', 'zh-TW'],

    // Only reached when the browser asks for no Chinese at all — zh-TW and
    // zh-CN each negotiate to themselves, and a stored choice beats both.
    defaultLocale: 'en'
});