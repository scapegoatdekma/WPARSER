import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

// Заголовки разделов, которые полностью исключаем из контента.

const SKIP_SECTION_TEXTS = new Set([
  // Английские варианты.
  "References",
  "External links",
  "See also",
  "Notes",
  "Further reading",
  "Bibliography",
  "Footnotes",
  "Citations",
  // Русские варианты.
  "Примечания",
  "Ссылки",
  "Литература",
  "Источники",
  "Библиография",
  "См. также",
  "Примечание",
  "Внешние ссылки",
]);

function isSectionToSkip(text: string): boolean {
  const cleaned = text.replace(/\[.*?\]/g, "").trim();
  return SKIP_SECTION_TEXTS.has(cleaned);
}

/**
 * Очищает inline-содержимое абзаца или пункта списка.
 * Сохраняет базовое форматирование и преобразует относительные ссылки /wiki/.
 */
function cleanInlineHtml(
  $: ReturnType<typeof cheerio.load>,
  el: AnyNode,
  lang: string,
): string {
  const $el = $(el).clone();

  // Убираем сноски и служебные ссылки редактирования.
  $el.find("sup, .mw-editsection, .reference, .noprint").remove();

  // Оставляем только внутренние вики-ссылки, внешние разворачиваем в текст.
  $el.find("a[href]").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    if (href.startsWith("/wiki/")) {
      $(a).attr("href", `https://${lang}.wikipedia.org${href}`);
    } else {
      $(a).replaceWith($(a).html() ?? "");
    }
  });

  // Постепенно разворачиваем вложенные span (например, IPA и типографические обёртки).
  let passes = 0;
  while ($el.find("span").length > 0 && passes < 8) {
    $el.find("span:not(:has(span))").each((_, span) => {
      const inner = $(span).html() ?? "";
      // Пустые и декоративные span удаляем.
      if (!inner.trim()) {
        $(span).remove();
      } else {
        $(span).replaceWith(inner);
      }
    });
    passes++;
  }

  // Приводим теги форматирования к единому виду.
  $el.find("b").each((_, b) => {
    $(b).replaceWith(`<strong>${$(b).html()}</strong>`);
  });
  $el.find("i").each((_, i) => {
    $(i).replaceWith(`<em>${$(i).html()}</em>`);
  });
  $el.find("del, s, strike").each((_, s) => {
    $(s).replaceWith(`<s>${$(s).html()}</s>`);
  });

  // Удаляем хвосты вида [1] и лишние пробелы.
  const html = ($el.html() ?? "")
    .replace(/\[\d+\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return html;
}

/**
 * Преобразует HTML Wikipedia в упрощённый HTML для отображения в приложении.
 */
export function cleanWikipediaBody(
  $: ReturnType<typeof cheerio.load>,
  lang: string,
): string {
  const output = $(".mw-parser-output");

  // Общая очистка от таблиц, галерей, TOC и служебных блоков.
  output.find([
    ".infobox",
    ".navbox",
    ".navbox-inner",
    ".reflist",
    ".references",
    ".refbegin",
    ".hatnote",
    ".mw-editsection",
    ".toc",
    ".thumb",
    ".gallery",
    ".ambox",         // служебные информационные блоки
    ".wikitable",
    "table",          // удаляем все таблицы
    ".mw-empty-elt",
    "#coordinates",
    ".geo-nondefault",
    ".geo-default",
    ".sistersitebox",
    ".noprint",
    "style",
    "script",
  ].join(", ")).remove();

  const parts: string[] = [];
  let skipSection = false;

  output.children().each((_, el) => {
    const tag = el.type === "tag" ? el.tagName?.toLowerCase() : null;
    if (!tag) return;

    // По h2 переключаем режим пропуска разделов (например, "Примечания").
    if (tag === "h2") {
      const headingText = $(el).text().trim();
      skipSection = isSectionToSkip(headingText);
      if (!skipSection) {
        const clean = headingText.replace(/\[.*?\]/g, "").trim();
        if (clean) parts.push(`<h2>${escapeHtml(clean)}</h2>`);
      }
      return;
    }

    if (skipSection) return;

    // h3/h4 сводим к h3, чтобы структура была стабильной.
    if (tag === "h3" || tag === "h4") {
      const headingText = $(el).text().replace(/\[.*?\]/g, "").trim();
      if (headingText) parts.push(`<h3>${escapeHtml(headingText)}</h3>`);
      return;
    }

    // Абзацы очищаем через cleanInlineHtml.
    if (tag === "p") {
      const text = $(el).text().replace(/\[.*?\]/g, "").trim();
      if (!text) return;
      const inner = cleanInlineHtml($, el, lang);
      if (inner) parts.push(`<p>${inner}</p>`);
      return;
    }

    // Списки собираем только из непустых пунктов.
    if (tag === "ul" || tag === "ol") {
      const items: string[] = [];
      $(el)
        .children("li")
        .each((_, li) => {
          const inner = cleanInlineHtml($, li, lang);
          if (inner.trim()) items.push(`<li>${inner}</li>`);
        });
      if (items.length) {
        parts.push(`<${tag}>${items.join("")}</${tag}>`);
      }
      return;
    }

    // Внутри div обрабатываем вложенные абзацы.
    if (tag === "div") {
      $(el)
        .children()
        .each((_, child) => {
          const childTag =
            child.type === "tag" ? child.tagName?.toLowerCase() : null;
          if (childTag === "p") {
            const text = $(child).text().replace(/\[.*?\]/g, "").trim();
            if (!text) return;
            const inner = cleanInlineHtml($, child, lang);
            if (inner) parts.push(`<p>${inner}</p>`);
          }
        });
    }

    // Остальные элементы (таблицы, фигуры и т.д.) намеренно пропускаем.
  });

  return parts.join("\n");
}

const BORING_CATEGORY_PATTERNS = [
  /^Pages (using|with|containing)/i,
  /^Articles (with|using|needing|containing)/i,
  /^CS1/i,
  /^Wikipedia/i,
  /^Commons/i,
  /^Webarchive/i,
  /^Use (dmy|mdy) dates/i,
  /^Short description/i,
  /^Good articles/i,
  /^Featured articles/i,
  /^\d{4} (births|deaths)$/i,
  /^Living people$/i,
  /^People from /i,
  /^Персоналии по алфавиту$/,
  /^Родившиеся в \d{4} году$/,
  /^Умершие в \d{4} году$/,
  /^Похороненные/,
];

/**
 * Преобразует категории Wikipedia в теги и отфильтровывает служебные категории.
 */
export function extractTags(categories: string[]): string[] {
  return categories
    .filter((cat) => !BORING_CATEGORY_PATTERNS.some((re) => re.test(cat)))
    .map((cat) =>
      cat
        .replace(/^Категория:/, "")
        .replace(/^Category:/, "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean)
    .slice(0, 20); // Ограничиваем размер набора тегов.
}

const PERSON_LINK_EXCLUDE = [
  /^(January|February|March|April|May|June|July|August|September|October|November|December)\b/i,
  /^\d{4}$/,
  /^(Russia|Soviet Union|United States|France|Germany|United Kingdom)$/i,
  /^Январ|Феврал|Март|Апрел|Май|Июн|Июл|Август|Сентябр|Октябр|Ноябр|Декабр/,
];

/**
 * Эвристически извлекает имена персон из ссылок статьи.
 */
export function extractRelatedPersons(
  links: string[],
  categories: string[],
): string[] {
  // Набор категорий для потенциального использования в дальнейших эвристиках.
  const categoryNames = new Set<string>();
  categories
    .filter(
      (c) =>
        c.includes("Персоналии") ||
        c.includes("people") ||
        c.toLowerCase().includes("person"),
    )
    .forEach((c) => categoryNames.add(c));

  return links
    .filter((link) => {
      if (PERSON_LINK_EXCLUDE.some((re) => re.test(link))) return false;
      // Отсекаем шаблоны вида "Место, Регион".
      if (link.includes(",")) return false;
      // Имя обычно состоит из 2-4 слов с заглавной буквы.
      const words = link.replace(/\s*\(.*?\)\s*$/, "").split(/\s+/);
      return (
        words.length >= 2 &&
        words.length <= 4 &&
        words.every((w) => {
          const first = w[0] ?? "";
          const hasUppercaseStart =
            first !== "" &&
            first === first.toUpperCase() &&
            first !== first.toLowerCase();
          return hasUppercaseStart && !w.includes(",");
        })
      );
    })
    .slice(0, 15);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
