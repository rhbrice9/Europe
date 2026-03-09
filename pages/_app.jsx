import Head from 'next/head'

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <title>Europe Trip 2026 🌍</title>
        <meta name="description" content="Europe Trip 2026 — collaborative travel planner for Dublin, London, Paris, and Brussels." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Preconnect before the stylesheet request so the font download starts sooner */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* font-display=swap avoids invisible text while the font loads */}
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #07090f; }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
          ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
          select option { background: #0f1420; color: #f0f0f4; }
          /* Remove 300ms tap delay and iOS blue highlight on interactive elements */
          button, a, input, select, textarea { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
          /* Prevent iOS Safari from zooming in when focusing inputs (requires font-size >= 16px) */
          @media (max-width: 640px) {
            input, select, textarea { font-size: 16px !important; }
          }
        `}</style>
      </Head>
      <Component {...pageProps} />
    </>
  )
}
