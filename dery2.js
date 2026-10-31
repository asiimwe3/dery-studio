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
        const say = line.text.match(/^(?:show|say|print|display|write)\s+(.+?)\s*\.?$/i);
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

    if (/^(create|make|start|build)\b.*\b(page|website|site|document)\b/.test(low)) {
      return { type: "title", value: first || (text.match(/\b(?:called|named)\s+(.+)$/i) || [, "My Website"])[1] };
    }
    if (/^(set|make|change)\b.*\bbackground\b/.test(low)) return { type: "bg", value: pickColor(text, qs) };
    if (/^(set|make|change)\b.*\btext\b.*\bcolou?r\b/.test(low)) return { type: "textcolor", value: pickColor(text, qs) };
    if (/^(set|make|change)\b.*\b(accent|buttons?|highlights?)\b/.test(low)) return { type: "accent", value: pickColor(text, qs) };
    if (/^(use|set)\b.*\bfont\b/.test(low)) return { type: "font", value: first || text.replace(/.*\bfont\b\s*/i, "").trim() };
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
      const lm = text.match(/\b(?:linking to|that goes to)\s+"([^"]+)"/i);
      if (lm) href = lm[1];
      else if (qs[1]) href = qs[1];
      return { type: "button", text: label, href };
    }
    if (/^(add|create|make|include)\b.*\b(link|hyperlink)\b/.test(low)) return { type: "link", text: qs[0] || "Link", href: qs[1] || "#" };
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
      accent: "#FF8A00", blocks: [], center: false, width: "760px",
    };
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
        case "font": if (p.value) page.font = `"${p.value}", system-ui, sans-serif`; break;
        case "center": page.center = true; break;
        case "width": page.width = p.value === "wide" ? "1100px" : "620px"; break;
        case "nav": targetBlocks().push({ type: "nav", items: p.items }); break;
        case "heading": targetBlocks().push({ type: "heading", level: p.level, text: renderText(p.text, scope) }); break;
        case "paragraph": targetBlocks().push({ type: "paragraph", text: renderText(p.text, scope) }); break;
        case "button": targetBlocks().push({ type: "button", text: p.text, href: p.href }); break;
        case "link": targetBlocks().push({ type: "link", text: p.text, href: p.href }); break;
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
          const s = { type: "section", title: p.title, children: [] };
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
          case "fetch": {
            const url = String(evalExpr(st.url, scope, rt) || "");
            const rec = links[url];
            if (!rec) {
              rt.error(`I have not opened ${url} yet. Write: Get the link "${url}" into ${st.target}.`);
              break;
            }
            if (!rec.ok) {
              rt.error(`I could not open ${url}` + (rec.status ? ` (it answered ${rec.status})` : "") + `. ` + (rec.error || "Check the link and try again."));
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

  async function prefetchLinks(src) {
    const urls = collectLinks(src);
    await Promise.all(urls.map(async (u) => {
      const hit = linkCache[u];
      if (hit && Date.now() - hit.at < LINK_TTL) return;
      try {
        const r = await fetch(u, { headers: { Accept: "application/json, text/plain, */*" } });
        const text = await r.text();
        let json = null;
        try { json = JSON.parse(text); } catch (_) { json = null; }
        linkCache[u] = { ok: r.ok, status: r.status, text, json, at: Date.now() };
      } catch (err) {
        linkCache[u] = {
          ok: false, status: 0, text: "", json: null, at: Date.now(),
          error: err && err.message ? err.message : String(err),
        };
      }
    }));
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

  function render(page) {
    function blocks(list, indent) {
      const pad = "  ".repeat(indent || 1);
      return list.map((b) => {
        switch (b.type) {
          case "nav":
            return `${pad}<nav class="nav">\n${b.items.map((s) => `${pad}  <a href="#${esc(String(s).toLowerCase().replace(/\s+/g, "-"))}">${esc(s)}</a>`).join("\n")}\n${pad}</nav>\n`;
          case "heading": return `${pad}<h${b.level}>${esc(b.text)}</h${b.level}>\n`;
          case "paragraph": return `${pad}<p>${esc(b.text)}</p>\n`;
          case "button": return `${pad}<a class="btn" href="${esc(b.href)}">${esc(b.text)}</a>\n`;
          case "link": return `${pad}<p><a class="link" href="${esc(b.href)}">${esc(b.text)}</a></p>\n`;
          case "image": return b.src ? `${pad}<img src="${esc(b.src)}" alt="${esc(b.alt)}" />\n` : `${pad}<div class="img-placeholder">Image</div>\n`;
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
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ${page.font}; background: ${page.bg}; color: ${page.text}; line-height: 1.65; -webkit-font-smoothing: antialiased; }
  main { max-width: ${page.width}; margin: 0 auto; padding: 32px 20px 64px; ${page.center ? "text-align: center;" : ""} }
  h1 { font-size: clamp(28px, 6vw, 44px); line-height: 1.15; margin: 0 0 16px; letter-spacing: -0.02em; }
  h2 { font-size: clamp(20px, 4vw, 28px); margin: 32px 0 12px; letter-spacing: -0.01em; }
  p { margin: 0 0 16px; opacity: 0.92; }
  .nav { display: flex; flex-wrap: wrap; gap: 18px; padding: 16px 20px; border-bottom: 1px solid rgba(128,128,128,0.2); ${page.center ? "justify-content: center;" : ""} }
  .nav a { color: inherit; text-decoration: none; font-weight: 600; font-size: 14px; opacity: 0.85; }
  .btn { display: inline-block; background: ${page.accent}; color: #fff; padding: 12px 22px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; border: none; cursor: pointer; margin: 6px 0 14px; }
  .btn:hover { filter: brightness(1.08); }
  .link { color: ${page.accent}; font-weight: 600; }
  img { max-width: 100%; height: auto; border-radius: 12px; display: block; margin: 12px 0; }
  .img-placeholder { border: 1px dashed rgba(128,128,128,0.4); border-radius: 12px; padding: 48px; text-align: center; opacity: 0.6; margin: 12px 0; }
  ul, ol { padding-left: 22px; margin: 0 0 16px; }
  li { margin-bottom: 6px; }
  hr { border: none; border-top: 1px solid rgba(128,128,128,0.25); margin: 28px 0; }
  section { margin: 8px 0 24px; }
  .form { display: grid; gap: 12px; margin: 16px 0; }
  .form label { display: grid; gap: 6px; font-size: 14px; font-weight: 600; }
  .form input, .form textarea { font: inherit; padding: 11px 13px; border-radius: 10px; border: 1px solid rgba(128,128,128,0.35); background: transparent; color: inherit; width: 100%; }
  .sent { color: #16A34A; font-weight: 700; }
  .footer { margin-top: 40px; padding-top: 20px; font-size: 13px; border-top: 1px solid rgba(128,128,128,0.25); opacity: 0.75; }
  @media (max-width: 480px) { main { padding: 24px 16px 48px; } .btn { width: 100%; text-align: center; } }
</style>
</head>
<body>
${navs.length ? navs.map((b) => blocks([b], 0)).join("").replace(/^ {0,2}/gm, "") : ""}<main>
${blocks(rest, 1)}</main>
</body>
</html>`;
  }

  async function runAsync(source) {
    await prefetchLinks(source);
    return run(source, { links: linkCache });
  }

  const api = { run, runAsync, prefetchLinks, compile: run, render, COLORS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.Dery = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
