import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const privateKey = process.env.TRIPAY_PRIVATE_KEY;
  const jsonBody = JSON.stringify(req.body);

  // Verifikasi keamanan signature dari Tripay
  const signature = crypto.createHmac('sha256', privateKey).update(jsonBody).digest('hex');
  const callbackSignature = req.headers['x-callback-signature'];

  if (signature !== callbackSignature) {
    return res.status(400).json({ success: false, message: 'Invalid Signature' });
  }

  const { status, metadata } = req.body;

  // JIKA PEMBAYARAN SUDAH LUNAS (PAID)
  if (status === 'PAID') {
    const { user_id, zone_id, product_code } = metadata;

    // Panggil API Supplier VIP Reseller untuk proses top up otomatis
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
