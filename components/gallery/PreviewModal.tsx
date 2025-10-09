`use client`

import {hasLocale, useTranslations} from 'next-intl';

type Props = {
    artwork: {
        scripture_chinese: string;
        scripture_english: string;
        image_path: string;
        date: string;
        bible_reference: string;
    };
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
};

export default function PreviewModal({ artwork, onClose, onPrev, onNext }: Props) {

    const t = useTranslations('public.gallery.card');

    return (
        <div className="preview-modal" id="previewModal" onClick={onClose}>
            <div className="preview-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-preview" onClick={onClose}>×</button>
                <button className="paging prev" onClick={onPrev}>‹</button>
                <img src={artwork.image_path || undefined} alt={artwork.bible_reference} className="preview-image" id="previewImage"/>
                <button className="paging next" onClick={onNext}>›</button>
                    <div className="preview-info">
                        <p className="preview-verse" id="previewVerse">{artwork.scripture_chinese}</p>
                        <p className="preview-reference" id="previewReference">{t(`bible_reference`)}{artwork.bible_reference}</p>
                    </div>
            </div>

            <style jsx>{`
              /* 大图预览模态框 */
              .preview-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
              }

              .preview-content {
                max-width: 90%;
                max-height: 90%;
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
              }

              .preview-image {
                max-width: 100%;
                max-height: 80vh;
                box-shadow: 0 0 40px rgba(255, 215, 0, 0.2);
                border: 1px solid rgba(255, 215, 0, 0.3);
              }

              .preview-info {
                margin-top: 20px;
                text-align: center;
                width: 100%;
              }

              .preview-verse {
                font-size: 1rem;
                color: var(--color-gold-terniary);
                margin: 0 auto 5px auto;
                line-height: 1.5;
              }

              .preview-reference {
                font-size: 0.85rem;
                color: var(--text-secondary);
              }

              .close-preview {
                position: absolute;
                
                top: -30px;
                right: -10px;
                width: 40px;
                height: 40px;
                border: none;
                background: transparent;
                color: #fff;
                font-size: 24px;
                cursor: pointer;
              }

              .close-preview:hover {
                transform: scale(1.1);
                transition: all 0.5s ease;
              }

              .paging {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                background: rgba(0,0,0,0.5);
                border: none;
                color: #fff;
                font-size: 2rem;
                cursor: pointer;
                padding: 0 12px;
                border-radius: 4px;
              }

              .paging.prev {
                
                left: 10px;
              }

              .paging.next {
                right: 10px;
                
              }

              /* 响应式设计 */
              @media (min-width: 1024px) {
                .close-preview {
                  top: -40px;
                  right: -40px;
                }

                .paging.prev {
                  left: -50px;
                }

                .paging.next {
                  right: -50px;
                }

                .preview-verse {
                  min-height: 60vw;
                }
              }
            `}</style>
        </div>
    );
}
