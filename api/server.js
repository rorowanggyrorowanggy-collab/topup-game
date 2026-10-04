import crypto from 'crypto';

// SIMULASI DATABASE IN-MEMORY
const DB = {
  users: [],
  games: [
    { id: 'ML86', title: '86 Diamond Mobile Legends', price: 20000 },
    { id: 'FF140', title: '140 Diamond Free Fire', price: 19000 },
    { id: 'PUBG60', title: '60 UC PUBG Mobile', price: 15000 }
  ],
  orders: [],
  entitlements: []
};

export default async function handler(req, res) {
  const { path } = req.query;

  // 1. AUTH API (Google Login)
  if (req.method === 'POST' && req.url.includes('/auth/google')) {
    const { email, name } = req.body;
    let user = DB.users.find(u => u.email === email);
    if (!user) {
      user = { id: DB.users.length + 1, email, name, role: 'USER' };
      DB.users.push(user);
    }
    return res.status(200).json({ success: true, user, token: 'JWT-SESSION-TOKEN' });
  }

  // 2. CHECKOUT & ORDER API
  if (req.method === 'POST' && req.url.includes('/checkout')) {
    const { userId, zoneId, productCode, price } = req.body;
    const merchantOrderId = 'ORD-' + Date.now();
    const merchantCode = process.env.DUITKU_MERCHANT_CODE;
    const apiKey = process.env.DUITKU_API_KEY;

    const signature = crypto.createHash('md5')
      .update(merchantCode + merchantOrderId + price + apiKey)
      .digest('hex');

    const orderData = {
      orderId: merchantOrderId,
      userId,
      zoneId,
      productCode,
      price,
      status: 'PENDING'
    };
    DB.orders.push(orderData);

    try {
      const response = await fetch('https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantCode,
          paymentAmount: price,
          paymentMethod: 'NQ',
          merchantOrderId,
          productDetails: `Top Up ${productCode}`,
          additionalParam: `${merchantOrderId}`,
          callbackUrl: `https://${req.headers.host}/api/webhook`,
          returnUrl: `https://${req.headers.host}`,
          signature
        })
      });

      const data = await response.json();
      return res.status(200).json({ success: true, checkoutUrl: data.paymentUrl, orderId: merchantOrderId });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // 3. ADMIN API (Monitoring Orders)
  if (req.method === 'GET' && req.url.includes('/admin/orders')) {
    return res.status(200).json({ success: true, orders: DB.orders, entitlements: DB.entitlements });
  }

  return res.status(404).json({ message: 'API Route Not Found' });
}
