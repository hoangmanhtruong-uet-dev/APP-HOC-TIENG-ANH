
"use client";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface RoadmapNode {
  id: string;
  phase: number;
  title: string;
  subtitle: string;
  score: string;
  status: "completed" | "active" | "upcoming" | "locked";
  pos: [number, number, number];
  color: number;
}

const NODES: RoadmapNode[] = [
  { id: "p1-1", phase: 1, title: "500 Từ vựng đời sống cốt lõi", subtitle: "Đã hoàn thành • Đạt điểm tuyệt đối", score: "95/100", status: "completed", pos: [-14, 0.5, 4], color: 0x10b981 },
  { id: "p1-2", phase: 1, title: "Ngữ pháp cơ bản & Phát âm IPA", subtitle: "Đã hoàn thành bài kiểm tra cuối chặng", score: "88/100", status: "completed", pos: [-9.5, 1.2, 0.5], color: 0x10b981 },
  { id: "p1-m", phase: 1, title: "Milestone Test 1: Nền tảng tổng hợp", subtitle: "Trạng thái: Đạt chứng nhận (Passed)", score: "90/100đ", status: "completed", pos: [-5, 1.8, -2.5], color: 0x34d399 },
  { id: "p2-1", phase: 2, title: "Unit 1: Ngữ pháp nền tảng Speaking Part 1", subtitle: "Hoàn thành", score: "100%", status: "completed", pos: [-1, 2.2, 2], color: 0x38bdf8 },
  { id: "p2-2", phase: 2, title: "Unit 2: Quá khứ đơn & Kỹ thuật Paraphrase", subtitle: "Listening Part 2 - Bản đồ & Chỉ đường", score: "Đang học (50%)", status: "active", pos: [3, 3.0, -1], color: 0x6366f1 },
  { id: "p2-3", phase: 2, title: "Unit 3: Reading Skimming & Scanning chuyên sâu", subtitle: "Sắp mở", score: "Sắp mở", status: "upcoming", pos: [7, 2.6, 2.5], color: 0x64748b },
  { id: "p3-1", phase: 3, title: "Advanced Writing Task 2 – Cấu trúc lập luận", subtitle: "Yêu cầu hoàn thành Phase 2 để mở khóa", score: "Đã khóa", status: "locked", pos: [11, 3.6, -2], color: 0x7c3aed },
  { id: "p3-2", phase: 3, title: "Speaking Reflex & Idioms nâng cao", subtitle: "Yêu cầu hoàn thành Phase 2 để mở khóa", score: "Đã khóa", status: "locked", pos: [14.5, 4.2, 1.5], color: 0x7c3aed },
  { id: "p3-b", phase: 3, title: "Boss Test: Full Mock Exam mô phỏng máy tính", subtitle: "Chứng nhận hoàn thành toàn bộ lộ trình 6.5", score: "Locked", status: "locked", pos: [18, 5.0, -1], color: 0xf59e0b },
];

export default function RoadmapTree3D({ pacingMinutes = 35 }: { pacingMinutes?: number }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<RoadmapNode>(NODES[4]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070910, 0.02);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 200);
    camera.position.set(3, 12, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(3, 2.5, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const light = new THREE.DirectionalLight(0x818cf8, 1.5);
    light.position.set(10, 20, 15);
    scene.add(light);

    const curve = new THREE.CatmullRomCurve3(NODES.map((n) => new THREE.Vector3(...n.pos)));
    const tubeMesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 100, 0.12, 12, false),
      new THREE.MeshStandardMaterial({ color: 0x4f46e5, emissive: 0x3730a3, emissiveIntensity: 0.6 })
    );
    scene.add(tubeMesh);

    const meshes: THREE.Mesh[] = [];
    NODES.forEach((node) => {
      const geo = node.status === "active" ? new THREE.SphereGeometry(0.85, 32, 32) : new THREE.SphereGeometry(0.65, 24, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: node.color,
        emissive: node.color,
        emissiveIntensity: node.status === "active" ? 0.85 : 0.35,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...node.pos);
      mesh.userData = { node };
      scene.add(mesh);
      meshes.push(mesh);
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const handlePointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(meshes);
      if (hits.length > 0) {
        setSelected(hits[0].object.userData.node);
      }
    };
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.dispose();
      container.innerHTML = "";
    };
  }, [pacingMinutes]);

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-indigo-500/30 bg-[#070910]">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-[#121521]/90 backdrop-blur border border-indigo-500/30 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-indigo-400">PHASE {selected.phase} • {selected.score}</span>
          <h3 className="text-base font-bold text-white">{selected.title}</h3>
          <p className="text-xs text-slate-400">{selected.subtitle}</p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">
          {selected.status === "active" ? "Học tiếp →" : "Xem chi tiết"}
        </button>
      </div>
    </div>
  );
}
