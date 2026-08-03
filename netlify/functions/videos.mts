import type { Config } from '@netlify/functions'
import { readdir, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'

const VALID_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.m4v', '.mkv', '.avi'])

export default async () => {
  const videosDir = join(process.cwd(), 'public', 'videos')

  let filenames: string[] = []
  try {
    filenames = await readdir(videosDir)
  } catch {
    filenames = []
  }

  const videos = await Promise.all(
    filenames
      .filter((name) => VALID_EXTENSIONS.has(extname(name).toLowerCase()))
      .map(async (filename) => {
        const { size } = await stat(join(videosDir, filename))
        const title = filename
          .replace(/\.[^/.]+$/, '')
          .replace(/[_-]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())

        return {
          id: filename,
          filename,
          title,
          size,
          streamUrl: `/videos/${encodeURIComponent(filename)}`,
        }
      }),
  )

  return Response.json(videos)
}

export const config: Config = {
  path: '/api/videos',
}
