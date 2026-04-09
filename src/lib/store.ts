import { create } from "zustand";
import type { Shipment, Alert, UserRole, HospitalOrder } from "./data";
import {
  initialShipments,
  initialAlerts,
  initialOrders,
  suppliers,
  calculateETA,
  detectRisk,
} from "./data";

interface AppState {
  user: { email: string; role: UserRole } | null;
  shipments: Shipment[];
  alerts: Alert[];
  orders: HospitalOrder[];

  login: (email: string, role: UserRole) => void;
  logout: () => void;

  addShipment: (shipment: Shipment) => void;
  addAlert: (alert: Alert) => void;

  setShipments: (shipments: Shipment[]) => void; // ✅ FIXED

  markAlertRead: (id: string) => void;
  addOrder: (order: HospitalOrder) => void;
  acceptOrder: (orderId: string, factoryId: string) => void;
  rejectOrder: (orderId: string) => void;
  reassignOrder: (orderId: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  shipments: initialShipments,
  alerts: initialAlerts,
  orders: initialOrders,

  login: (email, role) => set({ user: { email, role } }),
  logout: () => set({ user: null }),

  addShipment: (shipment) =>
    set((s) => ({ shipments: [shipment, ...s.shipments] })),

  addAlert: (alert) =>
    set((s) => ({ alerts: [alert, ...s.alerts] })),

  setShipments: (shipments) => set({ shipments }), // ✅ IMPORTANT

  markAlertRead: (id) =>
    set((s) => ({
      alerts: s.alerts.map((a) =>
        a.id === id ? { ...a, read: true } : a
      ),
    })),

  addOrder: (order) =>
    set((s) => ({ orders: [order, ...s.orders] })),

  acceptOrder: (orderId, factoryId) =>
    set((s) => {
      const order = s.orders.find((o) => o.id === orderId);
      if (!order) return s;

      const factory = suppliers.find((sup) => sup.id === factoryId);
      if (!factory) return s;

      const eta = calculateETA(factory.location, order.destination, order.priority);
      const risk = detectRisk(order.priority, factory.location, order.destination);

      return {
        orders: s.orders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "Accepted",
                assignedFactoryId: factoryId,
                assignedFactoryName: factory.name,
                eta: `${eta}h`,
                riskLevel: risk,
              }
            : o
        ),
      };
    }),

  rejectOrder: (orderId) =>
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === orderId ? { ...o, status: "Rejected" } : o
      ),
    })),

  reassignOrder: () => set((s) => s),
}));