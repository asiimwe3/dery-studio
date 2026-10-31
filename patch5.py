import re
s = open('dery2.js').read()

# ── 1. show(): lists print as comma separated ─────────────────────────
old = '''  const show = (v) => {
    if (v === null || v === undefined) return "nothing";
    if (v === true) return "yes";
    if (v === false) return "no";
    return String(v);
  };'''
new = '''  const show = (v) => {
    if (v === null || v === undefined) return "nothing";
    if (v === true) return "yes";
    if (v === false) return "no";
    if (Array.isArray(v)) return v.map(show).join(", ");
    return String(v);
  };
  // split "a", "b", c  — commas that are not inside quotes
  const splitTop = (src) => {
    const out = [];
    let buf = "", inq = false;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (c === '"') { inq = !inq; buf += c; continue; }
      if (!inq && (c === "," || src.slice(i, i + 4).toLowerCase() === " and")) {
        out.push(buf); buf = "";
        if (c === ",") { /* skip comma */ } else i += 3;
        continue;
      }
      buf += c;
    }
    out.push(buf);
    return out.map((x) => x.trim()).filter(Boolean);
  };'''
assert old in s; s = s.replace(old, new, 1)

# ── 2. comparison operators gain contains / does not contain ──────────
old = '''          "is at least", "is at most", "is not", "is exactly", "is equal to", "is", "equals", "equal to"'''
new = '''          "does not contain", "doesn't contain", "contains",
          "is at least", "is at most", "is not", "is exactly", "is equal to", "is", "equals", "equal to"'''
assert old in s; s = s.replace(old, new, 1)

old = '''        else if (/not/.test(w)) op = "!=";'''
new = '''        else if (/does ?n.t contain/.test(w)) op = "ncontains";
        else if (/\bcontains\b/.test(w)) op = "contains";
        else if (/not/.test(w)) op = "!=";'''
assert old in s; s = s.replace(old, new, 1)

# ── 3. parseAtom: English functions for text, lists, maths ─────────────
old = '''      if (tk.t === "word") {
        next();
        const low = tk.v.toLowerCase();
        if (low === "it" && i > 0) return { k: "var", name: "it" };
        if (low === "minus" || low === "-") {
          const inner = parseAtom();
          return { k: "bin", op: "-", a: { k: "lit", v: 0 }, b: inner };
        }
        return { k: "var", name: tk.v };
      }'''
new = '''      if (tk.t === "word") {
        // W(0) is the current word, W(1) the one after it
        const W = (n) => { const t = toks[i + n]; return t && t.t === "word" ? t.v.toLowerCase() : null; };
        const take = (n) => { i += n; };

        if (W(0) === "the" && W(1) === "result" && W(2) === "of") {
          take(3);
          const nt = peek();
          if (!nt || nt.t !== "word") return { k: "lit", v: null };
          const name = nt.v; next();
          const args = [];
          if (W(0) === "with" || W(0) === "of" || W(0) === "using") {
            take(1);
            for (;;) {
              args.push(parseAtom());
              if (W(0) === "and" || W(0) === ",") { take(1); continue; }
              break;
            }
          }
          return { k: "fcall", name, args };
        }
        if (W(0) === "length" && W(1) === "of") { take(2); return { k: "len", a: parseAtom() }; }
        if (W(0) === "number" && W(1) === "of" && (W(2) === "items" || W(2) === "letters" || W(2) === "characters" || W(2) === "words")) {
          take(4);
          return W(2) === "words" ? { k: "words", a: parseAtom() } : { k: "len", a: parseAtom() };
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
          const nt = toks[i + 1];
          if (nt && nt.t === "num" && W(2) === "of") { const nIdx = nt.v; take(3); return { k: "atitem", a: parseAtom(), idx: nIdx }; }
        }
        next();
        const low = tk.v.toLowerCase();
        if (low === "it" && i > 0) return { k: "var", name: "it" };
        if (low === "minus" || low === "-") {
          const inner = parseAtom();
          return { k: "bin", op: "-", a: { k: "lit", v: 0 }, b: inner };
        }
        return { k: "var", name: tk.v };
      }'''
assert old in s; s = s.replace(old, new, 1)

# ── 4. eval: new value types ──────────────────────────────────────────
old = '''        case "!=": {
          if (typeof a === "string" || typeof b === "string") return show(a) !== show(b);
          return num(a) !== num(b);
        }'''
new = '''        case "!=": {
          if (typeof a === "string" || typeof b === "string") return show(a) !== show(b);
          return num(a) !== num(b);
        }
        case "contains": return show(a).toLowerCase().includes(show(b).toLowerCase());
        case "ncontains": return !show(a).toLowerCase().includes(show(b).toLowerCase());'''
assert old in s; s = s.replace(old, new, 1)

old = '''      case "lit": return node.v;'''
new = '''      case "lit": return node.v;
      case "listlit": return node.items.map((it) => evalExpr(it, scope, rt));
      case "len": {
        const v = evalExpr(node.a, scope, rt);
        return Array.isArray(v) ? v.length : String(show(v)).length;
      }
      case "words": return String(show(evalExpr(node.a, scope, rt))).trim().split(/\\s+/).filter(Boolean).length;
      case "upper": return String(show(evalExpr(node.a, scope, rt))).toUpperCase();
      case "lower": return String(show(evalExpr(node.a, scope, rt))).toLowerCase();
      case "trim": return String(show(evalExpr(node.a, scope, rt))).trim();
      case "round": return Math.round(num(evalExpr(node.a, scope, rt)));
      case "firstword": return String(show(evalExpr(node.a, scope, rt))).trim().split(/\\s+/)[0] || "";
      case "lastword": {
        const w = String(show(evalExpr(node.a, scope, rt))).trim().split(/\\s+/);
        return w[w.length - 1] || "";
      }
      case "reverse": {
        const v = evalExpr(node.a, scope, rt);
        return Array.isArray(v) ? v.slice().reverse() : String(show(v)).split("").reverse().join("");
      }
      case "firstitem": {
        const v = evalExpr(node.a, scope, rt);
        return Array.isArray(v) ? v[0] : String(show(v)).trim().split(/\\s+/)[0];
      }
      case "lastitem": {
        const v = evalExpr(node.a, scope, rt);
        if (Array.isArray(v)) return v[v.length - 1];
        const w = String(show(v)).trim().split(/\\s+/);
        return w[w.length - 1];
      }
      case "atitem": {
        const v = evalExpr(node.a, scope, rt);
        return Array.isArray(v) ? v[Math.round(node.idx) - 1] : null;
      }
      case "fcall": return rt.call ? rt.call(node.name, node.args.map((a2) => evalExpr(a2, scope, rt)), scope) : null;'''
assert old in s; s = s.replace(old, new, 1)

open('dery2.js', 'w').write(s)
print("part 1 patched")
