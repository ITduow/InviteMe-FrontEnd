import Link from "next/link";
import Image from "next/image";
import { Heart, Sparkles, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/features/auth";

export default function LoginPage() {
  return (
    <div className="login-screen">
      <aside className="login-editorial" aria-label="InviteMe — ngày cưới của bạn">
        <Image
          src="https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&auto=format&fit=crop&q=85"
          alt="Cặp đôi cùng bó hoa trong ngày cưới"
          fill
          priority
          unoptimized
          sizes="50vw"
        />
        <div className="login-editorial__shade" />
        <Link href="/" className="login-editorial__brand">
          <span>
            <Heart size={20} fill="currentColor" />
          </span>
          InviteMe
        </Link>
        <div className="login-editorial__copy">
          <p className="login-editorial__badge">
            <Sparkles size={14} /> Nền tảng quản lý ngày cưới
          </p>
          <h2>
            “Mọi Khách Mời. Mọi Khoảnh Khắc.
            <br />
            <em>Quản Lý Trọn Vẹn.”</em>
          </h2>
          <p>
            Trải nghiệm chuẩn bị đám cưới dành riêng cho hai bạn. Lưu giữ câu chuyện, gửi trao lời
            mời và cùng người thân đón ngày vui.
          </p>
          <div className="login-editorial__details">
            <span>
              <ShieldCheck size={16} /> Thông tin khách mời riêng tư
            </span>
            <span>
              <Heart size={16} /> Cùng chuẩn bị ngày vui
            </span>
          </div>
        </div>
      </aside>
      <section className="login-content" aria-labelledby="login-title">
        <div className="login-content__inner">
          <Link href="/" className="login-brand">
            <span className="login-brand__monogram">IM</span>Invite<em>Me</em>
          </Link>
          <h1 id="login-title">Chào mừng bạn quay trở lại</h1>
          <p className="login-subtitle">
            Quản lý mọi khoảnh khắc đẹp nhất trong ngày cưới của bạn.
          </p>
          <LoginForm />
          <div className="login-divider">
            <span>Hoặc tiếp tục với</span>
          </div>
          <button
            type="button"
            className="login-google"
            disabled
            title="Đăng nhập Google chưa sẵn sàng"
          >
            <span aria-hidden="true">G</span> Google Workspace · Sắp ra mắt
          </button>
          <p className="login-register">
            Chưa có tài khoản? <Link href="/register">Tạo tài khoản</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
