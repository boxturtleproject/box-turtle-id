// src/pages/WelcomePage.tsx
export function WelcomePage() {
  return (
    <div
      className="flex flex-col items-center justify-between h-screen w-full px-8 py-16"
      style={{ backgroundColor: '#0a1a0e' }}
    >
      {/* Top spacer */}
      <div />

      {/* Center content */}
      <div className="flex flex-col items-center gap-6 text-center">
        <h1
          className="text-5xl font-bold tracking-widest"
          style={{
            fontFamily: "'Playfair Display', serif",
            color: '#f0ede6',
            letterSpacing: '0.12em',
          }}
        >
          Box Turtle ID
        </h1>

        <p
          className="text-xs tracking-[0.3em] uppercase"
          style={{
            fontFamily: "'DM Mono', monospace",
            color: '#6b8f71',
          }}
        >
          Submit a photo to identify your turtle
        </p>
      </div>

      {/* Bottom CTA */}
      <button
        className="w-full max-w-xs py-4 text-xs tracking-[0.25em] uppercase border transition-all duration-300"
        style={{
          fontFamily: "'DM Mono', monospace",
          color: '#6b8f71',
          borderColor: '#6b8f71',
          backgroundColor: 'transparent',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6b8f71';
          (e.currentTarget as HTMLButtonElement).style.color = '#0a1a0e';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = '#6b8f71';
        }}
      >
        Get Started
      </button>
    </div>
  );
}
