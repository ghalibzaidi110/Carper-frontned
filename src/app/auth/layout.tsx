"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function AuthSegmentLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // /auth/callback is the OAuth handler — it must run regardless of auth state.
  const isCallback = pathname?.startsWith("/auth/callback");

  useEffect(() => {
    if (loading || isCallback) return;
    if (user) {
      router.replace(user.role === "ADMIN" ? "/admin/users" : "/dashboard");
    }
  }, [user, loading, isCallback, router]);

  if (!isCallback && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
