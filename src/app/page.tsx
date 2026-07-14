export default function Home() {
  return (
    <main className="min-h-screen p-8" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="max-w-3xl mx-auto">
        <div className="glass p-8 rounded-2xl">
          <h1 className="text-5xl font-bold">
            <span className="text-warm">Messyman</span>
          </h1>
          <p className="text-lg mt-3" style={{ color: 'var(--muted-foreground)' }}>
            Your memories, investigated.
          </p>
          <div className="mt-8 flex gap-4">
            <button 
              className="px-6 py-2 rounded-lg font-medium transition-colors"
              style={{ 
                backgroundColor: 'var(--primary)', 
                color: 'var(--primary-foreground)',
                border: 'none'
              }}
            >
              Get Started
            </button>
            <button 
              className="px-6 py-2 rounded-lg font-medium transition-colors"
              style={{ 
                backgroundColor: 'transparent',
                color: 'var(--foreground)',
                border: '1px solid var(--border)'
              }}
            >
              Learn More
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold">Memories</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Capture what matters
            </p>
          </div>
          <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold">Investigations</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Discover patterns
            </p>
          </div>
          <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold">Insights</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Understand yourself
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}