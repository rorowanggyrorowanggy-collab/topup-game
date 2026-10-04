import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { merchantCode, amount, merchantOrderId, signature, resultCode, additionalParam } = req.body;
  const apiKey = process.env.DUITKU_API_KEY;

  const calcSignature = crypto.createHash('md5')
    .update(merchantCode + amount + merchantOrderId + apiKey)
    .digest('hex');

  if (signature !== calcSignature) {
    return res.status(400).json({ success: false, message: 'Invalid Signature' });
  }

  if (resultCode === '00') {
    const [user_id, zone_id, product_code] = (additionalParam || '').split('|');

    try {
      const supplierResponse = await fetch('https://vip-reseller.co.id/api/game-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: process.env.SUPPLIER_API_KEY,
          sign: process.env.SUPPLIER_SIGN,
          type: 'order',
          service: product_code,
          target: zone_id ? `${user_id}|${zone_id}` : user_id
        })
      });

      const result = await supplierResponse.json();
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(200).json({ success: true, message: 'Status Ignored' });
}
