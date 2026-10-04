import crypto from 'crypto';

// In-Memory State untuk menyimpan data order & library jika belum terhubung ke database PostgreSQL/Supabase
const globalStore = {
  orders: [],
  entitlements: []
};

export default async function handler(req, res) {
  // Config Header CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, method } = req;

  // ----------------------------------------------------
  // 1. ENDPOINT CHECKOUT & DUITKU QRIS INQUIRY
  // ----------------------------------------------------
  if (method === 'POST' && (url.includes('/checkout') || url.endsWith('/api/index') || url.endsWith('/api'))) {
    try {
      const { userId, zoneId, productCode, price, paymentMethod } = req.body;

      if (!userId || !productCode || !price) {
        return res.status(400).json({
          success: false,
          message: 'Sistem Error: Parameter checkout (userId, productCode, price) tidak lengkap.'
        });
      }

      // Generate ID Transaksi Unik
      const merchantOrderId = 'PLP-' + Date.now();
      
      // Mengambil API Key dari Vercel Environment Variables
      const merchantCode = process.env.DUITKU_MERCHANT_CODE || 'DS36128';
      const apiKey = process.env.DUITKU_API_KEY || 'a8bc95f67d5344c530597321fcd307d9';

      // Kalkulasi Signature MD5 resmi Duitku: MD5(merchantCode + merchantOrderId + price + apiKey)
      const signature = crypto.createHash('md5')
        .update(merchantCode + merchantOrderId + price + apiKey)
        .digest('hex');

      // Simpan data order ke dalam status PENDING
      const orderData = {
        orderId: merchantOrderId,
        targetUserId: userId,
        targetZoneId: zoneId || '',
        productCode,
        amount: price,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };
      globalStore.orders.push(orderData);

      // Request Invoice Pembayaran ke Gateway Duitku
      const response = await fetch('https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantCode,
          paymentAmount: price,
          paymentMethod: paymentMethod || 'NQ', // NQ = QRIS
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
          orderId: merchantOrderId,
          checkoutUrl: data.paymentUrl,
          message: 'Sistem berhasil membuat invoice pembayaran Duitku.'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: data.statusMessage || 'Gagal memproses pembayaran ke Gateway Duitku.'
        });
      }
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Internal Backend Error: ' + err.message
      });
    }
  }

  // ----------------------------------------------------
  // 2. ENDPOINT WEBHOOK CALLBACK & AUTO REFILL SUPPLIER
  // ----------------------------------------------------
  if (method === 'POST' && url.includes('action=webhook')) {
    try {
      const { merchantCode, amount, merchantOrderId, signature, resultCode, additionalParam } = req.body;
      const apiKey = process.env.DUITKU_API_KEY || 'a8bc95f67d5344c530597321fcd307d9';

      // Validasi Keaslian Callback Signature MD5 dari Server Duitku
      const calcSignature = crypto.createHash('md5')
        .update(merchantCode + amount + merchantOrderId + apiKey)
        .digest('hex');

      if (signature !== calcSignature) {
        return res.status(400).json({ success: false, message: 'Invalid Webhook Signature' });
      }

      // Jika Pembayaran Sukses / Lunas (Code 00)
      if (resultCode === '00') {
        // Update Status Order di Database
        const order = globalStore.orders.find(o => o.orderId === merchantOrderId);
        if (order) order.status = 'PAID';

        const [targetUserId, targetZoneId, productCode] = (additionalParam || '').split('|');

        // Panggil API Supplier VIP Reseller untuk Pengisian Otomatis ke Akun Game
        const supplierKey = process.env.SUPPLIER_API_KEY || 'YOUR_VIP_RESELLER_KEY';
        const supplierSign = process.env.SUPPLIER_SIGN || 'YOUR_VIP_RESELLER_SIGN';

        const supplierRes = await fetch('https://vip-reseller.co.id/api/game-feature', {
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

        // Tambahkan ke Entitlements / Game Library User
        globalStore.entitlements.push({
          entitlementId: 'ENT-' + Date.now(),
          orderId: merchantOrderId,
          productCode,
          targetUserId,
          status: 'COMPLETED',
          deliveredAt: new Date().toISOString(),
          supplierResult: supplierData
        });

        return res.status(200).json({
          success: true,
          message: 'Transaksi Lunas & Otomatis Terkirim ke Supplier'
        });
      }

      return res.status(200).json({ success: true, message: 'Callback Diterima' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Webhook Error: ' + err.message });
    }
  }

  // ----------------------------------------------------
  // 3. ENDPOINT GET ORDER HISTORY & LIBRARY DATA
  // ----------------------------------------------------
  if (method === 'GET' && url.includes('action=orders')) {
    return res.status(200).json({
      success: true,
      orders: globalStore.orders,
      entitlements: globalStore.entitlements
    });
  }

  // DEFAULT SERVER STATUS
  return res.status(200).json({
    status: 'ONLINE',
    system: 'PLP TOP UP Core Backend API v2.0',
    timestamp: new Date().toISOString()
  });
}
