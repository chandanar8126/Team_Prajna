import { create } from "zustand";
import type { Shipment, Alert, UserRole, HospitalOrder, Priority } from "./data";
import {
  initialShipments, initialAlerts, initialOrders, suppliers,
  generateFactoryRecommendations, calculateETA, detectRisk,
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
  markAlertRead: (id: string) => void;
  addOrder: (order: HospitalOrder) => void;
  acceptOrder: (orderId: string, factoryId: string) => void;
  rejectOrder: (orderId: string) => void;
  reassignOrder: (orderId: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  shipments: initialShipments,
  alerts: initialAlerts,
  orders: initialOrders,
  login: (email, role) => set({ user: { email, role } }),
  logout: () => set({ user: null }),
  addShipment: (shipment) => set((s) => ({ shipments: [shipment, ...s.shipments] })),
  addAlert: (alert) => set((s) => ({ alerts: [alert, ...s.alerts] })),
  markAlertRead: (id) =>
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)),
    })),
  addOrder: (order) => set((s) => ({ orders: [order, ...s.orders] })),
  acceptOrder: (orderId, factoryId) =>
    set((s) => {
      const order = s.orders.find((o) => o.id === orderId);
      if (!order) return s;
      const factory = suppliers.find((sup) => sup.id === factoryId);
      if (!factory) return s;
      const eta = calculateETA(factory.location, order.destination, order.priority);
      const risk = detectRisk(order.priority, factory.location, order.destination);
      const newAlert: Alert = {
        id: `a-${Date.now()}`,
        shipmentId: orderId,
        message: `✅ Order ${orderId} accepted by ${factory.name} – ETA: ${eta}h`,
        type: "info",
        timestamp: new Date().toISOString(),
        read: false,
      };
      return {
        orders: s.orders.map((o) =>
          o.id === orderId
            ? { ...o, status: "Accepted" as const, assignedFactoryId: factoryId, assignedFactoryName: factory.name, eta: `${eta}h`, riskLevel: risk }
            : o
        ),
        alerts: [newAlert, ...s.alerts],
      };
    }),
  rejectOrder: (orderId) =>
    set((s) => {
      const order = s.orders.find((o) => o.id === orderId);
      const newAlert: Alert = {
        id: `a-${Date.now()}`,
        shipmentId: orderId,
        message: `❌ Order ${orderId} (${order?.medicine}) rejected by factory`,
        type: "delay",
        timestamp: new Date().toISOString(),
        read: false,
      };
      // Auto-reassign to next best factory
      const reassigned = order ? autoReassign(order, s.orders) : null;
      const reassignAlert: Alert | null = reassigned
        ? {
            id: `a-${Date.now() + 1}`,
            shipmentId: orderId,
            message: `🔄 Order ${orderId} auto-reassigned to ${reassigned.assignedFactoryName}`,
            type: "reassignment",
            timestamp: new Date().toISOString(),
            read: false,
          }
        : null;
      return {
        orders: s.orders.map((o) =>
          o.id === orderId
            ? reassigned || { ...o, status: "Rejected" as const }
            : o
        ),
        alerts: [
          ...(reassignAlert ? [reassignAlert] : []),
          newAlert,
          ...s.alerts,
        ],
      };
    }),
  reassignOrder: (orderId) =>
    set((s) => {
      const order = s.orders.find((o) => o.id === orderId);
      if (!order) return s;
      const reassigned = autoReassign(order, s.orders);
      if (!reassigned) return s;
      const newAlert: Alert = {
        id: `a-${Date.now()}`,
        shipmentId: orderId,
        message: `🔄 Order ${orderId} reassigned to ${reassigned.assignedFactoryName} (delay detected)`,
        type: "reassignment",
        timestamp: new Date().toISOString(),
        read: false,
      };
      return {
        orders: s.orders.map((o) => (o.id === orderId ? reassigned : o)),
        alerts: [newAlert, ...s.alerts],
      };
    }),
}));

function autoReassign(order: HospitalOrder, _allOrders: HospitalOrder[]): HospitalOrder | null {
  const recs = generateFactoryRecommendations(order.destination, order.priority, suppliers);
  // Pick the best factory that isn't the currently assigned one
  const next = recs.find((r) => r.supplierId !== order.assignedFactoryId);
  if (!next) return null;
  return {
    ...order,
    status: "Reassigned",
    assignedFactoryId: next.supplierId,
    assignedFactoryName: next.supplierName,
    eta: `${next.eta}h`,
    riskLevel: next.riskLevel,
    recommendedFactories: recs,
  };
}
