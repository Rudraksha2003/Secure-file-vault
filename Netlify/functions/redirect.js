import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  const code = event.queryStringParameters?.code || (event.path && event.path.replace(/^\/\.netlify\/functions\/redirect\/?/, '').replace(/^\/s\//, ''))
  if (!code) {
    return { statusCode: 404, body: 'Not found' }
  }

  const { data, error } = await supabase
    .from('short_links')
    .select('url')
    .eq('code', code)
    .single()

  if (error || !data) {
    return { statusCode: 404, body: 'Link not found' }
  }

  return {
    statusCode: 302,
    headers: { Location: data.url }
  }
}
