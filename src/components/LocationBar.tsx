import { MapPinIcon } from './icons';

interface LocationBarProps {
  value: string;
  suggestions: string[];
  onChange: (value: string) => void;
}

export function LocationBar({ value, suggestions, onChange }: LocationBarProps) {
  return (
    <div className="location-bar">
      <MapPinIcon />
      <input
        type="text"
        id="locationInput"
        placeholder="Where are you playing today? (optional)"
        list="locationSuggestions"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <datalist id="locationSuggestions">
        {suggestions.map((loc) => (
          <option key={loc} value={loc} />
        ))}
      </datalist>
    </div>
  );
}
