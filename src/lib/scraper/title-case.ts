/** Lowercased mid-title, as in normal title case. Multilingual, since trade
 *  show names often aren't English. Single letters are left out on purpose:
 *  "E" in "E-CRIME" or "A" in "A&T" are part of a name, not conjunctions. */
const SMALL_WORDS = new Set([
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "vs",
  "via",
  "with",
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "et",
  "en",
  "au",
  "aux",
  "sur",
  "pour",
  "und",
  "der",
  "die",
  "das",
  "für",
  "im",
  "am",
  "zu",
  "von",
  "di",
  "del",
  "della",
  "il",
  "per",
  "con",
  "el",
  "los",
  "las",
  "para",
  "van",
  "het",
  "voor",
  "för",
  "och",
  "og",
]);

/** Words that look like acronyms by length (or get shouted in descriptions,
 *  "the RETAIL TECH Expo") but aren't. */
const COMMON_WORDS = new Set([
  "new",
  "big",
  "web",
  "day",
  "eco",
  "pro",
  "art",
  "car",
  "air",
  "lab",
  "hub",
  "box",
  "net",
  "app",
  "top",
  "one",
  "two",
  "all",
  "our",
  "way",
  "law",
  "map",
  "max",
  "mix",
  "bio",
  "med",
  "geo",
  "tec",
  "sea",
  "oil",
  "gas",
  "sun",
  "fun",
  "run",
  "kid",
  "pet",
  "tea",
  "man",
  "hot",
  "red",
  "eye",
  "ice",
  "sky",
  "bay",
  "key",
  "age",
  "war",
  "job",
  "hat",
  "est",
  "sud",
  "syd",
  "go",
  "my",
  "we",
  "us",
  "up",
  "no",
  "nord",
  "east",
  "west",
  "expo",
  "tech",
  "show",
  "fair",
  "week",
  "data",
  "cloud",
  "cyber",
  "smart",
  "world",
  "event",
  "forum",
  "cable",
  "media",
  "games",
  "meet",
]);

/** All-caps words in descriptions longer than this are usually the brand
 *  being shouted ("MILIPOL Paris"), not an acronym. */
const MAX_ACRONYM_LENGTH = 5;

const WORD_REGEX = /[\p{L}\p{N}]+/gu;
const VOWEL_REGEX = /[aeiouyàáâãäåæèéêëìíîïòóôõöøùúûüý]/i;

/**
 * Convert an ALL-CAPS title (as some sources publish them) to title case.
 * Titles that already contain a lowercase letter are returned unchanged.
 *
 * Casing is recovered from `context` (e.g. the event's description) where it
 * shows a deliberate style: "IVT Expo", "QCon", "the UK government". Words
 * not found there are treated as acronyms when they're short or have no
 * vowels (AI, CIO, DTX, B2B), and capitalized otherwise.
 */
export function titleCaseAllCaps(title: string, context = ""): string {
  if (/\p{Ll}/u.test(title)) return title;

  const titleWords = title.match(WORD_REGEX) ?? [];
  const styled = styledWordsFrom(context, titleWords);

  let wordIndex = 0;
  // Split keeps the separators (odd indices are words).
  return title
    .split(/([\p{L}\p{N}]+)/u)
    .map((part, i, parts) => {
      if (i % 2 === 0) return part;
      const before = parts[i - 1];
      const after = parts[i + 1] ?? "";
      const isTitleStart = wordIndex++ === 0;
      const isFirst = isTitleStart || /[-–:|]\s*$/.test(before);
      return caseWord(part, { isTitleStart, isFirst, before, after, styled });
    })
    .join("");
}

function caseWord(
  word: string,
  {
    isTitleStart,
    isFirst,
    before,
    after,
    styled,
  }: {
    /** First word of the whole title. */
    isTitleStart: boolean;
    /** First word of the title or of a " - "/":" segment. */
    isFirst: boolean;
    before: string;
    after: string;
    styled: Map<string, string>;
  },
): string {
  const lower = word.toLowerCase();

  const fromContext = styled.get(lower);
  if (fromContext) return fromContext;

  // French elision and possessives: "D'ANGOULÊME" → "d'Angoulême", "UK'S" → "UK's".
  if (/^['’]$/.test(before) && word.length <= 2) return lower;
  if (!isFirst && word.length === 1 && /^['’]/.test(after)) return lower;

  const isShort = word.length <= MAX_ACRONYM_LENGTH;
  // Acronyms spelled out next to them: "(EEGS)", "MTEX - Marketing Technology Expo".
  if (isShort && /\($/.test(before) && /^\)/.test(after)) return word;
  if (isShort && isTitleStart && /^\s+[-–(]/.test(after)) return word;

  // B2B, 5G, 3D stay as-is; longer ones get each letter run capitalized:
  // "ROBOT4MANUFACTURING" → "Robot4Manufacturing".
  if (/\p{N}/u.test(word)) return isShort ? word : word.replace(/\p{L}+/gu, capitalize);

  if (SMALL_WORDS.has(lower)) return isFirst ? capitalize(word) : lower;
  if (word.length === 1) return word;
  if (!VOWEL_REGEX.test(word)) return word;
  if (word.length <= 3 && !COMMON_WORDS.has(lower)) return word;

  return capitalize(word);
}

function capitalize(word: string): string {
  return word.charAt(0) + word.slice(1).toLowerCase();
}

/**
 * Words whose casing in `context` is deliberate: mixed case ("QCon", "IoT",
 * "eBay") or all caps on their own ("SMAU is…", "CIO/CISO"). All-caps runs
 * that just repeat the title ("SECURING THE LAW FIRM is a show…") are
 * skipped, since they're the same shouting we're trying to undo.
 */
function styledWordsFrom(context: string, titleWords: string[]): Map<string, string> {
  const styled = new Map<string, string>();
  const isUpper = (t: string) => !/\p{Ll}/u.test(t);
  const hasLetter = (t: string) => /\p{L}/u.test(t);

  const titleLetterWords = titleWords.filter(hasLetter).map((w) => w.toLowerCase());
  const titleLower = new Set(titleLetterWords);
  const tokens = context.match(WORD_REGEX) ?? [];

  for (let i = 0; i < tokens.length; ) {
    const token = tokens[i];

    if (!isUpper(token)) {
      if (/^\p{L}+$/u.test(token) && /\p{Lu}/u.test(token.slice(1))) {
        setOnce(styled, token);
      }
      i++;
      continue;
    }

    // Collect the run of consecutive all-caps (or numeric) tokens.
    let end = i;
    while (end < tokens.length && isUpper(tokens[end])) end++;
    const run = tokens.slice(i, end).filter(hasLetter);
    i = end;

    const repeatsTitle =
      (run.length >= 2 && run.every((t) => titleLower.has(t.toLowerCase()))) ||
      (titleLetterWords.length === 1 &&
        run.length === 1 &&
        run[0].toLowerCase() === titleLetterWords[0]);
    if (repeatsTitle) continue;

    for (const t of run) {
      if (t.length >= 2 && t.length <= MAX_ACRONYM_LENGTH) setOnce(styled, t);
    }
  }

  return styled;
}

function setOnce(map: Map<string, string>, word: string) {
  const key = word.toLowerCase();
  if (SMALL_WORDS.has(key) || COMMON_WORDS.has(key)) return;
  if (!map.has(key)) map.set(key, word);
}
