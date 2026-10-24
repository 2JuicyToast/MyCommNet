import { useEffect, useRef, useState } from "react";
import { Search, Loader2, X } from "lucide-react";
import { geoapifyAutocomplete, type Location, type Place } from "@/lib/geoapify";

type AddressSearchProps = {
  label?: string;
  placeholder?: string;
  initialValue?: string;
  onSelect: (location: Location) => void;
  onClear?: () => void;
  className?: string;
};

export function AddressSearch({
  label,
  placeholder = "Enter an address, neighborhood, or city…",
  initialValue = "",
  onSelect,
  onClear,
  className = "",
}: AddressSearchProps) {
  const [text, setText] = useState(initialValue);
  const [selected, setSelected] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const version = useRef(0);

  useEffect(() => {
    setText(initialValue);
    setSelected(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed.length < 3 || trimmed === selected) {
      setSuggestions([]);
      setStatus("");
      setLoading(false);
      setIsOpen(false);
      return;
    }

    const request = ++version.current;
    setLoading(true);
    setStatus("Searching…");
    const controller = new AbortController();

    const timer = setTimeout(() => {
      geoapifyAutocomplete(trimmed, controller.signal)
        .then((places) => {
          if (version.current !== request || controller.signal.aborted) return;
          setSuggestions(places);
          setLoading(false);
          setIsOpen(true);
          setActive(-1);
          setStatus(places.length ? "" : "No locations found. Try a city or more specific address.");
        })
        .catch((error: Error) => {
          if (!controller.signal.aborted && version.current === request) {
            setLoading(false);
            setStatus(error.message);
          }
        });
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, selected]);

  function choose(place: Place) {
    ++version.current;
    setText(place.formatted);
    setSelected(place.formatted);
    setSuggestions([]);
    setIsOpen(false);
    setStatus("");
    onSelect(place);
  }

  function handleClear() {
    ++version.current;
    setText("");
    setSelected("");
    setSuggestions([]);
    setIsOpen(false);
    setStatus("");
    if (onClear) onClear();
  }

  const idSlug = (label || "address-search").toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div ref={containerRef} className={`relative min-w-0 flex-1 ${className}`}>
      {label && <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 transition focus-within:border-brand-teal/60 focus-within:ring-2 focus-within:ring-brand-teal/20">
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-teal" />
        ) : (
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <input
          aria-label={label || placeholder}
          role="combobox"
          aria-expanded={isOpen && suggestions.length > 0}
          aria-controls={`suggestions-${idSlug}`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${idSlug}-${active}` : undefined}
          value={text}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onChange={(event) => {
            ++version.current;
            setText(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              ++version.current;
              setIsOpen(false);
              setSuggestions([]);
              setStatus("");
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIsOpen(true);
              setActive((a) => Math.min(a + 1, suggestions.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            }
            if (event.key === "Enter" && suggestions[active >= 0 ? active : 0]) {
              event.preventDefault();
              choose(suggestions[active >= 0 ? active : 0]);
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {text && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear address"
            className="rounded p-0.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          id={`suggestions-${idSlug}`}
          role="listbox"
          aria-label={`${label || "Location"} suggestions`}
          className="absolute inset-x-0 top-full z-[1100] mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-background shadow-card-soft"
        >
          {suggestions.map((place, index) => (
            <li
              key={`${place.place_id || ""}-${index}`}
              id={`${idSlug}-${index}`}
              role="option"
              aria-selected={index === active}
            >
              <button
                type="button"
                onClick={() => choose(place)}
                className={`w-full px-4 py-2.5 text-left text-sm transition hover:bg-surface-2 ${
                  active === index ? "bg-surface-2 font-medium" : ""
                }`}
              >
                <p className="line-clamp-1 font-medium">{place.address_line1 || place.name || place.formatted}</p>
                {place.address_line2 && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">{place.address_line2}</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {status && !loading && (
        <p role="status" className="mt-1 text-xs text-muted-foreground">
          {status}
        </p>
      )}
    </div>
  );
}
