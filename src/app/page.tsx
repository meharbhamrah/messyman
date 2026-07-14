import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is not logged in, redirect to login
  if (!user) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="glass p-8 rounded-2xl">
          <h1 className="text-5xl font-bold">
            <span className="text-brand">Messyman</span>
          </h1>
          <p className="text-lg mt-3 text-muted-foreground">
            Welcome back, {user.email}
          </p>
          <div className="mt-8 flex gap-4">
            <button className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">
              Create Memory
            </button>
            <button className="border border-border px-6 py-2 rounded-lg font-medium hover:bg-secondary/50 transition-colors">
              View Timeline
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="p-6 rounded-xl bg-card border border-border">
            <h3 className="font-semibold">Memories</h3>
            <p className="text-sm mt-1 text-muted-foreground">
              Capture what matters
            </p>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border">
            <h3 className="font-semibold">Investigations</h3>
            <p className="text-sm mt-1 text-muted-foreground">
              Discover patterns
            </p>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border">
            <h3 className="font-semibold">Insights</h3>
            <p className="text-sm mt-1 text-muted-foreground">
              Understand yourself
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <form action="/auth/signout" method="post">
            <button 
              type="submit"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}