// 쉬는 시간이 끝났을 때 알림 (진동 + 짧은 소리)

let ctx: AudioContext | null = null;

/** 브라우저는 사용자가 누른 순간에만 소리를 허락하므로, 세트를 체크할 때 미리 깨워 둔다. */
export function primeAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

/** 삐-삐 두 번 */
export function beep() {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  [0, 0.22].forEach((offset) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, t0 + offset);
    gain.gain.exponentialRampToValueAtTime(0.3, t0 + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.16);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(t0 + offset);
    osc.stop(t0 + offset + 0.18);
  });
}

export function buzz() {
  navigator.vibrate?.([200, 100, 200]);
}
