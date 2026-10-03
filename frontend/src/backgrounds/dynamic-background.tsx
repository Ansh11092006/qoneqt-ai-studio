import React, { useEffect, useRef } from "react";
import { useJob } from "../store/job-context";

// -------------------------------------------------------------
// 1. Matrix Rain Canvas
// -------------------------------------------------------------
const MatrixRainCanvas: React.FC<{ accent: string; bg1: string }> = ({ accent, bg1 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const chars = "010101アイウエオカキクケコサシスセソタチツテトQONEQT";
    const fontSize = 16;
    const columns = Math.floor(width / fontSize);
    const drops: number[] = Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = "rgba(3, 7, 18, 0.08)";
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = accent || "#00ff66";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, [accent, bg1]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />;
};

// -------------------------------------------------------------
// 2. Kleap Cinematic Backdrop Canvas (Monolith Pillars & Red Orb)
// -------------------------------------------------------------
const KleapCinematicBackdrop: React.FC<{ accent: string; bg1: string; bg2: string }> = ({
  accent,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    let time = 0;

    const draw = () => {
      time += 0.01;
      ctx.clearRect(0, 0, width, height);

      // Deep Dark Obsidian Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, "#090808");
      bgGrad.addColorStop(0.5, "#0d0a0b");
      bgGrad.addColorStop(1, "#140e10");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 1. Red Horizon Sun Orb on Bottom Right
      const orbX = width * 0.85;
      const orbY = height * 0.65;
      const orbRadius = Math.min(width, height) * 0.18;
      
      const orbGlow = ctx.createRadialGradient(orbX, orbY, 10, orbX, orbY, orbRadius * 2.5);
      orbGlow.addColorStop(0, "#ff0055");
      orbGlow.addColorStop(0.3, "rgba(255, 0, 85, 0.4)");
      orbGlow.addColorStop(0.7, "rgba(255, 0, 85, 0.1)");
      orbGlow.addColorStop(1, "transparent");
      ctx.fillStyle = orbGlow;
      ctx.fillRect(0, 0, width, height);

      // Sun Disc
      ctx.beginPath();
      ctx.arc(orbX, orbY, orbRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#ff2a6d";
      ctx.fill();

      // 2. Monolith Dark Pillars (Left and Right Sides)
      // Left Pillars
      const p1 = ctx.createLinearGradient(0, 0, width * 0.2, 0);
      p1.addColorStop(0, "#050404");
      p1.addColorStop(0.7, "#141112");
      p1.addColorStop(1, "rgba(5,4,4,0)");

      ctx.fillStyle = p1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width * 0.22, 0);
      ctx.lineTo(width * 0.18, height);
      ctx.lineTo(0, height);
      ctx.fill();

      // Right Pillars (Silhouette over the Sun)
      const p2 = ctx.createLinearGradient(width * 0.75, 0, width, 0);
      p2.addColorStop(0, "rgba(5,4,4,0)");
      p2.addColorStop(0.3, "#141112");
      p2.addColorStop(1, "#050404");

      ctx.fillStyle = p2;
      ctx.beginPath();
      ctx.moveTo(width * 0.78, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(width, height);
      ctx.lineTo(width * 0.74, height);
      ctx.fill();

      // 3. Rolling Ground Mist Fog
      for (let i = 0; i < 3; i++) {
        const fogY = height * (0.65 + i * 0.1);
        const fogGrad = ctx.createLinearGradient(0, fogY - 100, 0, fogY + 100);
        fogGrad.addColorStop(0, "transparent");
        fogGrad.addColorStop(0.5, `rgba(255, 0, 85, ${0.08 - i * 0.02})`);
        fogGrad.addColorStop(1, "transparent");

        ctx.fillStyle = fogGrad;
        ctx.beginPath();
        ctx.moveTo(0, fogY);
        for (let x = 0; x <= width; x += 50) {
          const yOffset = Math.sin(x * 0.003 + time + i) * 20;
          ctx.lineTo(x, fogY + yOffset);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.fill();
      }

      // 4. Subtle Ambient Red Horizon Glow Light Beam
      const beamGrad = ctx.createRadialGradient(width * 0.5, height * 0.4, 50, width * 0.5, height * 0.4, width * 0.6);
      beamGrad.addColorStop(0, "rgba(255, 0, 85, 0.12)");
      beamGrad.addColorStop(1, "transparent");
      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, 0, width, height);

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, [accent]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
};

// -------------------------------------------------------------
// 3. Floating Particles Canvas
// -------------------------------------------------------------
const ParticlesCanvas: React.FC<{ accent: string }> = ({ accent }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const count = 70;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      size: Math.random() * 2.5 + 1,
      alpha: Math.random() * 0.6 + 0.2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, [accent]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-70" />;
};

// -------------------------------------------------------------
// 4. Stars Canvas
// -------------------------------------------------------------
const StarsCanvas: React.FC<{ accent: string }> = ({ accent }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const count = 100;
    const stars = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.5,
      twinkle: Math.random() * Math.PI,
      speed: Math.random() * 0.04 + 0.01,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) {
        s.twinkle += s.speed;
        const alpha = 0.3 + 0.7 * Math.abs(Math.sin(s.twinkle));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [accent]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />;
};

// -------------------------------------------------------------
// 5. Sunrise Clouds Canvas
// -------------------------------------------------------------
const SunriseCloudsCanvas: React.FC<{ accent: string; bg2: string }> = ({ accent, bg2 }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute -top-[10%] left-0 w-full h-[60%] opacity-35 blur-[120px]"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${accent} 0%, ${bg2} 60%, transparent 80%)`,
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-full h-[40%] opacity-20 blur-[80px]"
        style={{
          background: `radial-gradient(ellipse at 50% 100%, ${accent} 0%, transparent 70%)`,
        }}
      />
    </div>
  );
};

// -------------------------------------------------------------
// 6. Embers Canvas (Fire Sparks)
// -------------------------------------------------------------
const EmbersCanvas: React.FC<{ accent: string }> = ({ accent }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const count = 60;
    const embers = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: height + Math.random() * 50,
      vy: Math.random() * 2.0 + 1.0,
      vx: (Math.random() - 0.5) * 1.0,
      size: Math.random() * 3 + 1,
      alpha: Math.random() * 0.8 + 0.2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const e of embers) {
        e.y -= e.vy;
        e.x += e.vx;
        e.alpha -= 0.003;
        if (e.y < -10 || e.alpha <= 0) {
          e.y = height + 10;
          e.x = Math.random() * width;
          e.alpha = Math.random() * 0.8 + 0.3;
        }

        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.globalAlpha = Math.max(0, e.alpha);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [accent]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-70" />;
};

// -------------------------------------------------------------
// 7. Neon Grid Canvas
// -------------------------------------------------------------
const NeonGridCanvas: React.FC<{ accent: string }> = ({ accent }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to right, ${accent}33 1px, transparent 1px), linear-gradient(to bottom, ${accent}33 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          transform: "perspective(500px) rotateX(60deg) translateY(-20%)",
          transformOrigin: "bottom center",
          height: "150%",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, var(--bg1) 10%, transparent 60%, var(--bg1) 100%)",
        }}
      />
    </div>
  );
};

// -------------------------------------------------------------
// 8. Waves Canvas
// -------------------------------------------------------------
const WavesCanvas: React.FC<{ accent: string }> = ({ accent }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let step = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      step += 0.02;

      ctx.beginPath();
      ctx.moveTo(0, height * 0.7);
      for (let x = 0; x < width; x += 15) {
        const y = height * 0.7 + Math.sin(x * 0.005 + step) * 35 + Math.cos(x * 0.01 - step) * 20;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.fillStyle = `${accent}18`;
      ctx.fill();

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [accent]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />;
};

// -------------------------------------------------------------
// Dynamic Background Host with 1s Cross-fade
// -------------------------------------------------------------
export const DynamicBackground: React.FC = () => {
  const { currentTheme } = useJob();
  const bgType = currentTheme.background_type;
  const { accent, bg1, bg2 } = currentTheme.palette;

  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 transition-colors duration-1000 ease-out overflow-hidden"
      style={{ backgroundColor: bg1 }}
    >
      {/* Background layer according to type */}
      <KleapCinematicBackdrop accent={accent} bg1={bg1} bg2={bg2} />
      {bgType === "matrix_rain" && <MatrixRainCanvas accent={accent} bg1={bg1} />}
      {bgType === "particles" && <ParticlesCanvas accent={accent} />}
      {bgType === "stars" && <StarsCanvas accent={accent} />}
      {bgType === "sunrise_clouds" && <SunriseCloudsCanvas accent={accent} bg2={bg2} />}
      {bgType === "embers" && <EmbersCanvas accent={accent} />}
      {bgType === "neon_grid" && <NeonGridCanvas accent={accent} />}
      {bgType === "waves" && <WavesCanvas accent={accent} />}

      {/* Subtle vignette layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at center, transparent 30%, rgba(3, 7, 18, 0.7) 100%)",
        }}
      />
    </div>
  );
};
