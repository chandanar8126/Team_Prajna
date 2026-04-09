export type UserRole = "factory" | "hospital";

export type Priority = "Normal" | "High" | "Emergency";
export type RiskLevel = "Low" | "Medium" | "High";
export type ShipmentStatus = "In Transit" | "Delivered" | "Pending" | "Delayed";
export type OrderStatus = "Pending" | "Accepted" | "Rejected" | "In Transit" | "Delivered" | "Reassigned";

export interface Shipment {
  id: string;
  medicine: string;
  weight: number;
  origin: string;
  destination: string;
  priority: Priority;
  supplierId: string;
  supplierName: string;
  eta: string;
  etaHours: number;
  riskLevel: RiskLevel;
  recommendedRoute: string;
  status: ShipmentStatus;
  createdAt: string;
  progress: number;
}

export interface Supplier {
  id: string;
  name: string;
  onTimeRate: number;
  priceScore: number;
  qualityScore: number;
  totalScore: number;
  shipmentsCompleted: number;
  location: string;
  costPerKg: number;
  deliverySpeed: number; // avg hours
}

export interface Alert {
  id: string;
  shipmentId: string;
  message: string;
  type: "emergency" | "delay" | "info" | "reassignment";
  timestamp: string;
  read: boolean;
}

export interface HospitalOrder {
  id: string;
  medicine: string;
  quantity: number;
  hospitalName: string;
  priority: Priority;
  destination: string;
  status: OrderStatus;
  assignedFactoryId: string | null;
  assignedFactoryName: string | null;
  recommendedFactories: FactoryRecommendation[];
  createdAt: string;
  eta: string | null;
  riskLevel: RiskLevel | null;
}

export interface FactoryRecommendation {
  supplierId: string;
  supplierName: string;
  eta: number;
  cost: number;
  quality: number;
  riskLevel: RiskLevel;
  score: number;
  location: string;
}

// Static cities with coordinates for map
export const cities: Record<string, { lat: number; lng: number }> = {
  "New York": { lat: 40.71, lng: -74.01 },
  "Los Angeles": { lat: 34.05, lng: -118.24 },
  "Chicago": { lat: 41.88, lng: -87.63 },
  "Houston": { lat: 29.76, lng: -95.37 },
  "Phoenix": { lat: 33.45, lng: -112.07 },
  "Philadelphia": { lat: 39.95, lng: -75.17 },
  "San Antonio": { lat: 29.42, lng: -98.49 },
  "Dallas": { lat: 32.78, lng: -96.80 },
  "Miami": { lat: 25.76, lng: -80.19 },
  "Atlanta": { lat: 33.75, lng: -84.39 },
  "Boston": { lat: 42.36, lng: -71.06 },
  "Seattle": { lat: 47.61, lng: -122.33 },
  "Denver": { lat: 39.74, lng: -104.99 },
};

export const cityNames = Object.keys(cities);

// Distance calculation (haversine approximation)
function getDistance(origin: string, destination: string): number {
  const o = cities[origin];
  const d = cities[destination];
  if (!o || !d) return 500;
  const R = 3959; // miles
  const dLat = ((d.lat - o.lat) * Math.PI) / 180;
  const dLng = ((d.lng - o.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((o.lat * Math.PI) / 180) *
      Math.cos((d.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// AI Logic
export function calculateETA(origin: string, destination: string, priority: Priority): number {
  const distance = getDistance(origin, destination);
  const speed = priority === "Emergency" ? 80 : priority === "High" ? 60 : 45; // mph
  return Math.round((distance / speed) * 10) / 10;
}

export function detectRisk(priority: Priority, origin: string, destination: string): RiskLevel {
  if (priority === "Emergency") return "High";
  const distance = getDistance(origin, destination);
  if (distance > 1500) return "Medium";
  return "Low";
}

export function calculateSupplierScore(onTime: number, price: number, quality: number): number {
  return Math.round((0.4 * onTime + 0.3 * price + 0.3 * quality) * 100) / 100;
}

export function getRecommendedRoute(origin: string, destination: string, priority: Priority): string {
  if (priority === "Emergency") return `Express Air: ${origin} ✈️ ${destination}`;
  const distance = getDistance(origin, destination);
  if (distance > 1000) return `Highway + Air: ${origin} → Hub → ${destination}`;
  return `Direct Highway: ${origin} → ${destination}`;
}

// Generate factory recommendations for a hospital order
export function generateFactoryRecommendations(
  destination: string,
  priority: Priority,
  allSuppliers: Supplier[]
): FactoryRecommendation[] {
  return allSuppliers
    .map((s) => {
      const eta = calculateETA(s.location, destination, priority);
      const risk = detectRisk(priority, s.location, destination);
      const score = calculateSupplierScore(s.onTimeRate, s.priceScore, s.qualityScore);
      return {
        supplierId: s.id,
        supplierName: s.name,
        eta,
        cost: s.costPerKg,
        quality: s.qualityScore,
        riskLevel: risk,
        score,
        location: s.location,
      };
    })
    .sort((a, b) => {
      // Emergency: sort by ETA first
      if (priority === "Emergency") return a.eta - b.eta;
      // Otherwise sort by score descending
      return b.score - a.score;
    });
}

// Sample data
export const suppliers: Supplier[] = [
  { id: "s1", name: "MedSupply Pro", onTimeRate: 95, priceScore: 88, qualityScore: 92, totalScore: 0, shipmentsCompleted: 234, location: "New York", costPerKg: 12.5, deliverySpeed: 24 },
  { id: "s2", name: "PharmaDirect", onTimeRate: 88, priceScore: 92, qualityScore: 85, totalScore: 0, shipmentsCompleted: 189, location: "Chicago", costPerKg: 10.2, deliverySpeed: 28 },
  { id: "s3", name: "HealthCare Logistics", onTimeRate: 92, priceScore: 78, qualityScore: 95, totalScore: 0, shipmentsCompleted: 312, location: "Los Angeles", costPerKg: 15.0, deliverySpeed: 20 },
  { id: "s4", name: "BioMed Express", onTimeRate: 97, priceScore: 75, qualityScore: 90, totalScore: 0, shipmentsCompleted: 156, location: "Houston", costPerKg: 16.8, deliverySpeed: 18 },
  { id: "s5", name: "VitalShip Inc.", onTimeRate: 82, priceScore: 95, qualityScore: 88, totalScore: 0, shipmentsCompleted: 201, location: "Atlanta", costPerKg: 9.5, deliverySpeed: 32 },
].map(s => ({ ...s, totalScore: calculateSupplierScore(s.onTimeRate, s.priceScore, s.qualityScore) }));

const rawShipments = [
  {
    id: "SHP001", medicine: "Amoxicillin 500mg", weight: 50, origin: "New York", destination: "Los Angeles",
    priority: "Normal" as Priority, supplierId: "s1", supplierName: "MedSupply Pro",
    eta: "", etaHours: 0, riskLevel: "Low" as RiskLevel, recommendedRoute: "", status: "In Transit" as ShipmentStatus, createdAt: "2026-04-09T08:00:00Z", progress: 65,
  },
  {
    id: "SHP002", medicine: "Insulin Vials", weight: 20, origin: "Chicago", destination: "Miami",
    priority: "Emergency" as Priority, supplierId: "s2", supplierName: "PharmaDirect",
    eta: "", etaHours: 0, riskLevel: "High" as RiskLevel, recommendedRoute: "", status: "In Transit" as ShipmentStatus, createdAt: "2026-04-09T07:30:00Z", progress: 30,
  },
  {
    id: "SHP003", medicine: "Surgical Masks (10k)", weight: 200, origin: "Houston", destination: "Boston",
    priority: "High" as Priority, supplierId: "s4", supplierName: "BioMed Express",
    eta: "", etaHours: 0, riskLevel: "Medium" as RiskLevel, recommendedRoute: "", status: "In Transit" as ShipmentStatus, createdAt: "2026-04-09T06:00:00Z", progress: 80,
  },
  {
    id: "SHP004", medicine: "Paracetamol 250mg", weight: 100, origin: "Seattle", destination: "Denver",
    priority: "Normal" as Priority, supplierId: "s3", supplierName: "HealthCare Logistics",
    eta: "", etaHours: 0, riskLevel: "Low" as RiskLevel, recommendedRoute: "", status: "Delivered" as ShipmentStatus, createdAt: "2026-04-08T10:00:00Z", progress: 100,
  },
  {
    id: "SHP005", medicine: "Blood Bags (Type O)", weight: 15, origin: "Atlanta", destination: "Philadelphia",
    priority: "Emergency" as Priority, supplierId: "s5", supplierName: "VitalShip Inc.",
    eta: "", etaHours: 0, riskLevel: "High" as RiskLevel, recommendedRoute: "", status: "In Transit" as ShipmentStatus, createdAt: "2026-04-09T09:00:00Z", progress: 15,
  },
  {
    id: "SHP006", medicine: "Ventilator Parts", weight: 75, origin: "Dallas", destination: "Philadelphia",
    priority: "High" as Priority, supplierId: "s1", supplierName: "MedSupply Pro",
    eta: "", etaHours: 0, riskLevel: "Medium" as RiskLevel, recommendedRoute: "", status: "Delayed" as ShipmentStatus, createdAt: "2026-04-08T14:00:00Z", progress: 45,
  },
];

export const initialShipments: Shipment[] = rawShipments.map(s => ({
  ...s,
  etaHours: calculateETA(s.origin, s.destination, s.priority),
  eta: `${calculateETA(s.origin, s.destination, s.priority)}h`,
  riskLevel: detectRisk(s.priority, s.origin, s.destination),
  recommendedRoute: getRecommendedRoute(s.origin, s.destination, s.priority),
}));

export const initialAlerts: Alert[] = [
  { id: "a1", shipmentId: "SHP002", message: "🚨 Emergency shipment: Insulin Vials – Critical delivery required", type: "emergency", timestamp: "2026-04-09T07:35:00Z", read: false },
  { id: "a2", shipmentId: "SHP005", message: "🚨 Emergency shipment: Blood Bags – Critical delivery required", type: "emergency", timestamp: "2026-04-09T09:05:00Z", read: false },
  { id: "a3", shipmentId: "SHP003", message: "⚠️ Delay expected: Surgical Masks shipment may arrive 2h late", type: "delay", timestamp: "2026-04-09T08:15:00Z", read: false },
  { id: "a4", shipmentId: "SHP001", message: "ℹ️ Shipment SHP001 is on schedule", type: "info", timestamp: "2026-04-09T08:30:00Z", read: true },
  { id: "a5", shipmentId: "SHP006", message: "⚠️ Ventilator Parts delayed – considering reassignment", type: "delay", timestamp: "2026-04-09T10:00:00Z", read: false },
];

export const initialOrders: HospitalOrder[] = [
  {
    id: "ORD001",
    medicine: "Morphine 10mg",
    quantity: 500,
    hospitalName: "City General Hospital",
    priority: "Emergency",
    destination: "Boston",
    status: "Pending",
    assignedFactoryId: null,
    assignedFactoryName: null,
    recommendedFactories: generateFactoryRecommendations("Boston", "Emergency", suppliers),
    createdAt: "2026-04-09T10:00:00Z",
    eta: null,
    riskLevel: null,
  },
  {
    id: "ORD002",
    medicine: "Saline IV Bags (1000ml)",
    quantity: 2000,
    hospitalName: "Metro Health Center",
    priority: "High",
    destination: "Miami",
    status: "Accepted",
    assignedFactoryId: "s2",
    assignedFactoryName: "PharmaDirect",
    recommendedFactories: generateFactoryRecommendations("Miami", "High", suppliers),
    createdAt: "2026-04-09T08:00:00Z",
    eta: `${calculateETA("Chicago", "Miami", "High")}h`,
    riskLevel: detectRisk("High", "Chicago", "Miami"),
  },
  {
    id: "ORD003",
    medicine: "Antibiotics (Ciprofloxacin)",
    quantity: 300,
    hospitalName: "St. Mary's Medical",
    priority: "Normal",
    destination: "Denver",
    status: "In Transit",
    assignedFactoryId: "s3",
    assignedFactoryName: "HealthCare Logistics",
    recommendedFactories: generateFactoryRecommendations("Denver", "Normal", suppliers),
    createdAt: "2026-04-08T15:00:00Z",
    eta: `${calculateETA("Los Angeles", "Denver", "Normal")}h`,
    riskLevel: detectRisk("Normal", "Los Angeles", "Denver"),
  },
  {
    id: "ORD004",
    medicine: "Surgical Gloves (50k)",
    quantity: 50000,
    hospitalName: "City General Hospital",
    priority: "Normal",
    destination: "Boston",
    status: "Rejected",
    assignedFactoryId: "s5",
    assignedFactoryName: "VitalShip Inc.",
    recommendedFactories: generateFactoryRecommendations("Boston", "Normal", suppliers),
    createdAt: "2026-04-08T12:00:00Z",
    eta: null,
    riskLevel: null,
  },
];
