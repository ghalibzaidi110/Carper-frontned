"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import {
  useRentalById,
  useCompleteRental,
  useCancelRental,
} from "@/hooks/use-api";
import { reportsService } from "@/services/reports.service";
import { formatPKR, formatDate } from "@/lib/format";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  X,
  Download,
  Calendar,
  User,
  Phone,
  Mail,
  Car,
  Gauge,
  DollarSign,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function RentalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rentalId = params.id as string;

  const { data: rental, isLoading } = useRentalById(rentalId);
  const completeRental = useCompleteRental();
  const cancelRental = useCancelRental();

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeForm, setCompleteForm] = useState({
    mileageAtEnd: "",
    postRentalNotes: "",
    damageCharges: "",
    damageDescription: "",
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!rental) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Rental not found</p>
          <Link href="/dashboard/rentals" className="text-primary hover:underline">
            Back to Rentals
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const car = rental.car as Record<string, unknown> | undefined;
  const catalogCar = car?.catalogCar as Record<string, unknown> | undefined;
  const status = rental.status as string;
  const isActive = status === "ACTIVE";
  const isCompleted = status === "COMPLETED";
  const isCancelled = status === "CANCELLED";

  const handleComplete = async () => {
    if (!completeForm.mileageAtEnd) {
      toast.error("Please enter mileage at end");
      return;
    }

    const mileageEnd = Number(completeForm.mileageAtEnd);
    if (isNaN(mileageEnd) || mileageEnd < 0) {
      toast.error("Please enter a valid mileage");
      return;
    }

    const damageCharges = completeForm.damageCharges ? Number(completeForm.damageCharges) : 0;
    if (damageCharges < 0) {
      toast.error("Damage charges cannot be negative");
      return;
    }

    const rentalPrice = (rental.rentalPrice as number) || 0;
    const totalCharges = rentalPrice + damageCharges;

    try {
      await completeRental.mutateAsync({
        id: rentalId,
        payload: {
          mileageAtEnd: mileageEnd,
          postRentalNotes: completeForm.postRentalNotes || undefined,
          damageCharges: damageCharges > 0 ? damageCharges : undefined,
          damageDescription: completeForm.damageDescription || undefined,
          totalCharges,
        },
      });
      setShowCompleteModal(false);
      setCompleteForm({
        mileageAtEnd: "",
        postRentalNotes: "",
        damageCharges: "",
        damageDescription: "",
      });
      toast.success("Rental completed successfully!");
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this rental? This action cannot be undone.")) {
      return;
    }

    try {
      await cancelRental.mutateAsync(rentalId);
      toast.success("Rental cancelled successfully");
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDownloadPdf = async () => {
    try {
      await reportsService.downloadRentalReport(rentalId);
    } catch (error) {
      // Error handled by service
    }
  };

  const manufacturer = catalogCar?.manufacturer || car?.manufacturer || "";
  const model = catalogCar?.modelName || car?.model || "";
  const year = catalogCar?.year || car?.year || "";
  const regNumber = car?.registrationNumber || "";

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/rentals"
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Rental Details</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {manufacturer} {model} {year} ({regNumber})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Download size={16} />
              Download PDF
            </button>
            {isActive && (
              <>
                <button
                  onClick={() => setShowCompleteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success text-success-foreground text-sm font-medium hover:bg-success/90 transition-colors"
                >
                  <CheckCircle size={16} />
                  Complete Rental
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelRental.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  {cancelRental.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <X size={16} />
                  )}
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          {isCompleted && (
            <span className="text-sm text-muted-foreground">
              Completed on {formatDate(rental.actualEndDate as string || rental.endDate as string)}
            </span>
          )}
        </div>

        {/* Rental Information */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Vehicle Info */}
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Car size={20} />
              Vehicle Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Car</p>
                <p className="text-sm font-medium text-foreground">
                  {manufacturer} {model} {year}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Registration Number</p>
                <p className="text-sm font-mono font-medium text-foreground">{regNumber}</p>
              </div>
              {rental.mileageAtStart && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Mileage at Start</p>
                  <p className="text-sm font-medium text-foreground">
                    {(rental.mileageAtStart as number)?.toLocaleString()} km
                  </p>
                </div>
              )}
              {rental.mileageAtEnd && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Mileage at End</p>
                  <p className="text-sm font-medium text-foreground">
                    {(rental.mileageAtEnd as number)?.toLocaleString()} km
                  </p>
                </div>
              )}
              {rental.mileageAtStart && rental.mileageAtEnd && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Total Distance</p>
                  <p className="text-sm font-medium text-foreground">
                    {((rental.mileageAtEnd as number) - (rental.mileageAtStart as number)).toLocaleString()} km
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Renter Info */}
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <User size={20} />
              Renter Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Name</p>
                <p className="text-sm font-medium text-foreground">{rental.renterName as string}</p>
              </div>
              {rental.renterPhone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-muted-foreground" />
                  <p className="text-sm text-foreground">{rental.renterPhone as string}</p>
                </div>
              )}
              {rental.renterEmail && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-muted-foreground" />
                  <p className="text-sm text-foreground">{rental.renterEmail as string}</p>
                </div>
              )}
              {rental.renterCnic && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">CNIC</p>
                  <p className="text-sm font-mono text-foreground">{rental.renterCnic as string}</p>
                </div>
              )}
            </div>
          </div>

          {/* Rental Period */}
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar size={20} />
              Rental Period
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Start Date</p>
                <p className="text-sm font-medium text-foreground">
                  {formatDate(rental.startDate as string)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">End Date</p>
                <p className="text-sm font-medium text-foreground">
                  {formatDate(rental.endDate as string)}
                </p>
              </div>
              {rental.actualEndDate && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Actual Return Date</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatDate(rental.actualEndDate as string)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <DollarSign size={20} />
              Financial Summary
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Rental Price</p>
                <p className="text-sm font-medium text-foreground">
                  {formatPKR(rental.rentalPrice as number)}
                </p>
              </div>
              {rental.damageCharges && rental.damageCharges > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Damage Charges</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatPKR(rental.damageCharges as number)}
                  </p>
                </div>
              )}
              {rental.totalCharges && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Total Charges</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatPKR(rental.totalCharges as number)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        {(rental.preRentalNotes || rental.postRentalNotes) && (
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText size={20} />
              Notes
            </h3>
            <div className="space-y-4">
              {rental.preRentalNotes && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-2">Pre-Rental Notes</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {rental.preRentalNotes as string}
                  </p>
                </div>
              )}
              {rental.postRentalNotes && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-2">Post-Rental Notes</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {rental.postRentalNotes as string}
                  </p>
                </div>
              )}
              {rental.damageDescription && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-2">Damage Description</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {rental.damageDescription as string}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Complete Rental Modal */}
        {showCompleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="bg-card rounded-xl border border-border shadow-elevated max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-display font-semibold text-foreground">Complete Rental</h2>
                <button
                  onClick={() => setShowCompleteModal(false)}
                  className="p-1 rounded-lg hover:bg-muted transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Mileage at End (km) *
                  </label>
                  <input
                    type="number"
                    value={completeForm.mileageAtEnd}
                    onChange={(e) => setCompleteForm({ ...completeForm, mileageAtEnd: e.target.value })}
                    required
                    min={rental.mileageAtStart || 0}
                    placeholder={(rental.mileageAtStart as number)?.toString() || "0"}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Post-Rental Notes
                  </label>
                  <textarea
                    value={completeForm.postRentalNotes}
                    onChange={(e) => setCompleteForm({ ...completeForm, postRentalNotes: e.target.value })}
                    rows={3}
                    placeholder="Note any damage, issues, or conditions..."
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Damage Charges (PKR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₨</span>
                    <input
                      type="number"
                      value={completeForm.damageCharges}
                      onChange={(e) => setCompleteForm({ ...completeForm, damageCharges: e.target.value })}
                      placeholder="0"
                      min="0"
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                {completeForm.damageCharges && Number(completeForm.damageCharges) > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Damage Description
                    </label>
                    <textarea
                      value={completeForm.damageDescription}
                      onChange={(e) => setCompleteForm({ ...completeForm, damageDescription: e.target.value })}
                      rows={2}
                      placeholder="Describe the damage..."
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>
                )}
                {completeForm.mileageAtEnd && completeForm.damageCharges && (
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">Total Charges</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatPKR(
                        (rental.rentalPrice as number) + (Number(completeForm.damageCharges) || 0)
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCompleteModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  disabled={!completeForm.mileageAtEnd || completeRental.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {completeRental.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Complete Rental
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

