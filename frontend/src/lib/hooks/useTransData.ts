import { useTranslations } from "next-intl";

/**
 * A custom hook to dynamically translate database-returned fields
 * (e.g., room statuses, types, designations, payment methods).
 * Looks up the value in the "Data" namespace and falls back to the original string.
 */
export function useTransData() {
  const t = useTranslations("Data");

  const trans = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null) return "";
    const stringValue = String(value).trim();
    if (!stringValue) return "";

    // 1. Check direct match
    if (t.has(stringValue)) {
      return t(stringValue);
    }

    // 2. Check normalized snake_case (e.g. "Standard Double" -> "standard_double")
    const snakeKey = stringValue.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    if (t.has(snakeKey)) {
      return t(snakeKey);
    }

    return stringValue;
  };

  return trans;
}
