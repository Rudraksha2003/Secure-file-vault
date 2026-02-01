/**
 * Writes public/js/supabaseConfig.generated.js from env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).
 * Run before build so static HTML pages that use Supabase get config. File is gitignored.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY

const outPath = path.join(__dirname, '..', 'public', 'js', 'supabaseConfig.generated.js')
const dir = path.dirname(outPath)
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

if (url && key) {
  const content =
    '// Generated at build time from env. Do not commit.\n' +
    'window.__SUPABASE_URL__=' + JSON.stringify(url) + ';\n' +
    'window.__SUPABASE_ANON_KEY__=' + JSON.stringify(key) + ';\n'
  fs.writeFileSync(outPath, content, 'utf8')
} else {
  // No env: write empty so static pages don't break; client will throw when used
  fs.writeFileSync(
    outPath,
    '// No Supabase env at build time. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for static pages.\n',
    'utf8'
  )
}
