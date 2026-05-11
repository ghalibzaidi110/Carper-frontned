"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Check, Images, SwitchCamera } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const dashboardHref = user?.role === "ADMIN" ? "/admin/users" : "/dashboard";
  const primaryHref = isAuthenticated ? dashboardHref : "/auth/register";
  const primaryLabel = isAuthenticated ? "Open Dashboard" : "Get Started Free";

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 overflow-x-hidden">
      {/* ─── Section 1 · Hero ────────────────────────────────── */}
      <section className="relative min-h-screen md:h-screen md:min-h-[640px] flex flex-col overflow-hidden">
        <HeroBackground />

        {/* Floating navbar */}
        <nav className="relative z-20 px-6 lg:px-10 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/mainlogo.png"
              alt="Carper logo"
              width={96}
              height={96}
              priority
              style={{ width: 96, height: 96 }}
              className="rounded-lg object-contain"
            />
            <span className="font-display font-bold text-lg tracking-tight">Carper</span>
          </Link>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                href={dashboardHref}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="hidden sm:inline px-4 py-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-[0_0_24px_-4px_hsl(195_100%_50%/0.7)]"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Hero body */}
        <div className="relative z-10 flex-1 container mx-auto px-6 lg:px-10 py-4 md:py-6 lg:py-8 flex items-start">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-5 md:gap-8 lg:gap-10 items-center w-full">
            {/* Copy */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 mb-3 md:mb-5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[11px] font-semibold text-primary uppercase tracking-[0.18em]">
                  AI Damage Detection
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-display font-bold leading-[1.05] tracking-[-0.025em]">
                Every dent.{" "}
                <span className="bg-gradient-to-r from-primary via-cyan-300 to-primary bg-clip-text text-transparent">
                  Detected
                </span>{" "}
                in seconds.
              </h1>

              <p className="mt-3 md:mt-5 text-sm lg:text-base text-muted-foreground leading-relaxed max-w-lg">
                Carper turns any photo or live camera into a precise damage report.
                Trained AI flags every issue, scores severity, and writes the report for you.
              </p>

              <div className="mt-5 md:mt-7 flex items-center gap-5">
                <Link
                  href={primaryHref}
                  className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-[0_0_40px_-8px_hsl(195_100%_50%/0.8)]"
                >
                  {primaryLabel}
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                {!isAuthenticated && (
                  <Link
                    href="/auth/login"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Sign in →
                  </Link>
                )}
              </div>
            </div>

            {/* Wireframe car */}
            <div className="relative">
              <WireframeCar />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 2 · Live Detection ──────────────────────── */}
      <section className="relative min-h-screen flex items-center py-10 lg:py-14 border-t border-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-[#0c0e16] to-background" />
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />

        <div className="relative container mx-auto px-6 lg:px-10 w-full">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <LiveCameraFrame />

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 mb-4">
                <span className="text-[11px] font-semibold text-primary uppercase tracking-[0.18em]">
                  Live Detection
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-[2.6rem] font-display font-bold leading-[1.05] tracking-tight">
                Inspect a car the moment{" "}
                <span className="text-primary">it&apos;s in front of you</span>
              </h2>
              <p className="mt-4 text-sm lg:text-base text-muted-foreground leading-relaxed max-w-lg">
                Open the camera, point it at any vehicle, and Carper draws bounding boxes
                around damage as it sees it. Tap to log issues, get repair-cost estimates,
                and generate the full report on the spot.
              </p>

              <ul className="mt-6 space-y-3">
                {[
                  "Real-time bounding boxes with FPS counter",
                  "Adjustable confidence threshold",
                  "Tap to log and price each detection",
                  "One-click damage report when you're done",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-md border border-primary/40 bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={11} className="text-primary" strokeWidth={3} />
                    </div>
                    <span className="text-sm text-white/85">{item}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-xs text-white/40 italic">
                Live Detection runs inside the dashboard. Sign in or create a free account to use it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 3 · CTA + Footer ────────────────────────── */}
      <section className="relative min-h-screen flex flex-col px-6 lg:px-10 py-12 border-t border-white/5">
        <div className="container mx-auto flex-1 flex flex-col justify-center">
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-12 lg:p-16">
            {/* Glow behind */}
            <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/30 blur-[120px]" />
            <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-cyan-400/20 blur-[100px]" />

            <div className="relative text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-display font-bold leading-[1.05] tracking-tight">
                Ready to inspect smarter?
              </h2>
              <p className="mt-5 text-base lg:text-lg text-muted-foreground max-w-xl mx-auto">
                Free for individuals. No credit card. Inspect your first car in under a minute.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link
                  href={primaryHref}
                  className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-[0_0_40px_-8px_hsl(195_100%_50%/0.9)]"
                >
                  {isAuthenticated ? "Go to Dashboard" : "Start Free"}
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                {!isAuthenticated && (
                  <Link
                    href="/auth/login"
                    className="px-8 py-4 rounded-xl bg-white/5 text-white font-bold text-sm hover:bg-white/10 transition-all border border-white/15 backdrop-blur-sm"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Slim footer */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
            <div className="flex items-center gap-2">
              <Image
                src="/mainlogo.png"
                alt="Carper logo"
                width={28}
                height={28}
                style={{ width: 28, height: 28 }}
                className="rounded-md object-contain"
              />
              <span className="font-semibold text-muted-foreground">Carper</span>
              <span>· AI Damage Detection</span>
            </div>
            <p>© 2026 Carper. All rights reserved.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Hero background: car photo + dark vignette + cyan glows ─── */
function HeroBackground() {
  return (
    <>
      {/* Car photograph */}
      <Image
        src={heroBg}
        alt=""
        fill
        priority
        className="object-cover object-center"
      />
      {/* Dark vignette so text and UI stay readable */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-background" />

      {/* Cyan accent glows */}
      <div className="absolute -top-40 -right-32 h-[500px] w-[500px] rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-40 -left-32 h-[400px] w-[400px] rounded-full bg-cyan-400/15 blur-3xl" />
    </>
  );
}

/* ─── Blueprint car image with damage callouts ─── */
function WireframeCar() {
  // Each damage entry:
  //   anchor  - where the issue is on the car (percent of main image)
  //   card    - where the floating card sits on the panel (percent)
  //   crop    - what region of the source image to show inside the card (percent)
  const callouts = [
    // 1. Front fender — slight scratch lines just behind the front wheel arch / near lower headlight
    { anchor: { x: 18, y: 60 }, card: { x: 12, y: 20 }, crop: { x: 22, y: 60 }, severity: "minor", title: "Front Fender", sub: "Scratch · 84%", delay: 0 },
    // 2. Driver door — horizontal scratches across middle, around handle
    { anchor: { x: 42, y: 60 }, card: { x: 36, y: 82 }, crop: { x: 42, y: 60 }, severity: "moderate", title: "Driver Door", sub: "Scratch · 91%", delay: 0.8 },
    // 3. Rear quarter panel — most noticeable, diagonal marks toward rear wheel
    { anchor: { x: 65, y: 60 }, card: { x: 60, y: 20 }, crop: { x: 72, y: 60 }, severity: "severe", title: "Rear Quarter", sub: "Scratch · 96%", delay: 1.6 },
    // 4. Rear bumper corner — small faint scratches near edge
    { anchor: { x: 86, y: 60 }, card: { x: 90, y: 82 }, crop: { x: 90, y: 50 }, severity: "minor", title: "Rear Bumper", sub: "Scratch · 78%", delay: 2.4 },
  ];

  const sevTone: Record<string, { dot: string; box: string; text: string; ring: string; glow: string }> = {
    minor: {
      dot: "bg-success",
      box: "border-success/60 bg-success/5",
      text: "text-success",
      ring: "bg-success/40",
      glow: "shadow-[0_0_20px_-4px_hsl(152_60%_45%/0.6)]",
    },
    moderate: {
      dot: "bg-warning",
      box: "border-warning/60 bg-warning/5",
      text: "text-warning",
      ring: "bg-warning/40",
      glow: "shadow-[0_0_20px_-4px_hsl(38_92%_50%/0.6)]",
    },
    severe: {
      dot: "bg-destructive",
      box: "border-destructive/60 bg-destructive/5",
      text: "text-destructive",
      ring: "bg-destructive/40",
      glow: "shadow-[0_0_20px_-4px_hsl(0_72%_51%/0.6)]",
    },
  };

  return (
    <div className="relative w-full max-w-[580px] mx-auto lg:ml-auto">
      {/* Cyan halo behind */}
      <div className="absolute -inset-10 bg-primary/15 blur-3xl rounded-full" />

      {/* Card */}
      <div className="relative rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-4 shadow-[0_0_80px_-20px_hsl(195_100%_50%/0.4)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
              Inspection
            </p>
            <p className="text-xs font-semibold text-foreground mt-0.5">
              <span className="text-primary tabular-nums">{callouts.length}</span> issues identified
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            SCANNING
          </div>
        </div>

        {/* Blueprint car */}
        <div className="relative aspect-[16/10] rounded-xl overflow-hidden border border-white/5">
          {/* Background image */}
          <Image
            src="/landing/blueprint-car.png"
            alt="Blueprint side view of car"
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, 580px"
          />

          {/* Connector lines from each card back to its damage spot */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {callouts.map((c, i) => (
              <line
                key={`line-${i}`}
                x1={c.anchor.x}
                y1={c.anchor.y}
                x2={c.card.x}
                y2={c.card.y}
                stroke="hsl(195 100% 70%)"
                strokeWidth="0.18"
                strokeDasharray="0.7 0.7"
                opacity="0.65"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {/* Damage anchor dots */}
          {callouts.map((c, i) => {
            const tone = sevTone[c.severity];
            return (
              <div
                key={`dot-${i}`}
                className="absolute animate-dot-cycle pointer-events-none z-10"
                style={{
                  left: `${c.anchor.x}%`,
                  top: `${c.anchor.y}%`,
                  transform: "translate(-50%, -50%)",
                  animationDelay: `${c.delay}s`,
                }}
              >
                <span className={`absolute inset-0 -m-2 rounded-full blur-sm ${tone.ring}`} />
                <span
                  className={`relative block h-1.5 w-1.5 md:h-2.5 md:w-2.5 rounded-full ${tone.dot}`}
                  style={{ boxShadow: "0 0 12px currentColor" }}
                />
              </div>
            );
          })}

          {/* Floating detection cards — each cropping a region of the same image */}
          {callouts.map((c, i) => {
            const tone = sevTone[c.severity];
            return (
              <div
                key={`card-${i}`}
                className={`absolute rounded-md border overflow-hidden bg-black/55 backdrop-blur-sm w-[52px] md:w-[82px] ${tone.box} ${tone.glow} z-20`}
                style={{
                  left: `${c.card.x}%`,
                  top: `${c.card.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* Header */}
                <div className="px-1 py-0.5 md:px-1.5 md:py-1 flex items-center gap-1 border-b border-current/20">
                  <span className={`h-1 w-1 rounded-full ${tone.dot} flex-shrink-0`} />
                  <p className={`text-[6px] md:text-[8px] font-bold tracking-wider uppercase ${tone.text} truncate`}>
                    DMG {i + 1}
                  </p>
                </div>
                {/* Cropped region */}
                <div className="relative aspect-[5/4] overflow-hidden">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: "url(/landing/blueprint-car.png)",
                      backgroundSize: "500%",
                      backgroundPosition: `${c.crop.x}% ${c.crop.y}%`,
                      backgroundRepeat: "no-repeat",
                    }}
                  />
                  {/* Bottom label overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent h-3/4" />
                  <div className="absolute bottom-0.5 left-1 right-1 md:bottom-1 md:left-1.5 md:right-1.5">
                    <p className={`text-[6px] md:text-[8px] font-bold uppercase tracking-wide ${tone.text} leading-tight`}>
                      {c.title}
                    </p>
                    <p className="text-[6px] md:text-[8px] font-mono text-white/80 truncate leading-tight">
                      {c.sub}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Scan beam */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-primary/25 to-transparent animate-scan" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Live camera phone mock ─── */
function LiveCameraFrame() {
  // Damage callouts on the front-view car image.
  //   anchor → where the damage sits on the car (% of viewport)
  //   card   → where the floating detection card sits (% of viewport)
  const callouts = [
    { anchor: { x: 42, y: 20 }, card: { x: 78, y: 14 }, crop: { x: 52, y: 22 }, severity: "severe", title: "Windshield", sub: "Shattered · 96%", delay: 0 },
    { anchor: { x: 22, y: 43 }, card: { x: 34, y: 72 }, crop: { x: 62, y: 53 }, severity: "moderate", title: "Headlight", sub: "Broken · 91%", delay: 0.8 },
  ];

  const sevTone: Record<string, { dot: string; box: string; text: string; ring: string; glow: string }> = {
    minor: {
      dot: "bg-success",
      box: "border-success/60 bg-success/10",
      text: "text-success",
      ring: "bg-success/40",
      glow: "shadow-[0_0_16px_-4px_hsl(152_60%_45%/0.7)]",
    },
    moderate: {
      dot: "bg-warning",
      box: "border-warning/60 bg-warning/10",
      text: "text-warning",
      ring: "bg-warning/40",
      glow: "shadow-[0_0_16px_-4px_hsl(38_92%_50%/0.7)]",
    },
    severe: {
      dot: "bg-destructive",
      box: "border-destructive/60 bg-destructive/10",
      text: "text-destructive",
      ring: "bg-destructive/40",
      glow: "shadow-[0_0_16px_-4px_hsl(0_72%_51%/0.7)]",
    },
  };

  return (
    <div className="relative max-w-[300px] mx-auto lg:mx-0 lg:ml-12">
      {/* Cyan halo */}
      <div className="absolute -inset-6 bg-gradient-to-br from-primary/30 to-cyan-400/20 blur-3xl rounded-[3rem]" />

      <div className="relative rounded-[2.6rem] bg-[#0a0b10] p-1.5 border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
        <div className="rounded-[2.2rem] overflow-hidden bg-black aspect-[9/16] relative">
          {/* Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 h-6 w-28 rounded-full bg-black z-20" />

          {/* Status bar */}
          <div className="absolute top-3.5 inset-x-0 flex items-center justify-between px-7 z-20 text-[10px] font-mono text-white/80">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <div className="h-1 w-1 rounded-full bg-white" />
              <div className="h-1 w-1 rounded-full bg-white" />
              <div className="h-1 w-1 rounded-full bg-white/40" />
            </div>
          </div>

          {/* Camera viewport */}
          <div className="absolute inset-0 mt-12 bg-gradient-to-br from-slate-900 via-slate-950 to-black overflow-hidden">
            {/* Car front photograph */}
            <Image
              src="/landing/carmobile.png"
              alt="Car front view"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 360px"
              className="object-cover object-center"
            />

            {/* Connector lines from each card back to its damage spot */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
            >
              {callouts.map((c, i) => (
                <line
                  key={`line-${i}`}
                  x1={c.anchor.x}
                  y1={c.anchor.y}
                  x2={c.card.x}
                  y2={c.card.y}
                  stroke="hsl(195 100% 70%)"
                  strokeWidth="0.18"
                  strokeDasharray="0.7 0.7"
                  opacity="0.7"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            {/* Damage anchor dots */}
            {callouts.map((c, i) => {
              const tone = sevTone[c.severity];
              return (
                <div
                  key={`dot-${i}`}
                  className="absolute animate-dot-cycle pointer-events-none z-10"
                  style={{
                    left: `${c.anchor.x}%`,
                    top: `${c.anchor.y}%`,
                    transform: "translate(-50%, -50%)",
                    animationDelay: `${c.delay}s`,
                  }}
                >
                  <span className={`absolute inset-0 -m-2 rounded-full blur-sm ${tone.ring}`} />
                  <span
                    className={`relative block h-2 w-2 rounded-full ${tone.dot}`}
                    style={{ boxShadow: "0 0 12px currentColor" }}
                  />
                </div>
              );
            })}

            {/* Floating detection cards */}
            {callouts.map((c, i) => {
              const tone = sevTone[c.severity];
              return (
                <div
                  key={`card-${i}`}
                  className={`absolute rounded-md border overflow-hidden bg-black/55 backdrop-blur-sm w-[88px] ${tone.box} ${tone.glow} z-20`}
                  style={{
                    left: `${c.card.x}%`,
                    top: `${c.card.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {/* Header */}
                  <div className="px-1.5 py-1 flex items-center gap-1 border-b border-current/20">
                    <span className={`h-1.5 w-1.5 rounded-full ${tone.dot} flex-shrink-0`} />
                    <p className={`text-[9px] font-bold tracking-wider uppercase ${tone.text} truncate`}>
                      DMG {i + 1}
                    </p>
                  </div>
                  {/* Cropped region */}
                  <div className="relative aspect-[5/4] overflow-hidden">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: "url(/landing/carmobile.png)",
                        backgroundSize: "500%",
                        backgroundPosition: `${c.crop.x}% ${c.crop.y}%`,
                        backgroundRepeat: "no-repeat",
                      }}
                    />
                    {/* Bottom label overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent h-3/4" />
                    <div className="absolute bottom-1 left-1.5 right-1.5">
                      <p className={`text-[8px] font-bold uppercase tracking-wide ${tone.text} leading-tight`}>
                        {c.title}
                      </p>
                      <p className="text-[8px] font-mono text-white/80 truncate leading-tight">
                        {c.sub}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Scan beam */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute inset-x-0 h-20 bg-gradient-to-b from-transparent via-primary/35 to-transparent animate-scan" />
            </div>

            {/* HUD top */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[10px] font-semibold z-20">
              <span className="px-2 py-0.5 rounded bg-primary/80 backdrop-blur-sm text-primary-foreground">
                ● LIVE
              </span>
              <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm font-mono text-white/90">
                28 FPS
              </span>
            </div>

            {/* Bottom HUD: capture */}
            <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black via-black/60 to-transparent z-20">
              <div className="flex items-center justify-around">
                {/* Gallery thumbnail */}
                <div className="h-10 w-10 rounded-lg overflow-hidden border border-white/25 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                  <Images size={14} className="text-white/80" strokeWidth={2} />
                </div>
                {/* Shutter button — iOS style: transparent ring + solid inner circle */}
                <div className="relative h-16 w-16 rounded-full border-[3px] border-white flex items-center justify-center shadow-[0_0_30px_-5px_rgba(255,255,255,0.6)]">
                  <span className="h-12 w-12 rounded-full bg-white" />
                </div>
                {/* Flip camera */}
                <div className="h-10 w-10 rounded-lg border border-white/15 bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <SwitchCamera size={14} className="text-white/80" strokeWidth={2} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

