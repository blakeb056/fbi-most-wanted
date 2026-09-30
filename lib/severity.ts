// Ported directly from distress-globe/lib/severity.js
// Four tiers: 0: routine, 1: urgent, 2: serious, 3: violent felony

const NEGATION_PATTERNS = [
  /\([^)]*\bno\b[^)]*\)/g,
  /\bno\s+(weapons?|wpns?|shots?|shooting|firearms?|injur\w*)\b/g,
  /\bw\/?o\s+(weapons?|wpns?|firearms?)\b/g,
  /\bwith or w\/?o\s+\w+/g,
  /\bnon[- ]?(injury|violent|emergency)\b/g,
  /\bunfounded\b/g,
];

const COLD_REPORT = /\b(occurred earlier|cold report|report only|late report|delayed report|legacy\b|follow[- ]?up|supplement)\b/;

const LETHAL = [
  /\bhomicide\b/, /\bmurder\b/, /\bmanslaughter\b/, /\bhomicid\w*/,
  /\bshoot(ing|er)\b/, /\bshots? fired\b/, /\bgunshot\b/, /\bg\.?s\.?w\.?\b/,
  /\bperson shot\b/, /\bshot\b(?!\s*(gun\s*)?spotter)/,
  /\bstabb?(ing|ed)\b/, /\bstab\b/,
  /\b(robbery|assault|aslt|batter\w*)\b[\s\S]{0,24}\b(knife|cutting instrument|machete)\b/,
  /\b(knife|cutting instrument|machete)\b[\s\S]{0,24}\b(robbery|assault|aslt)\b/,
  /\brape\b/, /\bsexual assault\b/, /\bsex offense\b/, /\bsodomy\b/,
  /\bkidnap\w*/, /\babduction\b/, /\bhostage\b/,
  /\barson\b/,
  /\bofficer (down|involved shooting)\b/, /\bshots spotter\b/,
  /\bcarjack\w*/, /\bhome invasion\b/,
  /\b(assault|aslt|batter\w*)\b[\s\S]{0,30}\b(firearm|handgun|pistol|shotgun|gun)\b/,
  /\b(firearm|handgun|pistol|shotgun)\b[\s\S]{0,30}\b(assault|aslt|on person)\b/,
  /\bdeath investigation\b/, /\bdead body\b/, /\bdoa\b/, /\bfound dead\b/,
  /\bbomb\b/, /\bexplosion\b/, /\bactive (shooter|assailant)\b/,
];

const SERIOUS = [
  /\brobbery\b/, /\brobbed\b/, /\bagg\w*\s*(assault|aslt|batt\w*)\b/,
  /\b(assault|aslt|batter\w*)\b[^a-z]{0,4}\bagg\w*/,
  /\bassault.*(deadly|weapon|firearm)\b/, /\bfelonious assault\b/, /\ba\.?d\.?w\.?\b/,
  /\bweapons? (offense|offence|violation|law|charge|possession)\b/, /\bbrandish\w*/,
  /\bpossession of weapons?\b/,
  /\barmed\b/, /\bfirearm\b/, /\bdeadly w(ea)?pn\b/, /\bgun\b/,
  /\bburglary\b.*\b(progress|occurring)\b/, /\bhome invasion\b/,
  /\boverdose\b/, /\bnarcan\b/, /\bunconscious\b/, /\bnot breathing\b/,
  /\bcardiac arrest\b/, /\bdrowning\b/,
  /\bstructure fire\b/, /\bbuilding fire\b/, /\bentrapment\b/, /\bextricat\w*/,
  /\bin progress\b/, /\bhold ?up\b/, /\bstrangulation\b/, /\bchild abuse\b/,
  /\bhuman trafficking\b/, /\bshooting threat\b/,
];

const URGENT = [
  /\bassault\b/, /\basl?t\b/, /\bbatter\w*/, /\bdomestic\b/, /\bfight\b/, /\bdisturb\w*/,
  /\bburglary\b/, /\bb ?& ?e\b/, /\bprowler\b/, /\btrespass\w*/,
  /\btheft\b/, /\blarcen\w*/, /\bstolen\b/, /\bshoplift\w*/, /\bvandal\w*/,
  /\bthreat\w*/, /\bharass\w*/, /\bmenacing\b/,
  /\bcriminal damage\b/, /\bpublic order\b/, /\banti-?social\b/,
  /\bcrash\b/, /\bcollision\b/, /\baccident\b/, /\bhit (and|&) run\b/,
  /\binjur\w*/, /\bmedical\b/, /\bsick\b/, /\bseizure\b/, /\bbleeding\b/,
  /\bfall\b/, /\bcardiac\b/, /\bchest pain\b/, /\bdifficulty breathing\b/,
  /\bmental\b/, /\bsuicid\w*/, /\bbaker act\b/, /\bcrisis\b/, /\bwelfare check\b/,
  /\bmissing\b/, /\bendangered\b/, /\bnarcotic\w*/, /\bdrug\w*/, /\bd\.?u\.?i\.?\b/,
  /\breckless\b/, /\bfire\b/, /\bsmoke\b/, /\bgas leak\b/, /\bhazmat\b/, /\brescue\b/,
  /\balarm\b/, /\bsuspicious\b/, /\b911 ?hang ?up\b/, /\bfraud\b/, /\bwarrant\b/,
  /\bdui\b/, /\bwildfire\b/, /\bwf\b/,
];

function scrub(text: string): string {
  let t = String(text || "").toLowerCase();
  for (const p of NEGATION_PATTERNS) t = t.replace(p, " ");
  return t;
}

export function classify(text: string): number {
  const raw = String(text || "").toLowerCase();
  const t = scrub(raw);
  if (!t.trim()) return 0;

  const cold = COLD_REPORT.test(t);

  for (const p of LETHAL) {
    if (p.test(t)) return cold ? 2 : 3;
  }
  for (const p of SERIOUS) {
    if (p.test(t)) return cold ? 1 : 2;
  }
  for (const p of URGENT) {
    if (p.test(t)) return 1;
  }
  return 0;
}

// routine, urgent, serious, violent felony
export const SEV_COLOR: string[] = ["#35d0ff", "#ffb020", "#ff5a2d", "#ff1240"];
export const SEV_LABEL: string[] = ["routine", "urgent", "serious", "violent"];
export const MAX_SEV = 3;

export const isViolent = (call: { sev?: number }) => call?.sev === 3;
