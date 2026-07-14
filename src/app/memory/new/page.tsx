'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { MapPin, Loader2 } from 'lucide-react'

export default function CreateMemoryPage() {
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [location, setLocation] = useState('')
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removePhoto = () => {
    setPhoto(null)
    setPhotoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setIsGettingLocation(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        // Reverse geocode to get location name
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          )
          const data = await response.json()
          
          if (data && data.display_name) {
            // Get just the city/town name
            const parts = data.display_name.split(',')
            const cityName = parts[0] + ', ' + parts[1]?.trim()
            setLocation(cityName || data.display_name)
          } else {
            setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
          }
        } catch (err) {
          setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
        } finally {
          setIsGettingLocation(false)
        }
      },
      (err) => {
        console.error('Error getting location:', err)
        setError('Unable to get location. Please check your permissions.')
        setIsGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('You must be logged in to create a memory')
      }

      let photoUrl = null

      // Upload photo if there is one
      if (photo) {
        setIsUploading(true)
        const fileExt = photo.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('memory-photos')
          .upload(fileName, photo)

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('memory-photos')
          .getPublicUrl(fileName)
        
        photoUrl = publicUrl
        setIsUploading(false)
      }

      // Insert the memory with location
      const { data, error } = await supabase
        .from('memories')
        .insert({
          user_id: user.id,
          text: text.trim(),
          mood: 'reflective',
          photo_url: photoUrl,
          location: location.trim() || null // Add location
        })
        .select()

      if (error) throw error

      // Redirect to home
      router.push('/')
      
    } catch (err: any) {
      console.error('Error creating memory:', err)
      setError(err.message || 'Failed to create memory')
    } finally {
      setIsLoading(false)
      setIsUploading(false)
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <div className="glass p-8 rounded-2xl">
          <h1 className="text-3xl font-bold">
            <span className="text-brand">Create Memory</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            What do you want to remember?
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="text" className="block text-sm font-medium mb-2">
                Your Memory
              </label>
              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write your memory here..."
                className="w-full p-4 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[150px] resize-y"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {text.length} characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Photo
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-border px-4 py-2 rounded-lg hover:bg-secondary/50 transition-colors text-sm"
                >
                  Choose Photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                {photoPreview && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              {photoPreview && (
                <div className="mt-3 relative w-32 h-32">
                  <Image
                    src={photoPreview}
                    alt="Preview"
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Location
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Where did this happen?"
                  className="flex-1 p-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={getLocation}
                  disabled={isGettingLocation}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-secondary/50 transition-colors flex items-center gap-2"
                >
                  {isGettingLocation ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MapPin className="w-4 h-4" />
                  )}
                  <span className="text-sm">
                    {isGettingLocation ? 'Getting...' : 'Detect'}
                  </span>
                </button>
              </div>
              {location && (
                <p className="text-xs text-muted-foreground mt-1">
                  Location: {location}
                </p>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isLoading || !text.trim() || isUploading}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : isUploading ? 'Uploading photo...' : 'Save Memory'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="border border-border px-6 py-2 rounded-lg font-medium hover:bg-secondary/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}