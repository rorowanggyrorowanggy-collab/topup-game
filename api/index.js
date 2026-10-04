import crypto from 'crypto';

// IN-MEMORY DATABASE SYSTEM
const DB = {
  users: [],
  products: {
    ML86: { name: '86 Diamond Mobile Legends', price: 20000, supplierCode: 'ML86' },
    ML172: { name: '172 Diamond Mobile Legends', price: 40000, supplierCode: 'ML172' },
    ML257: { name: '257 Diamond Mobile Legends', price: 60000, supplierCode: 'ML257' },
    FF140: { name: '140 Diamond Free Fire', price: 19000, supplierCode: 'FF140' },
    PUBG60: { name: '60 UC PUBG Mobile', price: 15000, supplierCode: 'PUBG60' }
  },
  orders: [],
  entitlements: []
};

export default async function handler(req, res) {
  // CORS & Header Setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url;

  // 1. AUTH API (Google / Basic Auth)
  if (req.method === 'POST' && url.includes('/auth/login')) {
    const { email, name } = req.body;
    let user = DB.users.find(u => u.email === email);
    if (!user) {
      user = { id: 'USR-' + Date.now(), email, name, role: 'USER' };
      DB.users.push(user);
    }
    return res.status(200).json({ success: true, user, token: 'SESSION-TOKEN-' + Date.now() });
  }

  // 2. CHECKOUT & ORDER API (Duitku Payment Gateway)
  if (req.method === 'POST' && (url.includes('/checkout') || url.includes('/create-payment'))) {
    const { userId, zoneId, productCode, price } = req.body;
    
    if (!userId || !productCode || !price) {
      return res.status(400).json({ success: false, message: 'Data pesanan tidak lengkap.' });
    }

    const merchantOrderId = 'ORD-' + Date.now();
    const merchantCode = process.env.DUITKU_MERCHANT_CODE;
    const apiKey = process.env.DUITKU_API_KEY;

    // Direct Signature MD5 Calculation
    const signature = crypto.createHash('md5')
      .update(merchantCode + merchantOrderId + price + apiKey)
      .digest('hex');

    const newOrder = {
      orderId: merchantOrderId,
      userId,
      zoneId: zoneId || '',
      productCode,
      price,
      status: 'PENDING',
      createdAt: new Date()
    };
    DB.orders.push(newOrder);

    try {
      const response = await fetch('https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantCode,
          paymentAmount: price,
          paymentMethod: 'NQ', // QRIS
          merchantOrderId,
          productDetails: `Top Up ${productCode}`,
          additionalParam: `${userId}|${zoneId}|${productCode}`,
          callbackUrl: `https://${req.headers.host}/api/webhook`,
          returnUrl: `https://${req.headers.host}`,
          signature
        })
      });

      const data = await response.json();
      return res.status(200).json({ 
        success: data.statusCode === '00', 
        checkoutUrl: data.paymentUrl, 
        orderId: merchantOrderId,
        message: data.statusMessage
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal menghubungkan ke Duitku Gateway: ' + err.message });
    }
  }

  // 3. WEBHOOK API (Verify Signature & Auto Delivery via VIP Reseller)
  if (req.method === 'POST' && url.includes('/webhook')) {
    const { merchantCode, amount, merchantOrderId, signature, resultCode, additionalParam } = req.body;
    const apiKey = process.env.DUITKU_API_KEY;

    const calcSignature = crypto.createHash('md5')
      .update(merchantCode + amount + merchantOrderId + apiKey)
      .digest('hex');

    if (signature !== calcSignature) {
      return res.status(400).json({ success: false, message: 'Invalid Signature Security' });
    }

    if (resultCode === '00') {
      const order = DB.orders.find(o => o.orderId === merchantOrderId);
      if (order) order.status = 'PAID';

      const [user_id, zone_id, product_code] = (additionalParam || '').split('|');

      try {
        const supplierRes = await fetch('https://vip-reseller.co.id/api/game-feature', {
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

        const supplierData = await supplierRes.json();

        // Save Entitlement / Item Fulfillment
        DB.entitlements.push({
          id: 'ENT-' + Date.now(),
          orderId: merchantOrderId,
          userId: user_id,
          status: 'SUCCESS',
          supplierResponse: supplierData
        });

        return res.status(200).json({ success: true, message: 'Payment Verified & Item Delivered' });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }
    return res.status(200).json({ success: true, message: 'Payment Ignored/Failed' });
  }

  // 4. ADMIN & MONITORING API
  if (req.method === 'GET' && url.includes('/admin/orders')) {
    return res.status(200).json({ success: true, orders: DB.orders, entitlements: DB.entitlements });
  }

  return res.status(404).json({ success: false, message: 'Endpoint API tidak ditemukan.' });
}
