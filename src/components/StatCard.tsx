import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  variant?: "default" | "emergency";
}

export function StatCard({ title, value, icon, trend, variant = "default" }: StatCardProps) {
  return (
    <div
      className={`rounded-lg p-5 shadow-card transition-all hover:shadow-elevated hover:-translate-y-0.5 ${
        variant === "emergency"
          ? "border-2 border-emergency bg-card animate-pulse-glow"
          : "bg-card border border-border"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={`p-2 rounded-2xl ${variant === "emergency" ? "bg-emergency/10 text-emergency" : "bg-primary/10 text-primary"}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
    </div>
  );
}
