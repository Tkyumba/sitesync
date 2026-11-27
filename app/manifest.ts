import type { MetadataRoute } from 'next'

// Lets people "Add to Home Screen" and open SiteSync like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SiteSync',
    short_name: 'SiteSync',
    description: 'Job site tracking for home builders.',
    start_url: '/dashboard/operations',
    scope: '/',
    display: 'standalone',
    background_color: '#0F1117',
    theme_color: '#0F1117',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
