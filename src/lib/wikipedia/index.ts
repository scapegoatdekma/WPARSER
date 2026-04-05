export { parseWikipediaArticle } from "./parser";
export type {
  InfoboxData,
  WikiArticleResult,
  WikiCoordinates,
  WikiParseResult,
  WikiPersonResult,
} from "./types";

// Удобные мапперы для интеграции результата парсера с типами проекта.

import type { WikiArticleResult, WikiPersonResult } from "./types";

/**
 * Преобразует WikiArticleResult в формат ArticleMeta.
 */
export function toArticleMeta(result: WikiArticleResult) {
  return {
    id: `wiki-${slugify(result.title)}`,
    title: result.title,
    authorName: "Википедия",
    authorRole: "Энциклопедия",
    dateLabel: result.lastModified
      ? new Date(result.lastModified).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : new Date().toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
    tags: result.tags,
    lead: result.lead || undefined,
    body: result.body || undefined,
    relatedPeople: result.relatedPersons.length ? result.relatedPersons : undefined,
    relatedPlaces: result.coordinates
      ? [
          {
            title: result.title,
            type: "point_of_interest" as const,
            mapLabel: `${result.coordinates.lat.toFixed(4)}, ${result.coordinates.lng.toFixed(4)}`,
          },
        ]
      : undefined,
    rating: 0,
    access: [
      {
        id: "wiki",
        label: "Открыть в Википедии",
        primary: true,
        href: result.sourceUrl,
      },
    ],
  };
}

/**
 * Преобразует WikiPersonResult в формат PersonDetail.
 */
export function toPersonDetail(result: WikiPersonResult) {
  return {
    id: `wiki-person-${slugify(result.name)}`,
    name: result.name,
    years: result.years || "Годы не указаны",
    role: result.role || "Роль не указана",
    birthPlace: result.birthPlace || undefined,
    mapPoint: result.coordinates
      ? { latitude: result.coordinates.lat, longitude: result.coordinates.lng }
      : null,
    bio: result.bio || "<p>Биография не заполнена.</p>",
    mentionsCount: 0,
    relatedPlaces: result.coordinates
      ? [
          {
            id: `wiki-place-${slugify(result.name)}`,
            title: "Точка на карте",
            description: `Координаты: ${result.coordinates.lat.toFixed(4)}, ${result.coordinates.lng.toFixed(4)}`,
            placeType: "other" as const,
          },
        ]
      : [],
    articles: [],
    family: result.family,
    tags: result.tags,
  };
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .slice(0, 60);
}
