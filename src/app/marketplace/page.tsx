"use client";

import { useState } from "react";
import Link from "next/link";
import { useListings, useManufacturers } from "@/hooks/use-api";
import { formatPKR } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import { Search, SlidersHorizontal, Eye, Car, MapPin, Loader2 } from "lucide-react";

export default function MarketplacePage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const { data: listingData, isLoading } = useListings({
    ...filters,
    page: 1,
    limit: 20,
  } as Record<string, unknown>);
  const { data: manufacturers } = useManufacturers();

  const rawListings = listingData?.data || listingData || [];
  const listings = Array.isArray(rawListings) ? rawListings : rawListings?.data || [];
  const mfrList = Array.isArray(manufacturers) ? manufacturers : [];

  const updateFilter = (key: string, value: string) => {
    setFilters((f) => {
      const next = { ...f };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Car size={20} className="text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">AutoInspect</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
            <Link href="/auth/register" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Get Started</Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xl">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search cars..."
              onChange={(e) => updateFilter("search", e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>
        </div>

        <div className="flex gap-6">
          {showFilters && (
            <aside className="w-64 flex-shrink-0 space-y-4 animate-slide-in-left">
              <div className="bg-card rounded-xl border border-border shadow-card p-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Manufacturer</label>
                  <select
                    onChange={(e) => updateFilter("manufacturer", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground"
                  >
                    <option value="">All</option>
                    {mfrList.map((m: string) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Price Range (PKR)</label>
                  <div className="flex gap-2">
                    <input
                      placeholder="Min"
                      type="number"
                      onChange={(e) => updateFilter("priceFrom", e.target.value)}
                      className="w-full px-2 py-2 rounded-lg border border-input bg-background text-sm text-foreground"
                    />
                    <input
                      placeholder="Max"
                      type="number"
                      onChange={(e) => updateFilter("priceTo", e.target.value)}
                      className="w-full px-2 py-2 rounded-lg border border-input bg-background text-sm text-foreground"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">City</label>
                  <input
                    placeholder="Any city"
                    onChange={(e) => updateFilter("city", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Condition</label>
                  <select
                    onChange={(e) => updateFilter("condition", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground"
                  >
                    <option value="">All</option>
                    <option value="NEW">New</option>
                    <option value="USED">Used</option>
                    <option value="DAMAGED">Damaged</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Sort By</label>
                  <select
                    onChange={(e) => updateFilter("sortBy", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground"
                  >
                    <option value="">Default</option>
                    <option value="price_asc">Price Low to High</option>
                    <option value="price_desc">Price High to Low</option>
                    <option value="newest">Newest First</option>
                  </select>
                </div>
                <button
                  onClick={() => setFilters({})}
                  className="w-full py-2 text-xs text-primary font-medium hover:underline"
                >
                  Clear Filters
                </button>
              </div>
            </aside>
          )}

          <div className="flex-1">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : listings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No listings found. Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map((listing: Record<string, unknown>) => {
                  const car = listing.car as Record<string, unknown> | undefined;
                  return (
                    <Link
                      key={listing.id as string}
                      href={`/marketplace/${listing.id}`}
                      className="bg-card rounded-xl border border-border shadow-card overflow-hidden hover:shadow-elevated transition-all group"
                    >
                      <div className="aspect-[16/10] bg-muted flex items-center justify-center">
                        <Car size={40} className="text-muted-foreground/30" />
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-sm font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                            {String(listing.title)}
                          </h3>
                          {Boolean(listing.isNegotiable || listing.negotiable) && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium flex-shrink-0">Negotiable</span>
                          )}
                        </div>
                        <p className="text-lg font-display font-bold text-gradient">
                          {formatPKR(Number(listing.askingPrice || listing.price || 0))}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin size={12} />{String(listing.city || car?.city || "")}</span>
                          <span>{String(car?.year || "")}</span>
                          {Boolean(car?.condition) && <StatusBadge status={String(car?.condition)} />}
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Eye size={12} />{(listing.viewCount || listing.views || 0) as number} views
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
