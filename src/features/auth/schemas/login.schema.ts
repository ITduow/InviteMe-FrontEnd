import { z } from "zod";

export type LoginValidationMessages = {
  emailMax: string;
  emailInvalid: string;
  passwordRequired: string;
  passwordMax: string;
};

const vietnameseMessages: LoginValidationMessages = {
  emailMax: "Email tối đa 255 ký tự.",
  emailInvalid: "Email không hợp lệ.",
  passwordRequired: "Vui lòng nhập mật khẩu.",
  passwordMax: "Mật khẩu tối đa 128 ký tự.",
};

export function createLoginSchema(messages: LoginValidationMessages = vietnameseMessages) {
  return z.object({
    email: z.string().trim().max(255, messages.emailMax).pipe(z.email(messages.emailInvalid)),
    password: z.string().min(1, messages.passwordRequired).max(128, messages.passwordMax),
  });
}

export const loginSchema = createLoginSchema();

export type LoginInput = z.infer<typeof loginSchema>;
