// chat-formatter.js
import DOMPurify from 'dompurify';
import { marked } from 'marked';

/* ================= Formatting rules (copied / summarized from your command file)
   These are the rules & symbols we keep inside the formatter (not the full chatPrompt).
   You can extend this object or load it from your server if you wish.
*/
const formattingRules = {
  headingSymbols: ['➤','★','🔸','🔹','✦','▶️','🔷','✺'],
  thinSeparator: '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬',
  thickSeparatorDesktop: '══════════════════════════════════════════',
  thickSeparatorMobile: '════════════════════════════════',
  bullet: '•',
  subBullet: '▪',
  indentRem: 1.4,
  subIndentRem: 2.6,
  strictWarnings: [
    'Never place multiple list items on the same line.',
    'Headings must be on their own line.',
    'Sub-items must be indented (visual indent).',
    'Use varied symbols for titles and different symbols inside.',
    'MCQ options must be on separate lines.'
  ]
};

/* ========= Helpers ========= */
function isMobile(){
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
function getThinSeparator(){ return formattingRules.thinSeparator; }
function getThickSeparator(){ return isMobile() ? formattingRules.thickSeparatorMobile : formattingRules.thickSeparatorDesktop; }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ========= Simple linter/autofix (only formatting rules, no prompt text embedding) ========= */
function lintAndFix(raw){
  const warnings = [];
  let fixed = raw;

  // 1) If a heading has items inline separated by '*' or '-' -> split into list items
  fixed = fixed.replace(/^([^:\n]{1,200}):\s*([^\n]*[*\-\u2022\u25AA▸▪].+)$/gm, (m,head,rest) => {
    const items = rest.split(/[*\-\u2022\u25AA▸▪]+/).map(s=>s.trim()).filter(Boolean);
    if (items.length>1){
      warnings.push(`Converted inline items under heading "${head}" into a list.`);
      return head + ':\n\n' + items.map(i=>' - '+i).join('\n');
    }
    return m;
  });

  // 2) Convert inline star-lists like "* A * B" into list
  fixed = fixed.replace(/(^|\n)\s*([*\u2022\u25AA▸▪]\s*[^*\n]+?(\s*[*\u2022\u25AA▸▪]\s*[^*\n]+)+)/g, (m) => {
    const parts = m.replace(/^[\s\n]*/,'').split(/[*\u2022\u25AA▸▪]+/).map(s=>s.trim()).filter(Boolean);
    if (parts.length>1){
      warnings.push('Normalized inline marker list into multi-line list.');
      return '\n' + parts.map(p=>' - '+p).join('\n') + '\n';
    }
    return m;
  });

  // 3) Ensure MCQ options each on its own line (very lightweight)
  fixed = fixed.replace(/([a-eA-E])\)\s*([^)\n]+)\s+(?=[a-eA-E]\))/g, (m) => m.replace(/\s+(?=[a-eA-E]\))/,'\n'));

  // 4) If heading and content on same line, split (Heading:)
  fixed = fixed.replace(/^(.{1,120}):\s+([^\n]+)/gm, (m, h, c) => {
    // don't split if the "content" looks like a single short label (let it)
    if (c.length > 40 || /[,\.;\-]/.test(c)) {
      warnings.push(`Split heading "${h}" from the content on same line.`);
      return `${h}:\n\n${c}`;
    }
    return m;
  });

  return { fixed, warnings };
}

/* ========= Preprocess raw text -> Markdown-friendly text ========= */
function preprocess(raw){
  const paragraphs = raw.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const processed = [];

  for (const p of paragraphs){
    // separators
    if (/^(-{3,}|_{3,}|═{3,}|={3,}|—{3,}|―{3,}|▬{3,})$/.test(p)){
      if (/^(={3,}|═{3,})$/.test(p)){
        processed.push(getThickSeparator());
      } else {
        processed.push(getThinSeparator());
      }
      continue;
    }

    // heading inline items detection: "Header: * A * B"
    const mHeadInline = p.match(/^([^:]{1,200}):\s*(.+)$/);
    if (mHeadInline){
      const head = mHeadInline[1].trim();
      const rest = mHeadInline[2].trim();
      if (/[*▪▸•→➤\-]/.test(rest) && rest.split(/[*▪▸•→➤\-]+/).filter(Boolean).length>1){
        const items = rest.split(/[*▪▸•→➤\-]+/).map(s=>s.trim()).filter(Boolean);
        const lines = [ head + ':' , '' , ...items.map(it => '- ' + it) ];
        processed.push(lines.join('\n'));
        continue;
      }
      if (/\d+\)|\d+\./.test(rest)){
        const items = rest.split(/(?:\d+\)|\d+\.)/).map(s=>s.trim()).filter(Boolean);
        const lines = [ head + ':' , '' , ...items.map((it,i) => (i+1)+'. '+it) ];
        processed.push(lines.join('\n'));
        continue;
      }
    }

    // inline numeric lists without heading
    if ((/\d+\)/.test(p) || /\d+\./.test(p)) && (p.split(/(?:\d+\)|\d+\.)/).filter(Boolean).length>1)
   {
      const items = p.split(/(?:\d+\)|\d+\.)/).map(s=>s.trim()).filter(Boolean);
      const lines = items.map((it,i)=> (i+1)+'. '+it);
      processed.push(lines.join('\n'));
      continue;
    }

    // inline marker list without heading, e.g., "* A * B * C" or "- A - B"
    if (/[*▪▸•→➤\-]/.test(p) && p.split(/[*▪▸•→➤\-]+/).filter(Boolean).length>1){
      const items = p.split(/[*▪▸•→➤\-]+/).map(s=>s.trim()).filter(Boolean);
      const lines = items.map(it => '- ' + it);
      processed.push(lines.join('\n'));
      continue;
    }

    // Lines that have many markers at start (multi-line list)
    if (/^[\*\-\•\▪\▸\u2022]/m.test(p) || /\n[\s]*[\*\-\•\▪\▸\u2022]/.test(p)){
      const lines = p.split(/\r?\n/).map(l => l.replace(/^[*\-\•\▪\▸\u2022]+\s*/, '- ').trim()).join('\n');
      processed.push(lines);
      continue;
    }

    // default
    processed.push(p);
  }

  return processed.join('\n\n');
}

/* ========= Post-process: convert marked HTML -> enhanced semantic HTML with classes ========= */
function enhanceHtml(html){
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  // headings
  const headingTags = tmp.querySelectorAll('h1,h2,h3,h4,h5,h6');
  let headingIndex = 0;
  headingTags.forEach(h => {
    const sym = formattingRules.headingSymbols[headingIndex % formattingRules.headingSymbols.length] || '➤';
    headingIndex++;
    const div = document.createElement('div');
    div.className = 'section-title';
    div.innerHTML = escapeHtml(sym) + ' ' + h.innerHTML + ':';
    h.replaceWith(div);
  });

  // lists classes
  tmp.querySelectorAll('ul, ol').forEach(list => {
    const parent = list.parentElement;
    if (parent && parent.tagName.toLowerCase() === 'li'){
      list.classList.add('sub-list');
    } else {
      if (list.tagName.toLowerCase() === 'ul') list.classList.add('strict-list');
      if (list.tagName.toLowerCase() === 'ol') list.classList.add('ordered-list');
    }
  });

  // li classification and heading-item detection
  tmp.querySelectorAll('li').forEach(li => {
    const parentUL = li.closest('ul');
    if (parentUL){
      if (parentUL.classList.contains('sub-list')){
        li.classList.add('subitem');
      } else if (parentUL.classList.contains('strict-list')){
        li.classList.add('item');
      } else {
        li.classList.add('item');
      }
    } else if (li.parentElement && li.parentElement.tagName.toLowerCase() === 'ol'){
      li.classList.add('item');
    } else {
      li.classList.add('item');
    }

    if (li.querySelector('ul,ol')){
      li.classList.add('heading-item');
      const firstChild = li.firstChild;
      if (firstChild && firstChild.nodeType === Node.TEXT_NODE){
        const txt = firstChild.textContent.trim();
        if (txt){
          const span = document.createElement('span');
          span.className = 'subheading';
          span.textContent = txt.replace(/[:\s]*$/,'') ;
          li.removeChild(firstChild);
          li.insertBefore(span, li.firstChild);
        }
      }
    }
  });

  return tmp.innerHTML;
}


/* ========== Public API ========== */

/**
 * formatForModel(rawText)
 * - runs lint/fix & preprocess
 * - returns markdown string ready to send to the model
 */
export function formatForModel(rawText){
  const { fixed } = lintAndFix(rawText);
  const markdown = preprocess(fixed);
  return { markdown, warnings: lintAndFix(rawText).warnings };
}

/**
 * renderModelOutput(markdownOrHtml, containerEl)
 * - accepts markdown (preferred) or raw HTML
 * - converts markdown->html, enhances classes, sanitizes and sets container.innerHTML
 */
export function renderModelOutput(text, containerEl){
  // if text looks like HTML (contains <), assume HTML, else markdown
  const html = /<\/?[a-z][\s\S]*>/i.test(text) ? text : marked.parse(text, { mangle:false, headerIds:false });
  const enhanced = enhanceHtml(html);
  const clean = DOMPurify.sanitize(enhanced, { USE_PROFILES: { html: true } });
  containerEl.innerHTML = clean;
}

/* optional small helper to just get sanitized HTML without setting container */
export function toSanitizedHtml(text){
  const html = /<\/?[a-z][\s\S]*>/i.test(text) ? text : marked.parse(text, { mangle:false, headerIds:false });
  const enhanced = enhanceHtml(html);
  return DOMPurify.sanitize(enhanced, { USE_PROFILES: { html: true } });
}
