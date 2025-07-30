'use client'
import Image from "next/image";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useLocale} from "next-intl";
import homeStyles from './home.module.css';
import {useSkylightAnimation} from "@/hooks/useSkylightAnimation";
import { useFadeInOnScrollAnimation } from "@/hooks/useFadeInOnScrollAnimation";

export default function Home() {
  const t = useTranslations();
  const locale = useLocale();


  useFadeInOnScrollAnimation();
  useSkylightAnimation();

  return (
      <>
        {/* 背景装饰元素 */}
        <div className={`${homeStyles['gallery-bg-cross']} ${homeStyles['gallery-bg-element']}`}></div>
        <div className={`${homeStyles['gallery-bg-circle']} ${homeStyles['gallery-bg-element']}`}></div>
        <div className={`${homeStyles['gallery-bg-arch']} ${homeStyles['gallery-bg-element']}`}></div>

        {/* 英雄区域，结合页面标题 */}
        <section className={homeStyles['hero-section']}>
          <div className={homeStyles['hero-background']}></div>
          <div className={homeStyles['hero-overlay']}></div>
          <div className="skylight"></div>
          <div className={homeStyles['hero-content']}>
            <h2 className={homeStyles['hero-title']}>透过艺术传扬福音</h2>
            <p className={homeStyles['hero-subtitle']}>用美丽的视觉艺术传递永恒的真理与希望</p>
            <Link href={`/${locale}/gallery`} className={homeStyles['hero-button']}>浏览画廊</Link>
          </div>
          <div className={homeStyles['scroll-indicator']}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M12 20.5c-.8 0-1.6-.3-2.1-.9l-7.4-7.4c-.6-.6-.6-1.5 0-2.1.6-.6 1.5-.6 2.1 0L12 17.5l7.4-7.4c.6-.6 1.5-.6 2.1 0 .6.6.6 1.5 0 2.1l-7.4 7.4c-.5.6-1.3.9-2.1.9z"/>
            </svg>
          </div>
        </section>

        {/* 宗旨部分 */}
        <section className={homeStyles['mission-section']}>
          <h2 className={homeStyles['section-title']}>我们的宗旨</h2>

          <div className={homeStyles['mission-content']}>
            <div className={`${homeStyles['mission-block']} fade-in-up`}>
              <div className={homeStyles['mission-text']}>
                <h3>视觉传福音</h3>
                <p>福音书画画廊致力于通过<span className={homeStyles['mission-highlight']}>视觉艺术的力量</span>，将圣经中的永恒真理以感人至深的方式呈现给世人。我们相信，美的力量能够穿透心灵，让更多人接触并理解福音的精髓。</p>

                <div className={homeStyles['verse-card']}>
                  <p className={homeStyles['verse-text']}>神就照着自己的形象造人，乃是照着祂的形象造男造女。</p>
                  <p className={homeStyles['verse-reference']}>— 创世记 1:27</p>
                </div>

                <p>作为按神形象所造的人，我们相信艺术创作是神赐予我们的礼物，让我们能够以美表达信仰，以创造力荣耀创造主。</p>
              </div>
              <div className={homeStyles['mission-image']}>
                <img src="./images/mission-1.jpg" alt="视觉福音艺术"/>
              </div>
            </div>

            <div className={`${homeStyles['mission-block']} fade-in-up`}>
              <div className={homeStyles['mission-text']}>
                <h3>跨越语言的艺术表达</h3>
                <p>在这个信息爆炸的时代，福音书画打破语言与文化的障碍，通过<span className={homeStyles['mission-highlight']}>视觉语言</span>直接触动人心。我们的作品融合了东西方美学元素，以现代人能够理解和欣赏的艺术形式表达圣经真理。</p>

                <div className={homeStyles['verse-card']}>
                  <p className={homeStyles['verse-text']}>主的道传遍了那一带地方。</p>
                  <p className={homeStyles['verse-reference']}>— 使徒行传 13:49</p>
                </div>

                <p>我们期待通过艺术创作，让福音的种子被播撒到各处，在人们心中生根发芽，结出信心的果实。</p>
              </div>
              <div className={homeStyles['mission-image']}>
                <img src="./images/mission-2.jpg" alt="跨文化福音艺术"/>
              </div>
            </div>

            <div className={`${homeStyles['mission-block']} fade-in-up`}>
              <div className={homeStyles['mission-text']}>
                <h3>创作见证</h3>
                <p>每一幅作品都凝聚了创作者对圣经真理的理解与心灵触动，是<span className={homeStyles['mission-highlight']}>个人与神互动的见证</span>。我们的艺术不仅是技巧的展示，更是灵魂的对话，希望能引发观者对信仰的思考与共鸣。</p>

                <div className={homeStyles['verse-card']}>
                  <p className={homeStyles['verse-text']}>你们是世上的光。城造在山上，是不能隐藏的。</p>
                  <p className={homeStyles['verse-reference']}>— 马太福音 5:14</p>
                </div>

                <p>通过我们的创作，我们希望成为照亮他人的光，引导人们认识真理，找到生命的盼望与意义。</p>
              </div>
              <div className={homeStyles['mission-image']}>
                <img src="./images/mission-3.jpg" alt="创作见证"/>
              </div>
            </div>
          </div>

          {/* 十字装饰 */}
          <div className={`${homeStyles['cross-decoration']} ${homeStyles['cross-1']}`}></div>
          <div className={`${homeStyles['cross-decoration']} ${homeStyles['cross-2']}`}></div>
        </section>

        {/* 艺术形式部分 */}
        <section className={homeStyles['mission-section']}>
          <h2 className={homeStyles['section-title']}>我们的艺术形式</h2>

          <div className={homeStyles['mission-content']}>
            <div className={`${homeStyles['mission-block']} fade-in-up`}>
              <div className={homeStyles['mission-text']}>
                <h3>数字绘画与传统技法融合</h3>
                <p>我们的创作融合了<span className={homeStyles['mission-highlight']}>传统东方水墨</span>与现代数字艺术技术，将古老的艺术形式与当代视觉语言相结合，创造出既有文化深度又具现代感的福音艺术作品。</p>
                <p>每幅作品都精心设计构图与色彩，力求通过视觉元素传达圣经经文的深意，让观者在欣赏美的同时，也能领受其中蕴含的属灵信息。</p>
              </div>
              <div className={homeStyles['mission-image']}>
                <img src="./images/artform-1.jpg" alt="数字与传统艺术融合"/>
              </div>
            </div>

            <div className={`${homeStyles['mission-block']} fade-in-up`}>
              <div className={homeStyles['mission-text']}>
                <h3>经文书法艺术</h3>
                <p>我们特别注重<span className={homeStyles['mission-highlight']}>汉字书法</span>与圣经经文的结合，以东方特有的书写艺术表达信仰。通过精心设计的字体与布局，使经文不仅仅是文字，更成为具有视觉冲击力的艺术作品。</p>
                <p>每一笔每一划都蕴含着创作者对神话语的敬畏与热爱，邀请观者一同沉浸在神的话语中，感受其中的力量与美丽。</p>
              </div>
              <div className={homeStyles['mission-image']}>
                <img src="./images/artform-2.jpg" alt="经文书法艺术"/>
              </div>
            </div>

            <div className={`${homeStyles['mission-block']} fade-in-up`}>
              <div className={homeStyles['mission-text']}>
                <h3>展览与数字分享</h3>
                <p>我们的作品不仅通过实体展览向公众展示，也通过<span className={homeStyles['mission-highlight']}>数字平台</span>广泛传播。我们相信艺术福音作品应当被更多人看见，因此我们积极拥抱数字时代的传播方式。</p>
                <p>同时，我们也提供高质量的印刷品，让人们可以将这些充满灵性的艺术作品带回家中，成为日常生活中的提醒与鼓励。</p>
              </div>
              <div className={homeStyles['mission-image']}>
                <img src="./images/artform-3.jpg" alt="展览与数字分享"/>
              </div>
            </div>
          </div>
        </section>

        {/* 联系部分 */}
        <section className={homeStyles['contact-section']}>
          <h2 className={homeStyles['section-title']}>联系我们</h2>

          <div className={homeStyles['contact-content']}>
            <div className={homeStyles['contact-info']}>
              <div className={homeStyles['contact-method']}>
                <div className={homeStyles['contact-icon']}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                </div>
                <div className={homeStyles['contact-detail']}>
                  <h4>电子邮件</h4>
                  <p>xxxx@xxxx.com</p>
                </div>
              </div>

              <div className={homeStyles['contact-method']}>
                <div className={homeStyles['contact-icon']}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-3 11H7v-2h10v2zm0-4H7V9h10v2z"/>
                  </svg>
                </div>
                <div className={homeStyles['contact-detail']}>
                  <h4>微信公众号</h4>
                  <p>福音书画xxxxx</p>
                </div>
              </div>

              <div className={homeStyles['contact-method']}>
                <div className={homeStyles['contact-icon']}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </div>
                <div className={homeStyles['contact-detail']}>
                  <h4>地址</h4>
                  <p>美国佛罗里达州xxxxxxx</p>
                </div>
              </div>

              <div className={homeStyles['contact-method']}>
                <div className={homeStyles['contact-icon']}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M12 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-1.8C18 6.57 15.35 4 12 4s-6 2.57-6 6.2c0 2.34 1.95 5.44 6 9.14 4.05-3.7 6-6.8 6-9.14zM12 2c4.2 0 8 3.22 8 8.2 0 3.32-2.67 7.25-8 11.8-5.33-4.55-8-8.48-8-11.8C4 5.22 7.8 2 12 2z"/>
                  </svg>
                </div>
                <div className={homeStyles['contact-detail']}>
                  <h4>展览信息</h4>
                  <p>请关注我们的微信公众号获取最新展览信息</p>
                </div>
              </div>
            </div>

            <div className={homeStyles['contact-form']}>
              <h3>发送信息</h3>
              <div className={homeStyles['form-group']}>
                <label htmlFor="name">您的姓名</label>
                <input type="text" id="name" name="name" required />
              </div>

              <div className={homeStyles['form-group']}>
                <label htmlFor="email">电子邮箱</label>
                <input type="email" id="email" name="email" required />
              </div>

              <div className={homeStyles['form-group']}>
                <label htmlFor="message">留言内容</label>
                <textarea id="message" name="message" required></textarea>
              </div>

              <button type="submit" className={homeStyles['submit-btn']}>发送信息</button>
            </div>
          </div>
        </section>
      </>
  );
}
