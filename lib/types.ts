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
