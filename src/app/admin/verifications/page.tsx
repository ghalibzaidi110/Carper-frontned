"use client";

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { useAdminVerifications, useAdminUpdateUser } from "@/hooks/use-api";
import { Eye, CheckCircle, XCircle, Shield, Loader2 } from "lucide-react";

export default function AdminVerificationsPage() {
  const { data: verifData, isLoading } = useAdminVerifications({ limit: 50 });
  const updateUser = useAdminUpdateUser();

  const rawPending = verifData?.data || verifData || [];
  const pending = Array.isArray(rawPending) ? rawPending : rawPending?.data || [];

  const handleApprove = (userId: string) => {
    updateUser.mutate({ id: userId, payload: { isVerified: true } });
  };

  const handleReject = (userId: string) => {
    updateUser.mutate({ id: userId, payload: { isVerified: false } });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">CNIC Verification Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">{pending.length} pending verifications</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-4">
            {pending.map((u: Record<string, unknown>) => (
              <div key={String(u.id)} className="bg-card rounded-xl border border-border shadow-card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                      <Shield size={24} className="text-warning" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{String(u.fullName || u.name)}</p>
                      <p className="text-xs text-muted-foreground">{String(u.email)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={String(u.accountType || u.role)} />
                        <span className="text-xs text-muted-foreground">City: {String(u.city || "N/A")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {Boolean(u.cnicImageUrl) && (
                      <a
                        href={String(u.cnicImageUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-sm text-foreground hover:bg-muted/80 transition-colors"
                      >
                        <Eye size={14} /> View CNIC
                      </a>
                    )}
                    <button
                      onClick={() => handleApprove(u.id as string)}
                      disabled={updateUser.isPending}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-success/10 text-sm text-success font-medium hover:bg-success/20 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(u.id as string)}
                      disabled={updateUser.isPending}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 text-sm text-destructive font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {!isLoading && pending.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Shield size={48} className="mx-auto mb-4 opacity-30" />
                <p>No pending verifications</p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
