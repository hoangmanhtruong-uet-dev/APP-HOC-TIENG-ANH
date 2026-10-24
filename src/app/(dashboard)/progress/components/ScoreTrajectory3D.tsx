"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

export interface TrajectoryWeek {
  id: number;
  label: string;
  band: number;
  hours: string;
  note: string;
}

interface ScoreTrajectory3DProps {
  weeks: TrajectoryWeek[];
  selectedWeekIndex: number;
  onSelectWeek: (index: number) => void;
}

export function ScoreTrajectory3D({
  weeks,
  selectedWeekIndex,
  onSelectWeek,
}: ScoreTrajectory3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGLSupported, setWebGLSupported] = useState(true);
  const [is3DView, setIs3DView] = useState(true);

  // Drag rotation state
  const camState = useRef({
    theta: 0.18,
    phi: 1.18,
    radius: 17.5,
    isDragging: false,
    prevMouse: { x: 0, y: 0 },
    downMouse: { x: 0, y: 0 },
  });

  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const toggleCameraView = useCallback(() => {
    setIs3DView((prev) => {
      const next = !prev;
      if (camState.current) {
        if (!next) {
          // 2D front view
          camState.current.theta = 0;
          camState.current.phi = Math.PI / 2;
        } else {
          // 3D perspective
          camState.current.theta = 0.22;
          camState.current.phi = 1.18;
        }
      }
      return next;
    });
  }, []);

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

    const width = container.clientWidth || 700;
    const height = container.clientHeight || 350;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    cameraRef.current = camera;

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
    scene.add(new THREE.AmbientLight(0x94a3b8, 0.9));
    const dirLight = new THREE.DirectionalLight(0x818cf8, 1.6);
    dirLight.position.set(8, 16, 12);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x6366f1, 2.5, 25);
    pointLight.position.set(4, 5, 4);
    scene.add(pointLight);

    // Floor Grid
    const grid = new THREE.GridHelper(24, 24, 0x2e3250, 0x171929);
    grid.position.y = -2.2;
    scene.add(grid);

    // Build Spline Curve & Orbs
    const count = weeks.length;
    const points: THREE.Vector3[] = weeks.map((w, idx) => {
      const x = (idx - (count - 1) / 2) * 2.8;
      const y = (w.band - 5.0) * 2.2 - 1.2;
      return new THREE.Vector3(x, y, 0);
    });

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.1, 12, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      emissive: 0x4338ca,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(tubeMesh);

    // Orbs for week nodes
    const orbs: THREE.Mesh[] = [];
    points.forEach((pt, idx) => {
      const isSelected = idx === selectedWeekIndex;
      const geo = new THREE.SphereGeometry(isSelected ? 0.65 : 0.5, 24, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0x818cf8 : 0x6366f1,
        emissive: isSelected ? 0xa5b4fc : 0x4f46e5,
        emissiveIntensity: isSelected ? 1.0 : 0.5,
        roughness: 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pt);
      mesh.userData = { index: idx };
      scene.add(mesh);
      orbs.push(mesh);
    });

    // Pointer Interaction (Raycasting & Orbit rotation)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      camState.current.isDragging = true;
      camState.current.prevMouse = { x: e.clientX, y: e.clientY };
      camState.current.downMouse = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!camState.current.isDragging) return;
      const dx = e.clientX - camState.current.prevMouse.x;
      const dy = e.clientY - camState.current.prevMouse.y;
      camState.current.prevMouse = { x: e.clientX, y: e.clientY };

      camState.current.theta -= dx * 0.007;
      camState.current.phi = Math.max(
        0.65,
        Math.min(1.48, camState.current.phi - dy * 0.006)
      );
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!camState.current.isDragging) return;
      camState.current.isDragging = false;
      const dist = Math.hypot(
        e.clientX - camState.current.downMouse.x,
        e.clientY - camState.current.downMouse.y
      );
      if (dist < 6) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(orbs);
        if (hits.length > 0) {
          const hitIdx = hits[0].object.userData.index;
          onSelectWeek(hitIdx);
        }
      }
    };

    const canvasEl = renderer.domElement;
    canvasEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

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
    const animate = () => {
      frameId = requestAnimationFrame(animate);

      // Camera positioning from spherical coordinates
      const r = camState.current.radius;
      const t = camState.current.theta;
      const p = camState.current.phi;

      camera.position.x = r * Math.sin(p) * Math.sin(t);
      camera.position.y = r * Math.cos(p) + 1.2;
      camera.position.z = r * Math.sin(p) * Math.cos(t);
      camera.lookAt(0, 1.2, 0);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      canvasEl.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.dispose();
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [weeks, selectedWeekIndex, onSelectWeek]);

  const activeWeek = weeks[selectedWeekIndex] || weeks[weeks.length - 1];

  return (
    <div className="rounded-2xl bg-[#141621] border border-[#232637] p-5 sm:p-6 shadow-xl">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-white">
            Xu hướng điểm số qua các tuần
          </h2>
          <p className="text-xs text-gray-400">
            Mô phỏng sự tăng trưởng Band điểm tổng kết (Kéo chuột để xoay góc nhìn 3D)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-200">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" />
            <span>Band Dự phóng</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
            <span>Mục tiêu (7.5)</span>
          </div>
          <button
            onClick={toggleCameraView}
            className="px-2.5 py-1 rounded-lg bg-[#1d2030] hover:bg-indigo-600/30 border border-indigo-500/30 text-[11px] font-bold text-indigo-300 flex items-center gap-1.5 transition"
            aria-label="Chuyển góc nhìn 3D hoặc 2D"
          >
            <span>Góc nhìn: {is3DView ? "3D" : "2D"}</span>
          </button>
        </div>
      </div>

      {/* 3D Stage / 2D SVG Fallback */}
      <div className="relative w-full h-[330px] sm:h-[360px] rounded-xl bg-[#0e1018] border border-[#1f2233] overflow-hidden">
        {/* Dashed Target 7.5 line */}
        <div className="absolute top-12 left-8 right-8 border-t-2 border-dashed border-gray-500/45 pointer-events-none z-10 flex justify-end">
          <span className="-mt-5 px-2 py-0.5 rounded bg-[#141621]/90 text-[10px] font-bold text-gray-400 border border-white/10">
            Target Band 7.5
          </span>
        </div>

        {webGLSupported ? (
          <div
            ref={mountRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            data-testid="trajectory-3d-canvas"
          />
        ) : (
          /* SVG Interactive 2D Graph Fallback */
          <div className="w-full h-full p-6 flex flex-col justify-end">
            <svg className="w-full h-48 overflow-visible" viewBox="0 0 600 200">
              <polyline
                fill="none"
                stroke="#6366f1"
                strokeWidth="4"
                points={weeks
                  .map((w, idx) => {
                    const x = 50 + idx * 100;
                    const y = 180 - (w.band - 5.0) * 60;
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />
              {weeks.map((w, idx) => {
                const x = 50 + idx * 100;
                const y = 180 - (w.band - 5.0) * 60;
                const isSelected = idx === selectedWeekIndex;
                return (
                  <circle
                    key={w.id}
                    cx={x}
                    cy={y}
                    r={isSelected ? 9 : 6}
                    fill={isSelected ? "#818cf8" : "#6366f1"}
                    stroke="#fff"
                    strokeWidth={isSelected ? 3 : 1}
                    className="cursor-pointer"
                    onClick={() => onSelectWeek(idx)}
                  />
                );
              })}
            </svg>
          </div>
        )}

        {/* Selected Week Mini HUD Pill */}
        <div className="absolute top-3 left-3 z-20 glass-panel px-3.5 py-2 rounded-xl flex items-center gap-3 pointer-events-none">
          <div className="w-2.5 h-8 rounded-full bg-indigo-500" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-white">
                {activeWeek.label}
              </span>
              <span className="px-2 py-0.5 rounded bg-indigo-600 text-[11px] font-black text-white">
                Band {activeWeek.band.toFixed(1)}
              </span>
            </div>
            <p className="text-[11px] text-gray-300">{activeWeek.note}</p>
          </div>
        </div>
      </div>

      {/* Week Selector Footer Bar */}
      <div className="grid grid-cols-6 gap-2 mt-3 pt-2 border-t border-[#232637]/60 text-center">
        {weeks.map((w, idx) => {
          const isSelected = idx === selectedWeekIndex;
          return (
            <button
              key={w.id}
              onClick={() => onSelectWeek(idx)}
              className={`p-2 rounded-xl border text-center transition-all ${
                isSelected
                  ? "bg-indigo-600/30 border-indigo-500 text-white shadow-md shadow-indigo-600/20"
                  : "bg-[#191c2a] border-transparent text-gray-400 hover:text-white hover:border-[#232637]"
              }`}
            >
              <span className="text-[11px] block font-semibold">{w.label}</span>
              <span className="text-xs font-black block text-indigo-400">
                Band {w.band.toFixed(1)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
