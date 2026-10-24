"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface RoadmapNode {
  id: string;
  phase: number;
  phaseTitle: string;
  title: string;
  subtitle: string;
  score: string;
  status: "completed" | "active" | "upcoming" | "locked";
  pos: [number, number, number];
  color: number;
  targetHref: string;
}

export const ROADMAP_NODES: RoadmapNode[] = [
  {
    id: "p1-1",
    phase: 1,
    phaseTitle: "Phase 1: Nền tảng cơ bản",
    title: "500 Từ vựng đời sống cốt lõi",
    subtitle: "Đã hoàn thành • Đạt điểm tuyệt đối",
    score: "95/100",
    status: "completed",
    pos: [-14, 0.5, 4],
    color: 0x10b981,
    targetHref: "/learn/vocabulary",
  },
  {
    id: "p1-2",
    phase: 1,
    phaseTitle: "Phase 1: Nền tảng cơ bản",
    title: "Ngữ pháp cơ bản & Phát âm IPA",
    subtitle: "Đã hoàn thành bài kiểm tra cuối chặng",
    score: "88/100",
    status: "completed",
    pos: [-9.5, 1.2, 0.5],
    color: 0x10b981,
    targetHref: "/learn/grammar",
  },
  {
    id: "p1-m",
    phase: 1,
    phaseTitle: "Phase 1: Nền tảng cơ bản",
    title: "Milestone Test 1: Nền tảng tổng hợp",
    subtitle: "Trạng thái: Đạt chứng nhận (Passed)",
    score: "90/100đ",
    status: "completed",
    pos: [-5, 1.8, -2.5],
    color: 0x34d399,
    targetHref: "/mock-tests",
  },
  {
    id: "p2-1",
    phase: 2,
    phaseTitle: "Phase 2: Pre-IELTS chiến thuật",
    title: "Unit 1: Ngữ pháp nền tảng Speaking Part 1",
    subtitle: "Hoàn thành",
    score: "100%",
    status: "completed",
    pos: [-1, 2.2, 2],
    color: 0x38bdf8,
    targetHref: "/practice/speaking",
  },
  {
    id: "p2-2",
    phase: 2,
    phaseTitle: "Phase 2: Pre-IELTS chiến thuật",
    title: "Unit 2: Quá khứ đơn & Kỹ thuật Paraphrase",
    subtitle: "Listening Part 2 - Bản đồ & Chỉ đường trong phòng thi thực chiến.",
    score: "Đang học (50%)",
    status: "active",
    pos: [3, 3.0, -1],
    color: 0x6366f1,
    targetHref: "/learn",
  },
  {
    id: "p2-3",
    phase: 2,
    phaseTitle: "Phase 2: Pre-IELTS chiến thuật",
    title: "Unit 3: Reading Skimming & Scanning chuyên sâu",
    subtitle: "Sắp mở",
    score: "Sắp mở",
    status: "upcoming",
    pos: [7, 2.6, 2.5],
    color: 0x64748b,
    targetHref: "/practice/reading",
  },
  {
    id: "p3-1",
    phase: 3,
    phaseTitle: "Phase 3: Bứt phá band điểm",
    title: "Advanced Writing Task 2 – Cấu trúc lập luận",
    subtitle: "Yêu cầu hoàn thành Phase 2 để mở khóa",
    score: "Đã khóa",
    status: "locked",
    pos: [11, 3.6, -2],
    color: 0x7c3aed,
    targetHref: "/practice/writing",
  },
  {
    id: "p3-2",
    phase: 3,
    phaseTitle: "Phase 3: Bứt phá band điểm",
    title: "Speaking Reflex & Idioms nâng cao",
    subtitle: "Yêu cầu hoàn thành Phase 2 để mở khóa",
    score: "Đã khóa",
    status: "locked",
    pos: [14.5, 4.2, 1.5],
    color: 0x7c3aed,
    targetHref: "/practice/speaking",
  },
  {
    id: "p3-b",
    phase: 3,
    phaseTitle: "Phase 3: Bứt phá band điểm",
    title: "Boss Test: Full Mock Exam mô phỏng máy tính",
    subtitle: "Chứng nhận hoàn thành toàn bộ lộ trình 6.5",
    score: "Locked",
    status: "locked",
    pos: [18, 5.0, -1],
    color: 0xf59e0b,
    targetHref: "/mock-tests",
  },
];

interface RoadmapTree3DProps {
  pacingMinutes?: number;
  onSelectNode?: (node: RoadmapNode) => void;
  onContinueLesson?: (node: RoadmapNode) => void;
  onTestOut?: () => void;
}

export function RoadmapTree3D({
  pacingMinutes = 35,
  onSelectNode,
  onContinueLesson,
  onTestOut,
}: RoadmapTree3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<RoadmapNode>(ROADMAP_NODES[4]); // Unit 2 Active
  const [autoRotate, setAutoRotate] = useState(false);
  const [webGLSupported, setWebGLSupported] = useState(true);

  // References to controls for animated camera updates
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const handleNodeClick = useCallback(
    (node: RoadmapNode) => {
      setSelected(node);
      onSelectNode?.(node);
    },
    [onSelectNode]
  );

  const focusPhase = useCallback((phaseNumber: number) => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) return;

    if (phaseNumber === 0) {
      // Wide panoramic view
      camera.position.set(3, 14, 22);
      controls.target.set(3, 2.5, 0);
    } else if (phaseNumber === 1) {
      camera.position.set(-9.5, 6, 8);
      controls.target.set(-9.5, 1.2, 0.5);
    } else if (phaseNumber === 2) {
      camera.position.set(3, 6, 8);
      controls.target.set(3, 3, -1);
    } else if (phaseNumber === 3) {
      camera.position.set(14.5, 8, 10);
      controls.target.set(14.5, 4.2, 1.5);
    }
    controls.update();
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

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 640;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070910, 0.02);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    camera.position.set(3, 13, 19);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);
    } catch {
      setWebGLSupported(false);
      return;
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(3, 2.5, 0);
    controlsRef.current = controls;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const mainLight = new THREE.DirectionalLight(0x818cf8, 1.6);
    mainLight.position.set(10, 20, 15);
    scene.add(mainLight);

    const accentLight = new THREE.PointLight(0x6366f1, 2, 50);
    accentLight.position.set(3, 6, -1);
    scene.add(accentLight);

    // 3D Tube connecting nodes
    const curve = new THREE.CatmullRomCurve3(
      ROADMAP_NODES.map((n) => new THREE.Vector3(...n.pos))
    );
    const tubeGeo = new THREE.TubeGeometry(curve, 100, 0.14, 12, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x4f46e5,
      emissive: 0x3730a3,
      emissiveIntensity: 0.7,
      roughness: 0.3,
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(tubeMesh);

    // Node Spheres
    const nodeMeshes: THREE.Mesh[] = [];
    ROADMAP_NODES.forEach((node) => {
      const radius = node.status === "active" ? 0.9 : 0.65;
      const geo = new THREE.SphereGeometry(radius, 28, 28);
      const mat = new THREE.MeshStandardMaterial({
        color: node.color,
        emissive: node.color,
        emissiveIntensity: node.status === "active" ? 0.9 : 0.4,
        roughness: 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...node.pos);
      mesh.userData = { node };
      scene.add(mesh);
      nodeMeshes.push(mesh);
    });

    // Pointer Raycasting for Node selection
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(nodeMeshes);
      if (hits.length > 0) {
        const hitNode = hits[0].object.userData.node as RoadmapNode;
        handleNodeClick(hitNode);
      }
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);

    // Handle container resize
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener("resize", handleResize);

    // Animation loop
    let frameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Flow pulse on active node based on pacingMinutes
      const speedMultiplier = Math.max(1, pacingMinutes / 35);
      accentLight.intensity = 1.8 + Math.sin(clock.getElapsedTime() * 3 * speedMultiplier) * 0.6;

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.dispose();
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [pacingMinutes, handleNodeClick]);

  // Update autoRotate when state changes
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
      controlsRef.current.autoRotateSpeed = 1.2;
    }
  }, [autoRotate]);

  return (
    <div className="relative w-full h-[640px] rounded-2xl overflow-hidden border border-indigo-500/30 bg-[#070910] shadow-2xl">
      {/* Top Floating HUD Controls */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          <button
            onClick={() => focusPhase(0)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 text-white border border-white/10 backdrop-blur transition"
            aria-label="Toàn cảnh lộ trình"
          >
            🌌 Toàn cảnh
          </button>
          <button
            onClick={() => focusPhase(1)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-500/30 backdrop-blur transition"
            aria-label="Xem Phase 1"
          >
            ✓ Phase 1 (A1-A2)
          </button>
          <button
            onClick={() => focusPhase(2)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-950/90 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 backdrop-blur transition"
            aria-label="Xem Phase 2"
          >
            🎯 Phase 2 (Đang học 40%)
          </button>
          <button
            onClick={() => focusPhase(3)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-950/80 hover:bg-purple-900/80 text-purple-300 border border-purple-500/30 backdrop-blur transition"
            aria-label="Xem Phase 3"
          >
            🔒 Phase 3 (5.5-6.5)
          </button>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setAutoRotate((prev) => !prev)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900/85 text-slate-300 border border-white/10 hover:text-white transition"
            aria-label="Bật tắt tự xoay"
          >
            🔄 Tự xoay: {autoRotate ? "Bật" : "Tắt"}
          </button>
        </div>
      </div>

      {/* Three.js Canvas Mount OR Fallback */}
      {webGLSupported ? (
        <div ref={mountRef} className="w-full h-full" data-testid="three-canvas-container" />
      ) : (
        /* Fallback 2D Map for Non-WebGL/Test environments */
        <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#070910] text-center">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
            Interactive Roadmap Graph
          </p>
          <div className="grid grid-cols-3 gap-3 w-full max-w-lg mb-6">
            {ROADMAP_NODES.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNodeClick(n)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selected.id === n.id
                    ? "bg-indigo-600/30 border-indigo-400 text-white"
                    : "bg-[#121521] border-white/10 text-slate-300 hover:border-indigo-500/50"
                }`}
              >
                <span className="text-[10px] block opacity-70">Phase {n.phase}</span>
                <span className="text-xs font-bold truncate block">{n.title}</span>
                <span className="text-[10px] text-emerald-400 block mt-1">{n.score}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Selected Node Inspector Overlay */}
      <div
        id="node-inspector"
        className="absolute bottom-4 left-4 right-4 z-20 glass-card rounded-xl p-4 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
            {selected.status === "completed" ? (
              <span className="text-2xl text-emerald-400">✓</span>
            ) : selected.status === "active" ? (
              <span className="text-2xl text-indigo-400">🎯</span>
            ) : selected.status === "locked" ? (
              <span className="text-2xl text-slate-400">🔒</span>
            ) : (
              <span className="text-2xl text-slate-300">○</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PHASE {selected.phase} • {selected.status.toUpperCase()}
              </span>
              <span className="text-xs font-semibold text-emerald-400">
                {selected.score}
              </span>
            </div>
            <h3 className="text-base font-bold text-white">{selected.title}</h3>
            <p className="text-xs text-slate-400">{selected.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
          <button
            onClick={() => onContinueLesson?.(selected)}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition"
            aria-label={`Học tiếp ${selected.title}`}
          >
            {selected.status === "active"
              ? "Học tiếp: Unit 2 →"
              : selected.status === "completed"
              ? "↻ Xem lại bài học"
              : selected.status === "locked"
              ? "Lộ trình đã khóa"
              : "Xem trước"}
          </button>
          <button
            onClick={() => onTestOut?.()}
            className="px-3 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition"
            aria-label="Làm bài vượt cấp Test-out"
          >
            ⚡ Test-out
          </button>
        </div>
      </div>
    </div>
  );
}
