import type { Account, Claim, Hour, ListEntry, PersonId, PlaceId, Remark, WatchList } from '../types.js';

/** Terse builders for hand-encoded cases. */

export function account(
  person: PersonId,
  claims: Record<Hour, [PlaceId, PersonId[]] | [PlaceId, PersonId[], string]>,
  remarks: Remark[] = [],
): Account {
  const out: Record<Hour, Claim> = {};
  for (const [h, v] of Object.entries(claims)) {
    out[Number(h)] = { place: v[0], company: v[1], ...(v[2] ? { reason: v[2] } : {}) };
  }
  return { person, claims: out, remarks };
}

export function list(
  watcher: PersonId,
  place: PlaceId,
  entries: Record<Hour, (PersonId | { look: string } | { other: string })[]>,
  remarks: Remark[] = [],
  unseen?: PersonId[],
): WatchList {
  const out: Record<Hour, ListEntry[]> = {};
  for (const [h, es] of Object.entries(entries)) {
    out[Number(h)] = es.map((e) => (typeof e === 'string' ? { person: e } : e));
  }
  return { watcher, place, entries: out, remarks, ...(unseen ? { unseen } : {}) };
}

export function rows(hours: Hour[], table: Record<PersonId, PlaceId[]>): Record<PersonId, Record<Hour, PlaceId>> {
  const out: Record<PersonId, Record<Hour, PlaceId>> = {};
  for (const [p, cells] of Object.entries(table)) {
    out[p] = {};
    hours.forEach((h, i) => {
      (out[p] as Record<Hour, PlaceId>)[h] = cells[i] as PlaceId;
    });
  }
  return out;
}
