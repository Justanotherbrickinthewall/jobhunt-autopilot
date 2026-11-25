// Shared toy data and a small BM25 for chapter 6 widgets.
// Passages are short paraphrases of PEP topics, written for this course.

export type Passage = { id: string; label: string; text: string };

export const PASSAGES: Passage[] = [
  { id: "p8a", label: "PEP 8, line length", text: "PEP 8 is the style guide for Python code. It sets a maximum line length of 79 characters for code and 72 for docstrings and comments." },
  { id: "p8b", label: "PEP 8, indentation", text: "PEP 8 recommends four spaces per indentation level and says to prefer spaces over tabs." },
  { id: "p257", label: "PEP 257, docstrings", text: "PEP 257 sets conventions for docstrings, including the one line summary and the blank line that follows it." },
  { id: "p20", label: "PEP 20, Zen of Python", text: "PEP 20 is the Zen of Python, a short list of aphorisms about writing clear and simple code." },
  { id: "p572a", label: "PEP 572, definition", text: "PEP 572 adds assignment expressions, written with the := operator, so you can name a value inside an expression." },
  { id: "p572b", label: "PEP 572, the debate", text: "The discussion of the walrus operator grew so heated that Guido van Rossum stepped down as BDFL in 2018." },
  { id: "p634", label: "PEP 634, pattern matching", text: "PEP 634 introduces structural pattern matching with the match and case keywords." },
  { id: "p703a", label: "PEP 703, optional lock", text: "PEP 703 proposes making the global interpreter lock optional through a free-threaded build of CPython." },
  { id: "p703b", label: "PEP 703, why it matters", text: "The GIL lets only one thread run Python bytecode at a time, so CPU-bound threads cannot use several cores." },
  { id: "p484", label: "PEP 484, type hints", text: "PEP 484 defines type hints, the syntax for annotating functions with expected argument and return types." },
  { id: "p585", label: "PEP 585, built-in generics", text: "PEP 585 lets you write list[int] and dict[str, int] directly, so typing.List and typing.Dict are no longer needed for hints." },
  { id: "p518", label: "PEP 518, build requirements", text: "PEP 518 introduces pyproject.toml to declare the build requirements of a Python project." },
  { id: "p621", label: "PEP 621, project metadata", text: "PEP 621 stores project metadata such as name, version and dependencies in pyproject.toml." },
  { id: "p440", label: "PEP 440, versions", text: "PEP 440 defines how Python version numbers are written, ordered and compared." },
];

export function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

export type Bm25Row = { id: string; score: number };

export function bm25(passages: { id: string; text: string }[], query: string, k1 = 1.2, b = 0.75): Bm25Row[] {
  const docs = passages.map((p) => tokenize(p.text));
  const N = docs.length;
  const avg = docs.reduce((s, d) => s + d.length, 0) / N;
  const df = new Map<string, number>();
  docs.forEach((d) => new Set(d).forEach((t) => df.set(t, (df.get(t) ?? 0) + 1)));
  const terms = [...new Set(tokenize(query))];
  return passages.map((p, i) => {
    const d = docs[i];
    let score = 0;
    for (const t of terms) {
      const f = d.filter((x) => x === t).length;
      if (!f) continue;
      const n = df.get(t) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.length) / avg)));
    }
    return { id: p.id, score };
  });
}
