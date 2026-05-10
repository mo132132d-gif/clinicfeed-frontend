import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { countryDialCodes, countryFromPhone, normalizePhoneNumber, saudiCountry, type CountryDialCode } from "../../lib/phone";
import { Button, Input, cn } from "./Primitives";

interface PhoneNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function PhoneNumberInput({
  value,
  onChange,
  className = "",
  disabled = false,
  placeholder = "5XXXXXXXX",
}: PhoneNumberInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState<CountryDialCode>(() => countryFromPhone(value) || saudiCountry);

  const filteredCountries = useMemo(() => {
    const term = search.trim().toLowerCase().replace(/^\+/, "");
    if (!term) return countryDialCodes;

    return countryDialCodes.filter((item) => {
      const dialDigits = item.dialCode.replace("+", "");
      return (
        dialDigits.startsWith(term) ||
        item.dialCode.startsWith(search.trim()) ||
        item.nameAr.includes(search.trim()) ||
        item.nameEn.toLowerCase().includes(term) ||
        item.iso2.toLowerCase().includes(term)
      );
    });
  }, [search]);

  function selectCountry(nextCountry: CountryDialCode) {
    setCountry(nextCountry);
    setOpen(false);
    setSearch("");
  }

  function normalizeCurrentValue() {
    const normalized = normalizePhoneNumber(value, country);
    if (normalized && normalized !== value) onChange(normalized);
  }

  return (
    <div className={cn("relative", className)} dir="rtl">
      <div className="grid grid-cols-[minmax(116px,auto)_1fr] gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className="justify-between px-3"
          aria-label="اختيار رمز الدولة"
        >
          <span className="inline-flex items-center gap-2">
            <span>{country.flag}</span>
            <span dir="ltr">{country.dialCode}</span>
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>

        <Input
          dir="ltr"
          inputMode="tel"
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={normalizeCurrentValue}
          className="text-left"
        />
      </div>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
          <div className="relative border-b border-slate-800 p-2">
            <Search className="absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث بالدولة أو الرمز"
              className="h-10 pr-9"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filteredCountries.length === 0 ? (
              <div className="p-3 text-sm text-slate-400">لا توجد نتائج</div>
            ) : (
              filteredCountries.map((item) => (
                <button
                  key={item.iso2}
                  type="button"
                  onClick={() => selectCountry(item)}
                  className="flex w-full items-center justify-between gap-3 border-b border-slate-900 px-3 py-2 text-right text-sm text-slate-100 transition last:border-b-0 hover:bg-slate-900"
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span>{item.flag}</span>
                    <span className="truncate">{item.nameAr}</span>
                  </span>
                  <span className="font-bold text-slate-300" dir="ltr">{item.dialCode}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

