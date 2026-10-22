import { z } from "zod";

const passwordSchema = z
  .string()
  .min(12, "Mật khẩu cần ít nhất 12 ký tự.")
  .max(128, "Mật khẩu tối đa 128 ký tự.")
  .regex(/[a-z]/, "Cần ít nhất một chữ thường.")
  .regex(/[A-Z]/, "Cần ít nhất một chữ hoa.")
  .regex(/[0-9]/, "Cần ít nhất một chữ số.")
  .regex(/[^a-zA-Z0-9]/, "Cần ít nhất một ký tự đặc biệt.");

export const forgotPasswordSchema = z.object({
  email: z.string().trim().max(255, "Email tối đa 255 ký tự.").pipe(z.email("Email không hợp lệ.")),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu nhập lại chưa khớp.",
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại.").max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu nhập lại chưa khớp.",
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ["newPassword"],
    message: "Mật khẩu mới phải khác mật khẩu hiện tại.",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Vui lòng nhập họ tên.").max(50, "Họ tên tối đa 50 ký tự."),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^0\d{9}$/.test(value),
      "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.",
    ),
  avatarUrl: z
    .string()
    .trim()
    .refine((value) => {
      if (!value) return true;
      if (value.length > 2048) return false;
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, "Nhập URL ảnh hợp lệ bắt đầu bằng http:// hoặc https://."),
});
export type ProfileInput = z.infer<typeof profileSchema>;
