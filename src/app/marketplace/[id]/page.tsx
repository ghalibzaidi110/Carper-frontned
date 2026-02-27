"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useListingById, useContactSeller } from "@/hooks/use-api";
import { formatPKR, formatDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import { 
  ArrowLeft, Car, MapPin, Eye, Calendar, CheckCircle, AlertTriangle, 
  Mail, User, Phone, MessageSquare, Loader2, ChevronLeft, ChevronRight,
  Shield
} from "lucide-react";
import { toast } from "sonner";

export default function MarketplaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const listingId = params.id as string;
  
  const { data: listing, isLoading } = useListingById(listingId);
  const contactSeller = useContactSeller();
  
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    buyerName: user?.name || "",
    buyerEmail: user?.email || "",
    message: "",
  });
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Listing not found</p>
          <Link href="/marketplace" className="text-primary hover:underline">
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const car = listing.car as Record<string, unknown> | undefined;
  const seller = listing.seller as Record<string, unknown> | undefined;
  const catalogCar = car?.catalogCar as Record<string, unknown> | undefined;
  const images = listing.images as Array<Record<string, unknown>> || [];
  const carImages = car?.images as Array<Record<string, unknown>> || [];
  
  // Combine listing images and car images
  const allImages = images.length > 0 ? images : carImages;
  const mainImage = allImages[selectedImageIndex]?.imageUrl || allImages[selectedImageIndex]?.url || "";
  
  // Car specifications
  const manufacturer = catalogCar?.manufacturer || car?.manufacturer || "";
  const modelName = catalogCar?.modelName || car?.modelName || "";
  const year = catalogCar?.year || car?.year || "";
  const variant = catalogCar?.variant || car?.variant || "";
  const bodyType = catalogCar?.bodyType || "";
  const fuelType = catalogCar?.fuelType || "";
  const transmission = catalogCar?.transmission || "";
  const engineCapacity = catalogCar?.engineCapacity || "";
  const seatingCapacity = catalogCar?.seatingCapacity || "";
  const condition = car?.condition || "";
  const color = car?.color || "";
  const mileage = car?.mileage || 0;
  const registrationNumber = car?.registrationNumber || "";

  const handleContactSeller = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to contact the seller");
      router.push("/auth/login");
      return;
    }

    if (!user?.isVerified) {
      toast.error("Please verify your CNIC before contacting sellers");
      router.push("/dashboard/profile");
      return;
    }

    if (!contactForm.buyerName || !contactForm.buyerEmail || !contactForm.message) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await contactSeller.mutateAsync({
        id: listingId,
        payload: contactForm,
      });
      setShowContactModal(false);
      setContactForm({ ...contactForm, message: "" });
    } catch (error) {
      // Error handled by hook
    }
  };

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Car size={20} className="text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">AutoInspect</span>
          </Link>
          <Link
            href="/marketplace"
            className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Marketplace
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-[4/3] rounded-xl border border-border bg-muted overflow-hidden group">
              {mainImage ? (
                <img src={mainImage as string} alt="Car" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Car size={64} className="text-muted-foreground/30" />
                </div>
              )}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden transition-all ${
                      selectedImageIndex === idx
                        ? "border-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={(img.imageUrl || img.url) as string}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Listing Info */}
          <div className="space-y-6">
            {/* Title & Price */}
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                {listing.title as string}
              </h1>
              <div className="flex items-center gap-3 mb-4">
                <p className="text-3xl font-display font-bold text-gradient">
                  {formatPKR((listing.askingPrice || listing.price) as number)}
                </p>
                {Boolean(listing.isNegotiable || listing.negotiable) && (
                  <span className="px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium">
                    Negotiable
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {listing.city || car?.city || "N/A"}
                </span>
                <span className="flex items-center gap-1">
                  <Eye size={14} />
                  {listing.viewCount || listing.views || 0} views
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  Listed {formatDate((listing.createdAt || listing.listedDate) as string)}
                </span>
              </div>
            </div>

            {/* Seller Info */}
            {seller && (
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-display font-semibold text-foreground mb-3">Seller Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User size={16} className="text-muted-foreground" />
                    <span className="text-foreground">{seller.fullName || seller.name || "Seller"}</span>
                  </div>
                  {isAuthenticated && (
                    <button
                      onClick={() => setShowContactModal(true)}
                      className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Mail size={16} />
                      Contact Seller
                    </button>
                  )}
                  {!isAuthenticated && (
                    <Link
                      href="/auth/login"
                      className="block w-full mt-3 text-center px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      Login to Contact Seller
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Car Specifications */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-display font-semibold text-foreground mb-4">Car Specifications</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Manufacturer</p>
                  <p className="text-sm font-medium text-foreground">{manufacturer || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Model</p>
                  <p className="text-sm font-medium text-foreground">{modelName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Year</p>
                  <p className="text-sm font-medium text-foreground">{year || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Variant</p>
                  <p className="text-sm font-medium text-foreground">{variant || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Body Type</p>
                  <p className="text-sm font-medium text-foreground">{bodyType || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Fuel Type</p>
                  <p className="text-sm font-medium text-foreground">{fuelType || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Transmission</p>
                  <p className="text-sm font-medium text-foreground">{transmission || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Engine</p>
                  <p className="text-sm font-medium text-foreground">{engineCapacity || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Seating</p>
                  <p className="text-sm font-medium text-foreground">
                    {seatingCapacity ? `${seatingCapacity} seats` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Condition</p>
                  <StatusBadge status={condition as string} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Color</p>
                  <p className="text-sm font-medium text-foreground">{color || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Mileage</p>
                  <p className="text-sm font-medium text-foreground">
                    {mileage ? `${Number(mileage).toLocaleString()} km` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Registration #</p>
                  <p className="text-sm font-mono font-medium text-foreground">{registrationNumber || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            {listing.description && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-display font-semibold text-foreground mb-3">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {listing.description as string}
                </p>
              </div>
            )}

            {/* Damage Detection Status */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-display font-semibold text-foreground mb-3">Damage Detection Status</h3>
              <div className="flex items-center gap-3">
                {car?.hasDamage ? (
                  <>
                    <AlertTriangle size={20} className="text-warning" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Damage Detected</p>
                      <p className="text-xs text-muted-foreground">
                        Last scanned: {car.lastScannedAt ? formatDate(car.lastScannedAt as string) : "N/A"}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} className="text-success" />
                    <div>
                      <p className="text-sm font-medium text-foreground">No Damage Detected</p>
                      <p className="text-xs text-muted-foreground">
                        Last scanned: {car?.lastScannedAt ? formatDate(car.lastScannedAt as string) : "Not scanned yet"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Seller Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card rounded-xl border border-border shadow-elevated max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-semibold text-foreground">Contact Seller</h2>
              <button
                onClick={() => setShowContactModal(false)}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {!user?.isVerified && (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-2">
                <Shield size={16} className="text-warning mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-foreground mb-1">CNIC Verification Required</p>
                  <p className="text-muted-foreground">
                    Please verify your CNIC in your profile before contacting sellers.
                  </p>
                  <Link
                    href="/dashboard/profile"
                    className="text-primary hover:underline mt-1 inline-block"
                  >
                    Go to Profile
                  </Link>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Your Name</label>
                <input
                  type="text"
                  value={contactForm.buyerName}
                  onChange={(e) => setContactForm({ ...contactForm, buyerName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Your Email</label>
                <input
                  type="email"
                  value={contactForm.buyerEmail}
                  onChange={(e) => setContactForm({ ...contactForm, buyerEmail: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Message</label>
                <textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="I'm interested in your car. Please contact me..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowContactModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleContactSeller}
                disabled={contactSeller.isPending || !user?.isVerified}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {contactSeller.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageSquare size={16} />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

