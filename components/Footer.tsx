'use client';

import Link from 'next/link';
import {useLocale, useTranslations} from 'next-intl';

export default function Footer() {
    const t = useTranslations('nav' as any);
    const locale = useLocale();

    return(
        <footer>
            <div className="footer-content">
                <div className="footer-section nav-links">
                    <h3>导航</h3>
                    <a href="#">主页</a>
                    <a href="gallery.html">画廊</a>
                    <a href="#">关于</a>
                </div>

                <div className="footer-section privacy">
                    <h3>政策</h3>
                    <a href="#">隐私政策</a>
                    <a href="#">使用条款</a>
                </div>

                <div className="footer-section subscribe">
                    <h3>订阅更新</h3>
                    <form>
                        <input type="email" placeholder="输入您的邮箱" required />
                        <button type="submit">订阅</button>
                    </form>
                </div>
            </div>
            <div className="footer-bottom">
                <p>&copy; 2025 福音书画展示. 版权所有.</p>
            </div>
        </footer>
    )
};
