import { useState, useEffect, useMemo, useCallback } from "react";
import { JobStatus } from "@/api/client";
import { AnalyticsData, baseAnalyticsData, buildAnalyticsData, KPICardData } from "@/services/analyticsService";

export type AnalyticsTab = "bi" | "growth" | "revenue" | "audience";

export interface UseAnalyticsResult {
  activeTab: AnalyticsTab;
  setActiveTab: (tab: AnalyticsTab) => void;
  data: AnalyticsData;
  currentKpis: [KPICardData, KPICardData, KPICardData, KPICardData];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  completedJobsCount: number;
}

export function useAnalytics(initialTab: AnalyticsTab = "bi"): UseAnalyticsResult {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(initialTab);
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/jobs?limit=100");
      if (!res.ok) {
        throw new Error(`Failed to fetch jobs: ${res.statusText}`);
      }
      const data: JobStatus[] = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn("[useAnalytics] Backend jobs fetch notice:", err.message);
      // Fallback cleanly to empty jobs array; base data will be used
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const data = useMemo(() => {
    return buildAnalyticsData(jobs);
  }, [jobs]);

  const currentKpis = useMemo(() => {
    switch (activeTab) {
      case "bi":
        return data.overview.kpis;
      case "growth":
        return data.growth.kpis;
      case "revenue":
        return data.revenue.kpis;
      case "audience":
        return data.audience.kpis;
      default:
        return data.overview.kpis;
    }
  }, [activeTab, data]);

  const completedJobsCount = useMemo(() => {
    return jobs.filter((j) => j.status === "completed").length;
  }, [jobs]);

  return {
    activeTab,
    setActiveTab,
    data,
    currentKpis,
    loading,
    error,
    refresh: fetchJobs,
    completedJobsCount,
  };
}
