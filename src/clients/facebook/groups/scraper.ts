import type { FacebookGroup } from "./groups.js";

export interface FacebookPost {
  id: string;
  message?: string;
  updated_time: string;
  created_time: string;
  from?: {
    name: string;
    id: string;
  };
  comments?: {
    data?: unknown[];
    summary: { total_count: number };
  };
  reactions?: {
    data?: unknown[];
    summary: { total_count: number };
  };
  shares?: {
    count: number;
  };
  attachments?: {
    data: Array<{
      description?: string;
      media?: {
        image?: { src: string; height: number; width: number };
        source?: string;
      };
      target?: { id: string; url: string };
      type: string;
      url: string;
    }>;
  };
}

interface FacebookApiResponse {
  success: boolean;
  message: string;
  data: {
    data: FacebookPost[];
    paging?: { previous?: string; next?: string };
  };
}

const RAPIDAPI_HOST = "facebook-data-api2.p.rapidapi.com";
const POSTS_LIMIT = 150;

const FEED_FIELDS = [
  "message",
  "updated_time",
  "created_time",
  "from",
  "comments.summary(total_count)",
  "reactions.summary(total_count)",
  "shares",
  "attachments",
].join(",");

const buildFeedUrl = (groupId: string): string =>
  `https://${RAPIDAPI_HOST}/graph/v19.0/${groupId}/feed?token_type=EAAGNO&fields=${encodeURIComponent(FEED_FIELDS)}&limit=${POSTS_LIMIT}&order=chronological`;

export const fetchGroupPosts = async (
  group: FacebookGroup,
): Promise<FacebookPost[]> => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY environment variable is not set");
  }

  const url = buildFeedUrl(group.id);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": RAPIDAPI_HOST,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch group ${group.name} (${group.id}): HTTP ${response.status}`,
    );
  }

  const data: FacebookApiResponse = await response.json();

  if (!data.success) {
    throw new Error(
      `API error for group ${group.name}: ${data.message}`,
    );
  }

  return data.data?.data ?? [];
};
