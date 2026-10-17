"use client";
import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError } from "@/core/api/api-error";
import { useRuntime } from "@/core/config/runtime";
import { env } from "@/core/config/env";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormField } from "@/shared/forms/form-field";
import { registerSchema, type RegisterInput } from "../schemas/register.schema";
import { authApi } from "../api/auth.api";
import { ConfirmationNotice } from "./confirmation-notice";
export function RegisterForm() {
  const { api } = useRuntime();
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", email: "", password: "", confirmPassword: "" },
  });
  async function submit(values: RegisterInput) {
    form.clearErrors("root");
    try {
      const account = await authApi.register(api, values);
      form.reset();
      setShowPassword(false);
      setRegisteredEmail(account.email);
    } catch (error) {
      if (error instanceof ApiError && error.backendCode === "DUPLICATE_ACCOUNT") {
        form.setError(
          "email",
          { message: "Email này đã có tài khoản. Hãy đăng nhập hoặc dùng email khác." },
          { shouldFocus: true },
        );
        return;
      }
      const message =
        error instanceof ApiError && error.status === 429
          ? "Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau một phút."
          : error instanceof ApiError && error.code === "network"
            ? "Không thể kết nối. Hãy kiểm tra mạng trước khi thử lại."
            : error instanceof ApiError && error.code === "validation"
              ? "Thông tin chưa hợp lệ. Vui lòng kiểm tra các trường bên dưới."
              : "Chưa thể hoàn tất đăng ký. Nếu đã nhận email xác nhận, hãy dùng link trong email; nếu chưa, vui lòng thử lại sau.";
      form.setError("root.server", { message });
      if (error instanceof ApiError) {
        const fields: Record<string, "email" | "password" | "displayName"> = {
          Email: "email",
          email: "email",
          Password: "password",
          password: "password",
          DisplayName: "displayName",
          displayName: "displayName",
        };
        for (const key of Object.keys(error.fieldErrors)) {
          const field = fields[key];
          if (field) form.setError(field, { message: "Vui lòng kiểm tra lại thông tin này." });
        }
      }
    }
  }
  if (registeredEmail) return <ConfirmationNotice email={registeredEmail} initialCooldown={60} />;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Bắt đầu ngày vui của bạn</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tạo tài khoản InviteMe để cùng chuẩn bị ngày cưới.
        </p>
      </div>
      <form
        onSubmit={form.handleSubmit(submit)}
        noValidate
        className="space-y-4"
        aria-busy={form.formState.isSubmitting}
      >
        <fieldset disabled={form.formState.isSubmitting} className="space-y-4">
          <FormField control={form.control} name="displayName" label="Họ và tên">
            {(field) => (
              <Input
                {...field}
                value={String(field.value ?? "")}
                autoComplete="name"
                maxLength={150}
                placeholder="Nguyễn An"
              />
            )}
          </FormField>
          <FormField control={form.control} name="email" label="Địa chỉ email">
            {(field) => (
              <Input
                {...field}
                value={String(field.value ?? "")}
                type="email"
                autoComplete="email"
                maxLength={255}
                placeholder="you@example.com"
              />
            )}
          </FormField>
          <FormField control={form.control} name="password" label="Mật khẩu">
            {(field) => (
              <div className="relative">
                <Input
                  {...field}
                  aria-describedby={[field["aria-describedby"], "register-password-help"]
                    .filter(Boolean)
                    .join(" ")}
                  value={String(field.value ?? "")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  maxLength={128}
                  className="pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            )}
          </FormField>
          <p id="register-password-help" className="text-xs leading-5 text-muted-foreground">
            12–128 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
          </p>
          <FormField control={form.control} name="confirmPassword" label="Nhập lại mật khẩu">
            {(field) => (
              <Input
                {...field}
                value={String(field.value ?? "")}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                maxLength={128}
              />
            )}
          </FormField>
        </fieldset>
        {form.formState.errors.root?.server && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.server.message}
          </p>
        )}
        {!env.apiUrl && (
          <p role="status" className="text-sm text-muted-foreground">
            Chức năng đăng ký chưa sẵn sàng. Vui lòng thử lại sau.
          </p>
        )}
        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting || !env.apiUrl}
        >
          {form.formState.isSubmitting ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-medium text-primary underline underline-offset-4">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
