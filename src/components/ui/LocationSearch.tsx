"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Search, X, Loader2, Check, Crosshair, Sparkles } from "lucide-react";

interface Location {
  id: number;
  name: string;
}

interface LocationSearchProps {
  value: string;
  onChange: (location: string) => void;
}

export function LocationSearch({ value, onChange }: LocationSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const search = async () => {
      if (query.length < 2) {
        setResults([]);
        setShowResults(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/locations?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.locations || []);
        setShowResults(true);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (location: Location) => {
    onChange(location.name);
    setQuery(location.name);
    setIsSelected(true);
    setSelectedLocation(location);
    setShowResults(false);
  };

  const clear = () => {
    setQuery("");
    onChange("");
    setResults([]);
    setShowResults(false);
    setIsSelected(false);
    setSelectedLocation(null);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (isSelected) setIsSelected(false);
    if (selectedLocation) setSelectedLocation(null);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=16`
          );
          const data = await res.json();
          if (data.display_name) {
            const locationName = data.display_name;
            onChange(locationName);
            setQuery(locationName);
            setIsSelected(true);
            setSelectedLocation({ id: Date.now(), name: locationName });
            setShowResults(false);
          } else {
            alert("Could not determine your location name.");
          }
        } catch (error) {
          console.error("Reverse geocoding error:", error);
          alert("Failed to get location name. Please try again.");
        } finally {
          setDetecting(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to access your location. Please allow location access or enter manually.");
        setDetecting(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Detect button */}
      <div className="mb-2">
        <motion.button
          type="button"
          onClick={detectLocation}
          disabled={detecting}
          className="text-xs text-[#d4a373] hover:text-[#b88a5e] flex items-center gap-1.5 transition-colors disabled:opacity-50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {detecting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Detecting...
            </>
          ) : (
            <>
              <Crosshair className="h-3.5 w-3.5" />
              Detect my location
            </>
          )}
        </motion.button>
      </div>

      {/* Search input */}
      <motion.div
        className={`bg-white rounded-xl border shadow-sm p-2 transition-all duration-300 ${
          isSelected 
            ? "border-[#d4a373] ring-2 ring-[#d4a373]/40 animate-float-glow" 
            : "border-gray-200"
        }`}
        animate={isSelected ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-300">
            {isSelected ? (
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <Check className="h-4 w-4 text-[#d4a373] animate-bounce-in" strokeWidth={3} />
              </motion.div>
            ) : (
              <Search className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            placeholder="Search for a location..."
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              if (query.length >= 2 && results.length > 0) setShowResults(true);
            }}
            className={`w-full pl-9 pr-10 py-2 text-sm border-0 focus:outline-none bg-transparent transition-colors ${
              isSelected ? "text-[#8b6b4c]" : ""
            }`}
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#d4a373]" />
            ) : query ? (
              <button
                type="button"
                onClick={clear}
                className="text-muted-foreground hover:text-[#d4a373] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </motion.div>

      {/* Celebration sparkles */}
      <AnimatePresence>
        {isSelected && selectedLocation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute -top-2 -right-2 pointer-events-none"
          >
            <Sparkles className="h-5 w-5 text-[#d4a373] animate-sparkle" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown with staggered items */}
      <AnimatePresence>
        {showResults && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 mt-1 w-full bg-white border rounded-xl shadow-lg max-h-60 overflow-auto"
          >
            {results.map((loc, index) => {
              const isThisSelected = query === loc.name;
              return (
                <motion.div
                  key={loc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={`px-4 py-2 hover:bg-secondary cursor-pointer flex items-center gap-3 border-b last:border-b-0 transition-all ${
                    isThisSelected ? "bg-[#d4a373]/10 border-[#d4a373]/30" : ""
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(loc);
                  }}
                  whileHover={{ x: 4 }}
                >
                  {isThisSelected ? (
                    <Check className="h-4 w-4 text-[#d4a373] animate-bounce-in" />
                  ) : (
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  )}
                  <p className={`text-sm truncate ${isThisSelected ? "text-[#8b6b4c] font-medium" : ""}`}>
                    {loc.name}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
