"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { setTokens } from "@/lib/api-client";
import { Car, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract tokens from URL query params
        const accessToken = searchParams.get("accessToken");
        const refreshToken = searchParams.get("refreshToken");
        const error = searchParams.get("error");
        const errorMessage = searchParams.get("errorMessage") || searchParams.get("message");
        const fromPage = searchParams.get("from") || "login"; // Track which page user came from
        const googleParam = searchParams.get("google");
        const googleDataParam = searchParams.get("data");

        // Check for error from OAuth provider or backend
        if (error || errorMessage) {
          const errorMsg = errorMessage 
            ? decodeURIComponent(errorMessage)
            : error === "access_denied" 
            ? "OAuth authorization was denied. Please try again." 
            : error === "server_error"
            ? "Server error occurred. Please try again later."
            : "OAuth authentication failed. Please try again.";
          
          // Redirect immediately to login/register with error message
          router.replace(`/auth/${fromPage}?oauth_error=${encodeURIComponent(errorMsg)}`);
          return;
        }

        // Check if this is a Google signup redirect (new user needs to complete signup)
        if (googleParam === "true" && googleDataParam) {
          try {
            const decodedData = decodeURIComponent(googleDataParam);
            const googleData = JSON.parse(decodedData);
            // Redirect to signup page with Google data
            router.replace(`/auth/signup?google=true&data=${encodeURIComponent(googleDataParam)}`);
            return;
          } catch (parseError) {
            console.error("Failed to parse Google data:", parseError);
            router.replace(`/auth/${fromPage}?oauth_error=${encodeURIComponent("Failed to process Google signup data")}`);
            return;
          }
        }

        // Check if tokens are present (existing user login)
        if (!accessToken || !refreshToken) {
          const errorMsg = "Authentication tokens not received. Please try logging in again.";
          router.replace(`/auth/${fromPage}?oauth_error=${encodeURIComponent(errorMsg)}`);
          return;
        }

        // Store tokens
        setTokens(accessToken, refreshToken);

        // Refresh user data
        await refreshUser();

        setStatus("success");

        // Get user role to redirect appropriately
        const saved = localStorage.getItem("auth_user");
        const user = saved ? JSON.parse(saved) : null;
        const redirectPath = user?.role === "ADMIN" ? "/admin/users" : "/dashboard";

        // Redirect after short delay
        setTimeout(() => {
          router.push(redirectPath);
        }, 1500);
      } catch (error) {
        console.error("OAuth callback error:", error);
        const fromPage = searchParams.get("from") || "login";
        const errorMsg = error instanceof Error 
          ? error.message 
          : "An error occurred during authentication. Please try again.";
        router.replace(`/auth/${fromPage}?oauth_error=${encodeURIComponent(errorMsg)}`);
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
              Completing Sign In...
            </h1>
            <p className="text-sm text-muted-foreground">
              Please wait while we complete your authentication.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">
              Sign In Successful!
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

