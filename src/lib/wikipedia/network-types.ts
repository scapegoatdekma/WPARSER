import type { WikiCoordinates } from "./types";

export type WikiNetworkNodeType = "article" | "person" | "place";

export type WikiNetworkNode = {
  id: string;
  title: string;
  type: WikiNetworkNodeType;
  description?: string;
  thumbnail?: string;
  coordinates?: WikiCoordinates;
  sourceUrl: string;
  isRoot?: boolean;
};

export type WikiNetworkEdge = {
  from: string;
  to: string;
  relation: "персона" | "место" | "ссылка";
};

export type WikiNetworkResult = {
  rootId: string;
  lang: string;
  sourceUrl: string;
  limit: number;
  generatedAt: string;
  nodes: WikiNetworkNode[];
  edges: WikiNetworkEdge[];
};
