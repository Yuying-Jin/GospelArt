`use client`

import {useTranslations} from 'next-intl';

type Props = {
    scripture_chinese: string,
    scripture_english: string,
    image_path: string,
    date: string,
    bible_reference: string
};

export default function Card({ scripture_chinese, scripture_english, image_path, date, bible_reference }: Props) {

    const t = useTranslations('public.gallery.card' as any);

    return (
        <div className="gallery-card" onClick="preview(this)">
            <div className="card-top">
                <div className="card-inner-glow"></div>
                <div className="cross-ornament"></div>
            </div>
            <div className="artwork-container">
                <img src={image_path} alt={bible_reference}/>
                    <div className="scripture chinese">
                        {scripture_chinese}
                    </div>
                    <div className="scripture english">
                        {scripture_english}(ESV)
                    </div>
            </div>
            <div className="card-info">
                <span className="creation-date">
                    <span>{t(`date`)}</span><span>{date}</span>
                </span>
                <span className="bible-reference">
                    <span>{t(`bible_reference`)}</span><span>{bible_reference}</span>
                </span>
            </div>

            <style jsx>{`
              /* 教堂卡片整体风格 */
              .gallery-card {
                position: relative;
                width: 100%;
                margin: 0 auto;
                color: #fff;
                font-family: 'Times New Roman', serif;
                transition: all 0.5s ease;
                cursor: pointer;
                filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
              }

              /* ===== 真正的拱形顶部 ===== */
              .card-top {
                position: relative;
                height: 5px;
                background: transparent;
                overflow-x: clip;
              }

              .card-top::before {
                content: "";
                position: absolute;
                left: 0;
                width: 100%;
                border-radius: 50%;
                border: 5px solid rgba(60, 60, 80, 0.8);
              }

              /* 卡片内部光晕 */
              .card-inner-glow {
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 140px;
                height: 70px;
                background: radial-gradient(
                        ellipse at 50% 30%,
                        rgba(255, 215, 0, 0.2) 0%,
                        rgba(255, 215, 0, 0.1) 40%,
                        transparent 70%
                );
                filter: blur(5px);
                z-index: 1;
              }

              /* 卡片顶部装饰 */
              .cross-ornament {
                position: absolute;
                top: 0px;
                left: 50%;
                transform: translateX(-50%);
                width: 60px;
                height: 30px;
                z-index: 2;
              }

              /* 十字形装饰 */
              .cross-ornament::before {
                content: "";
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 2px;
                height: 20px;
                background: rgba(255, 215, 0, 0.8);
                box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
              }

              .cross-ornament::after {
                content: "";
                position: absolute;
                top: 7px;
                left: 50%;
                transform: translateX(-50%);
                width: 14px;
                height: 2px;
                background: rgba(255, 215, 0, 0.8);
                box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
              }

              /* 主体画作容器 */
              .artwork-container {
                position: relative;
                background: rgba(20, 20, 30, 0.9);
                padding: 15px 15px;
                border-top: 1px solid rgba(255, 215, 0, 0.3);
                border-left: 5px solid rgba(60, 60, 75, 0.8);
                border-right: 5px solid rgba(60, 60, 75, 0.8);
                box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
                overflow: hidden;
              }

              /* 教堂窗户的侧边支柱效果 */
              .artwork-container::before,
              .artwork-container::after {
                content: "";
                position: absolute;
                top: 0;
                width: 5px;
                height: 100%;
                background: linear-gradient(
                        to bottom,
                        rgba(60, 60, 80, 0.8),
                        rgba(40, 40, 60, 0.8)
                );
              }

              .artwork-container::before {
                left: 0;
              }

              .artwork-container::after {
                right: 0;
              }

              /* 画作样式 */
              .gallery-card img {
                display: block;
                width: 100%;
                height: auto;
                border: 1px solid rgba(255, 215, 0, 0.2);
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
                transition: transform 0.5s ease;
              }

              /* 经文样式 */
              .gallery-card .scripture {
                padding: 8px 10px;
                text-align: center;
                letter-spacing: 1px;
                text-shadow: 0 0 10px rgba(0, 0, 0, 0.7);
                background: rgba(0, 0, 0, 0.4);
                margin: 2px 0;
                transform: translateY(0);
                transition: transform 0.5s ease, background 0.5s ease;
              }

              /* 中文经文 */
              .gallery-card .scripture.chinese {
                font-size: 1rem;
                color: var(--color-gold-soft);
                background: linear-gradient(to right,
                rgba(0, 0, 0, 0.6),
                var(--color-bg-primary),
                rgba(0, 0, 0, 0.6)
                );
              }

              /* 英文经文 */
              .gallery-card .scripture.english {
                font-size: 0.86rem;
                font-family: "EB Garamond", "Georgia", serif;
                font-style: italic;
                line-height: 1.4;
                color: rgba(255, 255, 255, 0.9);
              }

              /* 底部信息 */
              .gallery-card .card-info {
                display: flex;
                justify-content: space-between;
                padding: 5px 10px;
                background: rgba(20, 20, 30, 0.9);
                border-top: 1px solid rgba(255, 215, 0, 0.3);
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.7);
              }

              /* 悬停效果 */
              .gallery-card:hover {
                transform: translateY(-4px);
              }

              .gallery-card:hover img {
                transform: scale(1.01);
              }

              /* 光照效果 */
              .gallery-card::after {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(
                        135deg,
                        rgba(255, 255, 255, 0) 0%,
                        rgba(255, 255, 255, 0.05) 50%,
                        rgba(255, 255, 255, 0) 100%
                );
                z-index: 1;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.5s ease;
              }

              .gallery-card:hover::after {
                opacity: 1;
              }
              
              @media (max-width: 768px) {
                .gallery-card .card-info>* {
                  display: flex;
                  flex-direction: column;
                  font-size: 0.95rem;
                }
              }
            `}</style>
        </div>
    );
}
