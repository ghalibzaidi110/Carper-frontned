import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import StatusBadge from "@/components/StatusBadge";
import { Shield, Mail, Phone, MapPin, Calendar, Building } from "lucide-react";
import { formatDate } from "@/lib/format";

const ProfilePage = () => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6 animate-fade-in">
        <h1 className="text-2xl font-display font-bold text-foreground">Profile</h1>

        {/* Profile Card */}
        <div className="bg-card rounded-xl border border-border shadow-card p-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-display font-bold text-primary">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-display font-bold text-foreground">{user.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={user.role} />
                <StatusBadge status={user.isVerified ? "VERIFIED" : "UNVERIFIED"} />
                <StatusBadge status={user.status} />
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border shadow-card p-5 space-y-4">
            <h3 className="font-display font-semibold text-foreground">Personal Info</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail size={16} className="text-muted-foreground" />
                <span className="text-foreground">{user.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone size={16} className="text-muted-foreground" />
                <span className="text-foreground">{user.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin size={16} className="text-muted-foreground" />
                <span className="text-foreground">{user.city}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar size={16} className="text-muted-foreground" />
                <span className="text-foreground">Joined {formatDate(user.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-card p-5 space-y-4">
            <h3 className="font-display font-semibold text-foreground">CNIC Verification</h3>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
              <Shield size={24} className={user.isVerified ? "text-success" : "text-warning"} />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {user.isVerified ? "Verified" : "Not Verified"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.isVerified ? "Your identity has been verified." : "Upload your CNIC to get verified."}
                </p>
              </div>
            </div>
            {!user.isVerified && (
              <button className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                Upload CNIC
              </button>
            )}

            {user.businessName && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-foreground mb-2">Business Info</h4>
                <div className="flex items-center gap-3 text-sm">
                  <Building size={16} className="text-muted-foreground" />
                  <span className="text-foreground">{user.businessName}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Change Password</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <input type="password" placeholder="Current Password" className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground" />
            <input type="password" placeholder="New Password" className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground" />
            <button className="py-2.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">
              Update Password
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
