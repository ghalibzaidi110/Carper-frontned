import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import MyCarsPage from "./pages/MyCarsPage";
import DamageDetectionPage from "./pages/DamageDetectionPage";
import MyListingsPage from "./pages/MyListingsPage";
import RentalsPage from "./pages/RentalsPage";
import MarketplacePage from "./pages/MarketplacePage";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminVerificationsPage from "./pages/AdminVerificationsPage";
import AdminCatalogPage from "./pages/AdminCatalogPage";
import AdminStatsPage from "./pages/AdminStatsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/cars" element={<MyCarsPage />} />
            <Route path="/dashboard/detection" element={<DamageDetectionPage />} />
            <Route path="/dashboard/listings" element={<MyListingsPage />} />
            <Route path="/dashboard/rentals" element={<RentalsPage />} />
            <Route path="/dashboard/profile" element={<ProfilePage />} />
            <Route path="/dashboard/notifications" element={<NotificationsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/verifications" element={<AdminVerificationsPage />} />
            <Route path="/admin/catalog" element={<AdminCatalogPage />} />
            <Route path="/admin/stats" element={<AdminStatsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
