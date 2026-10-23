import { z } from "zod";

export type AccountValidationMessages = {
  emailMax: string;
  emailInvalid: string;
  passwordMin: string;
  passwordMax: string;
  lowercase: string;
  uppercase: string;
  digit: string;
  special: string;
  confirmRequired: string;
  passwordMismatch: string;
  currentPasswordRequired: string;
  passwordMustDiffer: string;
  nameRequired: string;
  nameMax: string;
  phoneInvalid: string;
  avatarUrlInvalid: string;
};

const vietnameseMessages: AccountValidationMessages = {
  emailMax: "Email tối đa 255 ký tự.",
  emailInvalid: "Email không hợp lệ.",
  passwordMin: "Mật khẩu cần ít nhất 12 ký tự.",
  passwordMax: "Mật khẩu tối đa 128 ký tự.",
  lowercase: "Cần ít nhất một chữ thường.",
  uppercase: "Cần ít nhất một chữ hoa.",
  digit: "Cần ít nhất một chữ số.",
  special: "Cần ít nhất một ký tự đặc biệt.",
  confirmRequired: "Vui lòng nhập lại mật khẩu.",
  passwordMismatch: "Mật khẩu nhập lại chưa khớp.",
  currentPasswordRequired: "Vui lòng nhập mật khẩu hiện tại.",
  passwordMustDiffer: "Mật khẩu mới phải khác mật khẩu hiện tại.",
  nameRequired: "Vui lòng nhập họ tên.",
  nameMax: "Họ tên tối đa 50 ký tự.",
  phoneInvalid: "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.",
  avatarUrlInvalid: "Nhập URL ảnh hợp lệ bắt đầu bằng http:// hoặc https://.",
};

function passwordSchema(messages: AccountValidationMessages) {
  return z
    .string()
    .min(12, messages.passwordMin)
    .max(128, messages.passwordMax)
    .regex(/[a-z]/, messages.lowercase)
    .regex(/[A-Z]/, messages.uppercase)
    .regex(/[0-9]/, messages.digit)
    .regex(/[^a-zA-Z0-9]/, messages.special);
}

export function createForgotPasswordSchema(
  messages: Pick<AccountValidationMessages, "emailMax" | "emailInvalid"> = vietnameseMessages,
) {
  return z.object({
    email: z.string().trim().max(255, messages.emailMax).pipe(z.email(messages.emailInvalid)),
  });
}
export const forgotPasswordSchema = createForgotPasswordSchema();
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export function createResetPasswordSchema(messages = vietnameseMessages) {
  return z
    .object({
      newPassword: passwordSchema(messages),
      confirmPassword: z.string().min(1, messages.confirmRequired),
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
      path: ["confirmPassword"],
      message: messages.passwordMismatch,
    });
}
export const resetPasswordSchema = createResetPasswordSchema();
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export function createChangePasswordSchema(messages = vietnameseMessages) {
  return z
    .object({
      currentPassword: z.string().min(1, messages.currentPasswordRequired).max(128),
      newPassword: passwordSchema(messages),
      confirmPassword: z.string().min(1, messages.confirmRequired),
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
      path: ["confirmPassword"],
      message: messages.passwordMismatch,
    })
    .refine((value) => value.newPassword !== value.currentPassword, {
      path: ["newPassword"],
      message: messages.passwordMustDiffer,
    });
}
export const changePasswordSchema = createChangePasswordSchema();
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export function createProfileSchema(messages = vietnameseMessages) {
  return z.object({
    displayName: z.string().trim().min(1, messages.nameRequired).max(50, messages.nameMax),
    phone: z
      .string()
      .trim()
      .refine((value) => value === "" || /^0\d{9}$/.test(value), messages.phoneInvalid),
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
      }, messages.avatarUrlInvalid),
  });
}
export const profileSchema = createProfileSchema();
export type ProfileInput = z.infer<typeof profileSchema>;
