import { DashboardLayout } from "@/components/DashboardLayout";
import { useAppStore } from "@/lib/store";
import { Bell, CheckCheck } from "lucide-react";

export default function Alerts() {
  const { alerts, markAlertRead } = useAppStore();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Alerts & Notifications</h2>
            <p className="text-muted-foreground text-sm mt-1">{alerts.filter(a => !a.read).length} unread</p>
          </div>
        </div>

        <div className="space-y-3">
          {alerts.map((a, i) => (
            <div
              key={a.id}
              className={`bg-card rounded-lg border p-4 shadow-card flex items-start gap-3 transition-all animate-fade-in-up ${
                a.type === "emergency" ? "border-emergency" :
                a.type === "delay" ? "border-warning" : "border-border"
              } ${a.read ? "opacity-60" : ""}`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className={`p-2 rounded-lg ${
                a.type === "emergency" ? "bg-risk-high/10 text-risk-high" :
                a.type === "delay" ? "bg-risk-medium/10 text-risk-medium" :
                "bg-primary/10 text-primary"
              }`}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{a.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Shipment {a.shipmentId} · {new Date(a.timestamp).toLocaleString()}
                </p>
              </div>
              {!a.read && (
                <button
                  onClick={() => markAlertRead(a.id)}
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                  title="Mark as read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
