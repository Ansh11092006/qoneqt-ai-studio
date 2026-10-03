import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  Theme,
  JobStatus,
  JobOptions,
  createJob as apiCreateJob,
  getJob as apiGetJob,
  listJobs as apiListJobs,
  fetchTheme as apiFetchTheme,
} from "../api/client";

export const DEFAULT_THEME: Theme = {
  mood: "Qoneqt Kleap Studio",
  palette: {
    bg1: "#0d0b0c",
    bg2: "#141213",
    accent: "#ff0055",
    text: "#ffffff",
  },
  background_type: "aurora",
  loading_style: "pulse",
  loading_messages: [
    "Analyzing topic context and creator intent...",
    "Writing high-retention short-form video script...",
    "Planning visual scenes and keyword queries...",
    "Fetching vertical video footage and photography...",
    "Generating studio-quality voiceover audio...",
    "Composing video timeline, transitions, and captions...",
    "Running multi-point automated quality inspection...",
  ],
};

interface JobEvent {
  type: "step" | "partial" | "complete" | "error" | "init";
  step?: string;
  status?: string;
  message?: string;
  elapsed_sec?: number;
  hook?: string;
  scenes?: any[];
  video_url?: string;
  thumbnail_url?: string;
  qc_score?: number;
}

interface JobContextType {
  currentJob: JobStatus | null;
  activeJobId: string | null;
  events: JobEvent[];
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;
  updateThemeFromPrompt: (prompt: string) => Promise<void>;
  startJob: (
    input: string,
    mode?: "topic" | "script" | "trending",
    options?: Partial<JobOptions>
  ) => Promise<string>;
  recentJobs: JobStatus[];
  refreshRecentJobs: () => Promise<void>;
  isGenerating: boolean;
  partialHook: string | null;
  partialScenes: any[] | null;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export const JobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(DEFAULT_THEME);
  const [currentJob, setCurrentJob] = useState<JobStatus | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [recentJobs, setRecentJobs] = useState<JobStatus[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [partialHook, setPartialHook] = useState<string | null>(null);
  const [partialScenes, setPartialScenes] = useState<any[] | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Apply theme colors to CSS variables on DOM
  const applyThemeToDOM = (theme: Theme) => {
    const root = document.documentElement;
    root.style.setProperty("--bg1", theme.palette.bg1);
    root.style.setProperty("--bg2", theme.palette.bg2);
    root.style.setProperty("--accent", theme.palette.accent);
    root.style.setProperty("--text", theme.palette.text);
    root.style.setProperty("--primary", theme.palette.accent);
    root.style.setProperty("--ring", theme.palette.accent);
  };

  const setTheme = (theme: Theme) => {
    setCurrentTheme(theme);
    applyThemeToDOM(theme);
  };

  const updateThemeFromPrompt = async (prompt: string) => {
    if (!prompt.trim()) {
      setTheme(DEFAULT_THEME);
      return;
    }
    try {
      const detected = await apiFetchTheme(prompt);
      setTheme(detected);
    } catch (e) {
      console.error("Theme detection failed", e);
    }
  };

  const refreshRecentJobs = async () => {
    try {
      const list = await apiListJobs(12);
      setRecentJobs(list);
    } catch (e) {
      console.error("Failed to load recent jobs", e);
    }
  };

  useEffect(() => {
    applyThemeToDOM(DEFAULT_THEME);
    refreshRecentJobs();
  }, []);

  // Connect SSE for active job
  useEffect(() => {
    if (!activeJobId) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/jobs/${activeJobId}/events`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const data: JobEvent = JSON.parse(e.data);
        setEvents((prev) => [...prev, data]);

        if (data.type === "partial" && data.hook) {
          setPartialHook(data.hook);
        }
        if (data.type === "partial" && data.scenes) {
          setPartialScenes(data.scenes);
        }

        if (data.type === "complete" || data.type === "error") {
          setIsGenerating(false);
          // Refresh job details
          apiGetJob(activeJobId).then((j) => {
            setCurrentJob(j);
            refreshRecentJobs();
          });
          es.close();
        } else {
          // Update current step
          setCurrentJob((prev) =>
            prev
              ? {
                  ...prev,
                  current_step: data.step || prev.current_step,
                  step_status: data.status || prev.step_status,
                  message: data.message || prev.message,
                  elapsed_sec: data.elapsed_sec ?? prev.elapsed_sec,
                }
              : null
          );
        }
      } catch (err) {
        console.error("Error parsing SSE event", err);
      }
    };

    es.onerror = () => {
      // Retry via polling if SSE connection drops
      apiGetJob(activeJobId).then((j) => {
        if (j.status === "completed" || j.status === "failed") {
          setCurrentJob(j);
          setIsGenerating(false);
          es.close();
        }
      });
    };

    return () => {
      // Do NOT kill the SSE stream on simple navigation; keep stream open until completed
    };
  }, [activeJobId]);

  const startJob = async (
    input: string,
    mode: "topic" | "script" | "trending" = "topic",
    options?: Partial<JobOptions>
  ): Promise<string> => {
    setEvents([]);
    setPartialHook(null);
    setPartialScenes(null);
    setIsGenerating(true);

    const res = await apiCreateJob(input, mode, options);
    setActiveJobId(res.job_id);

    const initial = await apiGetJob(res.job_id);
    setCurrentJob(initial);

    if (initial.plan?.theme) {
      setTheme(initial.plan.theme);
    }

    return res.job_id;
  };

  return (
    <JobContext.Provider
      value={{
        currentJob,
        activeJobId,
        events,
        currentTheme,
        setTheme,
        updateThemeFromPrompt,
        startJob,
        recentJobs,
        refreshRecentJobs,
        isGenerating,
        partialHook,
        partialScenes,
      }}
    >
      {children}
    </JobContext.Provider>
  );
};

export const useJob = () => {
  const context = useContext(JobContext);
  if (!context) throw new Error("useJob must be used within a JobProvider");
  return context;
};
