/**
 * Catalogue search in everyday words.
 *
 * People rarely know a statistic's official name. A query is read as concepts: question words are
 * dropped ("how much do people…"), common phrases and words map to the terms the registry uses
 * ("earn" → earnings, wages, pay, salary, income), and the rest match as themselves (light stem).
 * A dataset matches when every concept is found in its words: title, definition, source, place,
 * and the titles and questions of the research domains that use it. If a natural question finds
 * nothing that way, datasets matching any concept are returned instead.
 */

const STOP = new Set(
  (
    "how much many what which who whom whose where when why is are was were be been do does did done " +
    "the a an of in on at for to and or but by with from into about it its this that these those there " +
    "i me my we us our you your they them their people person someone everyone anyone " +
    "get gets got getting have has had can could should would will shall may might " +
    "britain british uk united kingdom country nation national show tell find data figures numbers series dataset datasets " +
    "live lives living over time change changed changing year years " +
    "least most more less best worst highest lowest biggest smallest largest cheapest dearest top bottom"
  ).split(" "),
);

/** Multi-word phrases read as one concept (checked before single words). */
const PHRASES: [RegExp, string[]][] = [
  [/\bcost of living\b/, ["inflation", "cpi", "consumer price"]],
  [/\bhow many people\b/, ["population"]],
  [/\b(house|home|property) prices?\b/, ["house price", "hpi", "average price"]],
  [/\benergy bills?\b|\bgas bills?\b|\belectricity bills?\b/, ["bill", "tariff"]],
  [/\brough sleep(ing|ers?)\b/, ["rough sleep"]],
  [/\btemporary accommodation\b/, ["temporary accommodation"]],
  [/\bnew homes?\b|\bhouse ?building\b/, ["completion", "starts", "net additional", "supply"]],
  [/\bwaiting lists?\b/, ["waiting list"]],
  [/\binterest rates?\b/, ["interest", "mortgage rate", "bank rate"]],
  [/\blife expectancy\b/, ["life expectancy"]],
];

/** Everyday word → registry terms (matched as substrings of the dataset's words). */
const WORDS: [RegExp, string[]][] = [
  [/^(earn|earns|earned|earning|earnings|wage|wages|pay|paid|salary|salaries|income|incomes)$/, ["earnings", "wage", "pay", "salary", "income", "ashe"]],
  [/^(rent|rents|rented|renting|rental|tenant|tenants|landlord|landlords|let|letting)$/, ["rent", "letting", "tenan", "landlord"]],
  [/^(house|houses|home|homes|housing|property|properties|dwelling|dwellings)$/, ["house", "home", "dwelling", "housing", "property"]],
  [/^(afford|affordable|affordability|expensive|cheap)$/, ["afford", "ratio", "price"]],
  [/^(inflation|prices)$/, ["inflation", "cpi", "price"]],
  [/^(job|jobs|work|works|working|worker|workers|employ|employed|employment|unemployed|unemployment|labour)$/, ["employ", "job", "labour", "work", "inactiv"]],
  [/^(gdp|growth|economy|economic|output|productivity|productive)$/, ["gdp", "growth", "output", "productiv"]],
  [/^(debt|debts|borrow|borrowing|deficit)$/, ["debt", "borrow", "deficit"]],
  [/^(tax|taxes|taxation)$/, ["tax", "receipt"]],
  [/^(spend|spends|spending|spent)$/, ["spend", "expenditure", "budget"]],
  [/^(energy|power|electricity|electric)$/, ["energy", "electric", "power", "generation"]],
  [/^(bill|bills|tariff|tariffs)$/, ["bill", "tariff"]],
  [/^(homeless|homelessness)$/, ["homeless", "rough sleep", "temporary accommodation"]],
  [/^(build|building|builds|built|construction|supply)$/, ["completion", "starts", "construction", "build", "supply", "net additional"]],
  [/^(population|residents|inhabitants)$/, ["population"]],
  [/^(migration|immigration|emigration|migrants|immigrants)$/, ["migration"]],
  [/^(health|nhs|hospital|hospitals|waiting)$/, ["nhs", "waiting", "health", "life expectancy"]],
  [/^(school|schools|education|gcse|gcses|pupils|exam|exams)$/, ["gcse", "education", "school", "pupil"]],
  [/^(vote|votes|voting|election|elections|turnout)$/, ["election", "turnout", "vote"]],
  [/^(train|trains|rail|railway|railways)$/, ["rail", "punctual"]],
  [/^(road|roads|traffic|driving|cars)$/, ["road", "vehicle"]],
  [/^(broadband|internet|fibre)$/, ["broadband", "fibre"]],
  [/^(manufacturing|factory|factories|industry|industrial)$/, ["manufactur", "industr"]],
  [/^(mortgage|mortgages)$/, ["mortgage"]],
  [/^(renewable|renewables|wind|solar)$/, ["renewable", "wind", "solar", "low carbon"]],
];

/** Light stem: drop a trailing plural or -ing/-ed so "earnings" finds "earning". */
function stem(token: string): string {
  for (const end of ["ings", "ing", "ies", "es", "ed", "s"]) {
    if (token.length - end.length >= 4 && token.endsWith(end)) return token.slice(0, -end.length);
  }
  return token;
}

export type Concept = string[];

/** Read a query into concepts; each concept is a list of alternative terms. */
export function concepts(query: string): Concept[] {
  let text = query.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' -]+/g, " ");
  const out: Concept[] = [];
  for (const [re, terms] of PHRASES) {
    if (re.test(text)) {
      out.push(terms);
      text = text.replace(re, " ");
    }
  }
  for (const raw of text.split(/\s+/)) {
    const word = raw.replace(/'s$/, "").replace(/'/g, "");
    if (!word || STOP.has(word) || word.length < 2) continue;
    const mapped = WORDS.find(([re]) => re.test(word));
    out.push(mapped ? mapped[1] : [stem(word)]);
  }
  return out;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A concept matches at the start of a word, so "work" finds "workers" but not "network". */
const matcher = (c: Concept) => {
  const res = c.map((term) => new RegExp(`(^|[^a-z0-9])${escape(term)}`));
  return (haystack: string) => res.some((re) => re.test(haystack));
};

/**
 * Filter `items` by `query`. `words(item)` returns the item's searchable text (lower case).
 * All concepts must match; if that finds nothing for a multi-concept query, any concept will do.
 */
export function search<T>(items: readonly T[], query: string, words: (item: T) => string): T[] {
  const ms = concepts(query).map(matcher);
  if (ms.length === 0) return [...items];
  const all = items.filter((it) => ms.every((m) => m(words(it))));
  if (all.length > 0 || ms.length === 1) return all;
  return items.filter((it) => ms.some((m) => m(words(it))));
}
