"use client";
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
    <form className="space-y-5" onSubmit={form.handleSubmit(submit)} noValidate>
      <FormField control={form.control} name="email" label="Email">
        {(field) => (
          <Input {...field} value={String(field.value ?? "")} type="email" autoComplete="email" />
        )}
      </FormField>
      <FormField control={form.control} name="password" label="Password">
        {(field) => (
          <Input
            {...field}
            value={String(field.value ?? "")}
            type="password"
            autoComplete="current-password"
          />
        )}
      </FormField>
      {form.formState.errors.root?.server && (
        <p role="alert" className="text-sm text-destructive">
          {form.formState.errors.root.server.message}
        </p>
      )}
      {!env.apiUrl && (
        <p className="text-sm text-muted-foreground">
          Sign-in is unavailable until the API connection is configured.
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={form.formState.isSubmitting || !env.apiUrl}
      >
        {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
