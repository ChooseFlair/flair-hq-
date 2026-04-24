import { serialize } from 'cookie'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password } = req.body
  const correctPassword = process.env.DASHBOARD_PASSWORD

  if (!correctPassword) {
    return res.status(500).json({ error: 'Password not configured' })
  }

  if (password === correctPassword) {
    // Set auth cookie - expires in 30 days
    const cookie = serialize('flair_auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    res.setHeader('Set-Cookie', cookie)
    return res.status(200).json({ success: true })
  }

  return res.status(401).json({ success: false, error: 'Incorrect password' })
}
