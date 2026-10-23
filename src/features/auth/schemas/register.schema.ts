import { z } from "zod";
export type RegisterValidationMessages = {
  nameRequired: string;
  nameMax: string;
  emailMax: string;
  emailInvalid: string;
  passwordMin: string;
  passwordMax: string;
  lowercase: string;
  uppercase: string;
  digit: string;
  special: string;
  confirmRequired: string;
  mismatch: string;
};

const vietnameseMessages: RegisterValidationMessages = {
  nameRequired: "Vui lòng nhập họ tên.",
  nameMax: "Họ tên tối đa 150 ký tự.",
  emailMax: "Email tối đa 255 ký tự.",
  emailInvalid: "Email không hợp lệ.",
  passwordMin: "Mật khẩu cần ít nhất 12 ký tự.",
  passwordMax: "Mật khẩu tối đa 128 ký tự.",
  lowercase: "Cần ít nhất một chữ thường.",
  uppercase: "Cần ít nhất một chữ hoa.",
  digit: "Cần ít nhất một chữ số.",
  special: "Cần ít nhất một ký tự đặc biệt.",
  confirmRequired: "Vui lòng nhập lại mật khẩu.",
  mismatch: "Mật khẩu nhập lại chưa khớp.",
};

export function createRegisterSchema(messages: RegisterValidationMessages = vietnameseMessages) {
  return z
    .object({
      displayName: z.string().trim().min(1, messages.nameRequired).max(150, messages.nameMax),
      email: z.string().trim().max(255, messages.emailMax).pipe(z.email(messages.emailInvalid)),
      password: z
        .string()
        .min(12, messages.passwordMin)
        .max(128, messages.passwordMax)
        .regex(/[a-z]/, messages.lowercase)
        .regex(/[A-Z]/, messages.uppercase)
        .regex(/[0-9]/, messages.digit)
        .regex(/[^a-zA-Z0-9]/, messages.special),
      confirmPassword: z.string().min(1, messages.confirmRequired),
    })
    .refine((value) => value.password === value.confirmPassword, {
      path: ["confirmPassword"],
      message: messages.mismatch,
    });
}

export const registerSchema = createRegisterSchema();
export type RegisterInput = z.infer<typeof registerSchema>;
