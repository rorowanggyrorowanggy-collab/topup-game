import crypto from 'crypto';

export default async function handler(req, res) {
  // CORS Header Setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. ENDPOINT CHECKOUT & DUITKU QRIS INQUIRY
  if (req.method === 'POST' && (req.url.includes('/checkout') || req.url.endsWith('/api/index') || req.url.endsWith('/api'))) {
    const { userId, zoneId, productCode, price } = req.body;

    if (!userId || !productCode || !price) {
      return res.status(400).json({ success: false, message: 'Data pesanan (User ID/Product/Price) tidak lengkap.' });
    }

    const merchantOrderId = 'PLP-' + Date.now();
    
    // Kunci API Duitku (Ganti dengan Merchant Code & API Key Duitku milikmu di Vercel Environment Variables)
    const merchantCode = process.env.DUITKU_MERCHANT_CODE || 'DS36128'; 
    const apiKey = process.env.DUITKU_API_KEY || 'a8bc95f67d5344c530597321fcd307d9';

    // Kalkulasi Signature MD5 resmi Duitku: MD5(merchantCode + merchantOrderId + amount + apiKey)
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
          paymentMethod: 'NQ', // QRIS All E-Wallet & Bank
          merchantOrderId,
          productDetails: `PLP Top Up - ${productCode}`,
          additionalParam: `${userId}|${zoneId}|${productCode}`,
          callbackUrl: `https://${req.headers.host}/api/index?action=webhook`,
          returnUrl: `https://${req.headers.host}`,
          signature
        })
      });

      const data = await response.json();

      if (data.statusCode === '00') {
        return res.status(200).json({
          success: true,
          checkoutUrl: data.paymentUrl,
          orderId: merchantOrderId,
          message: 'QRIS Payment Created'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: data.statusMessage || 'Gagal membuat QRIS Duitku.'
        });
      }
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal terhubung ke Gateway Duitku: ' + err.message });
    }
  }

  // 2. ENDPOINT WEBHOOK & AUTO DELIVERY (VIP RESELLER INTEGRATION)
  if (req.method === 'POST' && req.url.includes('action=webhook')) {
    const { merchantCode, amount, merchantOrderId, signature, resultCode, additionalParam } = req.body;
    const apiKey = process.env.DUITKU_API_KEY || 'a8bc95f67d5344c530597321fcd307d9';

    // Verifikasi Keamanan Signature Webhook Callback
    const calcSignature = crypto.createHash('md5')
      .update(merchantCode + amount + merchantOrderId + apiKey)
      .digest('hex');

    if (signature !== calcSignature) {
      return res.status(400).json({ success: false, message: 'Signature Webhook Tidak Valid' });
    }

    // Jika Status Pembayaran Sukses / Lunas (00)
    if (resultCode === '00') {
      const [targetUserId, targetZoneId, productCode] = (additionalParam || '').split('|');

      // Panggilan API Supplier VIP Reseller untuk Pengisian Otomatis
      try {
        const supplierApiUrl = 'https://vip-reseller.co.id/api/game-feature';
        const supplierKey = process.env.SUPPLIER_API_KEY || 'YOUR_VIP_RESELLER_KEY';
        const supplierSign = process.env.SUPPLIER_SIGN || 'YOUR_VIP_RESELLER_SIGN';

        const supplierRes = await fetch(supplierApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            key: supplierKey,
            sign: supplierSign,
            type: 'order',
            service: productCode,
            target: targetZoneId ? `${targetUserId}|${targetZoneId}` : targetUserId
          })
        });

        const supplierData = await supplierRes.json();
        return res.status(200).json({ success: true, message: 'Order Lunas & Diamond Dikirim', supplierResult: supplierData });
      } catch (err) {
        return res.status(500).json({ success: false, message: 'Pembayaran Sukses tapi Gagal Refill Supplier: ' + err.message });
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook Diterima' });
  }

  return res.status(200).json({ status: 'PLP TOP UP Backend API Active' });
}
