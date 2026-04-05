import * as cheerio from "cheerio";
import type { InfoboxData } from "./types";

/**
 * Извлекает пары ключ-значение из первой таблицы infobox.
 */
export function extractInfobox($: ReturnType<typeof cheerio.load>): InfoboxData {
  const data: InfoboxData = {};

  const infobox = $("table.infobox").first();
  if (!infobox.length) return data;

  infobox.find("tr").each((_, row) => {
    const $row = $(row);
    const th = $row.find("th").first();
    const td = $row.find("td").first();

    if (!th.length || !td.length) return;

    const key = th
      .text()
      .trim()
      .replace(/\s+/g, " ");

    // Удаляем шум: сноски, стили и служебные элементы.
    td.find("sup, style, .mw-empty-elt, .noprint").remove();
    // У некоторых шаблонов в ячейке остаются CSS-хвосты, их тоже чистим.
    const value = td
      .text()
      .trim()
      .replace(/\.mw-parser-output[^}]+\}/g, "")
      .replace(/\[\d+\]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (key && value) {
      data[key] = value;
    }
  });

  return data;
}

function firstMatch(data: InfoboxData, keys: string[]): string {
  for (const key of keys) {
    for (const [k, v] of Object.entries(data)) {
      if (k.toLowerCase().includes(key.toLowerCase())) {
        return v;
      }
    }
  }
  return "";
}

const BIRTH_KEYS = [
  "Дата рождения",
  "Родился",
  "Born",
  "Birth date",
  "Date of birth",
];

const DEATH_KEYS = [
  "Дата смерти",
  "Умер",
  "Умерла",
  "Died",
  "Death date",
  "Date of death",
];

const BIRTH_PLACE_KEYS = [
  "Место рождения",
  "Birth place",
  "Birthplace",
  "Place of birth",
];

const OCCUPATION_KEYS = [
  "Деятельность",
  "Профессия",
  "Occupation",
  "Known for",
  "Occupation(s)",
  "Занятие",
];

const FAMILY_KEYS: Record<string, string[]> = {
  spouse: [
    "Супруг",
    "Супруга",
    "Spouse",
    "Partner",
    "Партнёр",
  ],
  children: ["Дети", "Children", "Child"],
  parents: ["Родители", "Parents", "Parent", "Отец", "Мать", "Father", "Mother"],
  siblings: ["Братья и сёстры", "Siblings", "Sibling", "Брат", "Сестра"],
};

/** Извлекает четырёхзначный год из строки даты. */
function extractYear(value: string): string {
  const match = value.match(/\b(\d{4})\b/);
  return match?.[1] ?? "";
}

export function resolveYears(data: InfoboxData): string {
  const birthVal = firstMatch(data, BIRTH_KEYS);
  const deathVal = firstMatch(data, DEATH_KEYS);

  const birthYear = extractYear(birthVal);
  const deathYear = extractYear(deathVal);

  if (!birthYear) return "";
  if (!deathYear) return `${birthYear}–`;
  return `${birthYear}–${deathYear}`;
}

export function resolveRole(data: InfoboxData): string {
  const raw = firstMatch(data, OCCUPATION_KEYS);
  // Берём только первые 1-2 профессии и ограничиваем длину строки.
  const joined = raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");
  return joined.length > 80 ? joined.slice(0, 77) + "…" : joined;
}

export function resolveBirthPlace(data: InfoboxData): string {
  return firstMatch(data, BIRTH_PLACE_KEYS);
}

export function resolveFamily(data: InfoboxData): Record<string, string> {
  const family: Record<string, string> = {};
  for (const [relation, keys] of Object.entries(FAMILY_KEYS)) {
    const value = firstMatch(data, keys);
    if (value) family[relation] = value;
  }
  return family;
}

const PERSON_CATEGORY_PATTERNS = [
  // Русские шаблоны.
  /Персоналии по алфавиту/,
  /Родившиеся в \d{4} году/,
  /Умершие в \d{4} году/,
  /Похороненные на/,
  /Персоналии:/,
  // Английские шаблоны.
  /\d{4} births/i,
  /\d{4} deaths/i,
  /Living people/i,
  /People from /i,
];

export function isPersonArticle(
  categories: string[],
  infobox: InfoboxData,
): boolean {
  const hasPersonCategory = categories.some((cat) =>
    PERSON_CATEGORY_PATTERNS.some((re) => re.test(cat)),
  );

  const hasPersonInfoboxField =
    Boolean(firstMatch(infobox, BIRTH_KEYS)) ||
    Boolean(firstMatch(infobox, DEATH_KEYS)) ||
    Boolean(firstMatch(infobox, OCCUPATION_KEYS));

  return hasPersonCategory || hasPersonInfoboxField;
}
