let selectedNominal = null;

function selectNominal(element, price, code) {
  document.querySelectorAll('.nominal-btn').forEach(btn => btn.classList.remove('active'));
  element.classList.add('active');
  selectedNominal = { price, code };
}

async function processPayment() {
  const userId = document.getElementById('userId').value;
  const zoneId = document.getElementById('zoneId').value;
  const paymentMethod = document.getElementById('paymentMethod').value;

  if (!userId || !selectedNominal) {
    alert('Harap isi User ID dan pilih nominal diamond!');
    return;
  }

  const btn = document.querySelector('.pay-btn');
  btn.innerText = 'Memproses...';
  btn.disabled = true;

  try {
    const response = await fetch('/api/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        zoneId,
        productCode: selectedNominal.code,
        price: selectedNominal.price,
        paymentMethod
      })
    });

    const result = await response.json();

    if (result.success && result.data.checkout_url) {
      window.location.href = result.data.checkout_url;
    } else {
      alert('Gagal membuat pembayaran: ' + (result.message || 'Terjadi kesalahan'));
    }
  } catch (error) {
    alert('Terjadi kesalahan koneksi ke server.');
  } finally {
    btn.innerText = 'Bayar Sekarang';
    btn.disabled = false;
  }
}
