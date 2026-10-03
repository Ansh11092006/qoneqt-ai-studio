import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Key, Shield, Check, AlertCircle, RefreshCw,
  Cpu, Globe, Zap, Film, Terminal, ChevronDown, ChevronUp,
  Trash2, ExternalLink, Sliders, CheckCircle2, Lock, Eye, EyeOff,
  Server, ArrowRight, Bot, Layers, Info
} from "lucide-react";
import {
  fetchModelRegistry, fetchUserProviders, testUserProvider,
  saveUserProvider, deleteUserProvider, setActiveProviderSettings,
  FreeModelCatalog, SupportedProviderSpec, UserProviderConfig,
  UserProviderSettingsResponse, TestConnectionResult
} from "@/api/client";

export const ApiConfigurationPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestConnectionResult>>({});
  
  // Registry & User Settings
  const [freeModels, setFreeModels] = useState<FreeModelCatalog | null>(null);
  const [catalog, setCatalog] = useState<Record<string, SupportedProviderSpec>>({});
  const [userSettings, setUserSettings] = useState<UserProviderSettingsResponse | null>(null);
  
  // Expanded Provider Accordions
  const [expandedProvider, setExpandedProvider] = useState<string | null>("gemini");
  
  // Form State for Editing Providers
  const [providerInputs, setProviderInputs] = useState<Record<string, {
    apiKey: string;
    model: string;
    baseUrl: string;
    showKey: boolean;
  }>>({});

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [registryRes, providersRes] = await Promise.all([
        fetchModelRegistry(),
        fetchUserProviders()
      ]);
      setFreeModels(registryRes.free_models);
      setCatalog(registryRes.providers_catalog);
      setUserSettings(providersRes);

      // Pre-fill inputs with existing configured settings
      const inputs: Record<string, any> = {};
      Object.keys(registryRes.providers_catalog).forEach((pid) => {
        const configured = providersRes.providers[pid];
        const spec = registryRes.providers_catalog[pid];
        inputs[pid] = {
          apiKey: "",
          model: configured?.selected_model || spec.default_model || "",
          baseUrl: configured?.base_url || spec.default_base_url || "",
          showKey: false,
        };
      });
      setProviderInputs(inputs);
    } catch (err: any) {
      console.error("Failed to load provider configuration", err);
      showNotification("error", "Failed to connect to API service. Using Qoneqt Free defaults.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleModeSwitch = async (mode: "qoneqt" | "user") => {
    try {
      const updated = await setActiveProviderSettings({
        active_mode: mode,
        active_provider_id: mode === "user" ? (userSettings?.active_provider_id || "gemini") : null
      });
      setUserSettings(updated);
      showNotification("success", mode === "qoneqt" ? "Switched to Qoneqt Free AI Models" : "Switched to My API (BYOK)");
    } catch (err: any) {
      showNotification("error", "Failed to update active mode");
    }
  };

  const handleTestConnection = async (providerId: string) => {
    setTesting(providerId);
    setTestResults(prev => ({ ...prev, [providerId]: undefined as any }));
    try {
      const input = providerInputs[providerId] || { apiKey: "", baseUrl: "" };
      const res = await testUserProvider({
        provider_id: providerId,
        api_key: input.apiKey.trim() || undefined,
        base_url: input.baseUrl.trim() || undefined
      });
      setTestResults(prev => ({ ...prev, [providerId]: res }));
      if (res.success) {
        showNotification("success", res.message || "Connection verified successfully!");
      } else {
        showNotification("error", res.error || "Connection test failed");
      }
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [providerId]: { success: false, error: err.message || "Failed to reach provider" }
      }));
    } finally {
      setTesting(null);
    }
  };

  const handleSaveProvider = async (providerId: string) => {
    setSaving(providerId);
    try {
      const input = providerInputs[providerId] || { apiKey: "", model: "", baseUrl: "" };
      const updated = await saveUserProvider({
        provider_id: providerId,
        api_key: input.apiKey.trim() || undefined,
        model: input.model.trim() || undefined,
        base_url: input.baseUrl.trim() || undefined
      });
      setUserSettings(updated);
      // Clear raw key from client form state immediately for maximum security
      setProviderInputs(prev => ({
        ...prev,
        [providerId]: {
          ...prev[providerId],
          apiKey: "",
          showKey: false
        }
      }));
      showNotification("success", `${catalog[providerId]?.name || providerId} credentials encrypted & saved!`);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to save provider configuration");
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteProvider = async (providerId: string) => {
    if (!confirm(`Are you sure you want to remove configuration for ${catalog[providerId]?.name || providerId}?`)) return;
    try {
      const updated = await deleteUserProvider(providerId);
      setUserSettings(updated);
      setTestResults(prev => ({ ...prev, [providerId]: undefined as any }));
      showNotification("success", "Provider configuration removed.");
    } catch (err: any) {
      showNotification("error", "Failed to delete provider");
    }
  };

  const handleToggleFallback = async (allow: boolean) => {
    try {
      const updated = await setActiveProviderSettings({ allow_fallback: allow });
      setUserSettings(updated);
      showNotification("success", allow ? "Qoneqt Free Fallback Enabled" : "Qoneqt Free Fallback Disabled");
    } catch (err: any) {
      showNotification("error", "Failed to update fallback setting");
    }
  };

  const getProviderIcon = (id: string) => {
    switch (id) {
      case "gemini": return <Sparkles size={20} className="text-[#00f5ff]" />;
      case "openai": return <Cpu size={20} className="text-[#10a37f]" />;
      case "openrouter": return <Globe size={20} className="text-[#6366f1]" />;
      case "anthropic": return <Bot size={20} className="text-[#d97706]" />;
      case "groq": return <Zap size={20} className="text-[#f59e0b]" />;
      case "fal": return <Film size={20} className="text-[#ff0055]" />;
      default: return <Server size={20} className="text-[#a855f7]" />;
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 md:px-8 max-w-6xl mx-auto space-y-10 text-white">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 shadow-2xl backdrop-blur-xl ${
              notification.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            {notification.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#ff0055] uppercase tracking-widest">
          <Key size={12} /> AI Provider & Model Hub
        </div>
        <h1 className="font-heading font-black text-3xl md:text-5xl text-white tracking-tight">
          Choose Your <span className="bg-gradient-to-r from-[#ff0055] via-[#ff5e00] to-[#00f5ff] bg-clip-text text-transparent">AI Provider</span>
        </h1>
        <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto">
          Use Qoneqt's built-in Free AI Models out-of-the-box with zero setup, or bring your personal provider API keys with encrypted server-side storage.
        </p>
      </div>

      {/* ═════════════════════════════════════════════════════════════════
          SECTION 1: THE TWO PRIMARY MODES (Inspired by Screenshot)
         ═════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD 1: QONEQT AI FREE */}
        <div
          onClick={() => handleModeSwitch("qoneqt")}
          className={`relative p-6 rounded-3xl border transition-all cursor-pointer group backdrop-blur-xl ${
            userSettings?.active_mode === "qoneqt"
              ? "bg-gradient-to-b from-[#ff0055]/15 to-transparent border-[#ff0055] shadow-[0_0_35px_rgba(255,0,85,0.25)]"
              : "bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
          }`}
        >
          {userSettings?.active_mode === "qoneqt" && (
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-[#ff0055] text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(255,0,85,0.5)]">
              <Check size={12} /> Active Choice
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#ff0055]/20 border border-[#ff0055]/40 flex items-center justify-center text-[#ff0055]">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="font-heading font-black text-xl text-white flex items-center gap-2">
                  Qoneqt AI
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    FREE
                  </span>
                </h3>
                <p className="text-xs text-white/50">Qoneqt's built-in neural models</p>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-2 pt-2 border-t border-white/5 text-xs text-white/80">
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span>No API key required — Ready immediately</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span>Included with Qoneqt Studio</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span>Automatic multi-scene script & director routing</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span>Zero quota management headaches</span>
              </div>
            </div>

            {/* Free Models List */}
            <div className="pt-3 border-t border-white/5 space-y-2">
              <p className="text-[11px] font-mono text-white/40 uppercase tracking-wider">Included Free Models</p>
              <div className="grid grid-cols-2 gap-2">
                {freeModels?.text.map(m => (
                  <div key={m.id} className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{m.name}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ff0055]/20 text-[#ff0055]">{m.badge}</span>
                    </div>
                    <p className="text-[10px] text-white/40 mt-1 line-clamp-1">{m.description}</p>
                  </div>
                ))}
                {freeModels?.video.map(m => (
                  <div key={m.id} className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5 col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Film size={12} className="text-[#00f5ff]" /> {m.name}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#00f5ff]/20 text-[#00f5ff]">{m.badge}</span>
                    </div>
                    <p className="text-[10px] text-white/40 mt-1">{m.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); handleModeSwitch("qoneqt"); }}
              className={`w-full py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${
                userSettings?.active_mode === "qoneqt"
                  ? "bg-[#ff0055] text-white shadow-[0_0_20px_rgba(255,0,85,0.4)]"
                  : "bg-white/10 hover:bg-white/15 text-white"
              }`}
            >
              {userSettings?.active_mode === "qoneqt" ? "Using Qoneqt Free Models" : "Switch to Qoneqt Free"}
            </button>
          </div>
        </div>

        {/* CARD 2: MY API (BYOK) */}
        <div
          onClick={() => handleModeSwitch("user")}
          className={`relative p-6 rounded-3xl border transition-all cursor-pointer group backdrop-blur-xl ${
            userSettings?.active_mode === "user"
              ? "bg-gradient-to-b from-[#00f5ff]/15 to-transparent border-[#00f5ff] shadow-[0_0_35px_rgba(0,245,255,0.25)]"
              : "bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
          }`}
        >
          {userSettings?.active_mode === "user" && (
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-[#00f5ff] text-black font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(0,245,255,0.5)]">
              <Check size={12} /> Active Choice
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#00f5ff]/20 border border-[#00f5ff]/40 flex items-center justify-center text-[#00f5ff]">
                <Key size={24} />
              </div>
              <div>
                <h3 className="font-heading font-black text-xl text-white flex items-center gap-2">
                  My API
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00f5ff]/20 text-[#00f5ff] border border-[#00f5ff]/30">
                    BYOK
                  </span>
                </h3>
                <p className="text-xs text-white/50">Bring Your Own Key credentials</p>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-2 pt-2 border-t border-white/5 text-xs text-white/80">
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[#00f5ff]" />
                <span>Use your personal quota and custom limits</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[#00f5ff]" />
                <span>Choose specific models (Claude 3.7, GPT-4o, Gemini 2.5)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[#00f5ff]" />
                <span>Military-grade AES-256 server-side encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[#00f5ff]" />
                <span>Keys are never exposed to browser localStorage</span>
              </div>
            </div>

            {/* Configured Status Preview */}
            <div className="pt-3 border-t border-white/5 space-y-2">
              <p className="text-[11px] font-mono text-white/40 uppercase tracking-wider">Your Configured Providers</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(catalog).map((pid) => {
                  const isConfigured = Boolean(userSettings?.providers[pid]?.has_key);
                  const isSelected = userSettings?.active_provider_id === pid;
                  return (
                    <div
                      key={pid}
                      className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 ${
                        isConfigured
                          ? isSelected
                            ? "bg-[#00f5ff]/20 border-[#00f5ff] text-white font-bold"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-white/[0.02] border-white/5 text-white/30"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isConfigured ? "#10b981" : "#4b5563" }} />
                      {catalog[pid]?.name || pid}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); handleModeSwitch("user"); }}
              className={`w-full py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${
                userSettings?.active_mode === "user"
                  ? "bg-[#00f5ff] text-black shadow-[0_0_20px_rgba(0,245,255,0.4)]"
                  : "bg-white/10 hover:bg-white/15 text-white"
              }`}
            >
              {userSettings?.active_mode === "user" ? "Using My API Providers" : "Switch to My API (BYOK)"}
            </button>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════
          SECTION 2: GLOBAL FALLBACK PREFERENCE
         ═════════════════════════════════════════════════════════════════ */}
      <div className="p-5 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mt-0.5">
            <Sliders size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Automatic Qoneqt Free Fallback
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                userSettings?.allow_fallback
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/10 text-white/40"
              }`}>
                {userSettings?.allow_fallback ? "ENABLED" : "OFF"}
              </span>
            </h4>
            <p className="text-xs text-white/50 mt-0.5 max-w-xl">
              If your personal API quota is exceeded or fails, should Qoneqt automatically fallback to Free Models so your video generation is never interrupted?
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-white/40">{userSettings?.allow_fallback ? "Fallback Active" : "Strict Mode (Fail on error)"}</span>
          <button
            onClick={() => handleToggleFallback(!userSettings?.allow_fallback)}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
              userSettings?.allow_fallback ? "bg-emerald-500" : "bg-white/20"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                userSettings?.allow_fallback ? "translate-x-6" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════
          SECTION 3: PROVIDER CONFIGURATION ACCORDIONS
         ═════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-black text-2xl text-white flex items-center gap-2">
            Configure Your AI Providers
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400/80 font-mono">
            <Lock size={13} /> AES-256 Encrypted on Server
          </div>
        </div>

        <div className="space-y-3">
          {Object.keys(catalog).map((pid) => {
            const spec = catalog[pid];
            const configured = userSettings?.providers[pid];
            const isExpanded = expandedProvider === pid;
            const inputState = providerInputs[pid] || { apiKey: "", model: spec.default_model, baseUrl: spec.default_base_url, showKey: false };
            const testResult = testResults[pid];
            const isTestingThis = testing === pid;
            const isSavingThis = saving === pid;

            return (
              <div
                key={pid}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  configured?.has_key
                    ? "bg-black/40 border-white/15"
                    : "bg-black/20 border-white/5 hover:border-white/10"
                }`}
              >
                {/* Header Bar */}
                <div
                  onClick={() => setExpandedProvider(isExpanded ? null : pid)}
                  className="p-4 md:p-5 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      {getProviderIcon(pid)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{spec.name}</span>
                        {configured?.has_key ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Check size={10} /> Configured
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-white/30 border border-white/5">
                            Not Configured
                          </span>
                        )}
                        {userSettings?.active_provider_id === pid && userSettings?.active_mode === "user" && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00f5ff]/20 text-[#00f5ff] border border-[#00f5ff]/30">
                            Active Model Source
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/40 mt-0.5">{spec.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {configured?.masked_key && (
                      <span className="hidden sm:inline-block font-mono text-xs text-white/40 bg-white/5 px-2.5 py-1 rounded-lg">
                        {configured.masked_key}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp size={18} className="text-white/40" /> : <ChevronDown size={18} className="text-white/40" />}
                  </div>
                </div>

                {/* Expanded Settings Form */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-5 pb-5 pt-2 border-t border-white/5 space-y-4"
                    >
                      {/* API Key Field */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-semibold text-white/70 flex items-center gap-1.5">
                            <Key size={13} /> {spec.name} API Key
                          </label>
                          {spec.docs_url && (
                            <a
                              href={spec.docs_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#00f5ff] hover:underline flex items-center gap-1 text-[11px]"
                            >
                              Get Key <ExternalLink size={10} />
                            </a>
                          )}
                        </div>

                        <div className="relative">
                          <input
                            type={inputState.showKey ? "text" : "password"}
                            placeholder={configured?.masked_key ? `Saved: ${configured.masked_key} (enter new key to update)` : spec.key_placeholder}
                            value={inputState.apiKey}
                            onChange={(e) => {
                              const val = e.target.value;
                              setProviderInputs(prev => ({
                                ...prev,
                                [pid]: { ...prev[pid], apiKey: val }
                              }));
                            }}
                            className="w-full px-4 py-2.5 pr-10 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-[#00f5ff] transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setProviderInputs(prev => ({
                                ...prev,
                                [pid]: { ...prev[pid], showKey: !prev[pid]?.showKey }
                              }));
                            }}
                            className="absolute right-3 top-2.5 text-white/40 hover:text-white transition-colors"
                          >
                            {inputState.showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Custom Base URL (if required or custom) */}
                      {(spec.requires_base_url || pid === "custom") && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                            <Server size={13} /> Base URL (OpenAI Compatible)
                          </label>
                          <input
                            type="text"
                            placeholder="http://localhost:11434/v1"
                            value={inputState.baseUrl}
                            onChange={(e) => {
                              const val = e.target.value;
                              setProviderInputs(prev => ({
                                ...prev,
                                [pid]: { ...prev[pid], baseUrl: val }
                              }));
                            }}
                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-[#00f5ff] transition-colors"
                          />
                        </div>
                      )}

                      {/* Model Selector */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                          <Layers size={13} /> Selected Model
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={inputState.model}
                            onChange={(e) => {
                              const val = e.target.value;
                              setProviderInputs(prev => ({
                                ...prev,
                                [pid]: { ...prev[pid], model: val }
                              }));
                            }}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#00f5ff] transition-colors"
                          >
                            {(configured?.available_models || spec.default_models).map(m => (
                              <option key={m} value={m} className="bg-neutral-900 text-white">
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Test Connection Result Box */}
                      {testResult && (
                        <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                          testResult.success
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                        }`}>
                          {testResult.success ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                          <div>
                            <p className="font-semibold">{testResult.success ? "Connection Verified!" : "Connection Failed"}</p>
                            <p className="text-[11px] opacity-80 mt-0.5">
                              {testResult.message || testResult.error}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleTestConnection(pid)}
                            disabled={isTestingThis}
                            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {isTestingThis ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                            {isTestingThis ? "Testing..." : "Test Connection"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSaveProvider(pid)}
                            disabled={isSavingThis}
                            className="px-5 py-2 rounded-xl bg-[#00f5ff] hover:bg-[#00ddff] text-black text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(0,245,255,0.3)]"
                          >
                            {isSavingThis ? <RefreshCw size={13} className="animate-spin" /> : <Lock size={13} />}
                            {isSavingThis ? "Saving..." : "Save & Encrypt"}
                          </button>
                        </div>

                        {configured?.has_key && (
                          <button
                            type="button"
                            onClick={() => handleDeleteProvider(pid)}
                            className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Trash2 size={13} /> Remove
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security Info Card */}
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-white/40 flex items-start gap-3">
        <Shield size={18} className="text-[#00f5ff] mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold text-white/70">Qoneqt Zero-Leak Security Architecture:</span>
          <p className="mt-0.5">
            Your personal API keys are encrypted at rest with military-grade AES-256 on the backend server. They are never stored in browser localStorage, sessionStorage, or client bundles, and are only decrypted during backend pipeline execution.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApiConfigurationPage;
