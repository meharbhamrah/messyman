'use client'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Header } from '@/components/ui/Header'
import { 
  Sparkles, 
  Palette, 
  Type, 
  Layout,
  Coffee,
  Moon,
  Sun
} from 'lucide-react'
import { useState } from 'react'

export default function DesignSystemPage() {
  const [isDark, setIsDark] = useState(false)

  const toggleDark = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        {/* Hero */}
        <section className="text-center space-y-4 fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 text-primary-500 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Design System
          </div>
          <h1 className="text-gradient-hero">Messyman</h1>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            A beautiful journal you actually want to open every evening.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              onClick={toggleDark}
              className="px-4 py-2 rounded-lg border border-border bg-surface hover:bg-surface-secondary transition-colors text-sm font-medium flex items-center gap-2"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </section>

        {/* Colors */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Palette className="w-5 h-5 text-primary-500" />
            <h2 className="text-2xl font-bold">Colors</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="rounded-2xl p-4 bg-primary-500 text-white">
              <p className="font-semibold">Primary</p>
              <p className="text-sm opacity-80">#178F8A</p>
            </div>
            <div className="rounded-2xl p-4 bg-primary-400 text-white">
              <p className="font-semibold">Primary 400</p>
              <p className="text-sm opacity-80">#41B7AF</p>
            </div>
            <div className="rounded-2xl p-4 bg-primary-600 text-white">
              <p className="font-semibold">Primary 600</p>
              <p className="text-sm opacity-80">#147C77</p>
            </div>
            <div className="rounded-2xl p-4 bg-accent text-text-primary">
              <p className="font-semibold">Accent</p>
              <p className="text-sm opacity-80">#F6B756</p>
            </div>
            <div className="rounded-2xl p-4 bg-accent-soft text-text-primary border border-border">
              <p className="font-semibold">Accent Soft</p>
              <p className="text-sm opacity-80">#FFF3DE</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="rounded-2xl p-4 bg-background text-text-primary border border-border">
              <p className="font-semibold">Background</p>
              <p className="text-sm opacity-80">#FAFAF8</p>
            </div>
            <div className="rounded-2xl p-4 bg-surface text-text-primary border border-border">
              <p className="font-semibold">Surface</p>
              <p className="text-sm opacity-80">#FFFFFF</p>
            </div>
            <div className="rounded-2xl p-4 bg-surface-secondary text-text-primary border border-border">
              <p className="font-semibold">Surface Secondary</p>
              <p className="text-sm opacity-80">#F4F5F2</p>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Type className="w-5 h-5 text-primary-500" />
            <h2 className="text-2xl font-bold">Typography</h2>
          </div>
          <div className="space-y-3">
            <h1>Heading 1 · 52/700</h1>
            <h2>Heading 2 · 40/700</h2>
            <h3>Heading 3 · 30/700</h3>
            <h4>Heading 4 · 24/600</h4>
            <p className="text-base">Body · 16/500 — The quick brown fox jumps over the lazy dog.</p>
            <small>Small · 14/500 — The quick brown fox jumps over the lazy dog.</small>
            <p className="caption">Caption · 13/500 — The quick brown fox jumps over the lazy dog.</p>
          </div>
        </section>

        {/* Buttons */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Layout className="w-5 h-5 text-primary-500" />
            <h2 className="text-2xl font-bold">Buttons</h2>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button loading>Loading</Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </section>

        {/* Cards */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Layout className="w-5 h-5 text-primary-500" />
            <h2 className="text-2xl font-bold">Cards</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <h4 className="mb-2">Default</h4>
              <p className="text-text-secondary text-sm">Clean white card with soft shadow.</p>
            </Card>
            <Card variant="glass">
              <h4 className="mb-2">Glass</h4>
              <p className="text-text-secondary text-sm">Blur effect with transparency.</p>
            </Card>
            <Card variant="elevated">
              <h4 className="mb-2">Elevated</h4>
              <p className="text-text-secondary text-sm">Deeper shadow for emphasis.</p>
            </Card>
          </div>
        </section>

        {/* Inputs */}
        <section className="space-y-6 max-w-md">
          <div className="flex items-center gap-3">
            <Layout className="w-5 h-5 text-primary-500" />
            <h2 className="text-2xl font-bold">Inputs</h2>
          </div>
          <div className="space-y-4">
            <Input placeholder="Default input" />
            <Input label="With label" placeholder="Enter something..." />
            <Input placeholder="With error" error="This field is required" />
            <Textarea label="Textarea" placeholder="Write something..." />
          </div>
        </section>

        {/* Loading Spinners */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Layout className="w-5 h-5 text-primary-500" />
            <h2 className="text-2xl font-bold">Loading</h2>
          </div>
          <div className="flex gap-6 items-center">
            <LoadingSpinner size="sm" />
            <LoadingSpinner size="md" />
            <LoadingSpinner size="lg" />
          </div>
        </section>

        {/* Empty State */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Layout className="w-5 h-5 text-primary-500" />
            <h2 className="text-2xl font-bold">Empty State</h2>
          </div>
          <Card>
            <EmptyState
              icon={<Coffee className="w-6 h-6 text-primary-500" />}
              title="Nothing to see yet"
              description="Start by creating your first memory or journal entry."
              action={<Button>Create Memory</Button>}
            />
          </Card>
        </section>

        {/* Glass Showcase */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Layout className="w-5 h-5 text-primary-500" />
            <h2 className="text-2xl font-bold">Glass Effect</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-8">
              <h4 className="mb-2">Glass Surface</h4>
              <p className="text-text-secondary text-sm">With backdrop blur and subtle border.</p>
            </div>
            <div className="card-glass">
              <h4 className="mb-2">Glass Card</h4>
              <p className="text-text-secondary text-sm">Using the glass card component.</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-12 border-t border-border text-center text-text-muted text-sm">
          <p>Messyman · A personal memory and self-discovery journal</p>
          <p className="mt-1">Design System · Built with ❤️</p>
        </footer>
      </main>
    </>
  )
}
