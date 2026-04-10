import { useAppStore } from "@/lib/store";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, MapPin, BarChart3, Bell, LogOut, Factory, Building2, Truck, ShoppingCart, GitCompare, ClipboardList
} from "lucide-react";

export function AppSidebar() {
  const { user, logout, alerts } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const unreadAlerts = alerts.filter((a) => !a.read).length;

  const factoryLinks = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Create Shipment", icon: Package, path: "/create-shipment" },
    { label: "Hospital Orders", icon: ClipboardList, path: "/factory-orders" },
    { label: "Live Shipments", icon: Truck, path: "/shipments" },
    { label: "Live Map", icon: MapPin, path: "/map" },
    { label: "Supplier Ranking", icon: BarChart3, path: "/suppliers" },
    { label: "Alerts", icon: Bell, path: "/alerts", badge: unreadAlerts },
  ];

  const hospitalLinks = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Place Order", icon: ShoppingCart, path: "/hospital-orders" },
    { label: "Compare Factories", icon: GitCompare, path: "/compare-factories" },
    { label: "Incoming Shipments", icon: Truck, path: "/shipments" },
    { label: "Live Map", icon: MapPin, path: "/map" },
    { label: "Alerts", icon: Bell, path: "/alerts", badge: unreadAlerts },
  ];

  const links = user?.role === "factory" ? factoryLinks : hospitalLinks;

  return (
    <aside className="w-72 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col shadow-elevated">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-12 h-12 rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-glow">
            {user?.role === "factory" ? <Factory className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-primary-foreground">LogiFlow AI</h1>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{user?.role} Portal</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-sidebar-accent/20 border border-sidebar-border px-3 py-2 text-xs text-sidebar-accent-foreground">
          Smart supply chain visibility
        </div>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-2">
        {links.map((link) => {
          const active = location.pathname === link.path;
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition-all ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <link.icon className="w-4 h-4" />
              {link.label}
              {link.badge ? (
                <span className="ml-auto bg-emergency text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {link.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-sidebar-foreground/60 mb-3 px-3 truncate">{user?.email}</div>
        <button
          onClick={() => { logout(); navigate("/"); }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/70 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}