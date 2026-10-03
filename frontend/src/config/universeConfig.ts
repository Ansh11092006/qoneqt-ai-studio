export interface UniverseConfig {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  colorName: "cyan" | "pink" | "green" | "purple" | "red" | "yellow";
  bgColor: string;
  emoji: string;
  topics: string[];
  keywords: string[];
  explorers: string;
  portals: string;
  heroPrompt: string;
}

export const UNIVERSE_CONFIGS: Record<string, UniverseConfig> = {
  cyberverse: {
    id: "cyberverse",
    title: "CYBERVERSE",
    subtitle: "AI, Technology & Digital Innovation",
    description: "Explore cutting-edge artificial intelligence, coding architectures, cybersecurity breakdowns, and high-tech digital horizons.",
    color: "#00ffff",
    colorName: "cyan",
    bgColor: "#081426",
    emoji: "🌐",
    topics: [
      "AI",
      "Technology",
      "Coding",
      "Cybersecurity",
      "Programming",
      "Servers",
      "Digital Innovation",
    ],
    keywords: [
      "cybersecurity",
      "artificial intelligence",
      "technology",
      "coding",
      "programming",
      "server",
    ],
    explorers: "42.3K",
    portals: "1.2M",
    heroPrompt: "A high-speed cybernetic data stream zooming through a futuristic AI mainframe at night with glowing blue neon circuits.",
  },

  fashionverse: {
    id: "fashionverse",
    title: "FASHIONVERSE",
    subtitle: "Fashion, Beauty & Luxury Style",
    description: "Discover avant-garde runway collections, high-fashion streetwear, aesthetic beauty guides, and luxury brand showcases.",
    color: "#ff6b9d",
    colorName: "pink",
    bgColor: "#1a0824",
    emoji: "👗",
    topics: [
      "Fashion",
      "Beauty",
      "Style",
      "Luxury",
      "Runway",
      "Streetwear",
      "Haute Couture",
    ],
    keywords: [
      "fashion",
      "fashion show",
      "beauty",
      "luxury",
      "model",
      "streetwear",
    ],
    explorers: "38.1K",
    portals: "890K",
    heroPrompt: "A luxury haute-couture fashion show with cinematic slow-motion models walking a neon-lit reflective catwalk.",
  },

  startupverse: {
    id: "startupverse",
    title: "STARTUPVERSE",
    subtitle: "Startups, Business & Entrepreneurship",
    description: "Uncover breakthrough founder playbooks, venture capital secrets, exponential growth frameworks, and modern market strategies.",
    color: "#00ff88",
    colorName: "green",
    bgColor: "#071611",
    emoji: "🚀",
    topics: [
      "Startups",
      "Business",
      "Finance",
      "Entrepreneurship",
      "Growth",
      "Venture Capital",
      "Productivity",
    ],
    keywords: [
      "startup",
      "business",
      "entrepreneur",
      "finance",
      "office",
      "technology business",
    ],
    explorers: "51.7K",
    portals: "1.5M",
    heroPrompt: "An energetic pitch day in a glass skyscraper headquarters overlooking a bustling metropolitan skyline at dawn.",
  },

  creatoverse: {
    id: "creatoverse",
    title: "CREATOVERSE",
    subtitle: "Art, Music & Creative Design",
    description: "Immerse in visual storytelling, digital painting, generative audio, music composition, and viral creator workflows.",
    color: "#8b5cf6",
    colorName: "purple",
    bgColor: "#120a26",
    emoji: "🎨",
    topics: [
      "Art",
      "Music",
      "Content",
      "Creative Design",
      "Visual Effects",
      "Animation",
      "Storytelling",
    ],
    keywords: [
      "artist",
      "music",
      "creative",
      "design",
      "painting",
      "content creator",
    ],
    explorers: "67.2K",
    portals: "2.1M",
    heroPrompt: "A visionary digital artist working with holographic brushes and floating neon ink particles in a dark studio.",
  },

  gamingverse: {
    id: "gamingverse",
    title: "GAMINGVERSE",
    subtitle: "Gaming, Esports & Entertainment",
    description: "Enter competitive arena championships, high-octane gameplay highlights, speedrun records, and next-gen gaming hardware rigs.",
    color: "#ff0040",
    colorName: "red",
    bgColor: "#16070b",
    emoji: "🎮",
    topics: [
      "Gaming",
      "Esports",
      "Entertainment",
      "Game Dev",
      "Streaming",
      "Retro Games",
      "Battlestations",
    ],
    keywords: [
      "gaming",
      "esports",
      "gamer",
      "gaming setup",
      "video game",
      "streaming",
    ],
    explorers: "89.4K",
    portals: "3.4M",
    heroPrompt: "A hyper-detailed battle arena in an esports stadium with massive glowing neon screens and roaring cheering crowds.",
  },

  futureverse: {
    id: "futureverse",
    title: "FUTUREVERSE",
    subtitle: "Science, Space & Next-Gen Innovation",
    description: "Journey beyond the cosmos, quantum propulsion, autonomous robotics, nuclear fusion, and the next 100 years of civilization.",
    color: "#ffd700",
    colorName: "yellow",
    bgColor: "#161304",
    emoji: "🔮",
    topics: [
      "Science",
      "Space",
      "Robotics",
      "Future Technology",
      "Innovation",
      "Cosmology",
      "Quantum Physics",
    ],
    keywords: [
      "space",
      "science",
      "robotics",
      "future technology",
      "innovation",
      "astronaut",
    ],
    explorers: "33.8K",
    portals: "780K",
    heroPrompt: "A futuristic orbital space station orbiting planet Earth with glowing solar arrays and an astronaut floating in zero gravity.",
  },
};

// Aliases
UNIVERSE_CONFIGS["creatorverse"] = UNIVERSE_CONFIGS["creatoverse"];

export function getUniverseConfig(id: string): UniverseConfig {
  const norm = id.toLowerCase();
  return UNIVERSE_CONFIGS[norm] || UNIVERSE_CONFIGS["cyberverse"];
}
