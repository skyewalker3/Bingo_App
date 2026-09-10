import type { Round } from '../state/boardState';

export const UNSPECIFIED_LOCATION = 'Unspecified location';
export const ALL_LOCATIONS = '__all__';

export function locationLabel(loc: string): string {
  return loc && loc.trim() ? loc.trim() : UNSPECIFIED_LOCATION;
}

export function getDistinctLocations(rounds: Round[]): string[] {
  const set = new Set<string>();
  rounds.forEach((r) => set.add(locationLabel(r.location)));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

// Real, non-empty location strings only (not the "Unspecified location"
// placeholder label) -- used to populate the location input's autocomplete
// suggestions.
export function getDistinctLocationValues(rounds: Round[]): string[] {
  const set = new Set<string>();
  rounds.forEach((r) => {
    const trimmed = (r.location || '').trim();
    if (trimmed) set.add(trimmed);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function getRoundsForFilter(rounds: Round[], filterValue?: string): Round[] {
  if (!filterValue || filterValue === ALL_LOCATIONS) return rounds;
  return rounds.filter((r) => locationLabel(r.location) === filterValue);
}

export function computeTally(rounds: Round[], filterValue?: string): Record<number, number> {
  const tally: Record<number, number> = {};
  for (let n = 1; n <= 75; n++) tally[n] = 0;
  getRoundsForFilter(rounds, filterValue).forEach((round) => {
    round.numbers.forEach((n) => {
      tally[n] = (tally[n] || 0) + 1;
    });
  });
  return tally;
}
