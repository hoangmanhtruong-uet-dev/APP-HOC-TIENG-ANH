"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export interface SkillItem {
  id: string;
  name: string;
  scrollLabel?: string;
  band: number;
  progress: number;
  status: string;
  barColor: string;
  badgeClass: string;
  statusClass: string;
}

interface SkillRadar3DProps {
  skills: SkillItem[];
  selectedSkillId: string;
  onSelectSkill: (id: string) => void;
  onSimulateBoost?: () => void;
}

export function SkillRadar3D({
  skills,
  selectedSkillId,
  onSelectSkill,
  onSimulateBoost,
}: SkillRadar3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGLSupported, setWebGLSupported] = useState(true);
  const [isBoosted, setIsBoosted] = useState(false);

  useEffect(() => {
    // Check WebGL availability
    const checkWebGL = () => {
      try {
        const canvas = document.createElement("canvas");
        return !!(
          window.WebGLRenderingContext &&
          (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
        );
      } catch {
        return false;
      }
    };

    if (!checkWebGL()) {
      setWebGLSupported(false);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 270;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 0, 11);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.innerHTML = "";
      container.appendChild(renderer.domElement);
    } catch {
      setWebGLSupported(false);
      return;
    }

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dirLight = new THREE.DirectionalLight(0x818cf8, 1.5);
    dirLight.position.set(5, 5, 8);
    scene.add(dirLight);

    // Group for radar crystal rotation
    const radarGroup = new THREE.Group();
    scene.add(radarGroup);

    // Concentric Reference Hexagons (Bands 4, 6, 8)
    [2.0, 3.4, 4.5].forEach((radius) => {
      const hexPts: THREE.Vector3[] = [];
      for (let i = 0; i <= 6; i++) {
        const ang = (i * Math.PI) / 3;
        hexPts.push(new THREE.Vector3(Math.cos(ang) * radius, Math.sin(ang) * radius, 0));
      }
      const hexGeo = new THREE.BufferGeometry().setFromPoints(hexPts);
      const hexMat = new THREE.LineBasicMaterial({
        color: 0x2e3250,
        transparent: true,
        opacity: 0.6,
      });
      radarGroup.add(new THREE.Line(hexGeo, hexMat));
    });

    // Outer Axis Spokes
    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI) / 3;
      const spokeGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(Math.cos(ang) * 4.6, Math.sin(ang) * 4.6, 0),
      ]);
      const spokeMat = new THREE.LineBasicMaterial({
        color: 0x282c44,
        transparent: true,
        opacity: 0.5,
      });
      radarGroup.add(new THREE.Line(spokeGeo, spokeMat));
    }

    // Skill Radar Polygon
    const count = 6;
    const vertexPositions: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const s = skills[i] || skills[0];
      const effectiveBand =
        isBoosted && (s.id === "writing" || s.id === "speaking")
          ? s.band + 0.8
          : s.band;
      const r = (effectiveBand / 9.0) * 4.4;
      const ang = (i * Math.PI) / 3;
      vertexPositions.push(new THREE.Vector3(Math.cos(ang) * r, Math.sin(ang) * r, 0.2));
    }

    // Front Mesh + Wireframe
    const shape = new THREE.Shape();
    shape.moveTo(vertexPositions[0].x, vertexPositions[0].y);
    for (let i = 1; i < count; i++) {
      shape.lineTo(vertexPositions[i].x, vertexPositions[i].y);
    }
    shape.closePath();

    const shapeGeo = new THREE.ShapeGeometry(shape);
    const shapeMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const radarMesh = new THREE.Mesh(shapeGeo, shapeMat);
    radarGroup.add(radarMesh);

    // Perimeter line
    const perimPts = [...vertexPositions, vertexPositions[0]];
    const perimGeo = new THREE.BufferGeometry().setFromPoints(perimPts);
    const perimMat = new THREE.LineBasicMaterial({ color: 0x818cf8, linewidth: 2 });
    radarGroup.add(new THREE.Line(perimGeo, perimMat));

    // Corner Orbs
    vertexPositions.forEach((pos, idx) => {
      const orbGeo = new THREE.SphereGeometry(0.2, 16, 16);
      const orbMat = new THREE.MeshBasicMaterial({ color: 0x5ee0a0 });
      const orbMesh = new THREE.Mesh(orbGeo, orbMat);
      orbMesh.position.copy(pos);
      radarGroup.add(orbMesh);
    });

    const onResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    // Animation Loop
    let frameId: number;
    const clock = new THREE.Clock();
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      // Gentle sway
      radarGroup.rotation.y = Math.sin(t * 0.5) * 0.12;
      radarGroup.rotation.x = Math.cos(t * 0.4) * 0.08;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [skills, isBoosted]);

  const handleBoostClick = () => {
    setIsBoosted((prev) => !prev);
    onSimulateBoost?.();
  };

  return (
    <div className="rounded-2xl bg-[#141621] border border-[#232637] p-5 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-extrabold text-white">Cân bằng kỹ năng</h3>
        <span className="text-[11px] text-gray-400">Radar phân bổ năng lực 3D</span>
      </div>

      {/* 3D Radar Stage or 2D SVG Fallback */}
      <div className="relative w-full h-[270px] rounded-xl bg-[#0e1018] border border-[#1f2233] overflow-hidden mb-4">
        {webGLSupported ? (
          <div
            ref={mountRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            data-testid="radar-3d-canvas"
          />
        ) : (
          /* SVG Fallback */
          <div className="w-full h-full flex items-center justify-center p-4">
            <svg className="w-48 h-48 overflow-visible" viewBox="-100 -100 200 200">
              <polygon
                points={skills
                  .map((s, idx) => {
                    const ang = (idx * Math.PI) / 3;
                    const r = (s.band / 9.0) * 80;
                    return `${Math.cos(ang) * r},${Math.sin(ang) * r}`;
                  })
                  .join(" ")}
                fill="rgba(99, 102, 241, 0.3)"
                stroke="#6366f1"
                strokeWidth="2"
              />
            </svg>
          </div>
        )}

        <button
          onClick={handleBoostClick}
          className="absolute bottom-2.5 right-2.5 z-30 px-2.5 py-1 rounded-lg bg-indigo-600/25 hover:bg-indigo-600/40 border border-indigo-500/40 text-[10px] font-bold text-indigo-300 flex items-center gap-1 transition"
          aria-label="Mô phỏng tối ưu Band"
        >
          <span>✨ {isBoosted ? "Đang bật tối ưu" : "Mô phỏng tối ưu Band"}</span>
        </button>
      </div>

      {/* 6 Skill Pills Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {skills.map((s) => {
          const isSelected = s.id === selectedSkillId;
          const label = s.scrollLabel || s.name;
          return (
            <button
              key={s.id}
              onClick={() => onSelectSkill(s.id)}
              className={`px-3.5 py-2.5 rounded-xl bg-[#191c2a] hover:bg-[#22263a] border flex items-center justify-between cursor-pointer transition text-left ${
                isSelected ? "border-indigo-500 ring-1 ring-indigo-500/40" : "border-[#232637]"
              }`}
            >
              <span className="text-xs text-gray-400 font-medium">{label}:</span>
              <span className="text-xs font-extrabold text-white">
                {s.band.toFixed(1)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
