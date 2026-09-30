import { Fugitive } from "./types";
import { FBI_FIELD_OFFICES, SUSPECTED_COUNTRIES, FUGITIVE_CUSTOM_LOCATIONS } from "./geo";

export function extractRewardAmount(text: string | null): number {
  if (!text) return 0;
  const match = text.match(/\$([\d,]+(?:\.\d+)?)\s*(million|k)?/i);
  if (!match) return 0;
  let num = parseFloat(match[1].replace(/,/g, ""));
  const unit = match[2]?.toLowerCase();
  if (unit === "million") num *= 1_000_000;
  if (unit === "k") num *= 1_000;
  return Math.round(num);
}

export function formatCurrency(amount: number): string {
  if (amount <= 0) return "No reward specified";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Map a raw FBI API item to our normalized Fugitive interface
export function normalizeFugitive(raw: any): Fugitive {
  const rewardAmount = extractRewardAmount(raw.reward_text);
  const title = (raw.title || "UNKNOWN").toUpperCase().trim();

  // Determine crime & suspected escape locations
  let crimeLoc = null;
  let escapeLoc = null;

  // 1. Check custom known mappings
  if (FUGITIVE_CUSTOM_LOCATIONS[title]) {
    crimeLoc = FUGITIVE_CUSTOM_LOCATIONS[title].crime;
    escapeLoc = FUGITIVE_CUSTOM_LOCATIONS[title].escape;
  } else {
    // 2. Check if raw FBI record has explicit coordinates
    if (raw.coordinates && raw.coordinates.length > 0) {
      const coord = raw.coordinates[0];
      if (typeof coord.lat === "number" && typeof coord.lng === "number") {
        crimeLoc = {
          name: coord.formatted || coord.city || "Investigative Jurisdiction",
          lat: coord.lat,
          lng: coord.lng,
          state: coord.state,
        };
      }
    }

    // 3. Derive from field office if not yet found
    if (!crimeLoc && raw.field_offices && raw.field_offices.length > 0) {
      const officeKey = raw.field_offices[0].toLowerCase().replace(/[^a-z]/g, "");
      if (FBI_FIELD_OFFICES[officeKey]) {
        crimeLoc = FBI_FIELD_OFFICES[officeKey];
      }
    }

    // 3. Derive escape from possible countries or states
    if (raw.possible_countries && raw.possible_countries.length > 0) {
      const countryCode = raw.possible_countries[0].toUpperCase();
      if (SUSPECTED_COUNTRIES[countryCode]) {
        escapeLoc = SUSPECTED_COUNTRIES[countryCode];
      }
    }
  }

  // Sanitize caution and description HTML tags if needed
  const cleanCaution = raw.caution ? raw.caution.replace(/<[^>]*>/g, " ").trim() : null;

  return {
    uid: raw.uid || Math.random().toString(36).substring(7),
    title,
    description: raw.description || null,
    caution: cleanCaution,
    warning_message: raw.warning_message || null,
    reward_text: raw.reward_text || null,
    reward_amount: rewardAmount,
    reward_formatted: formatCurrency(rewardAmount),
    status: raw.status || "na",
    poster_classification: raw.poster_classification || "default",
    subjects: raw.subjects || [],
    aliases: raw.aliases || null,
    field_offices: raw.field_offices || null,
    possible_countries: raw.possible_countries || null,
    possible_states: raw.possible_states || null,
    place_of_birth: raw.place_of_birth || null,
    dates_of_birth_used: raw.dates_of_birth_used || null,
    sex: raw.sex || null,
    race: raw.race || null,
    hair: raw.hair || null,
    eyes: raw.eyes || null,
    height_min: raw.height_min || null,
    height_max: raw.height_max || null,
    weight: raw.weight || null,
    scars_and_marks: raw.scars_and_marks || null,
    occupations: raw.occupations || null,
    images: (raw.images || []).map((img: any) => ({
      large: img.large || img.original || img.thumb || "",
      thumb: img.thumb || img.large || "",
      original: img.original || img.large || "",
      caption: img.caption || null,
    })),
    files: (raw.files || []).map((f: any) => ({
      url: f.url || "",
      name: f.name || "Wanted Poster (PDF)",
    })),
    url: raw.url || `https://www.fbi.gov/wanted`,
    publication: raw.publication || "",
    modified: raw.modified || "",
    crime_location: crimeLoc,
    escape_location: escapeLoc,
  };
}

// Fetch fugitives from official FBI API
export async function fetchFbiWanted(options: {
  pageSize?: number;
  page?: number;
  classification?: string;
  fieldOffice?: string;
  query?: string;
} = {}): Promise<{ total: number; items: Fugitive[] }> {
  const {
    pageSize = 50,
    page = 1,
    classification,
    fieldOffice,
    query
  } = options;

  const url = new URL("https://api.fbi.gov/wanted/v1/list");
  url.searchParams.set("pageSize", pageSize.toString());
  url.searchParams.set("page", page.toString());

  if (classification && classification !== "all") {
    url.searchParams.set("poster_classification", classification);
  }
  if (fieldOffice && fieldOffice !== "all") {
    url.searchParams.set("field_offices", fieldOffice);
  }
  if (query) {
    url.searchParams.set("title", query);
  }

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 }, // Cache 1 hour
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`FBI API error: ${res.status}`);
    }

    const data = await res.json();
    const items = (data.items || []).map(normalizeFugitive);

    return {
      total: data.total || items.length,
      items,
    };
  } catch (err) {
    console.error("Failed to fetch from FBI API, returning empty fallback:", err);
    return { total: 0, items: [] };
  }
}
