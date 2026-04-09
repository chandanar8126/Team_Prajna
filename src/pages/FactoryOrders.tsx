import { DashboardLayout } from "@/components/DashboardLayout";
import { useAppStore } from "@/lib/store";
import { RiskBadge } from "@/components/RiskBadge";
import { Package, CheckCircle, XCircle, RefreshCw } from "lucide-react";

export default function FactoryOrders() {
  const { orders, acceptOrder, rejectOrder, reassignOrder } = useAppStore();

  const pendingOrders = orders.filter((o) => o.status === "Pending");
  const activeOrders = orders.filter((o) => ["Accepted", "In Transit", "Reassigned"].includes(o.status));
  const pastOrders = orders.filter((o) => ["Delivered", "Rejected"].includes(o.status));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Hospital Orders</h2>
          <p className="text-muted-foreground text-sm mt-1">View and manage incoming orders from hospitals</p>
        </div>

        {/* Pending Orders */}
        {pendingOrders.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Package className="w-4 h-4 text-warning" /> Pending Orders ({pendingOrders.length})
            </h3>
            {pendingOrders.map((order) => {
              const topRec = order.recommendedFactories[0];
              return (
                <div key={order.id} className={`bg-card rounded-lg border p-5 shadow-card ${
                  order.priority === "Emergency" ? "border-risk-high animate-pulse-glow" : "border-border"
                }`}>
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-muted-foreground">{order.id}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          order.priority === "Emergency" ? "bg-risk-high/10 text-risk-high" :
                          order.priority === "High" ? "bg-risk-medium/10 text-risk-medium" :
                          "bg-muted text-muted-foreground"
                        }`}>{order.priority}</span>
                      </div>
                      <p className="font-semibold text-foreground text-lg">{order.medicine}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.hospitalName} • Qty: {order.quantity} • Deliver to: {order.destination}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {topRec && (
                        <button
                          onClick={() => acceptOrder(order.id, topRec.supplierId)}
                          className="gradient-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition flex items-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" /> Accept (via {topRec.supplierName})
                        </button>
                      )}
                      <button
                        onClick={() => rejectOrder(order.id)}
                        className="bg-muted text-muted-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-risk-high/10 hover:text-risk-high transition flex items-center gap-1"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                  {/* Factory comparison */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                    {order.recommendedFactories.slice(0, 3).map((rec, i) => (
                      <div key={rec.supplierId}
                        className={`p-3 rounded-lg border text-sm ${
                          i === 0 ? "border-primary/30 bg-primary/5" : "border-border"
                        }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                          <span className="font-medium text-foreground">{rec.supplierName}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>ETA: {rec.eta}h</span>
                          <span>${rec.cost}/kg</span>
                          <span>Quality: {rec.quality}%</span>
                        </div>
                        <div className="mt-1"><RiskBadge level={rec.riskLevel} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Active Orders */}
        <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold text-foreground">Active & Past Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Order</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Medicine</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Hospital</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Priority</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Factory</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">ETA</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...activeOrders, ...pastOrders].map((o) => (
                  <tr key={o.id} className={`border-t border-border hover:bg-muted/30 ${
                    o.priority === "Emergency" ? "bg-risk-high/5" : ""
                  }`}>
                    <td className="px-5 py-3 font-mono text-foreground">{o.id}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{o.medicine}</td>
                    <td className="px-5 py-3 text-muted-foreground">{o.hospitalName}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        o.priority === "Emergency" ? "bg-risk-high/10 text-risk-high" :
                        o.priority === "High" ? "bg-risk-medium/10 text-risk-medium" :
                        "bg-muted text-muted-foreground"
                      }`}>{o.priority}</span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{o.assignedFactoryName || "—"}</td>
                    <td className="px-5 py-3 font-mono">{o.eta || "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        o.status === "Accepted" || o.status === "In Transit" ? "bg-primary/10 text-primary" :
                        o.status === "Delivered" ? "bg-success/10 text-success" :
                        o.status === "Rejected" ? "bg-risk-high/10 text-risk-high" :
                        o.status === "Reassigned" ? "bg-risk-medium/10 text-risk-medium" :
                        "bg-muted text-muted-foreground"
                      }`}>{o.status}</span>
                    </td>
                    <td className="px-5 py-3">
                      {(o.status === "Accepted" || o.status === "In Transit") && (
                        <button onClick={() => reassignOrder(o.id)}
                          className="text-xs text-risk-medium hover:underline flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" /> Reassign
                        </button>
                      )}
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
