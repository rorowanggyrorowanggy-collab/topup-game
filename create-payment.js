export default async function handler(req, res) {
  // Hanya menerima method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { userId, zoneId, productCode, price, paymentMethod } = req.body;

  // Format data pesanan yang dikirim ke Tripay
  const payload = {
    method: paymentMethod || 'QRIS',
    merchant_ref: 'INV-' + Date.now(),
    amount: price,
    customer_name: 'Pembeli Game',
    customer_email: 'pembeli@email.com',
    order_items: [
      {
        sku: productCode,
        name: `Top Up - User ${userId}`,
        price: price,
        quantity: 1
      }
    ],
    // Simpan data game pembeli di metadata untuk digunakan saat Webhook
    metadata: {
      user_id: userId,
      zone_id: zoneId,
      product_code: productCode
    },
    callback_url: `https://${req.headers.host}/api/webhook`
  };

  try {
    const response = await fetch('https://tripay.co.id/api/transaction/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.TRIPAY_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
