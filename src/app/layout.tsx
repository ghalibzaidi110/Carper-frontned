import type { Metadata } from "next";
import "@/index.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Carper – AI-Powered Car Damage Detection",
  description: "Upload car images and get instant AI-powered damage assessment reports. List verified cars on our marketplace with transparent damage history.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
