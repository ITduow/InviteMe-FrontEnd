import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().max(255, "Email tối đa 255 ký tự.").pipe(z.email("Email không hợp lệ.")),
  password: z.string().min(1, "Vui lòng nhập mật khẩu.").max(128, "Mật khẩu tối đa 128 ký tự."),
});

export type LoginInput = z.infer<typeof loginSchema>;
