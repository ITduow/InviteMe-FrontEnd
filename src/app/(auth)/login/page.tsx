import Link from "next/link";
import { Button } from "@/shared/ui/button";
export default function Page() {
  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl">Đăng nhập</h1>
      <p className="text-sm text-muted-foreground">
        Đăng nhập đang được cập nhật. Bạn có thể tạo tài khoản và xác nhận email trước.
      </p>
      <Button asChild className="w-full">
        <Link href="/register">Tạo tài khoản</Link>
      </Button>
      <Link href="/" className="block text-center text-sm text-primary">
        Về trang chủ
      </Link>
    </div>
  );
}
