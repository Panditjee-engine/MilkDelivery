
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const phonetic = (w: string) =>
  w
    .replace(/ph/g, "f")
    .replace(/ck|c/g, "k")
    .replace(/w/g, "v")
    .replace(/z/g, "j")
    .replace(/ee|ie|ii|y$/g, "i")
    .replace(/oo|ou|uu/g, "u")
    .replace(/aa/g, "a")
    .replace(/h/g, "")
    .replace(/(.)\1+/g, "$1");


function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  const d: number[][] = Array.from({ length: al + 1 }, (_, i) => [i]);
  for (let j = 1; j <= bl; j++) d[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[al][bl];
}

const allowedErrors = (len: number) => (len <= 3 ? 0 : len <= 5 ? 1 : 2);

function termVsWord(term: string, word: string): number | null {
  if (word === term) return 0;
  if (word.startsWith(term)) return 0.2;   
  if (word.includes(term) && term.length >= 3) return 0.5;

  const max = allowedErrors(term.length);
  if (max === 0) return null;

  let best = Infinity;
  best = Math.min(best, editDistance(term, word));
  // partial typing + typo: "panir" vs "paneer"[0..5]
  best = Math.min(best, editDistance(term, word.slice(0, term.length)) + 0.3);
  // phonetic match
  const pt = phonetic(term), pw = phonetic(word);
  if (pt.length >= 3) {
    best = Math.min(best, editDistance(pt, pw) + 0.1);
    best = Math.min(best, editDistance(pt, pw.slice(0, pt.length)) + 0.4);
  }
  return best <= max ? best : null;
}


export function fuzzyScoreProduct(product: any, query: string): number | null {
  const terms = normalize(query).split(" ").filter(Boolean);
  if (!terms.length) return 0;

  const nameWords = normalize(product?.name || "").split(" ").filter(Boolean);
  const otherWords = normalize(
    [product?.category, product?.description, product?.unit].filter(Boolean).join(" "),
  )
    .split(" ")
    .filter(Boolean);

  let total = 0;
  for (const term of terms) {
    let best: number | null = null;
    for (const w of nameWords) {
      const sc = termVsWord(term, w);
      if (sc !== null && (best === null || sc < best)) best = sc;
    }
    if (best === null) {
      for (const w of otherWords) {
        const sc = termVsWord(term, w);
        if (sc !== null && (best === null || sc + 1 < best)) best = sc + 1; // penalty
      }
    }
    if (best === null) return null; 
    total += best;
  }
  return total;
}