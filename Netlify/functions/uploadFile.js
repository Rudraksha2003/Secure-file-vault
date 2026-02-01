import Busboy from 'busboy'
import { createClient } from '@supabase/supabase-js'


const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)


export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }


  const authHeader = event.headers.authorization
  if (!authHeader) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Login required' }) }
  }


  return new Promise((resolve) => {
    const busboy = Busboy({ headers: event.headers })


    let fileBuffer
    let fileName
    let mimeType


    busboy.on('file', (_name, file, info) => {
      fileName = info.filename
      mimeType = info.mimeType


      const chunks = []
      file.on('data', (d) => chunks.push(d))
      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks)
      })
    })


    busboy.on('finish', async () => {
      if (!fileBuffer || !fileName) {
        return resolve({
          statusCode: 400,
          body: JSON.stringify({ error: 'No file uploaded' })
        })
      }

      const { data: row } = await supabase.from('app_settings').select('value').eq('key', 'blocked_file_types').maybeSingle()
      const blocked = row?.value
      if (Array.isArray(blocked) && blocked.length > 0) {
        const ext = (fileName.split('.').pop() || '').toLowerCase().replace(/^\./, '')
        const blockedLower = blocked.map((b) => String(b).toLowerCase().replace(/^\./, ''))
        if (ext && blockedLower.includes(ext)) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ error: `File type .${ext} is not allowed for security.` })
          })
        }
      }

      const path = `uploads/${Date.now()}-${fileName}`


      const { error: uploadError } = await supabase.storage
        .from('vault')
        .upload(path, fileBuffer, {
          contentType: mimeType,
          upsert: false
        })


      if (uploadError) {
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ error: uploadError.message })
        })
      }


      const { data: signed, error: signError } =
        await supabase.storage
          .from('vault')
          .createSignedUrl(path, 300)


      if (signError) {
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ error: signError.message })
        })
      }


      resolve({
        statusCode: 200,
        body: JSON.stringify({ url: signed.signedUrl })
      })
    })


    busboy.end(
      Buffer.from(
        event.body,
        event.isBase64Encoded ? 'base64' : 'utf8'
      )
    )
  })
}
