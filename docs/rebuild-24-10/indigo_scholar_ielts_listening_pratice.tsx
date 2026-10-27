import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import {
  Headphones, Mic, Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX,
  Sparkles, Flame, Calendar, Bell, Search, Filter, ArrowRight, CheckCircle2,
  Zap, Globe2, Award, Clock, BookOpen, Sliders, ChevronDown, ChevronUp,
  Layers, Activity, Target, ShieldAlert, Eye, EyeOff, RefreshCw, X,
  Maximize2, Minimize2, Radio, Compass, FileText, Map, Users, HelpCircle,
  Bookmark, Share2, BarChart3, Check, AlertTriangle, CornerDownLeft, FastForward
} from 'lucide-react';

// ==========================================
// DỮ LIỆU MẪU (MOCK DATA) CHUẨN IELTS
// ==========================================
const EXERCISES_DATA = [
  {
    id: 'ex-1',
    title: 'Community Library Visit',
    subtitle: 'Listen to an original library conversation and announcement, then answer 8 questions.',
    badge: 'VERIFIED',
    badgeColor: 'from-blue-500/20 to-indigo-500/20 text-blue-300 border-blue-500/30',
    accent: 'UK Accent',
    accentFlag: '🇬🇧',
    band: '5.5 - 6.5',
    bandGroup: 'Band 4.5 - 6.5',
    duration: '1m 48s',
    durationSec: 108,
    questionsCount: 8,
    category: 'IELTS Practice',
    section: 'Section 1',
    isSpeedRun: true,
    completed: false,
    paraphraseTraps: 5,
    sampleSentence: 'The community library requires a valid residential proof before issuing a permanent borrowing card.',
    transcript: [
      { time: 0, text: 'Good morning, Westside Community Library. How can I help you today?' },
      { time: 18, text: 'I just moved to the neighborhood and would like to inquire about library membership.' },
      { time: 42, text: 'Certainly! Our standard membership is completely free for all local residents.' },
      { time: 68, text: 'However, the community library requires a valid residential proof before issuing a permanent borrowing card.' },
      { time: 92, text: 'You can also register for our digital archive which grants access to over ten thousand audiobooks.' }
    ],
    vocab: [
      { word: 'Residential proof', meaning: 'Giấy xác nhận cư trú', ipa: '/ˌrez.ɪˈden.ʃəl pruːf/' },
      { word: 'Permanent borrowing card', meaning: 'Thẻ mượn sách cố định', ipa: '/ˈpɜː.mə.nənt ˈbɒr.əʊ.ɪŋ kɑːd/' },
      { word: 'Digital archive', meaning: 'Kho lưu trữ kỹ thuật số', ipa: '/ˈdɪdʒ.ɪ.təl ˈɑː.kaɪv/' }
    ],
    questions: [
      { id: 1, q: 'Standard library membership costs ______ for local residents.', answer: 'nothing', hint: 'Paraphrase của "completely free"' },
      { id: 2, q: 'Applicants must bring a valid ______ to get a permanent card.', answer: 'residential proof', hint: 'Nghe kỹ cụm danh từ sau động từ requires' },
      { id: 3, q: 'The digital archive provides access to more than ______ audiobooks.', answer: '10000', hint: 'ten thousand = 10000' }
    ]
  },
  {
    id: 'ex-2',
    title: 'Community Library Visit & Membership',
    subtitle: 'Đăng ký thẻ thư viện và hỏi giờ mở cửa, quy định mượn sách chuyên sâu.',
    badge: 'HOT',
    badgeColor: 'from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/40',
    accent: 'UK Accent',
    accentFlag: '🇬🇧',
    band: '5.5 - 6.5',
    bandGroup: 'Band 4.5 - 6.5',
    duration: '3m 05s',
    durationSec: 185,
    questionsCount: 10,
    category: 'Daily Conversations',
    section: 'Section 1',
    isSpeedRun: false,
    completed: true,
    paraphraseTraps: 7,
    sampleSentence: 'Late returns will incur a nominal fine of fifty pence per day excluding weekends.',
    transcript: [
      { time: 0, text: 'Welcome back to the main desk. Let us go over the borrowing regulations together.' },
      { time: 35, text: 'Adult members are permitted to borrow up to twelve items simultaneously for three weeks.' },
      { time: 75, text: 'Late returns will incur a nominal fine of fifty pence per day excluding weekends.' },
      { time: 120, text: 'If you wish to reserve a high-demand textbook, please use the self-service kiosk near the entrance.' }
    ],
    vocab: [
      { word: 'Incur a nominal fine', meaning: 'Chịu một khoản phạt nhỏ', ipa: '/ɪnˈkɜːr ə ˈnɒm.ɪ.nəl faɪn/' },
      { word: 'Simultaneously', meaning: 'Cùng một lúc', ipa: '/ˌsɪm.əlˈteɪ.ni.əs.li/' }
    ],
    questions: [
      { id: 1, q: 'Maximum number of books borrowed at one time: ______ items.', answer: '12', hint: 'twelve items simultaneously' },
      { id: 2, q: 'Overdue fine is 50 pence per day, not counting ______.', answer: 'weekends', hint: 'excluding = not counting' }
    ]
  },
  {
    id: 'ex-3',
    title: 'University Accommodation Services',
    subtitle: 'Sinh viên năm nhất trao đổi về việc thuê ký túc xá và homestay ngoại ô.',
    badge: 'BAND 6.5+',
    badgeColor: 'from-cyan-500/20 to-teal-500/20 text-cyan-300 border-cyan-500/30',
    accent: 'AUS Accent',
    accentFlag: '🇦🇺',
    band: '6.0 - 7.0',
    bandGroup: 'Band 6.5 - 7.5',
    duration: '4m 00s',
    durationSec: 240,
    questionsCount: 10,
    category: 'Campus Life',
    section: 'Section 1',
    isSpeedRun: false,
    completed: false,
    paraphraseTraps: 8,
    sampleSentence: 'Students opting for suburban homestays generally report higher satisfaction with culinary arrangements.',
    transcript: [
      { time: 0, text: 'G’day! Looking to sort out your on-campus or off-campus housing for the upcoming semester?' },
      { time: 50, text: 'The northern dormitory was recently refurbished, though rent has gone up slightly.' },
      { time: 110, text: 'Students opting for suburban homestays generally report higher satisfaction with culinary arrangements.' }
    ],
    vocab: [
      { word: 'Refurbished', meaning: 'Được tân trang lại', ipa: '/ˌriːˈfɜː.bɪʃt/' },
      { word: 'Culinary arrangements', meaning: 'Sắp xếp bữa ăn / ẩm thực', ipa: '/ˈkʌl.ɪ.nər.i əˈreɪndʒ.mənts/' }
    ],
    questions: [
      { id: 1, q: 'The northern dormitory has recently been ______.', answer: 'refurbished', hint: 'Chú ý âm đuôi -ed' },
      { id: 2, q: 'Homestay students are usually happier with the ______ arrangements.', answer: 'culinary', hint: 'Từ học thuật chỉ food/meals' }
    ]
  },
  {
    id: 'ex-4',
    title: 'Tidal & Wave Energy Research Lecture',
    subtitle: 'Bài giảng học thuật về công nghệ khai thác năng lượng thủy triều ngoài khơi Scotland.',
    badge: 'BAND 7.5+',
    badgeColor: 'from-violet-500/20 to-purple-500/20 text-violet-300 border-violet-500/40',
    accent: 'UK Accent',
    accentFlag: '🇬🇧',
    band: '7.0 - 8.5',
    bandGroup: 'Band 7.5 - 9.0',
    duration: '5m 20s',
    durationSec: 320,
    questionsCount: 10,
    category: 'Academic Lectures',
    section: 'Section 4',
    isSpeedRun: false,
    completed: false,
    paraphraseTraps: 12,
    sampleSentence: 'Unlike solar photovoltaics, tidal turbines operate with remarkable predictability regardless of meteorological fluctuations.',
    transcript: [
      { time: 0, text: 'In today’s marine engineering seminar, we examine sub-surface tidal turbines off the Scottish coast.' },
      { time: 65, text: 'Unlike solar photovoltaics, tidal turbines operate with remarkable predictability regardless of meteorological fluctuations.' },
      { time: 140, text: 'Nevertheless, bio-fouling on rotor blades remains a formidable maintenance bottleneck.' }
    ],
    vocab: [
      { word: 'Meteorological fluctuations', meaning: 'Biến động thời tiết', ipa: '/ˌmiː.ti.ər.əˈlɒdʒ.ɪ.kəl ˌflʌk.tʃuˈeɪ.ʃənz/' },
      { word: 'Maintenance bottleneck', meaning: 'Điểm nghẽn trong bảo trì', ipa: '/ˈmeɪn.tən.əns ˈbɒt.əl.nek/' }
    ],
    questions: [
      { id: 1, q: 'Tidal turbines function predictably despite weather or ______ changes.', answer: 'meteorological', hint: 'Đồng nghĩa với weather' },
      { id: 2, q: 'Marine organism buildup on ______ blades causes maintenance issues.', answer: 'rotor', hint: 'Danh từ đứng trước blades' }
    ]
  },
  {
    id: 'ex-5',
    title: 'City Council: Public Cycling Route Scheme',
    subtitle: 'Thảo luận quy hoạch đường đạp xe đô thị, trắc nghiệm và gắn nhãn bản đồ Section 2.',
    badge: 'MAP / DIAGRAM',
    badgeColor: 'from-emerald-500/20 to-green-500/20 text-emerald-300 border-emerald-500/40',
    accent: 'US Accent',
    accentFlag: '🇺🇸',
    band: '6.0 - 7.5',
    bandGroup: 'Band 6.5 - 7.5',
    duration: '3m 30s',
    durationSec: 210,
    questionsCount: 10,
    category: 'Maps & Plans',
    section: 'Section 2',
    isSpeedRun: true,
    completed: false,
    paraphraseTraps: 9,
    sampleSentence: 'Directly adjacent to the pedestrian overpass, a solar-powered bike docking station will be erected.',
    transcript: [
      { time: 0, text: 'Thank you all for attending the municipality briefing on the new green corridor.' },
      { time: 55, text: 'Directly adjacent to the pedestrian overpass, a solar-powered bike docking station will be erected.' },
      { time: 120, text: 'Heading northeast past the botanical conservatory, cyclists will have a segregated two-way lane.' }
    ],
    vocab: [
      { word: 'Directly adjacent to', meaning: 'Ngay sát cạnh', ipa: '/daɪˈrekt.li əˈdʒeɪ.sənt tuː/' },
      { word: 'Pedestrian overpass', meaning: 'Cầu vượt bộ hành', ipa: '/pəˈdes.tri.ən ˈəʊ.və.pɑːs/' }
    ],
    questions: [
      { id: 1, q: 'The bike docking station will be built right next to the pedestrian ______.', answer: 'overpass', hint: 'adjacent to = right next to' },
      { id: 2, q: 'A separated two-way lane runs northeast past the botanical ______.', answer: 'conservatory', hint: 'Nghe kỹ danh từ sau botanical' }
    ]
  },
  {
    id: 'ex-6',
    title: 'Global Coffee Farming & Fair Trade',
    subtitle: 'Tác động kinh tế của phong trào thương mại công bằng đối với nông dân trồng cà phê.',
    badge: 'SECTION 4',
    badgeColor: 'from-fuchsia-500/20 to-pink-500/20 text-fuchsia-300 border-fuchsia-500/40',
    accent: 'US Accent',
    accentFlag: '🇺🇸',
    band: '7.5 - 9.0',
    bandGroup: 'Band 7.5 - 9.0',
    duration: '4m 50s',
    durationSec: 290,
    questionsCount: 10,
    category: 'Academic Lectures',
    section: 'Section 4',
    isSpeedRun: false,
    completed: false,
    paraphraseTraps: 11,
    sampleSentence: 'Smallholder cooperatives leverage collective bargaining to insulate farmers from volatile commodity markets.',
    transcript: [
      { time: 0, text: 'Coffee is one of the most heavily traded agricultural commodities on the planet.' },
      { time: 70, text: 'Smallholder cooperatives leverage collective bargaining to insulate farmers from volatile commodity markets.' }
    ],
    vocab: [
      { word: 'Collective bargaining', meaning: 'Thương lượng tập thể', ipa: '/kəˈlek.tɪv ˈbɑː.ɡɪ.nɪŋ/' },
      { word: 'Volatile markets', meaning: 'Thị trường biến động mạnh', ipa: '/ˈvɒl.ə.taɪl ˈmɑː.kɪts/' }
    ],
    questions: [
      { id: 1, q: 'Cooperatives protect farmers from unstable ______ markets.', answer: 'commodity', hint: 'volatile = unstable' }
    ]
  },
  {
    id: 'ex-7',
    title: 'Airport Lost Property Hotline',
    subtitle: 'Báo mất hành lý tại sân bay Sydney: màu sắc vali, thương hiệu, giấy tờ bên trong.',
    badge: 'STARTER',
    badgeColor: 'from-slate-500/20 to-zinc-500/20 text-slate-300 border-slate-500/40',
    accent: 'AUS Accent',
    accentFlag: '🇦🇺',
    band: '4.5 - 5.5',
    bandGroup: 'Band 4.5 - 6.5',
    duration: '2m 30s',
    durationSec: 150,
    questionsCount: 6,
    category: 'Daily Conversations',
    section: 'Section 1',
    isSpeedRun: true,
    completed: true,
    paraphraseTraps: 4,
    sampleSentence: 'The hardshell suitcase has a distinctive metallic strap and two scratched spinner wheels.',
    transcript: [
      { time: 0, text: 'Sydney Kingsford Smith Airport Baggages Desk, speaking. What is your reference number?' },
      { time: 45, text: 'The hardshell suitcase has a distinctive metallic strap and two scratched spinner wheels.' }
    ],
    vocab: [
      { word: 'Distinctive', meaning: 'Dễ phân biệt, đặc trưng', ipa: '/dɪˈstɪŋk.tɪv/' }
    ],
    questions: [
      { id: 1, q: 'The suitcase features a unique ______ strap.', answer: 'metallic', hint: 'distinctive = unique' }
    ]
  }
];

const TOPIC_TRACKS = [
  {
    id: 'track-1',
    title: 'Daily Conversations',
    subtitle: 'Hội thoại đời sống (Section 1)',
    exercisesCount: 14,
    progress: 85,
    status: 'ĐANG HỌC',
    icon: Users,
    accentColor: 'indigo',
    skills: ['Spelling & Numbers', 'Dates & Postcodes', 'Form Completion']
  },
  {
    id: 'track-2',
    title: 'Campus & Student Services',
    subtitle: 'Môi trường học thuật (Section 2)',
    exercisesCount: 12,
    progress: 60,
    status: 'ĐANG HỌC',
    icon: Compass,
    accentColor: 'violet',
    skills: ['Multiple Choice', 'Short Answer', 'Matching Information']
  },
  {
    id: 'track-3',
    title: 'Academic Group Discussions',
    subtitle: 'Thảo luận đề tài (Section 3)',
    exercisesCount: 10,
    progress: 40,
    status: 'ĐANG HỌC',
    icon: Radio,
    accentColor: 'cyan',
    skills: ['Speaker Attitude', 'Agreement/Disagreement', 'Distractor Traps']
  },
  {
    id: 'track-4',
    title: 'Academic Lectures',
    subtitle: 'Bài giảng học thuật (Section 4)',
    exercisesCount: 16,
    progress: 25,
    status: 'ĐANG HỌC',
    icon: BookOpen,
    accentColor: 'purple',
    skills: ['Signposting Words', 'Summary Completion', 'Academic Paraphrase']
  },
  {
    id: 'track-5',
    title: 'Maps & Diagram Labeling',
    subtitle: 'Định hướng không gian (Section 2)',
    exercisesCount: 9,
    progress: 50,
    status: 'ĐANG HỌC',
    icon: Map,
    accentColor: 'amber',
    skills: ['Prepositions of Place', 'Compass Directions', 'Landmarks']
  },
  {
    id: 'track-6',
    title: 'Form & Table Completion',
    subtitle: 'Điền thông tin cá nhân (Section 1)',
    exercisesCount: 10,
    progress: 100,
    status: 'THÀNH THẠO',
    icon: FileText,
    accentColor: 'emerald',
    skills: ['Word Limit Control', 'Singular vs Plural (-s)', 'Unit Measurements']
  }
];

const DICTATION_SENTENCES = [
  {
    id: 'd1',
    text: 'The metropolitan council has allocated substantial funding for sustainable public transport.',
    accent: '🇬🇧 UK Accent',
    lang: 'en-GB',
    band: 'Band 7.5',
    traps: ['allocated (-ed âm đuôi)', 'substantial (trọng âm 2)', 'sustainable (nối âm)']
  },
  {
    id: 'd2',
    text: 'Applicants are required to submit two certified copies of their academic transcripts by Friday.',
    accent: '🇺🇸 US Accent',
    lang: 'en-US',
    band: 'Band 6.5',
    traps: ['Applicants (-s số nhiều)', 'certified (-ed)', 'transcripts (-s âm cuối)']
  },
  {
    id: 'd3',
    text: 'Archaeological excavations revealed several prehistoric settlements along the southern coastline.',
    accent: '🇦🇺 AUS Accent',
    lang: 'en-AU',
    band: 'Band 8.5',
    traps: ['Archaeological (chính tả khó)', 'excavations (-s)', 'settlements (-s)']
  }
];

const PARAPHRASE_PAIRS = [
  { id: 'p1', audio: 'prohibitively expensive', question: 'too costly to afford', explanation: 'Cấu trúc "prohibitively + adj" diễn tả mức độ đắt đỏ vượt khả năng chi trả.' },
  { id: 'p2', audio: 'a decade and a half ago', question: 'fifteen years back', explanation: '1 decade (10 năm) + a half (5 năm) = 15 năm.' },
  { id: 'p3', audio: 'initially met with skepticism', question: 'doubted at first', explanation: '"initially" = "at first", "skepticism" (sự hoài nghi) = "doubted".' },
  { id: 'p4', audio: 'mandatory orientation session', question: 'compulsory introductory meeting', explanation: '"mandatory" = "compulsory" (bắt buộc), "orientation" = "introductory".' }
];

// ==========================================
// COMPONENT THREE.JS 3D SONIC VISUALIZER
// ==========================================
const ThreeSonicVisualizer = ({ isPlaying, visualMode, playbackSpeed, ambientNoise }) => {
  const mountRef = useRef(null);
  const stateRef = useRef({ isPlaying, visualMode, playbackSpeed, ambientNoise });

  useEffect(() => {
    stateRef.current = { isPlaying, visualMode, playbackSpeed, ambientNoise };
  }, [isPlaying, visualMode, playbackSpeed, ambientNoise]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Group chính chứa các vật thể 3D
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 1. Lõi Sonic Sphere (Icosahedron wireframe phát sáng)
    const coreGeo = new THREE.IcosahedronGeometry(1.45, 4);
    const originalPositions = coreGeo.attributes.position.array.slice();
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    mainGroup.add(coreMesh);

    // 2. Lớp hạt Particle bao quanh (Sonic Nodes)
    const particlesCount = 900;
    const posArray = new Float32Array(particlesCount * 3);
    const colorArray = new Float32Array(particlesCount * 3);

    const color1 = new THREE.Color(0x6366f1); // Indigo
    const color2 = new THREE.Color(0x06b6d4); // Cyan
    const color3 = new THREE.Color(0xa855f7); // Purple

    for (let i = 0; i < particlesCount; i++) {
      // Phân bố trên mặt cầu & vành đai
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 1.65 + Math.random() * 1.4;

      posArray[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      posArray[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      posArray[i * 3 + 2] = radius * Math.cos(phi);

      const mixed = i % 3 === 0 ? color1 : i % 3 === 1 ? color2 : color3;
      colorArray[i * 3] = mixed.r;
      colorArray[i * 3 + 1] = mixed.g;
      colorArray[i * 3 + 2] = mixed.b;
    }

    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    const particlesMat = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particlesGeo, particlesMat);
    mainGroup.add(particleSystem);

    // 3. Vòng Orbital Frequency Rings
    const ringGeo1 = new THREE.TorusGeometry(2.2, 0.012, 16, 120);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.35
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2.3;
    mainGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(2.65, 0.008, 16, 120);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.25
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI / 3;
    ring2.rotation.x = Math.PI / 4;
    mainGroup.add(ring2);

    // Tương tác chuột (Mouse Parallax)
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Xử lý Resize
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const { isPlaying: playing, visualMode: mode, playbackSpeed: speed, ambientNoise: noise } = stateRef.current;

      const activeMultiplier = playing ? 1.8 * speed : 0.35;
      const pulseAmplitude = playing ? 0.22 + (noise !== 'off' ? 0.08 : 0) : 0.04;

      // Biến dạng bề mặt quả cầu theo sóng âm
      const positions = coreGeo.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        const ox = originalPositions[i];
        const oy = originalPositions[i + 1];
        const oz = originalPositions[i + 2];

        let wave = 0;
        if (mode === 'wave') {
          wave = Math.sin(ox * 3.5 + elapsedTime * 4 * activeMultiplier) *
                 Math.cos(oy * 3.5 + elapsedTime * 3 * activeMultiplier) * pulseAmplitude;
        } else if (mode === 'matrix') {
          wave = Math.sin((ox + oy + oz) * 5 + elapsedTime * 6 * activeMultiplier) * (pulseAmplitude * 1.2);
        } else {
          // Sonic Sphere mặc định
          wave = Math.sin(ox * 2.5 + elapsedTime * 3 * activeMultiplier) *
                 Math.sin(oy * 2.5 + elapsedTime * 2.5 * activeMultiplier) *
                 Math.sin(oz * 2.5 + elapsedTime * 2 * activeMultiplier) * (pulseAmplitude * 1.4);
        }

        const scale = 1 + wave;
        positions[i] = ox * scale;
        positions[i + 1] = oy * scale;
        positions[i + 2] = oz * scale;
      }
      coreGeo.attributes.position.needsUpdate = true;

      // Đổi màu sắc theo chế độ
      if (mode === 'wave') {
        coreMat.color.setHex(playing ? 0x06b6d4 : 0x38bdf8);
      } else if (mode === 'matrix') {
        coreMat.color.setHex(playing ? 0x10b981 : 0x34d399);
      } else {
        coreMat.color.setHex(playing ? 0x818cf8 : 0x6366f1);
      }

      // Xoay vật thể mượt mà
      coreMesh.rotation.y += 0.004 * activeMultiplier;
      coreMesh.rotation.x += 0.002 * activeMultiplier;
      particleSystem.rotation.y -= 0.0025 * activeMultiplier;
      ring1.rotation.z += 0.006 * activeMultiplier;
      ring2.rotation.z -= 0.004 * activeMultiplier;

      // Nhịp thở của vòng ring khi nhạc chạy
      const ringScale = playing ? 1 + Math.sin(elapsedTime * 6) * 0.05 : 1;
      ring1.scale.set(ringScale, ringScale, ringScale);

      // Parallax theo chuột
      mainGroup.rotation.y += (mouseX * 0.35 - mainGroup.rotation.y) * 0.05;
      mainGroup.rotation.x += (-mouseY * 0.25 - mainGroup.rotation.x) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      coreGeo.dispose();
      coreMat.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full min-h-[280px] cursor-grab active:cursor-grabbing" />;
};

// ==========================================
// COMPONENT CHÍNH: APP
// ==========================================
export default function App() {
  // --- States cho Audio Player & Three.js ---
  const [currentTrack, setCurrentTrack] = useState(EXERCISES_DATA[1]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(75); // Giây hiện tại (1:15 như ảnh gốc)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [ambientNoise, setAmbientNoise] = useState('off'); // 'off' | 'cafe' | 'exam' | 'street'
  const [visualMode, setVisualMode] = useState('sphere'); // 'sphere' | 'wave' | 'matrix'
  const [isDockMinimized, setIsDockMinimized] = useState(false);
  const [abLoop, setAbLoop] = useState(false);

  // --- States cho Bộ lọc & Tìm kiếm Kho Bài Tập ---
  const [selectedBandHeader, setSelectedBandHeader] = useState('IELTS BAND 7.5 - 8.5 • ADVANCED');
  const [showBandDropdown, setShowBandDropdown] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyUncompleted, setOnlyUncompleted] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState(['ex-2', 'ex-4']);
  const [vocabPopoverId, setVocabPopoverId] = useState(null);

  // --- States cho Trạm Phản Xạ Âm Thanh Tức Thì (Live Mini-Lab) ---
  const [activeLabTab, setActiveLabTab] = useState('dictation'); // 'dictation' | 'paraphrase' | 'accent'
  const [dictationIdx, setDictationIdx] = useState(0);
  const [userDictationInput, setUserDictationInput] = useState('');
  const [showDictationAnswer, setShowDictationAnswer] = useState(false);
  const [selectedParaphraseId, setSelectedParaphraseId] = useState('p1');

  // --- States cho Bento Speed Run Card ---
  const [bentoSpeedPreview, setBentoSpeedPreview] = useState(1.25);
  const [bentoAccentPreview, setBentoAccentPreview] = useState('UK');

  // --- States cho Modal / Drawer Làm Bài Thực Chiến ---
  const [activePracticeModal, setActivePracticeModal] = useState(null); // Lưu exercise object khi bấm "Làm bài"
  const [modalAnswers, setModalAnswers] = useState({});
  const [modalSubmitted, setModalSubmitted] = useState(false);
  const [showTranscriptInModal, setShowTranscriptInModal] = useState(true);

  // Web Speech API Synthesis để phát giọng đọc thật khi bấm Nghe thử / Dictation
  const speakText = (text, lang = 'en-GB', rate = 1.0) => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      // Fallback im lặng nếu trình duyệt chặn
    }
  };

  // Bộ đếm thời gian khi Audio đang Play
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= currentTrack.durationSec) {
          if (abLoop) return 0;
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 1000 / playbackSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, currentTrack, playbackSpeed, abLoop]);

  // Định dạng giây -> m:ss
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Tìm câu transcript đang đọc ở thời điểm hiện tại
  const currentTranscriptLine = useMemo(() => {
    if (!currentTrack?.transcript) return '';
    const lines = currentTrack.transcript;
    let activeLine = lines[0]?.text || '';
    for (let i = 0; i < lines.length; i++) {
      if (currentTime >= lines[i].time) {
        activeLine = lines[i].text;
      }
    }
    return activeLine;
  }, [currentTrack, currentTime]);

  // Xử lý bấm "Nghe thử" trên bài tập
  const handlePreviewExercise = (exercise) => {
    if (currentTrack.id === exercise.id && isPlaying) {
      setIsPlaying(false);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    } else {
      setCurrentTrack(exercise);
      setCurrentTime(0);
      setIsPlaying(true);
      setIsDockMinimized(false);
      const lang = exercise.accent.includes('US')
        ? 'en-US'
        : exercise.accent.includes('AUS')
        ? 'en-AU'
        : 'en-GB';
      speakText(exercise.sampleSentence, lang, playbackSpeed);
    }
  };

  // Xử lý mở Modal Làm Bài
  const handleOpenPracticeModal = (exercise) => {
    setActivePracticeModal(exercise);
    setModalAnswers({});
    setModalSubmitted(false);
    setCurrentTrack(exercise);
    setCurrentTime(0);
    setIsPlaying(true);
    const lang = exercise.accent.includes('US')
      ? 'en-US'
      : exercise.accent.includes('AUS')
      ? 'en-AU'
      : 'en-GB';
    speakText(exercise.sampleSentence, lang, playbackSpeed);
  };

  // Lọc danh sách bài tập
  const filteredExercises = useMemo(() => {
    return EXERCISES_DATA.filter((ex) => {
      if (onlyUncompleted && ex.completed) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchTitle = ex.title.toLowerCase().includes(q);
        const matchSub = ex.subtitle.toLowerCase().includes(q);
        const matchCat = ex.category.toLowerCase().includes(q);
        if (!matchTitle && !matchSub && !matchCat) return false;
      }
      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'UK') return ex.accent.includes('UK');
      if (activeFilter === 'US') return ex.accent.includes('US');
      if (activeFilter === 'AUS') return ex.accent.includes('AUS');
      if (activeFilter === 'SPEED') return ex.isSpeedRun;
      if (activeFilter === 'BAND_LOW') return ex.bandGroup === 'Band 4.5 - 6.5';
      if (activeFilter === 'BAND_MID') return ex.bandGroup === 'Band 6.5 - 7.5';
      if (activeFilter === 'BAND_HIGH') return ex.bandGroup === 'Band 7.5 - 9.0';
      return true;
    });
  }, [activeFilter, searchQuery, onlyUncompleted]);

  // So khớp Diff từ ngữ thời gian thực cho Mini-Lab Chép Chính Tả
  const currentDictation = DICTATION_SENTENCES[dictationIdx];
  const dictationWordDiff = useMemo(() => {
    const targetWords = currentDictation.text.split(' ');
    const typedWords = userDictationInput.trim().split(/\s+/).filter(Boolean);

    return targetWords.map((tWord, index) => {
      const cleanTarget = tWord.replace(/[.,?!]/g, '').toLowerCase();
      const typed = typedWords[index] ? typedWords[index].replace(/[.,?!]/g, '').toLowerCase() : '';

      if (!typed) return { word: tWord, status: 'pending' };
      if (typed === cleanTarget) return { word: tWord, status: 'correct' };
      // Kiểm tra lỗi thiếu âm đuôi -s hoặc -ed phổ biến trong IELTS
      if (cleanTarget.startsWith(typed) && (cleanTarget.endsWith('s') || cleanTarget.endsWith('ed'))) {
        return { word: tWord, status: 'ending-missed', typed };
      }
      return { word: tWord, status: 'wrong', typed };
    });
  }, [currentDictation, userDictationInput]);

  const toggleBookmark = (id) => {
    setBookmarkedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-[#060714] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-36 relative overflow-x-hidden">
      {/* Hào quang nền Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[550px] h-[550px] bg-indigo-600/15 rounded-full blur-[130px]" />
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 w-[600px] h-[400px] bg-cyan-600/10 rounded-full blur-[150px]" />
        {/* Lưới Cyber Grid mờ */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }}
        />
      </div>

      {/* ==========================================
          1. THANH ĐIỀU HƯỚNG (TOP GLASS NAVBAR)
      ========================================== */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#060714]/80 border-b border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Links */}
          <div className="flex items-center gap-8">
            <a href="#top" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                IS
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                  Indigo Scholar
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    PRO
                  </span>
                </span>
              </div>
            </a>

            <nav className="hidden lg:flex items-center gap-1 text-sm font-medium text-slate-400">
              {['Home', 'Learn', 'Dictation', 'Plans', 'Roadmap', 'Progress', 'Pricing'].map((item) => {
                const isActive = item === 'Learn' || item === 'Dictation';
                return (
                  <button
                    key={item}
                    onClick={() => {
                      if (item === 'Dictation') {
                        document.getElementById('live-mini-lab')?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className={`px-3.5 py-2 rounded-lg transition-all relative ${
                      item === 'Learn'
                        ? 'text-white bg-white/[0.06] font-semibold'
                        : 'hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {item}
                    {item === 'Learn' && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Status Badges & User */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
              <span>5 Ngày Streak</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-medium">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Còn 323 ngày thi</span>
            </div>

            <button
              title="Thông báo nhắc học"
              className="p-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 relative transition"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#060714]" />
            </button>

            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 p-0.5 cursor-pointer hover:scale-105 transition">
              <div className="w-full h-full rounded-full bg-[#0B0E23] flex items-center justify-center font-bold text-sm text-indigo-200">
                H
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ==========================================
          MAIN CONTENT CONTAINER
      ========================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-10 relative z-10">
        {/* ==========================================
            2. HERO SECTION VỚI THREE.JS 3D AUDIO VISUALIZER
        ========================================== */}
        <section className="relative rounded-3xl overflow-hidden border border-white/[0.09] bg-gradient-to-br from-[#0D102D]/95 via-[#090B20]/95 to-[#121036]/95 shadow-2xl shadow-indigo-950/50">
          {/* Ánh sáng viền trên */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 lg:p-10 items-center relative">
            {/* Cột trái: Nội dung Hero & CTA (7 cols) */}
            <div className="lg:col-span-7 space-y-6 relative z-10">
              {/* Top Bar: Listening Center & Band Selector */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-bold tracking-wider uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 -ml-4" />
                  LISTENING TRAINING CENTER
                </div>

                {/* Band Dropdown Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowBandDropdown(!showBandDropdown)}
                    className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/30 text-indigo-200 text-xs font-semibold transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{selectedBandHeader}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  {showBandDropdown && (
                    <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-[#111536] border border-white/15 shadow-2xl p-1.5 z-50 backdrop-blur-xl">
                      {[
                        'IELTS BAND 4.5 - 6.0 • FOUNDATION',
                        'IELTS BAND 6.5 - 7.0 • INTERMEDIATE',
                        'IELTS BAND 7.5 - 8.5 • ADVANCED',
                        'IELTS BAND 8.5 - 9.0 • MASTER'
                      ].map((b) => (
                        <button
                          key={b}
                          onClick={() => {
                            setSelectedBandHeader(b);
                            setShowBandDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                            selectedBandHeader === b
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-300 hover:bg-white/[0.06]'
                          }`}
                        >
                          <span>{b}</span>
                          {selectedBandHeader === b && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-xs text-slate-400 hidden sm:inline">
                  Chào mừng trở lại, <strong className="text-white">Scholar H</strong> 👋
                </span>
              </div>

              {/* Tiêu đề chính */}
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15]">
                  Luyện Nghe IELTS Thực Chiến{' '}
                  <span className="block mt-1 bg-gradient-to-r from-indigo-400 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
                    Chuẩn Format & Phản Xạ Nhanh.
                  </span>
                </h1>
                <p className="text-slate-300/90 text-sm sm:text-base max-w-2xl leading-relaxed">
                  Luyện tập với âm thanh người bản ngữ đa quốc gia (<span className="text-indigo-300 font-medium">UK, US, AUS</span>), nhận diện <span className="text-cyan-300 font-medium">bẫy Paraphrase</span>, làm chủ âm đuôi <code className="px-1.5 py-0.5 rounded bg-white/10 text-amber-300 text-xs">-s / -ed</code> và bứt phá điểm số Listening.
                </p>
              </div>

              {/* Cụm Nút Hành Động (CTAs) */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={() => {
                    setActiveLabTab('dictation');
                    document.getElementById('live-mini-lab')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition"
                >
                  <Mic className="w-4 h-4 stroke-[2.5]" />
                  <span>Luyện Chép Chính Tả Ngay</span>
                </button>

                <button
                  onClick={() => {
                    document.getElementById('exercise-library')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/45 border border-indigo-400/40 text-white font-semibold text-sm backdrop-blur-md transition"
                >
                  <span>Khám phá kho bài tập</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(!isPlaying);
                    if (!isPlaying) {
                      speakText(currentTrack.sampleSentence, 'en-GB', playbackSpeed);
                    } else if ('speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                    }
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold transition ${
                    isPlaying
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-slate-300'
                  }`}
                >
                  <Radio className={`w-4 h-4 ${isPlaying ? 'animate-spin text-emerald-400' : 'text-indigo-400'}`} />
                  <span>{isPlaying ? 'Đang kích hoạt Sóng Âm 3D' : 'Kích hoạt Sóng Âm 3D'}</span>
                </button>
              </div>

              {/* Chỉ số Mini-Metrics dưới Hero */}
              <div className="grid grid-cols-3 gap-3 pt-2 max-w-xl">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    MỤC TIÊU NGÀY
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-black text-white">15</span>
                    <span className="text-xs text-slate-400">/ 90m</span>
                    <span className="ml-auto text-[11px] text-indigo-300 font-semibold">6 lượt bài</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-[68%] bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full" />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    ĐỘ CHÍNH XÁC
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-black text-emerald-400">78%</span>
                    <span className="text-[11px] text-emerald-300/80 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                      +6.4% tuần này
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-[78%] bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    ĐIỂM YẾU CẦN SỬA
                  </div>
                  <div className="mt-1">
                    <span className="text-xs font-bold text-amber-300 block truncate">
                      Map & Âm đuôi -s/-ed
                    </span>
                    <span className="text-[11px] text-slate-400">Độ chính xác: 62%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: Three.js 3D Interactive Sonic Sphere + Chẩn đoán Kỹ năng (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4 relative">
              <div className="relative rounded-2xl bg-[#07091B]/90 border border-indigo-500/25 overflow-hidden shadow-inner min-h-[300px] flex flex-col justify-between">
                {/* Header nhỏ trên khung 3D */}
                <div className="p-3.5 flex items-center justify-between border-b border-white/[0.06] relative z-10 bg-black/20 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <Activity className={`w-4 h-4 ${isPlaying ? 'text-cyan-400 animate-pulse' : 'text-indigo-400'}`} />
                    <span className="text-xs font-bold tracking-wide text-slate-200">
                      3D SONIC NEURAL ENGINE
                    </span>
                  </div>
                  {/* Chuyển đổi chế độ 3D */}
                  <div className="flex items-center gap-1 bg-white/[0.05] p-0.5 rounded-lg border border-white/10">
                    {[
                      { id: 'sphere', label: 'Orb' },
                      { id: 'wave', label: 'Wave' },
                      { id: 'matrix', label: 'Matrix' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setVisualMode(m.id)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                          visualMode === m.id
                            ? 'bg-indigo-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Canvas Three.js */}
                <div className="relative flex-1 flex items-center justify-center">
                  <ThreeSonicVisualizer
                    isPlaying={isPlaying}
                    visualMode={visualMode}
                    playbackSpeed={playbackSpeed}
                    ambientNoise={ambientNoise}
                  />

                  {/* Overlay thông tin tương tác góc dưới khung 3D */}
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between px-3 py-2 rounded-xl bg-[#0B0E23]/85 border border-white/10 backdrop-blur-md text-[11px]">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                        }`}
                      />
                      <span className="text-slate-300 font-medium truncate">
                        {isPlaying ? `Đang phát: ${currentTrack.title}` : 'Di chuột để xoay khối cầu 3D'}
                      </span>
                    </div>
                    <span className="text-indigo-300 font-mono font-bold ml-2 shrink-0">
                      {playbackSpeed}x • {currentTrack.accentFlag}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            3. TÍNH NĂNG MỚI: TRẠM PHẢN XẠ ÂM THANH TỨC THÌ (LIVE MINI-LAB)
        ========================================== */}
        <section
          id="live-mini-lab"
          className="rounded-3xl bg-gradient-to-b from-[#0E122E] to-[#090C20] border border-indigo-500/25 p-5 sm:p-7 shadow-xl"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    Trạm Phản Xạ Âm Thanh Tức Thì (Live Mini-Lab)
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Tương tác trực tiếp
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  Khởi động tai nghe chỉ trong 30 giây với kiểm tra Diff ký tự tức thì & nhận diện bẫy Paraphrase
                </p>
              </div>
            </div>

            {/* Tabs chuyển đổi */}
            <div className="flex items-center gap-1.5 bg-[#060818] p-1.5 rounded-2xl border border-white/[0.08] self-start">
              {[
                { id: 'dictation', label: '🎙️ Chép Chính Tả 1 Câu', icon: Mic },
                { id: 'paraphrase', label: '🧠 Bẫy Paraphrase', icon: Sparkles },
                { id: 'diagnostic', label: '📊 Radar Kỹ Năng', icon: BarChart3 }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveLabTab(t.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeLabTab === t.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nội dung Tab 1: Quick Dictation Challenge */}
          {activeLabTab === 'dictation' && (
            <div className="pt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                      Câu #{dictationIdx + 1}/{DICTATION_SENTENCES.length}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/[0.05] text-slate-300 text-xs font-medium">
                      {currentDictation.accent}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-semibold">
                      {currentDictation.band}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsPlaying(true);
                        speakText(currentDictation.text, currentDictation.lang, playbackSpeed);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Nghe câu mẫu ({playbackSpeed}x)</span>
                    </button>
                    <button
                      onClick={() => {
                        setDictationIdx((prev) => (prev + 1) % DICTATION_SENTENCES.length);
                        setUserDictationInput('');
                        setShowDictationAnswer(false);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 text-xs font-semibold transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Đổi câu</span>
                    </button>
                  </div>
                </div>

                {/* Ô gõ chính tả */}
                <div className="relative">
                  <textarea
                    rows={2}
                    value={userDictationInput}
                    onChange={(e) => setUserDictationInput(e.target.value)}
                    placeholder="Bấm 'Nghe câu mẫu' rồi gõ lại chính xác từng từ bạn nghe được vào đây (chú ý âm đuôi -s, -ed)..."
                    className="w-full rounded-2xl bg-[#060818] border border-indigo-500/30 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 p-4 text-sm text-white placeholder-slate-500 outline-none transition resize-none"
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>💡 Mẹo: Hệ thống tự động bắt lỗi thiếu âm đuôi (-s, -ed) theo thời gian thực.</span>
                    <button
                      onClick={() => setShowDictationAnswer(!showDictationAnswer)}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                    >
                      {showDictationAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showDictationAnswer ? 'Ẩn đáp án' : 'Hiện đáp án chuẩn'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Khung kết quả Diff thời gian thực */}
              <div className="lg:col-span-5 rounded-2xl bg-[#060818]/90 border border-white/[0.08] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    So khớp Diff Ký Tự Tức Thì
                  </span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-emerald-400">● Đúng</span>
                    <span className="text-amber-400">● Thiếu -s/-ed</span>
                    <span className="text-rose-400">● Sai</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-wrap gap-1.5 min-h-[72px] items-center">
                  {dictationWordDiff.map((item, idx) => {
                    if (item.status === 'correct') {
                      return (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold"
                        >
                          {item.word}
                        </span>
                      );
                    }
                    if (item.status === 'ending-missed') {
                      return (
                        <span
                          key={idx}
                          title="Bạn gõ thiếu âm đuôi -s hoặc -ed!"
                          className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold animate-pulse"
                        >
                          {item.typed}
                          <u className="text-amber-200 font-black">[-s/-ed?]</u>
                        </span>
                      );
                    }
                    if (item.status === 'wrong') {
                      return (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs line-through"
                        >
                          {item.typed}
                        </span>
                      );
                    }
                    return (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-white/[0.04] text-slate-500 text-xs font-mono"
                      >
                        {showDictationAnswer ? (
                          <span className="text-indigo-300">{item.word}</span>
                        ) : (
                          '•'.repeat(Math.min(item.word.length, 7))
                        )}
                      </span>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 mr-1">Bẫy âm thanh trong câu:</span>
                  {currentDictation.traps.map((trap, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                    >
                      {trap}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Nội dung Tab 2: Paraphrase Trap Matcher */}
          {activeLabTab === 'paraphrase' && (
            <div className="pt-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PARAPHRASE_PAIRS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedParaphraseId(p.id);
                      speakText(p.audio, 'en-GB', 1.0);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      selectedParaphraseId === p.id
                        ? 'bg-indigo-600/20 border-indigo-400 shadow-lg'
                        : 'bg-[#060818]/80 border-white/[0.07] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-indigo-300 font-bold mb-1">
                      <span>🎧 TRONG BĂNG NGHE</span>
                      <Volume2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-sm font-bold text-white">"{p.audio}"</div>
                    <div className="mt-2 pt-2 border-t border-white/[0.06] text-xs text-emerald-300 font-medium">
                      📝 Đề bài: "{p.question}"
                    </div>
                  </button>
                ))}
              </div>

              <div className="md:col-span-5 p-5 rounded-2xl bg-[#060818] border border-indigo-500/30 space-y-3">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Sparkles className="w-4 h-4" />
                  <span>GIẢI MÃ BẪY PARAPHRASE CAMBRIDGE</span>
                </div>
                {(() => {
                  const activePair =
                    PARAPHRASE_PAIRS.find((item) => item.id === selectedParaphraseId) || PARAPHRASE_PAIRS[0];
                  return (
                    <>
                      <p className="text-sm text-slate-200 leading-relaxed">{activePair.explanation}</p>
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-slate-400">
                        Hơn <strong className="text-white">75% câu hỏi Section 3 & 4</strong> không lặp lại từ nguyên gốc trong băng mà dùng cấu trúc đồng nghĩa như trên.
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Nội dung Tab 3: Radar Chẩn Đoán Kỹ Năng */}
          {activeLabTab === 'diagnostic' && (
            <div className="pt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Form & Note Completion', score: 91, status: 'Rất tốt', color: 'from-emerald-500 to-teal-400' },
                { label: 'Multiple Choice (Đa lựa chọn)', score: 82, status: 'Ổn định', color: 'from-indigo-500 to-blue-400' },
                { label: 'Connected Speech (Nối âm)', score: 70, status: 'Cần chú ý', color: 'from-violet-500 to-purple-400' },
                { label: 'Map & Diagram Labeling', score: 62, status: 'Điểm yếu cần ôn', color: 'from-amber-500 to-rose-500' }
              ].map((s, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#060818] border border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">{s.status}</span>
                    <span className="font-black text-white text-base">{s.score}%</span>
                  </div>
                  <div className="text-sm font-bold text-slate-100">{s.label}</div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${s.color} rounded-full`} style={{ width: `${s.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ==========================================
            4. BENTO GRID: 4 CHẾ ĐỘ LUYỆN NGHE CHUYÊN SÂU
        ========================================== */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sliders className="w-4 h-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                4 Chế Độ Luyện Nghe Chuyên Sâu
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Chọn phương pháp phù hợp với từng giai đoạn ôn luyện của bạn
            </p>
          </div>

          {/* Hàng trên: 3 Bento Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Card 1: Deep Dictation (5 cols) */}
            <div className="lg:col-span-5 group relative rounded-3xl bg-gradient-to-br from-[#101436] via-[#0B0E26] to-[#151136] border border-amber-500/25 hover:border-amber-400/50 p-6 flex flex-col justify-between transition-all duration-300 shadow-lg hover:shadow-amber-500/10 overflow-hidden">
              <Mic className="w-28 h-28 text-amber-500/[0.06] absolute -right-4 -top-2 group-hover:scale-110 group-hover:text-amber-500/[0.12] transition-all duration-500 pointer-events-none" />

              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Mic className="w-5 h-5" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-extrabold tracking-wide uppercase shadow-sm">
                    ★ HIỆU QUẢ NHẤT
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-amber-200 transition">
                    Deep Dictation (Chép Chính Tả)
                  </h3>
                  <p className="mt-2 text-sm text-slate-300/85 leading-relaxed">
                    Gõ chính xác từng từ trong câu nói. So khớp <span className="text-amber-300 font-medium">diff ký tự tức thì</span> để chữa triệt để lỗi nghe sót âm đuôi (<code className="text-amber-300">-s, -ed</code>), mạo từ và nối âm.
                  </p>
                </div>

                {/* Hộp mô phỏng gõ trực quan */}
                <div className="p-3 rounded-2xl bg-black/35 border border-white/[0.06] text-xs font-mono space-y-1">
                  <div className="text-slate-400">Audio: "...two certified copies of transcripts"</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400">✓ two</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      certifi<u>ed</u>
                    </span>
                    <span className="text-emerald-400">✓ copies</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveLabTab('dictation');
                  document.getElementById('live-mini-lab')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs font-bold text-amber-400 group-hover:text-amber-300 transition"
              >
                <span className="underline underline-offset-4">Bắt đầu chép chính tả ngay</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Card 2: Speed Run 1.25x - 1.5x (3.5 cols -> 4 cols) */}
            <div className="lg:col-span-4 group relative rounded-3xl bg-gradient-to-br from-[#0F1331] to-[#090C22] border border-white/[0.09] hover:border-rose-500/40 p-6 flex flex-col justify-between transition-all duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-300 bg-rose-500/15 px-2.5 py-1 rounded-lg border border-rose-500/25">
                    Đang chọn: {bentoSpeedPreview}x
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">Speed Run (1.25x - 1.5x)</h3>
                  <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                    Tăng tốc độ nghe lên 1.25x hoặc 1.5x để rèn luyện phản xạ não bộ, giúp bài thi thật ở 1.0x trở nên chậm rãi và dễ nắm bắt.
                  </p>
                </div>

                {/* Bộ chọn tốc độ tương tác ngay trên thẻ */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[1.0, 1.25, 1.5, 1.75].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => {
                        setBentoSpeedPreview(spd);
                        setPlaybackSpeed(spd);
                      }}
                      className={`py-1.5 rounded-xl text-xs font-bold border transition ${
                        bentoSpeedPreview === spd
                          ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                          : 'bg-white/[0.03] border-white/[0.07] text-slate-400 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveFilter('SPEED');
                  document.getElementById('exercise-library')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs font-bold text-rose-400 hover:text-rose-300 transition"
              >
                <span>Luyện phản xạ tốc độ cao</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Card 3: Luyện Giọng Accents (3 cols) */}
            <div className="lg:col-span-3 group relative rounded-3xl bg-gradient-to-br from-[#0F1331] to-[#090C22] border border-white/[0.09] hover:border-cyan-500/40 p-6 flex flex-col justify-between transition-all duration-300">
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Globe2 className="w-5 h-5" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">Luyện Giọng (Accents)</h3>
                  <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                    Làm chủ các biến thể phát âm trong bài thi IELTS: Anh-Anh, Anh-Mỹ, và Anh-Úc.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { code: 'UK', label: '🇬🇧 UK (50%)' },
                    { code: 'US', label: '🇺🇸 US (30%)' },
                    { code: 'AUS', label: '🇦🇺 AUS (20%)' }
                  ].map((acc) => (
                    <button
                      key={acc.code}
                      onClick={() => {
                        setBentoAccentPreview(acc.code);
                        setActiveFilter(acc.code);
                        document.getElementById('exercise-library')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                        bentoAccentPreview === acc.code
                          ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                          : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveFilter(bentoAccentPreview);
                  document.getElementById('exercise-library')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
              >
                <span>Chọn giọng đọc ({bentoAccentPreview})</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Hàng dưới: Full Comprehension Test Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-[#131842] via-[#17164A] to-[#1E1548] border border-indigo-400/30 p-6 sm:p-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden shadow-xl">
            {/* Họa tiết sóng âm trang trí */}
            <div className="w-64 h-64 rounded-full bg-indigo-500/15 blur-3xl absolute -right-10 -bottom-20 pointer-events-none" />

            <div className="flex items-start sm:items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/25 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0 shadow-lg shadow-indigo-500/20">
                <Award className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-extrabold text-white">
                    Full Comprehension Test (Đề Thi Thử Chuẩn Phòng Thi)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[11px] font-bold">
                    CAMBRIDGE FORMAT
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                  Mô phỏng áp lực phòng thi thật với <strong className="text-white">4 Sections liên tục (40 câu hỏi, 30 phút)</strong>. Hệ thống bấm giờ tự động, khóa tua lại và chấm điểm chuẩn thang điểm IELTS 9.0.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto justify-end relative z-10">
              <button
                onClick={() => handleOpenPracticeModal(EXERCISES_DATA[3])}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 hover:scale-[1.02] transition"
              >
                <span>Vào thi thử Full Test</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ==========================================
            5. KHO BÀI LUYỆN NGHE (SMART EXERCISE LIBRARY)
        ========================================== */}
        <section id="exercise-library" className="space-y-6 pt-2">
          {/* Header & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Compass className="w-6 h-6 text-indigo-400" />
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  Kho Bài Luyện Nghe ({filteredExercises.length})
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Đang lọc theo: <strong className="text-indigo-300">{selectedBandHeader}</strong> • Tích hợp từ vựng & giải thích Paraphrase
              </p>
            </div>

            {/* Thanh tìm kiếm & Nút lọc bài chưa làm */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm bài nghe, chủ đề, Section..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#0D102A] border border-white/10 focus:border-indigo-400 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setOnlyUncompleted(!onlyUncompleted)}
                className={`px-3.5 py-2.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 transition ${
                  onlyUncompleted
                    ? 'bg-indigo-600/25 border-indigo-400 text-indigo-200'
                    : 'bg-[#0D102A] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Chưa làm</span>
              </button>
            </div>
          </div>

          {/* Hàng Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {[
              { id: 'ALL', label: 'Tất cả bài tập' },
              { id: 'UK', label: '🇬🇧 UK Accent' },
              { id: 'US', label: '🇺🇸 US Accent' },
              { id: 'AUS', label: '🇦🇺 AUS Accent' },
              { id: 'SPEED', label: '⚡ Speed Run (Ngắn)' },
              { id: 'BAND_LOW', label: 'Band 4.5 - 6.5' },
              { id: 'BAND_MID', label: 'Band 6.5 - 7.5' },
              { id: 'BAND_HIGH', label: 'Band 7.5 - 9.0' }
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setActiveFilter(chip.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                  activeFilter === chip.id
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-[#0C0F29] border-white/[0.08] text-slate-300 hover:bg-white/[0.06] hover:border-white/20'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Grid Danh sách Bài Tập */}
          {filteredExercises.length === 0 ? (
            <div className="rounded-3xl bg-[#0B0E26] border border-white/[0.07] p-12 text-center space-y-3">
              <Headphones className="w-10 h-10 text-slate-500 mx-auto" />
              <div className="text-base font-bold text-white">Không tìm thấy bài luyện nghe phù hợp</div>
              <p className="text-xs text-slate-400">Hãy thử xóa bộ lọc hoặc tìm kiếm bằng từ khóa khác.</p>
              <button
                onClick={() => {
                  setActiveFilter('ALL');
                  setSearchQuery('');
                  setOnlyUncompleted(false);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredExercises.map((ex) => {
                const isThisPlaying = currentTrack.id === ex.id && isPlaying;
                const isBookmarked = bookmarkedIds.includes(ex.id);

                return (
                  <div
                    key={ex.id}
                    className={`group rounded-3xl p-6 flex flex-col justify-between border transition-all duration-300 relative ${
                      isThisPlaying
                        ? 'bg-gradient-to-b from-[#151946] to-[#0E1130] border-indigo-400 shadow-xl shadow-indigo-500/15'
                        : 'bg-[#0B0E26]/90 hover:bg-[#101436] border-white/[0.08] hover:border-indigo-500/40'
                    }`}
                  >
                    <div>
                      {/* Top Badges & Action Icons */}
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase border bg-gradient-to-r ${ex.badgeColor}`}
                          >
                            {ex.badge}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/[0.05] text-slate-300 border border-white/[0.07]">
                            {ex.accentFlag} {ex.accent}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            {ex.band}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => toggleBookmark(ex.id)}
                            title="Lưu bài tập"
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition ${
                              isBookmarked
                                ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300'
                                : 'bg-white/[0.03] border-white/[0.07] text-slate-400 hover:text-white'
                            }`}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-indigo-400' : ''}`} />
                          </button>

                          <button
                            onClick={() => handlePreviewExercise(ex)}
                            title="Nghe thử"
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition ${
                              isThisPlaying
                                ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/40'
                                : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-indigo-600 hover:text-white'
                            }`}
                          >
                            <Headphones className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition flex items-center gap-2">
                          <span>{ex.title}</span>
                          {ex.completed && (
                            <CheckCircle2
                              title="Đã hoàn thành"
                              className="w-4 h-4 text-emerald-400 shrink-0"
                            />
                          )}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 leading-relaxed">
                          {ex.subtitle}
                        </p>
                      </div>

                      {/* Sóng âm mini trực quan hoặc thông tin Paraphrase */}
                      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {ex.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-slate-500" />
                            {ex.questionsCount} Câu hỏi
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-indigo-300/90">{ex.category}</span>
                      </div>

                      {/* Thanh Vocab & Paraphrase Preview */}
                      <div className="mt-2.5 flex items-center justify-between text-[11px] bg-black/25 px-3 py-1.5 rounded-xl border border-white/[0.04]">
                        <span className="text-amber-300/90 font-medium">
                          🎯 {ex.paraphraseTraps} bẫy Paraphrase
                        </span>
                        <button
                          onClick={() => setVocabPopoverId(vocabPopoverId === ex.id ? null : ex.id)}
                          className="text-cyan-300 hover:underline font-semibold"
                        >
                          {vocabPopoverId === ex.id ? 'Đóng từ vựng' : '+ Xem từ vựng key'}
                        </button>
                      </div>

                      {/* Hộp xổ xuống Từ vựng Key nếu bấm */}
                      {vocabPopoverId === ex.id && (
                        <div className="mt-2 p-3 rounded-2xl bg-[#07091B] border border-cyan-500/30 space-y-1.5 text-xs animate-fadeIn">
                          {ex.vocab.map((v, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="font-bold text-white">{v.word}</span>
                              <span className="text-slate-400">{v.meaning}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Buttons: Nghe thử & Làm bài */}
                    <div className="mt-5 grid grid-cols-12 gap-2.5 pt-1">
                      <button
                        onClick={() => handlePreviewExercise(ex)}
                        className={`col-span-7 py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                          isThisPlaying
                            ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200'
                            : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/[0.08] text-slate-200'
                        }`}
                      >
                        {isThisPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-current" />
                            <span>Đang phát thử...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Nghe thử</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleOpenPracticeModal(ex)}
                        className="col-span-5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/25 to-orange-500/25 hover:from-amber-500 hover:to-orange-500 border border-amber-500/40 text-amber-300 hover:text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition"
                      >
                        <span>Làm bài</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ==========================================
            6. CHUYÊN ĐỀ LUYỆN NGHE THEO CHỦ ĐỀ (TOPIC TRACKS)
        ========================================== */}
        <section className="space-y-5 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-6 h-6 text-indigo-400" />
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  Chuyên Đề Luyện Nghe Theo Chủ Đề
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Bao quát toàn diện các ngữ cảnh Section 1, 2, 3 và 4 kèm lộ trình kỹ năng
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOPIC_TRACKS.map((track) => {
              const IconComponent = track.icon;
              const isMastered = track.progress === 100;

              return (
                <div
                  key={track.id}
                  onClick={() => {
                    setSearchQuery(track.title.split(' ')[0]);
                    document.getElementById('exercise-library')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="group cursor-pointer rounded-3xl bg-[#0B0E26]/90 hover:bg-[#101436] border border-white/[0.08] hover:border-indigo-500/40 p-6 flex flex-col justify-between transition-all duration-300"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-indigo-300 group-hover:scale-110 transition">
                        <IconComponent className="w-5 h-5" />
                      </div>

                      {isMastered ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Thành thạo</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold">
                          {track.status}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-indigo-300 transition">
                        {track.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">{track.subtitle}</p>
                    </div>

                    {/* Tags kỹ năng con */}
                    <div className="flex flex-wrap gap-1.5">
                      {track.skills.map((sk, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.03] text-slate-300 border border-white/[0.06]"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Thanh tiến độ */}
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">{track.exercisesCount} bài tập</span>
                      <span className={`font-bold ${isMastered ? 'text-emerald-400' : 'text-white'}`}>
                        {track.progress}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-white/[0.07] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isMastered
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400'
                        }`}
                        style={{ width: `${track.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ==========================================
          7. MODAL LÀM BÀI THỰC CHIẾN (INTERACTIVE PRACTICE WORKSPACE)
      ========================================== */}
      {activePracticeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-3xl bg-[#0B0E26] border border-indigo-500/40 shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-[#0F1334] border-b border-white/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                      {activePracticeModal.section}
                    </span>
                    <span className="text-xs text-emerald-300 font-semibold">
                      Band {activePracticeModal.band}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-white mt-0.5">
                    {activePracticeModal.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setActivePracticeModal(null)}
                className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[75vh] overflow-y-auto">
              {/* Cột Câu hỏi (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-300">
                    📝 Phiếu Trả Lời Câu Hỏi (NO MORE THAN TWO WORDS)
                  </h4>
                </div>

                <div className="space-y-3">
                  {activePracticeModal.questions.map((qItem, idx) => {
                    const userAns = (modalAnswers[qItem.id] || '').trim().toLowerCase();
                    const isCorrect = userAns === qItem.answer.toLowerCase();

                    return (
                      <div
                        key={qItem.id}
                        className="p-4 rounded-2xl bg-[#07091B] border border-white/[0.08] space-y-2.5"
                      >
                        <div className="text-sm text-slate-200 font-medium">
                          <span className="text-indigo-400 font-bold mr-2">Câu {idx + 1}:</span>
                          {qItem.q}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={modalAnswers[qItem.id] || ''}
                            onChange={(e) =>
                              setModalAnswers({ ...modalAnswers, [qItem.id]: e.target.value })
                            }
                            placeholder="Nhập đáp án của bạn..."
                            className="flex-1 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/15 focus:border-indigo-400 text-sm text-white outline-none"
                          />
                          {modalSubmitted && (
                            <span
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                                isCorrect
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {isCorrect ? '✓ Chính xác' : `✗ Đáp án: ${qItem.answer}`}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-amber-300/80 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Gợi ý Paraphrase: {qItem.hint}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setModalSubmitted(true)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-bold shadow-lg"
                  >
                    Chấm điểm & Giải thích chi tiết
                  </button>
                  <button
                    onClick={() => {
                      setModalAnswers({});
                      setModalSubmitted(false);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/[0.06] text-slate-300 text-xs font-semibold"
                  >
                    Làm lại
                  </button>
                </div>
              </div>

              {/* Cột Live Transcript & Từ vựng (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    🎧 Transcript Đồng Bộ Thời Gian Thực
                  </span>
                  <button
                    onClick={() => setShowTranscriptInModal(!showTranscriptInModal)}
                    className="text-xs text-indigo-400 font-semibold"
                  >
                    {showTranscriptInModal ? 'Ẩn Transcript' : 'Hiện Transcript'}
                  </button>
                </div>

                {showTranscriptInModal ? (
                  <div className="p-4 rounded-2xl bg-[#07091B] border border-white/[0.08] space-y-3 max-h-64 overflow-y-auto">
                    {activePracticeModal.transcript.map((line, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setCurrentTime(line.time);
                          speakText(line.text, 'en-GB', playbackSpeed);
                        }}
                        className="p-2.5 rounded-xl hover:bg-white/[0.05] cursor-pointer transition text-xs leading-relaxed text-slate-300 border border-transparent hover:border-indigo-500/30"
                      >
                        <span className="text-indigo-400 font-mono font-bold mr-2">
                          [{formatTime(line.time)}]
                        </span>
                        {line.text}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-[#07091B] border border-white/[0.08] text-center text-xs text-slate-500">
                    Transcript đang được ẩn để rèn khả năng nghe thực chiến.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          8. FLOATING AUDIO DOCK PLAYER (CÓ THỂ THU GỌN & GIẢ LẬP TIẾNG ỒN)
      ========================================== */}
      <div className="fixed bottom-4 inset-x-0 z-40 px-4 pointer-events-none flex justify-center">
        {isDockMinimized ? (
          /* Trạng thái Thu Gọn (Compact Pill) - Không bao giờ che khuất nội dung */
          <button
            onClick={() => setIsDockMinimized(false)}
            className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#0F1336]/95 backdrop-blur-2xl border border-indigo-400/40 shadow-2xl shadow-indigo-950 text-xs font-bold text-white hover:scale-105 transition"
          >
            <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-indigo-400'}`} />
            <span className="truncate max-w-[180px]">{currentTrack.title}</span>
            <span className="text-indigo-300 font-mono">{formatTime(currentTime)}</span>
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
          </button>
        ) : (
          /* Trạng thái Đầy Đủ (Sleek Cyber Audio Dock) */
          <div className="pointer-events-auto w-full max-w-4xl rounded-3xl bg-[#0D1130]/95 backdrop-blur-2xl border border-white/[0.12] shadow-[0_20px_60px_rgba(0,0,0,0.75)] p-3.5 sm:px-5 sm:py-3.5 transition-all">
            {/* Thanh Live Transcript Ticker chạy chữ phía trên Player */}
            <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-white/[0.07] text-[11px]">
              <div className="flex items-center gap-2 truncate">
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold shrink-0">
                  LIVE SCRIPT
                </span>
                <span className="text-slate-300 italic truncate">"{currentTranscriptLine}"</span>
              </div>

              {/* Giả lập tiếng ồn phòng thi (Ambient Noise Simulator) */}
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                <span className="text-slate-400">Môi trường:</span>
                {[
                  { id: 'off', label: 'Phòng thu (Chuẩn)' },
                  { id: 'exam', label: 'Phòng thi' },
                  { id: 'cafe', label: 'Quán Cafe' }
                ].map((env) => (
                  <button
                    key={env.id}
                    onClick={() => setAmbientNoise(env.id)}
                    className={`px-2 py-0.5 rounded-md font-semibold transition ${
                      ambientNoise === env.id
                        ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {env.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Track Info */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shrink-0 cursor-pointer shadow-lg shadow-indigo-500/30"
                >
                  <Headphones className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${isPlaying ? 'animate-ping' : ''}`} />
                    <span>{isPlaying ? 'ĐANG PHÁT' : 'SẴN SÀNG'}</span>
                    <span className="text-slate-400">• {currentTrack.accent}</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white truncate max-w-[220px]">
                    {currentTrack.title}
                  </div>
                </div>

                {/* Nút thu gọn trên Mobile */}
                <button
                  onClick={() => setIsDockMinimized(true)}
                  className="sm:hidden p-2 rounded-xl bg-white/5 text-slate-400"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>

              {/* Thanh tua Timeline */}
              <div className="flex items-center gap-3 w-full sm:flex-1 max-w-md">
                <span className="text-[11px] font-mono text-slate-400 w-9 text-right">
                  {formatTime(currentTime)}
                </span>
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    setCurrentTime(Math.floor(clickRatio * currentTrack.durationSec));
                  }}
                  className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer relative group"
                >
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-violet-400 to-cyan-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (currentTime / currentTrack.durationSec) * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono text-slate-400 w-9">
                  {currentTrack.duration}
                </span>
              </div>

              {/* Cụm nút điều khiển */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentTime((t) => Math.max(0, t - 5))}
                  title="Lùi 5 giây"
                  className="p-2 rounded-xl hover:bg-white/[0.08] text-slate-300 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    const nextState = !isPlaying;
                    setIsPlaying(nextState);
                    if (nextState) {
                      speakText(currentTrack.sampleSentence, 'en-GB', playbackSpeed);
                    } else if ('speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                    }
                  }}
                  className="w-10 h-10 rounded-full bg-white text-slate-950 hover:scale-105 flex items-center justify-center shadow-lg transition"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={() => setCurrentTime((t) => Math.min(currentTrack.durationSec, t + 5))}
                  title="Tua tới 5 giây"
                  className="p-2 rounded-xl hover:bg-white/[0.08] text-slate-300 transition"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                <div className="h-5 w-px bg-white/10 mx-1" />

                {/* Đổi tốc độ phát */}
                <button
                  onClick={() => {
                    const speeds = [0.75, 1.0, 1.25, 1.5];
                    const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
                    setPlaybackSpeed(next);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-mono font-bold text-indigo-300 transition"
                >
                  {playbackSpeed}x
                </button>

                {/* Lặp A-B */}
                <button
                  onClick={() => setAbLoop(!abLoop)}
                  title="Lặp lại câu (Loop)"
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                    abLoop
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  A-B
                </button>

                {/* Thu gọn thanh Player để không che nội dung */}
                <button
                  onClick={() => setIsDockMinimized(true)}
                  title="Thu gọn thanh phát nhạc"
                  className="hidden sm:flex p-2 rounded-xl hover:bg-white/[0.08] text-slate-400 hover:text-white transition"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}