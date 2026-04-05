import * as cheerio from "cheerio";

import { fetchParsedContent, fetchSummary } from "./fetcher";
import {
  cleanWikipediaBody,
  extractRelatedPersons,
  extractTags,
} from "./html-cleaner";
import {
  extractInfobox,
  isPersonArticle,
  resolveBirthPlace,
  resolveFamily,
  resolveRole,
  resolveYears,
} from "./infobox";
import { parseWikipediaUrl } from "./url-parser";
import type { WikiArticleResult, WikiParseResult, WikiPersonResult } from "./types";

/**
 * Точка входа парсера.
 * Принимает ссылку Википедии и возвращает структурированный результат.
 */
export async function parseWikipediaArticle(
  rawUrl: string,
): Promise<WikiParseResult> {
  // Из ссылки получаем язык и заголовок статьи.
  const { lang, title } = parseWikipediaUrl(rawUrl);

  // Запрашиваем summary и полный HTML одновременно.
  const [summary, parsed] = await Promise.all([
    fetchSummary(lang, title),
    fetchParsedContent(lang, title),
  ]);

  if (summary.type === "disambiguation") {
    throw new Error(
      `Страница "${title}" является страницей неоднозначности. Укажите более точную ссылку.`,
    );
  }

  // Загружаем HTML в cheerio.
  const $ = cheerio.load(parsed.html);

  // Инфобокс извлекаем до очистки DOM, иначе он будет удалён.
  const infobox = extractInfobox($);

  // Определяем, это биография или обычная статья.
  const isPerson = isPersonArticle(parsed.categories, infobox);

  // Очищаем HTML до безопасного и предсказуемого формата.
  const body = cleanWikipediaBody($, lang);

  // Общие поля для обоих типов результата.
  const tags = extractTags(parsed.categories);

  const coordinates =
    summary.coordinates
      ? { lat: summary.coordinates.lat, lng: summary.coordinates.lon }
      : undefined;

  const thumbnail = summary.thumbnail?.source;
  const sourceUrl = summary.content_urls.desktop.page;
  const lastModified = summary.timestamp;

  if (isPerson) {
    const result: WikiPersonResult = {
      type: "person",
      name: summary.title,
      years: resolveYears(infobox),
      role:
        resolveRole(infobox) ||
        summary.description ||
        "",
      birthPlace: resolveBirthPlace(infobox),
      bio: body,
      tags,
      family: resolveFamily(infobox),
      thumbnail,
      coordinates,
      sourceUrl,
      lang,
      lastModified,
    };
    return result;
  }

  const result: WikiArticleResult = {
    type: "article",
    title: summary.title,
    lead: summary.extract,
    body,
    tags,
    relatedPersons: extractRelatedPersons(parsed.links, parsed.categories),
    thumbnail,
    coordinates,
    sourceUrl,
    lang,
    lastModified,
  };
  return result;
}
