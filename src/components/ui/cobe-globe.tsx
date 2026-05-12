"use client";

import { useCallback, useEffect, useRef } from "react";
import createGlobe from "cobe";

export interface Marker {
  id: string;
  location: [number, number];
  label: string;
}

export interface Arc {
  id: string;
  from: [number, number];
  to: [number, number];
  label?: string;
}

export interface GlobeProps {
  markers?: Marker[];
  arcs?: Arc[];
  className?: string;
  markerColor?: [number, number, number];
  baseColor?: [number, number, number];
  arcColor?: [number, number, number];
  glowColor?: [number, number, number];
  dark?: number;
  mapBrightness?: number;
  markerSize?: number;
  markerElevation?: number;
  arcWidth?: number;
  arcHeight?: number;
  speed?: number;
  theta?: number;
  diffuse?: number;
  mapSamples?: number;
  focusLocation?: [number, number] | null;
  allowPointerInteraction?: boolean;
}

const { PI, sin, cos, atan2 } = Math;

function locationToCartesian([lat, lng]: [number, number]): [number, number, number] {
  const latRad = (lat * PI) / 180;
  const lngRad = (lng * PI) / 180 - PI;
  const c = cos(latRad);
  return [-c * cos(lngRad), sin(latRad), c * sin(lngRad)];
}

function normalizeAngle(angle: number): number {
  let next = angle;
  while (next <= -PI) next += PI * 2;
  while (next > PI) next -= PI * 2;
  return next;
}

function shortestAngleDelta(from: number, to: number): number {
  return normalizeAngle(to - from);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function locationToFocusAngles(location: [number, number]): { phi: number; theta: number } {
  const [x, y, z] = locationToCartesian(location);
  const phi = atan2(-x, z);
  const anchor = sin(phi) * x - cos(phi) * z;
  const theta = clamp(atan2(-y, anchor), -0.4, 0.4);
  return { phi, theta };
}

export function Globe({
  markers = [],
  arcs = [],
  className = "",
  markerColor = [0.3, 0.45, 0.85],
  baseColor = [1, 1, 1],
  arcColor = [0.3, 0.45, 0.85],
  glowColor = [0.94, 0.93, 0.91],
  dark = 0,
  mapBrightness = 10,
  markerSize = 0.03,
  markerElevation = 0.015,
  arcWidth = 0.5,
  arcHeight = 0.25,
  speed = 0.003,
  theta = 0.2,
  diffuse = 1.5,
  mapSamples = 16000,
  focusLocation = null,
  allowPointerInteraction = true
}: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const lastPointer = useRef<{ x: number; y: number; t: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const velocity = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const isPausedRef = useRef(false);
  const focusTargetRef = useRef<{ phi: number; theta: number } | null>(null);
  const focusSettledRef = useRef(true);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!allowPointerInteraction) return;
    pointerInteracting.current = { x: e.clientX, y: e.clientY };
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
    isPausedRef.current = true;
  }, [allowPointerInteraction]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (pointerInteracting.current === null) return;

    const deltaX = e.clientX - pointerInteracting.current.x;
    const deltaY = e.clientY - pointerInteracting.current.y;
    dragOffset.current = { phi: deltaX / 300, theta: deltaY / 1000 };

    const now = Date.now();
    if (lastPointer.current) {
      const dt = Math.max(now - lastPointer.current.t, 1);
      const maxVelocity = 0.15;
      velocity.current = {
        phi: Math.max(-maxVelocity, Math.min(maxVelocity, ((e.clientX - lastPointer.current.x) / dt) * 0.3)),
        theta: Math.max(-maxVelocity, Math.min(maxVelocity, ((e.clientY - lastPointer.current.y) / dt) * 0.08))
      };
    }

    lastPointer.current = { x: e.clientX, y: e.clientY, t: now };
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!allowPointerInteraction) return;
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi;
      thetaOffsetRef.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
      lastPointer.current = null;
    }

    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
    isPausedRef.current = false;
  }, [allowPointerInteraction]);

  useEffect(() => {
    if (!focusLocation) return;
    focusTargetRef.current = locationToFocusAngles(focusLocation);
    focusSettledRef.current = false;
  }, [focusLocation]);

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let globe: ReturnType<typeof createGlobe> | null = null;
    let animationId = 0;
    let resizeObserver: ResizeObserver | null = null;
    let phi = 0;

    const init = () => {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      globe = createGlobe(canvas, {
        devicePixelRatio: dpr,
        width,
        height: width,
        phi: 0,
        theta,
        dark,
        diffuse,
        mapSamples,
        mapBrightness,
        baseColor,
        markerColor,
        glowColor,
        markerElevation,
        markers: markers.map(marker => ({
          location: marker.location,
          size: markerSize,
          id: marker.id
        })),
        arcs: arcs.map(arc => ({
          from: arc.from,
          to: arc.to,
          id: arc.id
        })),
        arcColor,
        arcWidth,
        arcHeight,
        opacity: 0.9
      });

      const tick = () => {
        if (!isPausedRef.current) {
          const focusTarget = focusTargetRef.current;
          if (focusTarget && !focusSettledRef.current) {
            const currentPhi = phi + phiOffsetRef.current + dragOffset.current.phi;
            const currentTheta = theta + thetaOffsetRef.current + dragOffset.current.theta;
            const phiDelta = shortestAngleDelta(currentPhi, focusTarget.phi);
            const thetaDelta = focusTarget.theta - currentTheta;

            phiOffsetRef.current += phiDelta * 0.1;
            thetaOffsetRef.current += thetaDelta * 0.1;
            velocity.current.phi = 0;
            velocity.current.theta = 0;

            if (Math.abs(phiDelta) < 0.002 && Math.abs(thetaDelta) < 0.002) {
              focusSettledRef.current = true;
            }
          } else {
            phi += speed;
            if (Math.abs(velocity.current.phi) > 0.0001 || Math.abs(velocity.current.theta) > 0.0001) {
              phiOffsetRef.current += velocity.current.phi;
              thetaOffsetRef.current += velocity.current.theta;
              velocity.current.phi *= 0.95;
              velocity.current.theta *= 0.95;
            }

            const thetaMin = -0.4;
            const thetaMax = 0.4;
            if (thetaOffsetRef.current < thetaMin) {
              thetaOffsetRef.current += (thetaMin - thetaOffsetRef.current) * 0.1;
            } else if (thetaOffsetRef.current > thetaMax) {
              thetaOffsetRef.current += (thetaMax - thetaOffsetRef.current) * 0.1;
            }
          }
        }

        globe?.update({
          phi: phi + phiOffsetRef.current + dragOffset.current.phi,
          theta: theta + thetaOffsetRef.current + dragOffset.current.theta,
          dark,
          diffuse,
          mapSamples,
          mapBrightness,
          baseColor,
          markerColor,
          glowColor,
          markerElevation,
          markers: markers.map(marker => ({
            location: marker.location,
            size: markerSize,
            id: marker.id
          })),
          arcs: arcs.map(arc => ({
            from: arc.from,
            to: arc.to,
            id: arc.id
          })),
          arcColor,
          arcWidth,
          arcHeight
        });

        animationId = window.requestAnimationFrame(tick);
      };

      tick();
      canvas.style.opacity = "1";
    };

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      resizeObserver = new ResizeObserver(entries => {
        if (entries[0]?.contentRect.width && entries[0].contentRect.width > 0) {
          resizeObserver?.disconnect();
          resizeObserver = null;
          init();
        }
      });
      resizeObserver.observe(canvas);
    }

    return () => {
      if (animationId) window.cancelAnimationFrame(animationId);
      resizeObserver?.disconnect();
      globe?.destroy();
    };
  }, [
    arcColor,
    arcHeight,
    arcWidth,
    arcs,
    baseColor,
    dark,
    diffuse,
    glowColor,
    mapBrightness,
    mapSamples,
    markerColor,
    markerElevation,
    markerSize,
    markers,
    speed,
    theta
  ]);

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: "100%",
          height: "100%",
          opacity: 0,
          transition: "opacity 1s ease",
          borderRadius: "50%",
          touchAction: allowPointerInteraction ? "none" : "auto",
          cursor: allowPointerInteraction ? "grab" : "default"
        }}
      />
    </div>
  );
}
