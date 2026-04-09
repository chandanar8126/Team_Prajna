import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { Factory, Building2, HeartPulse } from "lucide-react";
import type { UserRole } from "@/lib/data";

export default function Login() {
  const [role, setRole] = useState<UserRole>("factory");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useAppStore((s) => s.login);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    login(email, role);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.2),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_24%)]">
      <div className="absolute inset-0 bg-gradient-hero opacity-10" />
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl gradient-primary mb-4 shadow-glow">
            <HeartPulse className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">LogiFlow AI</h1>
          <p className="text-muted-foreground mt-1">LogiFlow AI is a B2B AI-powered logistics optimization platform</p>
        </div>

        <form onSubmit={handleLogin} className="glass-card rounded-[32px] p-8 shadow-elevated space-y-6">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Select Role</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: "factory" as UserRole, label: "Factory / Supplier", icon: Factory },
                { value: "hospital" as UserRole, label: "Hospital", icon: Building2 },
              ]).map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all ${
                    role === r.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <r.icon className="w-6 h-6" />
                  <span className="text-xs font-medium">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@mediflow.ai"
              className="w-full px-4 py-3 rounded-3xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-3xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-3xl gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-95 transition-opacity"
          >
            Login
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Secure access powered by AI analytics and real-time supply chain visibility.
          </p>
        </form>
      </div>
    </div>
  );
}
