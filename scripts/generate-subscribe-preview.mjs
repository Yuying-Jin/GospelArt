// Builds docs/subscribe-preview.html from the project's real sources:
// messages/*.json for copy, styles/variables.css for the palette, and
// lucide-react's own icon nodes for the SVGs.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const LOCALES = ['en', 'zh-CN', 'zh-TW'];

const copy = Object.fromEntries(
    LOCALES.map((l) => [l, JSON.parse(fs.readFileSync(`messages/${l}.json`, 'utf8')).footer.subscribe]),
);

const variables = fs.readFileSync('styles/variables.css', 'utf8');

const ICON_FILES = {
    MailCheck: 'mail-check',
    CircleCheck: 'circle-check',
    CircleAlert: 'circle-alert',
    X: 'x',
};

const icons = {};
for (const [name, file] of Object.entries(ICON_FILES)) {
    const {__iconNode} = await import(pathToFileURL(path.resolve(process.cwd(), `node_modules/lucide-react/dist/esm/icons/${file}.js`)).href);
    icons[name] = __iconNode
        .map(([tag, attrs]) => {
            const a = Object.entries(attrs)
                .filter(([k]) => k !== 'key')
                .map(([k, v]) => `${k}="${v}"`)
                .join(' ');
            return `<${tag} ${a} />`;
        })
        .join('');
}

function svg(name, size) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
}

// Mirrors PRESENTATION in components/SubscribeDialog.tsx.
const RESULTS = [
    {api: 'pending', key: 'pending', icon: 'MailCheck', tone: 'success'},
    {api: 'already_subscribed', key: 'alreadySubscribed', icon: 'CircleCheck', tone: 'success'},
    {api: 'already_pending', key: 'alreadyPending', icon: 'MailCheck', tone: 'success'},
    {api: 'rate_limited', key: 'rateLimited', icon: 'CircleAlert', tone: 'notice'},
    {api: 'forgotten_email', key: 'forgotten', icon: 'CircleAlert', tone: 'notice'},
    {api: 'compliance_state', key: 'restricted', icon: 'CircleAlert', tone: 'notice'},
    {api: 'failed', key: 'failed', icon: 'CircleAlert', tone: 'notice'},
];

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>订阅反馈预览 · Gospel Art</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;500&display=swap" rel="stylesheet">
<style>
${variables}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  background: var(--color-bg-primary);
  color: var(--text-secondary);
  font-family: 'Noto Serif SC', 'Songti SC', 'Times New Roman', serif;
  -webkit-font-smoothing: antialiased;
}

.wrap { max-width: 1100px; margin: 0 auto; padding: 40px 24px 80px; }

header.page { border-bottom: 1px solid var(--border-gold-light); padding-bottom: 20px; margin-bottom: 32px; }
header.page h1 { margin: 0 0 8px; font-size: 22px; font-weight: 500; letter-spacing: 2px; color: var(--color-gold-primary); }
header.page p { margin: 0; font-size: 14px; color: var(--text-tertiary); line-height: 1.7; }
header.page code { color: var(--color-gold-soft); font-size: 13px; }

.controls { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 28px; }
.controls .label { font-size: 13px; color: var(--text-tertiary); letter-spacing: 1px; margin-right: 4px; }
.lang {
  padding: 7px 16px; font-family: inherit; font-size: 13px; cursor: pointer;
  color: var(--text-secondary); background: rgba(255,255,255,0.05);
  border: 1px solid var(--border-light); border-radius: 3px; transition: all .25s ease;
}
.lang:hover { border-color: var(--border-gold-medium); color: var(--color-gold-secondary); }
.lang[aria-pressed="true"] { background: var(--color-gold-bright); color: var(--text-contrast); border-color: var(--color-gold-bright); }

.columns { display: grid; grid-template-columns: minmax(300px, 380px) 1fr; gap: 40px; align-items: start; }
@media (max-width: 860px) { .columns { grid-template-columns: 1fr; gap: 32px; } }

.panel-title { font-size: 13px; letter-spacing: 2px; color: var(--color-gold-secondary); margin: 0 0 16px; text-transform: uppercase; }

/* ---- the footer form, copied from components/Footer.tsx ---- */
.footer-sim { background: var(--color-bg-secondary); border: 1px solid var(--border-gold-light); border-radius: 4px; padding: 28px 24px; position: relative; }
.footer-sim::before {
  content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent 0%, transparent 20%, var(--border-gold-medium) 35%, var(--border-gold-strong) 50%, var(--border-gold-medium) 65%, transparent 80%, transparent 100%);
}
.footer-sim h3 { color: var(--color-gold-secondary); font-weight: 500; font-size: 18px; margin: 0 0 20px; padding-bottom: 10px; position: relative; letter-spacing: 2px; }
.footer-sim h3::after { content: ""; position: absolute; bottom: 0; left: 0; width: 50px; height: 1px; background: linear-gradient(to right, rgba(255,215,0,.7), transparent); }
.footer-sim form { display: flex; flex-direction: column; width: 100%; max-width: 360px; }
.footer-sim input[type="email"] {
  background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.15); color: #fff;
  padding: 12px 15px; border-radius: 3px; margin-bottom: 10px; font-family: inherit; transition: all .3s ease;
}
.footer-sim input[type="email"]:focus { background: rgba(255,255,255,.12); border-color: var(--border-gold-medium); outline: none; box-shadow: 0 0 10px rgba(255,215,0,.1); }
.footer-sim input[type="email"]::placeholder { color: var(--text-tertiary); }
.footer-sim input[type="email"][aria-invalid="true"] { border-color: rgba(255,140,140,.55); }
.footer-sim button.subscribe {
  background: var(--color-gold-bright); color: rgba(20,20,30,.9); border: none; padding: 10px 20px;
  cursor: pointer; border-radius: 3px; font-weight: 500; font-size: .9rem; letter-spacing: 1px;
  transition: all .3s ease; margin-top: 5px; font-family: inherit;
}
.footer-sim button.subscribe:hover { background: var(--color-gold-primary); box-shadow: 0 5px 15px rgba(0,0,0,.2); }
.footer-sim button.subscribe[disabled] { opacity: .7; cursor: default; }
.subscribe-error { margin: 10px 0 0; font-size: 14px; line-height: 1.5; color: rgba(255,255,255,.75); }

/* ---- trigger list ---- */
.states { display: grid; gap: 10px; }
.state-btn {
  display: flex; align-items: center; gap: 14px; width: 100%; text-align: left;
  padding: 14px 16px; font-family: inherit; font-size: 14px; cursor: pointer;
  color: var(--text-secondary); background: var(--color-bg-card-alt);
  border: 1px solid var(--border-light); border-radius: 4px; transition: all .25s ease;
}
.state-btn:hover { border-color: var(--border-gold-medium); background: var(--color-bg-card); transform: translateX(4px); }
.state-btn .chip { font-size: 11px; letter-spacing: .5px; color: var(--text-tertiary); font-family: ui-monospace, monospace; }
.state-btn .mark { display: flex; width: 30px; flex: none; }
.state-btn.success .mark { color: var(--color-gold-bright); }
.state-btn.notice .mark { color: rgba(255,255,255,.55); }
.state-btn .text { display: flex; flex-direction: column; gap: 3px; }

/* ---- dialog, copied from components/SubscribeDialog.tsx ---- */
.subscribe-dialog {
  position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center;
  padding: 20px; padding-top: max(20px, env(safe-area-inset-top)); padding-bottom: max(20px, env(safe-area-inset-bottom));
  background: rgba(0,0,0,.72); backdrop-filter: blur(3px); animation: dialog-fade 180ms ease-out;
}
.subscribe-dialog[hidden] { display: none; }
.subscribe-dialog .panel {
  position: relative; width: 100%; max-width: 420px; max-height: calc(100dvh - 40px); overflow-y: auto;
  padding: 40px 28px 28px; text-align: center; background: var(--color-bg-secondary);
  border: 1px solid var(--border-gold-light); border-radius: 6px; box-shadow: 0 24px 60px rgba(0,0,0,.55);
  animation: dialog-rise 240ms cubic-bezier(.22,.61,.36,1);
}
.subscribe-dialog .panel::before {
  content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent 0%, var(--border-gold-medium) 30%, var(--border-gold-strong) 50%, var(--border-gold-medium) 70%, transparent 100%);
}
.subscribe-dialog .dismiss {
  position: absolute; top: 8px; right: 8px; display: flex; align-items: center; justify-content: center;
  width: 44px; height: 44px; padding: 0; color: var(--text-tertiary); background: none; border: none;
  border-radius: 4px; cursor: pointer; transition: color .2s ease, background .2s ease;
}
.subscribe-dialog .dismiss:hover { color: var(--color-gold-secondary); background: rgba(255,255,255,.06); }
.subscribe-dialog .badge {
  display: inline-flex; align-items: center; justify-content: center; width: 62px; height: 62px;
  margin-bottom: 18px; border-radius: 50%; border: 1px solid;
}
.subscribe-dialog .panel.success .badge { color: var(--color-gold-bright); border-color: var(--border-gold-medium); background: rgba(255,215,0,.08); }
.subscribe-dialog .panel.notice .badge { color: rgba(255,255,255,.75); border-color: rgba(255,255,255,.2); background: rgba(255,255,255,.05); }
.subscribe-dialog h2 { margin: 0 0 12px; font-size: 19px; font-weight: 500; letter-spacing: 1px; color: var(--color-gold-secondary); }
.subscribe-dialog p { margin: 0 0 26px; font-size: 14.5px; line-height: 1.75; color: rgba(255,255,255,.78); }
.subscribe-dialog .confirm {
  width: 100%; min-height: 44px; padding: 11px 20px; font-family: inherit; font-size: .9rem; font-weight: 500;
  letter-spacing: 1px; color: rgba(20,20,30,.9); background: var(--color-gold-bright); border: none;
  border-radius: 3px; cursor: pointer; transition: background .3s ease, box-shadow .3s ease;
}
.subscribe-dialog .confirm:hover { background: var(--color-gold-primary); box-shadow: 0 5px 15px rgba(0,0,0,.25); }
.subscribe-dialog .dismiss:focus-visible, .subscribe-dialog .confirm:focus-visible { outline: 2px solid var(--color-gold-secondary); outline-offset: 2px; }

@keyframes dialog-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes dialog-rise { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: none; } }

@media (max-width: 767px) {
  .subscribe-dialog .panel { padding: 36px 22px 24px; }
  .subscribe-dialog h2 { font-size: 18px; }
}
@media (prefers-reduced-motion: reduce) {
  .subscribe-dialog, .subscribe-dialog .panel { animation: none; }
}
</style>
</head>
<body>
<div class="wrap">
  <header class="page">
    <h1>订阅反馈预览</h1>
    <p>
      页脚订阅表单的全部反馈状态。文案取自 <code>messages/*.json</code>，配色取自
      <code>styles/variables.css</code>，图标取自 lucide-react —— 与站点同源，但<strong>不会自动同步</strong>，
      改过组件后需要重新生成。这是纯静态页面，不会调用 <code>/api/subscribe</code>，也不会写入 Mailchimp。
    </p>
  </header>

  <div class="controls">
    <span class="label">语言</span>
    ${LOCALES.map((l, i) => `<button class="lang" data-locale="${l}" aria-pressed="${i === 1}">${l}</button>`).join('\n    ')}
  </div>

  <div class="columns">
    <section>
      <h2 class="panel-title">表单</h2>
      <div class="footer-sim">
        <h3 data-copy="title"></h3>
        <form id="demo-form" novalidate>
          <input type="email" name="email" data-copy-attr="placeholder" autocomplete="email" required>
          <button type="submit" class="subscribe" data-copy="button"></button>
          <p class="subscribe-error" id="demo-error" hidden></p>
        </form>
      </div>
      <p style="font-size:13px;line-height:1.7;color:var(--text-tertiary);margin-top:14px">
        输入非法邮箱后提交，可看到行内校验（不弹窗）。<br>
        输入合法邮箱后提交，会模拟一次成功返回。
      </p>
    </section>

    <section>
      <h2 class="panel-title">弹窗状态</h2>
      <div class="states">
        ${RESULTS.map((r) => `<button class="state-btn ${r.tone}" data-result="${r.key}" data-tone="${r.tone}" data-icon="${r.icon}">
          <span class="mark">${svg(r.icon, 22)}</span>
          <span class="text"><span data-title="${r.key}"></span><span class="chip">${r.api}</span></span>
        </button>`).join('\n        ')}
      </div>
    </section>
  </div>
</div>

<div class="subscribe-dialog" id="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-body" hidden>
  <div class="panel" id="dlg-panel">
    <button type="button" class="dismiss" id="dlg-x"></button>
    <span class="badge" id="dlg-badge"></span>
    <h2 id="dlg-title"></h2>
    <p id="dlg-body"></p>
    <button type="button" class="confirm" id="dlg-confirm"></button>
  </div>
</div>

<script>
const COPY = ${JSON.stringify(copy, null, 2)};
const ICONS = ${JSON.stringify(
    Object.fromEntries(Object.keys(ICON_FILES).map((n) => [n, svg(n, 30)])),
)};
const X_ICON = ${JSON.stringify(svg('X', 20))};
const EMAIL_PATTERN = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

let locale = 'zh-CN';
let lastFocus = null;

const dialog = document.getElementById('dialog');
const panel = document.getElementById('dlg-panel');
const form = document.getElementById('demo-form');
const errorLine = document.getElementById('demo-error');
const emailInput = form.querySelector('input[name=email]');

document.getElementById('dlg-x').innerHTML = X_ICON;

function t() { return COPY[locale]; }

function render() {
  const c = t();
  document.querySelector('[data-copy="title"]').textContent = c.title;
  document.querySelector('[data-copy="button"]').textContent = c.button;
  document.querySelector('[data-copy-attr="placeholder"]').placeholder = c.placeholder;
  errorLine.textContent = c.invalid;
  document.getElementById('dlg-confirm').textContent = c.close;
  document.getElementById('dlg-x').setAttribute('aria-label', c.close);
  document.querySelectorAll('[data-title]').forEach((el) => {
    el.textContent = c.result[el.dataset.title].title;
  });
  document.documentElement.lang = locale;
}

function openDialog(key, tone, icon) {
  const c = t().result[key];
  lastFocus = document.activeElement;
  panel.className = 'panel ' + tone;
  document.getElementById('dlg-badge').innerHTML = ICONS[icon];
  document.getElementById('dlg-title').textContent = c.title;
  document.getElementById('dlg-body').textContent = c.body;
  dialog.hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('dlg-confirm').focus();
}

function closeDialog() {
  dialog.hidden = true;
  document.body.style.overflow = '';
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

document.querySelectorAll('.state-btn').forEach((btn) => {
  btn.addEventListener('click', () => openDialog(btn.dataset.result, btn.dataset.tone, btn.dataset.icon));
});

document.getElementById('dlg-x').addEventListener('click', closeDialog);
document.getElementById('dlg-confirm').addEventListener('click', closeDialog);
dialog.addEventListener('click', (e) => { if (e.target === dialog) closeDialog(); });
panel.addEventListener('click', (e) => e.stopPropagation());

window.addEventListener('keydown', (e) => {
  if (dialog.hidden) return;
  if (e.key === 'Escape') { closeDialog(); return; }
  if (e.key !== 'Tab') return;
  const items = panel.querySelectorAll('button');
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = emailInput.value.trim();
  if (!EMAIL_PATTERN.test(value)) {
    errorLine.hidden = false;
    emailInput.setAttribute('aria-invalid', 'true');
    return;
  }
  errorLine.hidden = true;
  emailInput.removeAttribute('aria-invalid');
  form.reset();
  openDialog('pending', 'success', 'MailCheck');
});

emailInput.addEventListener('input', () => {
  errorLine.hidden = true;
  emailInput.removeAttribute('aria-invalid');
});

document.querySelectorAll('.lang').forEach((btn) => {
  btn.addEventListener('click', () => {
    locale = btn.dataset.locale;
    document.querySelectorAll('.lang').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    render();
  });
});

render();
</script>
</body>
</html>
`;

fs.mkdirSync('docs', {recursive: true});
fs.writeFileSync('docs/subscribe-preview.html', html);
console.log('docs/subscribe-preview.html  ' + (html.length / 1024).toFixed(1) + ' KB');
console.log('locales: ' + LOCALES.join(', '));
console.log('states : ' + RESULTS.length);
