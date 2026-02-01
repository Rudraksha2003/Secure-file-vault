import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CODE_LENGTH = 6
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function randomCode() {
  let s = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return s
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let url
  try {
    const body = JSON.parse(event.body || '{}')
    url = body.url
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid body' }) }
  }

  if (!url || typeof url !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'url required' }) }
  }

  const origin = event.headers.origin || event.headers['x-forwarded-host'] || event.headers.host || ''
  const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`

  let code
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    code = randomCode()
    const { error } = await supabase.from('short_links').insert({ code, url })
    if (!error) break
    if (error.code === '23505') {
      attempts++
      continue
    }
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }

  if (attempts >= maxAttempts) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not generate unique code' }) }
  }

  const shortUrl = baseUrl ? `${baseUrl}/s/${code}` : `/s/${code}`

  return {
    statusCode: 200,
    body: JSON.stringify({ shortUrl, code, url })
  }
}
