/**
 * On dashboard: if the logged-in user is the admin (ADMIN_USER_ID), show "Go to Admin" in the header
 * and the Admin card in Quick actions. Only the admin UUID sees these; other users never see them.
 */
import { supabase } from './supabaseClient.js'

;(async () => {
  const headerBtn = document.getElementById('admin-header-btn')
  const cardWrap = document.getElementById('admin-link-wrap')
  if (!headerBtn && !cardWrap) return

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const res = await fetch('/.netlify/functions/adminStats', {
    headers: { Authorization: `Bearer ${session.access_token}` }
  })

  if (res.ok) {
    if (headerBtn) headerBtn.classList.remove('hidden')
    if (cardWrap) cardWrap.classList.remove('hidden')
  }
})()
