"use client";

import Image from "next/image";
// Import estático: a URL leva o hash do conteúdo, então um poster novo nunca é servido do cache antigo.
import poster from "@/assets/hero-poster.png";
import { useEffect, useRef, useState } from "react";
import type { EngineStats, HeroEngine } from "@/three/engine";
import styles from "./HeroStage.module.css";
import { useReducedMotion } from "./useReducedMotion";

type Status = "poster" | "live" | "fallback";

/**
 * Palco da escultura. Mostra o poster de imediato e só então carrega o
 * motor 3D (chunk separado, depois do primeiro paint). Se WebGL falhar
 * ou o contexto for perdido, o poster continua — o hero nunca fica vazio.
 */
export function HeroStage({ className }: { className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<HeroEngine | null>(null);
  const [status, setStatus] = useState<Status>("poster");
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const [stats, setStats] = useState<EngineStats | null>(null);

  useEffect(() => {
    const reducedMotion = reduced;
    let cancelled = false;

    const start = async () => {
      const stage = stageRef.current;
      const canvas = canvasRef.current;
      const rule = document.getElementById("flow-rule");
      if (!stage || !canvas || !rule || cancelled) return;
      if (new URLSearchParams(window.location.search).has("nowebgl")) {
        setStatus("fallback");
        return;
      }
      try {
        const { createHeroEngine, preloadSculpture } = await import("@/three/engine");
        const sculpture = await preloadSculpture();
        if (cancelled) return;
        engineRef.current = createHeroEngine({
          canvas,
          stage,
          rule,
          reducedMotion,
          onReady: () => setStatus("live"),
          onContextLost: () => setStatus("fallback"),
          onStats: setStats,
          sculpture,
        });
      } catch (error) {
        console.warn("[FIORBE] WebGL indisponível, mantendo o poster.", error);
        setStatus("fallback");
      }
    };

    // Depois do primeiro paint: o texto do hero nunca espera o 3D.
    const hasIdle = "requestIdleCallback" in window;
    const handle = hasIdle
      ? window.requestIdleCallback(() => void start(), { timeout: 800 })
      : window.setTimeout(() => void start(), 120);

    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [reduced]);

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  return (
    <>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" data-status={status} />
      <div ref={stageRef} className={`${styles.stage} ${className ?? ""}`} data-status={status} aria-hidden={status === "live" ? undefined : true}>
        <Image
          className={styles.poster}
          src={poster}
          alt=""
          aria-hidden="true"
          fill
          sizes="(max-width: 1023px) 100vw, 50vw"
          draggable={false}
        />
        {status === "live" && !reduced && (
          <div className={styles.controls}>
            <span className={styles.hint}>Mova o cursor ou arraste a escultura</span>
            <button type="button" className={styles.pause} aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
              {paused ? (
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M3 1.8v8.4L10 6z" />
                </svg>
              ) : (
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <rect x="2" y="1.5" width="2.5" height="9" rx="1" />
                  <rect x="7.5" y="1.5" width="2.5" height="9" rx="1" />
                </svg>
              )}
              {paused ? "Retomar movimento" : "Pausar movimento"}
            </button>
          </div>
        )}
      </div>
      {stats && (
        <output className={styles.debug}>
          {stats.tier} · dpr {stats.dpr} · {stats.fps} fps · p {stats.progress.toFixed(3)}
        </output>
      )}
    </>
  );
}
