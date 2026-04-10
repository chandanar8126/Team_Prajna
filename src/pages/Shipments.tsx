import { DashboardLayout } from "@/components/DashboardLayout";
import { RiskBadge } from "@/components/RiskBadge";
import { useEffect, useState } from "react";

export default function Shipments() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<any | null>(null);

  useEffect(() => {
    fetch("http://localhost:5000/shipments")
      .then((res) => res.json())
      .then((data) => setShipments(data))
      .catch((err) => console.error("Failed to load shipments:", err));
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Live Shipments</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {shipments.length} total shipments
          </p>
        </div>

        {/* Shipments Table */}
        <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-5 py-3">ID</th>
                  <th className="text-left px-5 py-3">Medicine</th>
                  <th className="text-left px-5 py-3">Supplier</th>
                  <th className="text-left px-5 py-3">Route</th>
                  <th className="text-left px-5 py-3">ETA</th>
                  <th className="text-left px-5 py-3">Risk</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Priority</th>
                </tr>
              </thead>

              <tbody>
                {shipments.map((s, i) => (
                  <tr
                    key={s.id}
                    className={`border-t border-border hover:bg-muted/30 cursor-pointer ${
                      s.priority === "Emergency" ? "bg-risk-high/5" : ""
                    }`}
                    onClick={() => setSelectedShipment(s)}
                  >
                    <td className="px-5 py-3 font-mono text-xs">{s.id}</td>
                    <td className="px-5 py-3 font-medium">{s.medicine}</td>
                    <td className="px-5 py-3">{s.supplierName}</td>
                    <td className="px-5 py-3">
                      {s.origin} → {s.destination}
                    </td>
                    <td className="px-5 py-3 font-mono">{s.eta}</td>
                    <td className="px-5 py-3">
                      <RiskBadge level={s.riskLevel} />
                    </td>
                    <td className="px-5 py-3">{s.status}</td>
                    <td className="px-5 py-3">{s.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {selectedShipment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card rounded-lg p-6 w-11/12 max-w-lg relative">
              <h3 className="text-xl font-bold mb-4">Shipment Details</h3>

              <div className="space-y-2 text-sm">
                <p><b>ID:</b> {selectedShipment.id}</p>
                <p><b>Medicine:</b> {selectedShipment.medicine}</p>
                <p><b>Supplier:</b> {selectedShipment.supplierName}</p>
                <p><b>Route:</b> {selectedShipment.origin} → {selectedShipment.destination}</p>
                <p><b>ETA:</b> {selectedShipment.eta}</p>
                <p><b>Status:</b> {selectedShipment.status}</p>
              </div>

              <button
                onClick={() => setSelectedShipment(null)}
                className="absolute top-3 right-3 font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}
{/* LIVE SHIPMENT TRACKING SECTION */}
<div className="mt-10">
  <h2 className="text-xl font-bold mb-4">🚚 Live Shipment Tracking</h2>

  {shipments.map((ship) => (
    <div
      key={ship.id}
      className="border p-4 mb-3 rounded-lg bg-card"
    >
      <h3 className="font-semibold">{ship.id}</h3>

      <p>
        {ship.location} ➝ {ship.destination}
      </p>

      <p>
        Status: <strong>{ship.status}</strong>
      </p>

      {/* Progress Bar */}
      <div className="bg-gray-200 h-2 rounded mt-2">
        <div
          style={{
            width: `${ship.progress}%`,
            background:
              ship.status === "Delayed"
                ? "red"
                : ship.status === "Delivered"
                ? "green"
                : "blue",
            height: "100%",
            borderRadius: "5px",
          }}
        />
      </div>

      <p className="text-sm mt-1">{ship.progress}% completed</p>
    </div>
  ))}
</div>
      </div>
    </DashboardLayout>
  );
}