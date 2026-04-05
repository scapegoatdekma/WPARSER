// Ответы API Wikipedia в исходном виде.

export type WikipediaSummary = {
  type: "standard" | "disambiguation" | "no-extract";
  title: string;
  displaytitle: string;
  description?: string;
  extract: string;
  thumbnail?: { source: string; width: number; height: number };
  coordinates?: { lat: number; lon: number };
  content_urls: {
    desktop: { page: string };
    mobile: { page: string };
  };
  timestamp?: string; // Время последнего изменения в ISO 8601.
};

export type WikipediaParseResponse = {
  parse: {
    title: string;
    text: string;
    categories: Array<{ category: string; hidden: boolean }>;
    links: Array<{ ns: number; title: string; exists: boolean }>;
  };
};

// Типы данных после парсинга.

export type WikiCoordinates = { lat: number; lng: number };

/** Обычная статья (не биография). */
export type WikiArticleResult = {
  type: "article";
  title: string;
  lead: string;      // Первый абзац в plain text.
  body: string;      // Очищенный HTML (h2/h3, p, ul, ol, strong, em, ...).
  tags: string[];    // Категории статьи после фильтрации.
  relatedPersons: string[]; // Персоны, упомянутые в ссылках статьи.
  thumbnail?: string;
  coordinates?: WikiCoordinates;
  sourceUrl: string;
  lang: string;
  lastModified?: string; // Дата обновления в ISO 8601.
};

/** Биография или страница персоны. */
export type WikiPersonResult = {
  type: "person";
  name: string;
  years: string;      // Например: "1799–1837" или "1960–".
  role: string;       // Профессия или краткая роль.
  birthPlace: string;
  bio: string;        // Очищенный HTML биографии.
  tags: string[];
  family: Record<string, string>; // Семейные связи (spouse, children, parents и т.д.).
  thumbnail?: string;
  coordinates?: WikiCoordinates;
  sourceUrl: string;
  lang: string;
  lastModified?: string;
};

export type WikiParseResult = WikiArticleResult | WikiPersonResult;

// Данные инфобокса в формате "ключ -> значение".

export type InfoboxData = Record<string, string>;
