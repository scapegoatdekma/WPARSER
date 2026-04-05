import type { WikipediaParseResponse, WikipediaSummary } from "./types";

const TIMEOUT_MS = 15_000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "WikipediaParser/1.0 (kraeved-maps-project)",
      },
      next: { revalidate: 3600 }, // Кэшируем ответ на 1 час.
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Получает краткие данные статьи через REST API Wikipedia.
 */
export async function fetchSummary(
  lang: string,
  title: string,
): Promise<WikipediaSummary> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetchWithTimeout(url);

  if (res.status === 404) {
    throw new Error(`Статья Википедии не найдена: "${title}"`);
  }
  if (!res.ok) {
    throw new Error(`API сводки Википедии вернул HTTP ${res.status}`);
  }

  return res.json() as Promise<WikipediaSummary>;
}

/**
 * Получает полный HTML, категории и ссылки через MediaWiki action=parse.
 */
export async function fetchParsedContent(
  lang: string,
  title: string,
): Promise<{
  html: string;
  categories: string[];
  links: string[];
}> {
  const params = new URLSearchParams({
    action: "parse",
    page: title,
    format: "json",
    prop: "text|categories|links",
    disableeditsection: "1",
    redirects: "1",
    formatversion: "2",
  });

  const url = `https://${lang}.wikipedia.org/w/api.php?${params.toString()}`;
  const res = await fetchWithTimeout(url);

  if (!res.ok) {
    throw new Error(`API парсинга Википедии вернул HTTP ${res.status}`);
  }

  const data = (await res.json()) as WikipediaParseResponse;

  if (!data.parse) {
    throw new Error(
      "API парсинга Википедии не вернул данные. Возможно, статья не существует.",
    );
  }

  const html = data.parse.text;

  const categories = data.parse.categories
    .filter((c) => !c.hidden) // Убираем служебные и скрытые категории.
    .map((c) => c.category.replace(/_/g, " "));

  const links = data.parse.links
    .filter((l) => l.ns === 0 && l.exists) // Берём только существующие ссылки на статьи.
    .map((l) => l.title);

  return { html, categories, links };
}
