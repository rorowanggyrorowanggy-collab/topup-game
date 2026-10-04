let selectedProduct = null;
let selectedPrice = 0;

function selectItem(code, price) {
  selectedProduct = code;
  selectedPrice = price;
  
  // Efek penanda tombol aktif
  document.querySelectorAll('.item-btn').forEach(btn => btn.classList.remove('selected'));
  event.target.classList.add('selected');
}

async function processPayment() {
  const userId = document.getElementById('userId').value;
  const zoneId = document.getElementById('zoneId').value;
  const paymentMethod = document.getElementById('paymentMethod').value;

  if (!userId || !zoneId || !selectedProduct) {
    alert('Mohon lengkapi ID Game dan pilih Nominal Diamond!');
    return;
  }

  // Kirim data transaksi ke backend Vercel (api/create-payment)
  const response = await fetch('/create-payment', ...    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      zoneId,
      productCode: selectedProduct,
      price: selectedPrice,
      paymentMethod
    })
  });

  const result = await response.json();

  if (result.success) {
    // Alihkan pembeli ke halaman pembayaran QRIS Tripay
    window.location.href = result.data.checkout_url;
  } else {
    alert('Gagal membuat pesanan: ' + result.message);
  }
}
