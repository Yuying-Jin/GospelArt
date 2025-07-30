
'use client';
import { useRouter, usePathname } from 'next/navigation';
export default function LanguageSwitcher() {
    const router = useRouter();
    const pathname = usePathname();

    const changeLocale = (locale: string) => {
        const segments = pathname.split('/');
        segments[1] = locale;
        const newPath = segments.join('/');
        router.push(newPath);
    };

    return (
        <>
            <select
                className="language-switcher"
                onChange={(e) => changeLocale(e.target.value)} defaultValue={pathname.split('/')[1]}>
                <option value="zh-CN">简体中文</option>
                <option value="zh-TW">繁體中文</option>
                <option value="en">English</option>
            </select>
            <style jsx>
                {`
                    .language-switcher {
                        position: absolute;
                        top: 20px;
                        right: 20px;
                        z-index: 99;
                    }
                `}
            </style>
        </>
    );
}