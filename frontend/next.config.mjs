import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import withPWA from 'next-pwa'

const __dirname = dirname(fileURLToPath(import.meta.url))

const pwa = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: resolve(__dirname, '..'),
  },
}

export default pwa(nextConfig)
