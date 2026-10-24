import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { geoapify, type Location, type Place } from "@/lib/geoapify";

export function AddressSearch({ label, onSelect }: {
  label: string;
  onSelect: (location: Location) => void;
}) {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [status, setStatus] = useState("");
  const [active, setActive] = useState(-1);
  const version = useRef(0);

  useEffect(() => {
    const request = ++version.current;
    setSuggestions([]);
    setActive(-1);
    setStatus("");
    if (text.trim().length < 3 || text === selected) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setStatus("Searching…");
      void geoapify("v1/geocode/autocomplete", { text: text.trim(), limit: "6" }, controller.signal)
        .then((places) => {
          if (version.current !== request || controller.signal.aborted) return;
          setSuggestions(places);
          setStatus(places.length ? "" : "No addresses found. Try a city or more complete address.");
        })
        .catch((error: Error) => {
          if (!controller.signal.aborted && version.current === request) setStatus(error.message);
        });
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [text, selected]);

  function choose(place: Place) {
    ++version.current;
    setText(place.formatted);
    setSelected(place.formatted);
    setSuggestions([]);
    setStatus("");
    onSelect(place);
  }

  return (
    <div className="relative min-w-0 flex-1">
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          aria-label={label}
          role="combobox"
          aria-expanded={suggestions.length > 0}
          aria-controls={`suggestions-${label.replaceAll(" ", "-")}`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${label}-${active}` : undefined}
          value={text}
          onChange={(event) => { ++version.current; setText(event.target.value); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") { ++version.current; setSuggestions([]); setStatus(""); }
            if (event.key === "ArrowDown") { event.preventDefault(); setActive((a) => Math.min(a + 1, suggestions.length - 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (event.key === "Enter" && suggestions[active >= 0 ? active : 0]) {
              event.preventDefault(); choose(suggestions[active >= 0 ? active : 0]);
            }
          }}
          placeholder="Enter an address, place, or city…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {suggestions.length > 0 && (
        <ul id={`suggestions-${label.replaceAll(" ", "-")}`} role="listbox" aria-label={`${label} suggestions`}
          className="absolute inset-x-0 top-full z-[1100] mt-1 overflow-hidden rounded-xl border border-border bg-background shadow-card-soft">
          {suggestions.map((place, index) => (
            <li key={`${place.place_id}-${index}`} id={`${label}-${index}`} role="option" aria-selected={index === active}>
              <button type="button" onClick={() => choose(place)}
                className={`w-full px-4 py-3 text-left text-sm hover:bg-surface-2 ${active === index ? "bg-surface-2" : ""}`}>
                {place.formatted}
              </button>
            </li>
          ))}
        </ul>
      )}
      {status && <p role="status" className="mt-1 text-xs text-muted-foreground">{status}</p>}
    </div>
  );
}
