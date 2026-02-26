"use client";

import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import StatusBadge from "@/components/StatusBadge";
import { useUpdateProfile, useChangePassword, useUploadCnic, useUploadAvatar } from "@/hooks/use-api";
import { Shield, Mail, Phone, MapPin, Calendar, Building, Upload, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const uploadCnic = useUploadCnic();
  const uploadAvatar = useUploadAvatar();
  const cnicRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.fullName || user?.name || "",
    phoneNumber: user?.phoneNumber || user?.phone || "",
    city: user?.city || "",
    address: user?.address || "",
  });
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  if (!user) return null;

  const handleSaveProfile = async () => {
    await updateProfile.mutateAsync(form);
    await refreshUser();
    setEditMode(false);
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) return;
    await changePassword.mutateAsync({ currentPassword: passwords.current, newPassword: passwords.new });
    setPasswords({ current: "", new: "", confirm: "" });
  };

  const handleCnicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadCnic.mutateAsync(file);
      await refreshUser();
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAvatar.mutateAsync(file);
      await refreshUser();
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6 animate-fade-in">
        <h1 className="text-2xl font-display font-bold text-foreground">Profile</h1>

        <div className="bg-card rounded-xl border border-border shadow-card p-6">
          <div className="flex items-start gap-4">
            <div className="relative group">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-display font-bold text-primary overflow-hidden">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <button
                onClick={() => avatarRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Upload size={16} className="text-white" />
              </button>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-display font-bold text-foreground">{user.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={user.role} />
                <StatusBadge status={user.isVerified ? "VERIFIED" : "UNVERIFIED"} />
                <StatusBadge status={user.status} />
              </div>
            </div>
            <button
              onClick={() => setEditMode(!editMode)}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20"
            >
              {editMode ? "Cancel" : "Edit"}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border shadow-card p-5 space-y-4">
            <h3 className="font-display font-semibold text-foreground">Personal Info</h3>
            {editMode ? (
              <div className="space-y-3">
                <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Full Name"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground" />
                <input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="Phone"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground" />
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground" />
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground" />
                <button
                  onClick={handleSaveProfile}
                  disabled={updateProfile.isPending}
                  className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {updateProfile.isPending && <Loader2 size={14} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={16} className="text-muted-foreground" />
                  <span className="text-foreground">{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone size={16} className="text-muted-foreground" />
                  <span className="text-foreground">{user.phone || "Not set"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin size={16} className="text-muted-foreground" />
                  <span className="text-foreground">{user.city || "Not set"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={16} className="text-muted-foreground" />
                  <span className="text-foreground">Joined {formatDate(user.createdAt)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border shadow-card p-5 space-y-4">
            <h3 className="font-display font-semibold text-foreground">CNIC Verification</h3>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
              <Shield size={24} className={user.isVerified ? "text-success" : "text-warning"} />
              <div>
                <p className="text-sm font-medium text-foreground">{user.isVerified ? "Verified" : user.cnicImageUrl ? "Pending Review" : "Not Verified"}</p>
                <p className="text-xs text-muted-foreground">
                  {user.isVerified ? "Your identity has been verified." : user.cnicImageUrl ? "Your CNIC is under admin review." : "Upload your CNIC to get verified."}
                </p>
              </div>
            </div>
            {!user.isVerified && (
              <button
                onClick={() => cnicRef.current?.click()}
                disabled={uploadCnic.isPending}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploadCnic.isPending && <Loader2 size={14} className="animate-spin" />}
                Upload CNIC
              </button>
            )}
            <input ref={cnicRef} type="file" accept="image/*" className="hidden" onChange={handleCnicUpload} />
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

        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Change Password</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <input
              type="password"
              placeholder="Current Password"
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground"
            />
            <input
              type="password"
              placeholder="New Password"
              value={passwords.new}
              onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground"
            />
            <input
              type="password"
              placeholder="Confirm New"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground"
            />
            <button
              onClick={handleChangePassword}
              disabled={changePassword.isPending || !passwords.current || !passwords.new || passwords.new !== passwords.confirm}
              className="py-2.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              Update Password
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
