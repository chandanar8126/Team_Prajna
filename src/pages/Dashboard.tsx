import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { RiskBadge } from "@/components/RiskBadge";
import { useAppStore } from "@/lib/store";
import { Package, AlertTriangle, Truck, CheckCircle, Clock, ShoppingCart, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { shipments, alerts, user, orders } = useAppStore();
  const navigate = useNavigate();

  const totalShipments = shipments.length;
  const inTransit = shipments.filter((s) => s.status === "In Transit").length;
  const delivered = shipments.filter((s) => s.status === "Delivered").length;
  const delayed = shipments.filter((s) => s.status === "Delayed").length;
  const highRisk = shipments.filter((s) => s.riskLevel === "High").length;
  const medRisk = shipments.filter((s) => s.riskLevel === "Medium").length;
  const lowRisk = shipments.filter((s) => s.riskLevel === "Low").length;
  const emergencies = shipments.filter((s) => s.priority === "Emergency" && s.status === "In Transit");
  const unreadAlerts = alerts.filter((a) => !a.read);

  const pendingOrders = orders.filter((o) => o.status === "Pending").length;
  const activeOrders = orders.filter((o) => ["Accepted", "In Transit", "Reassigned"].includes(o.status)).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in-up">
        <div className="grid gap-6 xl:grid-cols-[1.85fr_1fr] items-start">
          <div className="space-y-3">
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                {user?.role === "factory" ? "Factory Dashboard" : "Hospital Dashboard"}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">AI-powered supply chain overview</p>
            </div>
            <div className="rounded-[2rem] bg-gradient-secondary/12 border border-secondary/20 p-6 shadow-elevated">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-secondary font-semibold">Live intelligence</p>
                  <h3 className="text-2xl font-semibold text-foreground mt-3">Manage supply, risk, and delivery in one view.</h3>
                </div>
                <div className="rounded-3xl bg-card px-4 py-2 text-sm font-semibold text-foreground border border-border">
                  {user?.role === "factory" ? "Supplier focus" : "Hospital focus"}
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-3xl bg-card border border-border p-4 shadow-card">
                  <p className="text-xs uppercase text-muted-foreground tracking-[0.2em]">Total Shipments</p>
                  <p className="mt-3 text-3xl font-bold text-foreground">{totalShipments}</p>
                </div>
                <div className="rounded-3xl bg-card border border-border p-4 shadow-card">
                  <p className="text-xs uppercase text-muted-foreground tracking-[0.2em]">Active Deliveries</p>
                  <p className="mt-3 text-3xl font-bold text-foreground">{inTransit}</p>
                </div>
                <div className="rounded-3xl bg-card border border-border p-4 shadow-card">
                  <p className="text-xs uppercase text-muted-foreground tracking-[0.2em]">Unread Alerts</p>
                  <p className="mt-3 text-3xl font-bold text-foreground">{unreadAlerts.length}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-[2rem] bg-card border border-border p-6 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Quick score</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{pendingOrders} pending · {activeOrders} active</p>
              </div>
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div className="mt-5 space-y-3">
              <div className="rounded-3xl bg-muted/80 p-4 border border-border flex items-center justify-between text-sm">
                <span>In Transit</span>
                <strong>{inTransit}</strong>
              </div>
              <div className="rounded-3xl bg-muted/80 p-4 border border-border flex items-center justify-between text-sm">
                <span>Delayed</span>
                <strong>{delayed}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Banner */}
        {emergencies.length > 0 && (
          <div className="gradient-emergency text-primary-foreground p-4 rounded-3xl flex items-center gap-3 animate-pulse-glow">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <span className="font-bold">🚨 {emergencies.length} Emergency Shipment{emergencies.length > 1 ? "s" : ""} Active</span>
              <p className="text-sm opacity-80">{emergencies.map((e) => e.medicine).join(", ")}</p>
            </div>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total Shipments" value={totalShipments} icon={<Package className="w-5 h-5" />} />
          <StatCard title="In Transit" value={inTransit} icon={<Truck className="w-5 h-5" />} trend="Active deliveries" />
          <StatCard title="Delivered" value={delivered} icon={<CheckCircle className="w-5 h-5" />} />
          <StatCard title="Delayed" value={delayed} icon={<Clock className="w-5 h-5" />} variant={delayed > 0 ? "emergency" : "default"} />
          <StatCard
            title="Emergency"
            value={emergencies.length}
            icon={<AlertTriangle className="w-5 h-5" />}
            variant={emergencies.length > 0 ? "emergency" : "default"}
          />
        </div>

        {/* Order Stats (role-specific) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Pending Orders" value={pendingOrders} icon={<ShoppingCart className="w-5 h-5" />} />
          <StatCard title="Active Orders" value={activeOrders} icon={<Truck className="w-5 h-5" />} />
          <StatCard
            title="Reassignments"
            value={orders.filter((o) => o.status === "Reassigned").length}
            icon={<RefreshCw className="w-5 h-5" />}
          />
        </div>

        {/* Risk Summary + Recent Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg border border-border p-5 shadow-card">
            <h3 className="font-semibold text-foreground mb-4">Risk Summary</h3>
            <div className="space-y-3">
              {([
                { level: "High" as const, count: highRisk, color: "bg-risk-high" },
                { level: "Medium" as const, count: medRisk, color: "bg-risk-medium" },
                { level: "Low" as const, count: lowRisk, color: "bg-risk-low" },
              ]).map((r) => (
                <div key={r.level} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RiskBadge level={r.level} />
                    <span className="text-sm text-muted-foreground">{r.count} shipment{r.count !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${r.color}`}
                      style={{ width: `${totalShipments ? (r.count / totalShipments) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-5 shadow-card">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Recent Alerts
            </h3>
            <div className="space-y-2">
              {unreadAlerts.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className={`p-3 rounded-lg text-sm ${
                    a.type === "emergency" ? "bg-risk-high/5 border border-risk-high/20" :
                    a.type === "delay" ? "bg-risk-medium/5 border border-risk-medium/20" :
                    a.type === "reassignment" ? "bg-primary/5 border border-primary/20" :
                    "bg-muted"
                  }`}
                >
                  {a.message}
                </div>
              ))}
              {unreadAlerts.length === 0 && (
                <p className="text-muted-foreground text-sm">No unread alerts</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {user?.role === "factory" ? (
            <>
              <QuickAction label="Create Shipment" onClick={() => navigate("/create-shipment")} />
              <QuickAction label="View Hospital Orders" onClick={() => navigate("/factory-orders")} />
              <QuickAction label="Live Map" onClick={() => navigate("/map")} />
              <QuickAction label="View Alerts" onClick={() => navigate("/alerts")} />
            </>
          ) : (
            <>
              <QuickAction label="Place Order" onClick={() => navigate("/hospital-orders")} />
              <QuickAction label="Compare Factories" onClick={() => navigate("/compare-factories")} />
              <QuickAction label="Live Map" onClick={() => navigate("/map")} />
              <QuickAction label="View Alerts" onClick={() => navigate("/alerts")} />
            </>
          )}
        </div>

        {/* Recent Shipments */}
        <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold text-foreground">Recent Shipments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Medicine</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Supplier</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Route</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">ETA</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Risk</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {shipments.slice(0, 5).map((s) => (
                  <tr key={s.id} className={`border-t border-border hover:bg-muted/30 transition-colors ${s.priority === "Emergency" ? "bg-risk-high/5" : ""}`}>
                    <td className="px-5 py-3 font-medium text-foreground">{s.medicine}</td>
                    <td className="px-5 py-3 text-muted-foreground">{s.supplierName}</td>
                    <td className="px-5 py-3 text-muted-foreground">{s.origin} → {s.destination}</td>
                    <td className="px-5 py-3 text-foreground font-mono">{s.eta}</td>
                    <td className="px-5 py-3"><RiskBadge level={s.riskLevel} /></td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        s.status === "Delivered" ? "bg-success/10 text-success" :
                        s.status === "Delayed" ? "bg-risk-high/10 text-risk-high" :
                        "bg-primary/10 text-primary"
                      }`}>
                        {s.status}
                      </span>
                    </td>
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

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-3xl border border-border bg-gradient-primary/10 px-5 py-4 text-left text-sm font-semibold text-primary shadow-card transition-transform hover:-translate-y-0.5 hover:shadow-elevated"
    >
      {label} →
    </button>
  );
}
