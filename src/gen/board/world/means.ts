/**
 * docs/48 §2: means with lead time come from the places' details, and only
 * those: the landlady's chloral, the dentist's cabinet, the pawnshop's revolver,
 * the janitor's rat poison. A detail is a means when it says what it is; this
 * reads which.
 */

/** The means a detail can be: the generator's pools' ids, and rat poison, which only the bible has. */
export type MeansKey = 'chloral' | 'laudanum' | 'revolver' | 'knife' | 'cyanide' | 'rat-poison';

const RULES: [RegExp, MeansKey][] = [
  [/\bchloral\b/, 'chloral'],
  [/\blaudanum\b/, 'laudanum'],
  [/\b(revolver|pistol|army colt|service colt)\b/, 'revolver'],
  [/\b(rat poison|arsenic|strychnine)\b/, 'rat-poison'],
  [/\b(cyanide|prussic)\b/, 'cyanide'],
  [/\b(carving knife|kitchen knife|bread knife|steak knives|knife|razor|cleaver|ice pick|sword)\b/, 'knife'],
];

export function meansOfDetail(d: { id: string; text: string }): MeansKey | null {
  const s = `${d.id.replace(/[-_]/g, ' ')} ${d.text}`.toLowerCase();
  for (const [re, k] of RULES) if (re.test(s)) return k;
  return null;
}

/** The engine's kind for a means key. */
export function meansKind(k: MeansKey): 'chloral' | 'poison' | 'gun' | 'blade' {
  return k === 'chloral' ? 'chloral' : k === 'revolver' ? 'gun' : k === 'knife' ? 'blade' : 'poison';
}
