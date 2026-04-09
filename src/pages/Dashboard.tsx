import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { RiskBadge } from "@/components/RiskBadge";
import { useAppStore } from "@/lib/store";
import { Package, AlertTriangle, Truck, CheckCircle, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";   // ✅ NEW

export default function Dashboard() {

  // ✅ ADD setShipments
  const { shipments, setShipments, alerts, user, orders } = useAppStore();

  const navigate = useNavigate();

  const isFactory = user?.role === "factory";

  // ✅ FETCH FROM BACKEND (VERY IMPORTANT)
  useEffect(() => {
    fetch("http://127.0.0.1:5000/shipments")
      .then(res => res.json())
      .then(data => {
        setShipments(data);   // store backend data
      })
      .catch(err => console.error("Error fetching shipments:", err));
  }, []);

  // Shipment stats
  const totalShipments = shipments.length;
  const inTransit = shipments.filter((s) => s.status === "In Transit").length;
  const delivered = shipments.filter((s) => s.status === "Delivered").length;
  const delayed = shipments.filter((s) => s.status === "Delayed").length;

  // Orders stats
  const pendingOrders = orders.filter((o) => o.status === "Pending").length;
  const activeOrders = orders.filter((o) =>
    ["Accepted", "In Transit", "Reassigned"].includes(o.status)
  ).length;

  const unreadAlerts = alerts.filter((a) => !a.read);

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div>
          <h2 className="text-3xl font-bold">
            {isFactory ? "Factory Dashboard 🏭" : "Hospital Dashboard 🏥"}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {isFactory
              ? "Manage shipments & fulfill hospital orders"
              : "Track orders & incoming deliveries"}
          </p>
        </div>

        {/* MAIN STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {isFactory ? (
            <>
              <StatCard title="Total Shipments" value={totalShipments} icon={<Package />} />
              <StatCard title="Active Deliveries" value={inTransit} icon={<Truck />} />
              <StatCard title="Pending Orders" value={pendingOrders} icon={<ShoppingCart />} />
              <StatCard title="Alerts" value={unreadAlerts.length} icon={<AlertTriangle />} />
            </>
          ) : (
            <>
              <StatCard title="My Orders" value={orders.length} icon={<ShoppingCart />} />
              <StatCard title="Incoming Shipments" value={inTransit} icon={<Truck />} />
              <StatCard title="Delivered" value={delivered} icon={<CheckCircle />} />
              <StatCard title="Alerts" value={unreadAlerts.length} icon={<AlertTriangle />} />
            </>
          )}

        </div>

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

          {isFactory ? (
            <>
              <QuickAction label="Create Shipment" onClick={() => navigate("/create-shipment")} />
              <QuickAction label="View Orders" onClick={() => navigate("/factory-orders")} />
              <QuickAction label="Track Shipments" onClick={() => navigate("/map")} />
              <QuickAction label="Alerts" onClick={() => navigate("/alerts")} />
            </>
          ) : (
            <>
              <QuickAction label="Place Order" onClick={() => navigate("/hospital-orders")} />
              <QuickAction label="Compare Suppliers" onClick={() => navigate("/compare-factories")} />
              <QuickAction label="Track Deliveries" onClick={() => navigate("/map")} />
              <QuickAction label="Alerts" onClick={() => navigate("/alerts")} />
            </>
          )}

        </div>

        {/* ROLE BASED TABLE */}
        <div className="bg-card border rounded-lg p-5">
          <h3 className="font-semibold mb-4">
            {isFactory ? "Recent Shipments" : "My Orders"}
          </h3>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-2">Item</th>
                <th className="text-left py-2">Route</th>
                <th className="text-left py-2">ETA</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>

            <tbody>
              {isFactory
                ? shipments.slice(0, 5).map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="py-2">{s.medicine}</td>
                      <td>{s.origin} → {s.destination}</td>
                      <td>{s.eta}</td>
                      <td>{s.status}</td>
                    </tr>
                  ))
                : orders.slice(0, 5).map((o) => (
                    <tr key={o.id} className="border-t">
                      <td className="py-2">{o.medicine}</td>
                      <td>{o.destination}</td>
                      <td>{o.eta || "-"}</td>
                      <td>{o.status}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

      </div>
    </DashboardLayout>
  );
}

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="border p-4 rounded-lg hover:shadow-md transition"
    >
      {label}
    </button>
  );
}