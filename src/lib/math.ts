// A bounded arithmetic parser, never eval: supports fractions and +, -, ×, ÷, parentheses.
export function parseMath(input: string): number | null {
  const clean = input
    .trim()
    .replaceAll("×", "*")
    .replaceAll("÷", "/")
    .replaceAll("−", "-")
    .replace(/\s/g, "");
  if (!clean || clean.length > 80 || /[^\d.+*/()\-]/.test(clean)) return null;
  const tokens = clean.match(/\d*\.\d+|\d+|[+*/()\-]/g) ?? [];
  if (tokens.join("") !== clean) return null;
  let pos = 0;
  const atom = (): number => {
    const t = tokens[pos++];
    if (t === "-") return -atom();
    if (t === "+") return atom();
    if (t === "(") {
      const v = add();
      if (tokens[pos++] !== ")") throw Error();
      return v;
    }
    if (!t || !/^\d*\.?\d+$/.test(t)) throw Error();
    return Number(t);
  };
  const mul = (): number => {
    let v = atom();
    while (tokens[pos] === "*" || tokens[pos] === "/") {
      const op = tokens[pos++],
        b = atom();
      v = op === "*" ? v * b : v / b;
    }
    return v;
  };
  const add = (): number => {
    let v = mul();
    while (tokens[pos] === "+" || tokens[pos] === "-") {
      const op = tokens[pos++],
        b = mul();
      v = op === "+" ? v + b : v - b;
    }
    return v;
  };
  try {
    const value = add();
    return pos === tokens.length && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}
export function gradeAnswer(
  input: string,
  expected: string,
  exact = false,
): boolean {
  if (exact) return input.replace(/\s/g, "") === expected.replace(/\s/g, "");
  const a = parseMath(input),
    b = parseMath(expected);
  return a !== null && b !== null
    ? Math.abs(a - b) < 1e-9
    : input.trim().toLowerCase() === expected.trim().toLowerCase();
}
