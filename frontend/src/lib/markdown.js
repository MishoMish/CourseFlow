import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';

/* ── Helpers for live code demos ── */

function highlightCode(str, lang) {
  if (lang && hljs.getLanguage(lang)) {
    try {
      return `<pre class="hljs"><code class="language-${lang}">${hljs.highlight(str, { language: lang }).value}</code></pre>`;
    } catch (_) { /* ignore */ }
  }
  return `<pre class="hljs"><code>${MarkdownIt().utils.escapeHtml(str)}</code></pre>`;
}

/** Single-language live block: ```html live */
function renderLiveBlock(str, lang) {
  const hljsLang = lang === 'js' ? 'javascript' : lang;
  const highlighted = highlightCode(str, hljsLang);
  const encoded = encodeURIComponent(str);
  return `<div class="live-demo"><div class="live-demo-code">${highlighted}</div><div class="live-demo-preview" data-lang="${lang}" data-code="${encoded}"></div></div>`;
}

/**
 * Combined demo block: ```demo
 * Sections separated by :::html, :::css, :::js
 */
function renderDemoBlock(str) {
  const sections = { html: '', css: '', js: '' };
  let current = 'html';

  for (const line of str.split('\n')) {
    const m = line.match(/^:::(\w+)\s*$/);
    if (m) {
      const s = m[1].toLowerCase();
      if (s === 'javascript') current = 'js';
      else if (['html', 'css', 'js'].includes(s)) current = s;
      continue;
    }
    sections[current] += line + '\n';
  }
  Object.keys(sections).forEach((k) => { sections[k] = sections[k].trimEnd(); });

  let codeHtml = '';
  if (sections.html) codeHtml += `<div class="live-demo-section"><span class="live-demo-label">HTML</span>${highlightCode(sections.html, 'html')}</div>`;
  if (sections.css) codeHtml += `<div class="live-demo-section"><span class="live-demo-label">CSS</span>${highlightCode(sections.css, 'css')}</div>`;
  if (sections.js) codeHtml += `<div class="live-demo-section"><span class="live-demo-label">JavaScript</span>${highlightCode(sections.js, 'javascript')}</div>`;

  const encoded = encodeURIComponent(JSON.stringify(sections));
  return `<div class="live-demo live-demo-combined"><div class="live-demo-code">${codeHtml}</div><div class="live-demo-preview" data-lang="demo" data-code="${encoded}"></div></div>`;
}

/* ── Global listener for iframe auto-resize messages ── */
if (typeof window !== 'undefined' && !window.__iframeResizeListenerAdded) {
  window.__iframeResizeListenerAdded = true;
  window.addEventListener('message', (e) => {
    if (!e.data?.__iframeResize) return;
    const iframes = document.querySelectorAll('.live-demo-preview iframe, .code-output iframe');
    iframes.forEach((iframe) => {
      if (iframe.contentWindow === e.source) {
        iframe.style.height = Math.max(e.data.h, 30) + 'px';
      }
    });
  });
}

/* ── Hydrate live previews (call from React useEffect) ── */
export function hydrateLiveDemos(container) {
  if (!container) return;
  const demos = container.querySelectorAll('.live-demo-preview');

  demos.forEach((el) => {
    if (el.querySelector('iframe')) return; // already hydrated

    const lang = el.dataset.lang;
    const raw = el.dataset.code;
    if (!raw) return;

    const iframe = document.createElement('iframe');
    iframe.sandbox = 'allow-scripts';
    iframe.style.cssText = 'width:100%;border:none;background:white;display:block;overflow:hidden;';
    iframe.scrolling = 'no';

    // Script injected into every iframe to report its own height via postMessage
    const resizeScript = `<script>
(function(){
  var uid = '${Math.random().toString(36).slice(2)}';
  function send(){parent.postMessage({__iframeResize:true,uid:uid,h:document.body.scrollHeight},'*');}
  if(window.ResizeObserver){new ResizeObserver(send).observe(document.body);}else{window.addEventListener('resize',send);}
  window.addEventListener('load',function(){setTimeout(send,0);setTimeout(send,100);setTimeout(send,500);});
  send();
})();
<\/script>`;

    // Store uid on the iframe so the listener can match it
    const uid = iframe._uid = Math.random().toString(36).slice(2);

    let fullHtml;
    // We'll replace the uid placeholder after building the HTML
    const resizeTag = resizeScript.replace(iframe._uid, uid);

    if (lang === 'demo') {
      const sections = JSON.parse(decodeURIComponent(raw));
      fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;padding:12px;margin:0;overflow:hidden;}${sections.css || ''}</style></head><body>${sections.html || ''}<script>${sections.js || ''}<\/script>${resizeTag}</body></html>`;
    } else {
      const code = decodeURIComponent(raw);
      if (lang === 'html') {
        fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;padding:12px;margin:0;overflow:hidden;}</style></head><body>${code}${resizeTag}</body></html>`;
      } else if (lang === 'css') {
        fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;padding:12px;margin:0;overflow:hidden;}${code}</style></head><body><div class="preview-box"><p>CSS е приложен.</p><h3>Заглавие</h3><p>Параграф текст</p><a href="#">Връзка</a><ul><li>Елемент 1</li><li>Елемент 2</li></ul></div>${resizeTag}</body></html>`;
      } else {
        fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;padding:12px;margin:0;overflow:hidden;}</style></head><body><pre id="out"></pre><script>
const _origLog=console.log;const _out=document.getElementById('out');
console.log=function(){_origLog.apply(console,arguments);_out.textContent+=Array.from(arguments).join(' ')+'\\n';};
${code}<\/script>${resizeTag}</body></html>`;
      }
    }

    el.appendChild(iframe);
    iframe.srcdoc = fullHtml;
  });
}

/* ── Main markdown-it instance ── */

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight(str, lang) {
    // Live preview: ```html live, ```css live, ```js live
    const liveMatch = lang?.match(/^(\w+)\s+live$/);
    if (liveMatch) {
      return renderLiveBlock(str, liveMatch[1]);
    }

    // Combined demo: ```demo
    if (lang === 'demo') {
      return renderDemoBlock(str);
    }

    // Normal highlight
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
      } catch (_) { /* ignore */ }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
});

// Custom rendering for embedded content
// Support: ![video](https://youtube.com/...) → iframe
// Support: ![pdf](/uploads/pdfs/...) → embed
// Support: ![github](https://github.com/...) → link card

const defaultImageRender = md.renderer.rules.image || function (tokens, idx, options, _env, self) {
  return self.renderToken(tokens, idx, options);
};

md.renderer.rules.image = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const src = token.attrGet('src') || '';
  const alt = token.content || '';

  // YouTube embed
  if (src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)) {
    const match = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    const videoId = match[1];
    return `<div class="video-embed"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen loading="lazy" style="width:100%;aspect-ratio:16/9;border-radius:8px;"></iframe></div>`;
  }

  // PDF embed
  if (src.endsWith('.pdf')) {
    return `<div class="pdf-embed"><embed src="${src}" type="application/pdf" width="100%" height="600px" style="border-radius:8px;border:1px solid var(--border);" /><p><a href="${src}" target="_blank" rel="noopener">📄 ${alt || 'Отвори PDF'}</a></p></div>`;
  }

  // GitHub repo link
  if (src.match(/github\.com\/[\w-]+\/[\w-]+/)) {
    return `<div class="github-embed card" style="padding:12px;margin:1rem 0;"><a href="${src}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;">📦 <strong>${alt || src}</strong></a></div>`;
  }

  return defaultImageRender(tokens, idx, options, env, self);
};

export function renderMarkdown(content) {
  if (!content) return '';
  return md.render(content);
}

export default md;
