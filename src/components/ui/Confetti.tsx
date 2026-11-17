import type { CSSProperties } from 'react';

const COLORS = ['var(--p-400)', 'var(--p-600)', '#6d28d9', '#f59e0b', '#16a34a', '#ec4899'];
const PIECES = 28;

/**
 * Confete leve em CSS (fase 9), sem biblioteca: 28 pedaços caem uma vez e somem. Posições, cores e atrasos
 * saem do índice (determinístico). Quem pede menos movimento não vê (regra `.confetti` no index.css).
 */
export function Confetti() {
  return (
    <div className="confetti pointer-events-none fixed inset-0 z-[1600] overflow-hidden" aria-hidden>
      {Array.from({ length: PIECES }, (_, i) => {
        const style = {
          left: `${(i * 37) % 100}%`,
          width: 6 + (i % 3) * 3,
          height: 10 + (i % 4) * 3,
          backgroundColor: COLORS[i % COLORS.length],
          animationDelay: `${(i % 7) * 90}ms`,
          borderRadius: i % 2 ? 2 : 999,
          '--confetti-drift': `${((i * 53) % 120) - 60}px`,
          '--confetti-spin': `${360 + ((i * 97) % 360)}deg`,
        } as CSSProperties;
        return <span key={i} className="absolute top-0 animate-confetti" style={style} />;
      })}
    </div>
  );
}
