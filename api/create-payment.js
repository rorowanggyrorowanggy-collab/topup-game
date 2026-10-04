import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { userId, zoneId, productCode, price, paymentMethod } = req.body;
  const merchantCode = process.env.DUITKU_MERCHANT_CODE;
  const apiKey = process.env.DUITKU_API_KEY;
  const merchantOrderId = 'INV-' + Date.now();

  const signature = crypto.createHash('md5')
    .update(merchantCode + merchantOrderId + price + apiKey)
    .digest('hex');

  const payload = {
    merchantCode,
    paymentAmount: price,
    paymentMethod: paymentMethod || 'NQ',
    merchantOrderId,
    productDetails: `Top Up - User ${userId}`,
    email: 'pembeli@email.com',
    additionalParam: `${userId}|${zoneId}|${productCode}`,
    callbackUrl: `https://${req.headers.host}/api/webhook`,
    returnUrl: `https://${req.headers.host}`,
    signature
  };

  try {
    const response = await fetch('https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return res.status(200).json({
      success: data.statusCode === '00',
      data: { checkout_url: data.paymentUrl },
      message: data.statusMessage
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
