'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function CreateMemoryPage() {
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
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

      // Insert the memory
      const { data, error } = await supabase
        .from('memories')
        .insert({
          user_id: user.id,
          text: text.trim(),
          mood: 'reflective',
          photo_url: photoUrl // Add photo URL to the memory
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