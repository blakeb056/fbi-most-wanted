export interface FugitiveImage {
  large: string;
  thumb: string;
  original: string;
  caption?: string | null;
}

export interface FugitiveFile {
  url: string;
  name: string;
}

export interface Fugitive {
  uid: string;
  title: string;
  description: string | null;
  caution: string | null;
  warning_message: string | null;
  reward_text: string | null;
  reward_amount: number;
  reward_formatted: string;
  status: string;
  poster_classification: string;
  subjects: string[];
  aliases: string[] | null;
  field_offices: string[] | null;
  possible_countries: string[] | null;
  possible_states: string[] | null;
  place_of_birth: string | null;
  dates_of_birth_used: string[] | null;
  sex: string | null;
  race: string | null;
  hair: string | null;
  eyes: string | null;
  height_min: number | null;
  height_max: number | null;
  weight: string | null;
  scars_and_marks: string | null;
  occupations: string[] | null;
  images: FugitiveImage[];
  files: FugitiveFile[];
  url: string;
  publication: string;
  modified: string;
  crime_location?: { name: string; lat: number; lng: number; state?: string; country?: string } | null;
  escape_location?: { name: string; lat: number; lng: number; state?: string; country?: string } | null;
}

export interface WantedApiResponse {
  total: number;
  page: number;
  items: Fugitive[];
}

export interface DistressCall {
  id: string;
  lat: number;
  lon: number;
  ts: string;
  desc: string;
  city: string;
  state: string;
  kind: "police" | "fire" | "ems" | string;
  sev: number; // 0: routine, 1: priority, 2: urgent, 3: violent felony
}

export interface TracerHotspot {
  la: number;
  lo: number;
  n: number; // casualties
  e: number; // events
}

export interface TracerConflict {
  id: string;
  name: string;
  sideA: string;
  sideB: string;
  type: string;
  deaths: number;
  civilians: number;
  events: number;
  countries: string[];
  first: string;
  last: string;
}

export interface RadioStation {
  lat: number;
  lon: number;
  name: string;
  cc: string;
  url: string;
  id: string;
  clicks: number;
}

export interface TvChannel {
  lat: number;
  lon: number;
  name: string;
  cc: string;
  url: string;
  id: string;
  cat: string;
}

export type GlobeLayerMode = "fbi" | "distress" | "tracer" | "radio" | "tv";

