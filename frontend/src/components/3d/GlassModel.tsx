import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { useJob } from "@/store/job-context";

export const GlassModel: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const { currentTheme } = useJob();
  const themeColorRef = useRef(currentTheme.palette.accent);

  useEffect(() => {
    themeColorRef.current = currentTheme.palette.accent;
  }, [currentTheme]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // Geometry - Icosahedron for futuristic glass diamond shape
    const outerGeo = new THREE.IcosahedronGeometry(1.8, 1);
    
    // Glass Material
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#ffffff"),
      metalness: 0.1,
      roughness: 0.15,
      transmission: 0.9, // glass transparency & refraction
      thickness: 1.2,
      ior: 1.5,
      transparent: true,
      opacity: 0.85,
      wireframe: false,
    });

    const glassMesh = new THREE.Mesh(outerGeo, glassMat);
    scene.add(glassMesh);

    // Inner glowing core
    const coreGeo = new THREE.OctahedronGeometry(0.8, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(themeColorRef.current),
      emissive: new THREE.Color(themeColorRef.current),
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0.8,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Floating particles around the 3D glass model
    const particleCount = 60;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 8;
      positions[i + 1] = (Math.random() - 0.5) * 8;
      positions[i + 2] = (Math.random() - 0.5) * 8;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.05,
      color: new THREE.Color(themeColorRef.current),
      transparent: true,
      opacity: 0.6,
    });
    const particlePoints = new THREE.Points(particleGeo, particleMat);
    scene.add(particlePoints);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xffffff, 3, 50);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(new THREE.Color(themeColorRef.current), 4, 30);
    pointLight2.position.set(-5, -5, 2);
    scene.add(pointLight2);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / container.clientWidth - 0.5) * 2;
      mouseY = -((e.clientY - rect.top) / container.clientHeight - 0.5) * 2;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Animation Loop
    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);

      // Smooth mouse tilt
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      // Rotation
      glassMesh.rotation.y += 0.005 + targetX * 0.02;
      glassMesh.rotation.x += 0.003 + targetY * 0.02;
      coreMesh.rotation.y -= 0.01;
      coreMesh.rotation.z += 0.008;
      particlePoints.rotation.y += 0.001;

      // Update theme color dynamically
      const accentColor = new THREE.Color(themeColorRef.current);
      coreMat.color.lerp(accentColor, 0.05);
      coreMat.emissive.lerp(accentColor, 0.05);
      particleMat.color.lerp(accentColor, 0.05);
      pointLight2.color.lerp(accentColor, 0.05);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(reqId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      outerGeo.dispose();
      glassMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[400px] sm:h-[480px] rounded-3xl overflow-hidden glass-panel border border-white/10 flex items-center justify-center shadow-2xl">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-[11px] font-mono text-white/70 backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
        Interactive 3D Glass Model · Move Cursor to Rotate
      </div>
    </div>
  );
};
