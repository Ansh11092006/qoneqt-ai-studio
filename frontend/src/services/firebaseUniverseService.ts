import { UNIVERSE_CONFIGS, UniverseConfig, getUniverseConfig } from "@/config/universeConfig";

/**
 * Universal video item conforming to requested Firebase schema:
 *
 * universes
 *   ├── cyberverse
 *   ├── fashionverse
 *   ├── startupverse
 *   ├── creatoverse
 *   ├── gamingverse
 *   └── futureverse
 *
 * videos
 *   ├── videoId
 *   ├── title
 *   ├── description
 *   ├── videoUrl
 *   ├── thumbnailUrl
 *   ├── universe
 *   ├── topics
 *   ├── source
 *   ├── creatorId
 *   ├── views
 *   ├── likes
 *   ├── comments
 *   └── createdAt
 */
export interface UniverseVideoItem {
  videoId: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  universe: string;
  topics: string[];
  source: "qoneqt-ai" | "discovery" | "community";
  creatorId: string;
  views: string;
  likes: string;
  comments: string;
  duration?: number;
  createdAt: string;
  isVertical?: boolean;
}

export interface UniverseFeedResponse {
  universe: UniverseConfig;
  topics: string[];
  has_qoneqt_videos: boolean;
  qoneqt_videos: UniverseVideoItem[];
  featured: UniverseVideoItem | null;
  trending: UniverseVideoItem[];
  latest: UniverseVideoItem[];
  ai_picks: UniverseVideoItem[];
  shorts: UniverseVideoItem[];
  total_count: number;
}

const LOCAL_STORAGE_KEY = "qoneqt_universe_videos";

/**
 * Loads Qoneqt-generated videos cached in localStorage (offline / client persistence).
 */
export function getLocalUniverseVideos(universeId?: string): UniverseVideoItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const list: UniverseVideoItem[] = JSON.parse(raw);
    if (universeId) {
      return list.filter((v) => v.universe.toLowerCase() === universeId.toLowerCase());
    }
    return list;
  } catch {
    return [];
  }
}

/**
 * Persists a newly created Qoneqt AI video to the Universe.
 */
export async function saveVideoToUniverse(video: Partial<UniverseVideoItem>): Promise<UniverseVideoItem> {
  const normUniverse = (video.universe || "cyberverse").toLowerCase();
  const cfg = getUniverseConfig(normUniverse);

  const fullItem: UniverseVideoItem = {
    videoId: video.videoId || `qoneqt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: video.title || "Untitled Qoneqt Studio Video",
    description: video.description || "",
    videoUrl: video.videoUrl || "",
    thumbnailUrl: video.thumbnailUrl || null,
    universe: normUniverse,
    topics: video.topics && video.topics.length > 0 ? video.topics : cfg.topics.slice(0, 3),
    source: "qoneqt-ai",
    creatorId: video.creatorId || "@you",
    views: video.views || "1.2K",
    likes: video.likes || "240",
    comments: video.comments || "18",
    duration: video.duration || 15,
    createdAt: video.createdAt || new Date().toISOString(),
    isVertical: video.isVertical ?? true,
  };

  // 1. Save to local storage for instant availability
  try {
    const all = getLocalUniverseVideos();
    const existingIndex = all.findIndex((v) => v.videoId === fullItem.videoId);
    if (existingIndex >= 0) {
      all[existingIndex] = fullItem;
    } else {
      all.unshift(fullItem);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn("[UniverseService] LocalStorage save error:", e);
  }

  // 2. Post to backend universe persistence API (which also bridges to Firebase)
  try {
    await fetch("/api/universe/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fullItem),
    });
  } catch (err) {
    console.warn("[UniverseService] Backend save notice:", err);
  }

  return fullItem;
}

/**
 * Fetches the unified Universe feed containing both curated discovery videos
 * and Qoneqt AI Studio generated videos.
 */
export async function fetchUniverseFeed(
  universeId: string,
  topic?: string
): Promise<UniverseFeedResponse> {
  const cfg = getUniverseConfig(universeId);
  const normId = cfg.id;

  try {
    const queryParam = topic ? `?topic=${encodeURIComponent(topic)}` : "";
    const res = await fetch(`/api/universe/${normId}/feed${queryParam}`);

    if (res.ok) {
      const data: UniverseFeedResponse = await res.json();
      
      // Merge with any client-local videos for this universe
      const localVideos = getLocalUniverseVideos(normId);
      if (localVideos.length > 0) {
        const existingIds = new Set(data.qoneqt_videos.map((v) => v.videoId));
        const newLocal = localVideos.filter((v) => !existingIds.has(v.videoId));
        
        if (newLocal.length > 0) {
          data.qoneqt_videos = [...newLocal, ...data.qoneqt_videos];
          data.has_qoneqt_videos = true;
          data.trending = [...newLocal, ...data.trending];
          data.latest = [...newLocal, ...data.latest];
          if (!data.featured) {
            data.featured = newLocal[0];
          }
          data.total_count += newLocal.length;
        }
      }

      return data;
    }
  } catch (err) {
    console.warn("[UniverseService] Backend fetch error, falling back to local dataset:", err);
  }

  // Resilient fallback if backend is unreachable
  const localVideos = getLocalUniverseVideos(normId);
  return {
    universe: cfg,
    topics: cfg.topics,
    has_qoneqt_videos: localVideos.length > 0,
    qoneqt_videos: localVideos,
    featured: localVideos[0] || null,
    trending: localVideos,
    latest: localVideos,
    ai_picks: localVideos,
    shorts: localVideos,
    total_count: localVideos.length,
  };
}
