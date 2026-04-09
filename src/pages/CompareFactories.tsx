import { DashboardLayout } from "@/components/DashboardLayout";
import { useAppStore } from "@/lib/store";
import { suppliers } from "@/lib/data";
import { RiskBadge } from "@/components/RiskBadge";
import { StatCard } from "@/components/StatCard";
import { BarChart3, Clock, DollarSign, Shield, Star } from "lucide-react";

export default function CompareFactories() {
  const { orders } = useAppStore();

  // Compute stats per supplier
  const factoryStats = suppliers.map((s) => {
    const assignedOrders = orders.filter((o) => o.assignedFactoryId === s.id);
    return { ...s, assignedOrders: assignedOrders.length };
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Compare Factories</h2>
          <p className="text-muted-foreground text-sm mt-1">AI-ranked factory comparison by cost, quality, and speed</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Factories" value={suppliers.length} icon={<BarChart3 className="w-5 h-5" />} />
          <StatCard title="Avg Quality" value={`${Math.round(suppliers.reduce((a, s) => a + s.qualityScore, 0) / suppliers.length)}%`} icon={<Shield className="w-5 h-5" />} />
          <StatCard title="Avg Cost" value={`$${(suppliers.reduce((a, s) => a + s.costPerKg, 0) / suppliers.length).toFixed(1)}/kg`} icon={<DollarSign className="w-5 h-5" />} />
        </div>

        {/* Factory Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {factoryStats
            .sort((a, b) => b.totalScore - a.totalScore)
            .map((factory, i) => (
              <div key={factory.id} className={`bg-card rounded-lg border p-5 shadow-card hover:shadow-elevated transition-all ${
                i === 0 ? "border-primary ring-2 ring-primary/20" : "border-border"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
                    <div>
                      <p className="font-semibold text-foreground">{factory.name}</p>
                      <p className="text-xs text-muted-foreground">{factory.location}</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-primary">{factory.totalScore}</span>
                </div>

                <div className="space-y-2">
                  <ScoreBar label="On-Time Rate" value={factory.onTimeRate} icon={<Clock className="w-3.5 h-3.5" />} />
                  <ScoreBar label="Quality" value={factory.qualityScore} icon={<Shield className="w-3.5 h-3.5" />} />
                  <ScoreBar label="Price Score" value={factory.priceScore} icon={<DollarSign className="w-3.5 h-3.5" />} />
                </div>

                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Star className="w-3.5 h-3.5" /> {factory.shipmentsCompleted} shipments
                  </span>
                  <span className="text-muted-foreground">${factory.costPerKg}/kg</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Avg delivery: ~{factory.deliverySpeed}h • {factory.assignedOrders} active orders
                </div>
              </div>
            ))}
        </div>

        {/* Comparison Table */}
        <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold text-foreground">Detailed Comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Rank</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Factory</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">On-Time %</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Quality</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Cost/kg</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Avg Speed</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {factoryStats
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .map((f, i) => (
                    <tr key={f.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</td>
                      <td className="px-5 py-3 font-medium text-foreground">{f.name}</td>
                      <td className="px-5 py-3 text-foreground">{f.onTimeRate}%</td>
                      <td className="px-5 py-3 text-foreground">{f.qualityScore}%</td>
                      <td className="px-5 py-3 text-foreground">${f.costPerKg}</td>
                      <td className="px-5 py-3 text-foreground">{f.deliverySpeed}h</td>
                      <td className="px-5 py-3 font-bold text-primary">{f.totalScore}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ScoreBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground flex items-center gap-1">{icon} {label}</span>
        <span className="font-medium text-foreground">{value}%</span>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full gradient-primary transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
