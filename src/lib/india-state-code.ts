const STATE_CODE_MAP: Record<string, string> = {
  "jammu and kashmir": "01",
  "himachal pradesh": "02",
  "punjab": "03",
  "chandigarh": "04",
  "uttarakhand": "05",
  "haryana": "06",
  "delhi": "07",
  "rajasthan": "08",
  "uttar pradesh": "09",
  "bihar": "10",
  "sikkim": "11",
  "arunachal pradesh": "12",
  "nagaland": "13",
  "manipur": "14",
  "mizoram": "15",
  "tripura": "16",
  "meghalaya": "17",
  "assam": "18",
  "west bengal": "19",
  "jharkhand": "20",
  "odisha": "21",
  "chhattisgarh": "22",
  "madhya pradesh": "23",
  "gujarat": "24",
  "daman and diu": "25",
  "dadra and nagar haveli and daman and diu": "26",
  "maharashtra": "27",
  "andhra pradesh": "28",
  "karnataka": "29",
  "goa": "30",
  "lakshadweep": "31",
  "kerala": "32",
  "tamil nadu": "33",
  "puducherry": "34",
  "andaman and nicobar islands": "35",
  "telangana": "36",
  "andhra pradesh (new)": "37",
  "ladakh": "38",
  "other territory": "97",
};

const normalizeName = (value?: string | null) =>
  (value || "").trim().toLowerCase().replace(/\s+/g, " ");

export const normalizeStateCode = (value?: string | null) => {
  const normalized = (value || "").trim().toUpperCase();
  if (!normalized) return "";
  if (/^\d+$/.test(normalized)) return normalized.padStart(2, "0");
  return normalized;
};

export const deriveStateCodeFromState = (
  stateCode?: string | null,
  stateName?: string | null,
) => {
  const normalizedCode = normalizeStateCode(stateCode);
  if (normalizedCode) return normalizedCode;
  const byName = STATE_CODE_MAP[normalizeName(stateName)];
  return byName || "";
};

