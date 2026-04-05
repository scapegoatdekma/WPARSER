import { extractRelatedPersons } from "./html-cleaner";
import { fetchParsedContent, fetchSummary } from "./fetcher";
import type {
  WikiNetworkEdge,
  WikiNetworkNode,
  WikiNetworkNodeType,
  WikiNetworkResult,
} from "./network-types";
import type { WikipediaSummary } from "./types";
import { parseWikipediaUrl } from "./url-parser";

const DEFAULT_NETWORK_LIMIT = 16;
const MIN_NETWORK_LIMIT = 4;
const MAX_NETWORK_LIMIT = 30;

const PERSON_CATEGORY_PATTERNS = [
  /Персоналии/i,
  /Родившиеся в \d{4} году/i,
  /Умершие в \d{4} году/i,
  /\d{4} births/i,
  /\d{4} deaths/i,
  /Living people/i,
];

const PERSON_HINTS = [
  "поэт",
  "писатель",
  "историк",
  "философ",
  "политик",
  "актёр",
  "режиссёр",
  "учёный",
  "композитор",
  "драматург",
  "writer",
  "poet",
  "actor",
  "actress",
  "politician",
  "scientist",
  "historian",
  "philosopher",
  "composer",
  "director",
];

const PLACE_HINTS = [
  "город",
  "деревня",
  "село",
  "область",
  "район",
  "страна",
  "регион",
  "река",
  "озеро",
  "остров",
  "city",
  "town",
  "village",
  "district",
  "region",
  "country",
  "river",
  "lake",
  "island",
  "capital",
];

function normalizeLimit(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_NETWORK_LIMIT;
  const normalized = Math.trunc(value);
  return Math.min(MAX_NETWORK_LIMIT, Math.max(MIN_NETWORK_LIMIT, normalized));
}

function normalizeTitle(title: string): string {
  return title.trim().replace(/_/g, " ").toLowerCase();
}

function buildNodeId(lang: string, title: string): string {
  return `${lang}:${encodeURIComponent(normalizeTitle(title))}`;
}

function hasAnyHint(text: string, hints: string[]): boolean {
  const lowered = text.toLowerCase();
  return hints.some((hint) => lowered.includes(hint));
}

function detectNodeType(params: {
  description: string;
  hasCoordinates: boolean;
  isPersonCandidate: boolean;
  categories?: string[];
}): WikiNetworkNodeType {
  const { description, hasCoordinates, isPersonCandidate, categories = [] } = params;

  const hasPersonCategory = categories.some((category) =>
    PERSON_CATEGORY_PATTERNS.some((pattern) => pattern.test(category)),
  );

  if (isPersonCandidate || hasPersonCategory || hasAnyHint(description, PERSON_HINTS)) {
    return "person";
  }
  if (hasCoordinates || hasAnyHint(description, PLACE_HINTS)) {
    return "place";
  }
  return "article";
}

function relationForType(type: WikiNetworkNodeType): WikiNetworkEdge["relation"] {
  if (type === "person") return "персона";
  if (type === "place") return "место";
  return "ссылка";
}

function toNode(params: {
  lang: string;
  summary: WikipediaSummary;
  type: WikiNetworkNodeType;
  isRoot?: boolean;
}): WikiNetworkNode {
  const { lang, summary, type, isRoot = false } = params;

  return {
    id: buildNodeId(lang, summary.title),
    title: summary.title,
    type,
    description: summary.description,
    thumbnail: summary.thumbnail?.source,
    coordinates: summary.coordinates
      ? { lat: summary.coordinates.lat, lng: summary.coordinates.lon }
      : undefined,
    sourceUrl: summary.content_urls.desktop.page,
    isRoot,
  };
}

function scoreCandidate(params: {
  summary: WikipediaSummary;
  isPersonCandidate: boolean;
  type: WikiNetworkNodeType;
}): number {
  const { summary, isPersonCandidate, type } = params;

  let score = 0;
  if (isPersonCandidate) score += 3;
  if (summary.coordinates) score += 3;
  if (type === "person") score += 2;
  if (type === "place") score += 2;
  if (summary.thumbnail?.source) score += 1;
  return score;
}

/**
 * Строит сеть связей по статье Википедии (глубина 1):
 * корневая статья -> связанные страницы.
 */
export async function parseWikipediaNetwork(
  rawUrl: string,
  limitInput = DEFAULT_NETWORK_LIMIT,
): Promise<WikiNetworkResult> {
  const limit = normalizeLimit(limitInput);
  const { lang, title } = parseWikipediaUrl(rawUrl);

  const [summary, parsed] = await Promise.all([
    fetchSummary(lang, title),
    fetchParsedContent(lang, title),
  ]);

  if (summary.type === "disambiguation") {
    throw new Error(
      `Страница "${title}" является страницей неоднозначности. Укажите более точную ссылку.`,
    );
  }

  const personCandidateSet = new Set(
    extractRelatedPersons(parsed.links, parsed.categories).map(normalizeTitle),
  );

  const uniqueLinks = Array.from(
    new Set(
      parsed.links.filter(
        (link) => normalizeTitle(link) !== normalizeTitle(title),
      ),
    ),
  );

  const probeLimit = Math.min(uniqueLinks.length, Math.max(limit * 3, limit + 8));
  const probeTitles = uniqueLinks.slice(0, probeLimit);

  const probeSettled = await Promise.allSettled(
    probeTitles.map((probeTitle) => fetchSummary(lang, probeTitle)),
  );

  const scoredNodes: Array<{ node: WikiNetworkNode; score: number }> = [];

  probeSettled.forEach((item, index) => {
    if (item.status !== "fulfilled") return;

    const probeTitle = probeTitles[index];
    const summaryItem = item.value;
    if (summaryItem.type === "disambiguation") return;

    const normalizedProbe = normalizeTitle(probeTitle);
    const normalizedSummaryTitle = normalizeTitle(summaryItem.title);
    const isPersonCandidate =
      personCandidateSet.has(normalizedProbe) ||
      personCandidateSet.has(normalizedSummaryTitle);

    const type = detectNodeType({
      description: summaryItem.description ?? "",
      hasCoordinates: Boolean(summaryItem.coordinates),
      isPersonCandidate,
    });

    const node = toNode({ lang, summary: summaryItem, type });
    const score = scoreCandidate({ summary: summaryItem, isPersonCandidate, type });
    scoredNodes.push({ node, score });
  });

  scoredNodes.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.node.title.localeCompare(b.node.title, lang);
  });

  const selectedNodesMap = new Map<string, WikiNetworkNode>();
  for (const item of scoredNodes) {
    if (selectedNodesMap.size >= limit) break;
    if (!selectedNodesMap.has(item.node.id)) {
      selectedNodesMap.set(item.node.id, item.node);
    }
  }

  const rootType = detectNodeType({
    description: summary.description ?? "",
    hasCoordinates: Boolean(summary.coordinates),
    isPersonCandidate: false,
    categories: parsed.categories,
  });

  const rootNode = toNode({
    lang,
    summary,
    type: rootType,
    isRoot: true,
  });

  const selectedNodes = Array.from(selectedNodesMap.values());
  const edges: WikiNetworkEdge[] = selectedNodes.map((node) => ({
    from: rootNode.id,
    to: node.id,
    relation: relationForType(node.type),
  }));

  return {
    rootId: rootNode.id,
    lang,
    sourceUrl: summary.content_urls.desktop.page,
    limit,
    generatedAt: new Date().toISOString(),
    nodes: [rootNode, ...selectedNodes],
    edges,
  };
}
