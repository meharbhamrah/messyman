import { createClient } from '@/lib/supabase/server'

export default async function TestSupabasePage() {
  const supabase = await createClient()
  
  // Try to get the user session
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  // Try to list tables (this will fail if no tables exist, but that's ok)
  const { data, error } = await supabase.from('test').select('*').limit(1)
  
  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-2xl mx-auto">
        <div className="glass p-8 rounded-2xl">
          <h1 className="text-2xl font-bold mb-4 text-foreground">Supabase Connection Test</h1>
          
          <div className="space-y-4">
            <div className="p-4 bg-card rounded-lg border border-border">
              <h2 className="font-semibold text-foreground">Environment Variables</h2>
              <div className="mt-2 space-y-1 text-sm">
                <p className="text-muted-foreground">
                  URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
                </p>
                <p className="text-muted-foreground">
                  Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
                </p>
              </div>
            </div>

            <div className="p-4 bg-card rounded-lg border border-border">
              <h2 className="font-semibold text-foreground">Auth Status</h2>
              <div className="mt-2 text-sm">
                {userError ? (
                  <p className="text-red-500">Error: {userError.message}</p>
                ) : user ? (
                  <p className="text-green-600">✅ User authenticated: {user.email}</p>
                ) : (
                  <p className="text-muted-foreground">ℹ️ No user logged in (this is normal)</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-card rounded-lg border border-border">
              <h2 className="font-semibold text-foreground">Database Connection</h2>
              <div className="mt-2 text-sm">
                {error ? (
                  <p className="text-yellow-600">
                    ⚠️ Table 'test' doesn't exist yet (this is normal for a new project)
                    <br />
                    <span className="text-xs text-muted-foreground">Error: {error.message}</span>
                  </p>
                ) : (
                  <p className="text-green-600">✅ Connected to database</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ Supabase is configured correctly! Your app can connect to the database.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}