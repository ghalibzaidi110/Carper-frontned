"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

function RegisterContent() {
  const [accountType, setAccountType] = useState<"INDIVIDUAL" | "CAR_RENTAL">("INDIVIDUAL");
  const [form, setForm] = useState({
    fullName: "", email: "", password: "", confirmPassword: "",
    phoneNumber: "", city: "", address: "", country: "Pakistan",
    businessName: "", businessLicense: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for OAuth error in URL
  useEffect(() => {
    const oauthError = searchParams.get("oauth_error");
    if (oauthError) {
      setError(decodeURIComponent(oauthError));
      // Clean up URL
      router.replace("/auth/register", { scroll: false });
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const success = await register({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        accountType,
        phoneNumber: form.phoneNumber,
        city: form.city,
        address: form.address,
        country: form.country || "Pakistan",
        businessName: accountType === "CAR_RENTAL" ? form.businessName : undefined,
        businessLicense: accountType === "CAR_RENTAL" ? form.businessLicense : undefined,
      });

      if (success) {
        router.push("/dashboard");
      }
    } catch (error: any) {
      // Display the actual error message from the API
      const errorMessage = error?.message || "Registration failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img
              src="/mainlogo.png"
              alt="Carper logo"
              style={{ width: 96, height: 96 }}
              className="rounded-lg object-contain"
            />
            <span className="font-display font-bold text-2xl text-foreground">Carper</span>
          </Link>
          <h1 className="text-2xl font-display font-bold text-foreground">Create Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Start your car inspection journey</p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>
            )}

            {/* Account type selector hidden for FYP scope — every new
                signup is INDIVIDUAL. See docs/REMAINING.md item 2.5. */}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
                <input type="text" required value={form.fullName} onChange={(e) => updateForm("fullName", e.target.value)}
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
                <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number *</label>
                <input 
                  type="tel" 
                  required
                  value={form.phoneNumber} 
                  onChange={(e) => updateForm("phoneNumber", e.target.value)}
                  placeholder="+923001234567"
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" 
                />
                <p className="text-xs text-muted-foreground mt-1">Include country code (e.g., +923001234567)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">City *</label>
                <input 
                  type="text" 
                  required
                  value={form.city} 
                  onChange={(e) => updateForm("city", e.target.value)}
                  placeholder="Karachi"
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Address *</label>
              <input 
                type="text" 
                required
                value={form.address} 
                onChange={(e) => updateForm("address", e.target.value)}
                placeholder="House 123, Street 5, DHA Phase 6"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" 
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum 5 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Country</label>
              <input 
                type="text" 
                value={form.country} 
                onChange={(e) => updateForm("country", e.target.value)}
                placeholder="Pakistan"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" 
              />
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
                  window.location.href = `${API_URL}/auth/google?from=register`;
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </button>
            </div>
          </div>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary font-medium hover:underline">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <RegisterContent />
    </Suspense>
  );
}
