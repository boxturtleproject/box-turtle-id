import type { Confidence } from '../types';

const BADGE_STYLES: Record<Confidence, { bg: string; text: string; border: string }> = {
  high: { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
  medium: { bg: '#fef9c3', text: '#854d0e', border: '#eab308' },
  low: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
};

interface ConfidenceBadgeProps {
  confidence: Confidence;
  score: number;
}

export default function ConfidenceBadge({ confidence, score }: ConfidenceBadgeProps) {
  const style = BADGE_STYLES[confidence];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
    >
      {Math.round(score)}% — {confidence}
    </span>
  );
}
