/* ════════════════════════════════════════════════════════════════════════
   dery2.js — the Dery language, version 2
   A real programming language written in plain English.

   It has what other languages have:
     variables · maths · text · conditions · loops · functions
   plus what no other language has:
     sentences that build a website.

   No dependencies. Runs in the browser and in Node.
   ════════════════════════════════════════════════════════════════════════ */
(function (root) {
  "use strict";

  const COLORS = {
    black: "#000000", white: "#ffffff", orange: "#FF8A00", blue: "#2563EB",
    red: "#DC2626", green: "#16A34A", yellow: "#EAB308", purple: "#7C3AED",
    pink: "#EC4899", grey: "#6B7280", gray: "#6B7280", gold: "#D4AF37",
    navy: "#0B1224", dark: "#0B1224", light: "#F8FAFC", brown: "#78350F",
    teal: "#0D9488", sky: "#38BDF8",
  };
  const toColor = (n, fb) => {
    if (!n) return fb;
    const t = String(n).trim().toLowerCase();
    if (COLORS[t]) return COLORS[t];
    if (/^#?[0-9a-f]{3,8}$/i.test(t)) return t.startsWith("#") ? t : "#" + t;
    return fb;
  };

  /* ── values ───────────────────────────────────────────────────────── */
  const isNum = (v) => typeof v === "number";
  const show = (v) => {
    if (v === null || v === undefined) return "nothing";
    if (v === true) return "yes";
    if (v === false) return "no";
    if (Array.isArray(v)) return v.map(show).join(", ");
    return String(v);
  };
  // split `"a", "b", c` on commas that sit outside quotes
  const splitTop = (src) => {
    const out = [];
    let buf = "", inq = false;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (c === '"') { inq = !inq; buf += c; continue; }
      if (!inq && c === ",") { out.push(buf); buf = ""; continue; }
      buf += c;
    }
    out.push(buf);
    return out.map((x) => x.trim()).filter(Boolean);
  };
  const num = (v) => {
    if (typeof v === "number") return v;
    if (typeof v === "boolean") return v ? 1 : 0;
    const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
    return isNaN(n) ? 0 : n;
  };

  /* ── expression parser (English words, normal precedence) ─────────── */
  function tokenizeExpr(text) {
    const out = [];
    const re = /"([^"]*)"|#?[A-Za-z_][A-Za-z0-9_]*|[-+]?\d*\.?\d+|[()]/g;
    let m;
    while ((m = re.exec(text))) {
      if (m[1] !== undefined) out.push({ t: "str", v: m[1] });
      else if (/^-?\d*\.?\d+$/.test(m[0])) out.push({ t: "num", v: parseFloat(m[0]) });
      else if (m[0] === "(" || m[0] === ")") out.push({ t: m[0] });
      else out.push({ t: "word", v: m[0] });
    }
    return out;
  }

  const OPWORDS = {
    plus: "+", "added to": "+", minus: "-", "take away": "-",
    times: "*", "multiplied by": "*", "divided by": "/", over: "/",
    mod: "%", remainder: "%",
  };

  function parseExpr(text) {
    const toks = tokenizeExpr(text);
    let i = 0;
    const peek = () => toks[i];
    const next = () => toks[i++];

    function matchWords(...words) {
      // try to match a multi-word operator at the current position
      for (const w of words) {
        const parts = w.split(" ");
        let ok = true;
        for (let k = 0; k < parts.length; k++) {
          const tk = toks[i + k];
          if (!tk || tk.t !== "word" || tk.v.toLowerCase() !== parts[k]) { ok = false; break; }
        }
        if (ok) { i += parts.length; return w; }
      }
      return null;
    }

    function parseLogic() {
      let left = parseComparison();
      for (;;) {
        const w = matchWords("and", "or");
        if (!w) return left;
        const right = parseComparison();
        left = { k: "bin", op: w, a: left, b: right };
      }
    }

    function parseComparison() {
      let left = parseSum();
      for (;;) {
        const w = matchWords(
          "is more than", "is greater than", "is bigger than", "is above", "is over",
          "is less than", "is smaller than", "is below", "is under",
          "does not contain", "doesn't contain", "contains",
          "is at least", "is at most", "is not", "is exactly", "is equal to", "is", "equals", "equal to"
        );
        if (!w) return left;
        const right = parseSum();
        let op = "==";
        if (/more than|greater than|bigger than|above|over/.test(w)) op = ">";
        else if (/less than|smaller than|below|under/.test(w)) op = "<";
        else if (/at least/.test(w)) op = ">=";
        else if (/at most/.test(w)) op = "<=";
        else if (/does ?n.t contain/.test(w)) op = "ncontains";
        else if (/\bcontains\b/.test(w)) op = "contains";
        else if (/not/.test(w)) op = "!=";
        left = { k: "bin", op, a: left, b: right };
      }
    }

    function parseSum() {
      let left = parseProduct();
      for (;;) {
        const w = matchWords("plus", "added to", "minus", "take away");
        if (!w) return left;
        const right = parseProduct();
        left = { k: "bin", op: OPWORDS[w] || "+", a: left, b: right };
      }
    }

    function parseProduct() {
      let left = parseAtom();
      for (;;) {
        const w = matchWords("times", "multiplied by", "divided by", "over", "mod", "remainder");
        if (!w) return left;
        const right = parseAtom();
        left = { k: "bin", op: OPWORDS[w] || "*", a: left, b: right };
      }
    }

    function parseAtom() {
      const tk = peek();
      if (!tk) return { k: "lit", v: null };
      if (tk.t === "num") { next(); return { k: "lit", v: tk.v }; }
      if (tk.t === "str") { next(); return { k: "lit", v: tk.v }; }
      if (tk.t === "(") {
        next();
        const e = parseLogic();
        if (peek() && peek().t === ")") next();
        return e;
      }
      if (tk.t === "word") {
        // W(0) is the current word, W(1) the one after it
        const W = (n) => { const t = toks[i + n]; return t && t.t === "word" ? t.v.toLowerCase() : null; };
        const take = (n) => { i += n; };

        if (W(0) === "the" && W(1) === "value" && W(2) === "of") {
          take(3);
          const kt = peek();
          let key = null;
          if (kt && kt.t === "str") { key = kt.v; next(); }
          else if (kt && kt.t === "word") { key = kt.v; next(); }
          if (W(0) === "in") take(1);
          return { k: "field", key, a: parseAtom() };
        }

        if (W(0) === "the" && W(1) === "result" && W(2) === "of") {
          take(3);
          const nt = peek();
          if (!nt || nt.t !== "word") return { k: "lit", v: null };
          const fname = nt.v; next();
          const fargs = [];
          if (W(0) === "with" || W(0) === "of" || W(0) === "using") {
            take(1);
            for (;;) {
              fargs.push(parseAtom());
              if (W(0) === "and") { take(1); continue; }
              break;
            }
          }
          return { k: "fcall", name: fname, args: fargs };
        }
        if (W(0) === "length" && W(1) === "of") { take(2); return { k: "len", a: parseAtom() }; }
        if (W(0) === "number" && W(1) === "of" && (W(2) === "items" || W(2) === "letters" || W(2) === "characters" || W(2) === "words")) {
          const which = W(2);
          take(4);
          return which === "words" ? { k: "words", a: parseAtom() } : { k: "len", a: parseAtom() };
        }
        if (W(0) === "uppercase" && W(1) === "of") { take(2); return { k: "upper", a: parseAtom() }; }
        if (W(0) === "lowercase" && W(1) === "of") { take(2); return { k: "lower", a: parseAtom() }; }
        if (W(0) === "first" && W(1) === "word" && W(2) === "of") { take(3); return { k: "firstword", a: parseAtom() }; }
        if (W(0) === "last" && W(1) === "word" && W(2) === "of") { take(3); return { k: "lastword", a: parseAtom() }; }
        if (W(0) === "first" && W(1) === "item" && W(2) === "of") { take(3); return { k: "firstitem", a: parseAtom() }; }
        if (W(0) === "last" && W(1) === "item" && W(2) === "of") { take(3); return { k: "lastitem", a: parseAtom() }; }
        if (W(0) === "reverse" && W(1) === "of") { take(2); return { k: "reverse", a: parseAtom() }; }
        if (W(0) === "trimmed") { take(1); return { k: "trim", a: parseAtom() }; }
        if (W(0) === "round") { take(1); return { k: "round", a: parseAtom() }; }
        if (W(0) === "item") {
          if (W(1) === "of") { take(2); return { k: "firstitem", a: parseAtom() }; }
          const nt2 = toks[i + 1];
          if (nt2 && nt2.t === "num" && W(2) === "of") { const nIdx = nt2.v; take(3); return { k: "atitem", a: parseAtom(), idx: nIdx }; }
        }
        next();
        const low = tk.v.toLowerCase();
        if (low === "it" && i > 0) return { k: "var", name: "it" };
        if (low === "minus" || low === "-") {
          const inner = parseAtom();
          return { k: "bin", op: "-", a: { k: "lit", v: 0 }, b: inner };
        }
        return { k: "var", name: tk.v };
      }
      next();
      return { k: "lit", v: null };
    }

    return parseLogic();
  }

  /* ── runtime ──────────────────────────────────────────────────────── */
  class Scope {
    constructor(parent) { this.vars = Object.create(null); this.parent = parent || null; }
    get(name) {
      let s = this;
      while (s) {
        if (name in s.vars) return s.vars[name];
        s = s.parent;
      }
      return undefined;
    }
    has(name) {
      let s = this;
      while (s) { if (name in s.vars) return true; s = s.parent; }
      return false;
    }
    set(name, v) {
      let s = this;
      while (s) {
        if (name in s.vars) { s.vars[name] = v; return v; }
        s = s.parent;
      }
      this.vars[name] = v;   // declare where we are
      return v;
    }
    declare(name, v) { this.vars[name] = v; return v; }
  }

  function evalExpr(node, scope, rt) {
    if (!node) return null;
    switch (node.k) {
      case "lit": return node.v;
      case "listlit": return node.items.map((it) => evalExpr(it, scope, rt));
      case "len": {
        const v = evalExpr(node.a, scope, rt);
        return Array.isArray(v) ? v.length : String(show(v)).length;
      }
      case "words": return String(show(evalExpr(node.a, scope, rt))).trim().split(/\s+/).filter(Boolean).length;
      case "upper": return String(show(evalExpr(node.a, scope, rt))).toUpperCase();
      case "lower": return String(show(evalExpr(node.a, scope, rt))).toLowerCase();
      case "trim": return String(show(evalExpr(node.a, scope, rt))).trim();
      case "round": return Math.round(num(evalExpr(node.a, scope, rt)));
      case "firstword": return String(show(evalExpr(node.a, scope, rt))).trim().split(/\s+/)[0] || "";
      case "lastword": {
        const w2 = String(show(evalExpr(node.a, scope, rt))).trim().split(/\s+/);
        return w2[w2.length - 1] || "";
      }
      case "reverse": {
        const rv = evalExpr(node.a, scope, rt);
        return Array.isArray(rv) ? rv.slice().reverse() : String(show(rv)).split("").reverse().join("");
      }
      case "firstitem": {
        const fi = evalExpr(node.a, scope, rt);
        return Array.isArray(fi) ? fi[0] : String(show(fi)).trim().split(/\s+/)[0];
      }
      case "lastitem": {
        const li = evalExpr(node.a, scope, rt);
        if (Array.isArray(li)) return li[li.length - 1];
        const wl = String(show(li)).trim().split(/\s+/);
        return wl[wl.length - 1];
      }
      case "atitem": {
        const ai = evalExpr(node.a, scope, rt);
        return Array.isArray(ai) ? ai[Math.round(node.idx) - 1] : null;
      }
      case "field": {
        const obj = evalExpr(node.a, scope, rt);
        if (Array.isArray(obj) && /^\d+$/.test(String(node.key))) return obj[Number(node.key) - 1];
        if (obj && typeof obj === "object") {
          const v = obj[node.key];
          return v === undefined ? null : v;
        }
        return null;
      }
      case "fcall": return rt.call ? rt.call(node.name, node.args.map((ax) => evalExpr(ax, scope, rt)), scope) : null;
      case "var": {
        const name = node.name;
        if (scope.has(name)) return scope.get(name);
        const low = String(name).toLowerCase();
        if (low === "nothing" || low === "empty") return null;
        if (low === "yes" || low === "true") return true;
        if (low === "no" || low === "false") return false;
        if (low === "pi") return Math.PI;
        rt.warn(`I don't know the word "${name}" yet — treat it as empty.`);
        return undefined;
      }
      case "bin": {
        const a = evalExpr(node.a, scope, rt);
        const b = evalExpr(node.b, scope, rt);
        switch (node.op) {
          case "and": return truthy(a) && truthy(b);
          case "or": return truthy(a) || truthy(b);
          case "+":
            if (typeof a === "string" || typeof b === "string") return show(a) + show(b);
            return num(a) + num(b);
          case "-": return num(a) - num(b);
          case "*": return num(a) * num(b);
          case "/": {
            const d = num(b);
            if (d === 0) { rt.error("I cannot divide by zero."); return 0; }
            return num(a) / d;
          }
          case "%": {
            const d = num(b);
            if (d === 0) { rt.error("I cannot divide by zero."); return 0; }
            return num(a) % d;
          }
          case ">": return num(a) > num(b);
          case "<": return num(a) < num(b);
          case ">=": return num(a) >= num(b);
          case "<=": return num(a) <= num(b);
          case "==": {
            if (typeof a === "string" || typeof b === "string") return show(a) === show(b);
            return num(a) === num(b);
          }
          case "!=": {
            if (typeof a === "string" || typeof b === "string") return show(a) !== show(b);
            return num(a) !== num(b);
          }
          case "contains": return show(a).toLowerCase().includes(show(b).toLowerCase());
          case "ncontains": return !show(a).toLowerCase().includes(show(b).toLowerCase());
          default: return null;
        }
      }
      default: return null;
    }
  }

  function truthy(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    const s = String(v).trim().toLowerCase();
    return s !== "" && s !== "no" && s !== "false" && s !== "nothing";
  }

  /* ── program parsing (line based, block with End) ─────────────────── */
  const clean = (s) => s.replace(/\s+/g, " ").trim();

  function parseProgram(source) {
    const raw = String(source).split(/\r?\n/);
    const lines = [];
    for (let i = 0; i < raw.length; i++) {
      const t = raw[i].trim();
      if (!t || t.startsWith("#")) continue;
      lines.push({ n: i + 1, text: clean(t) });
    }
    let idx = 0;
    const errors = [];

    function parseBlock() {
      const stmts = [];
      while (idx < lines.length) {
        const line = lines[idx];
        const low = line.text.toLowerCase();

        if (/^(end|finish|close)\b/.test(low) && !/^end the (if|repeat|while|function)/.test(low) === false) {
          // any 'end ...' closes the block
          idx++;
          return { stmts, closed: true };
        }
        if (/^(end|finish)\b/.test(low)) { idx++; return { stmts, closed: true }; }

        /* ── otherwise / else ─────────────────────────────────────── */
        if (/^(otherwise|else)\b/.test(low)) {
          idx++;
          return { stmts, closed: false, otherwise: true, line: line.n };
        }

        /* ── if ───────────────────────────────────────────────────── */
        if (/^if\b/.test(low)) {
          const body = line.text.slice(2).trim();
          const inline = body.match(/^(.*?)\s+then\s+(.*)$/i);
          if (inline) {
            stmts.push({
              k: "if",
              cond: parseExpr(inline[1]),
              then: [parseInlineStatement(inline[2], line.n, errors)],
              else: null,
              line: line.n,
            });
            idx++;
            continue;
          }
          const condText = body.replace(/[:.]$/, "").replace(/\s+then$/, "");
          idx++;
          const thenBlock = parseBlock();
          let elseBlock = null;
          if (thenBlock.otherwise) {
            const eb = parseBlock();
            elseBlock = eb.stmts;
          }
          stmts.push({ k: "if", cond: parseExpr(condText), then: thenBlock.stmts, else: elseBlock, line: line.n });
          continue;
        }

        /* ── repeat for each NAME in LIST ────────────────────────── */
        const each = line.text.match(/^(?:repeat\s+)?for\s+each\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+(.+?)\s*:?$/i);
        if (each) {
          idx++;
          const body = parseBlock();
          stmts.push({ k: "foreach", var: each[1], list: parseExpr(each[2]), body: body.stmts, line: line.n });
          continue;
        }

        /* ── repeat N times ──────────────────────────────────────── */
        const rep = low.match(/^repeat\s+(.+?)\s+times?\b/);
        if (rep) {
          const countText = line.text.slice(line.text.toLowerCase().indexOf("repeat") + 6, line.text.toLowerCase().search(/\s+times?\b/));
          idx++;
          const body = parseBlock();
          stmts.push({ k: "repeat", count: parseExpr(countText.trim()), body: body.stmts, line: line.n });
          continue;
        }

        /* ── while ───────────────────────────────────────────────── */
        if (/^while\b/.test(low)) {
          const condText = line.text.slice(5).trim().replace(/[:.]$/, "");
          idx++;
          const body = parseBlock();
          stmts.push({ k: "while", cond: parseExpr(condText), body: body.stmts, line: line.n });
          continue;
        }

        /* ── function definition ─────────────────────────────────── */
        const fn = line.text.match(/^(?:make|create|define)\s+a?\s*function\s+(?:called|named)\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(?:that\s+)?takes?\s+(.+?))?\s*:?$/i);
        if (fn) {
          const name = fn[1];
          const params = (fn[2] || "")
            .replace(/\band\b/gi, ",")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => s.replace(/^(the\s+)?(value\s+)?/i, "").trim());
          idx++;
          const body = parseBlock();
          stmts.push({ k: "func", name, params, body: body.stmts, line: line.n });
          continue;
        }

        /* ── call ────────────────────────────────────────────────── */
        const call = line.text.match(/^(?:call|run|use)\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+with\s+(.+?))?\s*\.?$/i);
        if (call) {
          const args = (call[2] || "")
            .split(/\s*,\s*|\s+and\s+/i)
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => parseExpr(s));
          stmts.push({ k: "call", name: call[1], args, line: line.n });
          idx++;
          continue;
        }

        /* ── put something at the end of a list ──────────────────── */
        const listAdd = line.text.match(/^(?:put|add|append)\s+(.+?)\s+(?:at\s+the\s+end\s+of|to\s+the\s+end\s+of|to\s+the\s+list|into\s+the\s+list|in)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\.?$/i);
        if (listAdd && !/^\s*\d/.test(listAdd[1])) {
          stmts.push({ k: "listadd", name: listAdd[2], expr: parseExpr(listAdd[1]), line: line.n });
          idx++;
          continue;
        }

        /* ── give a value back out of a function ─────────────────── */
        const give = line.text.match(/^(?:give\s+back|return|send\s+back)\s+(.+?)\s*\.?$/i);
        if (give) {
          stmts.push({ k: "give", expr: parseExpr(give[1].replace(/\.$/, "")), line: line.n });
          idx++;
          continue;
        }

        /* ── open a link and keep the answer ─────────────────────── */
        const getLink = line.text.match(/^(?:get|open|read|load|fetch|bring)\s+(?:the\s+)?(?:(?:link|page|url|web ?page|data|answer)\s+)?(?:"([^"]+)"|(\S+))\s+(?:in ?to|as|inside)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\.?$/i);
        if (getLink) {
          const urlText = getLink[1] || getLink[2];
          const target = getLink[3];
          stmts.push({ k: "fetch", url: { k: "lit", v: urlText }, target, line: line.n });
          idx++;
          continue;
        }

        const getTitle = line.text.match(/^(?:get|read)\s+the\s+title\s+of\s+(?:the\s+)?(?:(?:link|page|url|web ?page)\s+)?(?:"([^"]+)"|(\S+))\s+(?:in ?to|as|inside)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\.?$/i);
        if (getTitle) {
          const urlText = getTitle[1] || getTitle[2];
          stmts.push({ k: "fetchTitle", url: { k: "lit", v: urlText }, target: getTitle[3], line: line.n });
          idx++;
          continue;
        }

        /* ── variables ───────────────────────────────────────────── */
        const assign = line.text.match(/^(?:remember that|remember|let|set|make|put)\s+([A-Za-z_][A-Za-z0-9_]*)\s+(?:is|are|to|be|equal to|as)\s+(.+?)\s*\.?$/i);
        if (assign) {
          const rawExpr = assign[2].replace(/\.$/, "").trim();
          const lm = rawExpr.match(/^(?:a|an|the)?\s*(?:list|group|set)\s+of\s+(.+)$/i);
          if (lm) {
            const items = splitTop(lm[1]).map((x) => parseExpr(x));
            stmts.push({ k: "assign", name: assign[1], expr: { k: "listlit", items }, line: line.n });
            idx++;
            continue;
          }
          // "add N to X" style is handled below; here plain assignment
          stmts.push({ k: "assign", name: assign[1], expr: parseExpr(rawExpr), line: line.n });
          idx++;
          continue;
        }

        /* ── arithmetic updates ──────────────────────────────────── */
        const addTo = line.text.match(/^add\s+(.+?)\s+to\s+([A-Za-z_][A-Za-z0-9_]*)\s*\.?$/i);
        if (addTo) {
          stmts.push({ k: "update", name: addTo[2], op: "+", expr: parseExpr(addTo[1]), line: line.n });
          idx++;
          continue;
        }
        const subFrom = line.text.match(/^(?:subtract|take)\s+(.+?)\s+(?:from|away from)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\.?$/i);
        if (subFrom) {
          stmts.push({ k: "update", name: subFrom[2], op: "-", expr: parseExpr(subFrom[1]), line: line.n });
          idx++;
          continue;
        }
        const mulBy = line.text.match(/^multiply\s+([A-Za-z_][A-Za-z0-9_]*)\s+by\s+(.+?)\s*\.?$/i);
        if (mulBy) {
          stmts.push({ k: "update", name: mulBy[1], op: "*", expr: parseExpr(mulBy[2]), line: line.n });
          idx++;
          continue;
        }
        const divBy = line.text.match(/^divide\s+([A-Za-z_][A-Za-z0-9_]*)\s+by\s+(.+?)\s*\.?$/i);
        if (divBy) {
          stmts.push({ k: "update", name: divBy[1], op: "/", expr: parseExpr(divBy[2]), line: line.n });
          idx++;
          continue;
        }

        /* ── output ──────────────────────────────────────────────── */
        const say = line.text.match(/^(?:show|say|print|display|write)\s+(?!the\s+(?:web ?site|web ?page|page|site)\b)(.+?)\s*\.?$/i);
        if (say) {
          stmts.push({ k: "show", expr: parseExpr(say[1].replace(/\.$/, "")), line: line.n });
          idx++;
          continue;
        }

        /* ── website sentences ───────────────────────────────────── */
        const page = parsePageSentence(line.text);
        if (page) {
          stmts.push({ k: "page", page, line: line.n });
          idx++;
          continue;
        }

        errors.push({ line: line.n, text: line.text, message: `I don't understand this sentence: "${line.text}"`, hint: "Try: Show 5 plus 3. Or: Add a heading that says \"Hello\"." });
        idx++;
      }
      return { stmts, closed: false };
    }

    const program = parseBlock();
    return { program: program.stmts, errors };
  }

  // inline statements used by "if ... then ..." and single-action repeats
  function parseInlineStatement(text, lineNo, errors) {
    const t = clean(text).replace(/\.$/, "");
    const say = t.match(/^(?:show|say|print|display|write)\s+(.+)$/i);
    if (say) return { k: "show", expr: parseExpr(say[1]), line: lineNo };
    const assign = t.match(/^(?:remember that|remember|let|set|make|put)\s+([A-Za-z_][A-Za-z0-9_]*)\s+(?:is|to|be|equal to|as)\s+(.+)$/i);
    if (assign) return { k: "assign", name: assign[1], expr: parseExpr(assign[2]), line: lineNo };
    const addTo = t.match(/^add\s+(.+?)\s+to\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
    if (addTo) return { k: "update", name: addTo[2], op: "+", expr: parseExpr(addTo[1]), line: lineNo };
    const call = t.match(/^(?:call|run|use)\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+with\s+(.+))?$/i);
    if (call) {
      const args = (call[2] || "").split(/\s*,\s*|\s+and\s+/i).map((s) => s.trim()).filter(Boolean).map((s) => parseExpr(s));
      return { k: "call", name: call[1], args, line: lineNo };
    }
    const page = parsePageSentence(t);
    if (page) return { k: "page", page, line: lineNo };
    errors.push({ line: lineNo, text: t, message: `I don't understand "${t}" after "then".`, hint: "Use: if price is more than 10 then show \"expensive\"." });
    return { k: "nop", line: lineNo };
  }

  /* ── website sentences ─────────────────────────────────────────────── */
  function quoted(s) {
    const out = [];
    const re = /"([^"]*)"/g;
    let m;
    while ((m = re.exec(s))) out.push(m[1]);
    return out;
  }

  // evaluate text that may mix quotes and expressions: says "Hi " plus name
  function parseTextAndExpr(rest) {
    const parts = [];
    const re = /"([^"]*)"|(.+?)(?=\s+plus\s+"|\s*$)/g;
    // simpler: split on ' plus ' outside quotes
    const chunks = [];
    let buf = "", inq = false;
    const src = rest;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (c === '"') { inq = !inq; buf += c; continue; }
      if (!inq && src.slice(i, i + 6).toLowerCase() === " plus ") {
        chunks.push(buf); buf = ""; i += 5; continue;
      }
      buf += c;
    }
    chunks.push(buf);
    for (const ch of chunks) {
      const t = ch.trim();
      if (!t) continue;
      if (t.startsWith('"') && t.endsWith('"')) parts.push({ lit: t.slice(1, -1) });
      else parts.push({ expr: parseExpr(t) });
    }
    return parts;
  }

  function textNode(parts) {
    return { type: "text", parts };
  }

  function parsePageSentence(textIn) {
    const text = String(textIn).replace(/\.+$/, "");
    const low = text.toLowerCase();
    const qs = quoted(text);
    const first = qs[0] || "";

    // ══ pictures from your computer (named in the picture library) ══
    const heroPic = text.match(/^(?:add|use|put)\s+(?:a\s+)?(?:hero|cover|banner)\b[\s\S]*?\b(?:picture|image|photo)\b\s*(?:called|named)?\s*"([^"]+)"/i)
      || text.match(/^(?:add|use|put)\s+(?:a\s+)?(?:hero|cover|banner)\s+(?:called|named)\s+"([^"]+)"/i);
    if (heroPic) {
      // the heading is whichever other quoted words appear
      const words = qs.filter((q) => q !== heroPic[1]);
      const h = text.match(/\b(?:says|saying|that says|with the heading|heading)\s+"([^"]+)"/i);
      return { type: "hero", image: heroPic[1], title: h ? h[1] : (words[0] || ""), height: (text.match(/\b(\d{3})\s*(?:pixels|px|tall)\b/i) || [])[1] };
    }

    const gallery = text.match(/^add\s+(?:a\s+)?(?:photo\s+|picture\s+)?gallery\b/i);
    if (gallery) {
      const names = qs.slice();
      return { type: "gallery", items: names, columns: Number((text.match(/\b(\d)\s+columns?\b/i) || [])[1]) || 3 };
    }

    const card = text.match(/^add\s+(?:a\s+)?card\b/i);
    if (card) {
      const t = text.match(/\b(?:called|titled|named|for)\s+"([^"]+)"/i);
      const b = text.match(/\b(?:saying|that says|with the text|reading)\s+"([^"]+)"/i);
      const pic = text.match(/\b(?:picture|image|photo)\b\s*(?:called|named)?\s*"([^"]+)"/i);
      const price = text.match(/\b(?:for|at)\s+(?:ugx\s*)?([\d,]+)/i);
      const btn = text.match(/\b(?:button|link)\s+"([^"]+)"/i);
      return {
        type: "card",
        title: t ? t[1] : (b ? "" : (qs[0] || "Card")),
        text: b ? b[1] : "",
        image: pic ? pic[1] : "",
        price: price ? price[1] : "",
        button: btn ? btn[1] : "",
      };
    }

    const priceList = text.match(/^add\s+(?:a\s+)?(?:price|menu)\s*(?:list|table)?\b/i) && /\bprice|menu\b/i.test(low);
    if (priceList) {
      const pairs = [];
      const re = /"([^"]+)"\s*(?:at|for|=|-|:)?\s*(?:ugx\s*)?([\d,]{2,})/gi;
      let m;
      while ((m = re.exec(text))) pairs.push({ label: m[1], price: m[2].replace(/[^0-9]/g, "") });
      if (!pairs.length) {
        for (let i = 0; i + 1 < qs.length; i += 2) pairs.push({ label: qs[i], price: qs[i + 1] });
      }
      return { type: "prices", items: pairs };
    }

    const question = text.match(/^add\s+(?:a\s+)?(?:question|faq)\s+"([^"]+)"\s*(?:with\s+the\s+answer|answered?|saying)?\s*"?([^"]*)"?/i);
    if (question) {
      return { type: "faqItem", q: question[1], a: (qs[1] || "").trim() };
    }

    const testimonial = text.match(/^add\s+(?:a\s+)?(?:testimonial|review|quote)\b/i);
    if (testimonial) {
      const who = text.match(/\b(?:from|by)\s+"([^"]+)"/i);
      const what = text.match(/\b(?:saying|that says|reading)\s+"([^"]+)"/i);
      return { type: "quote", text: what ? what[1] : (qs[0] || ""), who: who ? who[1] : (qs[1] || "") };
    }

    const contact = text.match(/^add\s+(?:a\s+)?contact\b/i);
    if (contact) {
      const phone = text.match(/\b(?:phone|tel|call|whatsapp)\s*"+?([+0-9][0-9\s-]{6,})/i);
      const email = text.match(/\bemail\s+"?([^"\s,]+@[^"\s,]+)/i);
      const addr = text.match(/\b(?:address|located at|at)\s+"([^"]+)"/i);
      return {
        type: "contact",
        phone: phone ? phone[1].trim() : (qs[0] && /[+0-9]/.test(qs[0]) ? qs[0] : ""),
        email: email ? email[1] : "",
        address: addr ? addr[1] : "",
      };
    }

    const waFloat = text.match(/^add\s+(?:a\s+)?(?:floating|sticky|fixed)\s+whatsapp\b.*?([+0-9][0-9\s-]{6,})/i);
    if (waFloat) return { type: "whatsappFloat", phone: waFloat[1].trim().replace(/\s+/g, "") };

    const footNav = text.match(/^add\s+(?:a\s+)?(?:footer|bottom)\b/i);
    if (footNav && qs.length > 1) {
      const phone = text.match(/\b(?:phone|call|whatsapp)\s*"+?([+0-9][0-9\s-]{6,})/i);
      return { type: "footerNav", items: qs.slice(), phone: phone ? phone[1].trim() : (text.match(/\b([+0-9][0-9\s-]{8,})/) ? text.match(/\b([+0-9][0-9\s-]{8,})/)[1].trim() : "") };
    }

    const sectionBg = text.match(/^add\s+(?:a\s+)?section\s+(?:called|named|titled)\s+"([^"]+)"\s+(?:with|using)\s+the\s+(?:background\s+)?(?:picture|image|photo)\s+(?:called|named)\s+"([^"]+)"/i);
    if (sectionBg) return { type: "sectionStart", title: sectionBg[1], bgImage: sectionBg[2] };

    const steps = text.match(/^add\s+(?:the\s+)?(?:number|step)\s*(?:list|steps)\b/i);
    if (steps && qs.length) return { type: "steps", items: qs.slice() };

    if (/^(create|make|start|build)\b.*\b(page|website|site|document)\b/.test(low)) {
      return { type: "title", value: first || (text.match(/\b(?:called|named)\s+(.+)$/i) || [, "My Website"])[1] };
    }
    if (/^(set|make|change)\b.*\bbackground\b/.test(low)) {
      const c = pickColor(text, qs);
      if (c) return { type: "bg", value: c };
    }
    if (/^(set|make|change)\b.*\btext\b.*\bcolou?r\b/.test(low)) {
      const c = pickColor(text, qs);
      if (c) return { type: "textcolor", value: c };
    }
    if (/^(set|make|change)\b.*\b(accent|buttons?|highlights?)\b/.test(low)) {
      const c = pickColor(text, qs);
      if (c) return { type: "accent", value: c };
    }
    // ── themes: one sentence sets colours, font and shape together ──
    const THEMES = {
      dark:   { bg: "#0B1224", text: "#F8FAFC", accent: "#FF8A00", fontName: "Inter", radius: 14, shadow: "strong" },
      light:  { bg: "#FFFFFF", text: "#111827", accent: "#2563EB", fontName: "Inter", radius: 12, shadow: "soft" },
      warm:   { bg: "#FFF7ED", text: "#3F2A1D", accent: "#EA580C", fontName: "Georgia", radius: 16, shadow: "soft" },
      luxury: { bg: "#0A0A0A", text: "#F5E9D0", accent: "#D4AF37", fontName: "Playfair Display", radius: 4, shadow: "strong" },
      minimal:{ bg: "#FFFFFF", text: "#0F172A", accent: "#0F172A", fontName: "Inter", radius: 6, shadow: "none" },
      bold:   { bg: "#111111", text: "#FFFFFF", accent: "#FACC15", fontName: "Montserrat", radius: 2, shadow: "none" },
      fresh:  { bg: "#F0FDF4", text: "#14532D", accent: "#16A34A", fontName: "Nunito", radius: 18, shadow: "soft" },
    };
    const themeHit = low.match(/^(?:use|set|make|switch to)\s+(?:a\s+|an\s+|the\s+)?(dark|light|warm|luxury|minimal|bold|fresh)\s+(?:theme|style|look)\b/);
    if (themeHit) return { type: "theme", value: themeHit[1] };

    // ── corners, shadows, spacing, text size, buttons, navigation ──
    if (/^(use|make|set)\b.*\b(rounded|round)\b.*\bcorner/.test(low) || /^(use|make|set)\b.*\bcorners?\b/.test(low)) {
      if (/\b(square|sharp|straight)\b/.test(low)) return { type: "shape", radius: 0 };
      if (/\bvery|extra|super|fully|pill|circle\b/.test(low)) return { type: "shape", radius: 999 };
      return { type: "shape", radius: 18 };
    }
    if (/^(add|use)\b.*\bsoft\b.*\bshadow/.test(low)) return { type: "shape", shadow: "soft" };
    if (/^(add|use)\b.*\b(strong|deep|big)\b.*\bshadow/.test(low)) return { type: "shape", shadow: "strong" };
    if (/^(remove|no|without)\b.*\bshadow/.test(low)) return { type: "shape", shadow: "none" };
    if (/^(add|use)\b.*\bmore\s+(space|spacing|room)\b/.test(low)) return { type: "shape", space: 40 };
    if (/^(add|use)\b.*\bless\s+(space|spacing)\b/.test(low) || /\btight(er)?\s+(spacing|layout)\b/.test(low)) return { type: "shape", space: 14 };
    if (/\b(space|spacing)\b.*\b(\d{1,3})\b/.test(low)) return { type: "shape", space: Number(low.match(/\b(\d{1,3})\b/)[1]) };
    if (/^(use|set|make)\b.*\b(big|large|huge)\b\s+text/.test(low)) return { type: "shape", fontSize: 20 };
    if (/^(use|set|make)\b.*\b(small|tiny)\b\s+text/.test(low)) return { type: "shape", fontSize: 15 };
    if (/^(use|set|make)\b.*\btext\s+size\b.*\b(\d{2})\b/.test(low)) return { type: "shape", fontSize: Number(low.match(/\b(\d{2})\b/)[1]) };
    if (/^(make|use)\b.*\bbuttons?\b.*\b(big|large|wide)\b/.test(low)) return { type: "shape", btnSize: "big" };
    if (/^(make|use)\b.*\bbuttons?\b.*\b(small|tiny|compact)\b/.test(low)) return { type: "shape", btnSize: "small" };
    if (/^(make|keep|use)\b.*\b(navigation|nav|menu|header)\b.*\b(sticky|fixed|stick)\b/.test(low)) return { type: "sticky", value: true };
    if (/^(make|keep|use)\b.*\b(navigation|nav|menu|header)\b.*\b(scroll|normal)\b/.test(low)) return { type: "sticky", value: false };
    const navColor = low.match(/^(?:set|make|change)\b.*\b(?:header|navigation|nav|menu)\b.*\bcolor\b/);
    if (navColor) return { type: "navbg", value: pickColor(text, qs) };

    // ── a hero / cover image across the top ──
    if (/^(add|use|put)\b.*\b(hero|cover|banner)\b.*\b(image|picture|photo)\b/.test(low) && qs[0]) {
      return { type: "hero", value: qs[0], height: (text.match(/\b(\d{3})\s*(?:pixels|px|tall)\b/i) || [])[1] };
    }

    // ── escape hatch: your own CSS or HTML ──
    const css = text.match(/^(?:add|use|put)\s+(?:my\s+)?(?:custom\s+)?(?:style|css)\s*(?:saying|that says|:)?\s*"([^"]*)"/i);
    if (css) return { type: "customCss", value: css[1] };
    const html = text.match(/^(?:add|put|insert)\s+(?:my\s+)?(?:custom\s+)?(?:code|html)\s*(?:saying|that says|:)?\s*"([^"]*)"/i);
    if (html) return { type: "customHtml", value: html[1] };

    if (/^(use|set)\b.*\bheading\s+font\b/.test(low) || /^(use|set)\b.*\bfont\b.*\bheadings?\b/.test(low)) {
      return { type: "headingFont", value: first || (text.match(/\bfont\s+(.+)$/i) || [])[1] || "" };
    }
    if (/^(use|set)\b.*\bfont\b/.test(low)) return { type: "font", value: first || text.replace(/.*\bfont\b\s*/i, "").trim() };
    if (/\boutline\s+buttons?\b/.test(low)) return { type: "btnStyle", value: "outline" };
    if (/\b(solid|filled)\s+buttons?\b/.test(low)) return { type: "btnStyle", value: "solid" };
    if (/\bghost\s+buttons?\b/.test(low)) return { type: "btnStyle", value: "ghost" };
    if (/^set\s+the\s+(?:page\s+)?description\b/.test(low) && first) return { type: "description", value: first };
    if (/^set\s+the\s+favicon\b/.test(low)) return { type: "favicon", value: qs[0] || (text.match(/(?:favicon|to)\s+(?:the\s+)?(?:picture|image)\s+(?:called|named)?\s*"?([^"]+)"?$/i) || [])[1] || "" };
    if (/^(add|put)\s+(?:a\s+)?whatsapp\s+button\b/.test(low)) {
      const ph = text.match(/([+0-9][0-9\s-]{6,})/);
      return { type: "whatsapp", value: ph ? ph[1].trim().replace(/\s+/g, "") : "" };
    }
    if (/^set\s+the\s+(?:social|sharing)\s+(?:image|picture)\b/.test(low)) return { type: "ogImage", value: qs[0] || "" };
    if (/^(center|centre)\b/.test(low)) return { type: "center" };
    if (/\b(wide|full width|narrow)\b/.test(low) && /\b(make|set|use)\b/.test(low)) return { type: "width", value: /\bwide|full width\b/.test(low) ? "wide" : "narrow" };
    if (/^(add|create|make|include)\b.*\bnav(igation)?\b/.test(low)) return { type: "nav", items: qs.length ? qs : ["Home", "About", "Contact"] };
    if (/^(add|create|make|include|put)\b.*\b(big|large|main|giant)?\s*(heading|title|header)\b/.test(low)) {
      const big = /\b(big|large|main|giant)\b/.test(low);
      const rest = text.replace(/^.*?\b(?:says|saying|reads|with)\b\s*/i, "");
      const parts = /\b(?:says|saying|reads|with)\b/i.test(text) ? parseTextAndExpr(rest) : [{ lit: first }];
      return { type: "heading", level: big ? 1 : 2, text: textNode(parts.length ? parts : [{ lit: first }]) };
    }
    if (/^(add|create|make|include|put|write)\b.*\b(paragraph|text|sentence|caption|note|description)\b/.test(low)) {
      const rest = text.replace(/^.*?\b(?:says|saying|reads|with)\b\s*/i, "");
      const parts = /\b(?:says|saying|reads|with)\b/i.test(text) ? parseTextAndExpr(rest) : [{ lit: first }];
      return { type: "paragraph", text: textNode(parts.length ? parts : [{ lit: "" }]) };
    }
    if (/^(add|create|make|include|put)\b.*\bbutton\b/.test(low)) {
      const label = first || "Click here";
      let href = "#";
      const lm = text.match(/\b(?:linking to|that goes to|that opens|which opens|opens|pointing to)\s+"([^"]+)"/i);
      if (lm) href = lm[1];
      else if (qs[1]) href = qs[1];
      return { type: "button", text: label, href };
    }
    if (/^(add|create|make|include)\b.*\b(link|hyperlink)\b/.test(low)) return { type: "link", text: qs[0] || "Link", href: qs[1] || "#" };
    if (/^(show|embed|display|put|open)\b.*\b(website|web page|webpage|page|site)\b/.test(low) && qs[0]) return { type: "embed", src: qs[0], height: (text.match(/\b(\d{3,4})\s*(?:pixels|px|tall)\b/i) || [])[1] };
    if (/^(add|create|make|include|put)\b.*\b(image|picture|photo|logo)\b/.test(low)) return { type: "image", src: qs[0] || "", alt: qs[1] || "Image" };
    if (/^(add|create|make|include)\b.*\blist\b/.test(low)) {
      // a single quoted item followed by "plus <value>" becomes a live expression,
      // so lists inside loops can change each round ("Add a list with \"Class \" plus it")
      let items = qs.length ? qs.slice() : ["First item", "Second item"];
      const tail = text.slice(text.indexOf('"') + 1);
      if (/\bplus\b/i.test(tail)) {
        // whole item is an expression, e.g. "Class " plus it plus " is registered"
        const rest = text.replace(/^.*?\b(?:with|saying|that says|containing)\b/i, "");
        const parts = parseTextAndExpr(rest);
        if (parts && parts.length) return { type: "list", expr: parts, grow: true, ordered: /\bnumbered\b/.test(low) };
      }
      return { type: "list", items, ordered: /\bnumbered\b/.test(low) };
    }
    if (/^(add|create|make|include)\b.*\b(contact\s+)?form\b/.test(low)) return { type: "form" };
    if (/^(add|create|make|include)\b.*\bfooter\b/.test(low)) return { type: "footer", text: first || "© 2026 DeryCode" };
    if (/^(add|create|make|include)\b.*\b(divider|line)\b/.test(low)) return { type: "divider" };
    if (/^(add|create|make|start)\b.*\bsection\b/.test(low)) return { type: "sectionStart", title: first || "" };
    if (/^(end|close|finish)\b.*\bsection\b/.test(low)) return { type: "sectionEnd" };
    return null;
  }

  function pickColor(line, qs) {
    if (qs[0]) return toColor(qs[0], undefined);
    const m = line.match(/\b(?:colou?r|to|is|be)\s+([a-z#0-9]+)\s*$/i);
    if (m) return toColor(m[1], undefined);
    const w = line.split(/\s+/);
    return toColor(w[w.length - 1], undefined);
  }

  /* ── interpreter ──────────────────────────────────────────────────── */
  function run(source, options) {
    const opts = options || {};
    const links = opts.links || linkCache;
    const { program, errors } = parseProgram(source);

    const page = {
      title: "My Website", bg: "#FFFFFF", text: "#111827",
      font: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      fontName: "Inter",
      accent: "#FF8A00", blocks: [], center: false, width: "760px",
      radius: 12, shadow: "soft", space: 24, fontSize: 17,
      btnSize: "normal", sticky: false, navBg: "",
      hero: "", customCss: "", customHtml: "",
      assets: {}, headingFont: "", btnStyle: "solid",
      description: "", favicon: "", whatsapp: "", ogImage: "",
    };
    page.assets = opts.assets || {};
    const output = [];
    const runtimeErrors = [];
    const funcs = Object.create(null);
    let steps = 0;
    let sectionDepth = 0;
    let sectionStack = [];

    let callDepth = 0;
    const rt = {
      warn(msg) { runtimeErrors.push({ message: msg }); },
      error(msg) { runtimeErrors.push({ message: msg }); },
      call(name, args, callerScope) {
        const f = funcs[String(name).toLowerCase()];
        if (!f) { rt.error(`There is no function called "${name}".`); return null; }
        if (++callDepth > 300) { rt.error("This function called itself too many times."); callDepth--; return null; }
        const inner = new Scope(callerScope);
        f.params.forEach((p, k) => inner.declare(p, args[k]));
        const r = exec(f.body, inner);
        callDepth--;
        return r && ("give" in r) ? r.give : null;
      },
    };

    const THEMES = {
      dark:   { bg: "#0B1224", text: "#F8FAFC", accent: "#FF8A00", fontName: "Inter", radius: 14, shadow: "strong" },
      light:  { bg: "#FFFFFF", text: "#111827", accent: "#2563EB", fontName: "Inter", radius: 12, shadow: "soft" },
      warm:   { bg: "#FFF7ED", text: "#3F2A1D", accent: "#EA580C", fontName: "Georgia", radius: 16, shadow: "soft" },
      luxury: { bg: "#0A0A0A", text: "#F5E9D0", accent: "#D4AF37", fontName: "Playfair Display", radius: 4, shadow: "strong" },
      minimal:{ bg: "#FFFFFF", text: "#0F172A", accent: "#0F172A", fontName: "Inter", radius: 6, shadow: "none" },
      bold:   { bg: "#111111", text: "#FFFFFF", accent: "#FACC15", fontName: "Montserrat", radius: 2, shadow: "none" },
      fresh:  { bg: "#F0FDF4", text: "#14532D", accent: "#16A34A", fontName: "Nunito", radius: 18, shadow: "soft" },
    };

    function targetBlocks() {
      return sectionStack.length ? sectionStack[sectionStack.length - 1].children : page.blocks;
    }

    function renderText(node, scope) {
      if (!node || !node.parts) return "";
      return node.parts
        .map((p) => (p.lit !== undefined ? p.lit : show(evalExpr(p.expr, scope, rt))))
        .join("");
    }

    function applyPage(p, scope) {
      switch (p.type) {
        case "title": page.title = p.value; break;
        case "bg": if (p.value) page.bg = p.value; break;
        case "textcolor": if (p.value) page.text = p.value; break;
        case "accent": if (p.value) page.accent = p.value; break;
        case "font":
          if (p.value) {
            page.fontName = p.value;
            page.font = `"${p.value}", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
          }
          break;
        case "theme": {
          const t = THEMES[String(p.value).toLowerCase()];
          if (!t) break;
          page.bg = t.bg; page.text = t.text; page.accent = t.accent;
          page.fontName = t.fontName;
          page.font = `"${t.fontName}", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
          page.radius = t.radius; page.shadow = t.shadow;
          break;
        }
        case "shape":
          if (p.radius !== undefined) page.radius = p.radius;
          if (p.shadow) page.shadow = p.shadow;
          if (p.space !== undefined) page.space = p.space;
          if (p.fontSize !== undefined) page.fontSize = p.fontSize;
          if (p.btnSize) page.btnSize = p.btnSize;
          break;
        case "sticky": page.sticky = !!p.value; break;
        case "navbg": page.navBg = p.value || ""; break;
        case "hero":
          if (p.image) targetBlocks().push({ type: "hero", title: p.title || "", image: p.image, height: p.height });
          else { page.hero = p.value; page.heroHeight = p.height || 320; }
          break;
        case "customCss": page.customCss = (page.customCss || "") + "\n" + p.value; break;
        case "customHtml": page.customHtml = (page.customHtml || "") + "\n" + p.value; break;
        case "center": page.center = true; break;
        case "width": page.width = p.value === "wide" ? "1100px" : "620px"; break;
        case "nav": targetBlocks().push({ type: "nav", items: p.items }); break;
        case "gallery": targetBlocks().push({ type: "gallery", items: p.items, columns: p.columns }); break;
        case "steps": targetBlocks().push({ type: "steps", items: p.items }); break;
        case "prices": targetBlocks().push({ type: "prices", items: p.items }); break;
        case "contact": targetBlocks().push({ type: "contact", phone: p.phone, email: p.email, address: p.address }); break;
        case "footerNav": targetBlocks().push({ type: "footerNav", items: p.items, phone: p.phone }); break;
        case "whatsappFloat": page.whatsapp = p.phone; break;
        case "whatsapp": page.whatsapp = p.value || page.whatsapp; break;
        case "btnStyle": page.btnStyle = p.value; break;
        case "headingFont": if (p.value) page.headingFont = p.value; break;
        case "description": page.description = p.value; break;
        case "favicon": page.favicon = p.value; break;
        case "ogImage": page.ogImage = p.value; break;
        case "heroPic": page.hero = p.image; break;
        case "quote": {
          // quotes group together into one testimonials strip
          const b = targetBlocks();
          const last = b[b.length - 1];
          if (last && last.type === "quotes") last.items.push({ text: p.text, who: p.who });
          else b.push({ type: "quotes", items: [{ text: p.text, who: p.who }] });
          break;
        }
        case "faqItem": {
          const b = targetBlocks();
          const last = b[b.length - 1];
          if (last && last.type === "faq") last.items.push({ q: p.q, a: p.a });
          else b.push({ type: "faq", items: [{ q: p.q, a: p.a }] });
          break;
        }
        case "card": {
          const b = targetBlocks();
          const last = b[b.length - 1];
          if (last && last.type === "cards") last.items.push({ title: p.title, text: p.text, image: p.image, price: p.price, button: p.button });
          else b.push({ type: "cards", items: [{ title: p.title, text: p.text, image: p.image, price: p.price, button: p.button }] });
          break;
        }
        case "heading": targetBlocks().push({ type: "heading", level: p.level, text: renderText(p.text, scope) }); break;
        case "paragraph": targetBlocks().push({ type: "paragraph", text: renderText(p.text, scope) }); break;
        case "button": targetBlocks().push({ type: "button", text: p.text, href: p.href }); break;
        case "link": targetBlocks().push({ type: "link", text: p.text, href: p.href }); break;
        case "embed": targetBlocks().push({ type: "embed", src: p.src, height: p.height }); break;
        case "image": targetBlocks().push({ type: "image", src: p.src, alt: p.alt }); break;
        case "list": {
          let items = p.items || [];
          if (p.expr) {
            // each run appends one item, so a loop builds a single growing list
            const itemText = renderText(textNode(p.expr), scope);
            const blocksNow = targetBlocks();
            const lastB = blocksNow[blocksNow.length - 1];
            if (lastB && lastB.type === "list" && lastB.grow) { lastB.items.push(itemText); return; }
            blocksNow.push({ type: "list", items: [itemText], ordered: p.ordered, grow: true });
            return;
          }
          targetBlocks().push({ type: "list", items, ordered: p.ordered });
          break;
        }
        case "form": targetBlocks().push({ type: "form" }); break;
        case "footer": targetBlocks().push({ type: "footer", text: p.text }); break;
        case "divider": targetBlocks().push({ type: "divider" }); break;
        case "sectionStart": {
          const s = { type: "section", title: p.title, bgImage: p.bgImage || "", children: [] };
          targetBlocks().push(s);
          sectionStack.push(s);
          break;
        }
        case "sectionEnd": sectionStack.pop(); break;
        default: break;
      }
    }

    function exec(stmts, scope) {
      for (const st of stmts) {
        if (++steps > 400000) { rt.error("This program ran too long, so I stopped it."); return { brk: true }; }
        switch (st.k) {
          case "assign": scope.set(st.name, evalExpr(st.expr, scope, rt)); break;
          case "update": {
            const cur = scope.has(st.name) ? scope.get(st.name) : 0;
            const val = evalExpr(st.expr, scope, rt);
            let out;
            switch (st.op) {
              case "+": out = (typeof cur === "string" || typeof val === "string") ? show(cur) + show(val) : num(cur) + num(val); break;
              case "-": out = num(cur) - num(val); break;
              case "*": out = num(cur) * num(val); break;
              case "/": out = num(val) === 0 ? 0 : num(cur) / num(val); if (num(val) === 0) rt.error("I cannot divide by zero."); break;
              default: out = cur;
            }
            scope.set(st.name, out);
            break;
          }
          case "show": {
            const v = evalExpr(st.expr, scope, rt);
            output.push(show(v));
            if (opts.onOutput) opts.onOutput(show(v));
            break;
          }
          case "if": {
            if (truthy(evalExpr(st.cond, scope, rt))) exec(st.then, new Scope(scope));
            else if (st.else) exec(st.else, new Scope(scope));
            break;
          }
          case "repeat": {
            const n = Math.max(0, Math.floor(num(evalExpr(st.count, scope, rt))));
            for (let i = 0; i < n; i++) {
              const inner = new Scope(scope);
              inner.declare("it", i + 1);
              const r = exec(st.body, inner);
              if (r && r.brk) return r;
            }
            break;
          }
          case "while": {
            let guard = 0;
            while (truthy(evalExpr(st.cond, scope, rt))) {
              const r = exec(st.body, new Scope(scope));
              if (r && r.brk) return r;
              if (++guard > 200000) { rt.error("This loop never finished, so I stopped it after 200,000 turns."); break; }
            }
            break;
          }
          case "func": funcs[st.name.toLowerCase()] = st; break;
          case "give": return { give: evalExpr(st.expr, scope, rt) };
          case "foreach": {
            const seq = evalExpr(st.list, scope, rt);
            let arr;
            if (Array.isArray(seq)) arr = seq;
            else if (typeof seq === "string" && seq.trim()) {
              arr = seq.trim().split(/\s*,\s*|\s+/).filter(Boolean);
              rt.warn(`"${show(seq)}" is text, not a list, so I looped over its words. Make a real list with: Remember that names are a list of "A", "B".`);
            } else {
              rt.error(`I cannot loop over ${show(seq)} because it is not a list.`);
              arr = [];
            }
            for (let k = 0; k < arr.length; k++) {
              const inner = new Scope(scope);
              inner.declare(st.var, arr[k]);
              inner.declare("it", arr[k]);
              const r = exec(st.body, inner);
              if (r && r.brk) return r;
            }
            break;
          }
          case "listadd": {
            const cur2 = scope.has(st.name) ? scope.get(st.name) : [];
            const arr2 = Array.isArray(cur2) ? cur2 : [cur2];
            arr2.push(evalExpr(st.expr, scope, rt));
            scope.set(st.name, arr2);
            break;
          }
          case "call": {
            rt.call(st.name, st.args.map((a3) => evalExpr(a3, scope, rt)), scope);
            break;
          }
          case "fetchTitle": {
            const url = String(evalExpr(st.url, scope, rt) || "");
            const rec = links[url];
            if (!rec || !rec.ok) { scope.set(st.target, ""); break; }
            scope.set(st.target, rec.title || (rec.json ? String(rec.json.title || "") : ""));
            break;
          }
          case "fetch": {
            const url = String(evalExpr(st.url, scope, rt) || "");
            const rec = links[url];
            if (!rec) {
              rt.error(`I have not opened ${url} yet. Write: Get the link "${url}" into ${st.target}.`);
              break;
            }
            if (!rec.ok) {
              rt.error(`I could not open ${url}. ` + (rec.error || "Check the link and try again."));
              break;
            }
            scope.set(st.target, rec.json !== null && rec.json !== undefined ? rec.json : rec.text);
            break;
          }
          case "page": applyPage(st.page, scope); break;
          default: break;
        }
      }
      return null;
    }

    const globals = new Scope(null);
    try {
      exec(program, globals);
    } catch (err) {
      runtimeErrors.push({
        message: "Your program stopped: " + (err && err.message ? err.message : String(err)),
      });
    }

    let html = "";
    try { html = render(page); } catch (err) { html = ""; }

    return {
      html,
      page,
      output,
      errors: errors.concat(runtimeErrors.map((e) => ({ line: 0, message: e.message, hint: "" }))),
      stats: { sentences: countStatements(program), steps },
    };
  }

  /* ── opening links ──────────────────────────────────────────────────
     A Dery program may read real data from the internet:
        Get the link "https://..." into data.
     The program itself stays simple and synchronous: links mentioned in
     the source are opened first, then the sentences run with the answers.
     ─────────────────────────────────────────────────────────────────── */
  const linkCache = Object.create(null);
  const LINK_TTL = 60000;

  function collectLinks(src) {
    const out = new Set();
    const re = /"(https?:\/\/[^"\s]+)"/g;
    let m;
    while ((m = re.exec(src))) out.add(m[1]);
    return Array.from(out);
  }

  // Web pages usually refuse to be read by another site (that is the browser
  // security rule called CORS). When that happens we ask a public reader
  // service instead, so ordinary links still work.
  // Web pages usually refuse to be read by another site (the browser rule
  // called CORS). When that happens we ask reader services in parallel and
  // take whichever answers first.
  const READER_A = { name: "reader", url: (u) => "https://r.jina.ai/" + u, ms: 12000 };
  const READER_B = { name: "mirror", url: (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u), ms: 11000 };

  function htmlToText(html) {
    const stripped = String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ");
    return stripped
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ").trim();
  }

  function pageTitle(html) {
    const m = String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return m ? htmlToText(m[1]) : "";
  }

  async function fetchWithTimeout(u, ms, accept) {
    const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), ms) : null;
    try {
      return await fetch(u, {
        headers: { Accept: accept || "application/json, text/plain, text/html, */*" },
        signal: ctl ? ctl.signal : undefined,
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function readThrough(reader, u) {
    const r = await fetchWithTimeout(reader.url(u), reader.ms);
    if (!r.ok) throw new Error("it answered " + r.status);
    let raw = await r.text();
    if (!raw || !raw.trim()) throw new Error("it sent nothing back");

    if (reader.name === "mirror") {
      try {
        const wrap = JSON.parse(raw);
        if (wrap && typeof wrap.contents === "string") raw = wrap.contents;
      } catch (_) { /* not wrapped */ }
    }

    let text = raw;
    let title = "";
    if (reader.name === "reader") {
      const tm = raw.match(/^\s*Title:\s*(.+)$/m);
      if (tm) title = tm[1].trim();
      const cut = raw.indexOf("Markdown Content:");
      text = cut >= 0 ? raw.slice(cut + "Markdown Content:".length) : raw;
      text = text
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/^#{1,6}\s*/gm, "")
        .replace(/[*_`>]+/g, "")
        .replace(/\s+/g, " ")
        .trim();
    } else if (/^\s*<(!doctype|html)/i.test(raw) || /<html[\s>]/i.test(raw.slice(0, 400))) {
      text = htmlToText(raw);
      title = pageTitle(raw);
    }

    let json = null;
    try { json = JSON.parse(raw); } catch (_) { json = null; }
    if (!text && !json) throw new Error("it sent nothing useful");
    return { ok: true, status: r.status, raw, text, json, title, via: reader.name, at: Date.now() };
  }

  // Google refuses to be read by programs. If the link is a Google search,
  // the same search is asked of Bing, which does answer.
  function readingTarget(u) {
    try {
      const url = new URL(u);
      if (/(^|\.)google\./i.test(url.hostname)) {
        const q = url.searchParams.get("q");
        if (q) return { url: "https://www.bing.com/search?q=" + encodeURIComponent(q), swapped: true };
        return { url: u, swapped: false, blocked: true };
      }
    } catch (_) { /* not a full url */ }
    return { url: u, swapped: false };
  }

  async function prefetchOne(u) {
    const hit = linkCache[u];
    if (hit && Date.now() - hit.at < LINK_TTL) return;
    let lastError = "no answer";
    const target = readingTarget(u);
    const fetchUrl = target.url;

    // 1. straight to the link: instant when the site allows it (APIs)
    try {
      const r = await fetchWithTimeout(fetchUrl, 6000);
      if (r.ok) {
        let raw = await r.text();
        if (raw && raw.trim()) {
          let json = null;
          try { json = JSON.parse(raw); } catch (_) { json = null; }
          const looksHtml = /^\s*<(!doctype|html)/i.test(raw) || /<html[\s>]/i.test(raw.slice(0, 400));
          linkCache[u] = {
            ok: true, status: r.status, raw,
            text: looksHtml ? htmlToText(raw) : raw,
            json,
            title: looksHtml ? pageTitle(raw) : "",
            via: "direct", at: Date.now(),
          };
          return;
        }
        lastError = "it sent nothing back";
      } else {
        lastError = "it answered " + r.status;
      }
    } catch (err) {
      lastError = err && err.name === "AbortError" ? "it took too long" : "the browser blocked the request";
    }

    // 2. ask reader services at the same time, keep the first good answer
    const result = await new Promise((resolve) => {
      let pending = 2, settled = false;
      const done = (val) => { if (!settled) { settled = true; resolve(val); } };
      [READER_A, READER_B].forEach((reader) => {
        readThrough(reader, fetchUrl)
          .then((rec) => done(rec))
          .catch((err) => {
            lastError = err && err.name === "AbortError" ? "it took too long" : (err && err.message ? err.message : String(err));
            pending -= 1;
            if (pending === 0) done(null);
          });
      });
    });

    if (result) {
      const thin = (result.text || "").length < 400 &&
        /just a moment|enable javascript|checking your browser|attention required|access denied|captcha/i.test(result.text || "");
      if (!thin) { linkCache[u] = result; return; }
      lastError = "that site is protected by a security check";
    }

    const why = target.blocked
      ? "Google blocks programs from reading it. Use a search link like \"https://www.google.com/search?q=uganda news\" (that gets answered through Bing), or another site."
      : lastError + ". Some sites refuse to be read. Try an API link, or check the address.";
    linkCache[u] = {
      ok: false, status: 0, text: "", json: null, title: "", at: Date.now(), error: why,
    };
  }

  async function prefetchLinks(src) {
    const urls = collectLinks(src);
    await Promise.all(urls.map(prefetchOne));
  }

  function countStatements(stmts) {
    let n = 0;
    for (const s of stmts) {
      n++;
      if (s.then) n += countStatements(s.then);
      if (s.else) n += countStatements(s.else);
      if (s.body) n += countStatements(s.body);
    }
    return n;
  }

  /* ── HTML renderer ────────────────────────────────────────────────── */
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  const GOOGLE_FONTS = ["Inter", "Poppins", "Montserrat", "Lato", "Nunito", "Raleway", "Open Sans",
    "Roboto", "Playfair Display", "Merriweather", "Oswald", "Source Sans 3", "DM Sans", "Space Grotesk"];

  function render(page) {
    const A = page.assets || {};
    const src = (v) => (!v ? "" : (A[v] || v));
    function blocks(list, indent) {
      const pad = "  ".repeat(indent || 1);
      return list.map((b) => {
        switch (b.type) {
          case "nav":
            return `${pad}<nav class="nav">\n${b.items.map((s) => `${pad}  <a href="#${esc(String(s).toLowerCase().replace(/\s+/g, "-"))}">${esc(s)}</a>`).join("\n")}\n${pad}</nav>\n`;
          case "heading": return `${pad}<h${b.level}>${esc(b.text)}</h${b.level}>\n`;
          case "paragraph": return `${pad}<p>${esc(b.text)}</p>\n`;
          case "button": return `${pad}<a class="btn" href="${esc(b.href)}"${b.href && b.href !== "#" ? ' target="_blank" rel="noopener noreferrer"' : ""}>${esc(b.text)}</a>\n`;
          case "link": return `${pad}<p><a class="link" href="${esc(b.href)}"${b.href && b.href !== "#" ? ' target="_blank" rel="noopener noreferrer"' : ""}>${esc(b.text)}</a></p>\n`;
          case "embed":
            return `${pad}<div class="embed"><iframe src="${esc(b.src)}" title="Web page" loading="lazy" style="width:100%;height:${b.height ? Number(b.height) : 460}px;border:0;border-radius:12px;background:#fff" referrerpolicy="no-referrer"></iframe>${"\n"}${pad}  <p class="embed-note"><a href="${esc(b.src)}" target="_blank" rel="noopener noreferrer">Open this page in a browser</a></p>${"\n"}${pad}</div>\n`;
          case "image": {
            const u = src(b.src);
            return u ? `${pad}<img src="${esc(u)}" alt="${esc(b.alt)}" loading="lazy" />\n` : `${pad}<div class="img-placeholder">Picture: ${esc(b.src || "choose one")}</div>\n`;
          }
          case "hero": {
            const u = src(b.image);
            return `${pad}<section class="hero${u ? " has-pic" : ""}"${u ? ` style="background-image:url('${esc(u)}');${b.height ? `min-height:${Number(b.height)}px;` : ""}"` : (b.height ? ` style="min-height:${Number(b.height)}px"` : "")}>\n` +
              `${pad}  <div class="hero-in">${b.title ? `<h1>${esc(b.title)}</h1>` : ""}</div>\n` +
              `${pad}</section>\n`;
          }
          case "cards":
            return `${pad}<div class="cards">\n` + b.items.map((c) => {
              const u = src(c.image);
              return `${pad}  <article class="card">\n` +
                (u ? `${pad}    <img src="${esc(u)}" alt="${esc(c.title)}" loading="lazy" />\n` : "") +
                `${pad}    <div class="card-body">\n` +
                (c.title ? `${pad}      <h3>${esc(c.title)}</h3>\n` : "") +
                (c.text ? `${pad}      <p>${esc(c.text)}</p>\n` : "") +
                (c.price ? `${pad}      <p class="card-price">UGX ${esc(c.price)}</p>\n` : "") +
                (c.button ? `${pad}      <a class="btn" href="#" target="_self">${esc(c.button)}</a>\n` : "") +
                `${pad}    </div>\n` +
                `${pad}  </article>\n`;
            }).join("") + `${pad}</div>\n`;
          case "gallery":
            return `${pad}<div class="gallery g${b.columns || 3}">\n` + b.items.map((it) => {
              const u = src(it);
              return u ? `${pad}  <img src="${esc(u)}" alt="Gallery picture" loading="lazy" />\n` : `${pad}  <div class="img-placeholder">${esc(it)}</div>\n`;
            }).join("") + `${pad}</div>\n`;
          case "prices":
            return `${pad}<ul class="prices">\n` + b.items.map((it) =>
              `${pad}  <li><span class="p-name">${esc(it.label)}</span><span class="dots"></span><span class="p-amt">UGX ${esc(it.price)}</span></li>\n`
            ).join("") + `${pad}</ul>\n`;
          case "steps":
            return `${pad}<ol class="steps">\n` + b.items.map((it) => `${pad}  <li>${esc(it)}</li>\n`).join("") + `${pad}</ol>\n`;
          case "quotes":
            return `${pad}<div class="quotes">\n` + b.items.map((q) =>
              `${pad}  <figure class="quote"><blockquote>${esc(q.text)}</blockquote>${q.who ? `<figcaption>${esc(q.who)}</figcaption>` : ""}</figure>\n`
            ).join("") + `${pad}</div>\n`;
          case "faq":
            return `${pad}<div class="faq">\n` + b.items.map((f) =>
              `${pad}  <details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>\n`
            ).join("") + `${pad}</div>\n`;
          case "contact": {
            const wa = (b.phone || "").replace(/[^0-9]/g, "");
            return `${pad}<div class="contact">\n` +
              (b.address ? `${pad}  <p class="c-addr">${esc(b.address)}</p>\n` : "") +
              (b.phone ? `${pad}  <p><a class="btn" href="tel:${esc(b.phone)}">Call ${esc(b.phone)}</a>${wa ? ` <a class="btn wa" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}</p>\n` : "") +
              (b.email ? `${pad}  <p><a class="link" href="mailto:${esc(b.email)}">${esc(b.email)}</a></p>\n` : "") +
              `${pad}</div>\n`;
          }
          case "footerNav": {
            const ph = b.phone || "";
            return `${pad}<nav class="wrapnav">${b.items.map((t) => `<a href="#">${esc(t)}</a>`).join(" ")}</nav>\n` +
              (ph ? `${pad}<p class="props">${esc(ph)}</p>\n` : "");
          }
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
          case "footer": return `${pad}<footer class="footer">${esc(b.text)}</footer>\n`;
          case "divider": return `${pad}<hr />\n`;
          case "section":
            return `${pad}<section>\n` + (b.title ? `${pad}  <h2>${esc(b.title)}</h2>\n` : "") + (b.children.length ? blocks(b.children, (indent || 1) + 1) : "") + `${pad}</section>\n`;
          default: return "";
        }
      }).join("");
    }

    const navs = page.blocks.filter((b) => b.type === "nav");
    const rest = page.blocks.filter((b) => b.type !== "nav");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(page.title)}</title>
${page.description ? `<meta name="description" content="${esc(page.description)}" />` : ""}
<meta property="og:title" content="${esc(page.title)}" />
${page.description ? `<meta property="og:description" content="${esc(page.description)}" />` : ""}
${page.ogImage ? `<meta property="og:image" content="${esc(src(page.ogImage))}" />` : ""}
${page.favicon ? `<link rel="icon" href="${esc(src(page.favicon))}" />` : ""}
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ${page.font}; background: ${page.bg}; color: ${page.text}; font-size: ${page.fontSize}px; line-height: 1.65; -webkit-font-smoothing: antialiased; }
  main { max-width: ${page.width}; margin: 0 auto; padding: 32px 20px 64px; ${page.center ? "text-align: center;" : ""} }
  h1, h2, h3 { ${page.headingFont ? `font-family: "${page.headingFont}", ${page.font};` : ""} }
  h1 { font-size: clamp(28px, 6vw, 44px); line-height: 1.15; margin: 0 0 16px; letter-spacing: -0.02em; }
  h2 { font-size: clamp(20px, 4vw, 28px); margin: 32px 0 12px; letter-spacing: -0.01em; }
  p { margin: 0 0 16px; opacity: 0.92; }
  .nav { display: flex; flex-wrap: wrap; gap: 18px; padding: 16px 20px; border-bottom: 1px solid rgba(128,128,128,0.2); ${page.center ? "justify-content: center;" : ""} ${page.navBg ? `background: ${page.navBg};` : ""} ${page.sticky ? "position: sticky; top: 0; z-index: 20; backdrop-filter: blur(10px);" : ""} }
  .nav a { color: inherit; text-decoration: none; font-weight: 600; font-size: 14px; opacity: 0.85; }
  .btn { display: inline-block; background: ${page.accent}; color: #fff; padding: ${page.btnSize === "big" ? "16px 32px" : page.btnSize === "small" ? "8px 16px" : "12px 22px"}; border-radius: ${page.radius}px; text-decoration: none; font-weight: 700; font-size: ${page.btnSize === "big" ? "17px" : page.btnSize === "small" ? "13px" : "15px"}; border: none; cursor: pointer; margin: 6px 0 14px; ${page.shadow === "soft" ? `box-shadow: 0 6px 18px ${page.accent}33;` : page.shadow === "strong" ? `box-shadow: 0 12px 30px ${page.accent}55;` : ""} }
  .btn:hover { filter: brightness(1.08); }
  ${page.btnStyle === "outline" ? `.btn { background: transparent; color: ${page.accent}; border: 2px solid ${page.accent}; }` : ""}
  ${page.btnStyle === "ghost" ? `.btn { background: rgba(128,128,128,0.14); color: inherit; }` : ""}
  .link { color: ${page.accent}; font-weight: 600; }
  img { max-width: 100%; height: auto; border-radius: ${page.radius}px; display: block; margin: 12px 0; ${page.shadow === "soft" ? "box-shadow: 0 8px 24px rgba(0,0,0,0.10);" : page.shadow === "strong" ? "box-shadow: 0 16px 40px rgba(0,0,0,0.28);" : ""} }
  .hero { position: relative; width: 100%; overflow: hidden; border-radius: ${page.radius}px; margin: 0 0 ${Math.round(page.space * 0.9)}px; }
  .hero img { width: 100%; height: ${page.heroHeight || 320}px; object-fit: cover; margin: 0; border-radius: ${page.radius}px; }
  .img-placeholder { border: 1px dashed rgba(128,128,128,0.4); border-radius: 12px; padding: 48px; text-align: center; opacity: 0.6; margin: 12px 0; }
  ul, ol { padding-left: 22px; margin: 0 0 16px; }
  li { margin-bottom: 6px; }
  hr { border: none; border-top: 1px solid rgba(128,128,128,0.25); margin: 28px 0; }
  section { margin: ${Math.round(page.space * 0.35)}px 0 ${page.space}px; }
  h2 { margin-top: ${Math.round(page.space * 1.3)}px; }
  p { margin-bottom: ${Math.round(page.space * 0.65)}px; }
  .form { display: grid; gap: 12px; margin: 16px 0; }
  .form label { display: grid; gap: 6px; font-size: 14px; font-weight: 600; }
  .form input, .form textarea { font: inherit; padding: 11px 13px; border-radius: ${page.radius}px; border: 1px solid rgba(128,128,128,0.35); background: transparent; color: inherit; width: 100%; }
  .sent { color: #16A34A; font-weight: 700; }
  .embed { margin: 16px 0; }
  .embed-note { font-size: 13px; margin: 6px 0 0; opacity: 0.7; }
  .embed-note a { color: ${page.accent}; font-weight: 600; }
  .footer { margin-top: 40px; padding-top: 20px; font-size: 13px; border-top: 1px solid rgba(128,128,128,0.25); opacity: 0.75; }
  /* hero with a picture behind it */
  .hero { position: relative; display: flex; align-items: flex-end; min-height: 380px; padding: 32px; margin: 0 0 ${page.space}px; border-radius: ${page.radius}px; overflow: hidden; background-size: cover; background-position: center; }
  .hero.has-pic::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.62) 100%); }
  .hero h1 { position: relative; z-index: 1; margin: 0; }
  .hero.has-pic h1 { color: #fff; text-shadow: 0 2px 18px rgba(0,0,0,0.45); }
  .hero-in { position: relative; z-index: 1; width: 100%; }

  /* cards */
  .cards { display: grid; gap: ${Math.round(page.space * 0.7)}px; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); margin: 12px 0 ${page.space}px; }
  .card { background: ${page.cardBg || "rgba(128,128,128,0.07)"}; border: 1px solid rgba(128,128,128,0.18); border-radius: ${page.radius}px; overflow: hidden; text-align: left; ${page.shadow === "soft" ? "box-shadow: 0 8px 22px rgba(0,0,0,0.08);" : page.shadow === "strong" ? "box-shadow: 0 16px 38px rgba(0,0,0,0.22);" : ""} }
  .card img { width: 100%; height: 190px; object-fit: cover; margin: 0; border-radius: 0; }
  .card-body { padding: 16px 18px 20px; }
  .card h3 { margin: 0 0 8px; font-size: 18px; }
  .card p { margin: 0 0 10px; font-size: 0.96em; opacity: 0.88; }
  .card-price { font-weight: 800; color: ${page.accent}; }

  /* gallery */
  .gallery { display: grid; gap: 10px; margin: 12px 0 ${page.space}px; }
  .gallery.g1 { grid-template-columns: 1fr; }
  .gallery.g2 { grid-template-columns: repeat(2, 1fr); }
  .gallery.g3 { grid-template-columns: repeat(3, 1fr); }
  .gallery.g4 { grid-template-columns: repeat(4, 1fr); }
  .gallery img { width: 100%; height: 100%; aspect-ratio: 1 / 1; object-fit: cover; margin: 0; border-radius: ${page.radius}px; }

  /* price list */
  .prices { list-style: none; padding: 0; margin: 12px 0 ${page.space}px; }
  .prices li { display: flex; align-items: baseline; gap: 10px; padding: 10px 0; border-bottom: 1px dashed rgba(128,128,128,0.3); }
  .prices .p-name { font-weight: 600; }
  .prices .dots { flex: 1; border-bottom: 1px dotted rgba(128,128,128,0.45); transform: translateY(-4px); }
  .prices .p-amt { font-weight: 800; color: ${page.accent}; white-space: nowrap; }

  /* numbered steps */
  .steps { counter-reset: s; list-style: none; padding: 0; margin: 12px 0 ${page.space}px; }
  .steps li { counter-increment: s; position: relative; padding: 8px 0 8px 44px; }
  .steps li::before { content: counter(s); position: absolute; left: 0; top: 6px; width: 28px; height: 28px; border-radius: 50%; background: ${page.accent}; color: #fff; font-weight: 800; display: grid; place-items: center; font-size: 14px; }

  /* testimonials */
  .quotes { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin: 12px 0 ${page.space}px; }
  .quote { margin: 0; padding: 20px; border-radius: ${page.radius}px; background: ${page.cardBg || "rgba(128,128,128,0.07)"}; border-left: 4px solid ${page.accent}; }
  .quote blockquote { margin: 0 0 10px; font-size: 1.02em; }
  .quote figcaption { font-size: 0.85em; font-weight: 700; opacity: 0.75; }

  /* questions */
  .faq { margin: 12px 0 ${page.space}px; }
  .faq details { border-bottom: 1px solid rgba(128,128,128,0.25); padding: 12px 0; }
  .faq summary { cursor: pointer; font-weight: 700; }
  .faq p { margin: 8px 0 0; opacity: 0.85; }

  /* contact block */
  .contact { margin: 12px 0 ${page.space}px; }
  .contact .c-addr { font-weight: 600; }
  .btn.wa { background: #25D366; }

  /* footer navigation */
  .wrapnav { display: flex; flex-wrap: wrap; gap: 16px; margin: 36px 0 8px; padding-top: 18px; border-top: 1px solid rgba(128,128,128,0.25); font-size: 14px; font-weight: 600; }
  .wrapnav a { color: inherit; text-decoration: none; opacity: 0.85; }
  .props { font-size: 13px; opacity: 0.7; }

  /* floating WhatsApp */
  .wa-float { position: fixed; right: 18px; bottom: 18px; z-index: 50; display: inline-flex; align-items: center; gap: 8px; background: #25D366; color: #fff; text-decoration: none; font-weight: 800; padding: 13px 18px; border-radius: 999px; box-shadow: 0 10px 26px rgba(0,0,0,0.28); font-size: 14px; }

  @media (max-width: 480px) { main { padding: 24px 16px 48px; } .btn { width: 100%; text-align: center; } .hero { min-height: 280px; padding: 20px; } .gallery.g3, .gallery.g4 { grid-template-columns: repeat(2, 1fr); } }
${page.customCss || ""}
</style>
${GOOGLE_FONTS.includes(page.fontName) ? `<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(page.fontName).replace(/%20/g, "+")}:wght@400;600;800&display=swap" rel="stylesheet" />` : ""}
</head>
<body>
${navs.length ? navs.map((b) => blocks([b], 0)).join("").replace(/^ {0,2}/gm, "") : ""}<main>
${page.hero ? `<div class="hero"><img src="${esc(page.hero)}" alt="Cover" /></div>` : ""}${blocks(rest, 1)}${page.customHtml || ""}</main>
${page.whatsapp ? `<a class="wa-float" href="https://wa.me/${esc(String(page.whatsapp).replace(/[^0-9]/g, ""))}" target="_blank" rel="noopener">Chat on WhatsApp</a>` : ""}
</body>
</html>`;
  }

  async function runAsync(source, options) {
    await prefetchLinks(source);
    return run(source, { links: linkCache, assets: (options && options.assets) || {} });
  }

  const api = { run, runAsync, prefetchLinks, compile: run, render, COLORS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.Dery = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
