import { type NextRequest, NextResponse } from "next/server";
import { parseWikipediaArticle } from "@/lib/wikipedia/parser";

// Для cheerio нужен Node.js runtime, edge-режим не подойдёт.
export const runtime = "nodejs";

/**
 * GET /api/parse-wikipedia?url=<ссылка_на_wikipedia>
 * Возвращает JSON с типом "article" или "person" и извлечёнными данными.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "Отсутствует обязательный query-параметр: url" },
      { status: 400 },
    );
  }

  try {
    const result = await parseWikipediaArticle(url);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    const status = message.includes("не найдена") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
