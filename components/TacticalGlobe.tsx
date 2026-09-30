"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  Fugitive,
  DistressCall,
  TracerHotspot,
  RadioStation,
  TvChannel,
  GlobeLayerMode,
} from "@/lib/types";
import { playScannerBlip, enableAudio } from "@/lib/sound";
import {
  Crosshair,
  MapPin,
  Eye,
  RotateCw,
  PlaneTakeoff,
  Radio,
  Tv,
  AlertOctagon,
  Flame,
  Volume2,
  VolumeX,
  ExternalLink,
} from "lucide-react";

interface TacticalGlobeProps {
  activeMode: GlobeLayerMode;
  fugitives: Fugitive[];
  distressCalls?: DistressCall[];
  tracerHotspots?: TracerHotspot[];
  radioStations?: RadioStation[];
  tvChannels?: TvChannel[];
  onSelectFugitive?: (fugitive: Fugitive) => void;
  onSelectDistressCall?: (call: DistressCall) => void;
  onSelectRadioStation?: (station: RadioStation) => void;
  onSelectTvChannel?: (channel: TvChannel) => void;
  selectedFugitive?: Fugitive | null;
  selectedRadioStation?: RadioStation | null;
  selectedTvChannel?: TvChannel | null;
}

const GLOBE_RADIUS = 75;

// Coordinate conversion helper
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export default function TacticalGlobe({
  activeMode,
  fugitives,
  distressCalls = [],
  tracerHotspots = [],
  radioStations = [],
  tvChannels = [],
  onSelectFugitive,
  onSelectDistressCall,
  onSelectRadioStation,
  onSelectTvChannel,
  selectedFugitive,
  selectedRadioStation,
  selectedTvChannel,
}: TacticalGlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [scannerMuted, setScannerMuted] = useState(false);

  // Active target state for bottom HUD cards
  const [activeFugitive, setActiveFugitive] = useState<Fugitive | null>(selectedFugitive || null);
  const [activeCall, setActiveCall] = useState<DistressCall | null>(null);
  const [activeHotspot, setActiveHotspot] = useState<TracerHotspot | null>(null);
  const [activeStation, setActiveStation] = useState<RadioStation | null>(selectedRadioStation || null);
  const [activeTv, setActiveTv] = useState<TvChannel | null>(selectedTvChannel || null);

  // Hover Tooltip
  const [hoveredInfo, setHoveredInfo] = useState<{
    title: string;
    subtitle: string;
    badge: string;
    badgeColor: string;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const targetRotationRef = useRef<{ x: number; y: number } | null>(null);
  const arcCurvesRef = useRef<{ curve: THREE.QuadraticBezierCurve3; particle: THREE.Mesh }[]>([]);

  // Layer Groups
  const fbiGroupRef = useRef<THREE.Group | null>(null);
  const distressGroupRef = useRef<THREE.Group | null>(null);
  const tracerGroupRef = useRef<THREE.Group | null>(null);
  const radioGroupRef = useRef<THREE.Group | null>(null);
  const tvGroupRef = useRef<THREE.Group | null>(null);

  // Interactive targets array for active mode raycasting
  const interactiveMeshesRef = useRef<THREE.Object3D[]>([]);

  // Refs for callbacks and toggles so listeners never go stale
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;
  const scannerMutedRef = useRef(scannerMuted);
  scannerMutedRef.current = scannerMuted;
  const onSelectFugitiveRef = useRef(onSelectFugitive);
  onSelectFugitiveRef.current = onSelectFugitive;
  const onSelectDistressCallRef = useRef(onSelectDistressCall);
  onSelectDistressCallRef.current = onSelectDistressCall;
  const onSelectRadioStationRef = useRef(onSelectRadioStation);
  onSelectRadioStationRef.current = onSelectRadioStation;
  const onSelectTvChannelRef = useRef(onSelectTvChannel);
  onSelectTvChannelRef.current = onSelectTvChannel;

  // Focus globe camera smoothly on a lat/lng coordinate
  const focusOnCoordinates = useCallback((lat: number, lng: number) => {
    setAutoRotate(false);
    const targetY = -((lng * Math.PI) / 180) - Math.PI / 2;
    const targetX = ((lat * Math.PI) / 180) * 0.65;
    targetRotationRef.current = { x: targetX, y: targetY };
  }, []);

  // Update target focus when parent selections change
  useEffect(() => {
    if (selectedFugitive) {
      setActiveFugitive(selectedFugitive);
      const loc = selectedFugitive.crime_location || selectedFugitive.escape_location;
      if (loc) focusOnCoordinates(loc.lat, loc.lng);
    }
  }, [selectedFugitive, focusOnCoordinates]);

  useEffect(() => {
    if (selectedRadioStation) {
      setActiveStation(selectedRadioStation);
      focusOnCoordinates(selectedRadioStation.lat, selectedRadioStation.lon);
    }
  }, [selectedRadioStation, focusOnCoordinates]);

  useEffect(() => {
    if (selectedTvChannel) {
      setActiveTv(selectedTvChannel);
      focusOnCoordinates(selectedTvChannel.lat, selectedTvChannel.lon);
    }
  }, [selectedTvChannel, focusOnCoordinates]);

  // Main Three.js Scene Setup (Runs ONCE on mount)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 240;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // 1. Base Dark Tactical Sphere
    const sphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x050c18,
      transparent: true,
      opacity: 0.96,
    });
    const baseSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    globeGroup.add(baseSphere);

    // 2. Real Natural Earth Country Vector Boundaries (286 Sovereign Rings)
    fetch("/countries.json")
      .then((res) => res.json())
      .then((lineRings: [number, number][][]) => {
        const linePoints: THREE.Vector3[] = [];
        lineRings.forEach((ring) => {
          for (let i = 0; i < ring.length - 1; i++) {
            const p1 = latLngToVector3(ring[i][1], ring[i][0], GLOBE_RADIUS + 0.35);
            const p2 = latLngToVector3(ring[i + 1][1], ring[i + 1][0], GLOBE_RADIUS + 0.35);
            linePoints.push(p1, p2);
          }
        });
        const countryGeom = new THREE.BufferGeometry().setFromPoints(linePoints);
        const countryMat = new THREE.LineBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.65,
        });
        const countryLines = new THREE.LineSegments(countryGeom, countryMat);
        globeGroup.add(countryLines);
      })
      .catch((err) => console.error("Failed to load country boundaries:", err));

    // 3. Tactical Outer Wireframe & Atmospheric Rim Glow
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x1e3a5f,
      wireframe: true,
      transparent: true,
      opacity: 0.16,
    });
    const wireframeSphere = new THREE.Mesh(sphereGeometry, wireframeMaterial);
    globeGroup.add(wireframeSphere);

    const atmosphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.05, 32, 32);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.14, 0.6, 1.0, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Instantiate 5 Layer Groups
    const fbiGroup = new THREE.Group();
    globeGroup.add(fbiGroup);
    fbiGroupRef.current = fbiGroup;

    const distressGroup = new THREE.Group();
    globeGroup.add(distressGroup);
    distressGroupRef.current = distressGroup;

    const tracerGroup = new THREE.Group();
    globeGroup.add(tracerGroup);
    tracerGroupRef.current = tracerGroup;

    const radioGroup = new THREE.Group();
    globeGroup.add(radioGroup);
    radioGroupRef.current = radioGroup;

    const tvGroup = new THREE.Group();
    globeGroup.add(tvGroup);
    tvGroupRef.current = tvGroup;

    // Mouse Drag & Raycast Interaction
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      targetRotationRef.current = null;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouseRef.current.set(x, y);

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        globeGroup.rotation.y += deltaX * 0.005;
        globeGroup.rotation.x += deltaY * 0.005;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      } else {
        raycasterRef.current.setFromCamera(mouseRef.current, camera);
        const intersects = raycasterRef.current.intersectObjects(
          interactiveMeshesRef.current.filter((o) => o instanceof THREE.Mesh)
        );

        if (intersects.length > 0) {
          const hit = intersects[0].object as any;
          const u = hit.userData;
          if (u.mode === "fbi") {
            setHoveredInfo({
              title: u.fugitive.title,
              subtitle: u.type === "crime" ? u.fugitive.crime_location?.name || "" : u.fugitive.escape_location?.name || "",
              badge: u.fugitive.reward_formatted,
              badgeColor: "text-amber-400 bg-amber-500/20 border-amber-500/40",
              screenX: e.clientX,
              screenY: e.clientY,
            });
          } else if (u.mode === "distress") {
            setHoveredInfo({
              title: u.call.desc,
              subtitle: `${u.call.city}, ${u.call.state} (${u.call.kind.toUpperCase()})`,
              badge: u.call.sev >= 3 ? "FELONY CALL" : "ACTIVE 911",
              badgeColor: u.call.sev >= 3 ? "text-red-400 bg-red-500/20 border-red-500/40" : "text-cyan-400 bg-cyan-500/20 border-cyan-500/40",
              screenX: e.clientX,
              screenY: e.clientY,
            });
          } else if (u.mode === "tracer") {
            setHoveredInfo({
              title: `Combat Cluster (${u.hotspot.e} strikes)`,
              subtitle: `Lat: ${u.hotspot.la}°, Lon: ${u.hotspot.lo}°`,
              badge: `${u.hotspot.n} CASUALTIES`,
              badgeColor: "text-rose-400 bg-rose-500/20 border-rose-500/40",
              screenX: e.clientX,
              screenY: e.clientY,
            });
          } else if (u.mode === "radio") {
            setHoveredInfo({
              title: u.station.name,
              subtitle: `Country: ${u.station.cc} • Click to stream live`,
              badge: "RADIO STATION",
              badgeColor: "text-emerald-400 bg-emerald-500/20 border-emerald-500/40",
              screenX: e.clientX,
              screenY: e.clientY,
            });
          } else if (u.mode === "tv") {
            setHoveredInfo({
              title: u.channel.name,
              subtitle: `Category: ${u.channel.cat} • Click to watch live`,
              badge: "LIVE TV STREAM",
              badgeColor: "text-purple-400 bg-purple-500/20 border-purple-500/40",
              screenX: e.clientX,
              screenY: e.clientY,
            });
          }
          container.style.cursor = "pointer";
        } else {
          setHoveredInfo(null);
          container.style.cursor = "grab";
        }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = Math.abs(e.clientX - previousMousePosition.x);
        const deltaY = Math.abs(e.clientY - previousMousePosition.y);
        if (deltaX < 3 && deltaY < 3) {
          raycasterRef.current.setFromCamera(mouseRef.current, camera);
          const intersects = raycasterRef.current.intersectObjects(
            interactiveMeshesRef.current.filter((o) => o instanceof THREE.Mesh)
          );
          if (intersects.length > 0) {
            const hit = intersects[0].object as any;
            const u = hit.userData;
            if (u.mode === "fbi") {
              setActiveFugitive(u.fugitive);
              if (onSelectFugitiveRef.current) onSelectFugitiveRef.current(u.fugitive);
            } else if (u.mode === "distress") {
              setActiveCall(u.call);
              if (!scannerMutedRef.current) playScannerBlip(u.call.sev);
              if (onSelectDistressCallRef.current) onSelectDistressCallRef.current(u.call);
            } else if (u.mode === "tracer") {
              setActiveHotspot(u.hotspot);
            } else if (u.mode === "radio") {
              setActiveStation(u.station);
              if (onSelectRadioStationRef.current) onSelectRadioStationRef.current(u.station);
            } else if (u.mode === "tv") {
              setActiveTv(u.channel);
              if (onSelectTvChannelRef.current) onSelectTvChannelRef.current(u.channel);
            }
          }
        }
      }
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(130, Math.min(360, camera.position.z + e.deltaY * 0.2));
    };
    dom.addEventListener("wheel", onWheel, { passive: false });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Smooth Tween Rotation towards target coordinates
      if (targetRotationRef.current) {
        const diffY = targetRotationRef.current.y - globeGroup.rotation.y;
        const diffX = targetRotationRef.current.x - globeGroup.rotation.x;
        globeGroup.rotation.y += diffY * 0.08;
        globeGroup.rotation.x += diffX * 0.08;
        if (Math.abs(diffY) < 0.005 && Math.abs(diffX) < 0.005) {
          targetRotationRef.current = null;
        }
      } else if (autoRotateRef.current && !isDragging) {
        globeGroup.rotation.y += delta * 0.12;
      }

      // Animate flight drone particles
      if (fbiGroupRef.current?.visible) {
        arcCurvesRef.current.forEach(({ curve, particle }, index) => {
          const speed = 0.25;
          const progress = (elapsedTime * speed + index * 0.15) % 1.0;
          particle.position.copy(curve.getPointAt(progress));
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      dom.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      dom.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, []);

  // Update Layer Mesh Visibility & Raycasting on Mode Switch (<1ms instant switch)
  useEffect(() => {
    if (fbiGroupRef.current) fbiGroupRef.current.visible = activeMode === "fbi";
    if (distressGroupRef.current) distressGroupRef.current.visible = activeMode === "distress";
    if (tracerGroupRef.current) tracerGroupRef.current.visible = activeMode === "tracer";
    if (radioGroupRef.current) radioGroupRef.current.visible = activeMode === "radio";
    if (tvGroupRef.current) tvGroupRef.current.visible = activeMode === "tv";

    if (activeMode === "fbi") interactiveMeshesRef.current = fbiGroupRef.current?.children || [];
    else if (activeMode === "distress") interactiveMeshesRef.current = distressGroupRef.current?.children || [];
    else if (activeMode === "tracer") interactiveMeshesRef.current = tracerGroupRef.current?.children || [];
    else if (activeMode === "radio") interactiveMeshesRef.current = radioGroupRef.current?.children || [];
    else if (activeMode === "tv") interactiveMeshesRef.current = tvGroupRef.current?.children || [];

    setHoveredInfo(null);
  }, [activeMode]);

  // Populate FBI Group
  useEffect(() => {
    const group = fbiGroupRef.current;
    if (!group) return;
    group.clear();

    const arcCurves: { curve: THREE.QuadraticBezierCurve3; particle: THREE.Mesh }[] = [];

    fugitives.forEach((fugitive) => {
      const crime = fugitive.crime_location;
      const escape = fugitive.escape_location;

      if (crime) {
        const crimePos = latLngToVector3(crime.lat, crime.lng, GLOBE_RADIUS + 0.8);
        const pinGeom = new THREE.SphereGeometry(1.6, 12, 12);
        const pinMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const crimeMesh = new THREE.Mesh(pinGeom, pinMat);
        crimeMesh.position.copy(crimePos);
        (crimeMesh as any).userData = {
          mode: "fbi",
          type: "crime",
          fugitive,
        };
        group.add(crimeMesh);

        // Pulsing ring
        const ringGeom = new THREE.RingGeometry(2.0, 2.7, 16);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65,
        });
        const ringMesh = new THREE.Mesh(ringGeom, ringMat);
        ringMesh.position.copy(crimePos);
        ringMesh.lookAt(new THREE.Vector3(0, 0, 0));
        group.add(ringMesh);

        if (escape) {
          const escapePos = latLngToVector3(escape.lat, escape.lng, GLOBE_RADIUS + 0.8);
          const escGeom = new THREE.SphereGeometry(1.5, 12, 12);
          const escMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
          const escapeMesh = new THREE.Mesh(escGeom, escMat);
          escapeMesh.position.copy(escapePos);
          (escapeMesh as any).userData = {
            mode: "fbi",
            type: "escape",
            fugitive,
          };
          group.add(escapeMesh);

          // Flight arc
          const midVec = new THREE.Vector3().addVectors(crimePos, escapePos).multiplyScalar(0.5);
          const distance = crimePos.distanceTo(escapePos);
          const elevation = Math.min(distance * 0.45, 38);
          midVec.normalize().multiplyScalar(GLOBE_RADIUS + elevation);

          const curve = new THREE.QuadraticBezierCurve3(crimePos, midVec, escapePos);
          const points = curve.getPoints(50);
          const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
          const lineMat = new THREE.LineBasicMaterial({
            color: 0xf59e0b,
            transparent: true,
            opacity: 0.65,
          });
          const arcLine = new THREE.Line(lineGeom, lineMat);
          group.add(arcLine);

          // Moving drone particle
          const particleGeom = new THREE.SphereGeometry(0.9, 8, 8);
          const particleMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
          const particle = new THREE.Mesh(particleGeom, particleMat);
          group.add(particle);
          arcCurves.push({ curve, particle });
        }
      }
    });

    arcCurvesRef.current = arcCurves;
    if (activeMode === "fbi") interactiveMeshesRef.current = group.children;
  }, [fugitives, activeMode]);

  // Populate Distress Layer
  useEffect(() => {
    const group = distressGroupRef.current;
    if (!group) return;
    group.clear();

    const activeCallsSlice = distressCalls.slice(0, 400);
    activeCallsSlice.forEach((call) => {
      const pos = latLngToVector3(call.lat, call.lon, GLOBE_RADIUS + 0.6);
      const isFelony = call.sev >= 3;
      const isFire = call.kind === "fire";
      const color = isFelony ? 0xef4444 : isFire ? 0xf97316 : 0x06b6d4;

      const dotGeom = new THREE.SphereGeometry(isFelony ? 1.5 : 1.1, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({ color });
      const dotMesh = new THREE.Mesh(dotGeom, dotMat);
      dotMesh.position.copy(pos);
      (dotMesh as any).userData = {
        mode: "distress",
        call,
      };
      group.add(dotMesh);
    });

    if (activeMode === "distress") interactiveMeshesRef.current = group.children;
  }, [distressCalls, activeMode]);

  // Populate Tracer Layer
  useEffect(() => {
    const group = tracerGroupRef.current;
    if (!group) return;
    group.clear();

    tracerHotspots.forEach((h) => {
      const pos = latLngToVector3(h.la, h.lo, GLOBE_RADIUS + 0.7);
      const scale = Math.min(1.2 + Math.log10(h.n + 1) * 0.9, 4.2);
      const geom = new THREE.SphereGeometry(scale, 10, 10);
      const mat = new THREE.MeshBasicMaterial({
        color: h.n > 200 ? 0xdc2626 : 0xea580c,
        transparent: true,
        opacity: 0.85,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      (mesh as any).userData = {
        mode: "tracer",
        hotspot: h,
      };
      group.add(mesh);
    });

    if (activeMode === "tracer") interactiveMeshesRef.current = group.children;
  }, [tracerHotspots, activeMode]);

  // Populate Radio Layer
  useEffect(() => {
    const group = radioGroupRef.current;
    if (!group) return;
    group.clear();

    radioStations.slice(0, 500).forEach((st) => {
      const pos = latLngToVector3(st.lat, st.lon, GLOBE_RADIUS + 0.6);
      const geom = new THREE.SphereGeometry(1.2, 8, 8);
      const mat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      (mesh as any).userData = {
        mode: "radio",
        station: st,
      };
      group.add(mesh);
    });

    if (activeMode === "radio") interactiveMeshesRef.current = group.children;
  }, [radioStations, activeMode]);

  // Populate TV Layer
  useEffect(() => {
    const group = tvGroupRef.current;
    if (!group) return;
    group.clear();

    tvChannels.slice(0, 400).forEach((ch) => {
      const pos = latLngToVector3(ch.lat, ch.lon, GLOBE_RADIUS + 0.6);
      const geom = new THREE.BoxGeometry(1.8, 1.2, 1.2);
      const mat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      (mesh as any).userData = {
        mode: "tv",
        channel: ch,
      };
      group.add(mesh);
    });

    if (activeMode === "tv") interactiveMeshesRef.current = group.children;
  }, [tvChannels, activeMode]);

  return (
    <div className="w-full space-y-4 font-mono">
      {/* 3D Viewport Container */}
      <div className="relative w-full h-[560px] md:h-[640px] bg-neutral-950/90 rounded-2xl border border-neutral-800 overflow-hidden shadow-2xl backdrop-blur-md">
        {/* Top-Left Telemetry & HUD */}
        <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-neutral-900/90 border border-neutral-700/80 px-3 py-1.5 rounded-lg text-xs text-neutral-300 backdrop-blur">
            <Crosshair className="w-4 h-4 text-red-500 animate-spin" />
            <span className="font-semibold text-white tracking-widest uppercase">
              {activeMode === "fbi" && "FBI Wanted Radar"}
              {activeMode === "distress" && "Distress 911 CAD Dispatch"}
              {activeMode === "tracer" && "Tracer Conflict War Map"}
              {activeMode === "radio" && "Sky Dial World Radio Tuner"}
              {activeMode === "tv" && "Sky Dial TV Livestreams"}
            </span>
          </div>

          <button
            onClick={() => {
              targetRotationRef.current = null;
              setAutoRotate((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
              autoRotate
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-neutral-800/80 border-neutral-700 text-neutral-400"
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? "animate-spin" : ""}`} />
            {autoRotate ? "Orbiting" : "Paused"}
          </button>

          {activeMode === "distress" && (
            <button
              onClick={async () => {
                await enableAudio();
                setScannerMuted((prev) => !prev);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
                !scannerMuted
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-neutral-800/80 border-neutral-700 text-neutral-400"
              }`}
            >
              {!scannerMuted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              {!scannerMuted ? "Scanner Sound ON" : "Muted"}
            </button>
          )}
        </div>

        {/* Top-Right Mode Legend */}
        <div className="absolute top-4 right-4 z-10 hidden sm:flex flex-col gap-1.5 bg-neutral-900/90 border border-neutral-800 p-2.5 rounded-xl text-[11px] text-neutral-300 backdrop-blur shadow-lg">
          {activeMode === "fbi" && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
                <span>Crime Origin Beacon</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
                <span>Suspected Haven Beacon</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 bg-amber-400/80 rounded" />
                <span>3D Flight Trajectory Arc</span>
              </div>
            </>
          )}
          {activeMode === "distress" && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
                <span>Violent Felony / Priority</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]" />
                <span>Structure Fire / Rescue</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span>Routine Police / Traffic</span>
              </div>
            </>
          )}
          {activeMode === "tracer" && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_8px_#dc2626]" />
                <span>Active War / High Casualties</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span>Armed Clashes / Cartel Strikes</span>
              </div>
            </>
          )}
          {activeMode === "radio" && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <span>Live Streaming Radio Station</span>
            </div>
          )}
          {activeMode === "tv" && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_#8b5cf6]" />
              <span>Live Public TV / Webcam Feed</span>
            </div>
          )}
        </div>

        {/* Three.js Canvas Mount */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Bottom Context HUD Cards */}
        {/* FBI Target Locked Banner */}
        {activeMode === "fbi" && activeFugitive && (
          <div className="absolute bottom-4 left-4 right-4 z-20 bg-neutral-900/95 border border-red-500/50 p-4 rounded-xl shadow-2xl backdrop-blur flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={activeFugitive.images[0]?.thumb || activeFugitive.images[0]?.large}
                alt={activeFugitive.title}
                className="w-12 h-12 rounded-lg object-cover border border-neutral-700 shrink-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                    TARGET LOCKED
                  </span>
                  <span className="text-xs text-amber-400 font-bold">
                    {activeFugitive.reward_formatted}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white line-clamp-1 mt-0.5">
                  {activeFugitive.title}
                </h4>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-400 mt-1">
                  {activeFugitive.crime_location && (
                    <span className="flex items-center gap-1 text-red-400">
                      <MapPin className="w-3 h-3" /> Crime: {activeFugitive.crime_location.name}
                    </span>
                  )}
                  {activeFugitive.escape_location && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <PlaneTakeoff className="w-3 h-3" /> Haven: {activeFugitive.escape_location.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {onSelectFugitive && (
              <button
                onClick={() => onSelectFugitive(activeFugitive)}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-lg whitespace-nowrap flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" /> Open Classified Dossier
              </button>
            )}
          </div>
        )}

        {/* Distress CAD Call Banner */}
        {activeMode === "distress" && activeCall && (
          <div className="absolute bottom-4 left-4 right-4 z-20 bg-neutral-900/95 border border-cyan-500/50 p-4 rounded-xl shadow-2xl backdrop-blur flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                    activeCall.sev >= 3
                      ? "bg-red-500/20 text-red-400 border-red-500/40"
                      : "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                  }`}
                >
                  {activeCall.kind.toUpperCase()} DISPATCH
                </span>
                <span className="text-xs text-neutral-400">{new Date(activeCall.ts).toLocaleTimeString()}</span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1">{activeCall.desc}</h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Location: {activeCall.city}, {activeCall.state}
              </p>
            </div>
            <button
              onClick={() => playScannerBlip(activeCall.sev)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-lg whitespace-nowrap flex items-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5" /> Replay Scanner Audio
            </button>
          </div>
        )}

        {/* Radio Station Player Bar */}
        {activeMode === "radio" && activeStation && (
          <div className="absolute bottom-4 left-4 right-4 z-20 bg-neutral-900/95 border border-emerald-500/50 p-4 rounded-xl shadow-2xl backdrop-blur flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
                  NOW TUNED IN ({activeStation.cc})
                </span>
                <h4 className="text-sm font-bold text-white line-clamp-1">{activeStation.name}</h4>
              </div>
            </div>
            <audio src={activeStation.url} controls autoPlay className="max-w-xs h-8" />
          </div>
        )}

        {/* TV Channel Player Modal */}
        {activeMode === "tv" && activeTv && (
          <div className="absolute bottom-4 left-4 right-4 z-20 bg-neutral-900/95 border border-purple-500/50 p-4 rounded-xl shadow-2xl backdrop-blur flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                <Tv className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block">
                  LIVE BROADCAST ({activeTv.cat.toUpperCase()})
                </span>
                <h4 className="text-sm font-bold text-white line-clamp-1">{activeTv.name}</h4>
              </div>
            </div>
            <a
              href={activeTv.url}
              target="_blank"
              rel="noreferrer"
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-lg whitespace-nowrap flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Watch Live Stream
            </a>
          </div>
        )}

        {/* Tracer Conflict Card */}
        {activeMode === "tracer" && activeHotspot && (
          <div className="absolute bottom-4 left-4 right-4 z-20 bg-neutral-900/95 border border-red-500/50 p-4 rounded-xl shadow-2xl backdrop-blur flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block">
                UCDP CONFLICT HOTSPOT
              </span>
              <h4 className="text-sm font-bold text-white mt-1">
                {activeHotspot.e} Armed Combat Events Recorded
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Coordinates: {activeHotspot.la}° N, {activeHotspot.lo}° E
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-neutral-400 block uppercase">Recorded Casualties</span>
              <span className="text-2xl font-black text-rose-500">{activeHotspot.n.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Hover Floating Tooltip */}
      {hoveredInfo && (
        <div
          className="fixed pointer-events-none z-50 bg-neutral-900/95 border border-neutral-700 p-3 rounded-xl shadow-2xl backdrop-blur-md max-w-xs text-xs transform -translate-x-1/2 -translate-y-full mb-3"
          style={{
            left: `${hoveredInfo.screenX}px`,
            top: `${hoveredInfo.screenY}px`,
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-1 mb-1">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${hoveredInfo.badgeColor}`}>
              {hoveredInfo.badge}
            </span>
          </div>
          <p className="font-bold text-white text-sm line-clamp-1">{hoveredInfo.title}</p>
          <p className="text-neutral-400 text-[11px] mt-1 line-clamp-2">{hoveredInfo.subtitle}</p>
        </div>
      )}
    </div>
  );
}
