import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Analytics3DVisualizer } from "@/components/3d/Analytics3DVisualizer";
import {
  Eye, Users, Award, TrendingUp, DollarSign, BarChart3,
  Globe, Clock, Heart, RefreshCw, Sparkles, CheckCircle2,
  Flame, Lightbulb, Smartphone, Shield, ArrowUpRight,
  TrendingDown, PieChart, Layers, Zap, Sliders, Play
} from "lucide-react";
import { useAnalytics, AnalyticsTab } from "@/hooks/useAnalytics";
import { KPICardData } from "@/services/analyticsService";

// Helper to render KPI icon by name
const renderKpiIcon = (name: KPICardData["iconName"], color: string, size = 18) => {
  switch (name) {
    case "eye":
      return <Eye size={size} style={{ color }} />;
    case "activity":
    case "heart":
      return <Heart size={size} style={{ color }} />;
    case "users":
      return <Users size={size} style={{ color }} />;
    case "award":
      return <Award size={size} style={{ color }} />;
    case "trending":
      return <TrendingUp size={size} style={{ color }} />;
    case "refresh":
      return <RefreshCw size={size} style={{ color }} />;
    case "sparkles":
      return <Sparkles size={size} style={{ color }} />;
    case "dollar":
      return <DollarSign size={size} style={{ color }} />;
    case "bar-chart":
      return <BarChart3 size={size} style={{ color }} />;
    case "globe":
      return <Globe size={size} style={{ color }} />;
    case "clock":
      return <Clock size={size} style={{ color }} />;
    default:
      return <Sparkles size={size} style={{ color }} />;
  }
};

export const AnalyticsPage: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    data,
    currentKpis,
    loading,
    completedJobsCount
  } = useAnalytics("bi");

  const [highlightedKpiId, setHighlightedKpiId] = React.useState<string | null>(null);

  const tabs: { id: AnalyticsTab; label: string }[] = [
    { id: "bi", label: "Overview BI" },
    { id: "growth", label: "Growth & Retention" },
    { id: "revenue", label: "Revenue & Earnings" },
    { id: "audience", label: "Audience & Demographics" },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ========================================================= */}
        {/* HEADER & SUBSECTION NAVIGATION                            */}
        {/* ========================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="text-[#ff0055]" size={20} />
              <span className="text-xs font-mono uppercase tracking-widest text-[#ff0055]">
                Qoneqt Intelligence
              </span>
              {completedJobsCount > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                  {completedJobsCount} live videos analyzed
                </span>
              )}
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl font-black text-white">
              Business <span className="text-[#ff0055]">Intelligence</span>
            </h1>
            <p className="text-sm text-white/60 mt-1">
              Real-time intelligence across content performance, audience growth, revenue and creator analytics.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#141213] rounded-2xl border border-white/10 flex-wrap">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setHighlightedKpiId(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
                    isActive
                      ? "bg-[#ff0055] text-white shadow-lg shadow-[#ff0055]/30"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* TOP SECTION: 3D Visualization System + 4 DYNAMIC KPI CARDS */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* 3D Dynamic Analytics Canvas */}
          <div className="lg:col-span-6 flex flex-col">
            <Analytics3DVisualizer
              activeTab={activeTab}
              currentKpis={currentKpis}
              highlightedKpiId={highlightedKpiId}
              onNodeHighlight={(kpiId) => setHighlightedKpiId(kpiId)}
              onNodeSelect={(kpiId) => setHighlightedKpiId(kpiId)}
            />
          </div>

          {/* Business Metrics Grid — Updates Dynamically Per Selected Tab */}
          <div className="lg:col-span-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="grid grid-cols-2 gap-4 h-full"
              >
                {currentKpis.map((kpi) => {
                  const isHighlighted = highlightedKpiId === kpi.id;
                  return (
                    <div
                      key={kpi.id}
                      onMouseEnter={() => setHighlightedKpiId(kpi.id)}
                      onMouseLeave={() => setHighlightedKpiId(null)}
                      className={`p-5 rounded-3xl bg-[#171516] border flex flex-col justify-between transition-all duration-200 group relative overflow-hidden cursor-pointer ${
                        isHighlighted
                          ? "border-opacity-100 ring-2 scale-[1.02] shadow-2xl"
                          : "border-white/10 hover:border-white/20"
                      }`}
                      style={{
                        borderColor: isHighlighted ? kpi.accentColor : undefined,
                        boxShadow: isHighlighted ? `0 0 25px ${kpi.accentColor}33` : undefined,
                      }}
                    >
                      {/* Glow accent */}
                      <div
                        className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl transition-opacity pointer-events-none ${
                          isHighlighted ? "opacity-35" : "opacity-0 group-hover:opacity-20"
                        }`}
                        style={{ backgroundColor: kpi.accentColor }}
                      />

                      <div className="flex items-center justify-between text-white/50">
                        <span className="text-xs font-mono uppercase font-bold truncate pr-2">
                          {kpi.title}
                        </span>
                        {renderKpiIcon(kpi.iconName, kpi.accentColor, 18)}
                      </div>

                      <div className="my-2">
                        <span className="font-heading text-2xl sm:text-4xl font-black text-white block">
                          {kpi.value}
                        </span>
                        <span
                          className={`text-xs font-mono block font-bold mt-1 ${
                            kpi.badgeType === "positive"
                              ? "text-emerald-400"
                              : kpi.badgeType === "accent"
                              ? "text-amber-400"
                              : "text-cyan-400"
                          }`}
                        >
                          {kpi.badge}
                        </span>
                      </div>

                      <p className="text-[10px] text-white/40 font-mono line-clamp-1">
                        {kpi.subtitle}
                      </p>
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ========================================================= */}
        {/* DETAILED CONTENT AREA PER SELECTED TAB                    */}
        {/* ========================================================= */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* ----------------------------------------------------- */}
            {/* 1. OVERVIEW BI TAB                                    */}
            {/* ----------------------------------------------------- */}
            {activeTab === "bi" && (
              <div className="space-y-6">
                {/* Views & Engagement Trend Visual + Retention */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Views & Benchmark Area Chart */}
                  <div className="lg:col-span-7 p-6 rounded-3xl bg-[#171516] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-heading font-bold text-white text-lg">Weekly Views Velocity</h3>
                        <p className="text-xs text-white/40">Total video impressions vs industry benchmark (in thousands)</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                        +24.8% MoM
                      </span>
                    </div>

                    {/* Custom SVG Trend Chart */}
                    <div className="h-52 w-full pt-4 pb-2 px-1 flex flex-col justify-end">
                      <div className="h-40 w-full flex items-end justify-between gap-3 border-b border-white/10 pb-2">
                        {data.overview.viewsTrend.map((item, idx) => {
                          const heightPct = Math.round((item.views / 600) * 100);
                          const benchHeightPct = Math.round((item.benchmark / 600) * 100);
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                              {/* Hover Tooltip */}
                              <div className="absolute -top-9 px-2 py-1 rounded bg-[#1f1d1e] border border-white/20 text-[10px] font-mono text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap shadow-lg">
                                {item.views}K views
                              </div>
                              <div className="w-full flex items-end justify-center gap-1 h-32">
                                {/* Benchmark Bar */}
                                <div
                                  className="w-1.5 rounded-t bg-white/10"
                                  style={{ height: `${benchHeightPct}%` }}
                                  title={`Benchmark: ${item.benchmark}K`}
                                />
                                {/* Actual Views Bar */}
                                <div
                                  className="w-full max-w-[28px] rounded-t-xl transition-all duration-300 group-hover:brightness-125"
                                  style={{
                                    height: `${heightPct}%`,
                                    background: "linear-gradient(180deg, #ff0055 0%, #ff005566 100%)",
                                    boxShadow: "0 0 14px rgba(255, 0, 85, 0.35)",
                                  }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-white/40 truncate">{item.label}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono text-white/40 pt-2">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-[#ff0055]" /> Actual Views
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-white/20" /> Baseline Benchmark
                          </span>
                        </div>
                        <span className="text-emerald-400">Peak Velocity: Sun (540K)</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Hook Retention Curve (Preserved & Enhanced) */}
                  <div className="lg:col-span-5 p-6 rounded-3xl bg-[#171516] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-heading font-bold text-white text-lg">AI Hook Retention Curve</h3>
                        <p className="text-xs text-white/40">Audience drop-off rate vs short video benchmark</p>
                      </div>
                      <Flame className="text-[#ff0055]" size={20} />
                    </div>

                    <div className="h-52 w-full flex items-end justify-between gap-2.5 pt-6 pb-2 px-1 border-b border-white/10">
                      {data.overview.hookRetention.map((bar, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                          <span className="text-[10px] font-mono text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                            {bar.ret}%
                          </span>
                          <div
                            className="w-full rounded-t-xl transition-all duration-500 group-hover:brightness-125"
                            style={{
                              height: `${bar.ret * 1.3}px`,
                              backgroundColor: bar.color,
                              boxShadow: `0 0 15px ${bar.color}55`,
                            }}
                          />
                          <span className="text-[9px] font-mono text-white/40 truncate">{bar.time}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono text-white/50 pt-1">
                      <span>⚡ Hook score: 94/100</span>
                      <span className="text-emerald-400">Viral Likelihood: 88%</span>
                    </div>
                  </div>
                </div>

                {/* Content Performance & AI Quality Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Content Performance Table */}
                  <div className="lg:col-span-7 p-6 rounded-3xl bg-[#171516] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-heading font-bold text-white text-lg">Top Content Performance</h3>
                        <p className="text-xs text-white/40">Real-time engagement telemetry across top generated shorts</p>
                      </div>
                      <Award className="text-[#00f0ff]" size={18} />
                    </div>

                    <div className="space-y-2.5">
                      {data.overview.contentPerformance.map((content) => (
                        <div
                          key={content.id}
                          className="p-3.5 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-between gap-4 hover:border-white/20 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-[#ff0055]/10 border border-[#ff0055]/20 flex items-center justify-center flex-shrink-0 text-[#ff0055]">
                              <Play size={14} fill="#ff0055" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white truncate">{content.title}</h4>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-white/40">
                                <span>QC {content.score}/100</span>
                                <span>•</span>
                                <span className="text-emerald-400">{content.status}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-5 text-right flex-shrink-0 font-mono">
                            <div>
                              <span className="text-xs font-bold text-white block">{content.views}</span>
                              <span className="text-[10px] text-white/40">Views</span>
                            </div>
                            <div>
                              <span className="text-xs font-bold text-cyan-400 block">{content.engagement}</span>
                              <span className="text-[10px] text-white/40">Engage</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Quality Distribution & Recommendations */}
                  <div className="lg:col-span-5 p-6 rounded-3xl bg-[#171516] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-heading font-bold text-white text-lg">AI Quality Distribution</h3>
                        <p className="text-xs text-white/40">7-Point automated validation rubric performance</p>
                      </div>
                      <CheckCircle2 className="text-emerald-400" size={18} />
                    </div>

                    <div className="space-y-3">
                      {data.overview.aiQualityDistribution.map((item, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-white/80">{item.category}</span>
                            <span className="text-emerald-400 font-bold">{item.score}/100</span>
                          </div>
                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${item.score}%`,
                                backgroundColor: item.score >= 95 ? "#10b981" : "#00f0ff",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* AI Recommendations compact */}
                    <div className="pt-4 border-t border-white/10 space-y-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Lightbulb size={14} className="text-amber-400" /> Studio Next Actions
                      </span>
                      <p className="text-[11px] text-white/50 leading-relaxed font-mono">
                        Publish 5+ shorts weekly to trigger discovery multipliers. Sports & Tech topics yield +42% 6s hook retention.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ----------------------------------------------------- */}
            {/* 2. GROWTH & RETENTION TAB                             */}
            {/* ----------------------------------------------------- */}
            {activeTab === "growth" && (
              <div className="space-y-6">
                {/* 30-Day Retention Curve & Follower Net Gain */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* 30-Day Retention Curve */}
                  <div className="lg:col-span-7 p-6 rounded-3xl bg-[#171516] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-heading font-bold text-white text-lg">30-Day Audience Retention Curve</h3>
                        <p className="text-xs text-white/40">Viewer cohort return rate vs Industry Short benchmark (28%)</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-[#10b981]/15 text-[#10b981] text-xs font-mono font-bold">
                        72.4% Retained
                      </span>
                    </div>

                    <div className="h-52 w-full pt-4 pb-2 px-1 flex flex-col justify-end">
                      <div className="h-40 w-full flex items-end justify-between gap-3 border-b border-white/10 pb-2">
                        {data.growth.retentionCurve.map((point, idx) => (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                            <span className="text-[10px] font-mono text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              {point.retention}%
                            </span>
                            <div className="w-full flex items-end justify-center gap-1 h-32">
                              {/* Benchmark */}
                              <div
                                className="w-1.5 rounded-t bg-white/15"
                                style={{ height: `${point.industryBenchmark}%` }}
                                title={`Industry: ${point.industryBenchmark}%`}
                              />
                              {/* Actual Retention */}
                              <div
                                className="w-full max-w-[28px] rounded-t-xl transition-all duration-300 group-hover:brightness-125"
                                style={{
                                  height: `${point.retention}%`,
                                  background: "linear-gradient(180deg, #10b981 0%, #10b98155 100%)",
                                  boxShadow: "0 0 12px rgba(16, 185, 129, 0.35)",
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-white/40 truncate">{point.day}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono text-white/40 pt-2">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-[#10b981]" /> Qoneqt Studio Channel
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-white/20" /> Industry Short Avg
                          </span>
                        </div>
                        <span className="text-cyan-400">+44.4% Delta</span>
                      </div>
                    </div>
                  </div>

                  {/* Daily Net Follower Velocity */}
                  <div className="lg:col-span-5 p-6 rounded-3xl bg-[#171516] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-heading font-bold text-white text-lg">Daily Follower Velocity</h3>
                        <p className="text-xs text-white/40">New gains vs unfollows (Net +4,678 / wk)</p>
                      </div>
                      <Users className="text-[#ff0055]" size={18} />
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {data.growth.followerGrowthDaily.map((d, i) => {
                        const netPct = Math.round((d.net / 1100) * 100);
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-white/60">{d.day}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-white/40 text-[10px]">+{d.gain} / -{d.loss}</span>
                                <span className="text-emerald-400 font-bold">+{d.net}</span>
                              </div>
                            </div>
                            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#ff0055] to-emerald-400"
                                style={{ width: `${netPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Cohort Retention Heatmap + New vs Returning + Growth Sources */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Cohort Retention Table */}
                  <div className="lg:col-span-5 p-6 rounded-3xl bg-[#171516] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-heading font-bold text-white text-lg">Weekly Cohort Retention</h3>
                        <p className="text-xs text-white/40">4-week audience retention tracking</p>
                      </div>
                      <Layers className="text-[#00f0ff]" size={18} />
                    </div>

                    <div className="space-y-2 font-mono text-xs">
                      <div className="grid grid-cols-5 text-white/40 text-[10px] pb-1 border-b border-white/10">
                        <span>Cohort</span>
                        <span className="text-center">W1</span>
                        <span className="text-center">W2</span>
                        <span className="text-center">W3</span>
                        <span className="text-center">W4</span>
                      </div>
                      {data.growth.cohortRetention.map((row, i) => (
                        <div key={i} className="grid grid-cols-5 items-center p-2 rounded-xl bg-white/5 border border-white/8">
                          <span className="font-bold text-white">{row.cohort}</span>
                          <span className="text-center text-emerald-400 font-bold">{row.week1}%</span>
                          <span className="text-center text-emerald-300">{row.week2}%</span>
                          <span className="text-center text-emerald-400/80">{row.week3}%</span>
                          <span className="text-center text-emerald-500/80">{row.week4}%</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-white/40">
                      <span>Monthly Churn: <strong className="text-emerald-400">6.2%</strong> (Industry: 10.5%)</span>
                      <span className="text-emerald-400">Healthy Cohort</span>
                    </div>
                  </div>

                  {/* New vs Returning Audience & Growth Channels */}
                  <div className="lg:col-span-7 p-6 rounded-3xl bg-[#171516] border border-white/10 space-y-5">
                    <div>
                      <h3 className="font-heading font-bold text-white text-lg">Audience Composition & Acquisition</h3>
                      <p className="text-xs text-white/40">Where new subscribers and repeat viewers arrive from</p>
                    </div>

                    {/* Returning vs New split bar */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/8 space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#ff0055] font-bold">
                          Returning Audience (64.8% — 184K)
                        </span>
                        <span className="text-[#00f0ff] font-bold">
                          New Discovery (35.2% — 100K)
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden flex">
                        <div className="bg-[#ff0055] h-full" style={{ width: "64.8%" }} />
                        <div className="bg-[#00f0ff] h-full" style={{ width: "35.2%" }} />
                      </div>
                    </div>

                    {/* Growth Sources Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {data.growth.growthSources.map((source, i) => (
                        <div key={i} className="p-3.5 rounded-2xl bg-white/5 border border-white/8 space-y-1">
                          <span className="text-[10px] font-mono text-white/40 uppercase block truncate">
                            {source.source}
                          </span>
                          <p className="font-heading text-lg font-black text-white">{source.count}</p>
                          <span className="text-xs font-mono font-bold" style={{ color: source.color }}>
                            {source.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ----------------------------------------------------- */}
            {/* 3. REVENUE & EARNINGS TAB                             */}
            {/* ----------------------------------------------------- */}
            {activeTab === "revenue" && (
              <div className="space-y-6">
                {/* MRR Growth Ramp & Revenue Stream Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* 6-Month MRR Growth Trajectory */}
                  <div className="lg:col-span-7 p-6 rounded-3xl bg-[#171516] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-heading font-bold text-white text-lg">Monthly Recurring Revenue (MRR)</h3>
                        <p className="text-xs text-white/40">6-Month revenue progression vs projected milestones</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                        +34.2% Growth
                      </span>
                    </div>

                    <div className="h-52 w-full pt-4 pb-2 px-1 flex flex-col justify-end">
                      <div className="h-40 w-full flex items-end justify-between gap-4 border-b border-white/10 pb-2">
                        {data.revenue.mrrGrowth.map((item, idx) => {
                          const heightPct = Math.round((item.mrr / 16000) * 100);
                          const targetPct = Math.round((item.target / 16000) * 100);
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                              <span className="text-[10px] font-mono text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                ${(item.mrr / 1000).toFixed(1)}K
                              </span>
                              <div className="w-full flex items-end justify-center gap-1.5 h-32">
                                {/* Target */}
                                <div
                                  className="w-1.5 rounded-t bg-white/15"
                                  style={{ height: `${targetPct}%` }}
                                  title={`Target: $${item.target}`}
                                />
                                {/* Actual MRR */}
                                <div
                                  className="w-full max-w-[32px] rounded-t-xl transition-all duration-300 group-hover:brightness-125"
                                  style={{
                                    height: `${heightPct}%`,
                                    background: "linear-gradient(180deg, #10b981 0%, #10b98155 100%)",
                                    boxShadow: "0 0 14px rgba(16, 185, 129, 0.35)",
                                  }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-white/40 truncate">{item.month}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono text-white/40 pt-2">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-[#10b981]" /> Monthly Actual MRR
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-white/20" /> Milestone Target
                          </span>
                        </div>
                        <span className="text-emerald-400 font-bold">ARR Run-Rate: $171,360</span>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Breakdown by Stream */}
                  <div className="lg:col-span-5 p-6 rounded-3xl bg-[#171516] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-heading font-bold text-white text-lg">Revenue Stream Breakdown</h3>
                        <p className="text-xs text-white/40">Diversification across subscriptions & ads</p>
                      </div>
                      <DollarSign className="text-emerald-400" size={18} />
                    </div>

                    <div className="space-y-3.5">
                      {data.revenue.revenueBreakdown.map((stream, i) => (
                        <div key={i} className="p-3.5 rounded-2xl bg-white/5 border border-white/8 space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-white font-bold">{stream.stream}</span>
                            <span className="text-white font-black">${stream.amount.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${stream.percentage}%`,
                                backgroundColor: stream.color,
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-mono text-white/40">
                            <span>Contribution</span>
                            <span style={{ color: stream.color }}>{stream.percentage}% of total</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Creator Subscriptions, Ad Formats, & Financial Health */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Creator Subscriptions Tiers */}
                  <div className="lg:col-span-6 p-6 rounded-3xl bg-[#171516] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-heading font-bold text-white text-lg">Creator Subscription Tiers</h3>
                        <p className="text-xs text-white/40">Active recurring membership passes</p>
                      </div>
                      <Award className="text-[#00f0ff]" size={18} />
                    </div>

                    <div className="space-y-2.5">
                      {data.revenue.creatorSubscriptions.map((tier, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs font-bold text-white block">{tier.tier}</span>
                            <span className="text-[10px] font-mono text-white/40">{tier.price} • {tier.activeSubscribers} members</span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-sm font-black text-emerald-400 block">{tier.total}</span>
                            <span className="text-[9px] text-white/40">per month</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ad Revenue Streams & Financial Health Cards */}
                  <div className="lg:col-span-6 p-6 rounded-3xl bg-[#171516] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-heading font-bold text-white text-lg">Advertising Performance & Health</h3>
                        <p className="text-xs text-white/40">Feed monetization & unit economics</p>
                      </div>
                      <BarChart3 className="text-[#ff0055]" size={18} />
                    </div>

                    {/* Unit Economics 4-stat grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/8 space-y-0.5 font-mono">
                        <span className="text-[10px] text-white/40 uppercase">ARPU (Per User)</span>
                        <p className="font-heading text-lg font-black text-white">{data.revenue.financialMetrics.arpu}</p>
                        <span className="text-[10px] text-emerald-400">{data.revenue.financialMetrics.arpuGrowth}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/8 space-y-0.5 font-mono">
                        <span className="text-[10px] text-white/40 uppercase">Conversion Rate</span>
                        <p className="font-heading text-lg font-black text-cyan-400">{data.revenue.financialMetrics.subscriptionConversion}</p>
                        <span className="text-[10px] text-white/40">{data.revenue.financialMetrics.conversionGrowth}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/8 space-y-0.5 font-mono">
                        <span className="text-[10px] text-white/40 uppercase">Gross Margin</span>
                        <p className="font-heading text-lg font-black text-emerald-400">{data.revenue.financialMetrics.grossMargin}</p>
                        <span className="text-[10px] text-white/40">Tier-1 SaaS level</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/8 space-y-0.5 font-mono">
                        <span className="text-[10px] text-white/40 uppercase">Next Payout</span>
                        <p className="font-heading text-sm font-black text-white truncate">{data.revenue.financialMetrics.netPayoutPeriod}</p>
                        <span className="text-[10px] text-emerald-400">Direct Wire Active</span>
                      </div>
                    </div>

                    {/* Ad Streams List */}
                    <div className="space-y-1.5 pt-1">
                      {data.revenue.adRevenueStreams.map((ad, i) => (
                        <div key={i} className="flex items-center justify-between text-xs font-mono p-2 rounded-xl bg-white/5">
                          <span className="text-white/80">{ad.format} ({ad.impressions})</span>
                          <span className="text-amber-400 font-bold">{ad.payout}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ----------------------------------------------------- */}
            {/* 4. AUDIENCE & DEMOGRAPHICS TAB                        */}
            {/* ----------------------------------------------------- */}
            {activeTab === "audience" && (
              <div className="space-y-6">
                {/* Geographic & Age Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Top Viewer Countries */}
                  <div className="lg:col-span-6 p-6 rounded-3xl bg-[#171516] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-heading font-bold text-white text-lg">Top Viewer Countries</h3>
                        <p className="text-xs text-white/40">Worldwide viewership by geographic region</p>
                      </div>
                      <Globe className="text-[#00f0ff]" size={18} />
                    </div>

                    <div className="space-y-2.5 font-mono text-xs">
                      {data.audience.geographicDistribution.topCountries.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/8 hover:border-white/20 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{item.flag}</span>
                            <span className="text-white font-medium">{item.country}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-white/40 text-[11px]">{item.viewers}</span>
                            <span className="text-[#ff0055] font-bold w-10 text-right">{item.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Age & Gender Demographics */}
                  <div className="lg:col-span-6 p-6 rounded-3xl bg-[#171516] border border-white/10 space-y-5">
                    <div>
                      <h3 className="font-heading font-bold text-white text-lg">Age & Gender Distribution</h3>
                      <p className="text-xs text-white/40">Demographic composition of your primary audience</p>
                    </div>

                    {/* Age Bars */}
                    <div className="space-y-3">
                      <span className="text-xs font-mono text-white/50 uppercase block">Age Brackets</span>
                      {data.audience.ageDistribution.map((item, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-white">{item.range} years</span>
                            <span className="font-bold" style={{ color: item.color }}>{item.percentage}%</span>
                          </div>
                          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${item.percentage}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Gender Breakdown Bar */}
                    <div className="pt-2 space-y-2">
                      <span className="text-xs font-mono text-white/50 uppercase block">Gender Split</span>
                      <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden flex">
                        {data.audience.genderDistribution.map((g, idx) => (
                          <div
                            key={idx}
                            className="h-full"
                            style={{ width: `${g.percentage}%`, backgroundColor: g.color }}
                            title={`${g.gender}: ${g.percentage}%`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-white/60">
                        {data.audience.genderDistribution.map((g, idx) => (
                          <span key={idx} className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                            {g.gender} ({g.percentage}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Devices, Watch Time Distribution & Audience Interests */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Audience Niche Affinities */}
                  <div className="lg:col-span-5 p-6 rounded-3xl bg-[#171516] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-heading font-bold text-white text-lg">Audience Niche Affinities</h3>
                        <p className="text-xs text-white/40">Top content categories consumed</p>
                      </div>
                      <Sparkles className="text-amber-400" size={18} />
                    </div>

                    <div className="space-y-3 font-mono text-xs">
                      {data.audience.audienceInterests.map((interest, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-white">{interest.niche}</span>
                            <span className="text-emerald-400 font-bold">{interest.growth}</span>
                          </div>
                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#ff0055] to-amber-400"
                              style={{ width: `${interest.affinity}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Devices & Platforms + Watch Time Loops */}
                  <div className="lg:col-span-7 p-6 rounded-3xl bg-[#171516] border border-white/10 space-y-5">
                    <div>
                      <h3 className="font-heading font-bold text-white text-lg">Device Ecosystem & Watch Time</h3>
                      <p className="text-xs text-white/40">Hardware platforms and completion duration drop-off</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Device Split */}
                      <div className="space-y-2.5">
                        <span className="text-xs font-mono text-white/50 uppercase block">Platform Distribution</span>
                        {data.audience.devicePlatformBreakdown.map((dev, i) => (
                          <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/8 text-xs font-mono">
                            <span className="text-white">{dev.device}</span>
                            <span className="font-bold" style={{ color: dev.color }}>{dev.share}%</span>
                          </div>
                        ))}
                      </div>

                      {/* Watch Time Completion */}
                      <div className="space-y-2.5">
                        <span className="text-xs font-mono text-white/50 uppercase block">Watch-Time Bracket</span>
                        {data.audience.watchTimeDistribution.map((wt, i) => (
                          <div key={i} className="p-2.5 rounded-xl bg-white/5 border border-white/8 space-y-1">
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-white/80">{wt.bracket}</span>
                              <span className="text-emerald-400 font-bold">{wt.completionRate}</span>
                            </div>
                            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-400 rounded-full"
                                style={{ width: `${wt.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
