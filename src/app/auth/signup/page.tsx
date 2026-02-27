"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Car, Loader2 } from "lucide-react";

export default function GoogleSignupPage() {
  const [accountType, setAccountType] = useState<"INDIVIDUAL" | "CAR_RENTAL">("INDIVIDUAL");
  const [form, setForm] = useState({
    phoneNumber: "", city: "", address: "", country: "Pakistan",
    businessName: "", businessLicense: "",
  });
  const [googleData, setGoogleData] = useState<{
    googleId: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { completeGoogleSignup } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const googleParam = searchParams.get("google");
    const dataParam = searchParams.get("data");
    
    if (googleParam === "true" && dataParam) {
      try {
        const decodedData = decodeURIComponent(dataParam);
        const parsed = JSON.parse(decodedData);
        setGoogleData(parsed);
      } catch (err) {
        setError("Invalid signup data. Please try again.");
        setTimeout(() => router.push("/auth/register"), 3000);
      }
    } else {
      // Not a Google signup, redirect to regular register
      router.push("/auth/register");
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!googleData) {
      setError("Missing Google account information. Please try again.");
      return;
    }

    setLoading(true);
    try {
      const success = await completeGoogleSignup({
        googleId: googleData.googleId,
        email: googleData.email,
        fullName: googleData.fullName,
        avatarUrl: googleData.avatarUrl,
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
      const errorMessage = error?.message || "Signup failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  if (!googleData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading signup information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Car size={22} className="text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-2xl text-foreground">AutoInspect</span>
          </Link>
          <h1 className="text-2xl font-display font-bold text-foreground">Complete Your Signup</h1>
          <p className="mt-1 text-sm text-muted-foreground">Finish setting up your account</p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-card p-6">
          {/* Google Account Info */}
          <div className="mb-6 p-4 rounded-lg bg-muted border border-border">
            <p className="text-xs text-muted-foreground uppercase mb-2">Signing up with</p>
            <div className="flex items-center gap-3">
              {googleData.avatarUrl && (
                <img 
                  src={googleData.avatarUrl} 
                  alt={googleData.fullName}
                  className="h-10 w-10 rounded-full"
                />
              )}
              <div>
                <p className="font-medium text-foreground">{googleData.fullName}</p>
                <p className="text-sm text-muted-foreground">{googleData.email}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>
            )}

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
              <p className="text-xs text-muted-foreground mt-1">Please provide a complete address (minimum 10 characters)</p>
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
                  <input 
                    type="text" 
                    required
                    value={form.businessName} 
                    onChange={(e) => updateForm("businessName", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Business License</label>
                  <input 
                    type="text" 
                    value={form.businessLicense} 
                    onChange={(e) => updateForm("businessLicense", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" 
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Completing Signup..." : "Complete Signup"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary font-medium hover:underline">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

