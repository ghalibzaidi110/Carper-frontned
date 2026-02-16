import { useState } from "react";
import { DUMMY_LISTINGS, MANUFACTURERS } from "@/data/dummy";
import { formatPKR } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import { Link } from "react-router-dom";
import { Search, SlidersHorizontal, Eye, Car, MapPin } from "lucide-react";

const MarketplacePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const listings = DUMMY_LISTINGS.filter((l) => l.status === "ACTIVE");

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Car size={20} className="text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">AutoInspect</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth/login" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
            <Link to="/auth/register" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Get Started</Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Search */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xl">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search cars..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
          {/* Filter sidebar */}
          {showFilters && (
            <aside className="w-64 flex-shrink-0 space-y-4 animate-slide-in-left">
              <div className="bg-card rounded-xl border border-border shadow-card p-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Manufacturer</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground">
                    <option>All</option>
                    {MANUFACTURERS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Price Range (PKR)</label>
                  <div className="flex gap-2">
                    <input placeholder="Min" className="w-full px-2 py-2 rounded-lg border border-input bg-background text-sm text-foreground" />
                    <input placeholder="Max" className="w-full px-2 py-2 rounded-lg border border-input bg-background text-sm text-foreground" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">City</label>
                  <input placeholder="Any city" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Condition</label>
                  <div className="space-y-2">
                    {["New", "Used", "Damaged"].map((c) => (
                      <label key={c} className="flex items-center gap-2 text-sm text-foreground">
                        <input type="checkbox" className="rounded border-input" /> {c}
                      </label>
                    ))}
                  </div>
                </div>
                <button className="w-full py-2 text-xs text-primary font-medium hover:underline">Clear Filters</button>
              </div>
            </aside>
          )}

          {/* Listings Grid */}
          <div className="flex-1">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing) => (
                <div key={listing.id} className="bg-card rounded-xl border border-border shadow-card overflow-hidden hover:shadow-elevated transition-all group">
                  {/* Image placeholder */}
                  <div className="aspect-[16/10] bg-muted flex items-center justify-center">
                    <Car size={40} className="text-muted-foreground/30" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                        {listing.car.manufacturer} {listing.car.model} {listing.car.year}
                      </h3>
                      {listing.negotiable && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium flex-shrink-0">Negotiable</span>
                      )}
                    </div>
                    <p className="text-lg font-display font-bold text-gradient">{formatPKR(listing.price)}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin size={12} />{listing.city}</span>
                      <span>{listing.car.year}</span>
                      <StatusBadge status={listing.car.condition} />
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Eye size={12} />{listing.views} views
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplacePage;
