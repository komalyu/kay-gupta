import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ArrowRight,
  Building2,
  ChevronDown,
  ChevronUp,
  Grid,
  Layers,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { Complaint, MessHall } from '../../types/hostelCare';
import { getCrowdLevel, getHallAvgWaitMinutes, getOccupancyPercent } from '../../utils/messHelpers';
import { PriorityReadout, StatusReadout } from './StatusReadout';
import { useTheme } from './ThemeProvider';

interface HostelCampus3DProps {
  complaints: Complaint[];
  messHalls?: MessHall[];
  height?: number | string;
  selectedComplaintId?: string;
  onSelectComplaint?: (complaint: Complaint) => void;
  onOpenComplaintDetail?: (complaint: Complaint) => void;
  compactMode?: boolean;
}

type CameraPreset = 'overview' | 'north' | 'south';
type MarkerFilter = 'all' | 'urgent' | 'active' | 'resolved';

interface MarkerBinding {
  complaint: Complaint;
  group: THREE.Group;
  hitMesh: THREE.Mesh;
  orbMesh: THREE.Mesh;
  baseY: number;
  floorIndex: number;
}

interface FloorLayerBinding {
  group: THREE.Group;
  baseY: number;
  floorIndex: number;
}

const _targetVec = new THREE.Vector3();
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();

function getFloorIndexFromRoom(roomNumber: string): number {
  const num = parseInt(roomNumber.replace(/\D/g, ''), 10);
  if (!Number.isNaN(num)) {
    const hundreds = Math.floor(num / 100);
    if (hundreds >= 3) return 2;
    if (hundreds === 2) return 1;
  }
  return 0;
}

function getMarkerColorHex(c: Complaint): number {
  if (c.isOverdue || c.priority === 'Critical' || c.status === 'Reopened' || c.status === 'Rejected') {
    return 0xf43f5e; // Luminous Crimson
  }
  if (c.status === 'Submitted' || c.status === 'Waiting for Materials') {
    return 0xf59e0b; // Amber
  }
  if (c.status === 'Completed' || c.status === 'Closed') {
    return 0x10b981; // Emerald
  }
  return 0x38bdf8; // Electric Sky Cyan
}

function createCourtyardTexture(anisotropy: number, isDark: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = isDark ? '#070d18' : '#dde4ec';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.16)' : 'rgba(100, 116, 139, 0.16)';
  ctx.lineWidth = isDark ? 1.5 : 2;
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 62);
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.55)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function createRoofGeometry(width: number, depth: number, height: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hw = width / 2 + 0.18;
  shape.moveTo(-hw, 0);
  shape.lineTo(0, height);
  shape.lineTo(hw, 0);
  shape.closePath();

  const extrude = new THREE.ExtrudeGeometry(shape, {
    depth: depth + 0.3,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 2,
  });
  extrude.translate(0, 0, -(depth + 0.3) / 2);
  extrude.computeVertexNormals();
  return extrude;
}

export function HostelCampus3D({
  complaints,
  messHalls = [],
  height = 500,
  selectedComplaintId,
  onSelectComplaint,
  onOpenComplaintDetail,
  compactMode = false,
}: HostelCampus3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [preset, setPreset] = useState<CameraPreset>('overview');
  const [exploded, setExploded] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [autoOrbit, setAutoOrbit] = useState(false);
  const [markerFilter, setMarkerFilter] = useState<MarkerFilter>('all');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [hoveredComplaint, setHoveredComplaint] = useState<Complaint | null>(null);
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(() =>
    selectedComplaintId
      ? complaints.find((c) => c.id === selectedComplaintId) ?? null
      : null
  );

  const complaintsRef = useRef(complaints);
  complaintsRef.current = complaints;
  const messHallsRef = useRef(messHalls);
  messHallsRef.current = messHalls;
  const explodedRef = useRef(exploded);
  explodedRef.current = exploded;
  const wireframeRef = useRef(wireframe);
  wireframeRef.current = wireframe;
  const autoOrbitRef = useRef(autoOrbit);
  autoOrbitRef.current = autoOrbit;
  const markerFilterRef = useRef(markerFilter);
  markerFilterRef.current = markerFilter;
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;
  const onSelectRef = useRef(onSelectComplaint);
  onSelectRef.current = onSelectComplaint;

  const sceneControlsRef = useRef<{
    setCameraGoal: (p: CameraPreset, focusPos?: THREE.Vector3) => void;
    rebuildMarkers: () => void;
    syncVisualMode: () => void;
    requestRender: () => void;
  } | null>(null);

  const filteredCount = useMemo(() => {
    return complaints.filter((c) => {
      if (markerFilter === 'urgent') {
        return c.isOverdue || c.priority === 'Critical' || c.status === 'Reopened';
      }
      if (markerFilter === 'active') {
        return c.status !== 'Closed' && c.status !== 'Completed';
      }
      if (markerFilter === 'resolved') {
        return c.status === 'Closed' || c.status === 'Completed';
      }
      return true;
    }).length;
  }, [complaints, markerFilter]);

  useEffect(() => {
    if (selectedComplaintId) {
      const match = complaints.find((c) => c.id === selectedComplaintId) ?? null;
      setActiveComplaint(match);
    }
  }, [selectedComplaintId, complaints]);

  useEffect(() => {
    sceneControlsRef.current?.rebuildMarkers();
    sceneControlsRef.current?.requestRender();
  }, [complaints, messHalls, markerFilter]);

  useEffect(() => {
    sceneControlsRef.current?.syncVisualMode();
    sceneControlsRef.current?.requestRender();
  }, [exploded, wireframe, autoOrbit, isDark]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setContextLost(true);
      return;
    }

    const width = container.clientWidth || 800;
    const clientHeight = container.clientHeight || 480;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, clientHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    const initialBg = isDarkRef.current ? 0x060b14 : 0xeef3f8;
    scene.background = new THREE.Color(initialBg);
    scene.fog = new THREE.FogExp2(initialBg, 0.015);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / clientHeight, 0.1, 160);
    camera.position.set(16, 12.5, 19.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 8;
    controls.maxDistance = 42;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.9;
    controls.target.set(0, 1.8, 0);

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x334155, 0.78);
    hemiLight.position.set(0, 28, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.55);
    keyLight.position.set(15, 22, 14);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 65;
    keyLight.shadow.camera.left = -18;
    keyLight.shadow.camera.right = 18;
    keyLight.shadow.camera.top = 18;
    keyLight.shadow.camera.bottom = -18;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimLight.position.set(-14, 10, -12);
    scene.add(rimLight);

    const disposables: { dispose: () => void }[] = [envTex];
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const lightGroundTex = createCourtyardTexture(maxAniso, false);
    const darkGroundTex = createCourtyardTexture(maxAniso, true);
    const shadowTex = createContactShadowTexture();
    disposables.push(lightGroundTex, darkGroundTex, shadowTex);

    const groundGeo = new THREE.PlaneGeometry(140, 140);
    const groundMat = new THREE.MeshStandardMaterial({
      map: isDarkRef.current ? darkGroundTex : lightGroundTex,
      roughness: 0.9,
      metalness: 0.08,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);
    disposables.push(groundGeo, groundMat);

    const plazaGeo = new THREE.BoxGeometry(22, 0.05, 16);
    const plazaMat = new THREE.MeshStandardMaterial({
      color: isDarkRef.current ? 0x0f172a : 0xe2e8f0,
      roughness: 0.82,
      metalness: 0.12,
    });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.position.set(0, 0.025, 0);
    plaza.receiveShadow = true;
    scene.add(plaza);
    disposables.push(plazaGeo, plazaMat);

    const spineWalkGeo = new THREE.BoxGeometry(2.6, 0.07, 15.6);
    const spineWalkMat = new THREE.MeshStandardMaterial({
      color: isDarkRef.current ? 0x1e293b : 0x94a3b8,
      roughness: 0.72,
      metalness: 0.25,
    });
    const spineWalk = new THREE.Mesh(spineWalkGeo, spineWalkMat);
    spineWalk.position.set(0, 0.035, 0);
    spineWalk.receiveShadow = true;
    scene.add(spineWalk);
    disposables.push(spineWalkGeo, spineWalkMat);

    const floorBindings: FloorLayerBinding[] = [];

    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.75,
      metalness: 0.2,
    });
    const brickMat = new THREE.MeshStandardMaterial({
      color: isDarkRef.current ? 0x1e293b : 0xb4533c,
      roughness: isDarkRef.current ? 0.55 : 0.78,
      metalness: isDarkRef.current ? 0.35 : 0.04,
    });
    const concreteMat = new THREE.MeshStandardMaterial({
      color: isDarkRef.current ? 0x334155 : 0xf1f5f9,
      roughness: 0.6,
      metalness: 0.18,
    });
    const trimMetalMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.28,
      metalness: 0.85,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: isDarkRef.current ? 0x38bdf8 : 0xbae6fd,
      emissive: isDarkRef.current ? 0x0ea5e9 : 0x000000,
      emissiveIntensity: isDarkRef.current ? 0.35 : 0,
      roughness: 0.12,
      metalness: 0.15,
      clearcoat: 1.0,
      transparent: true,
      opacity: isSoftwareGl ? 0.58 : 0.8,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x0f2942,
      roughness: 0.42,
      metalness: 0.45,
    });
    const solarMetalMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.22,
      metalness: 0.88,
    });

    const buildingMaterials = [
      plinthMat,
      brickMat,
      concreteMat,
      trimMetalMat,
      glassMat,
      roofMat,
      solarMetalMat,
    ];
    disposables.push(...buildingMaterials);

    const wingW = 5.4;
    const wingD = 3.8;
    const floorH = 1.15;

    const plinthGeo = new THREE.BoxGeometry(wingW + 0.3, 0.28, wingD + 0.3);
    const floorBodyGeo = new THREE.BoxGeometry(wingW, floorH - 0.12, wingD);
    const slabGeo = new THREE.BoxGeometry(wingW + 0.24, 0.12, wingD + 0.24);
    const windowStripGeo = new THREE.BoxGeometry(wingW - 0.8, 0.52, wingD + 0.06);
    const frameStripGeo = new THREE.BoxGeometry(wingW - 0.7, 0.58, wingD + 0.03);
    const canopyGeo = new THREE.BoxGeometry(1.6, 0.12, 0.7);
    const roofGeo = createRoofGeometry(wingW, wingD, 1.05);
    const solarBoxGeo = new THREE.BoxGeometry(1.1, 0.32, 0.75);
    const shadowPlaneGeo = new THREE.PlaneGeometry(wingW + 2.4, wingD + 2.4);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    disposables.push(
      plinthGeo,
      floorBodyGeo,
      slabGeo,
      windowStripGeo,
      frameStripGeo,
      canopyGeo,
      roofGeo,
      solarBoxGeo,
      shadowPlaneGeo,
      shadowPlaneMat
    );

    const wingConfigs = [
      { hostel: 'North Hall', block: 'Block A', x: -5.4, z: -3.6 },
      { hostel: 'North Hall', block: 'Block B', x: -5.4, z: 3.6 },
      { hostel: 'South Hall', block: 'Block A', x: 5.4, z: -3.6 },
      { hostel: 'South Hall', block: 'Block B', x: 5.4, z: 3.6 },
    ];

    const wingAnchorMap = new Map<string, { x: number; z: number }>();

    wingConfigs.forEach((cfg) => {
      wingAnchorMap.set(`${cfg.hostel}|${cfg.block}`, { x: cfg.x, z: cfg.z });

      const buildingGroup = new THREE.Group();
      buildingGroup.position.set(cfg.x, 0.05, cfg.z);

      const contactShadow = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
      contactShadow.rotation.x = -Math.PI / 2;
      contactShadow.position.y = 0.01;
      buildingGroup.add(contactShadow);

      const plinth = new THREE.Mesh(plinthGeo, plinthMat);
      plinth.position.y = 0.14;
      plinth.castShadow = true;
      plinth.receiveShadow = true;
      buildingGroup.add(plinth);

      const canopy = new THREE.Mesh(canopyGeo, trimMetalMat);
      canopy.position.set(0, 0.95, cfg.z < 0 ? wingD / 2 + 0.32 : -wingD / 2 - 0.32);
      canopy.castShadow = true;
      buildingGroup.add(canopy);

      for (let f = 0; f < 3; f++) {
        const floorGroup = new THREE.Group();
        const baseY = 0.28 + f * floorH;
        floorGroup.position.y = baseY;

        const slab = new THREE.Mesh(slabGeo, concreteMat);
        slab.position.y = 0.06;
        slab.castShadow = true;
        slab.receiveShadow = true;
        floorGroup.add(slab);

        const walls = new THREE.Mesh(floorBodyGeo, brickMat);
        walls.position.y = 0.12 + (floorH - 0.12) / 2;
        walls.castShadow = true;
        walls.receiveShadow = true;
        floorGroup.add(walls);

        const frame = new THREE.Mesh(frameStripGeo, trimMetalMat);
        frame.position.y = 0.12 + (floorH - 0.12) / 2;
        floorGroup.add(frame);

        const glass = new THREE.Mesh(windowStripGeo, glassMat);
        glass.position.y = 0.12 + (floorH - 0.12) / 2;
        floorGroup.add(glass);

        if (f === 2) {
          const roofSlab = new THREE.Mesh(slabGeo, concreteMat);
          roofSlab.position.y = floorH + 0.04;
          roofSlab.castShadow = true;
          floorGroup.add(roofSlab);

          const roof = new THREE.Mesh(roofGeo, roofMat);
          roof.position.y = floorH + 0.1;
          roof.castShadow = true;
          floorGroup.add(roof);

          const solar = new THREE.Mesh(solarBoxGeo, solarMetalMat);
          solar.position.set(1.2, floorH + 0.55, 0.55);
          solar.rotation.z = -0.22;
          solar.castShadow = true;
          floorGroup.add(solar);
        }

        buildingGroup.add(floorGroup);
        floorBindings.push({ group: floorGroup, baseY, floorIndex: f });
      }

      scene.add(buildingGroup);
    });

    // Instanced Campus Trees
    const treeTrunkGeo = new THREE.CylinderGeometry(0.1, 0.14, 0.9, 8);
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const treeCrownGeo = new THREE.DodecahedronGeometry(0.68, 1);
    const treeCrownMat = new THREE.MeshStandardMaterial({ color: 0x2e6f40, roughness: 0.82 });
    disposables.push(treeTrunkGeo, treeTrunkMat, treeCrownGeo, treeCrownMat);

    const treePositions: [number, number][] = [
      [-10.2, -6.2], [-10.2, 0], [-10.2, 6.2],
      [10.2, -6.2], [10.2, 0], [10.2, 6.2],
      [-2.1, -6.8], [2.1, -6.8], [-2.1, 6.8], [2.1, 6.8],
      [-8.5, -9.2], [0, -9.5], [8.5, -9.2],
      [-8.5, 9.2], [0, 9.5], [8.5, 9.2],
      [-13.5, -3.5], [-13.5, 3.5], [13.5, -3.5], [13.5, 3.5],
      [-12.2, -8.5], [12.2, 8.5],
    ];

    const trunkInst = new THREE.InstancedMesh(treeTrunkGeo, treeTrunkMat, treePositions.length);
    const crownInst = new THREE.InstancedMesh(treeCrownGeo, treeCrownMat, treePositions.length);
    trunkInst.castShadow = !isSoftwareGl;
    crownInst.castShadow = !isSoftwareGl;

    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    treePositions.forEach(([tx, tz], i) => {
      const s = 0.85 + ((i * 37) % 30) / 100;
      dummy.position.set(tx, 0.45 * s, tz);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tx, 1.25 * s, tz);
      dummy.rotation.y = i * 0.7;
      dummy.updateMatrix();
      crownInst.setMatrixAt(i, dummy.matrix);

      tint.setHSL(0.38 + ((i % 5) - 2) * 0.015, 0.45, 0.34 + (i % 3) * 0.04);
      crownInst.setColorAt(i, tint);
    });
    trunkInst.computeBoundingSphere();
    crownInst.computeBoundingSphere();
    scene.add(trunkInst, crownInst);

    // Central Mess Dining Pavilions & Crowd Markers
    const messPavilionGeo = new THREE.BoxGeometry(2.1, 0.85, 2.6);
    const messRoofGeo = new THREE.BoxGeometry(2.35, 0.14, 2.85);
    const messBeaconGeo = new THREE.TorusGeometry(0.55, 0.06, 8, 24);
    disposables.push(messPavilionGeo, messRoofGeo, messBeaconGeo);

    const messCoords: Record<string, [number, number]> = {
      'mess-north': [0, -4.4],
      'mess-annex': [0, 0],
      'mess-south': [0, 4.4],
    };

    const messGroup = new THREE.Group();
    scene.add(messGroup);

    // Complaint 3D Markers
    const markersGroup = new THREE.Group();
    scene.add(markersGroup);

    const stemGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.52, 8);
    const orbGeo = new THREE.OctahedronGeometry(0.24, 1);
    const ringGeo = new THREE.TorusGeometry(0.3, 0.035, 8, 20);
    const hitGeo = new THREE.SphereGeometry(0.45, 10, 10);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.75,
    });
    disposables.push(stemGeo, orbGeo, ringGeo, hitGeo, hitMat, stemMat);

    let markerBindings: MarkerBinding[] = [];
    const markerMaterials: THREE.Material[] = [];

    function rebuildMarkers() {
      markersGroup.clear();
      markerMaterials.forEach((m) => m.dispose());
      markerMaterials.length = 0;
      markerBindings = [];

      const activeFilter = markerFilterRef.current;
      const list = complaintsRef.current.filter((c) => {
        if (activeFilter === 'urgent') {
          return c.isOverdue || c.priority === 'Critical' || c.status === 'Reopened';
        }
        if (activeFilter === 'active') {
          return c.status !== 'Closed' && c.status !== 'Completed';
        }
        if (activeFilter === 'resolved') {
          return c.status === 'Closed' || c.status === 'Completed';
        }
        return true;
      });

      const slotCounter = new Map<string, number>();

      list.forEach((c) => {
        const anchor = wingAnchorMap.get(`${c.hostelName}|${c.block}`) ?? {
          x: -5.4,
          z: -3.6,
        };
        const floorIndex = getFloorIndexFromRoom(c.roomNumber);
        const slotKey = `${c.hostelName}|${c.block}|${floorIndex}`;
        const slotIdx = slotCounter.get(slotKey) ?? 0;
        slotCounter.set(slotKey, slotIdx + 1);

        const xOffset = ((slotIdx % 4) - 1.5) * 1.15;
        const zOffset = anchor.z < 0 ? wingD / 2 + 0.45 : -(wingD / 2 + 0.45);
        const baseY = 0.55 + floorIndex * floorH;

        const mGroup = new THREE.Group();
        mGroup.position.set(anchor.x + xOffset, baseY, anchor.z + zOffset);

        const colorHex = getMarkerColorHex(c);
        const orbMat = new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: isDarkRef.current ? 0.55 : 0.25,
          roughness: 0.2,
          metalness: 0.25,
        });
        const ringMat = new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: isDarkRef.current ? 0.35 : 0.1,
          roughness: 0.3,
          metalness: 0.65,
        });
        markerMaterials.push(orbMat, ringMat);

        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.22;
        mGroup.add(stem);

        const orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.y = 0.56;
        orb.castShadow = !isSoftwareGl;
        mGroup.add(orb);

        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.56;
        mGroup.add(ring);

        const hitMesh = new THREE.Mesh(hitGeo, hitMat);
        hitMesh.position.y = 0.52;
        hitMesh.layers.set(1);
        hitMesh.userData.complaint = c;
        mGroup.add(hitMesh);

        markersGroup.add(mGroup);
        markerBindings.push({
          complaint: c,
          group: mGroup,
          hitMesh,
          orbMesh: orb,
          baseY,
          floorIndex,
        });
      });

      // Rebuild Central Mess Pavilion Beacons
      messGroup.clear();
      messHallsRef.current.forEach((hall) => {
        const coords = messCoords[hall.id];
        if (!coords) return;
        const pct = getOccupancyPercent(hall);
        const beaconHex = pct >= 85 ? 0xf43f5e : pct >= 68 ? 0xf59e0b : 0x10b981;

        const pavGroup = new THREE.Group();
        pavGroup.position.set(coords[0], 0.06, coords[1]);

        const body = new THREE.Mesh(messPavilionGeo, glassMat);
        body.position.y = 0.45;
        body.castShadow = !isSoftwareGl;
        pavGroup.add(body);

        const roof = new THREE.Mesh(messRoofGeo, trimMetalMat);
        roof.position.y = 0.94;
        pavGroup.add(roof);

        const beaconMat = new THREE.MeshStandardMaterial({
          color: beaconHex,
          emissive: beaconHex,
          emissiveIntensity: isDarkRef.current ? 0.65 : 0.3,
          roughness: 0.25,
        });
        markerMaterials.push(beaconMat);
        const beacon = new THREE.Mesh(messBeaconGeo, beaconMat);
        beacon.rotation.x = Math.PI / 2;
        beacon.position.y = 1.18;
        pavGroup.add(beacon);

        messGroup.add(pavGroup);
      });
    }

    function syncVisualMode() {
      const dark = isDarkRef.current;
      const bgHex = dark ? 0x060b14 : 0xeef3f8;
      (scene.background as THREE.Color).setHex(bgHex);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.setHex(bgHex);
      }

      groundMat.map = dark ? darkGroundTex : lightGroundTex;
      groundMat.needsUpdate = true;
      plazaMat.color.setHex(dark ? 0x0f172a : 0xe2e8f0);
      spineWalkMat.color.setHex(dark ? 0x1e293b : 0x94a3b8);

      brickMat.color.setHex(dark ? 0x1e293b : 0xb4533c);
      brickMat.roughness = dark ? 0.55 : 0.78;
      brickMat.metalness = dark ? 0.35 : 0.04;
      concreteMat.color.setHex(dark ? 0x334155 : 0xf1f5f9);
      glassMat.color.setHex(dark ? 0x38bdf8 : 0xbae6fd);
      glassMat.emissive.setHex(dark ? 0x0ea5e9 : 0x000000);
      glassMat.emissiveIntensity = dark ? 0.35 : 0;

      const wf = wireframeRef.current;
      buildingMaterials.forEach((m) => {
        m.wireframe = wf;
      });

      controls.autoRotate = !isSoftwareGl && autoOrbitRef.current;
    }

    rebuildMarkers();
    syncVisualMode();

    let camTransitionActive = false;
    let explodeFactor = 0;
    let hoveredId: string | null = null;

    function setCameraGoal(nextPreset: CameraPreset, focusPos?: THREE.Vector3) {
      if (focusPos) {
        _camGoalTarget.copy(focusPos);
        _camGoalPos.set(focusPos.x + 6.5, focusPos.y + 5.2, focusPos.z + 7.5);
      } else if (nextPreset === 'north') {
        _camGoalTarget.set(-5.4, 2.0, 0);
        _camGoalPos.set(-13.5, 9.5, 11.5);
      } else if (nextPreset === 'south') {
        _camGoalTarget.set(5.4, 2.0, 0);
        _camGoalPos.set(13.5, 9.5, 11.5);
      } else {
        _camGoalTarget.set(0, 1.8, 0);
        _camGoalPos.set(16, 12.5, 19.5);
      }
      camTransitionActive = true;
      requestRender();
    }

    const onControlStart = () => {
      camTransitionActive = false;
      requestRender();
    };
    const onControlChange = () => {
      requestRender();
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('change', onControlChange);

    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const mouse = new THREE.Vector2();
    let lastMoveCheck = 0;

    function updateMouseFromEvent(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastMoveCheck < 45) return;
      lastMoveCheck = now;

      updateMouseFromEvent(e);
      raycaster.setFromCamera(mouse, camera);
      const hitMeshes = markerBindings.map((b) => b.hitMesh);
      const hits = raycaster.intersectObjects(hitMeshes, false);

      if (hits.length > 0) {
        const found = hits[0].object.userData.complaint as Complaint;
        if (hoveredId !== found.id) {
          hoveredId = found.id;
          setHoveredComplaint(found);
          renderer.domElement.style.cursor = 'pointer';
          requestRender();
        }
      } else if (hoveredId !== null) {
        hoveredId = null;
        setHoveredComplaint(null);
        renderer.domElement.style.cursor = 'grab';
        requestRender();
      }
    };

    const onPointerClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hitMeshes = markerBindings.map((b) => b.hitMesh);
      const hits = raycaster.intersectObjects(hitMeshes, false);

      if (hits.length > 0) {
        const found = hits[0].object.userData.complaint as Complaint;
        const binding = markerBindings.find((b) => b.complaint.id === found.id);
        setActiveComplaint(found);
        onSelectRef.current?.(found);
        if (binding) {
          _targetVec.copy(binding.group.position);
          setCameraGoal(preset, _targetVec);
        }
      }
    };

    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onPointerClick);

    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      try {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (!gl || !gl.fenceSync) {
          frameId = window.setTimeout(cb, 80);
          return;
        }
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (status === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } catch {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        if (disposed) return;
        renderDirty = false;
        const delta = Math.min(0.1, (now - lastTime) / 1000);
        lastTime = now;

        let needsMoreFrames = false;

        const targetExplode = explodedRef.current ? 1 : 0;
        if (Math.abs(explodeFactor - targetExplode) > 0.002) {
          explodeFactor = THREE.MathUtils.damp(explodeFactor, targetExplode, 7, delta);
          needsMoreFrames = true;
        } else {
          explodeFactor = targetExplode;
        }

        const explodeGap = explodeFactor * 1.45;
        floorBindings.forEach((fb) => {
          fb.group.position.y = fb.baseY + fb.floorIndex * explodeGap;
        });
        markerBindings.forEach((mb) => {
          mb.group.position.y = mb.baseY + mb.floorIndex * explodeGap;
          const targetScale = hoveredId === mb.complaint.id ? 1.32 : 1.0;
          const nextScale = THREE.MathUtils.damp(mb.group.scale.x, targetScale, 10, delta);
          if (Math.abs(nextScale - targetScale) > 0.005) {
            needsMoreFrames = true;
          }
          mb.group.scale.setScalar(nextScale);
        });

        if (camTransitionActive) {
          camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 6, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 6, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 6, delta);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalTarget.x, 6, delta);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalTarget.y, 6, delta);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalTarget.z, 6, delta);

          if (
            camera.position.distanceToSquared(_camGoalPos) < 0.01 &&
            controls.target.distanceToSquared(_camGoalTarget) < 0.01
          ) {
            camTransitionActive = false;
          } else {
            needsMoreFrames = true;
          }
        }

        const controlsChanged = controls.update();
        if (controlsChanged || (autoOrbitRef.current && !isSoftwareGl)) {
          needsMoreFrames = true;
        }

        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty || needsMoreFrames) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    sceneControlsRef.current = {
      setCameraGoal,
      rebuildMarkers,
      syncVisualMode,
      requestRender,
    };

    requestRender();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(100, entry.contentRect.width);
        const h = Math.max(100, entry.contentRect.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        requestRender();
      }
    });
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('change', onControlChange);
      controls.dispose();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onPointerClick);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      markerMaterials.forEach((m) => m.dispose());
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      sceneControlsRef.current = null;
    };
  }, []);

  const handlePresetClick = (next: CameraPreset) => {
    setPreset(next);
    sceneControlsRef.current?.setCameraGoal(next);
  };

  if (contextLost) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-100 p-6 text-center dark:border-slate-800 dark:bg-[#0c1322]"
      >
        <Building2 className="mb-2 h-8 w-8 text-navy-900 dark:text-sky-400" />
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          3D Campus Twin Unavailable on Current Graphics Context
        </p>
        <p className="mt-1 max-w-md text-xs text-slate-600 dark:text-slate-400">
          All complaint lists, timelines, scheduling, and analytics remain fully functional.
        </p>
      </div>
    );
  }

  const displayedComplaint = hoveredComplaint ?? activeComplaint;

  return (
    <div
      style={{ height }}
      className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-[#eef3f8] dark:border-slate-800 dark:bg-[#060b14]"
    >
      <div ref={mountRef} className="h-full w-full" aria-label="Interactive 3D Hostel Campus Twin" />

      {/* Top-Left Minimal Semantic Title & Legend */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-1.5 sm:left-4 sm:top-4">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs shadow-xs dark:border-slate-700/80 dark:bg-[#0c1322]/95">
          <Building2 className="h-3.5 w-3.5 text-navy-900 dark:text-sky-400" />
          <span className="font-semibold text-navy-950 dark:text-slate-100">
            3D Campus Twin
          </span>
          <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
            ·
          </span>
          <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
            {filteredCount} marker{filteredCount === 1 ? '' : 's'}
          </span>
        </div>

        {!compactMode && (
          <div className="pointer-events-auto hidden sm:flex items-center gap-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] text-slate-700 shadow-xs dark:border-slate-700/80 dark:bg-[#0c1322]/95 dark:text-slate-300">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Overcrowded / Urgent</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Busy / Pending</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              <span>Active</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Low Crowd / Resolved</span>
            </span>
          </div>
        )}

        {messHalls.length > 0 && (
          <div className="pointer-events-auto hidden md:flex items-center gap-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] text-slate-700 shadow-xs dark:border-slate-700/80 dark:bg-[#0c1322]/95 dark:text-slate-300">
            {messHalls.map((h) => (
              <span key={h.id} className="font-mono tabular-nums">
                {h.name.split(' ')[0]} Mess: {getOccupancyPercent(h)}% ({getCrowdLevel(h)}, ~{getHallAvgWaitMinutes(h)}m)
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Selected / Hovered 3D Complaint Readout Strip */}
      {displayedComplaint && (
        <div className="pointer-events-auto absolute right-3 top-3 z-10 max-w-xs rounded-xl border border-slate-200 bg-white/95 p-3 shadow-md sm:right-4 sm:top-4 dark:border-slate-700/80 dark:bg-[#0c1322]/95">
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-mono font-semibold text-navy-900 dark:text-sky-400">
              {displayedComplaint.id}
            </span>
            <PriorityReadout priority={displayedComplaint.priority} />
          </div>
          <p className="mt-1 truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
            {displayedComplaint.title}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
            {displayedComplaint.hostelName} {displayedComplaint.block} · Room{' '}
            {displayedComplaint.roomNumber}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <StatusReadout status={displayedComplaint.status} compact />
            {onOpenComplaintDetail && (
              <button
                type="button"
                onClick={() => onOpenComplaintDetail(displayedComplaint)}
                className="inline-flex items-center gap-1 rounded-md bg-navy-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-navy-800 whitespace-nowrap dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
              >
                <span>Open</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Collapsible Unified Bottom Control Dock */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex w-[min(860px,calc(100%-1.5rem))] -translate-x-1/2 flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          className="pointer-events-auto mb-1 inline-flex items-center gap-1 rounded-t-lg border border-b-0 border-slate-200 bg-white/95 px-3 py-1 text-[11px] font-medium text-slate-700 shadow-xs hover:bg-white dark:border-slate-700/80 dark:bg-[#0c1322]/95 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="h-3 w-3" />
              <span>Show 3D Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="pointer-events-auto flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-md dark:border-slate-700/80 dark:bg-[#0c1322]/95">
            {/* Camera Presets */}
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-900">
              {(
                [
                  { id: 'overview', label: 'Campus' },
                  { id: 'north', label: 'North Hall' },
                  { id: 'south', label: 'South Hall' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetClick(p.id)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                    preset === p.id
                      ? 'bg-navy-900 text-white dark:bg-sky-500 dark:text-slate-950'
                      : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Marker Filter */}
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-900">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'urgent', label: 'Urgent' },
                  { id: 'active', label: 'Active' },
                  { id: 'resolved', label: 'Resolved' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setMarkerFilter(f.id)}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                    markerFilter === f.id
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-sky-300'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Futuristic Spatial Controls: Exploded Floors, Blueprint Wireframe, Orbit, Reset */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setExploded((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                  exploded
                    ? 'border-navy-900 bg-navy-900 text-white dark:border-sky-500 dark:bg-sky-500 dark:text-slate-950'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Explode</span>
              </button>

              <button
                type="button"
                onClick={() => setWireframe((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                  wireframe
                    ? 'border-navy-900 bg-navy-900 text-white dark:border-sky-500 dark:bg-sky-500 dark:text-slate-950'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <Grid className="h-3.5 w-3.5" />
                <span>Blueprint</span>
              </button>

              <button
                type="button"
                onClick={() => setAutoOrbit((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                  autoOrbit
                    ? 'border-navy-900 bg-navy-900 text-white dark:border-sky-500 dark:bg-sky-500 dark:text-slate-950'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
                title="Toggle camera orbit"
                aria-label="Toggle camera orbit"
              >
                {autoOrbit ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setExploded(false);
                  setWireframe(false);
                  setAutoOrbit(false);
                  setActiveComplaint(null);
                  handlePresetClick('overview');
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                title="Reset 3D camera"
                aria-label="Reset 3D camera"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
