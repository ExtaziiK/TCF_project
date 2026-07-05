import { getTheme } from "@/constants/theme";

// Returns the light/dark color-token object consumed throughout the UI as `c`.
export function useTheme(dark) {
  return getTheme(dark);
}
