"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { Car, ScanSearch, ShoppingCart, FileText, ChevronRight, BarChart3 } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();

  const features = [
    { icon: ScanSearch, title: "AI Damage Detection", desc: "YOLO-powered image analysis detects dents, scratches, and damage with bounding box precision." },
    { icon: ShoppingCart, title: "Car Marketplace", desc: "Buy and sell verified cars with transparent damage history and seller verification." },
    { icon: Car, title: "Fleet Management", desc: "Manage rental fleets with pre/post rental inspections and damage tracking." },
    { icon: FileText, title: "PDF Reports", desc: "Generate professional damage assessment reports for insurance and documentation." },
  ];

  const steps = [
    { num: "01", title: "Register Your Car", desc: "Select from our catalog and upload registration images from 4 angles." },
    { num: "02", title: "Upload Images", desc: "Take periodic photos for AI-powered damage inspection and tracking." },
    { num: "03", title: "Get AI Report", desc: "Receive instant damage detection results with confidence scores and PDF reports." },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Car size={20} className="text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">AutoInspect</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/marketplace" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Marketplace</Link>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                href={user?.role === "ADMIN" ? "/admin/users" : "/dashboard"}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Sign In
                </Link>
                <Link href="/auth/register" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-hero" />
        <div className="absolute inset-0 opacity-30">
          <Image src={heroBg} alt="" fill className="object-cover" priority />
        </div>
        <div className="relative container mx-auto px-4 py-24 lg:py-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <ScanSearch size={14} className="text-primary" />
              <span className="text-xs font-medium text-primary">AI-Powered Vehicle Inspection</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-primary-foreground leading-tight">
              Smart Car Damage{" "}
              <span className="text-gradient">Detection</span>
            </h1>
            <p className="mt-6 text-lg text-primary-foreground/70 max-w-xl leading-relaxed">
              Upload car images and get instant AI-powered damage assessment reports.
              List verified cars on our marketplace with transparent damage history.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/auth/register"
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-elevated"
              >
                Get Started Free
              </Link>
              <Link
                href="/marketplace"
                className="px-6 py-3 rounded-xl bg-primary-foreground/10 text-primary-foreground font-semibold text-sm hover:bg-primary-foreground/20 transition-all border border-primary-foreground/20"
              >
                Browse Cars
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">Everything You Need</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">Comprehensive car management platform with AI-powered inspections.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="p-6 rounded-2xl bg-card border border-border shadow-card hover:shadow-elevated transition-all group">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon size={24} className="text-primary" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">How It Works</h2>
            <p className="mt-3 text-muted-foreground">Three simple steps to get your damage assessment.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-xl mb-5">
                  {s.num}
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
                {i < 2 && <ChevronRight className="hidden md:block mx-auto mt-4 text-muted-foreground/30" size={24} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Cars Listed", value: "850+" },
              { label: "Damage Scans", value: "3,200+" },
              { label: "Active Listings", value: "180+" },
              { label: "Verified Users", value: "1,250+" },
            ].map((s, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-card border border-border shadow-card">
                <p className="text-3xl font-display font-bold text-gradient">{s.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Manufacturers */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <h3 className="text-center font-display font-semibold text-foreground mb-8">Browse by Manufacturer</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {["Toyota", "Honda", "Suzuki", "Hyundai", "KIA", "Changan", "MG", "Haval"].map((m) => (
              <div key={m} className="px-6 py-3 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer">
                {m}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Car size={20} className="text-primary" />
              <span className="font-display font-bold text-foreground">AutoInspect</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 AutoInspect. AI-Powered Car Damage Detection Platform.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
