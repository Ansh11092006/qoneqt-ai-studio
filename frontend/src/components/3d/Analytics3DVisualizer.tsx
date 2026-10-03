import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { AnalyticsTab } from "@/hooks/useAnalytics";
import { KPICardData } from "@/services/analyticsService";
import { RotateCcw, ZoomIn, Sparkles } from "lucide-react";

interface Analytics3DVisualizerProps {
  activeTab: AnalyticsTab;
  currentKpis: [KPICardData, KPICardData, KPICardData, KPICardData];
  highlightedKpiId?: string | null;
  onNodeHighlight?: (kpiId: string | null) => void;
  onNodeSelect?: (kpiId: string) => void;
}

interface NodeUserData {
  kpiId: string;
  title: string;
  value: string;
  badge: string;
  color: string;
  baseScale: number;
}

interface TooltipInfo {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  value: string;
  badge: string;
  color: string;
}

export const Analytics3DVisualizer: React.FC<Analytics3DVisualizerProps> = ({
  activeTab,
  currentKpis,
  highlightedKpiId,
  onNodeHighlight,
  onNodeSelect,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipInfo>({
    visible: false,
    x: 0,
    y: 0,
    title: "",
    value: "",
    badge: "",
    color: "#ff0055",
  });

  // Track latest props in refs for animation loop
  const activeTabRef = useRef<AnalyticsTab>(activeTab);
  const currentKpisRef = useRef(currentKpis);
  const highlightedKpiIdRef = useRef(highlightedKpiId);
  const resetCameraRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    currentKpisRef.current = currentKpis;
  }, [currentKpis]);

  useEffect(() => {
    highlightedKpiIdRef.current = highlightedKpiId;
  }, [highlightedKpiId]);

  // Tab Badge Label & Accent
  const tabMetadata = {
    bi: {
      title: "CONTENT INTELLIGENCE CORE",
      subtitle: "LIVE PERFORMANCE",
      color: "#ff0055",
      accent: "#00f0ff",
    },
    growth: {
      title: "GROWTH ORBIT",
      subtitle: "LIVE AUDIENCE RETENTION",
      color: "#10b981",
      accent: "#00f0ff",
    },
    revenue: {
      title: "REVENUE FLOW",
      subtitle: "LIVE EARNINGS INTELLIGENCE",
      color: "#ffd700",
      accent: "#ff0055",
    },
    audience: {
      title: "AUDIENCE GALAXY",
      subtitle: "LIVE AUDIENCE INTELLIGENCE",
      color: "#00f0ff",
      accent: "#a855f7",
    },
  }[activeTab];

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 600;
    let height = container.clientHeight || 450;

    // Check reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a090b, 0.05);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    const defaultCamDist = 6.4;
    camera.position.set(0, 0.4, defaultCamDist);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const mainLight = new THREE.PointLight(0xff0055, 3.5, 30);
    mainLight.position.set(4, 4, 4);
    scene.add(mainLight);

    const secondaryLight = new THREE.PointLight(0x00f0ff, 3.0, 30);
    secondaryLight.position.set(-4, -3, 3);
    scene.add(secondaryLight);

    const centerGlowLight = new THREE.PointLight(0xffffff, 2.0, 15);
    centerGlowLight.position.set(0, 0, 0);
    scene.add(centerGlowLight);

    // Master container for global rotation/tilt
    const rootPivot = new THREE.Group();
    scene.add(rootPivot);

    // Track all interactive nodes for raycasting
    const interactiveNodes: THREE.Mesh[] = [];

    // Helper to create a glowing interactive satellite node
    const createSatelliteNode = (
      kpiId: string,
      initialPos: THREE.Vector3,
      colorHex: string,
      title: string,
      value: string,
      badge: string
    ) => {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.copy(initialPos);

      // Core sphere
      const sphereGeo = new THREE.SphereGeometry(0.18, 16, 16);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        emissive: new THREE.Color(colorHex),
        emissiveIntensity: 1.8,
        roughness: 0.2,
        metalness: 0.8,
      });
      const nodeMesh = new THREE.Mesh(sphereGeo, sphereMat);
      nodeMesh.userData = {
        kpiId,
        title,
        value,
        badge,
        color: colorHex,
        baseScale: 1.0,
      } as NodeUserData;
      interactiveNodes.push(nodeMesh);
      nodeGroup.add(nodeMesh);

      // Outer glowing beacon ring
      const ringGeo = new THREE.RingGeometry(0.24, 0.28, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(colorHex),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.lookAt(camera.position);
      nodeGroup.add(ringMesh);

      return { nodeGroup, nodeMesh, ringMesh };
    };

    // =========================================================================
    // SYSTEM 1: OVERVIEW BI — "Content Intelligence Core"
    // =========================================================================
    const groupOverview = new THREE.Group();
    rootPivot.add(groupOverview);

    // Central Data Core Sphere
    const coreGlassGeo = new THREE.IcosahedronGeometry(0.85, 3);
    const coreGlassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#16121f"),
      emissive: new THREE.Color("#ff0055"),
      emissiveIntensity: 0.5,
      metalness: 0.85,
      roughness: 0.15,
      transmission: 0.8,
      thickness: 1.2,
      transparent: true,
      opacity: 0.9,
    });
    const coreGlassMesh = new THREE.Mesh(coreGlassGeo, coreGlassMat);
    groupOverview.add(coreGlassMesh);

    // Inner Pulsing Glow Sphere
    const coreInnerGeo = new THREE.SphereGeometry(0.48, 24, 24);
    const coreInnerMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#ff0055"),
      emissive: new THREE.Color("#ff0055"),
      emissiveIntensity: 2.2,
      roughness: 0.3,
    });
    const coreInnerMesh = new THREE.Mesh(coreInnerGeo, coreInnerMat);
    groupOverview.add(coreInnerMesh);

    // Spherical Shell Wireframe/Lattice
    const shellGeo = new THREE.SphereGeometry(1.35, 18, 18);
    const shellMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#00f0ff"),
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const shellMesh = new THREE.Mesh(shellGeo, shellMat);
    groupOverview.add(shellMesh);

    // Dual Orbital Gyroscope Rings
    const gyroRingGeo1 = new THREE.TorusGeometry(1.85, 0.016, 16, 100);
    const gyroRingMat1 = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#ff0055"),
      transparent: true,
      opacity: 0.65,
    });
    const gyroRing1 = new THREE.Mesh(gyroRingGeo1, gyroRingMat1);
    gyroRing1.rotation.x = Math.PI / 4;
    groupOverview.add(gyroRing1);

    const gyroRingGeo2 = new THREE.TorusGeometry(2.1, 0.014, 16, 100);
    const gyroRingMat2 = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#00f0ff"),
      transparent: true,
      opacity: 0.65,
    });
    const gyroRing2 = new THREE.Mesh(gyroRingGeo2, gyroRingMat2);
    gyroRing2.rotation.y = Math.PI / 3;
    gyroRing2.rotation.x = -Math.PI / 6;
    groupOverview.add(gyroRing2);

    // 4 Content Intelligence Satellite Nodes
    const overviewNodesConfig = [
      { id: "ov-views", pos: new THREE.Vector3(0, 1.9, 0), color: "#ff0055", title: "Total Views", val: "1.84M", badge: "↑ 24.8%" },
      { id: "ov-engagement", pos: new THREE.Vector3(-2.15, 0.1, 0.4), color: "#00f0ff", title: "Engagement Rate", val: "12.8%", badge: "↑ 4.2%" },
      { id: "ov-followers", pos: new THREE.Vector3(2.15, 0.1, -0.4), color: "#10b981", title: "Followers Gained", val: "+12.4K", badge: "↑ 18.6%" },
      { id: "ov-qc", pos: new THREE.Vector3(0, -1.9, 0), color: "#f59e0b", title: "AI Quality Score", val: "93/100", badge: "Top 5% Tier" },
    ];

    const overviewNodes = overviewNodesConfig.map((cfg) => {
      const node = createSatelliteNode(cfg.id, cfg.pos, cfg.color, cfg.title, cfg.val, cfg.badge);
      groupOverview.add(node.nodeGroup);

      // Connecting energy beam to core
      const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), cfg.pos]);
      const lineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(cfg.color),
        transparent: true,
        opacity: 0.4,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      groupOverview.add(line);

      return node;
    });

    // Content Particles around Overview Core
    const ovParticleCount = 140;
    const ovParticleGeo = new THREE.BufferGeometry();
    const ovPositions = new Float32Array(ovParticleCount * 3);
    const ovColors = new Float32Array(ovParticleCount * 3);
    const ovColorPalette = [new THREE.Color("#ff0055"), new THREE.Color("#00f0ff"), new THREE.Color("#10b981"), new THREE.Color("#f59e0b")];

    for (let i = 0; i < ovParticleCount; i++) {
      const radius = 1.0 + Math.random() * 1.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      ovPositions[i * 3] = radius * Math.cos(theta) * Math.cos(phi);
      ovPositions[i * 3 + 1] = radius * Math.sin(phi);
      ovPositions[i * 3 + 2] = radius * Math.sin(theta) * Math.cos(phi);

      const col = ovColorPalette[i % ovColorPalette.length];
      ovColors[i * 3] = col.r;
      ovColors[i * 3 + 1] = col.g;
      ovColors[i * 3 + 2] = col.b;
    }
    ovParticleGeo.setAttribute("position", new THREE.BufferAttribute(ovPositions, 3));
    ovParticleGeo.setAttribute("color", new THREE.BufferAttribute(ovColors, 3));

    const ovParticleMat = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
    });
    const ovParticles = new THREE.Points(ovParticleGeo, ovParticleMat);
    groupOverview.add(ovParticles);

    // =========================================================================
    // SYSTEM 2: GROWTH & RETENTION — "Growth Orbit"
    // =========================================================================
    const groupGrowth = new THREE.Group();
    rootPivot.add(groupGrowth);

    // Central Audience/Growth Core
    const growthCoreGeo = new THREE.SphereGeometry(0.7, 32, 32);
    const growthCoreMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#052e16"),
      emissive: new THREE.Color("#10b981"),
      emissiveIntensity: 1.6,
      metalness: 0.7,
      roughness: 0.25,
    });
    const growthCoreMesh = new THREE.Mesh(growthCoreGeo, growthCoreMat);
    groupGrowth.add(growthCoreMesh);

    // Concentric Orbital Paths
    const growthRingGeo1 = new THREE.TorusGeometry(1.4, 0.014, 16, 100);
    const growthRingMat1 = new THREE.MeshBasicMaterial({ color: new THREE.Color("#10b981"), transparent: true, opacity: 0.5 });
    const growthRing1 = new THREE.Mesh(growthRingGeo1, growthRingMat1);
    growthRing1.rotation.x = Math.PI / 2.3;
    groupGrowth.add(growthRing1);

    // Primary Dense Retention Orbit Ring (72.4% Retention representation)
    const growthRingGeo2 = new THREE.TorusGeometry(2.0, 0.024, 16, 120);
    const growthRingMat2 = new THREE.MeshBasicMaterial({ color: new THREE.Color("#00f0ff"), transparent: true, opacity: 0.85 });
    const growthRing2 = new THREE.Mesh(growthRingGeo2, growthRingMat2);
    growthRing2.rotation.x = Math.PI / 2.1;
    groupGrowth.add(growthRing2);

    const growthRingGeo3 = new THREE.TorusGeometry(2.65, 0.012, 16, 100);
    const growthRingMat3 = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ff0055"), transparent: true, opacity: 0.4 });
    const growthRing3 = new THREE.Mesh(growthRingGeo3, growthRingMat3);
    growthRing3.rotation.x = Math.PI / 1.9;
    growthRing3.rotation.y = 0.2;
    groupGrowth.add(growthRing3);

    // Dense Retained Users Particles (circulating tightly on retention ring)
    const retainedCount = 180;
    const retainedGeo = new THREE.BufferGeometry();
    const retainedPos = new Float32Array(retainedCount * 3);
    const retainedColors = new Float32Array(retainedCount * 3);
    const greenColor = new THREE.Color("#10b981");
    const cyanColor = new THREE.Color("#00f0ff");

    for (let i = 0; i < retainedCount; i++) {
      const angle = (i / retainedCount) * Math.PI * 2;
      const radius = 2.0 + (Math.random() - 0.5) * 0.18;
      retainedPos[i * 3] = Math.cos(angle) * radius;
      retainedPos[i * 3 + 1] = (Math.random() - 0.5) * 0.15;
      retainedPos[i * 3 + 2] = Math.sin(angle) * radius;

      const c = Math.random() > 0.4 ? greenColor : cyanColor;
      retainedColors[i * 3] = c.r;
      retainedColors[i * 3 + 1] = c.g;
      retainedColors[i * 3 + 2] = c.b;
    }
    retainedGeo.setAttribute("position", new THREE.BufferAttribute(retainedPos, 3));
    retainedGeo.setAttribute("color", new THREE.BufferAttribute(retainedColors, 3));
    const retainedMat = new THREE.PointsMaterial({ size: 0.055, vertexColors: true, transparent: true, opacity: 0.85 });
    const retainedPoints = new THREE.Points(retainedGeo, retainedMat);
    retainedPoints.rotation.x = Math.PI / 2.1;
    groupGrowth.add(retainedPoints);

    // Inward Inflow Particles (New Followers entering orbit)
    const inflowCount = 50;
    const inflowGeo = new THREE.BufferGeometry();
    const inflowPos = new Float32Array(inflowCount * 3);
    for (let i = 0; i < inflowCount; i++) {
      const t = i / inflowCount;
      const r = THREE.MathUtils.lerp(3.6, 2.0, t);
      const theta = t * Math.PI * 4;
      inflowPos[i * 3] = Math.cos(theta) * r;
      inflowPos[i * 3 + 1] = THREE.MathUtils.lerp(1.2, 0, t);
      inflowPos[i * 3 + 2] = Math.sin(theta) * r;
    }
    inflowGeo.setAttribute("position", new THREE.BufferAttribute(inflowPos, 3));
    const inflowMat = new THREE.PointsMaterial({ size: 0.06, color: new THREE.Color("#00f0ff"), transparent: true, opacity: 0.8 });
    const inflowPoints = new THREE.Points(inflowGeo, inflowMat);
    groupGrowth.add(inflowPoints);

    // Churn Particles (slowly drifting outward into space)
    const churnCount = 25;
    const churnGeo = new THREE.BufferGeometry();
    const churnPos = new Float32Array(churnCount * 3);
    for (let i = 0; i < churnCount; i++) {
      const angle = (i / churnCount) * Math.PI * 2;
      const r = 2.4 + Math.random() * 1.4;
      churnPos[i * 3] = Math.cos(angle) * r;
      churnPos[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
      churnPos[i * 3 + 2] = Math.sin(angle) * r;
    }
    churnGeo.setAttribute("position", new THREE.BufferAttribute(churnPos, 3));
    const churnMat = new THREE.PointsMaterial({ size: 0.045, color: new THREE.Color("#ff0055"), transparent: true, opacity: 0.45 });
    const churnPoints = new THREE.Points(churnGeo, churnMat);
    groupGrowth.add(churnPoints);

    // 4 Growth & Retention Interactive Nodes
    const growthNodesConfig = [
      { id: "gr-new-followers", pos: new THREE.Vector3(-1.9, 0.7, 0.3), color: "#ff0055", title: "New Followers", val: "+12.4K", badge: "↑ 18.6% MoM" },
      { id: "gr-growth-rate", pos: new THREE.Vector3(0.6, 1.95, -0.3), color: "#00f0ff", title: "Growth Rate", val: "18.6%", badge: "↑ 3.4%" },
      { id: "gr-retention-30d", pos: new THREE.Vector3(2.05, -0.4, 0.4), color: "#10b981", title: "30-Day Retention", val: "72.4%", badge: "Stable Orbit" },
      { id: "gr-returning-audience", pos: new THREE.Vector3(-0.7, -1.9, -0.2), color: "#f59e0b", title: "Returning Audience", val: "64.8%", badge: "High Loyalty" },
    ];
    growthNodesConfig.forEach((cfg) => {
      const node = createSatelliteNode(cfg.id, cfg.pos, cfg.color, cfg.title, cfg.val, cfg.badge);
      groupGrowth.add(node.nodeGroup);
    });

    // =========================================================================
    // SYSTEM 3: REVENUE & EARNINGS — "Revenue Flow Core"
    // =========================================================================
    const groupRevenue = new THREE.Group();
    rootPivot.add(groupRevenue);

    // Central Financial Core: Faceted Prism
    const revCoreGeo = new THREE.OctahedronGeometry(0.85, 1);
    const revCoreMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#2a1b02"),
      emissive: new THREE.Color("#ffd700"),
      emissiveIntensity: 1.4,
      metalness: 0.9,
      roughness: 0.2,
      reflectivity: 0.9,
    });
    const revCoreMesh = new THREE.Mesh(revCoreGeo, revCoreMat);
    groupRevenue.add(revCoreMesh);

    // Wireframe Cage for Financial Core
    const revWireGeo = new THREE.OctahedronGeometry(0.95, 1);
    const revWireMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd700"), wireframe: true, transparent: true, opacity: 0.4 });
    const revWireMesh = new THREE.Mesh(revWireGeo, revWireMat);
    groupRevenue.add(revWireMesh);

    // Calibrated Financial Radar Rings
    const revRingGeo1 = new THREE.TorusGeometry(1.7, 0.018, 16, 80);
    const revRingMat1 = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd700"), transparent: true, opacity: 0.6 });
    const revRing1 = new THREE.Mesh(revRingGeo1, revRingMat1);
    groupRevenue.add(revRing1);

    const revRingGeo2 = new THREE.TorusGeometry(2.35, 0.014, 16, 80);
    const revRingMat2 = new THREE.MeshBasicMaterial({ color: new THREE.Color("#10b981"), transparent: true, opacity: 0.5 });
    const revRing2 = new THREE.Mesh(revRingGeo2, revRingMat2);
    revRing2.rotation.x = Math.PI / 2;
    groupRevenue.add(revRing2);

    // 3 Distinct Flow Streams (Subscriptions, Ads, Creator)
    const createStream = (start: THREE.Vector3, color: string, particleCount: number) => {
      const streamGroup = new THREE.Group();
      const points: THREE.Vector3[] = [];
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const p = new THREE.Vector3().lerpVectors(start, new THREE.Vector3(0, 0, 0), t);
        // Add subtle arc curve
        p.z += Math.sin(t * Math.PI) * 0.4;
        points.push(p);
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 30, 0.012, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.4 });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      streamGroup.add(tubeMesh);

      // Flowing particles along the curve
      const pGeo = new THREE.BufferGeometry();
      const pPos = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        const t = i / particleCount;
        const pt = curve.getPoint(t);
        pPos[i * 3] = pt.x;
        pPos[i * 3 + 1] = pt.y;
        pPos[i * 3 + 2] = pt.z;
      }
      pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
      const pMat = new THREE.PointsMaterial({ size: 0.065, color: new THREE.Color(color), transparent: true, opacity: 0.9 });
      const pMesh = new THREE.Points(pGeo, pMat);
      streamGroup.add(pMesh);

      return { streamGroup, curve, pPos, pGeo };
    };

    const streamSub = createStream(new THREE.Vector3(0, 2.4, 0), "#ffd700", 35); // Subscriptions (Gold / Top)
    const streamAd = createStream(new THREE.Vector3(-2.3, -1.2, 0.2), "#ff0055", 30); // Ads (Pink / Left)
    const streamCreator = createStream(new THREE.Vector3(2.3, -1.2, -0.2), "#10b981", 30); // Creator (Emerald / Right)
    groupRevenue.add(streamSub.streamGroup);
    groupRevenue.add(streamAd.streamGroup);
    groupRevenue.add(streamCreator.streamGroup);

    // 4 Financial Interactive Nodes
    const revNodesConfig = [
      { id: "rev-mrr", pos: new THREE.Vector3(0, 2.45, 0), color: "#10b981", title: "Monthly MRR", val: "$14,280", badge: "↑ 34.2%" },
      { id: "rev-arr", pos: new THREE.Vector3(2.35, 0.6, 0.2), color: "#ff0055", title: "ARR", val: "$171,360", badge: "↑ 29.4%" },
      { id: "rev-creator", pos: new THREE.Vector3(2.35, -1.3, -0.2), color: "#00f0ff", title: "Creator Revenue", val: "$9,840", badge: "↑ 21.7%" },
      { id: "rev-ad", pos: new THREE.Vector3(-2.35, -1.3, 0.2), color: "#f59e0b", title: "Ad Revenue", val: "$4,440", badge: "↑ 42.8%" },
    ];
    revNodesConfig.forEach((cfg) => {
      const node = createSatelliteNode(cfg.id, cfg.pos, cfg.color, cfg.title, cfg.val, cfg.badge);
      groupRevenue.add(node.nodeGroup);
    });

    // =========================================================================
    // SYSTEM 4: AUDIENCE & DEMOGRAPHICS — "Audience Galaxy"
    // =========================================================================
    const groupAudience = new THREE.Group();
    rootPivot.add(groupAudience);

    // Central Audience Gravitational Nucleus
    const audCoreGeo = new THREE.SphereGeometry(0.65, 32, 32);
    const audCoreMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1e113a"),
      emissive: new THREE.Color("#8b5cf6"),
      emissiveIntensity: 1.8,
      roughness: 0.2,
      metalness: 0.8,
    });
    const audCoreMesh = new THREE.Mesh(audCoreGeo, audCoreMat);
    groupAudience.add(audCoreMesh);

    // Helper to generate demographic particle clusters
    const createDemographicSwarm = (center: THREE.Vector3, colorHex: string, count: number, spread: number) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = center.x + (Math.random() - 0.5) * spread;
        pos[i * 3 + 1] = center.y + (Math.random() - 0.5) * spread;
        pos[i * 3 + 2] = center.z + (Math.random() - 0.5) * spread;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ size: 0.055, color: new THREE.Color(colorHex), transparent: true, opacity: 0.8 });
      const points = new THREE.Points(geo, mat);
      groupAudience.add(points);
      return points;
    };

    // 4 Demographic Clusters
    createDemographicSwarm(new THREE.Vector3(1.85, 0.9, -0.3), "#00f0ff", 110, 0.9); // Millennials (25-34, 44%)
    createDemographicSwarm(new THREE.Vector3(-1.85, 1.15, 0.3), "#ff0055", 90, 0.85); // Gen Z (18-24, 38%)
    createDemographicSwarm(new THREE.Vector3(-1.3, -1.5, 0.5), "#10b981", 60, 0.7); // Tech & Global (35-44, 12%)
    createDemographicSwarm(new THREE.Vector3(1.5, -1.35, -0.4), "#a855f7", 50, 0.65); // Mature Core (45+, 6%)

    // Galaxy Spiral Filaments connecting to Core
    const filamentMat = new THREE.LineBasicMaterial({ color: new THREE.Color("#a855f7"), transparent: true, opacity: 0.3 });
    const clusterCenters = [
      new THREE.Vector3(1.85, 0.9, -0.3),
      new THREE.Vector3(-1.85, 1.15, 0.3),
      new THREE.Vector3(-1.3, -1.5, 0.5),
      new THREE.Vector3(1.5, -1.35, -0.4),
    ];
    clusterCenters.forEach((pt) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(pt.x * 0.4, pt.y * 0.4 + 0.3, pt.z * 0.4),
        pt,
      ]);
      const filGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(25));
      const line = new THREE.Line(filGeo, filamentMat);
      groupAudience.add(line);
    });

    // 4 Audience Interactive Nodes
    const audNodesConfig = [
      { id: "aud-total", pos: new THREE.Vector3(1.9, 0.9, -0.3), color: "#00f0ff", title: "Total Audience", val: "284K", badge: "↑ 15.2% Reach" },
      { id: "aud-active", pos: new THREE.Vector3(-1.9, 1.15, 0.3), color: "#ff0055", title: "Active Audience", val: "184K", badge: "↑ 12.4%" },
      { id: "aud-watchtime", pos: new THREE.Vector3(-1.3, -1.55, 0.5), color: "#10b981", title: "Average Watch Time", val: "38.6 sec", badge: "High Loop" },
      { id: "aud-engagement", pos: new THREE.Vector3(1.55, -1.4, -0.4), color: "#f59e0b", title: "Engagement Rate", val: "12.8%", badge: "Affinity" },
    ];
    audNodesConfig.forEach((cfg) => {
      const node = createSatelliteNode(cfg.id, cfg.pos, cfg.color, cfg.title, cfg.val, cfg.badge);
      groupAudience.add(node.nodeGroup);
    });

    // =========================================================================
    // WEIGHT-BASED SUB-SYSTEM TRANSITION STATE
    // =========================================================================
    const groups = [
      { id: "bi", group: groupOverview, weight: activeTab === "bi" ? 1 : 0 },
      { id: "growth", group: groupGrowth, weight: activeTab === "growth" ? 1 : 0 },
      { id: "revenue", group: groupRevenue, weight: activeTab === "revenue" ? 1 : 0 },
      { id: "audience", group: groupAudience, weight: activeTab === "audience" ? 1 : 0 },
    ];

    // Initialize group visibility & scale
    groups.forEach((g) => {
      g.group.visible = g.weight > 0.01;
      g.group.scale.setScalar(g.weight);
    });

    // =========================================================================
    // INTERACTION & CONTROLS (Drag to Rotate, Wheel Zoom, Hover Raycaster)
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-100, -100);

    let isDragging = false;
    let prevPointerX = 0;
    let prevPointerY = 0;
    let rotVelX = 0;
    let rotVelY = 0;
    let targetZoom = defaultCamDist;

    // Reset camera function exposed to UI
    resetCameraRef.current = () => {
      rootPivot.rotation.set(0, 0, 0);
      rotVelX = 0;
      rotVelY = 0;
      targetZoom = defaultCamDist;
    };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
      container.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      if (isDragging) {
        const deltaX = e.clientX - prevPointerX;
        const deltaY = e.clientY - prevPointerY;
        prevPointerX = e.clientX;
        prevPointerY = e.clientY;

        rotVelY = deltaX * 0.005;
        rotVelX = deltaY * 0.005;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {}
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetZoom += e.deltaY * 0.004;
      targetZoom = Math.max(4.2, Math.min(8.5, targetZoom));
    };

    const onClick = () => {
      // Raycast to check click
      raycaster.setFromCamera(mouse, camera);
      const visibleMeshes = interactiveNodes.filter((m) => m.parent && m.parent.parent && m.parent.parent.visible);
      const hits = raycaster.intersectObjects(visibleMeshes, false);
      if (hits.length > 0) {
        const hitData = hits[0].object.userData as NodeUserData;
        if (hitData?.kpiId && onNodeSelect) {
          onNodeSelect(hitData.kpiId);
        }
      }
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("click", onClick);

    // Window Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    // Document Visibility Handler (pause rendering when tab hidden)
    let isVisible = true;
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // =========================================================================
    // MAIN RENDER & ANIMATION LOOP
    // =========================================================================
    let reqId: number;
    let clock = new THREE.Clock();
    let hoveredNodeMesh: THREE.Mesh | null = null;

    const animate = () => {
      reqId = requestAnimationFrame(animate);

      if (!isVisible) return;

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // 1. Smooth Camera Zoom
      camera.position.z += (targetZoom - camera.position.z) * 0.1;

      // 2. Drag Rotation & Inertia Damping
      if (!isDragging) {
        rotVelX *= 0.92;
        rotVelY *= 0.92;
        // Subtle ambient auto-rotation
        if (!prefersReducedMotion) {
          rootPivot.rotation.y += 0.0025;
        }
      }
      rootPivot.rotation.y += rotVelY;
      rootPivot.rotation.x += rotVelX;
      rootPivot.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rootPivot.rotation.x));

      // 3. Smooth Tab Subsystem Weight Transitions
      const currentTab = activeTabRef.current;
      groups.forEach((g) => {
        const targetWeight = g.id === currentTab ? 1.0 : 0.0;
        g.weight += (targetWeight - g.weight) * 0.085;

        const isAct = g.weight > 0.005;
        g.group.visible = isAct;

        if (isAct) {
          const s = THREE.MathUtils.lerp(0.75, 1.0, g.weight);
          g.group.scale.set(s, s, s);
        }
      });

      // 4. Subsystem Internal Micro-Animations
      if (!prefersReducedMotion) {
        // Overview BI Animations
        coreGlassMesh.rotation.y += 0.008;
        coreGlassMesh.rotation.x += 0.004;
        const pulse = 1.0 + Math.sin(elapsed * 2.5) * 0.08;
        coreInnerMesh.scale.set(pulse, pulse, pulse);
        shellMesh.rotation.y -= 0.003;
        gyroRing1.rotation.z += 0.007;
        gyroRing2.rotation.z -= 0.005;
        ovParticles.rotation.y += 0.0015;

        // Growth Orbit Animations
        growthCoreMesh.rotation.y -= 0.006;
        retainedPoints.rotation.z += 0.004;
        inflowPoints.rotation.y += 0.005;
        churnPoints.rotation.y -= 0.002;

        // Revenue Flow Core Animations
        revCoreMesh.rotation.y += 0.01;
        revCoreMesh.rotation.z = Math.sin(elapsed * 1.5) * 0.15;
        revWireMesh.rotation.y -= 0.008;
        revRing1.rotation.z += 0.006;
        revRing2.rotation.y += 0.005;

        // Flow particles through revenue tubes
        [streamSub, streamAd, streamCreator].forEach((stream, idx) => {
          const posAttr = stream.pGeo.attributes.position;
          const posArray = posAttr.array as Float32Array;
          const pCount = posArray.length / 3;
          for (let i = 0; i < pCount; i++) {
            const speed = 0.25 + idx * 0.05;
            const progress = (elapsed * speed + i / pCount) % 1.0;
            const p = stream.curve.getPoint(1.0 - progress); // flow into core
            posArray[i * 3] = p.x;
            posArray[i * 3 + 1] = p.y;
            posArray[i * 3 + 2] = p.z;
          }
          posAttr.needsUpdate = true;
        });

        // Audience Galaxy Animations
        audCoreMesh.rotation.y += 0.005;
        groupAudience.children.forEach((child, i) => {
          if (child instanceof THREE.Points) {
            child.rotation.y += 0.001 * (i % 2 === 0 ? 1 : -1);
          }
        });
      }

      // 5. Node Highlight & Raycasting
      raycaster.setFromCamera(mouse, camera);
      const activeGroupObj = groups.find((g) => g.id === currentTab)?.group;
      const candidates = interactiveNodes.filter((n) => n.parent && n.parent.parent === activeGroupObj);

      const intersects = raycaster.intersectObjects(candidates, false);

      const externalHighlightId = highlightedKpiIdRef.current;

      // Reset previous hovered node scale
      if (hoveredNodeMesh && (!intersects.length || intersects[0].object !== hoveredNodeMesh)) {
        hoveredNodeMesh.scale.set(1.0, 1.0, 1.0);
        hoveredNodeMesh = null;
        container.style.cursor = isDragging ? "grabbing" : "grab";
        setTooltip((prev) => ({ ...prev, visible: false }));
        if (onNodeHighlight) onNodeHighlight(null);
      }

      // Check external highlight from page hover
      candidates.forEach((node) => {
        const uData = node.userData as NodeUserData;
        if (uData.kpiId === externalHighlightId) {
          const s = 1.35 + Math.sin(elapsed * 6) * 0.1;
          node.scale.set(s, s, s);
        } else if (node !== hoveredNodeMesh) {
          node.scale.set(1.0, 1.0, 1.0);
        }
      });

      // Handle intersection
      if (intersects.length > 0) {
        const hit = intersects[0];
        const hitMesh = hit.object as THREE.Mesh;
        const uData = hitMesh.userData as NodeUserData;

        hoveredNodeMesh = hitMesh;
        hitMesh.scale.set(1.3, 1.3, 1.3);
        container.style.cursor = "pointer";

        // Convert 3D position to 2D screen coordinates for tooltip
        const worldPos = new THREE.Vector3();
        hitMesh.getWorldPosition(worldPos);
        worldPos.project(camera);

        const screenX = ((worldPos.x + 1) / 2) * width;
        const screenY = ((-worldPos.y + 1) / 2) * height;

        // Find live value from currentKpisRef
        const matchingKpi = currentKpisRef.current.find((k) => k.id === uData.kpiId);
        const liveValue = matchingKpi ? matchingKpi.value : uData.value;
        const liveBadge = matchingKpi ? matchingKpi.badge : uData.badge;

        setTooltip({
          visible: true,
          x: screenX,
          y: screenY,
          title: uData.title,
          value: liveValue,
          badge: liveBadge,
          color: uData.color,
        });

        if (onNodeHighlight) {
          onNodeHighlight(uData.kpiId);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // =========================================================================
    // CLEANUP & RESOURCE DISPOSAL
    // =========================================================================
    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("click", onClick);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose geometries & materials
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
          if (obj.geometry) obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[440px] sm:h-[500px] rounded-3xl overflow-hidden glass-panel border border-white/10 flex items-center justify-center shadow-2xl group select-none">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Dynamic Sub-system Header Badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/75 border border-white/10 backdrop-blur-md shadow-lg pointer-events-none">
        <span
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: tabMetadata.color, boxShadow: `0 0 10px ${tabMetadata.color}` }}
        />
        <div className="flex items-center gap-1.5 text-[11px] font-mono tracking-wider font-semibold">
          <span className="text-white">{tabMetadata.title}</span>
          <span className="text-white/40">·</span>
          <span style={{ color: tabMetadata.color }}>{tabMetadata.subtitle}</span>
        </div>
      </div>

      {/* Interactive Controls & Hint Badge */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-white/10 text-[10px] font-mono text-white/50 backdrop-blur-md pointer-events-none">
          <Sparkles size={11} className="text-[#00f0ff]" />
          <span>Drag to rotate · Scroll to zoom · Hover nodes</span>
        </div>
        {resetCameraRef.current && (
          <button
            onClick={() => resetCameraRef.current?.()}
            title="Reset Perspective"
            className="p-1.5 rounded-full bg-black/60 border border-white/10 text-white/60 hover:text-white hover:border-white/30 backdrop-blur-md transition-colors"
          >
            <RotateCcw size={13} />
          </button>
        )}
      </div>

      {/* Dynamic Floating 3D Node Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-[135%] transition-all duration-75"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
        >
          <div className="px-3.5 py-2 rounded-2xl bg-black/90 border border-white/20 backdrop-blur-xl shadow-2xl flex flex-col gap-0.5 min-w-[130px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/60 font-semibold">
                {tooltip.title}
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: tooltip.color }}
              />
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-heading text-lg font-black text-white">
                {tooltip.value}
              </span>
              <span
                className="text-[10px] font-mono font-bold"
                style={{ color: tooltip.color }}
              >
                {tooltip.badge}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
