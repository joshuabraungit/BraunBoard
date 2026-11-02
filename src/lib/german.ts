// How much German a posting asks for. Three levels, read from the posting's own words:
//   native  - "Native-level German is required", "Native German speaker"
//   fluent  - "Fluent German and English", "Business-level German required", "native or fluent"
//   plus    - "German is a plus", "German highly preferred", "an advantage", "nice to have"
// Mentions that aren't about speaking it ("the German market", "German public sector") don't count.

export type GermanLevel = "native" | "fluent" | "plus";

const RANK: Record<GermanLevel, number> = { plus: 1, fluent: 2, native: 3 };

// The clause is about speaking German, not about the German market.
const LANGUAGE_CONTEXT =
  /\b(fluent|fluency|native|mother tongue|bilingual|speak|speaks|speaker|speakers|speaking|proficien\w*|language|languages|written|spoken|verbal|oral|communicat\w*|c1|c2|excellent|strong command|command of)\b|\bin german\b|\bgerman (and|&|or) english\b|\benglish (and|&) german\b|\bdeutschsprachig|\b(english|french|spanish|italian|dutch|polish|czech|nordic)\b/;
// Words that make "German ..." about a market or team, not the language.
const MARKET = "market|public|enterprise|commercial|customers?|clients?|police|government|federal|automotive|sales|team|business|mittelstand|ecommerce|e-commerce|organi[sz]ation|accounts?|companies|entities|driving";
// "German is a plus", "German highly preferred": German opens the clause and it isn't about a market or team.
const GERMAN_LEADS = new RegExp(`^\\s*german\\b(?!\\s*[- ]?(${MARKET}))`);
// "Business-level German is required", "German is a must".
const GERMAN_DEMANDED = new RegExp(`\\bbusiness[- ](level|fluent|fluency)\\b|\\bgerman\\b(?!\\s*[- ]?(${MARKET}))[^,;]{0,20}\\b(required|essential|mandatory|a must|non-negotiable)\\b`);
// A bare list item: "Spanish, German, or French" splits into "german" / "or german".
const BARE = /^\s*(or |and |& )?german\s*$/;
// "German-speaking customers / markets / region" describes who you sell to, not what you must speak.
const SPEAKING_MARKET = /\bgerman[- ]speaking\b[^,;]{0,25}\b(customers?|clients?|markets?|regions?|countries|accounts|territor\w+|dach)\b/;

const OPTIONAL = /\b(a plus|plus\b|big plus|strong plus|preferred|prefer|preferably|advantage\w*|nice to have|nice-to-have|beneficial|desirable|bonus|helpful|asset|ideally|not (required|necessary|mandatory|essential)|optional|welcome)\b/;

const NATIVE = /\b(native|mother tongue|bilingual)\b/;
// "native or fluent", "native/professional", "native-level or full business proficiency" set the bar at fluent.
const NATIVE_OR_LESS =
  /\b(native|bilingual)\b[^,;]{0,25}(\bor\b|\/)\s*(full |professional |business |working )?(fluent|fluency|business|professional|full|working)\b|\b(fluent|fluency|professional|business)\b[^,;]{0,15}(\bor\b|\/)\s*(near[- ])?native/;

function clauseLevel(clause: string): GermanLevel | null {
  if (!/\bgerman\b|deutschsprachig/.test(clause)) return null;
  if (SPEAKING_MARKET.test(clause) && !/\b(fluent|fluency|native|proficien\w*|required|must)\b/.test(clause)) return null;
  const aboutLanguage = LANGUAGE_CONTEXT.test(clause) || GERMAN_DEMANDED.test(clause);
  if (!aboutLanguage && !(GERMAN_LEADS.test(clause) && OPTIONAL.test(clause))) return null;
  if (OPTIONAL.test(clause)) return "plus";
  if (NATIVE.test(clause) && !NATIVE_OR_LESS.test(clause)) return "native";
  return "fluent";
}

/** The most German the posting requires, or "plus" when it only says German helps. Null when it doesn't ask. */
export function germanLevel(description: string | null | undefined): GermanLevel | null {
  if (!description) return null;
  const text = description
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .toLowerCase()
    // "(ideally native)", "(native or fluent)": a side note shouldn't decide the level of the whole line.
    .replace(/\((?:ideally|preferably)[^)]*\)/g, " ")
    // "(other languages are a plus)" is about other languages.
    .replace(/\(([^)]*)\)/g, (m, inner: string) => (!/german/.test(inner) && OPTIONAL.test(inner) ? " " : m));
  // A clause is one line, sentence, or comma/semicolon piece. "Excellent German and English, Polish a plus"
  // is German required plus a Polish bonus, not "German a plus".
  let best: GermanLevel | null = null;
  for (const line of text.split(/[\n.;•]/)) {
    // A bare list item takes its meaning from the whole line ("Nice to have: Spanish, German, or French").
    const clauses = line.split(",");
    const level = clauses.some((c) => BARE.test(c)) ? clauseLevel(line.replace(/,/g, " ")) : clauses.map(clauseLevel).reduce<GermanLevel | null>((a, b) => (!b ? a : !a || RANK[b] > RANK[a] ? b : a), null);
    if (!level) continue;
    // Any requirement outranks a "plus" said elsewhere ("German required ... native fluency preferred").
    if (!best || RANK[level] > RANK[best]) best = level;
  }
  return best;
}
