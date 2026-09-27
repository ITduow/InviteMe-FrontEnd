import Link from "next/link";
import { LoginForm } from "@/features/auth";
export default function LoginPage() {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-3xl">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to your wedding workspace.</p>
      </div>
      <LoginForm />
      <div className="flex justify-between gap-4 text-sm">
        <Link href="/forgot-password" className="underline">
          Forgot password?
        </Link>
        <Link href="/register" className="underline">
          Create an account
        </Link>
      </div>
    </div>
  );
}
