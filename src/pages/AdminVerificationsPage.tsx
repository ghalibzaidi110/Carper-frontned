import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { DUMMY_USERS } from "@/data/dummy";
import { Eye, CheckCircle, XCircle, Shield } from "lucide-react";

const AdminVerificationsPage = () => {
  const pending = DUMMY_USERS.filter((u) => !u.isVerified && u.role !== "ADMIN");

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">CNIC Verification Queue</h1>
            <p className="text-sm text-muted-foreground mt-1">{pending.length} pending verifications</p>
          </div>
        </div>

        <div className="space-y-4">
          {pending.map((u) => (
            <div key={u.id} className="bg-card rounded-xl border border-border shadow-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                    <Shield size={24} className="text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={u.role} />
                      <span className="text-xs text-muted-foreground">City: {u.city}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-sm text-foreground hover:bg-muted/80 transition-colors">
                    <Eye size={14} /> View CNIC
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-success/10 text-sm text-success font-medium hover:bg-success/20 transition-colors">
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 text-sm text-destructive font-medium hover:bg-destructive/20 transition-colors">
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}

          {pending.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Shield size={48} className="mx-auto mb-4 opacity-30" />
              <p>No pending verifications</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminVerificationsPage;
