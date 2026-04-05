/**
 * CLI-скрипт для проверки парсера без запуска Next.js.
 *
 * Использование:
 *   npx tsx scripts/test.ts <wikipedia-url>
 *   npx tsx scripts/test.ts https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич
 *   npx tsx scripts/test.ts https://en.wikipedia.org/wiki/Tokyo
 *
 * Если URL не передан, запускается встроенный набор тестовых ссылок.
 */

import { parseWikipediaArticle } from "../src/lib/wikipedia/parser";
import type { WikiParseResult } from "../src/lib/wikipedia/types";

const DEFAULT_TESTS = [
  "https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич", // персона, ru
  "https://en.wikipedia.org/wiki/Marie_Curie",                   // персона, en
  "https://ru.wikipedia.org/wiki/Москва",                        // статья, ru
];

// Упрощённый вывод результата в консоль.

function printResult(result: WikiParseResult): void {
  const sep = "─".repeat(60);
  console.log(`\n${sep}`);
  console.log(`  ТИП   : ${result.type.toUpperCase()}`);
  console.log(`  ЯЗЫК  : ${result.lang}`);
  console.log(sep);

  if (result.type === "person") {
    console.log(`  Имя           : ${result.name}`);
    console.log(`  Годы          : ${result.years || "—"}`);
    console.log(`  Деятельность  : ${result.role || "—"}`);
    console.log(`  Место рожд.   : ${result.birthPlace || "—"}`);
    console.log(`  Семья         : ${JSON.stringify(result.family)}`);
  } else {
    console.log(`  Заголовок     : ${result.title}`);
    console.log(`  Лид           : ${result.lead.slice(0, 120)}…`);
    console.log(`  Связ. персоны : ${result.relatedPersons.slice(0, 5).join(", ") || "—"}`);
  }

  if (result.coordinates) {
    console.log(`  Координаты    : ${result.coordinates.lat}, ${result.coordinates.lng}`);
  }

  console.log(`  Теги (${result.tags.length})     : ${result.tags.slice(0, 6).join(", ")}`);
  console.log(`  Источник      : ${result.sourceUrl}`);
  console.log(`  Длина HTML    : ${("bio" in result ? result.bio : result.body).length} символов`);

  // Показываем первые 300 символов HTML.
  const body = "bio" in result ? result.bio : result.body;
  console.log(`\n  Превью HTML:\n  ${body.slice(0, 300).replace(/\n/g, "\n  ")}…`);
  console.log(`${sep}\n`);
}

// Запуск одного URL и набора тестов.

async function runSingle(url: string): Promise<void> {
  console.log(`\nПарсинг: ${url}`);
  const start = Date.now();
  const result = await parseWikipediaArticle(url);
  console.log(`Готово за ${Date.now() - start} мс`);
  printResult(result);
}

async function runSuite(): Promise<void> {
  console.log("Запуск встроенного набора тестов…\n");
  let passed = 0;
  let failed = 0;

  for (const url of DEFAULT_TESTS) {
    try {
      await runSingle(url);
      passed++;
    } catch (err) {
      console.error(`ОШИБКА: ${url}`);
      console.error(`  ${err instanceof Error ? err.message : String(err)}\n`);
      failed++;
    }
  }

  console.log(`\nИтог: успешно ${passed}, с ошибкой ${failed}`);
}

// Точка входа CLI.

const [, , inputUrl] = process.argv;

if (inputUrl) {
  runSingle(inputUrl).catch((err) => {
    console.error("Ошибка:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
} else {
  runSuite().catch((err) => {
    console.error("Непредвиденная ошибка:", err);
    process.exit(1);
  });
}
