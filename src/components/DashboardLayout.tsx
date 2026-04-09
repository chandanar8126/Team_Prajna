import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { useAppStore } from "@/lib/store";
import { Navigate } from "react-router-dom";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const user = useAppStore((s) => s.user);
  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
