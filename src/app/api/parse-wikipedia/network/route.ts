import { type NextRequest, NextResponse } from "next/server";
import { parseWikipediaNetwork } from "@/lib/wikipedia/network";

export const runtime = "nodejs";

/**
 * GET /api/parse-wikipedia/network?url=<ссылка_на_wikipedia>&limit=<число>
 * Возвращает сеть связей (глубина 1) для статьи.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const limitParam = req.nextUrl.searchParams.get("limit");

  if (!url) {
    return NextResponse.json(
      { error: "Отсутствует обязательный query-параметр: url" },
      { status: 400 },
    );
  }

  const parsedLimit = Number.parseInt(limitParam ?? "16", 10);
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : 16;

  try {
    const result = await parseWikipediaNetwork(url, limit);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    const status = message.includes("не найдена") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
