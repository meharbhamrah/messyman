"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Search, X, Loader2, Check, Sparkles } from "lucide-react";

interface Track {
  id: string;
  name: string;
  artist: string;
}

interface MusicSearchProps {
  value: string;
  onSelect: (track: { title: string; artist: string }) => void;
}

export function MusicSearch({ value, onSelect }: MusicSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
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
        const res = await fetch(`/api/music?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
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

  const handleSelect = (track: Track) => {
    onSelect({ title: track.name, artist: track.artist });
    setQuery(`${track.name} - ${track.artist}`);
    setIsSelected(true);
    setSelectedTrack(track);
    setShowResults(false);
  };

  const clear = () => {
    setQuery("");
    onSelect({ title: "", artist: "" });
    setResults([]);
    setShowResults(false);
    setIsSelected(false);
    setSelectedTrack(null);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (isSelected) setIsSelected(false);
    if (selectedTrack) setSelectedTrack(null);
  };

  return (
    <div ref={wrapperRef} className="relative">
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
            placeholder="Search for a song..."
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

      {/* Celebration sparkles when selected */}
      <AnimatePresence>
        {isSelected && selectedTrack && (
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
            {results.map((track, index) => {
              const isThisSelected = query === `${track.name} - ${track.artist}`;
              return (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={`px-4 py-2 hover:bg-secondary cursor-pointer flex items-center gap-3 border-b last:border-b-0 transition-all ${
                    isThisSelected ? "bg-[#d4a373]/10 border-[#d4a373]/30" : ""
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(track);
                  }}
                  whileHover={{ x: 4 }}
                >
                  {isThisSelected ? (
                    <Check className="h-4 w-4 text-[#d4a373] animate-bounce-in" />
                  ) : (
                    <Music className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${isThisSelected ? "text-[#8b6b4c]" : ""}`}>
                      {track.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{track.artist}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
