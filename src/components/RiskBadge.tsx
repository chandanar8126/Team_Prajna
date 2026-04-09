import type { RiskLevel } from "@/lib/data";

const config: Record<RiskLevel, { bg: string; text: string; dot: string }> = {
  High: { bg: "bg-risk-high/10", text: "text-risk-high", dot: "bg-risk-high" },
  Medium: { bg: "bg-risk-medium/10", text: "text-risk-medium", dot: "bg-risk-medium" },
  Low: { bg: "bg-risk-low/10", text: "text-risk-low", dot: "bg-risk-low" },
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  const c = config[level];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot} ${level === "High" ? "animate-pulse" : ""}`} />
      {level}
    </span>
  );
}
