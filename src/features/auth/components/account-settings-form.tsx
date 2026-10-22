"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError } from "@/core/api/api-error";
import { useRuntime } from "@/core/config/runtime";
import { env } from "@/core/config/env";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormField } from "@/shared/forms/form-field";
import { AccountAvatar } from "./account-avatar";
import { authApi } from "../api/auth.api";
import { currentUserKeys, useCurrentUser } from "../hooks/use-current-user";
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordInput,
  type ProfileInput,
} from "../schemas/account-management.schema";

function validationMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  if (error.status === 429) return "Bạn thao tác quá nhanh. Vui lòng chờ một phút rồi thử lại.";
  if (error.code === "network") return "Không thể kết nối đến máy chủ. Kiểm tra mạng và thử lại.";
  if (error.code === "validation") return "Thông tin chưa hợp lệ. Hãy kiểm tra lại các trường.";
  return fallback;
}

export function AccountSettingsForm() {
  const { api, session, queryClient } = useRuntime();
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();
  const [profileNotice, setProfileNotice] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteGoogleToken, setDeleteGoogleToken] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showGoogleError, setShowGoogleError] = useState(false);

  const profileForm = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: "", phone: "", avatarUrl: "" },
  });
  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const previewName = useWatch({ control: profileForm.control, name: "displayName" });
  const previewUrl = useWatch({ control: profileForm.control, name: "avatarUrl" });

  useEffect(() => {
    if (!user) return;
    profileForm.reset({
      displayName: user.displayName,
      phone: user.phone ?? "",
      avatarUrl: user.avatarUrl ?? "",
    });
  }, [user, profileForm]);

  async function saveProfile(values: ProfileInput) {
    setProfileNotice("");
    setSavingProfile(true);
    try {
      const updated = await authApi.updateProfile(api, {
        displayName: values.displayName,
        phone: values.phone || null,
        avatarUrl: values.avatarUrl || null,
      });
      queryClient.setQueryData(currentUserKeys.me(), updated);
      setProfileNotice("Thông tin tài khoản đã được lưu.");
    } catch (error) {
      profileForm.setError("root.server", {
        message: validationMessage(error, "Chưa thể lưu thông tin. Vui lòng thử lại."),
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(values: ChangePasswordInput) {
    passwordForm.clearErrors("root");
    setChangingPassword(true);
    try {
      await authApi.changePassword(api, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      session.clear();
      queryClient.clear();
      passwordForm.reset();
      router.replace("/login?passwordChanged=1");
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors.CurrentPassword) {
        passwordForm.setError("currentPassword", { message: "Mật khẩu hiện tại không đúng." });
        return;
      }
      const message =
        error instanceof ApiError && error.status === 401
          ? "Mật khẩu hiện tại không đúng hoặc phiên đăng nhập đã hết hạn."
          : validationMessage(error, "Chưa thể đổi mật khẩu. Vui lòng thử lại.");
      passwordForm.setError("root.server", { message });
    } finally {
      setChangingPassword(false);
    }
  }

  async function deleteAccount() {
    setDeleteError("");
    if (deleteConfirmation !== "XOA TAI KHOAN") {
      setDeleteError("Nhập chính xác XOA TAI KHOAN để xác nhận.");
      return;
    }
    if (!deletePassword && !deleteGoogleToken) {
      setDeleteError("Hãy nhập mật khẩu hoặc xác thực lại với Google.");
      return;
    }
    if (
      !window.confirm(
        "Tài khoản sẽ bị vô hiệu hóa và thông tin định danh sẽ được ẩn. Bạn có chắc muốn tiếp tục?",
      )
    )
      return;

    setDeleting(true);
    try {
      await authApi.deleteAccount(
        api,
        deletePassword ? { password: deletePassword } : { googleIdToken: deleteGoogleToken },
      );
      session.clear();
      queryClient.clear();
      router.replace("/login?accountDeleted=1");
    } catch (error) {
      const code = error instanceof ApiError ? error.backendCode : undefined;
      const message =
        code === "ACTIVE_WEDDING_OWNED"
          ? "Bạn đang sở hữu đám cưới còn hoạt động. Hãy đóng hoặc chuyển quyền sở hữu trước khi xóa tài khoản."
          : code === "ADMIN_CANNOT_SELF_DELETE"
            ? "Tài khoản quản trị không thể tự xóa."
            : code === "PASSWORD_REQUIRED" || code === "GOOGLE_TOKEN_REQUIRED"
              ? "Cần xác thực lại bằng phương thức đăng nhập của tài khoản."
              : error instanceof ApiError && error.status === 401
                ? "Thông tin xác thực không đúng hoặc phiên đăng nhập đã hết hạn."
                : validationMessage(error, "Chưa thể xóa tài khoản. Vui lòng thử lại.");
      setDeleteError(message);
      setDeleteGoogleToken("");
    } finally {
      setDeleting(false);
    }
  }

  function handleGoogleReauth(response: CredentialResponse) {
    if (!response.credential) {
      setShowGoogleError(true);
      return;
    }
    setDeleteGoogleToken(response.credential);
    setDeletePassword("");
    setShowGoogleError(false);
    setDeleteError("");
  }

  if (isLoading || !user) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Đang tải thông tin tài khoản…
      </p>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <section
        aria-labelledby="profile-heading"
        className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-7"
      >
        <div>
          <h2 id="profile-heading" className="text-xl font-semibold">
            Thông tin cá nhân
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cập nhật thông tin hiển thị trên InviteMe.
          </p>
        </div>
        <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-5" noValidate>
          <FormField control={profileForm.control} name="displayName" label="Họ và tên">
            {(field) => (
              <Input
                {...field}
                value={String(field.value ?? "")}
                aria-invalid={field["aria-invalid"]}
                aria-describedby={field["aria-describedby"]}
                maxLength={50}
                disabled={savingProfile}
              />
            )}
          </FormField>
          <div className="space-y-2">
            <label htmlFor="account-email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="account-email"
              type="email"
              value={user.email}
              readOnly
              aria-readonly="true"
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Email không thể thay đổi tại đây.</p>
          </div>
          <FormField control={profileForm.control} name="phone" label="Số điện thoại">
            {(field) => (
              <Input
                {...field}
                value={String(field.value ?? "")}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="0912345678"
                aria-invalid={field["aria-invalid"]}
                aria-describedby={field["aria-describedby"]}
                disabled={savingProfile}
              />
            )}
          </FormField>
          <FormField control={profileForm.control} name="avatarUrl" label="URL ảnh đại diện">
            {(field) => (
              <Input
                {...field}
                value={String(field.value ?? "")}
                type="url"
                placeholder="https://example.com/avatar.jpg"
                aria-invalid={field["aria-invalid"]}
                aria-describedby={field["aria-describedby"]}
                disabled={savingProfile}
              />
            )}
          </FormField>
          <div className="flex items-center gap-4 rounded-xl bg-muted/50 p-4">
            <AccountAvatar
              name={previewName || user.displayName}
              imageUrl={previewUrl || null}
              size="large"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium">Xem trước ảnh đại diện</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">
                URL ảnh sẽ được lưu khi bạn nhấn “Lưu hồ sơ”. Nên dùng link HTTPS trực tiếp tới ảnh.
              </p>
            </div>
          </div>
          {profileForm.formState.errors.root?.server && (
            <p role="alert" className="text-sm text-destructive">
              {profileForm.formState.errors.root.server.message}
            </p>
          )}
          {profileNotice && (
            <p role="status" className="text-sm text-emerald-700">
              {profileNotice}
            </p>
          )}
          <Button type="submit" disabled={savingProfile || !env.apiUrl}>
            {savingProfile ? "Đang lưu…" : "Lưu hồ sơ"}
          </Button>
        </form>
      </section>

      <section
        aria-labelledby="password-heading"
        className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-7"
      >
        <div>
          <h2 id="password-heading" className="text-xl font-semibold">
            Đổi mật khẩu
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sau khi đổi, bạn sẽ cần đăng nhập lại trên các thiết bị.
          </p>
        </div>
        <form onSubmit={passwordForm.handleSubmit(changePassword)} className="space-y-5" noValidate>
          <FormField
            control={passwordForm.control}
            name="currentPassword"
            label="Mật khẩu hiện tại"
          >
            {(field) => (
              <Input
                {...field}
                value={String(field.value ?? "")}
                type="password"
                autoComplete="current-password"
                aria-invalid={field["aria-invalid"]}
                aria-describedby={field["aria-describedby"]}
                disabled={changingPassword}
              />
            )}
          </FormField>
          <FormField control={passwordForm.control} name="newPassword" label="Mật khẩu mới">
            {(field) => (
              <Input
                {...field}
                value={String(field.value ?? "")}
                type="password"
                autoComplete="new-password"
                aria-invalid={field["aria-invalid"]}
                aria-describedby={field["aria-describedby"]}
                disabled={changingPassword}
              />
            )}
          </FormField>
          <FormField
            control={passwordForm.control}
            name="confirmPassword"
            label="Nhập lại mật khẩu mới"
          >
            {(field) => (
              <Input
                {...field}
                value={String(field.value ?? "")}
                type="password"
                autoComplete="new-password"
                aria-invalid={field["aria-invalid"]}
                aria-describedby={field["aria-describedby"]}
                disabled={changingPassword}
              />
            )}
          </FormField>
          <p className="text-xs leading-5 text-muted-foreground">
            Mật khẩu cần tối thiểu 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
          </p>
          {passwordForm.formState.errors.root?.server && (
            <p role="alert" className="text-sm text-destructive">
              {passwordForm.formState.errors.root.server.message}
            </p>
          )}
          <Button type="submit" disabled={changingPassword || !env.apiUrl}>
            {changingPassword ? "Đang cập nhật…" : "Đổi mật khẩu"}
          </Button>
        </form>
      </section>

      <section
        aria-labelledby="delete-heading"
        className="space-y-5 rounded-2xl border border-destructive/40 bg-card p-5 shadow-sm sm:p-7"
      >
        <div>
          <h2 id="delete-heading" className="text-xl font-semibold text-destructive">
            Xóa tài khoản
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Tài khoản sẽ bị vô hiệu hóa, thông tin định danh được ẩn và các phiên đăng nhập bị thu
            hồi. Nếu bạn còn đám cưới đang hoạt động do mình sở hữu, hãy đóng hoặc chuyển quyền sở
            hữu trước.
          </p>
        </div>
        {user.role === "ADMIN" ? (
          <p className="text-sm text-muted-foreground">Tài khoản quản trị không thể tự xóa.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="delete-password" className="text-sm font-medium">
                Mật khẩu hiện tại
              </label>
              <Input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={deletePassword}
                onChange={(event) => {
                  setDeletePassword(event.target.value);
                  setDeleteGoogleToken("");
                }}
                disabled={deleting}
              />
              <p className="text-xs text-muted-foreground">
                Với tài khoản chỉ đăng nhập bằng Google, dùng nút xác thực Google bên dưới.
              </p>
            </div>
            {!env.googleClientId && (
              <p className="text-xs text-muted-foreground">
                Xác thực Google chưa được cấu hình trong ứng dụng; tài khoản chỉ dùng Google cần mật
                khẩu trước khi xóa.
              </p>
            )}
            {env.googleClientId && (
              <div className="space-y-2">
                <GoogleLogin
                  onSuccess={handleGoogleReauth}
                  onError={() => setShowGoogleError(true)}
                />
                {deleteGoogleToken && (
                  <p role="status" className="text-sm text-emerald-700">
                    Đã xác thực Google. Token chỉ được giữ trong phiên trang này.
                  </p>
                )}
                {showGoogleError && (
                  <p role="alert" className="text-sm text-destructive">
                    Không thể xác thực Google. Vui lòng thử lại.
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="delete-confirmation" className="text-sm font-medium">
                Nhập <span className="font-mono">XOA TAI KHOAN</span> để xác nhận
              </label>
              <Input
                id="delete-confirmation"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                autoComplete="off"
                disabled={deleting}
              />
            </div>
            {deleteError && (
              <p role="alert" className="text-sm text-destructive">
                {deleteError}
              </p>
            )}
            <Button
              type="button"
              variant="destructive"
              disabled={deleting || !env.apiUrl}
              onClick={() => void deleteAccount()}
            >
              {deleting ? "Đang xóa tài khoản…" : "Xóa tài khoản của tôi"}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
