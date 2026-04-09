import { DashboardLayout } from "@/components/DashboardLayout";
import { suppliers } from "@/lib/data";
import { Trophy, TrendingUp } from "lucide-react";

const sorted = [...suppliers].sort((a, b) => b.totalScore - a.totalScore);
const medals = ["🥇", "🥈", "🥉"];

export default function Suppliers() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Supplier Rankings</h2>
          <p className="text-muted-foreground text-sm mt-1">AI-scored performance analysis</p>
        </div>

        {/* Top 3 podium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sorted.slice(0, 3).map((s, i) => (
            <div
              key={s.id}
              className={`bg-card rounded-lg border p-6 shadow-card text-center hover:shadow-elevated transition-shadow ${
                i === 0 ? "border-warning ring-2 ring-warning/20" : "border-border"
              }`}
            >
              <div className="text-4xl mb-2">{medals[i]}</div>
              <h3 className="font-bold text-foreground text-lg">{s.name}</h3>
              <p className="text-muted-foreground text-sm">{s.location}</p>
              <div className="text-3xl font-bold text-primary mt-3">{s.totalScore}</div>
              <p className="text-xs text-muted-foreground">Overall Score</p>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">On-Time</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-success rounded-full" style={{ width: `${s.onTimeRate}%` }} />
                    </div>
                    <span className="text-foreground font-medium w-8">{s.onTimeRate}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Price</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${s.priceScore}%` }} />
                    </div>
                    <span className="text-foreground font-medium w-8">{s.priceScore}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Quality</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-secondary rounded-full" style={{ width: `${s.qualityScore}%` }} />
                    </div>
                    <span className="text-foreground font-medium w-8">{s.qualityScore}%</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">{s.shipmentsCompleted} shipments completed</p>
            </div>
          ))}
        </div>

        {/* Full table */}
        <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <Trophy className="w-4 h-4 text-warning" />
            <h3 className="font-semibold text-foreground">All Suppliers</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Rank</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Supplier</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Location</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">On-Time %</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Price</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Quality</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Score</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Shipments</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-bold text-foreground">{medals[i] || `#${i + 1}`}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{s.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{s.location}</td>
                  <td className="px-5 py-3 text-foreground">{s.onTimeRate}%</td>
                  <td className="px-5 py-3 text-foreground">{s.priceScore}</td>
                  <td className="px-5 py-3 text-foreground">{s.qualityScore}</td>
                  <td className="px-5 py-3 font-bold text-primary">{s.totalScore}</td>
                  <td className="px-5 py-3 text-muted-foreground">{s.shipmentsCompleted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Score formula */}
        <div className="bg-card rounded-lg border border-border p-5 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-foreground">AI Scoring Formula</h4>
          </div>
          <code className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-md">
            Score = 0.4 × On-Time Rate + 0.3 × Price Score + 0.3 × Quality Score
          </code>
        </div>
      </div>
    </DashboardLayout>
  );
}
