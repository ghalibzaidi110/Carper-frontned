"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { setTokens } from "@/lib/api-client";
import { Car, Loader2, CheckCircle, AlertCircle } from "lucide-react";

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [headline, setHeadline] = useState("Completing Sign In...");
  const [subline, setSubline] = useState("Please wait while we complete your authentication.");

  useEffect(() => {
    const handleCallback = async () => {
      // `via` is set by the backend: "login" if the user originated on the
      // login page, "register" if they came from the register page. Used
      // to fall back to the right page on error and to explain when an
      // existing account is auto-logged-in from a signup attempt.
      const viaRaw = searchParams.get("via");
      const via: "login" | "register" = viaRaw === "register" ? "register" : "login";

      try {
        const accessToken = searchParams.get("accessToken");
        const refreshToken = searchParams.get("refreshToken");
        const oauthError = searchParams.get("error");
        const oauthErrorMessage = searchParams.get("errorMessage") || searchParams.get("message");

        if (oauthError || oauthErrorMessage) {
          const msg = oauthErrorMessage
            ? decodeURIComponent(oauthErrorMessage)
            : oauthError === "access_denied"
            ? "Google authorization was denied. Please try again."
            : oauthError === "server_error"
            ? "Server error occurred. Please try again later."
            : "Google sign-in failed. Please try again.";
          router.replace(`/auth/${via}?oauth_error=${encodeURIComponent(msg)}`);
          return;
        }

        if (!accessToken || !refreshToken) {
          router.replace(
            `/auth/${via}?oauth_error=${encodeURIComponent(
              "Authentication tokens not received. Please try again.",
            )}`,
          );
          return;
        }

        if (via === "register") {
          setHeadline("Account already exists");
          setSubline("Signing you in to your existing account...");
        }

        setTokens(accessToken, refreshToken);
        await refreshUser();
        setStatus("success");

        const saved = localStorage.getItem("auth_user");
        const user = saved ? JSON.parse(saved) : null;
        const redirectPath = user?.role === "ADMIN" ? "/admin/users" : "/dashboard";

        setTimeout(() => router.push(redirectPath), 1500);
      } catch (err) {
        console.error("OAuth callback error:", err);
        const msg = err instanceof Error ? err.message : "An error occurred during authentication. Please try again.";
        setErrorMessage(msg);
        setStatus("error");
        setTimeout(() => {
          router.replace(`/auth/${via}?oauth_error=${encodeURIComponent(msg)}`);
        }, 2000);
      }
    };

    handleCallback();
  }, [searchParams, router, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Car size={32} className="text-primary" />
          </div>
        </div>

        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">
              {headline}
            </h1>
            <p className="text-sm text-muted-foreground">
              {subline}
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">
              {headline === "Account already exists" ? "Welcome back!" : "Sign In Successful!"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Redirecting you to your dashboard...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">
              Authentication Failed
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              {errorMessage}
            </p>
            <p className="text-xs text-muted-foreground">
              Redirecting to login page...
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <OAuthCallbackContent />
    </Suspense>
  );
}

