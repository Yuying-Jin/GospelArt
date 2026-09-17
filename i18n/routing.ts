import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
    locales: ['en', 'zh-CN', 'zh-TW'],

    defaultLocale: 'zh-CN'
});