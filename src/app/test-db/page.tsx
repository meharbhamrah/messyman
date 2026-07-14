import { createClient } from '@/lib/supabase/server'

export default async function TestDBPage() {
  const supabase = await createClient()
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto glass p-8 rounded-2xl">
          <h1 className="text-2xl font-bold mb-4">Database Test</h1>
          <p className="text-yellow-600">Please log in first</p>
          <a href="/login" className="text-primary hover:underline">Go to login →</a>
        </div>
      </div>
    )
  }
  
  // Try to insert a test memory with explicit user_id
  const { data, error } = await supabase
    .from('memories')
    .insert({
      user_id: user.id,
      text: 'Test memory from setup',
      mood: 'curious'
    })
    .select()
  
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto glass p-8 rounded-2xl">
        <h1 className="text-2xl font-bold mb-4">Database Test</h1>
        
        <p className="text-sm text-muted-foreground mb-4">
          Logged in as: {user.email}
        </p>
        
        {error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">Error: {error.message}</p>
          </div>
        ) : data ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600">✅ Success! Test memory created.</p>
            <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        ) : (
          <p>No data returned</p>
        )}
        
        <div className="mt-4">
          <a href="/" className="text-primary hover:underline">← Back to home</a>
        </div>
      </div>
    </div>
  )
}