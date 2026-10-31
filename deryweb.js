/* ════════════════════════════════════════════════════════════════════════
   deryweb.js — the Dery Web language compiler
   Write plain English sentences. Get a finished, responsive website.

   Works in the browser (<script src="deryweb.js">) and in Node.
   No dependencies, no packages, no framework.
   ════════════════════════════════════════════════════════════════════════ */
(function (root) {
  "use strict";

  /* ── helpers ───────────────────────────────────────────────────────── */
  const q = (s) => String(s).replace(/\\"/g, '"').trim();

  // pull every "quoted thing" out of a sentence
  function quoted(s) {
    const out = [];
    const re = /"([^"]*)"/g;
    let m;
    while ((m = re.exec(s))) out.push(m[1]);
    return out;
  }

  // strip a trailing full stop / question mark / exclamation
  function clean(line) {
    return line.replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "").trim();
  }

  const COLORS = {
    black: "#000000", white: "#ffffff", orange: "#FF8A00", blue: "#2563EB",
    red: "#DC2626", green: "#16A34A", yellow: "#EAB308", purple: "#7C3AED",
    pink: "#EC4899", grey: "#6B7280", gray: "#6B7280", gold: "#D4AF37",
    navy: "#0B1224", dark: "#0B1224", light: "#F8FAFC", brown: "#78350F",
    teal: "#0D9488", sky: "#38BDF8",
  };
  // find the colour named at the end of an English sentence
  function pickColor(line, quotedThings, fallback) {
    if (quotedThings && quotedThings[0]) return color(quotedThings[0], fallback);
    const m = line.match(/\b(?:colou?r|to|is|be)\s+([a-z#0-9]+)\s*$/i);
    if (m) return color(m[1], fallback);
    const words = line.split(/\s+/);
    return color(words[words.length - 1], fallback);
  }

  function color(name, fallback) {
    if (!name) return fallback;
    const t = name.trim().toLowerCase();
    if (COLORS[t]) return COLORS[t];
    if (/^#?[0-9a-f]{3,8}$/i.test(t)) return t.startsWith("#") ? t : "#" + t;
    return fallback;
  }

  /* ── the compiler ──────────────────────────────────────────────────── */
  function compile(source) {
    const lines = String(source).split(/\r?\n/);
    const page = {
      title: "My Website",
      bg: "#FFFFFF",
      text: "#111827",
      font: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      accent: "#FF8A00",
      blocks: [],
      center: false,
      width: "760px",
    };
    const errors = [];
    let currentSection = null;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (!raw.trim() || raw.trim().startsWith("#")) continue;
      const line = clean(raw);
      const lower = line.toLowerCase();
      const quotedThings = quoted(line);
      const first = quotedThings[0] || "";
      let matched = false;

      /* ── page / document ──────────────────────────────────────────── */
      if (/^(create|make|start|build)\b.*\b(page|website|site|document)\b/.test(lower)) {
        matched = true;
        if (first) page.title = first;
        const called = line.match(/\b(?:called|named)\s+([^"]+)$/i);
        if (!first && called) page.title = called[1].trim();
      }
      /* ── colours ──────────────────────────────────────────────────── */
      else if (/^(set|make|change)\b.*\bbackground\b/.test(lower)) {
        matched = true;
        page.bg = pickColor(line, quotedThings, page.bg);
      }
      else if (/^(set|make|change)\b.*\b(text|writing|font)\s*(?:colou?r)?\b.*\bcolou?r\b/.test(lower) ||
               /^(set|make|change)\b.*\btext\b.*\bcolou?r\b/.test(lower)) {
        matched = true;
        page.text = pickColor(line, quotedThings, page.text);
      }
      else if (/^(set|make|change)\b.*\b(accent|buttons?|highlights?)\b/.test(lower)) {
        matched = true;
        page.accent = pickColor(line, quotedThings, page.accent);
      }
      else if (/^(use|set)\b.*\bfont\b/.test(lower)) {
        matched = true;
        const f = first || line.replace(/.*\b(?:font|is|to)\b/, "").trim();
        if (f) page.font = `"${f}", system-ui, sans-serif`;
      }
      /* ── layout ───────────────────────────────────────────────────── */
      else if (/^(center|centre)\b/.test(lower)) {
        matched = true;
        page.center = true;
      }
      else if (/\b(narrow|wide|full width)\b/.test(lower) && /\b(make|set|use)\b/.test(lower)) {
        matched = true;
        page.width = /\bwide|full width\b/.test(lower) ? "1100px" : "620px";
      }
      /* ── navigation ───────────────────────────────────────────────── */
      else if (/^(add|create|make|include)\b.*\bnav(igation)?\b/.test(lower)) {
        matched = true;
        const items = quotedThings.length ? quotedThings : ["Home", "About", "Contact"];
        page.blocks.push({ type: "nav", items });
      }
      /* ── headings ─────────────────────────────────────────────────── */
      else if (/^(add|create|make|include|put)\b.*\b(big|large|main|giant)?\s*(heading|title|header)\b/.test(lower)) {
        matched = true;
        const big = /\b(big|large|main|giant)\b/.test(lower);
        page.blocks.push({ type: "heading", text: first || "Heading", level: big ? 1 : 2 });
      }
      /* ── paragraphs / text ────────────────────────────────────────── */
      else if (/^(add|create|make|include|put|write)\b.*\b(paragraph|text|sentence|caption|note|description)\b/.test(lower)) {
        matched = true;
        page.blocks.push({ type: "paragraph", text: first || line.replace(/^.*?\b(?:says|saying|reads|with)\b\s*/, "") });
      }
      /* ── buttons ──────────────────────────────────────────────────── */
      else if (/^(add|create|make|include|put)\b.*\bbutton\b/.test(lower)) {
        matched = true;
        const label = first || "Click here";
        let href = "#";
        const linkMatch = line.match(/\b(?:linking to|called|to|that goes to)\s+"([^"]+)"/i);
        if (linkMatch) href = linkMatch[1];
        else if (quotedThings[1]) href = quotedThings[1];
        page.blocks.push({ type: "button", text: label, href });
      }
      /* ── links ────────────────────────────────────────────────────── */
      else if (/^(add|create|make|include)\b.*\b(link|hyperlink)\b/.test(lower)) {
        matched = true;
        page.blocks.push({ type: "link", text: quotedThings[0] || "Link", href: quotedThings[1] || "#" });
      }
      /* ── images ───────────────────────────────────────────────────── */
      else if (/^(add|create|make|include|put)\b.*\b(image|picture|photo|logo)\b/.test(lower)) {
        matched = true;
        page.blocks.push({ type: "image", src: quotedThings[0] || "", alt: quotedThings[1] || "Image" });
      }
      /* ── lists ────────────────────────────────────────────────────── */
      else if (/^(add|create|make|include)\b.*\b(list)\b/.test(lower)) {
        matched = true;
        const items = quotedThings.length ? quotedThings : ["First item", "Second item", "Third item"];
        page.blocks.push({ type: "list", items, ordered: /\bnumbered\b/.test(lower) });
      }
      /* ── forms ────────────────────────────────────────────────────── */
      else if (/^(add|create|make|include)\b.*\b(contact\s+)?form\b/.test(lower)) {
        matched = true;
        page.blocks.push({ type: "form" });
      }
      /* ── footer ───────────────────────────────────────────────────── */
      else if (/^(add|create|make|include)\b.*\bfooter\b/.test(lower)) {
        matched = true;
        page.blocks.push({ type: "footer", text: first || "© 2026 " + page.title });
      }
      /* ── sections (opening) ──────────────────────────────────────── */
      else if (/^(add|create|make|start)\b.*\bsection\b/.test(lower)) {
        matched = true;
        currentSection = { type: "section", title: first || "", children: [] };
        page.blocks.push(currentSection);
      }
      else if (/^(end|close|finish)\b.*\bsection\b/.test(lower)) {
        matched = true;
        currentSection = null;
      }
      /* ── divider / spacing ───────────────────────────────────────── */
      else if (/^(add|create|make|include)\b.*\b(divider|line|space|space away)\b/.test(lower)) {
        matched = true;
        page.blocks.push({ type: "divider" });
      }
      /* ── plain prose fallback: a sentence with no verb we know ───── */
      else if (/^(it|this|the site|the page)\b/.test(lower)) {
        matched = false; // fall through to error, honest
      }

      if (!matched) {
        errors.push({
          line: i + 1,
          text: raw.trim(),
          message: `I don't understand this sentence: "${raw.trim()}"`,
          hint: "Try a sentence like: Add a heading that says \"Welcome\".",
        });
      }
    }

    /* ── render ──────────────────────────────────────────────────────── */
    function esc(s) {
      return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function renderBlocks(blocks, indent) {
      const pad = "  ".repeat(indent || 1);
      return blocks.map((b) => {
        switch (b.type) {
          case "nav":
            return `${pad}<nav class="nav">\n${b.items.map((s) => `${pad}  <a href="#${esc(s.toLowerCase().replace(/\s+/g, "-"))}">${esc(s)}</a>`).join("\n")}\n${pad}</nav>\n`;
          case "heading":
            return `${pad}<h${b.level}>${esc(b.text)}</h${b.level}>\n`;
          case "paragraph":
            return `${pad}<p>${esc(b.text)}</p>\n`;
          case "button":
            return `${pad}<a class="btn" href="${esc(b.href)}">${esc(b.text)}</a>\n`;
          case "link":
            return `${pad}<p><a class="link" href="${esc(b.href)}">${esc(b.text)}</a></p>\n`;
          case "image":
            return b.src ? `${pad}<img src="${esc(b.src)}" alt="${esc(b.alt)}" />\n` : `${pad}<div class="img-placeholder">Image</div>\n`;
          case "list":
            return b.ordered
              ? `${pad}<ol>\n${b.items.map((s) => `${pad}  <li>${esc(s)}</li>`).join("\n")}\n${pad}</ol>\n`
              : `${pad}<ul>\n${b.items.map((s) => `${pad}  <li>${esc(s)}</li>`).join("\n")}\n${pad}</ul>\n`;
          case "form":
            return `${pad}<form class="form" onsubmit="event.preventDefault(); this.querySelector('.sent').style.display='block';">\n` +
                   `${pad}  <label>Your name<input type="text" required /></label>\n` +
                   `${pad}  <label>Your phone<input type="tel" required /></label>\n` +
                   `${pad}  <label>Message<textarea rows="4" required></textarea></label>\n` +
                   `${pad}  <button class="btn" type="submit">Send</button>\n` +
                   `${pad}  <p class="sent" style="display:none">Thank you, we will call you back.</p>\n` +
                   `${pad}</form>\n`;
          case "footer":
            return `${pad}<footer class="footer">${esc(b.text)}</footer>\n`;
          case "divider":
            return `${pad}<hr />\n`;
          case "section":
            return `${pad}<section id="${esc((b.title || "section").toLowerCase().replace(/\s+/g, "-"))}">\n` +
                   (b.title ? `${pad}  <h2>${esc(b.title)}</h2>\n` : "") +
                   (b.children.length ? renderBlocks(b.children, (indent || 1) + 1) : "") +
                   `${pad}</section>\n`;
          default:
            return "";
        }
      }).join("");
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(page.title)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: ${page.font};
    background: ${page.bg};
    color: ${page.text};
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
  }
  main {
    max-width: ${page.width};
    margin: 0 auto;
    padding: 32px 20px 64px;
    ${page.center ? "text-align: center;" : ""}
  }
  h1 { font-size: clamp(28px, 6vw, 44px); line-height: 1.15; margin: 0 0 16px; letter-spacing: -0.02em; }
  h2 { font-size: clamp(20px, 4vw, 28px); margin: 32px 0 12px; letter-spacing: -0.01em; }
  p { margin: 0 0 16px; opacity: 0.92; }
  .nav {
    display: flex; flex-wrap: wrap; gap: 18px;
    padding: 16px 20px; border-bottom: 1px solid rgba(128,128,128,0.2);
    ${page.center ? "justify-content: center;" : ""}
  }
  .nav a { color: inherit; text-decoration: none; font-weight: 600; font-size: 14px; opacity: 0.85; }
  .nav a:hover { opacity: 1; }
  .btn {
    display: inline-block; background: ${page.accent}; color: #fff;
    padding: 12px 22px; border-radius: 10px; text-decoration: none;
    font-weight: 700; font-size: 15px; border: none; cursor: pointer;
    margin: 6px 0 14px;
  }
  .btn:hover { filter: brightness(1.08); }
  .link { color: ${page.accent}; font-weight: 600; }
  img { max-width: 100%; height: auto; border-radius: 12px; display: block; margin: 12px 0; }
  .img-placeholder {
    border: 1px dashed rgba(128,128,128,0.4); border-radius: 12px;
    padding: 48px; text-align: center; opacity: 0.6; margin: 12px 0;
  }
  ul, ol { padding-left: 22px; margin: 0 0 16px; }
  li { margin-bottom: 6px; }
  hr { border: none; border-top: 1px solid rgba(128,128,128,0.25); margin: 28px 0; }
  section { margin: 8px 0 24px; }
  .form { display: grid; gap: 12px; margin: 16px 0; }
  .form label { display: grid; gap: 6px; font-size: 14px; font-weight: 600; }
  .form input, .form textarea {
    font: inherit; padding: 11px 13px; border-radius: 10px;
    border: 1px solid rgba(128,128,128,0.35); background: transparent; color: inherit; width: 100%;
  }
  .sent { color: #16A34A; font-weight: 700; }
  .footer {
    margin-top: 40px; padding-top: 20px; font-size: 13px;
    border-top: 1px solid rgba(128,128,128,0.25); opacity: 0.75;
  }
  @media (max-width: 480px) {
    main { padding: 24px 16px 48px; }
    .btn { width: 100%; text-align: center; }
  }
</style>
</head>
<body>
${page.blocks.some((b) => b.type === "nav") ? renderBlocks(page.blocks.filter((b) => b.type === "nav"), 0).replace(/^ {0,2}/gm, "") : ""}<main>
${renderBlocks(page.blocks.filter((b) => b.type !== "nav"), 1)}</main>
</body>
</html>`;

    return { html, errors, page };
  }

  const api = { compile, COLORS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.DeryWeb = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
