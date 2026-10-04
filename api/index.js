import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { userId, productCode, price } = req.body;
    const merchantOrderId = 'ORD-' + Date.now();
    const merchantCode = process.env.DUITKU_MERCHANT_CODE || 'DS36128';
    const apiKey = process.env.DUITKU_API_KEY || 'a8bc95f67d5344c530597321fcd307d9';

    const signature = crypto.createHash('md5')
      .update(merchantCode + merchantOrderId + price + apiKey)
      .digest('hex');

    try {
      const response = await fetch('https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantCode,
          paymentAmount: price,
          paymentMethod: 'NQ',
          merchantOrderId,
          productDetails: `Order ${productCode}`,
          additionalParam: `${userId}|${productCode}`,
          callbackUrl: `https://${req.headers.host}/api/index`,
          returnUrl: `https://${req.headers.host}`,
          signature
        })
      });

      const data = await response.json();
      return res.status(200).json({
        success: data.statusCode === '00',
        checkoutUrl: data.paymentUrl,
        message: data.statusMessage
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(200).json({ status: 'API Server Running' });
}
