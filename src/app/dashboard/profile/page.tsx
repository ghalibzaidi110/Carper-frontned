"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateProfile, useChangePassword, useUploadCnic, useUploadAvatar } from "@/hooks/use-api";
import {
  Shield,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Lock,
  Check,
} from "lucide-react";
import { formatDate } from "@/lib/format";

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
  { test: (p: string) => /\d/.test(p), label: "One number" },
  { test: (p: string) => /[@$!%*?&#]/.test(p), label: "One special character (@$!%*?&#)" },
];

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const router = useRouter();
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

  const initialForm = {
    fullName: user.fullName || user.name || "",
    phoneNumber: user.phoneNumber || user.phone || "",
    city: user.city || "",
    address: user.address || "",
  };

  const enterEditMode = () => {
    // Always start from the current saved values, not stale form state.
    setForm(initialForm);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setForm(initialForm);
    setEditMode(false);
  };

  const handleSaveProfile = async () => {
    // Client-side validation that matches the backend DTO so the user gets
    // immediate feedback instead of waiting for a 400 round-trip.
    const trimmed = {
      fullName: form.fullName.trim(),
      phoneNumber: form.phoneNumber.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
    };

    if (trimmed.fullName && (trimmed.fullName.length < 2 || trimmed.fullName.length > 100)) {
      toast.error("Full name must be 2-100 characters");
      return;
    }
    if (trimmed.phoneNumber && !/^\+?[1-9]\d{1,14}$/.test(trimmed.phoneNumber)) {
      toast.error("Phone must be in international format, e.g. +923001234567");
      return;
    }
    if (trimmed.city && (trimmed.city.length < 2 || trimmed.city.length > 50)) {
      toast.error("City must be 2-50 characters");
      return;
    }
    if (trimmed.address && (trimmed.address.length < 5 || trimmed.address.length > 200)) {
      toast.error("Address must be 5-200 characters");
      return;
    }

    // Only send fields that actually changed. Omitting empty strings avoids
    // the backend's MinLength validators rejecting blanked-out fields.
    const payload: Record<string, string> = {};
    (Object.keys(trimmed) as Array<keyof typeof trimmed>).forEach((key) => {
      const next = trimmed[key];
      const prev = (initialForm[key] || "").trim();
      if (next && next !== prev) payload[key] = next;
    });

    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save");
      setEditMode(false);
      return;
    }

    try {
      await updateProfile.mutateAsync(payload);
      await refreshUser();
      toast.success("Profile updated");
      setEditMode(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile");
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.current || !passwords.new) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast.error("New passwords don't match");
      return;
    }
    if (passwords.new === passwords.current) {
      toast.error("New password must be different from your current password");
      return;
    }
    const failingRule = PASSWORD_RULES.find((r) => !r.test(passwords.new));
    if (failingRule) {
      toast.error(`Password requirement: ${failingRule.label}`);
      return;
    }

    try {
      await changePassword.mutateAsync({
        currentPassword: passwords.current,
        newPassword: passwords.new,
      });
      // Backend invalidates the refresh token on success, so we must log out
      // immediately or the user will be silently kicked out within 15 minutes.
      toast.success("Password changed. Please log in with your new password.");
      setPasswords({ current: "", new: "", confirm: "" });
      await logout();
      router.push("/auth/login");
    } catch (err: any) {
      toast.error(err?.message || "Failed to change password");
    }
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

  const passwordsMatch = passwords.new === passwords.confirm;
  const allRulesPass = PASSWORD_RULES.every((r) => r.test(passwords.new));
  const canSubmitPassword =
    !!passwords.current &&
    !!passwords.new &&
    passwordsMatch &&
    allRulesPass &&
    passwords.new !== passwords.current;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Hero card */}
      <div className="bg-card rounded-2xl border border-border shadow-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="relative">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl font-display font-bold text-primary overflow-hidden">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            <button
              onClick={() => avatarRef.current?.click()}
              disabled={uploadAvatar.isPending}
              className="absolute -bottom-1.5 -right-1.5 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              title="Change photo"
            >
              {uploadAvatar.isPending ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-display font-bold text-foreground truncate">{user.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{user.email}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide">
                {user.role.replace("_", " ")}
              </span>
              {user.isVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-semibold">
                  <CheckCircle2 size={12} />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-warning/10 text-warning text-xs font-semibold">
                  <AlertCircle size={12} />
                  Unverified
                </span>
              )}
            </div>
          </div>

          {/* Edit toggle */}
          <button
            onClick={editMode ? cancelEdit : enterEditMode}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Pencil size={14} />
            {editMode ? "Cancel" : "Edit Profile"}
          </button>
        </div>
      </div>

      {/* Personal Info + CNIC */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="bg-card rounded-2xl border border-border shadow-card p-6">
          <h3 className="font-display font-semibold text-foreground text-lg mb-5">Personal Info</h3>
          {editMode ? (
            <div className="space-y-4">
              <Field label="Full Name">
                <input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </Field>
              <Field label="Phone">
                <input
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  placeholder="+92 300 1234567"
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </Field>
              <Field label="City">
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Lahore"
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </Field>
              <Field label="Address">
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street, area..."
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </Field>
              <button
                onClick={handleSaveProfile}
                disabled={updateProfile.isPending}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updateProfile.isPending && <Loader2 size={14} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <Row icon={<Mail size={16} />} label="Email" value={user.email} />
              <Row icon={<Phone size={16} />} label="Phone" value={user.phone || user.phoneNumber || "Not set"} />
              <Row icon={<MapPin size={16} />} label="City" value={user.city || "Not set"} />
              <Row icon={<Calendar size={16} />} label="Joined" value={formatDate(user.createdAt)} />
              {user.businessName && (
                <Row icon={<Building size={16} />} label="Business" value={user.businessName} />
              )}
            </div>
          )}
        </div>

        {/* CNIC Verification */}
        <div className="bg-card rounded-2xl border border-border shadow-card p-6">
          <h3 className="font-display font-semibold text-foreground text-lg mb-5">Identity Verification</h3>

          <div
            className={`rounded-xl p-4 border ${
              user.isVerified
                ? "bg-success/5 border-success/20"
                : user.cnicImageUrl
                ? "bg-info/5 border-info/20"
                : "bg-warning/5 border-warning/20"
            }`}
          >
            <div className="flex items-start gap-3">
              <Shield
                size={22}
                className={
                  user.isVerified
                    ? "text-success"
                    : user.cnicImageUrl
                    ? "text-info"
                    : "text-warning"
                }
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {user.isVerified
                    ? "Verified"
                    : user.cnicImageUrl
                    ? "Pending Review"
                    : "Not Verified"}
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {user.isVerified
                    ? "Your identity has been verified by our team."
                    : user.cnicImageUrl
                    ? "Your CNIC is under admin review. We'll notify you once verified."
                    : "Upload a clear photo of your CNIC to get verified and unlock all features."}
                </p>
              </div>
            </div>
          </div>

          {!user.isVerified && (
            <button
              onClick={() => cnicRef.current?.click()}
              disabled={uploadCnic.isPending}
              className="mt-4 w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploadCnic.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Camera size={14} />
              )}
              {user.cnicImageUrl ? "Re-upload CNIC" : "Upload CNIC"}
            </button>
          )}
          <input
            ref={cnicRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCnicUpload}
          />
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-card rounded-2xl border border-border shadow-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={18} className="text-muted-foreground" />
          <h3 className="font-display font-semibold text-foreground text-lg">Change Password</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          You&apos;ll be logged out on all devices after a successful change.
        </p>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Current Password">
            <input
              type="password"
              autoComplete="current-password"
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
          <Field label="New Password">
            <input
              type="password"
              autoComplete="new-password"
              value={passwords.new}
              onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              placeholder="Enter a strong password"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
          <Field label="Confirm New Password">
            <input
              type="password"
              autoComplete="new-password"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              placeholder="Repeat new password"
              className={`w-full px-3 py-2.5 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 ${
                passwords.confirm && !passwordsMatch
                  ? "border-destructive focus:ring-destructive"
                  : "border-input focus:ring-ring"
              }`}
            />
          </Field>
        </div>

        {/* Live requirements */}
        {passwords.new && (
          <div className="mt-4 grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.test(passwords.new);
              return (
                <div
                  key={rule.label}
                  className={`flex items-center gap-2 text-xs ${
                    ok ? "text-success" : "text-muted-foreground"
                  }`}
                >
                  <Check size={14} className={ok ? "opacity-100" : "opacity-30"} />
                  {rule.label}
                </div>
              );
            })}
          </div>
        )}

        {passwords.confirm && !passwordsMatch && (
          <p className="text-xs text-destructive mt-3">Passwords don&apos;t match.</p>
        )}
        {passwords.new && passwords.new === passwords.current && (
          <p className="text-xs text-destructive mt-3">
            New password must be different from your current password.
          </p>
        )}

        <button
          onClick={handleChangePassword}
          disabled={changePassword.isPending || !canSubmitPassword}
          className="mt-5 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {changePassword.isPending && <Loader2 size={14} className="animate-spin" />}
          Update Password
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
