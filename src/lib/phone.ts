export interface CountryDialCode {
  iso2: string;
  nameAr: string;
  nameEn: string;
  dialCode: string;
  flag: string;
}

export const countryDialCodes: CountryDialCode[] = [
  { iso2: "SA", nameAr: "السعودية", nameEn: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦" },
  { iso2: "AE", nameAr: "الإمارات", nameEn: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪" },
  { iso2: "KW", nameAr: "الكويت", nameEn: "Kuwait", dialCode: "+965", flag: "🇰🇼" },
  { iso2: "QA", nameAr: "قطر", nameEn: "Qatar", dialCode: "+974", flag: "🇶🇦" },
  { iso2: "BH", nameAr: "البحرين", nameEn: "Bahrain", dialCode: "+973", flag: "🇧🇭" },
  { iso2: "OM", nameAr: "عمان", nameEn: "Oman", dialCode: "+968", flag: "🇴🇲" },
  { iso2: "YE", nameAr: "اليمن", nameEn: "Yemen", dialCode: "+967", flag: "🇾🇪" },
  { iso2: "IQ", nameAr: "العراق", nameEn: "Iraq", dialCode: "+964", flag: "🇮🇶" },
  { iso2: "SY", nameAr: "سوريا", nameEn: "Syria", dialCode: "+963", flag: "🇸🇾" },
  { iso2: "JO", nameAr: "الأردن", nameEn: "Jordan", dialCode: "+962", flag: "🇯🇴" },
  { iso2: "LB", nameAr: "لبنان", nameEn: "Lebanon", dialCode: "+961", flag: "🇱🇧" },
  { iso2: "PS", nameAr: "فلسطين", nameEn: "Palestine", dialCode: "+970", flag: "🇵🇸" },
  { iso2: "TR", nameAr: "تركيا", nameEn: "Turkey", dialCode: "+90", flag: "🇹🇷" },
  { iso2: "IN", nameAr: "الهند", nameEn: "India", dialCode: "+91", flag: "🇮🇳" },
  { iso2: "PK", nameAr: "باكستان", nameEn: "Pakistan", dialCode: "+92", flag: "🇵🇰" },
  { iso2: "AF", nameAr: "أفغانستان", nameEn: "Afghanistan", dialCode: "+93", flag: "🇦🇫" },
  { iso2: "LK", nameAr: "سريلانكا", nameEn: "Sri Lanka", dialCode: "+94", flag: "🇱🇰" },
  { iso2: "MM", nameAr: "ميانمار", nameEn: "Myanmar", dialCode: "+95", flag: "🇲🇲" },
  { iso2: "MV", nameAr: "المالديف", nameEn: "Maldives", dialCode: "+960", flag: "🇲🇻" },
  { iso2: "NP", nameAr: "نيبال", nameEn: "Nepal", dialCode: "+977", flag: "🇳🇵" },
  { iso2: "IR", nameAr: "إيران", nameEn: "Iran", dialCode: "+98", flag: "🇮🇷" },
  { iso2: "US", nameAr: "الولايات المتحدة", nameEn: "United States", dialCode: "+1", flag: "🇺🇸" },
  { iso2: "GB", nameAr: "المملكة المتحدة", nameEn: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { iso2: "EG", nameAr: "مصر", nameEn: "Egypt", dialCode: "+20", flag: "🇪🇬" },
];

export const saudiCountry = countryDialCodes[0];

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeSaudiMobileNumber(value?: string | null) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  const digits = digitsOnly(trimmed);
  if (trimmed.startsWith("+966")) return `+966${digits.replace(/^966/, "")}`;
  if (digits.startsWith("966")) return `+${digits}`;
  if (digits.startsWith("05") && digits.length >= 10) return `+966${digits.slice(1)}`;
  if (digits.startsWith("5") && digits.length >= 9) return `+966${digits}`;

  return trimmed;
}

export function normalizePhoneNumber(value?: string | null, country: CountryDialCode = saudiCountry) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  if (country.dialCode === "+966") return normalizeSaudiMobileNumber(trimmed);

  if (trimmed.startsWith("+")) return `+${digitsOnly(trimmed)}`;

  const local = digitsOnly(trimmed).replace(/^0+/, "");
  return local ? `${country.dialCode}${local}` : "";
}

export function countryFromPhone(value?: string | null) {
  const normalized = String(value || "").trim();
  return countryDialCodes
    .filter((country) => normalized.startsWith(country.dialCode))
    .sort((a, b) => b.dialCode.length - a.dialCode.length)[0] || saudiCountry;
}

