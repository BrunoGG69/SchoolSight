import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { timestamp, folder } = req.query;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!timestamp || !folder || !apiSecret) {
    return res.status(400).json({ error: 'Missing parameters or secrets' });
  }

  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(paramsToSign + apiSecret)
    .digest('hex');

  return res.status(200).json({ signature, timestamp });
}
