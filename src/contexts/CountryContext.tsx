"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

// Country code to name mapping
export const COUNTRY_OPTIONS: { code: string; name: string; flag: string }[] = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
];

// Language to country code mapping
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  "he": "IL",
  "he-IL": "IL",
  "en-US": "US",
  "en-GB": "GB",
  "en-AU": "AU",
  "en-CA": "CA",
  "en": "US",
  "de": "DE",
  "de-DE": "DE",
  "de-AT": "DE",
  "de-CH": "DE",
  "fr": "FR",
  "fr-FR": "FR",
  "fr-CA": "CA",
  "es": "ES",
  "es-ES": "ES",
  "es-MX": "MX",
  "it": "IT",
  "it-IT": "IT",
  "ja": "JP",
  "ja-JP": "JP",
  "pt": "BR",
  "pt-BR": "BR",
  "pt-PT": "BR",
  "nl": "NL",
  "nl-NL": "NL",
  "sv": "SE",
  "sv-SE": "SE",
};

const STORAGE_KEY = "podcatch-country";

interface CountryContextValue {
  country: string;
  setCountry: (country: string) => void;
  countryInfo: { code: string; name: string; flag: string } | undefined;
}

const CountryContext = createContext<CountryContextValue | undefined>(undefined);

function detectCountryFromLanguage(): string {
  if (typeof navigator === "undefined") return "US";

  const language = navigator.language;

  // Try exact match first
  if (LANGUAGE_TO_COUNTRY[language]) {
    return LANGUAGE_TO_COUNTRY[language];
  }

  // Try base language (e.g., "en" from "en-US")
  const baseLanguage = language.split("-")[0];
  if (LANGUAGE_TO_COUNTRY[baseLanguage]) {
    return LANGUAGE_TO_COUNTRY[baseLanguage];
  }

  return "US";
}

export function CountryProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountryState] = useState<string>("US");
  const [isInitialized, setIsInitialized] = useState(false);
  const { user } = useAuth();
  const profileFetched = useRef(false);

  // Initial load: localStorage or browser language detection
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && COUNTRY_OPTIONS.find((c) => c.code === stored)) {
      setCountryState(stored);
    } else {
      const detected = detectCountryFromLanguage();
      setCountryState(detected);
      localStorage.setItem(STORAGE_KEY, detected);
    }
    setIsInitialized(true);
  }, []);

  // When user logs in, sync country from their profile preferences
  useEffect(() => {
    if (!user) {
      profileFetched.current = false;
      return;
    }
    if (profileFetched.current) return;
    profileFetched.current = true;

    fetch("/api/user/profile")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const profileCountry = data?.profile?.preferred_country;
        if (profileCountry) {
          const code = profileCountry.toUpperCase();
          if (COUNTRY_OPTIONS.find((c) => c.code === code)) {
            setCountryState(code);
            localStorage.setItem(STORAGE_KEY, code);
          }
        }
      })
      .catch(() => {/* profile fetch failed, keep current country */});
  }, [user]);

  const setCountry = useCallback((newCountry: string) => {
    setCountryState(newCountry);
    localStorage.setItem(STORAGE_KEY, newCountry);
  }, []);

  const countryInfo = COUNTRY_OPTIONS.find((c) => c.code === country);

  // Prevent hydration mismatch by not rendering until initialized
  if (!isInitialized) {
    return (
      <CountryContext.Provider value={{ country: "US", setCountry, countryInfo: COUNTRY_OPTIONS[0] }}>
        {children}
      </CountryContext.Provider>
    );
  }

  return (
    <CountryContext.Provider value={{ country, setCountry, countryInfo }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const context = useContext(CountryContext);
  if (context === undefined) {
    throw new Error("useCountry must be used within a CountryProvider");
  }
  return context;
}
