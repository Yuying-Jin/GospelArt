/**
 * Six example news items for the development stage, one or more per
 * category, with the cases the list and article pages need to be seen with:
 * long and short text, one-day and multi-day events, no cover image (the site
 * draws its placeholder), and bodies using every rich-text style.
 *
 *   node scripts/seed-news-examples.mjs [--dry-run]
 *   node scripts/seed-news-examples.mjs --delete
 *
 * English Scripture is ESV text, so each citation carries the ESV mark the
 * site links to esv.org.
 *
 * Titles start with 測試用例 / Test Case like the other test items. Fixed ids
 * make re-running replace them rather than add copies, and --delete removes
 * exactly these six.
 */
import crypto from 'node:crypto'
import {getWriteClient} from './lib/scriptClient.mjs'

const DRY_RUN = process.argv.includes('--dry-run')
const DELETE = process.argv.includes('--delete')

const key = () => crypto.randomBytes(6).toString('hex')

// The limits set in sanity/schemaTypes/documents/news.ts.
const LIMITS = {title: [30, 100], summary: [120, 300], eventName: [40, 160], location: [40, 160]}

/** `**bold**` and `==highlight==` inside a line of text. */
function spans(text) {
    return text
        .split(/(\*\*[^*]+\*\*|==[^=]+==)/)
        .filter(Boolean)
        .map((part) => {
            const marks = part.startsWith('**') ? ['strong'] : part.startsWith('==') ? ['highlight'] : []
            return {_key: key(), _type: 'span', marks, text: marks.length ? part.slice(2, -2) : part}
        })
}

/** Lines such as `h2 Heading`, `> quote`, `- bullet`, `1. numbered` or plain text. */
function body(lines) {
    return lines.map((line) => {
        const block = {_key: key(), _type: 'block', markDefs: [], style: 'normal'}
        let text = line
        if (line.startsWith('h2 ')) [block.style, text] = ['h2', line.slice(3)]
        else if (line.startsWith('h3 ')) [block.style, text] = ['h3', line.slice(3)]
        else if (line.startsWith('> ')) [block.style, text] = ['blockquote', line.slice(2)]
        else if (line.startsWith('- ')) Object.assign(block, {listItem: 'bullet', level: 1}), (text = line.slice(2))
        else if (/^\d+\. /.test(line)) Object.assign(block, {listItem: 'number', level: 1}), (text = line.replace(/^\d+\. /, ''))
        return {...block, children: spans(text)}
    })
}

const localeString = (zhTW, zhCN, en) => ({_type: 'localeString', zhTW, zhCN, en})
const localeText = (zhTW, zhCN, en) => ({_type: 'localeText', zhTW, zhCN, en})
const richText = (zhTW, zhCN, en) => ({_type: 'localeRichText', zhTW: body(zhTW), zhCN: body(zhCN), en: body(en)})

/** `<english-title>-<publication-date>`, as `sanity/lib/newsSlug.ts` builds it. */
function slug(en, date) {
    const words = en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '')
    return `${words}-${date}`
}

const ITEMS = [
    {
        id: 'gallery-open',
        category: 'ministry',
        publishedAt: '2026-09-28',
        title: localeString('測試用例-線上畫廊開放：三百餘幅經文畫作與大家見面', '测试用例-线上画廊开放：三百余幅经文画作与大家见面', 'Test Case - The online gallery is open: over 300 scripture paintings'),
        summary: localeText(
            '經過一年的整理與翻譯，所有作品都能在網站上依主題與合集瀏覽，並附上中英對照的經文。',
            '经过一年的整理与翻译，所有作品都能在网站上依主题与合集浏览，并附上中英对照的经文。',
            'After a year of cataloguing and translation, every painting can be browsed by theme and collection, with the scripture in Chinese and English.',
        ),
        body: richText(
            [
                '經過一年的整理、拍攝與翻譯，事工的線上畫廊終於開放了。三百餘幅經文畫作，現在都能在網站上瀏覽。',
                'h2 可以怎樣瀏覽',
                '- **依合集**：同工挑選的主題合集，例如「盼望」與「生命」。',
                '- **依主題**：每幅作品都標注了聖經主題與屬靈主題。',
                '- **全部作品**：依創作日期排列的完整典藏。',
                'h2 中英對照的經文',
                '每幅畫作旁都附上經文，==中文與英文並列==，方便不同語言的朋友一同默想。',
                '> 「諸天述說神的榮耀；穹蒼傳揚他的手段。」（詩篇 19:1）',
                'h3 接下來',
                '我們會陸續補上作品背後的故事與默想，也歡迎你透過聯絡表單告訴我們你的建議。',
            ],
            [
                '经过一年的整理、拍摄与翻译，事工的线上画廊终于开放了。三百余幅经文画作，现在都能在网站上浏览。',
                'h2 可以怎样浏览',
                '- **依合集**：同工挑选的主题合集，例如“盼望”与“生命”。',
                '- **依主题**：每幅作品都标注了圣经主题与属灵主题。',
                '- **全部作品**：依创作日期排列的完整典藏。',
                'h2 中英对照的经文',
                '每幅画作旁都附上经文，==中文与英文并列==，方便不同语言的朋友一同默想。',
                '> “诸天述说神的荣耀；穹苍传扬他的手段。”（诗篇 19:1）',
                'h3 接下来',
                '我们会陆续补上作品背后的故事与默想，也欢迎你通过联系表单告诉我们你的建议。',
            ],
            [
                'After a year of photographing, cataloguing and translation, the ministry’s online gallery is open. More than three hundred scripture paintings can now be seen on the site.',
                'h2 Ways to browse',
                '- **By collection**: themed selections made by the ministry team, such as “Hope” and “Life”.',
                '- **By theme**: every painting is tagged with its biblical and spiritual themes.',
                '- **All artworks**: the complete archive, in the order the paintings were made.',
                'h2 Scripture in two languages',
                'Each painting sits beside its verse, ==in Chinese and English together==, so friends of either language can meditate on it side by side.',
                '> “The heavens declare the glory of God, and the sky above proclaims his handiwork.” (Psalm 19:1, ESV)',
                'h3 What comes next',
                'We will add the stories and reflections behind the paintings over time. Tell us what you would like to see through the contact form.',
            ],
        ),
    },
    {
        id: 'wait-quietly',
        category: 'reflection',
        publishedAt: '2026-09-21',
        title: localeString('測試用例-學習安靜等候神：讀詩篇六十二篇', '测试用例-学习安静等候神：读诗篇六十二篇', 'Test Case - Learning to wait quietly on God: notes on reading Psalm 62 slowly'),
        summary: localeText(
            '「我的心默默無聲，專等候神。」一位受邀的弟兄在長期照顧家人的日子裡重讀這句經文，分享等候不是被動的空白，而是在神面前一次次放下自己的計畫，以及他如何在畫中用留白表達那份安靜。',
            '“我的心默默无声，专等候神。”一位受邀的弟兄在长期照顾家人的日子里重读这句经文，分享等候不是被动的空白，而是在神面前一次次放下自己的计划，以及他如何在画中用留白表达那份安静。',
            'An invited contributor returns to Psalm 62:1 while caring for his family: waiting is not an empty pause but a daily laying down of our plans before God. He also shows how empty space in his painting holds that stillness.',
        ),
        body: richText(
            [
                '**分享者**：受邀分享的弟兄，在教會服事多年，平日以水彩創作經文畫。',
                '> 「我的心默默無聲，專等候神；我的救恩是從他而來。」（詩篇 62:1）',
                '過去兩年，我大部分的時間都在照顧年邁的父親。日子被醫院、藥單和夜裡的電話切成一段一段，我常常覺得自己在「等」：等報告、等好轉、等一個答案。',
                'h2 等候不是空白',
                '重讀詩篇六十二篇時，我發現大衛的等候並不是什麼都不做。他一面承認仇敵的攻擊，一面一次又一次地回到同一句話。==等候，是一次次把自己的計畫放在神面前。==',
                'h2 畫中的留白',
                '畫這幅作品時，我刻意在畫面上半部留下大片空白，只用極淡的顏色帶過。那片空白不是未完成，而是我想留給神說話的地方。',
                'h3 禱告',
                '主啊，當我們急著要答案的時候，求你教我們安靜；當我們只看見等待，求你讓我們看見你同在。阿們。',
            ],
            [
                '**分享者**：受邀分享的弟兄，在教会服事多年，平日以水彩创作经文画。',
                '> “我的心默默无声，专等候神；我的救恩是从他而来。”（诗篇 62:1）',
                '过去两年，我大部分的时间都在照顾年迈的父亲。日子被医院、药单和夜里的电话切成一段一段，我常常觉得自己在“等”：等报告、等好转、等一个答案。',
                'h2 等候不是空白',
                '重读诗篇六十二篇时，我发现大卫的等候并不是什么都不做。他一面承认仇敌的攻击，一面一次又一次地回到同一句话。==等候，是一次次把自己的计划放在神面前。==',
                'h2 画中的留白',
                '画这幅作品时，我刻意在画面上半部留下大片空白，只用极淡的颜色带过。那片空白不是未完成，而是我想留给神说话的地方。',
                'h3 祷告',
                '主啊，当我们急着要答案的时候，求你教我们安静；当我们只看见等待，求你让我们看见你同在。阿们。',
            ],
            [
                '**About the writer**: an invited contributor who has served in his church for many years and paints scripture in watercolour.',
                '> “For God alone my soul waits in silence; from him comes my salvation.” (Psalm 62:1, ESV)',
                'For the past two years most of my time has gone to caring for my elderly father. Hospital visits, prescriptions and late-night calls cut the days into pieces, and I often felt I was simply waiting: for results, for improvement, for an answer.',
                'h2 Waiting is not empty',
                'Reading Psalm 62 again, I noticed that David’s waiting is not idleness. He names the attacks against him, and returns again and again to the same words. ==Waiting is laying our own plans before God, over and over.==',
                'h2 The empty space in the painting',
                'In this painting I left most of the upper half almost blank, with only the faintest wash of colour. That space is not unfinished; it is the place I wanted to leave for God to speak.',
                'h3 A prayer',
                'Lord, when we are hurrying for answers, teach us to be still; when all we can see is waiting, let us see that you are with us. Amen.',
            ],
        ),
    },
    {
        id: 'autumn-exhibition',
        category: 'event',
        publishedAt: '2026-09-20',
        title: localeString('測試用例-秋季經文藝術展：十天的相遇與回響', '测试用例-秋季经文艺术展：十天的相遇与回响', 'Test Case - The autumn scripture art exhibition: ten days of encounters'),
        summary: localeText(
            '記錄這次展覽的佈展過程、來訪的朋友，以及幾位觀眾在畫作前停留時分享的故事。',
            '记录这次展览的布展过程、来访的朋友，以及几位观众在画作前停留时分享的故事。',
            'A record of setting up the exhibition, the friends who came, and the stories visitors shared while standing before the paintings.',
        ),
        event: {
            name: localeString('秋季經文藝術展（範例）', '秋季经文艺术展（范例）', 'Autumn Scripture Art Exhibition (sample)'),
            startDate: '2026-09-05',
            endDate: '2026-09-14',
            location: localeString('恩典堂副堂，波士頓', '恩典堂副堂，波士顿', 'Grace Church Hall, Boston'),
        },
        body: richText(
            [
                '九月初，我們在恩典堂副堂舉辦了為期十天的秋季經文藝術展，展出二十四幅以「生命」為主題的作品。',
                'h2 佈展',
                '佈展花了整整兩天。同工們按照經文的順序排列畫作，從創世記一路走到啟示錄，讓來訪的朋友可以跟著經文走一趟。',
                'h2 來訪的朋友',
                '- 十天裡共有三百多位朋友來訪。',
                '- 其中有不少人是第一次走進教會。',
                '- 週末的導覽場次，每一場都坐滿了。',
                '> 「我在這幅畫前站了很久，好像第一次真正讀懂這節經文。」——一位來訪的朋友',
                'h3 感謝',
                '謝謝每一位幫忙佈展、導覽和接待的同工與義工，也謝謝恩典堂借出場地。',
            ],
            [
                '九月初，我们在恩典堂副堂举办了为期十天的秋季经文艺术展，展出二十四幅以“生命”为主题的作品。',
                'h2 布展',
                '布展花了整整两天。同工们按照经文的顺序排列画作，从创世记一路走到启示录，让来访的朋友可以跟着经文走一趟。',
                'h2 来访的朋友',
                '- 十天里共有三百多位朋友来访。',
                '- 其中有不少人是第一次走进教会。',
                '- 周末的导览场次，每一场都坐满了。',
                '> “我在这幅画前站了很久，好像第一次真正读懂这节经文。”——一位来访的朋友',
                'h3 感谢',
                '谢谢每一位帮忙布展、导览和接待的同工与义工，也谢谢恩典堂借出场地。',
            ],
            [
                'In early September we held a ten-day autumn scripture art exhibition in the Grace Church hall, showing twenty-four paintings on the theme of life.',
                'h2 Setting up',
                'Setting up took two full days. The team hung the paintings in the order of their verses, from Genesis to Revelation, so visitors could walk through Scripture as they went.',
                'h2 The friends who came',
                '- More than three hundred people visited over the ten days.',
                '- Many of them were stepping into a church for the first time.',
                '- Every weekend guided tour was full.',
                '> “I stood in front of this painting for a long time. It felt like I understood the verse for the first time.” (a visitor)',
                'h3 Thank you',
                'Thank you to every worker and volunteer who helped hang, guide and welcome, and to Grace Church for lending the hall.',
            ],
        ),
    },
    {
        id: 'advent',
        category: 'seasonal',
        season: 'advent',
        publishedAt: '2026-09-15',
        title: localeString('測試用例-將臨期專題：在等候中預備心', '测试用例-将临期专题：在等候中预备心', 'Test Case - Advent: preparing our hearts while we wait'),
        summary: localeText('四週的經文與畫作，陪伴大家一同走過將臨期。', '四周的经文与画作，陪伴大家一同走过将临期。', 'Four weeks of scripture and paintings to walk through Advent together.'),
        body: richText(
            [
                '將臨期是教會年曆的開始，也是等候基督降臨的季節。今年我們為每一週選了一段經文與一幅畫作。',
                'h2 四週的主題',
                '1. **盼望**：以賽亞書 9:2',
                '2. **平安**：以賽亞書 9:6',
                '3. **喜樂**：路加福音 2:10',
                '4. **愛**：約翰福音 3:16',
                '> 「因有一嬰孩為我們而生；有一子賜給我們。」（以賽亞書 9:6）',
                '每週日我們會在網站上更新當週的默想，==歡迎與家人一同閱讀==。',
            ],
            [
                '将临期是教会年历的开始，也是等候基督降临的季节。今年我们为每一周选了一段经文与一幅画作。',
                'h2 四周的主题',
                '1. **盼望**：以赛亚书 9:2',
                '2. **平安**：以赛亚书 9:6',
                '3. **喜乐**：路加福音 2:10',
                '4. **爱**：约翰福音 3:16',
                '> “因有一婴孩为我们而生；有一子赐给我们。”（以赛亚书 9:6）',
                '每周日我们会在网站上更新当周的默想，==欢迎与家人一同阅读==。',
            ],
            [
                'Advent opens the church year: the season of waiting for Christ’s coming. This year we chose one passage and one painting for each week.',
                'h2 The four weeks',
                '1. **Hope**: Isaiah 9:2',
                '2. **Peace**: Isaiah 9:6',
                '3. **Joy**: Luke 2:10',
                '4. **Love**: John 3:16',
                '> “For to us a child is born, to us a son is given.” (Isaiah 9:6, ESV)',
                'Each Sunday we will post that week’s reflection here. ==Read it together with your family.==',
            ],
        ),
    },
    {
        id: 'resurrection',
        category: 'reflection',
        publishedAt: '2026-09-08',
        title: localeString('測試用例-「我是復活，我是生命」', '测试用例-“我是复活，我是生命”', 'Test Case - “I am the resurrection and the life”'),
        summary: localeText('從約翰福音十一章看拉撒路的故事。', '从约翰福音十一章看拉撒路的故事。', 'The raising of Lazarus in John 11.'),
        body: richText(
            [
                '> 「復活在我，生命也在我。信我的人雖然死了，也必復活。」（約翰福音 11:25）',
                '耶穌說這句話的時候，拉撒路已經在墳墓裡四天了。馬大相信末日的復活，耶穌卻告訴她：復活不只是將來的事，而是一位現在就站在她面前的主。',
                '這幅畫用墳墓口透出的光作為中心，提醒我們：在看似結束的地方，神仍在說話。',
            ],
            [
                '> “复活在我，生命也在我。信我的人虽然死了，也必复活。”（约翰福音 11:25）',
                '耶稣说这句话的时候，拉撒路已经在坟墓里四天了。马大相信末日的复活，耶稣却告诉她：复活不只是将来的事，而是一位现在就站在她面前的主。',
                '这幅画用坟墓口透出的光作为中心，提醒我们：在看似结束的地方，神仍在说话。',
            ],
            [
                '> “I am the resurrection and the life. Whoever believes in me, though he die, yet shall he live.” (John 11:25, ESV)',
                'When Jesus said this, Lazarus had been in the tomb for four days. Martha believed in the resurrection on the last day; Jesus told her that resurrection is not only a future event but a Lord standing in front of her now.',
                'The painting centres on the light breaking from the mouth of the tomb: where things seem to end, God is still speaking.',
            ],
        ),
    },
    {
        id: 'online-evening',
        category: 'event',
        publishedAt: '2026-08-30',
        title: localeString('測試用例-線上分享會回顧：畫作背後的經文', '测试用例-线上分享会回顾：画作背后的经文', 'Test Case - The online evening: the scripture behind the paintings'),
        summary: localeText('當晚三位同工分享了各自最喜愛的一幅作品。', '当晚三位同工分享了各自最喜爱的一幅作品。', 'Three ministry workers each talked about a favourite painting.'),
        event: {
            name: localeString('線上分享會（範例）', '线上分享会（范例）', 'Online sharing evening (sample)'),
            startDate: '2026-08-24',
            location: localeString('線上聚會', '线上聚会', 'Online'),
        },
        body: richText(
            [
                '八月二十四日晚上，我們舉辦了第一次線上分享會，四十多位朋友在線上一同參加。',
                'h2 當晚分享的三幅作品',
                '- 《等候》：詩篇 62:1',
                '- 《光照在黑暗裡》：約翰福音 1:5',
                '- 《新的憐憫》：耶利米哀歌 3:22-23',
                '每位同工都談到作品背後的經文，以及畫的時候正在經歷的事。我們計畫每季舉辦一次。',
            ],
            [
                '八月二十四日晚上，我们举办了第一次线上分享会，四十多位朋友在线上一同参加。',
                'h2 当晚分享的三幅作品',
                '- 《等候》：诗篇 62:1',
                '- 《光照在黑暗里》：约翰福音 1:5',
                '- 《新的怜悯》：耶利米哀歌 3:22-23',
                '每位同工都谈到作品背后的经文，以及画的时候正在经历的事。我们计划每季举办一次。',
            ],
            [
                'On the evening of 24 August we held our first online sharing evening, with more than forty friends joining.',
                'h2 The three paintings we shared',
                '- “Waiting”: Psalm 62:1',
                '- “The light shines in the darkness”: John 1:5',
                '- “New mercies”: Lamentations 3:22-23',
                'Each worker spoke about the verse behind the painting and what they were living through while painting it. We plan to hold one each season.',
            ],
        ),
    },
]

function checkLengths(item) {
    const problems = []
    const check = (label, value, [zh, en]) => {
        for (const lang of ['zhTW', 'zhCN']) if (value?.[lang] && value[lang].length > zh) problems.push(`${label}.${lang} ${value[lang].length} > ${zh}`)
        if (value?.en && value.en.length > en) problems.push(`${label}.en ${value.en.length} > ${en}`)
    }
    check('title', item.title, LIMITS.title)
    check('summary', item.summary, LIMITS.summary)
    if (item.event) {
        check('event.name', item.event.name, LIMITS.eventName)
        check('event.location', item.event.location, LIMITS.location)
    }
    return problems
}

function toDocument(item) {
    const {id, ...fields} = item
    return {
        _id: `test-news-example-${id}`,
        _type: 'news',
        showOnSite: true,
        slug: {_type: 'slug', current: slug(item.title.en, item.publishedAt)},
        ...fields,
    }
}

async function main() {
    const client = getWriteClient()
    const ids = ITEMS.map((item) => `test-news-example-${item.id}`)

    if (DELETE) {
        if (DRY_RUN) return console.log('Would delete:', ids.join(', '))
        const tx = client.transaction()
        for (const id of ids) tx.delete(id)
        await tx.commit()
        return console.log(`Deleted ${ids.length} example news items.`)
    }

    const problems = ITEMS.flatMap((item) => checkLengths(item).map((p) => `${item.id}: ${p}`))
    if (problems.length) {
        console.error('Over the Studio limits; nothing was written:\n  ' + problems.join('\n  '))
        process.exit(1)
    }

    const docs = ITEMS.map(toDocument)
    const taken = await client.fetch(
        '*[_type == "news" && !(_id in $ids) && (slug.current in $slugs || count(previousSlugs[@ in $slugs]) > 0)]{_id, "slug": slug.current}',
        {ids, slugs: docs.map((doc) => doc.slug.current)},
    )
    if (taken.length) {
        console.error('Slugs already used by other news items:', taken)
        process.exit(1)
    }

    for (const doc of docs) console.log(`${doc._id}  ${doc.category.padEnd(10)}  /news/${doc.slug.current}`)
    if (DRY_RUN) return console.log('Dry run: nothing written.')

    const tx = client.transaction()
    for (const doc of docs) tx.createOrReplace(doc)
    await tx.commit()
    console.log(`Wrote ${docs.length} example news items.`)
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
