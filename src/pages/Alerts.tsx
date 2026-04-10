import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Bell, CheckCheck, Clock, TrendingDown, ShieldAlert, Boxes
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";

// ─── TYPES ─────────────────────────────────────────
type AlertType = "emergency" | "delay" | "info" | "stock_low" | "reorder";

interface Alert {
  id: string;
  type: AlertType;
  role: "hospital" | "supplier";
  message: string;
  priority: number;
  timestamp: string;
  read: boolean;
  stockLevel?: number;
  delayHours?: number;
}

// ─── ROLE (CHANGE HERE FOR TESTING) ─────────────────
function useRole(): "hospital" | "supplier" {
  return "hospital"; // 👉 change to "supplier" to test
}

// ─── ICON META ─────────────────────────────────────
function getMeta(type: AlertType) {
  switch (type) {
    case "emergency": return <ShieldAlert className="text-red-500 w-4 h-4"/>;
    case "delay": return <Clock className="text-amber-500 w-4 h-4"/>;
    case "stock_low": return <TrendingDown className="text-orange-500 w-4 h-4"/>;
    case "reorder": return <Boxes className="text-blue-500 w-4 h-4"/>;
    default: return <Bell className="w-4 h-4"/>;
  }
}

// ─── 🧠 BACKUP STRATEGIES (ONLY HOSPITAL) ───────────
function BackupSuggestions({ type }: { type: AlertType }) {
  let suggestions: string[] = [];

  if (type === "emergency") {
    suggestions = [
      "🚑 Borrow stock from nearby hospitals",
      "📞 Trigger emergency procurement",
      "⚡ Prioritize critical patients",
    ];
  }

  if (type === "delay") {
    suggestions = [
      "🔄 Switch to alternate supplier",
      "📦 Check nearby inventory",
      "📞 Escalate to supplier",
    ];
  }

  if (type === "stock_low") {
    suggestions = [
      "📊 Trigger reorder immediately",
      "⚙️ Review stock threshold",
      "📉 Monitor usage closely",
    ];
  }

  if (type === "reorder") {
    suggestions = [
      "🛒 Place bulk order",
      "📦 Schedule recurring orders",
      "📊 Optimize reorder level",
    ];
  }

  if (!suggestions.length) return null;

  return (
    <div className="mt-2 bg-muted p-2 rounded text-xs space-y-1">
      <p className="text-[10px] text-muted-foreground">AI Recommendation</p>
      <p className="font-semibold">💡 Suggested Actions:</p>
      {suggestions.map((s, i) => (
        <p key={i}>• {s}</p>
      ))}
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────
export default function Alerts() {

  const role = useRole();
  const [refresh, setRefresh] = useState(0);
  const [readIds, setReadIds] = useState<string[]>([]);

  // 🔄 AUTO REFRESH
  useEffect(() => {
    const interval = setInterval(() => {
      setRefresh(prev => prev + 1);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // 🔥 SIMULATED ALERT GENERATION
  const alerts: Alert[] = useMemo(() => {

    const meds = ["Paracetamol", "Insulin", "Oxygen", "Antibiotics"];

    return Array.from({ length: 6 }).flatMap((_, i) => {
      const stock = Math.floor(Math.random() * 60);
      const delay = Math.random() > 0.5 ? Math.floor(Math.random() * 5) : 0;

      const baseId = `A${i}`;
      const list: Alert[] = [];

      if (stock < 15) {
        list.push({
          id: baseId + "c",
          type: "emergency",
          role: "hospital",
          message: `🚨 CRITICAL: ${meds[i % 4]} out of stock`,
          priority: 100,
          timestamp: new Date().toISOString(),
          read: false,
          stockLevel: stock
        });
      }

      if (stock < 30) {
        list.push({
          id: baseId + "l",
          type: "stock_low",
          role: "hospital",
          message: `${meds[i % 4]} low (${stock}%)`,
          priority: 80,
          timestamp: new Date().toISOString(),
          read: false,
          stockLevel: stock
        });
      }

      if (stock < 40) {
        list.push({
          id: baseId + "r",
          type: "reorder",
          role: "hospital",
          message: `Reorder ${meds[i % 4]}`,
          priority: 60,
          timestamp: new Date().toISOString(),
          read: false,
          stockLevel: stock
        });
      }

      if (delay > 0) {
        list.push({
          id: baseId + "dh",
          type: "delay",
          role: "hospital",
          message: `Shipment delayed ${delay} hrs`,
          priority: 90,
          timestamp: new Date().toISOString(),
          read: false,
          delayHours: delay
        });

        list.push({
          id: baseId + "ds",
          type: "delay",
          role: "supplier",
          message: `⚠️ Delivery delay - act now`,
          priority: 85,
          timestamp: new Date().toISOString(),
          read: false,
          delayHours: delay
        });
      }

      if (Math.random() > 0.6) {
        list.push({
          id: baseId + "s",
          type: "info",
          role: "supplier",
          message: `High demand incoming`,
          priority: 50,
          timestamp: new Date().toISOString(),
          read: false
        });
      }

      return list;
    });

  }, [refresh]);

  // 🎯 ROLE FILTER
  const filtered = alerts.filter(a => a.role === role);

  // 📊 SORT
  const sorted = filtered.sort(
    (a, b) =>
      b.priority - a.priority ||
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const unread = sorted.filter(a => !readIds.includes(a.id)).length;

  // ─── UI ─────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6">

        <h2 className="text-2xl font-bold">
          Alerts ({role})
        </h2>

        <p className="text-sm text-muted-foreground">
          {unread} unread • auto-refreshing
        </p>

        <div className="space-y-3">

          {sorted.map(alert => {
            const isRead = readIds.includes(alert.id);

            return (
              <div
                key={alert.id}
                className={`p-4 border rounded-lg ${isRead ? "opacity-50" : ""}`}
              >
                <div className="flex justify-between">

                  <div className="flex flex-col gap-1">
                    <div className="flex gap-2 items-center">
                      {getMeta(alert.type)}
                      <span>{alert.message}</span>
                    </div>

                    {/* 🧠 ONLY HOSPITAL GETS THIS */}
                    {role === "hospital" && (
                      <BackupSuggestions type={alert.type} />
                    )}
                  </div>

                  {!isRead && (
                    <button
                      onClick={() =>
                        setReadIds(prev => [...prev, alert.id])
                      }
                    >
                      <CheckCheck />
                    </button>
                  )}

                </div>
              </div>
            );
          })}

        </div>

      </div>
    </DashboardLayout>
  );
}