import { getIntlLocale, type Language } from "./config";

export function formatDate(
  value: Date | string | number,
  language: Language,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  return new Intl.DateTimeFormat(getIntlLocale(language), options).format(new Date(value));
}

export function formatNumber(
  value: number,
  language: Language,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(getIntlLocale(language), options).format(value);
}

export function formatCurrency(value: number, language: Language, currency = "VND"): string {
  return formatNumber(value, language, { style: "currency", currency, maximumFractionDigits: 0 });
}
