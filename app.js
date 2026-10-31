
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  window.addEventListener("error", (e) => {
    const st = document.getElementById("stateText");
    const ic = document.getElementById("stateIc");
    if (st && ic && e && e.message) { ic.textContent = "!"; ic.className = "bad"; st.textContent = "Something broke: " + e.message; }
  });
  const ed = $("editor"), gutter = $("gutter"), hl = $("hl"), ac = $("ac"), codeScroll = $("codeScroll");
  const STORE = "dery.files.v2";
  const isMobile = () => window.matchMedia("(max-width: 880px)").matches;

  // ── files ────────────────────────────────────────────────────────────
  function loadStore() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || "null");
      if (raw && Array.isArray(raw.files) && raw.files.length) return raw;
    } catch (e) { /* ignore */ }
    // real, empty starting point — no demo content
    return { files: [{ id: "f" + Date.now(), name: "program.dery", code: "" }], active: null };
  }
  let store = loadStore();
  if (!store.active || !store.files.some((f) => f.id === store.active)) store.active = store.files[0].id;
  function saveStore() { try { localStorage.setItem(STORE, JSON.stringify(store)); } catch (e) { /* ignore */ } }
  const activeFile = () => store.files.find((f) => f.id === store.active) || store.files[0];

  function renderFiles() {
    const box = $("files");
    box.innerHTML = "";
    store.files.forEach((f) => {
      const el = document.createElement("div");
      el.className = "file" + (f.id === store.active ? " on" : "");
      el.innerHTML = '<span class="dot"></span><b></b><span class="del" title="Delete">×</span>';
      el.querySelector("b").textContent = f.name;
      el.addEventListener("click", (ev) => {
        if (ev.target.classList.contains("del")) {
          if (store.files.length === 1) { f.code = ""; } else { store.files = store.files.filter((x) => x.id !== f.id); }
          if (!store.files.some((x) => x.id === store.active)) store.active = store.files[0].id;
          saveStore(); openFile(); renderFiles(); closeSide(); return;
        }
        store.active = f.id; saveStore(); openFile(); renderFiles(); closeSide();
      });
      box.appendChild(el);
    });
    $("fileName").textContent = activeFile().name;
  }

  function openFile() {
    const f = activeFile();
    ed.value = f.code || "";
    refresh();
    ed.focus();
    ed.setSelectionRange(ed.value.length, ed.value.length);
  }

  function newFile() {
    let n = store.files.length + 1;
    while (store.files.some((f) => f.name === "program" + n + ".dery")) n++;
    const f = { id: "f" + Date.now(), name: "program" + n + ".dery", code: "" };
    store.files.push(f); store.active = f.id; saveStore(); renderFiles(); openFile(); closeSide();
  }

  // ── syntax highlighting ──────────────────────────────────────────────
  const KEYWORDS = ["create a website", "create a page", "add a ", "make a function", "make the ", "remember that",
    "set ", "let ", "show ", "say ", "print ", "if ", "otherwise", "else", "repeat ", "while ", "end the ",
    "call ", "add ", "subtract ", "multiply ", "divide ", "remove ", "use a ", "center everything", "make it "];
  const CONNECT = [" plus ", " minus ", " times ", " divided by ", " is more than ", " is less than ", " is at least ",
    " is at most ", " is not ", " is ", " to ", " from ", " by ", " with ", " that says ", " linking to ", " and ", " or ", " for each "];

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function highlight(src) {
    return src.split("\n").map((line) => {
      let out = esc(line);
      const hashAt = line.indexOf("#");
      const quoted = [];
      const codePart = hashAt === -1 ? line : line.slice(0, hashAt);
      const commentPart = hashAt === -1 ? "" : line.slice(hashAt);
      let html = esc(codePart);
      html = html.replace(/"[^"]*"/g, (m) => { quoted.push(m); return "\uE000" + String.fromCharCode(65 + quoted.length - 1) + "\uE001"; });
      html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="hl-num">$1</span>');
      CONNECT.forEach((c) => { html = html.split(c).join('<span class="hl-con">' + c + "</span>"); });
      let lower = html.toLowerCase();
      KEYWORDS.forEach((k) => {
        const idx = lower.indexOf(k);
        if (idx === 0) {
          const piece = html.slice(0, k.length);
          html = '<span class="hl-kw">' + piece + "</span>" + html.slice(k.length);
          lower = html.toLowerCase();
        }
      });
      html = html.replace(/\uE000([A-Z])\uE001/g, (m, ch) => '<span class="hl-str">' + quoted[ch.charCodeAt(0) - 65] + "</span>");
      if (commentPart) html += '<span class="hl-cmt">' + esc(commentPart) + "</span>";
      return html;
    }).join("\n");
  }
  // ── suggestions (English sentences) ──────────────────────────────────
  const SUGGESTIONS = [
    "Show uppercase of name",
    "Show lowercase of name",
    "Show length of name",
    "Show number of words in name",
    "Show trimmed name",
    "Show reverse of name",
    "Show round 7.6",
    "Remember that districts are a list of \"Kyenjojo\", \"Kasese\"",
    "Repeat for each place in districts:",
    "Put \"Kamwenge\" at the end of districts",
    "Show number of items in districts",
    "Show first item of districts",
    "Show the result of total with 5 and 3",
    "Make a function called total that takes a and b:",
    "Give back a plus b",
        'Add a button that says "Open BBC" that opens "https://www.bbc.com"',
    'Add a link that says "Monitor" linking to "https://www.monitor.co.ug"',
    'Show the website "https://example.com" here',
'Create a website called "My Business"',
    "Add a navigation bar with \"Home\", \"Services\", \"Contact\"",
    'Add a big heading that says "Welcome"',
    'Add a heading that says "Title"',
    'Add a paragraph that says "Write your text here"',
    'Add a button that says "Call us" linking to "tel:+256700000000"',
    'Add a list with "First item", "Second item", "Third item"',
    'Add an image showing "https://example.com/photo.jpg"',
    'Add a section called "Title"',
    "End the section",
    "Add a contact form",
    'Add a footer that says "Your business, Uganda"',
    "Make the background color dark",
    "Set the text color to white",
    "Make the buttons orange",
    "Center everything",
    "Use a wide layout",
    "Remember that price is 5000",
    "Remember that total is 0",
    "Set price to price plus 500",
    "Add 500 to price",
    "Subtract 200 from price",
    "Multiply price by 2",
    "Divide price by 3",
    'Show "Total: " plus price',
    "Show price",
    'If price is more than 1000 then show "big"',
    "If price is more than 1000:",
    "Otherwise:",
    "End the if",
    "Repeat 3 times:",
    "End the repeat",
    "While counter is less than 5:",
    "End the while",
    "Make a function called greet that takes name:",
    "End the function",
    'Call greet with "Tooro"',
    'Get the link "https://api.open-meteo.com/v1/forecast?latitude=0.65&longitude=30.28&current_weather=true" into data',
    'Show the value of "temperature" in data',
  ];

  let acItems = [], acIdx = 0, acStart = -1, acOpen = false;

  function currentLineInfo() {
    const pos = ed.selectionStart;
    const before = ed.value.slice(0, pos);
    const lineStart = before.lastIndexOf("\n") + 1;
    const lineEndRaw = ed.value.indexOf("\n", pos);
    const lineEnd = lineEndRaw === -1 ? ed.value.length : lineEndRaw;
    return { pos, lineStart, lineEnd, text: ed.value.slice(lineStart, lineEnd), beforeLine: before.slice(lineStart) };
  }

  function showAc(force) {
    const info = currentLineInfo();
    const typed = info.beforeLine;
    if (!force && typed.trim().length < 2) { hideAc(); return; }
    const lower = typed.toLowerCase().trim();
    acItems = SUGGESTIONS.filter((s) => s.toLowerCase().startsWith(lower) && s.toLowerCase() !== lower).slice(0, 7);
    if (!acItems.length) { hideAc(); return; }
    acIdx = 0; acStart = info.lineStart;
    ac.innerHTML = '<div class="ac-hint">suggestions · Tab to accept</div>' +
      acItems.map((s, i) => '<div class="ac-i' + (i === 0 ? " on" : "") + '" data-i="' + i + '">' + esc(s) + "</div>").join("");
    ac.querySelectorAll(".ac-i").forEach((el) => {
      el.addEventListener("mousedown", (ev) => { ev.preventDefault(); acIdx = Number(el.dataset.i); acceptAc(); });
    });
    placeAc();
    ac.classList.add("on");
    acOpen = true;
  }

  function placeAc() {
    const lineH = 21, padTop = 12;
    const linesBefore = ed.value.slice(0, ed.selectionStart).split("\n").length - 1;
    const top = padTop + (linesBefore + 1) * lineH - codeScroll.scrollTop;
    ac.style.top = Math.max(8, Math.min(top, codeScroll.clientHeight - 60)) + "px";
    ac.style.left = "54px";
  }

  function hideAc() { acOpen = false; ac.classList.remove("on"); }

  function acceptAc() {
    if (!acOpen || !acItems[acIdx]) return;
    const info = currentLineInfo();
    const pick = acItems[acIdx] + (/[:]$/.test(acItems[acIdx]) ? "" : "");
    const rest = ed.value.slice(info.lineEnd);
    const next = ed.value.slice(0, acStart) + pick + rest;
    const caret = acStart + pick.length;
    ed.value = next;
    ed.setSelectionRange(caret, caret);
    hideAc();
    onInput(true);
  }

  // ── gutter, refresh ──────────────────────────────────────────────────
  let badLines = [];
  function paintGutter() {
    const n = ed.value.split("\n").length;
    let out = "";
    for (let i = 1; i <= n; i++) out += '<div class="' + (badLines.includes(i) ? "bad" : "") + '">' + i + "</div>";
    gutter.innerHTML = out;
    gutter.scrollTop = codeScroll.scrollTop;
  }

  function refresh() {
    hl.innerHTML = highlight(ed.value) + "\n";
    paintGutter();
    const pos = ed.selectionStart;
    const before = ed.value.slice(0, pos);
    const ln = before.split("\n").length;
    const col = pos - before.lastIndexOf("\n");
    $("statCursor").textContent = "Ln " + ln + ", Col " + col;
    hl.scrollTop = codeScroll.scrollTop;
    hl.scrollLeft = codeScroll.scrollLeft;
  }

  // ── run ──────────────────────────────────────────────────────────────
  let lastHtml = "", runTimer = null;

  async function run(reveal) {
    const btn = $("runBtn");
    const label = btn.textContent;
    btn.textContent = "Running...";
    setTimeout(() => { btn.textContent = label; }, 400);

    const api = window.Dery;
    if (!api) {
      $("stateIc").textContent = "!";
      $("stateIc").className = "bad";
      $("stateText").textContent = "The Dery engine did not load. Reload the page.";
      return;
    }
    let res;
    try {
      if (/https?:\/\//.test(ed.value) && api.runAsync) {
        $("stateText").textContent = "Opening the links in your program...";
        res = await api.runAsync(ed.value);
      } else {
        res = api.run(ed.value);
      }
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      $("stateIc").textContent = "!";
      $("stateIc").className = "bad";
      $("stateText").textContent = "The run crashed: " + msg;
      $("console").innerHTML = '<span class="empty">The run crashed: ' + esc(msg) + '</span>';
      showView("out");
      return;
    }
    lastHtml = res.html || "";
    badLines = (res.errors || []).map((e) => e.line).filter(Boolean);
    $("site").srcdoc = lastHtml;
    const out = res.output || [];
    $("console").innerHTML = out.length
      ? out.map((l) => esc(String(l))).join("\n")
      : '<span class="empty">Nothing printed yet. Use Show to print values.</span>';
    const errs = res.errors || [];
    if (errs.length) {
      $("stateIc").textContent = "!";
      $("stateIc").className = "bad";
      $("stateText").innerHTML = errs.slice(0, 2).map((e) => "Line " + e.line + ": " + esc(e.message)).join(" · ");
      $("statCount").textContent = (res.stats && res.stats.stmts ? res.stats.stmts : 0) + " statements";
    } else {
      $("stateIc").textContent = "✓";
      $("stateIc").className = "ok";
      $("stateText").textContent = "Ran clean.";
      $("statCount").textContent = (res.stats && res.stats.stmts ? res.stats.stmts : ed.value.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).length) + " statements";
    }
    $("statLines").textContent = out.length + " lines out";
    $("liveBadge").textContent = errs.length ? "check" : "live";
    paintGutter();

    // when Run is pressed, reveal the pane that actually has something to show
    if (reveal) {
      const hasPage = !!(res.page && res.page.blocks && res.page.blocks.length);
      if (errs.length || out.length || !hasPage) showView("out");
      else showView("site");
    }
  }

  function onInput(immediate) {
    const f = activeFile();
    f.code = ed.value;
    saveStore();
    renderFiles();
    refresh();
    if (immediate) showAc(false); else showAc(false);
    clearTimeout(runTimer);
    runTimer = setTimeout(() => run(false), immediate ? 60 : 700);
  }
  // ── events ───────────────────────────────────────────────────────────
  ed.addEventListener("input", () => onInput(false));
  ed.addEventListener("keydown", (e) => {
    if (acOpen) {
      if (e.key === "ArrowDown") { e.preventDefault(); acIdx = Math.min(acIdx + 1, acItems.length - 1); paintAc(); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); acIdx = Math.max(acIdx - 1, 0); paintAc(); return; }
      if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); acceptAc(); return; }
      if (e.key === "Escape") { e.preventDefault(); hideAc(); return; }
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const s = ed.selectionStart;
      ed.value = ed.value.slice(0, s) + "  " + ed.value.slice(ed.selectionEnd);
      ed.setSelectionRange(s + 2, s + 2);
      onInput(false);
      return;
    }
    if (e.key === "Enter") {
      // keep the same indentation for block lines
      const info = currentLineInfo();
      const cur = info.text;
      const indent = (cur.match(/^\s*/) || [""])[0];
      const opensBlock = /:\s*$/.test(cur);
      e.preventDefault();
      const insert = "\n" + indent + (opensBlock ? "  " : "");
      const s = ed.selectionStart;
      ed.value = ed.value.slice(0, s) + insert + ed.value.slice(ed.selectionEnd);
      ed.setSelectionRange(s + insert.length, s + insert.length);
      onInput(false);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); hideAc(); run(true); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveStore(); $("stateText").textContent = "Saved to this device."; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") { e.preventDefault(); newFile(); }
  });

  function paintAc() {
    ac.querySelectorAll(".ac-i").forEach((el, i) => el.classList.toggle("on", i === acIdx));
    const on = ac.querySelector(".ac-i.on");
    if (on) on.scrollIntoView({ block: "nearest" });
  }

  codeScroll.addEventListener("scroll", () => {
    gutter.scrollTop = codeScroll.scrollTop;
    hl.scrollTop = codeScroll.scrollTop;
    hl.scrollLeft = codeScroll.scrollLeft;
    if (acOpen) placeAc();
  });
  ed.addEventListener("click", () => { refresh(); if (acOpen) placeAc(); });
  ed.addEventListener("keyup", (e) => { if (!acOpen) refresh(); });
  document.addEventListener("click", (e) => {
    if (!ac.contains(e.target) && e.target !== ed) hideAc();
  });

  // ── view switching (mobile) ──────────────────────────────────────────
  function showView(v) {
    const left = $("leftPane"), right = $("rightPane");
    const isSite = v === "site", isOut = v === "out";
    if (isMobile()) {
      left.classList.toggle("show", v === "write");
      right.classList.toggle("show", isSite || isOut || v === "term");
    }
    const isTerm = v === "term";
    $("site").classList.toggle("hidden", isOut || isTerm);
    $("console").classList.toggle("hidden", !isOut);
    $("term").classList.toggle("hidden", !isTerm);
    $("tabSite").classList.toggle("on", !isOut && !isTerm);
    $("tabOut").classList.toggle("on", isOut);
    $("tabTerm").classList.toggle("on", isTerm);
    document.querySelectorAll(".mini-tabs .tab").forEach((b) => b.classList.toggle("on", b.dataset.view === v));
  }
  document.querySelectorAll(".mini-tabs .tab").forEach((b) => {
    b.addEventListener("click", () => showView(b.dataset.view));
  });
  function tabTo(v) { showView(v); if (!isMobile()) return; }
  $("tabSite").addEventListener("click", () => showView("site"));
  $("tabOut").addEventListener("click", () => { showView("out"); $("termIn").blur(); });
  $("tabTerm").addEventListener("click", () => { showView("term"); setTimeout(() => $("termIn").focus(), 30); });

  // ── terminal ─────────────────────────────────────────────────────────
  const termOut = $("termOut"), termIn = $("termIn");
  let termSrc = [];       // sentences entered this session
  let termShown = 0;      // how many printed lines are already on screen
  let termHistory = [], termHistIdx = -1;

  function tPrint(text, cls) {
    const d = document.createElement("div");
    if (cls) d.className = cls;
    d.textContent = text;
    termOut.appendChild(d);
    termOut.scrollTop = termOut.scrollHeight;
  }

  function tBanner() {
    tPrint("Dery terminal — type English sentences, they run immediately.", "t-dim");
    tPrint("Try: Remember that price is 5000.   then   Show price.   (help for commands)", "t-dim");
    tPrint("", "t-dim");
  }

  function tReset(note) {
    termSrc = []; termShown = 0; termOut.innerHTML = "";
    tBanner();
    if (note) tPrint(note, "t-dim");
  }

  function tRunSession() {
    const res = window.Dery.run(termSrc.join("\n"));
    const out = res.output || [];
    for (let k = termShown; k < out.length; k++) tPrint(String(out[k]));
    termShown = out.length;
    return res;
  }

  async function tCommand(line) {
    const low = line.toLowerCase().trim();
    const word = low.split(/\s+/)[0];
    if (word === "help") {
      tPrint("Commands:", "t-ok");
      tPrint("  help                 this list");
      tPrint("  clear                empty the screen and forget values");
      tPrint("  run                  run the whole file in the editor");
      tPrint("  files                list your files");
      tPrint("  open <name>          switch to a file");
      tPrint("  new <name>           create a file");
      tPrint("  save                 save the editor to this device");
      tPrint("  site                 show the website pane");
      tPrint("  Anything else is run as a Dery sentence, for example:");
      tPrint('  Show "hello"     Remember that x is 5     Show uppercase of "tooro"', "t-dim");
      return true;
    }
    if (word === "clear") { tReset("Screen cleared."); termIn.focus(); return true; }
    if (word === "run") {
      const res = /https?:\/\//.test(ed.value) && window.Dery.runAsync
        ? await window.Dery.runAsync(ed.value)
        : window.Dery.run(ed.value);
      tPrint("> run " + activeFile().name, "t-cmd");
      const out = res.output || [];
      out.forEach((l) => tPrint(String(l)));
      (res.errors || []).forEach((e) => tPrint("Line " + e.line + ": " + e.message, "t-err"));
      if (!out.length && !(res.errors || []).length) tPrint("Ran with no output.", "t-dim");
      return true;
    }
    if (word === "files") {
      store.files.forEach((f) => tPrint((f.id === store.active ? "* " : "  ") + f.name));
      return true;
    }
    if (word === "open") {
      const name = line.slice(4).trim().toLowerCase();
      const f = store.files.find((x) => x.name.toLowerCase() === name || x.id === name);
      if (!f) { tPrint("No file called " + name + ". Type files to see them.", "t-err"); return true; }
      store.active = f.id; saveStore(); openFile(); renderFiles();
      tPrint("Opened " + f.name, "t-ok");
      return true;
    }
    if (word === "new") {
      const raw = line.slice(3).trim();
      const name = raw ? (/^[\w.-]+$/.test(raw) ? (/\.dery$/i.test(raw) ? raw : raw + ".dery") : null) : null;
      if (raw && !name) { tPrint("File names should be one word, like shop.dery", "t-err"); return true; }
      if (name && store.files.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
        tPrint("There is already a file called " + name, "t-err"); return true;
      }
      const f = { id: "f" + Date.now(), name: name || "untitled" + (store.files.length + 1) + ".dery", code: "" };
      store.files.push(f); store.active = f.id; saveStore(); renderFiles(); openFile();
      tPrint("Created " + f.name, "t-ok");
      return true;
    }
    if (word === "save") { saveStore(); tPrint("Saved to this device.", "t-ok"); return true; }
    if (word === "site") { showView("site"); return true; }
    return false;
  }

  async function tSubmit() {
    const line = termIn.value.trim();
    termIn.value = "";
    if (!line) return;
    termHistory.push(line); termHistIdx = termHistory.length;
    tPrint("> " + line, "t-cmd");
    if (await tCommand(line)) return;

    const attempt = termSrc.concat([line]);
    let res;
    try {
      res = /https?:\/\//.test(attempt.join("\n")) && window.Dery.runAsync
        ? await window.Dery.runAsync(attempt.join("\n"))
        : window.Dery.run(attempt.join("\n"));
    } catch (err) {
      tPrint("That crashed: " + (err && err.message ? err.message : String(err)), "t-err");
      return;
    }
    const errs = res.errors || [];
    if (errs.length) {
      errs.forEach((e) => tPrint("Line " + e.line + ": " + e.message, "t-err"));
      return; // keep the session clean, the bad line is dropped
    }
    termSrc = attempt;
    const out = res.output || [];
    for (let k = termShown; k < out.length; k++) tPrint(String(out[k]));
    termShown = out.length;
  }

  termIn.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); tSubmit(); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!termHistory.length) return;
      termHistIdx = Math.max(0, termHistIdx - 1);
      termIn.value = termHistory[termHistIdx] || "";
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!termHistory.length) return;
      termHistIdx = Math.min(termHistory.length, termHistIdx + 1);
      termIn.value = termHistory[termHistIdx] || "";
      return;
    }
  });

  tBanner();

  // ── side drawer ──────────────────────────────────────────────────────
  function openSide() { $("side").classList.add("on"); $("scrim").classList.add("on"); }
  function closeSide() { $("side").classList.remove("on"); $("scrim").classList.remove("on"); }
  $("menuBtn").addEventListener("click", () => { $("side").classList.contains("on") ? closeSide() : openSide(); });
  $("scrim").addEventListener("click", closeSide);
  $("newFileBtn").addEventListener("click", newFile);

  // ── help sheet ───────────────────────────────────────────────────────
  $("helpBtn").addEventListener("click", () => $("sheet").classList.add("on"));
  $("sheet").addEventListener("click", (e) => { if (e.target === $("sheet")) $("sheet").classList.remove("on"); });

  // ── run + save buttons ───────────────────────────────────────────────
  $("runBtn").addEventListener("click", () => { hideAc(); run(true); });
  $("saveHtmlBtn").addEventListener("click", () => {
    run();
    const name = (activeFile().name || "site").replace(/\.dery$/i, "");
    const blob = new Blob([lastHtml || "<!doctype html><title>Empty</title>"], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name + ".html";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });

  // ── boot ─────────────────────────────────────────────────────────────
  renderFiles();
  openFile();
  run();
  if (isMobile()) showView("write");
  window.addEventListener("resize", () => { if (!isMobile()) { $("leftPane").classList.add("show"); $("rightPane").classList.add("show"); } });
})();
