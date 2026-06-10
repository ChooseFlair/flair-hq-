import { getAuthUrl } from '../../../lib/truelayer'

export default function handler(req, res) {
  res.redirect(302, getAuthUrl())
}
