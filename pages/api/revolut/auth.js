// Redirect to Revolut authorization
import { getAuthorizationUrl } from '../../../lib/revolut'

export default function handler(req, res) {
  const authUrl = getAuthorizationUrl()
  res.redirect(authUrl)
}
