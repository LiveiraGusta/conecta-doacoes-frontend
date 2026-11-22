import { CHAT_SOUND_KEY, chatPrefEnabled } from './chatPrefs';

let context: AudioContext | null = null;

/**
 * "Plim" curto e baixo de mensagem nova (decisão da fase 5), gerado com Web Audio: sem arquivo de som.
 * Sem suporte, ou com o navegador bloqueando áudio antes de um clique, simplesmente não toca.
 */
export function playNotificationSound() {
  if (!chatPrefEnabled(CHAT_SOUND_KEY)) return;
  try {
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    context ??= new Ctx();
    if (context.state === 'suspended') void context.resume();
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1320, now + 0.09);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(gain).connect(context.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch {
    // Áudio indisponível: o snackbar já avisa.
  }
}
