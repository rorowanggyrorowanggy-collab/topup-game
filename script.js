const products = {
  mlbb: [
    { name: '86 Diamond', price: 20000, code: 'ML86' },
    { name: '172 Diamond', price: 40000, code: 'ML172' },
    { name: '257 Diamond', price: 60000, code: 'ML257' }
  ],
  ff: [
    { name: '140 Diamond', price: 19000, code: 'FF140' },
    { name: '355 Diamond', price: 48000, code: 'FF355' },
    { name: '720 Diamond', price: 95000, code: 'FF720' }
  ],
  pubg: [
    { name: '60 UC', price: 15000, code: 'PUBG60' },
    { name: '325 UC', price: 75000, code: 'PUBG325' }
  ]
};

let currentGame = 'mlbb';
let selectedNominal = null;

function loadProducts(gameKey) {
  const grid = document.getElementById('nominalGrid');
  grid.innerHTML = '';
  selectedNominal = null;

  products[gameKey].forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'nominal-btn';
    btn.innerHTML = `${item.name}<br><strong>Rp ${item.price.toLocaleString('id-ID')}</strong>`;
    btn.onclick = () => {
      document.querySelectorAll('.nominal-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedNominal = item;
    };
    grid.appendChild(btn);
  });
}

function switchGame(gameKey) {
  currentGame = gameKey;
  document.querySelectorAll('.game-btn').forEach(b => b.classList.remove('active'));
  if (event && event.target) event.target.classList.add('active');

  const zoneInput = document.getElementById('zoneId');
  if (gameKey === 'mlbb') {
    zoneInput.style.display = 'block';
  } else {
    zoneInput.style.display = 'none';
  }

  loadProducts(gameKey);
}

async function processPayment() {
  const userId = document.getElementById('userId').value;
  const zoneId = document.getElementById('zoneId').value;
  const paymentMethod = document.getElementById('paymentMethod').value;

  if (!userId || !selectedNominal) {
    alert('Harap isi ID Akun dan pilih nominal!');
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
        zoneId: currentGame === 'mlbb' ? zoneId : '',
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

document.addEventListener('DOMContentLoaded', () => loadProducts('mlbb'));
