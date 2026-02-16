import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Car } from "lucide-react";

const RegisterPage = () => {
  const [accountType, setAccountType] = useState<"INDIVIDUAL" | "CAR_RENTAL">("INDIVIDUAL");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", phone: "", city: "", businessName: "", businessLicense: "" });
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    // For demo, just log in with john@example.com
    if (login("john@example.com", "")) {
      navigate("/dashboard");
    }
  };

  const updateForm = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Car size={22} className="text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-2xl text-foreground">AutoInspect</span>
          </Link>
          <h1 className="text-2xl font-display font-bold text-foreground">Create Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Start your car inspection journey</p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>
            )}

            {/* Account Type */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Account Type</label>
              <div className="flex gap-3">
                {(["INDIVIDUAL", "CAR_RENTAL"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAccountType(type)}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-colors ${
                      accountType === type
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border text-muted-foreground hover:border-foreground/20"
                    }`}
                  >
                    {type === "INDIVIDUAL" ? "Individual" : "Car Rental Business"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
                <input type="text" required value={form.name} onChange={(e) => updateForm("name", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email *</label>
                <input type="email" required value={form.email} onChange={(e) => updateForm("email", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password *</label>
                <input type="password" required value={form.password} onChange={(e) => updateForm("password", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Confirm Password *</label>
                <input type="password" required value={form.confirmPassword} onChange={(e) => updateForm("confirmPassword", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">City</label>
                <input type="text" value={form.city} onChange={(e) => updateForm("city", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>

            {accountType === "CAR_RENTAL" && (
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted border border-border">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Business Name *</label>
                  <input type="text" required value={form.businessName} onChange={(e) => updateForm("businessName", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Business License</label>
                  <input type="text" value={form.businessLicense} onChange={(e) => updateForm("businessLicense", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            )}

            <button type="submit" className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
              Create Account
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth/login" className="text-primary font-medium hover:underline">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
