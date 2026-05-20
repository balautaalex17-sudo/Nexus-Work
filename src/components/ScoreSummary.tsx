interface ScoreSummaryProps {
  score: number;
  maxScore: number;
}

export function ScoreSummary({ score, maxScore }: ScoreSummaryProps) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const tone =
    pct >= 80
      ? { bg: "rgba(93,112,82,0.10)", text: "var(--primary)" }
      : pct >= 60
        ? { bg: "rgba(193,140,93,0.12)", text: "var(--secondary)" }
        : { bg: "rgba(168,84,72,0.10)", text: "var(--destructive)" };

  return (
    <div className="score-banner">
      <span>Result</span>
      <span className="score-fraction">
        {score}
        <span style={{ color: "var(--border)" }}> / {maxScore}</span>
      </span>
      <span
        style={{
          marginLeft: "auto",
          padding: "6px 14px",
          borderRadius: 999,
          background: tone.bg,
          color: tone.text,
          fontWeight: 700,
          fontSize: "var(--text-sm)",
        }}
      >
        {pct}%
      </span>
    </div>
  );
}
