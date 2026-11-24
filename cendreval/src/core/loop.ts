export type StepFn = (dt: number, time: number) => void;

/** Boucle requestAnimationFrame avec un pas de temps borné (évite les sauts après un onglet en pause). */
export function startLoop(step: StepFn): void {
  let last = performance.now();
  let time = 0;
  const frame = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    step(dt, time);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
