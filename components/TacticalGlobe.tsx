"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Fugitive } from "@/lib/types";
import {
  Crosshair,
  MapPin,
  Eye,
  RotateCw,
  PlaneTakeoff,
  ChevronRight,
} from "lucide-react";

interface TacticalGlobeProps {
  fugitives: Fugitive[];
  onSelectFugitive: (fugitive: Fugitive) => void;
  selectedFugitive?: Fugitive | null;
}

export default function TacticalGlobe({
  fugitives,
  onSelectFugitive,
  selectedFugitive,
}: TacticalGlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredTarget, setHoveredTarget] = useState<{
    fugitive: Fugitive;
    type: "crime" | "escape";
    locationName: string;
    screenX: number;
    screenY: number;
  } | null>(null);

  const [activeFugitive, setActiveFugitive] = useState<Fugitive | null>(
    selectedFugitive || null
  );
  const [autoRotate, setAutoRotate] = useState(true);

  // References for Three.js state
  const sceneRef = useRef<THREE.Scene | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const interactiveObjectsRef = useRef<THREE.Mesh[]>([]);
  const targetRotationRef = useRef<{ x: number; y: number } | null>(null);
  const arcCurvesRef = useRef<{ curve: THREE.QuadraticBezierCurve3; particle: THREE.Mesh }[]>([]);

  // Filter fugitives who have mapped coordinates for the roster
  const mappedFugitives = React.useMemo(() => {
    return fugitives.filter((f) => f.crime_location);
  }, [fugitives]);

  // Focus globe rotation on a specific fugitive
  const focusOnFugitive = React.useCallback((f: Fugitive) => {
    setActiveFugitive(f);
    setAutoRotate(false);

    const targetLoc = f.crime_location || f.escape_location;
    if (!targetLoc) return;

    // Calculate rotation angles to center coordinates towards camera (+Z)
    const targetY = -((targetLoc.lng * Math.PI) / 180) - Math.PI / 2;
    const targetX = ((targetLoc.lat * Math.PI) / 180) * 0.65;

    targetRotationRef.current = { x: targetX, y: targetY };
  }, []);

  // Sync external selectedFugitive prop
  useEffect(() => {
    if (selectedFugitive) {
      focusOnFugitive(selectedFugitive);
    }
  }, [selectedFugitive, focusOnFugitive]);

  // Coordinate conversion utility
  const latLngToVector3 = (lat: number, lng: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 240;
    cameraRef.current = camera;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. Globe Container Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    const GLOBE_RADIUS = 75;

    // 4. Base Tactical Sphere
    const sphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x050c18,
      transparent: true,
      opacity: 0.96,
    });
    const baseSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    globeGroup.add(baseSphere);

    // 5. Authentic World Country Vector Boundaries (Natural Earth 195+ Countries)
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
          color: 0x38bdf8, // glowing tactical cyan
          transparent: true,
          opacity: 0.65,
          linewidth: 1,
        });
        const countryLines = new THREE.LineSegments(countryGeom, countryMat);
        globeGroup.add(countryLines);
      })
      .catch((err) => console.error("Failed to load country boundaries:", err));

    // Tactical Wireframe Outer Shell
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x1e3a5f,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const wireframeSphere = new THREE.Mesh(sphereGeometry, wireframeMaterial);
    globeGroup.add(wireframeSphere);

    // Glowing Atmosphere Rim
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

    // 5. Build Flight Trajectory Arcs & Particle Trackers
    const clickableObjects: THREE.Mesh[] = [];
    const arcCurves: { curve: THREE.QuadraticBezierCurve3; particle: THREE.Mesh }[] = [];

    mappedFugitives.forEach((fugitive) => {
      const crime = fugitive.crime_location;
      const escape = fugitive.escape_location;

      if (crime) {
        const crimePos = latLngToVector3(crime.lat, crime.lng, GLOBE_RADIUS + 0.8);

        // Crime location pin (Red beacon)
        const pinGeom = new THREE.SphereGeometry(1.6, 14, 14);
        const pinMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const crimeMesh = new THREE.Mesh(pinGeom, pinMat);
        crimeMesh.position.copy(crimePos);
        (crimeMesh as any).userData = {
          fugitive,
          type: "crime",
          locationName: crime.name,
        };
        globeGroup.add(crimeMesh);
        clickableObjects.push(crimeMesh);

        // Pulsing Crime Radar Ring
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
        globeGroup.add(ringMesh);

        if (escape) {
          const escapePos = latLngToVector3(escape.lat, escape.lng, GLOBE_RADIUS + 0.8);

          // Suspected Escape Pin (Amber beacon)
          const escapeGeom = new THREE.SphereGeometry(1.5, 14, 14);
          const escapeMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
          const escapeMesh = new THREE.Mesh(escapeGeom, escapeMat);
          escapeMesh.position.copy(escapePos);
          (escapeMesh as any).userData = {
            fugitive,
            type: "escape",
            locationName: escape.name,
          };
          globeGroup.add(escapeMesh);
          clickableObjects.push(escapeMesh);

          // Flight trajectory arc elevated above sphere
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
          globeGroup.add(arcLine);

          // Dynamic Particle Drone traveling along arc
          const particleGeom = new THREE.SphereGeometry(0.9, 8, 8);
          const particleMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
          const particle = new THREE.Mesh(particleGeom, particleMat);
          globeGroup.add(particle);

          arcCurves.push({ curve, particle });
        }
      }
    });

    interactiveObjectsRef.current = clickableObjects;
    arcCurvesRef.current = arcCurves;

    // 6. Mouse Interaction: Drag rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      targetRotationRef.current = null; // Clear auto-targeting on manual drag
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
        // Raycast for hover tooltip
        raycasterRef.current.setFromCamera(mouseRef.current, camera);
        const intersects = raycasterRef.current.intersectObjects(clickableObjects);

        if (intersects.length > 0) {
          const hit = intersects[0].object as any;
          setHoveredTarget({
            fugitive: hit.userData.fugitive,
            type: hit.userData.type,
            locationName: hit.userData.locationName,
            screenX: e.clientX,
            screenY: e.clientY,
          });
          container.style.cursor = "pointer";
        } else {
          setHoveredTarget(null);
          container.style.cursor = "grab";
        }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = Math.abs(e.clientX - previousMousePosition.x);
        const deltaY = Math.abs(e.clientY - previousMousePosition.y);
        if (deltaX < 3 && deltaY < 3) {
          // Click on beacon pin
          raycasterRef.current.setFromCamera(mouseRef.current, camera);
          const intersects = raycasterRef.current.intersectObjects(clickableObjects);
          if (intersects.length > 0) {
            const hit = intersects[0].object as any;
            if (hit.userData?.fugitive) {
              focusOnFugitive(hit.userData.fugitive);
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

    // Zoom on wheel
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(130, Math.min(360, camera.position.z + e.deltaY * 0.2));
    };
    dom.addEventListener("wheel", onWheel, { passive: false });

    // Window Resize
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // 7. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Smooth Tween Rotation towards targeted fugitive
      if (targetRotationRef.current) {
        const diffY = targetRotationRef.current.y - globeGroup.rotation.y;
        const diffX = targetRotationRef.current.x - globeGroup.rotation.x;

        globeGroup.rotation.y += diffY * 0.08;
        globeGroup.rotation.x += diffX * 0.08;

        if (Math.abs(diffY) < 0.005 && Math.abs(diffX) < 0.005) {
          targetRotationRef.current = null;
        }
      } else if (autoRotate && !isDragging) {
        globeGroup.rotation.y += delta * 0.12;
      }

      // Animate flight particles along arcs
      arcCurvesRef.current.forEach(({ curve, particle }, index) => {
        const speed = 0.25;
        const progress = (elapsedTime * speed + index * 0.15) % 1.0;
        particle.position.copy(curve.getPointAt(progress));
      });

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
  }, [mappedFugitives, autoRotate]);

  return (
    <div className="w-full space-y-6">
      {/* Globe & Tactical Drawer Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D Tactical Globe Viewport */}
        <div className="lg:col-span-8 relative h-[560px] md:h-[640px] bg-neutral-950/90 rounded-2xl border border-neutral-800 overflow-hidden shadow-2xl backdrop-blur-md">
          {/* Tactical HUD Header */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-neutral-900/90 border border-neutral-700/80 px-3 py-1.5 rounded-lg text-xs font-mono text-neutral-300 backdrop-blur">
              <Crosshair className="w-4 h-4 text-red-500 animate-spin" />
              <span className="font-semibold text-white tracking-widest uppercase">
                Crime & Escape Radar
              </span>
            </div>
            <button
              onClick={() => {
                targetRotationRef.current = null;
                setAutoRotate((prev) => !prev);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                autoRotate
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-neutral-800/80 border-neutral-700 text-neutral-400"
              }`}
              title="Toggle Auto-Orbit"
            >
              <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? "animate-spin" : ""}`} />
              {autoRotate ? "Orbiting" : "Paused"}
            </button>
          </div>

          {/* Tactical Legend */}
          <div className="absolute top-4 right-4 z-10 hidden sm:flex flex-col gap-1.5 bg-neutral-900/90 border border-neutral-800 p-2.5 rounded-xl text-[11px] font-mono text-neutral-300 backdrop-blur shadow-lg">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
              <span>Crime Origin Beacon</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
              <span>Suspected Haven / Last Seen</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 bg-amber-400/80 rounded" />
              <span>Flight Trajectory Vector</span>
            </div>
          </div>

          {/* Three.js Canvas */}
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Target Locked Banner */}
          {activeFugitive && (
            <div className="absolute bottom-4 left-4 right-4 z-20 bg-neutral-900/95 border border-red-500/50 p-4 rounded-xl shadow-2xl backdrop-blur flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono">
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

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelectFugitive(activeFugitive)}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-lg whitespace-nowrap flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> Open Classified Dossier
                </button>
              </div>
            </div>
          )}

          {/* Free Roam Hint */}
          {!activeFugitive && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-neutral-900/80 border border-neutral-800/80 px-4 py-1.5 rounded-full text-[11px] font-mono text-neutral-400 backdrop-blur pointer-events-none text-center">
              Drag to rotate • Scroll to zoom • Click beacons or select suspect from roster
            </div>
          )}
        </div>

        {/* Right: Tracked Flight Roster */}
        <div className="lg:col-span-4 bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 flex flex-col font-mono max-h-[640px] shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <PlaneTakeoff className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  International Flight Vectors
                </h3>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {mappedFugitives.length} high-profile targets with verified escape coordinates
              </p>
            </div>
          </div>

          {/* Fugitive Target List */}
          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {mappedFugitives.map((fugitive) => {
              const isSelected = activeFugitive?.uid === fugitive.uid;
              const hasArc = Boolean(fugitive.crime_location && fugitive.escape_location);

              return (
                <div
                  key={fugitive.uid}
                  onClick={() => focusOnFugitive(fugitive)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-red-500/10 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                      : "bg-neutral-950/70 border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-900/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={fugitive.images[0]?.thumb || fugitive.images[0]?.large}
                        alt={fugitive.title}
                        className="w-9 h-9 rounded-lg object-cover border border-neutral-800 shrink-0"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">
                          {fugitive.title}
                        </h4>
                        <span className="text-[11px] font-bold text-amber-400">
                          {fugitive.reward_formatted}
                        </span>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isSelected ? "text-red-400 translate-x-0.5" : "text-neutral-600"
                      }`}
                    />
                  </div>

                  {/* Flight Corridor Summary */}
                  {hasArc && (
                    <div className="mt-2.5 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[10px] text-neutral-400">
                      <div className="flex items-center gap-1 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                        <span className="truncate">{fugitive.crime_location?.name}</span>
                      </div>
                      <span className="text-neutral-600 px-1">&rarr;</span>
                      <div className="flex items-center gap-1 truncate text-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span className="truncate">{fugitive.escape_location?.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hover Floating Tooltip */}
      {hoveredTarget && (
        <div
          className="fixed pointer-events-none z-50 bg-neutral-900/95 border border-red-500/60 p-3 rounded-xl shadow-2xl backdrop-blur-md max-w-xs text-xs font-mono transform -translate-x-1/2 -translate-y-full mb-3"
          style={{
            left: `${hoveredTarget.screenX}px`,
            top: `${hoveredTarget.screenY}px`,
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-1.5 mb-1.5">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                hoveredTarget.type === "crime"
                  ? "bg-red-500/20 text-red-400 border border-red-500/40"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
              }`}
            >
              {hoveredTarget.type === "crime" ? "Crime Location" : "Suspected Haven"}
            </span>
            <span className="text-amber-400 font-bold">
              {hoveredTarget.fugitive.reward_formatted}
            </span>
          </div>
          <p className="font-bold text-white text-sm line-clamp-1">
            {hoveredTarget.fugitive.title}
          </p>
          <p className="text-neutral-400 text-[11px] mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-red-400 shrink-0" />
            {hoveredTarget.locationName}
          </p>
          <p className="text-neutral-500 text-[10px] mt-1.5 italic">
            Click pin to lock target on globe
          </p>
        </div>
      )}
    </div>
  );
}
