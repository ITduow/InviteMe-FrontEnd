"use client";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useRuntime } from "@/core/config/runtime";
import { env } from "@/core/config/env";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormField } from "@/shared/forms/form-field";
import { mapApiErrors } from "@/shared/forms/map-api-errors";
import { loginSchema, type LoginInput } from "../schemas/login.schema";
import { authApi } from "../api/auth.api";
export function LoginForm() {
  const { api, session } = useRuntime();
  const router = useRouter();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  async function submit(values: LoginInput) {
    try {
      const tokens = await authApi.login(api, values);
      session.accept(tokens);
      const candidate = new URLSearchParams(window.location.search).get("returnTo");
      const destination =
        candidate &&
        /^\/(dashboard|weddings|admin)(\/|$|\?)/.test(candidate) &&
        !candidate.includes("\\")
          ? candidate
          : "/dashboard";
      router.replace(destination);
    } catch (error) {
      mapApiErrors(error, form.setError, {
        email: "email",
        Email: "email",
        password: "password",
        Password: "password",
      });
    }
  }
  return (
    <form className="login-form space-y-5" onSubmit={form.handleSubmit(submit)} noValidate>
      <FormField control={form.control} name="email" label="Địa chỉ email">
        {(field) => (
          <div className="login-field">
            <Mail size={16} aria-hidden="true" />
            <Input
              {...field}
              value={String(field.value ?? "")}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
        )}
      </FormField>
      <FormField control={form.control} name="password" label="Mật khẩu">
        {(field) => (
          <div className="login-field">
            <Lock size={16} aria-hidden="true" />
            <Input
              {...field}
              value={String(field.value ?? "")}
              type="password"
              autoComplete="current-password"
            />
          </div>
        )}
      </FormField>
      <div className="login-form__options">
        <Link href="/forgot-password">Quên mật khẩu?</Link>
      </div>
      {form.formState.errors.root?.server && (
        <p role="alert" className="text-sm text-destructive">
          {form.formState.errors.root.server.message}
        </p>
      )}
      {!env.apiUrl && (
        <p className="text-sm text-muted-foreground">
          Chức năng đăng nhập chưa sẵn sàng. Vui lòng thử lại sau.
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={form.formState.isSubmitting || !env.apiUrl}
      >
        {form.formState.isSubmitting ? "Đang đăng nhập…" : "Đăng nhập"}
      </Button>
    </form>
  );
}
