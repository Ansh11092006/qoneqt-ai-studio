import React, { useState, useRef, useEffect, ReactNode } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import gsap from "gsap";
import { GitBranch, Globe, Mail, ArrowUpRight } from "lucide-react";
import { useJob } from "@/store/job-context";

interface NavLinkItem {
  label: string;
  href: string;
  badge?: string;
}

interface NavProps {
  headerClosedColor?: string;
  headerOpenColor?: string;
  overlayBg?: string;
  linkHoverColor?: string;
}

export const ImmersiveFullscreenNav: React.FC<NavProps> = ({
  headerClosedColor = "#ffffff",
  headerOpenColor = "#ffffff",
  overlayBg = "var(--bg1)",
  linkHoverColor = "var(--accent)",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isAnimatingRef = useRef(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const linksContainerRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { recentJobs } = useJob();

  const navLinks: NavLinkItem[] = [
    { label: "Dashboard", href: "/" },
    { label: "Create Video", href: "/create" },
    { label: "AI Command Center", href: "/command-center", badge: "Neural HQ" },
    { label: "Analytics 3D", href: "/analytics", badge: "New" },
    { label: "Batch Studio", href: "/batch" },
    { label: "Library", href: "/library" },
    { label: "Global Feed", href: "/feed", badge: "Prototype" },
  ];

  // Dynamic preview images: recent video thumbnails or Unsplash creators fallback
  const previewImages = recentJobs.length >= 2
    ? [recentJobs[0].thumbnail_url || "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80",
       recentJobs[1].thumbnail_url || "https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=600&q=80"]
    : [
        "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=600&q=80",
      ];

  const repoUrl = import.meta.env.VITE_REPO_URL || "https://github.com/qoneqt/qoneqt-ai-studio";

  const closeMenu = (callback?: () => void) => {
    if (isAnimatingRef.current || !isOpen) return;
    isAnimatingRef.current = true;

    const tl = gsap.timeline({
      onComplete: () => {
        setIsOpen(false);
        isAnimatingRef.current = false;
        if (callback) callback();
      },
    });

    tl.to([detailsRef.current, imagesRef.current], {
      opacity: 0,
      y: 20,
      duration: 0.25,
      ease: "power2.in",
    })
      .to(
        linksContainerRef.current?.querySelectorAll(".nav-link-item") || [],
        {
          opacity: 0,
          x: -30,
          stagger: 0.03,
          duration: 0.2,
          ease: "power2.in",
        },
        "-=0.15"
      )
      .to(
        overlayRef.current,
        {
          clipPath: "polygon(0 0, 100% 0, 100% 0%, 0 0%)",
          duration: 0.45,
          ease: "power4.inOut",
        },
        "-=0.1"
      );
  };

  const openMenu = () => {
    if (isAnimatingRef.current || isOpen) return;
    isAnimatingRef.current = true;
    setIsOpen(true);

    const tl = gsap.timeline({
      onComplete: () => {
        isAnimatingRef.current = false;
      },
    });

    gsap.set(overlayRef.current, {
      clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)",
    });

    tl.to(overlayRef.current, {
      clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
      duration: 0.55,
      ease: "power4.out",
    })
      .fromTo(
        linksContainerRef.current?.querySelectorAll(".nav-link-item") || [],
        { opacity: 0, x: -40 },
        { opacity: 1, x: 0, stagger: 0.06, duration: 0.4, ease: "power3.out" },
        "-=0.25"
      )
      .fromTo(
        [detailsRef.current, imagesRef.current],
        { opacity: 0, y: 25 },
        { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" },
        "-=0.2"
      );
  };

  const toggleMenu = () => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const handleNavigate = (href: string) => {
    closeMenu(() => {
      navigate(href);
    });
  };

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeMenu();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const currentColor = isOpen ? headerOpenColor : headerClosedColor;

  return (
    <>
      {/* Floating Kleap-Style Capsule Header Bar */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-5xl h-14 rounded-full px-5 flex items-center justify-between bg-[#161415]/90 border border-white/12 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all">
        {/* Brand Logo & Name */}
        <Link
          to="/"
          onClick={(e) => {
            e.preventDefault();
            handleNavigate("/");
          }}
          className="flex items-center gap-2.5 group focus:outline-none rounded-full"
        >
          <div className="w-8 h-8 rounded-full bg-[#ff0055] text-white font-black flex items-center justify-center font-heading text-sm shadow-[0_0_15px_#ff0055] transition-transform group-hover:scale-110">
            Q
          </div>
          <span className="font-heading font-black tracking-tight text-white text-base">
            Qoneqt<span className="text-[#ff0055]">.ai</span>
          </span>
        </Link>

        {/* Quick Nav Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-white/70">
          <Link to="/" className="hover:text-white transition-colors">Dashboard</Link>
          <Link to="/create" className="hover:text-white transition-colors">Create</Link>
          <Link to="/command-center" className="hover:text-white transition-colors flex items-center gap-1 text-[#ff0055]">
            Command Center <span className="px-1.5 py-0.2 rounded-full bg-[#ff0055]/20 text-[#ff0055] text-[9px] font-bold">HQ</span>
          </Link>
          <Link to="/analytics" className="hover:text-white transition-colors">Analytics</Link>
          <Link to="/batch" className="hover:text-white transition-colors">Batch</Link>
          <Link to="/feed" className="hover:text-white transition-colors">Global Feed</Link>
        </nav>

        {/* Right Action & Menu Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleNavigate("/create")}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/10"
          >
            <span>+ Create</span>
          </button>
          
          <button
            onClick={toggleMenu}
            aria-label={isOpen ? "Close Menu" : "Open Menu"}
            className="flex items-center gap-2 focus:outline-none rounded-full px-3.5 py-1.5 bg-[#ff0055] text-white text-xs font-bold hover:bg-[#e0004c] transition-all cursor-pointer shadow-[0_0_20px_rgba(255,0,85,0.4)]"
          >
            <span>{isOpen ? "Close" : "Menu"}</span>
            <div className="w-4 h-4 relative flex flex-col justify-center gap-1">
              <span className={`h-0.5 w-full bg-white rounded-full transition-transform ${isOpen ? "rotate-45 translate-y-0.5" : ""}`} />
              <span className={`h-0.5 w-full bg-white rounded-full transition-transform ${isOpen ? "-rotate-45 -translate-y-1" : ""}`} />
            </div>
          </button>
        </div>
      </header>

      {/* Fullscreen Overlay */}
      <nav
        ref={overlayRef}
        inert={!isOpen ? ("" as any) : undefined}
        aria-hidden={!isOpen}
        className={`fixed inset-0 z-40 flex flex-col justify-between p-6 sm:p-12 md:p-16 pt-28 sm:pt-32 overflow-y-auto ${
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        style={{
          backgroundColor: overlayBg,
          clipPath: "polygon(0 0, 100% 0, 100% 0%, 0 0%)",
        }}
      >
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 my-auto">
          {/* Column 1: Main Nav Links */}
          <div ref={linksContainerRef} className="lg:col-span-6 flex flex-col space-y-4 sm:space-y-6">
            <span className="text-xs font-mono tracking-widest text-white/40 uppercase">
              // Navigation Architecture
            </span>
            {navLinks.map((item, idx) => {
              const isActive = location.pathname === item.href;
              return (
                <div key={item.href} className="nav-link-item">
                  <a
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavigate(item.href);
                    }}
                    className="group inline-flex items-center gap-4 text-3xl sm:text-5xl md:text-6xl font-heading font-extrabold tracking-tight transition-all duration-300 hover:translate-x-3"
                    style={{
                      color: isActive ? linkHoverColor : "rgba(255, 255, 255, 0.9)",
                    }}
                  >
                    <span className="text-sm font-mono text-white/30 font-normal group-hover:text-[var(--accent)]">
                      0{idx + 1}
                    </span>
                    <span>{item.label}</span>
                    {isActive && (
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: linkHoverColor }}
                      />
                    )}
                    {item.badge && (
                      <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/20">
                        {item.badge}
                      </span>
                    )}
                    <ArrowUpRight
                      size={24}
                      className="opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0"
                      style={{ color: linkHoverColor }}
                    />
                  </a>
                </div>
              );
            })}
          </div>

          {/* Column 2: Recent Creations Poster Frames */}
          <div ref={imagesRef} className="hidden lg:flex lg:col-span-3 flex-col space-y-4">
            <span className="text-xs font-mono tracking-widest text-white/40 uppercase">
              // Recent Outputs
            </span>
            <div className="space-y-4">
              {previewImages.map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-9/16 max-h-48 rounded-2xl overflow-hidden border border-white/10 glass-panel group shadow-xl"
                >
                  <img
                    src={src}
                    alt={`Preview output ${i + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                    <span className="text-[11px] font-mono text-white/70">
                      Qoneqt Render #{i + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Brand Details & Socials */}
          <div
            ref={detailsRef}
            className="lg:col-span-3 flex flex-col justify-between space-y-8 text-sm text-white/70"
          >
            <div className="space-y-3">
              <span className="text-xs font-mono tracking-widest text-white/40 uppercase block">
                // Specification
              </span>
              <p className="font-heading text-lg font-bold text-white">Qoneqt AI Studio®</p>
              <p className="text-white/60 leading-relaxed">
                One idea in. One publish-ready video out. Built exclusively for the Qoneqt Global Feed.
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-mono tracking-widest text-white/40 uppercase block">
                // System Status
              </span>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono text-white/80">Pipeline Engine Active</span>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <span className="text-xs font-mono tracking-widest text-white/40 uppercase block">
                // Connect
              </span>
              <div className="flex items-center gap-4">
                {repoUrl && (
                  <a
                    href={repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white hover:text-[var(--accent)] transition-colors"
                  >
                    <GitBranch size={18} />
                  </a>
                )}
                <a
                  href="https://qoneqt.com"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white hover:text-[var(--accent)] transition-colors"
                >
                  <Globe size={18} />
                </a>
                <a
                  href="mailto:contact@qoneqt.com"
                  className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white hover:text-[var(--accent)] transition-colors"
                >
                  <Mail size={18} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer tagline */}
        <div className="max-w-7xl mx-auto w-full pt-8 mt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-white/40 gap-4">
          <span>&copy; {new Date().getFullYear()} Qoneqt Technologies. All rights reserved.</span>
          <span>Zero manual steps. Instant MP4 generation.</span>
        </div>
      </nav>
    </>
  );
};
