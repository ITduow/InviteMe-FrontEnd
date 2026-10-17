import { z } from "zod";
export const registerSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập họ tên.")
      .max(150, "Họ tên tối đa 150 ký tự."),
    email: z
      .string()
      .trim()
      .max(255, "Email tối đa 255 ký tự.")
      .pipe(z.email("Email không hợp lệ.")),
    password: z
      .string()
      .min(12, "Mật khẩu cần ít nhất 12 ký tự.")
      .max(128, "Mật khẩu tối đa 128 ký tự.")
      .regex(/[a-z]/, "Cần ít nhất một chữ thường.")
      .regex(/[A-Z]/, "Cần ít nhất một chữ hoa.")
      .regex(/[0-9]/, "Cần ít nhất một chữ số.")
      .regex(/[^a-zA-Z0-9]/, "Cần ít nhất một ký tự đặc biệt."),
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu nhập lại chưa khớp.",
  });
export type RegisterInput = z.infer<typeof registerSchema>;
