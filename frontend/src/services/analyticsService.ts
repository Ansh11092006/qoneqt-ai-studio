import { JobStatus } from "@/api/client";

export interface KPICardData {
  id: string;
  title: string;
  value: string;
  badge: string;
  badgeType: "positive" | "neutral" | "accent";
  subtitle: string;
  iconName: "eye" | "activity" | "users" | "award" | "trending" | "refresh" | "sparkles" | "dollar" | "bar-chart" | "globe" | "clock" | "heart";
  accentColor: string; // Hex color for glow and accents
}

export interface AnalyticsData {
  overview: {
    kpis: [KPICardData, KPICardData, KPICardData, KPICardData];
    viewsTrend: { label: string; views: number; benchmark: number }[];
    engagementTrend: { label: string; rate: number }[];
    followerGrowth: { label: string; count: number }[];
    contentPerformance: {
      id: string;
      title: string;
      views: string;
      engagement: string;
      score: number;
      status: string;
    }[];
    aiQualityDistribution: {
      category: string;
      score: number;
      weight: string;
      status: string;
    }[];
    hookRetention: { time: string; ret: number; color: string }[];
    aiRecommendations: { title: string; detail: string; tag: string }[];
  };

  growth: {
    kpis: [KPICardData, KPICardData, KPICardData, KPICardData];
    followerGrowthDaily: { day: string; gain: number; loss: number; net: number }[];
    retentionCurve: { day: string; retention: number; industryBenchmark: number }[];
    newVsReturning: {
      category: string;
      percentage: number;
      count: string;
      color: string;
    }[];
    cohortRetention: {
      cohort: string;
      week1: number;
      week2: number;
      week3: number;
      week4: number;
    }[];
    churnRate: { month: string; rate: number; benchmark: number }[];
    engagementOverTime: { period: string; likes: number; shares: number; comments: number }[];
    growthSources: { source: string; percentage: number; count: string; color: string }[];
  };

  revenue: {
    kpis: [KPICardData, KPICardData, KPICardData, KPICardData];
    mrrGrowth: { month: string; mrr: number; target: number }[];
    revenueBreakdown: { stream: string; amount: number; percentage: number; color: string }[];
    creatorSubscriptions: { tier: string; activeSubscribers: number; price: string; total: string; color: string }[];
    adRevenueStreams: { format: string; impressions: string; rpm: string; payout: string }[];
    revenueByMonth: { month: string; creator: number; ad: number; total: number }[];
    revenueBySource: { channel: string; share: number; amount: string }[];
    financialMetrics: {
      arpu: string;
      arpuGrowth: string;
      subscriptionConversion: string;
      conversionGrowth: string;
      grossMargin: string;
      netPayoutPeriod: string;
    };
  };

  audience: {
    kpis: [KPICardData, KPICardData, KPICardData, KPICardData];
    ageDistribution: { range: string; percentage: number; color: string }[];
    genderDistribution: { gender: string; percentage: number; count: string; color: string }[];
    geographicDistribution: {
      topCountries: { country: string; flag: string; percentage: number; viewers: string }[];
      topCities: { city: string; country: string; percentage: number }[];
    };
    audienceInterests: { niche: string; affinity: number; growth: string }[];
    newVsReturningUsers: { type: string; percentage: number; change: string }[];
    devicePlatformBreakdown: { device: string; share: number; os: string; color: string }[];
    watchTimeDistribution: { bracket: string; percentage: number; completionRate: string }[];
  };
}

/**
 * Base Analytics dataset (consistent, predictable and not randomly mutated on re-renders).
 */
export const baseAnalyticsData: AnalyticsData = {
  // -------------------------------------------------------------
  // 1. OVERVIEW BI
  // -------------------------------------------------------------
  overview: {
    kpis: [
      {
        id: "ov-views",
        title: "Total Views",
        value: "1.84M",
        badge: "↑ 24.8% this month",
        badgeType: "positive",
        subtitle: "Qoneqt Feed + Social Cross-Post",
        iconName: "eye",
        accentColor: "#ff0055",
      },
      {
        id: "ov-engagement",
        title: "Engagement Rate",
        value: "12.8%",
        badge: "↑ 4.2% this month",
        badgeType: "positive",
        subtitle: "Average engagement across published content",
        iconName: "heart",
        accentColor: "#00f0ff",
      },
      {
        id: "ov-followers",
        title: "Followers Gained",
        value: "+12.4K",
        badge: "↑ 18.6%",
        badgeType: "positive",
        subtitle: "Across Qoneqt & Socials",
        iconName: "users",
        accentColor: "#10b981",
      },
      {
        id: "ov-qc",
        title: "AI Quality Score",
        value: "93/100",
        badge: "Top 5% Tier",
        badgeType: "accent",
        subtitle: "7-Point Automated QC",
        iconName: "award",
        accentColor: "#f59e0b",
      },
    ],
    viewsTrend: [
      { label: "Mon", views: 210, benchmark: 180 },
      { label: "Tue", views: 265, benchmark: 200 },
      { label: "Wed", views: 320, benchmark: 220 },
      { label: "Thu", views: 290, benchmark: 210 },
      { label: "Fri", views: 410, benchmark: 260 },
      { label: "Sat", views: 480, benchmark: 310 },
      { label: "Sun", views: 540, benchmark: 350 },
    ],
    engagementTrend: [
      { label: "W1", rate: 9.8 },
      { label: "W2", rate: 10.4 },
      { label: "W3", rate: 11.9 },
      { label: "W4", rate: 12.8 },
    ],
    followerGrowth: [
      { label: "Week 1", count: 2100 },
      { label: "Week 2", count: 2850 },
      { label: "Week 3", count: 3400 },
      { label: "Week 4", count: 4050 },
    ],
    contentPerformance: [
      {
        id: "cp-1",
        title: "Football Champions League Final Hype",
        views: "640K",
        engagement: "14.2%",
        score: 96,
        status: "Viral Hit",
      },
      {
        id: "cp-2",
        title: "5 Cybersecurity Traps Students Face",
        views: "420K",
        engagement: "13.6%",
        score: 94,
        status: "Trending",
      },
      {
        id: "cp-3",
        title: "AI Agent Architecture in 60 Seconds",
        views: "310K",
        engagement: "12.1%",
        score: 95,
        status: "High Retention",
      },
      {
        id: "cp-4",
        title: "Quantum Computing Breakthroughs",
        views: "270K",
        engagement: "11.4%",
        score: 91,
        status: "Evergreen",
      },
    ],
    aiQualityDistribution: [
      { category: "Visual Pacing & B-Roll Match", score: 96, weight: "25%", status: "Optimal" },
      { category: "Audio Clarity & Voice Timings", score: 94, weight: "20%", status: "Optimal" },
      { category: "Hook Retention Strength", score: 95, weight: "20%", status: "Exceptional" },
      { category: "ASS Word-Level Sync", score: 92, weight: "15%", status: "High" },
      { category: "Brand Safety & Polish", score: 98, weight: "20%", status: "Optimal" },
    ],
    hookRetention: [
      { time: "0s (Hook)", ret: 98, color: "#ff0055" },
      { time: "3s", ret: 93, color: "#ff0055" },
      { time: "6s", ret: 89, color: "#ff0055" },
      { time: "12s", ret: 85, color: "#ff0055" },
      { time: "18s", ret: 81, color: "#ff0055" },
      { time: "24s", ret: 77, color: "#ff0055" },
      { time: "30s (CTA)", ret: 74, color: "#ff0055" },
    ],
    aiRecommendations: [
      { title: "Publish 3 more videos this week", detail: "Channels posting 5+ shorts weekly grow 2.4x faster.", tag: "Schedule" },
      { title: "Sports & Cyber niches outperform", detail: "+42% higher retention in first 6 seconds.", tag: "Niche" },
      { title: "Word-highlighted ASS Captions active", detail: "Boosts silent mobile view completion by +18%.", tag: "Captions" },
      { title: "Optimal Posting Window: 6:00 PM EST", detail: "Peak viewer velocity on Qoneqt Feed.", tag: "Timing" },
    ],
  },

  // -------------------------------------------------------------
  // 2. GROWTH & RETENTION
  // -------------------------------------------------------------
  growth: {
    kpis: [
      {
        id: "gr-new-followers",
        title: "New Followers",
        value: "+12.4K",
        badge: "↑ 18.6% MoM",
        badgeType: "positive",
        subtitle: "High-growth viral short conversions",
        iconName: "users",
        accentColor: "#ff0055",
      },
      {
        id: "gr-growth-rate",
        title: "Follower Growth Rate",
        value: "18.6%",
        badge: "↑ 3.4% vs last period",
        badgeType: "positive",
        subtitle: "Net follower acceleration index",
        iconName: "trending",
        accentColor: "#00f0ff",
      },
      {
        id: "gr-retention-30d",
        title: "30-Day Retention",
        value: "72.4%",
        badge: "↑ 5.1% benchmark",
        badgeType: "positive",
        subtitle: "Returning viewers within 30-day window",
        iconName: "refresh",
        accentColor: "#10b981",
      },
      {
        id: "gr-returning-audience",
        title: "Returning Audience",
        value: "64.8%",
        badge: "↑ 8.2% loyalty",
        badgeType: "accent",
        subtitle: "Viewers who consumed 3+ videos",
        iconName: "sparkles",
        accentColor: "#f59e0b",
      },
    ],
    followerGrowthDaily: [
      { day: "Mon", gain: 420, loss: 35, net: 385 },
      { day: "Tue", gain: 510, loss: 42, net: 468 },
      { day: "Wed", gain: 640, loss: 50, net: 590 },
      { day: "Thu", gain: 580, loss: 38, net: 542 },
      { day: "Fri", gain: 820, loss: 55, net: 765 },
      { day: "Sat", gain: 960, loss: 62, net: 898 },
      { day: "Sun", gain: 1100, loss: 70, net: 1030 },
    ],
    retentionCurve: [
      { day: "Day 1", retention: 88, industryBenchmark: 68 },
      { day: "Day 3", retention: 81, industryBenchmark: 55 },
      { day: "Day 7", retention: 76, industryBenchmark: 46 },
      { day: "Day 14", retention: 74, industryBenchmark: 38 },
      { day: "Day 21", retention: 73, industryBenchmark: 32 },
      { day: "Day 30", retention: 72.4, industryBenchmark: 28 },
    ],
    newVsReturning: [
      { category: "Returning Viewers", percentage: 64.8, count: "184.0K", color: "#ff0055" },
      { category: "New Discovery", percentage: 35.2, count: "100.0K", color: "#00f0ff" },
    ],
    cohortRetention: [
      { cohort: "Week 1", week1: 100, week2: 82, week3: 75, week4: 72 },
      { cohort: "Week 2", week1: 100, week2: 84, week3: 77, week4: 73 },
      { cohort: "Week 3", week1: 100, week2: 86, week3: 79, week4: 75 },
      { cohort: "Week 4", week1: 100, week2: 88, week3: 81, week4: 76 },
    ],
    churnRate: [
      { month: "Jan", rate: 8.4, benchmark: 12.0 },
      { month: "Feb", rate: 7.6, benchmark: 11.5 },
      { month: "Mar", rate: 6.9, benchmark: 11.0 },
      { month: "Apr", rate: 6.2, benchmark: 10.5 },
    ],
    engagementOverTime: [
      { period: "W1", likes: 14200, comments: 2400, shares: 3800 },
      { period: "W2", likes: 16800, comments: 2900, shares: 4400 },
      { period: "W3", likes: 19500, comments: 3400, shares: 5200 },
      { period: "W4", likes: 23400, comments: 4100, shares: 6600 },
    ],
    growthSources: [
      { source: "Qoneqt Feed Discovery", percentage: 56, count: "6.9K", color: "#ff0055" },
      { source: "Search & Hashtags", percentage: 22, count: "2.7K", color: "#00f0ff" },
      { source: "Cross-Platform Socials", percentage: 14, count: "1.7K", color: "#10b981" },
      { source: "Direct Profile / Links", percentage: 8, count: "1.1K", color: "#f59e0b" },
    ],
  },

  // -------------------------------------------------------------
  // 3. REVENUE & EARNINGS
  // -------------------------------------------------------------
  revenue: {
    kpis: [
      {
        id: "rev-mrr",
        title: "Monthly MRR",
        value: "$14,280",
        badge: "↑ 34.2% Growth",
        badgeType: "positive",
        subtitle: "Creator Subscriptions & Ads",
        iconName: "dollar",
        accentColor: "#10b981",
      },
      {
        id: "rev-arr",
        title: "ARR",
        value: "$171,360",
        badge: "↑ 29.4%",
        badgeType: "positive",
        subtitle: "Annualized recurring revenue",
        iconName: "trending",
        accentColor: "#ff0055",
      },
      {
        id: "rev-creator",
        title: "Creator Revenue",
        value: "$9,840",
        badge: "↑ 21.7%",
        badgeType: "positive",
        subtitle: "Subscriptions + creator monetization",
        iconName: "award",
        accentColor: "#00f0ff",
      },
      {
        id: "rev-ad",
        title: "Ad Revenue",
        value: "$4,440",
        badge: "↑ 42.8%",
        badgeType: "positive",
        subtitle: "Qoneqt Feed + Social Advertising",
        iconName: "bar-chart",
        accentColor: "#f59e0b",
      },
    ],
    mrrGrowth: [
      { month: "Nov", mrr: 7200, target: 7000 },
      { month: "Dec", mrr: 8900, target: 8500 },
      { month: "Jan", mrr: 10400, target: 10000 },
      { month: "Feb", mrr: 11800, target: 11500 },
      { month: "Mar", mrr: 13100, target: 12500 },
      { month: "Apr", mrr: 14280, target: 14000 },
    ],
    revenueBreakdown: [
      { stream: "Creator Subscriptions", amount: 9840, percentage: 68.9, color: "#10b981" },
      { stream: "Feed Video Ads", amount: 3210, percentage: 22.5, color: "#ff0055" },
      { stream: "Brand Sponsorships & Sparks", amount: 1230, percentage: 8.6, color: "#00f0ff" },
    ],
    creatorSubscriptions: [
      { tier: "Pro Creator Studio", activeSubscribers: 240, price: "$29/mo", total: "$6,960", color: "#10b981" },
      { tier: "Elite Viral Pass", activeSubscribers: 42, price: "$49/mo", total: "$2,058", color: "#ff0055" },
      { tier: "Agency Automation", activeSubscribers: 8, price: "$103/mo", total: "$822", color: "#00f0ff" },
    ],
    adRevenueStreams: [
      { format: "Pre-Roll & Interstitial Shorts", impressions: "720K", rpm: "$3.40", payout: "$2,448" },
      { format: "In-Feed Sponsored Cards", impressions: "480K", rpm: "$2.90", payout: "$1,392" },
      { format: "Interactive CTA Overlays", impressions: "140K", rpm: "$4.30", payout: "$600" },
    ],
    revenueByMonth: [
      { month: "Nov", creator: 4800, ad: 2400, total: 7200 },
      { month: "Dec", creator: 6100, ad: 2800, total: 8900 },
      { month: "Jan", creator: 7200, ad: 3200, total: 10400 },
      { month: "Feb", creator: 8100, ad: 3700, total: 11800 },
      { month: "Mar", creator: 9000, ad: 4100, total: 13100 },
      { month: "Apr", creator: 9840, ad: 4440, total: 14280 },
    ],
    revenueBySource: [
      { channel: "Direct Creator Pass", share: 62, amount: "$8,854" },
      { channel: "Qoneqt Native Ad Pool", share: 24, amount: "$3,427" },
      { channel: "Social Affiliate Boost", share: 14, amount: "$1,999" },
    ],
    financialMetrics: {
      arpu: "$9.62",
      arpuGrowth: "+14.8% MoM",
      subscriptionConversion: "8.4%",
      conversionGrowth: "+2.2% vs avg",
      grossMargin: "84.2%",
      netPayoutPeriod: "15th of Every Month",
    },
  },

  // -------------------------------------------------------------
  // 4. AUDIENCE & DEMOGRAPHICS
  // -------------------------------------------------------------
  audience: {
    kpis: [
      {
        id: "aud-total",
        title: "Total Audience",
        value: "284K",
        badge: "↑ 15.2% Reach",
        badgeType: "positive",
        subtitle: "Unique viewers reached across network",
        iconName: "globe",
        accentColor: "#00f0ff",
      },
      {
        id: "aud-active",
        title: "Active Audience",
        value: "184K",
        badge: "↑ 12.4%",
        badgeType: "positive",
        subtitle: "Monthly active engaged viewers",
        iconName: "users",
        accentColor: "#ff0055",
      },
      {
        id: "aud-watchtime",
        title: "Average Watch Time",
        value: "38.6 sec",
        badge: "↑ 4.8s vs benchmark",
        badgeType: "positive",
        subtitle: "High completion loop benchmark",
        iconName: "clock",
        accentColor: "#10b981",
      },
      {
        id: "aud-engagement",
        title: "Engagement Rate",
        value: "12.8%",
        badge: "↑ 2.1%",
        badgeType: "accent",
        subtitle: "Likes, comments, shares & saves ratio",
        iconName: "heart",
        accentColor: "#f59e0b",
      },
    ],
    ageDistribution: [
      { range: "18-24", percentage: 38, color: "#ff0055" },
      { range: "25-34", percentage: 44, color: "#00f0ff" },
      { range: "35-44", percentage: 12, color: "#10b981" },
      { range: "45+", percentage: 6, color: "#f59e0b" },
    ],
    genderDistribution: [
      { gender: "Male", percentage: 62, count: "176K", color: "#00f0ff" },
      { gender: "Female", percentage: 34, count: "96.5K", color: "#ff0055" },
      { gender: "Other / Unspecified", percentage: 4, count: "11.5K", color: "#10b981" },
    ],
    geographicDistribution: {
      topCountries: [
        { country: "United States", flag: "🇺🇸", percentage: 42, viewers: "119.2K" },
        { country: "India", flag: "🇮🇳", percentage: 28, viewers: "79.5K" },
        { country: "United Kingdom", flag: "🇬🇧", percentage: 12, viewers: "34.0K" },
        { country: "Germany", flag: "🇩🇪", percentage: 8, viewers: "22.7K" },
        { country: "Japan", flag: "🇯🇵", percentage: 6, viewers: "17.0K" },
        { country: "Canada", flag: "🇨🇦", percentage: 4, viewers: "11.6K" },
      ],
      topCities: [
        { city: "New York", country: "United States", percentage: 14 },
        { city: "London", country: "United Kingdom", percentage: 11 },
        { city: "Mumbai", country: "India", percentage: 10 },
        { city: "Berlin", country: "Germany", percentage: 7 },
        { city: "Tokyo", country: "Japan", percentage: 6 },
        { city: "San Francisco", country: "United States", percentage: 5 },
      ],
    },
    audienceInterests: [
      { niche: "AI & Future Tech", affinity: 94, growth: "+28%" },
      { niche: "Football & Sports Moments", affinity: 88, growth: "+34%" },
      { niche: "Cinematic Filmmaking & VFX", affinity: 82, growth: "+19%" },
      { niche: "Coding & Cybersecurity", affinity: 76, growth: "+22%" },
      { niche: "Finance & Wealth Creation", affinity: 68, growth: "+15%" },
    ],
    newVsReturningUsers: [
      { type: "Returning Loyalists", percentage: 64.8, change: "+8.2% vs last month" },
      { type: "New Discoveries", percentage: 35.2, change: "+14.6% vs last month" },
    ],
    devicePlatformBreakdown: [
      { device: "Mobile iOS (iPhone)", share: 52, os: "iOS 18+", color: "#ff0055" },
      { device: "Mobile Android", share: 32, os: "Android 14+", color: "#00f0ff" },
      { device: "Desktop Web", share: 12, os: "Chrome/Safari", color: "#10b981" },
      { device: "Tablet & TV", share: 4, os: "iPadOS & Cast", color: "#f59e0b" },
    ],
    watchTimeDistribution: [
      { bracket: "0 - 10s", percentage: 100, completionRate: "100%" },
      { bracket: "10 - 20s", percentage: 89, completionRate: "89%" },
      { bracket: "20 - 30s", percentage: 78, completionRate: "78%" },
      { bracket: "Full 30s+ Loop", percentage: 68, completionRate: "68%" },
    ],
  },
};

/**
 * Merges real backend job statistics (QC scores, completed job counts)
 * into the centralized analytics dataset.
 */
export function buildAnalyticsData(jobs: JobStatus[] = []): AnalyticsData {
  const data = JSON.parse(JSON.stringify(baseAnalyticsData)) as AnalyticsData;

  const completed = jobs.filter((j) => j.status === "completed");
  if (completed.length > 0) {
    const scores = completed
      .map((j) => j.qc_report?.score)
      .filter((s): s is number => typeof s === "number");
    
    if (scores.length > 0) {
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      data.overview.kpis[3].value = `${avgScore}/100`;
    }
  }

  return data;
}
