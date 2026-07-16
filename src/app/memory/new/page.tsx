"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Upload, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MusicSearch } from "@/components/ui/MusicSearch";
import { LocationSearch } from "@/components/ui/LocationSearch";
import { processMemory } from "@/app/actions/memory";
import { Header } from "@/components/ui/Header";

export default function NewMemoryPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [text, setText] = useState("");
  const [location, setLocation] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
    };
    getUser();
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Photo must be less than 5MB"); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text && !photoFile && !location && !songTitle) { alert("Add at least one detail"); return; }

    setLoading(true);
    try {
      let photoUrl = null;
      if (photoFile && user) {
        const ext = photoFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("memory-photos")
          .upload(fileName, photoFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from("memory-photos")
          .getPublicUrl(fileName);
        photoUrl = publicUrl;
      }

      const { data: memory, error } = await supabase.from("memories").insert({
        user_id: user.id,
        text: text || null,
        location: location || null,
        song_title: songTitle || null,
        song_artist: songArtist || null,
        photo_url: photoUrl,
      }).select("id").single();

      if (error) throw error;

      console.log("📝 Memory saved with ID:", memory.id);
      console.log("📝 Has text:", !!text);
      console.log("📝 Has photo:", !!photoUrl);
      console.log("📝 Has music:", !!songTitle);
      console.log("📝 Has location:", !!location);

      // ALWAYS process the memory - even without text
      // The memory action will analyze whatever is available
      if (memory?.id) {
        console.log("🤖 Starting AI processing...");
        const result = await processMemory(memory.id);
        console.log("🤖 AI processing result:", result);
      }

      router.push("/");
    } catch (error) {
      console.error("❌ Error:", error);
      alert("Failed to save memory");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24 md:pb-6">
      <Header />
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-secondary rounded-full"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold">New Memory</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <textarea
            placeholder="What happened today?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full min-h-[120px] p-4 text-base border-0 resize-none focus:outline-none"
            maxLength={5000}
          />
          <div className="text-xs text-muted-foreground text-right px-4 pb-2">{text.length}/5000</div>
        </div>

        <LocationSearch value={location} onChange={setLocation} />
        <MusicSearch
          value={songTitle}
          onSelect={(track) => {
            setSongTitle(track.title);
            setSongArtist(track.artist);
          }}
        />

        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Photo</span>
            <span className="text-xs text-muted-foreground">(optional)</span>
          </div>
          {photoPreview ? (
            <div className="relative rounded-lg overflow-hidden">
              <img src={photoPreview} alt="Preview" className="w-full max-h-[250px] object-cover" />
              <button type="button" onClick={removePhoto} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-input hover:border-primary/50 cursor-pointer transition-colors bg-secondary/20"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Tap to upload</span>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? <><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Saving...</> : "Add to Journey"}
        </button>
      </form>
    </div>
  );
}
