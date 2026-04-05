/**
 * Извлекает язык и заголовок статьи из разных вариантов ссылок Wikipedia:
 *   https://en.wikipedia.org/wiki/Alexander_Pushkin
 *   https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич
 *   https://en.m.wikipedia.org/wiki/Russia#History  (мобильная версия + якорь)
 *   https://ru.wikipedia.org/wiki/%D0%9F%D1%83%D1%88%D0%BA%D0%B8%D0%BD  (с percent-encoding)
 */
export function parseWikipediaUrl(rawUrl: string): { lang: string; title: string } {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error(`Некорректный URL: "${rawUrl}"`);
  }

  if (!url.hostname.includes("wikipedia.org")) {
    throw new Error("Это не ссылка на Википедию");
  }

  // en.m.wikipedia.org -> "en", ru.wikipedia.org -> "ru"
  const lang = url.hostname.split(".")[0] ?? "en";

  const match = url.pathname.match(/^\/wiki\/(.+)/);
  if (!match?.[1]) {
    throw new Error('В URL отсутствует обязательный сегмент пути "/wiki/"');
  }

  // Декодируем строку, убираем якорь и заменяем подчёркивания на пробелы.
  const title = decodeURIComponent(match[1])
    .replace(/_/g, " ")
    .split("#")[0]
    .trim();

  if (!title) {
    throw new Error("Не удалось извлечь заголовок статьи из URL");
  }

  return { lang, title };
}
