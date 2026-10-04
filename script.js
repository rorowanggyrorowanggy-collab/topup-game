const products = {
  mlbb: [
    { name: '86 Diamond', price: 20000, code: 'ML86' },
    { name: '172 Diamond', price: 40000, code: 'ML172' },
    { name: '257 Diamond', price: 60000, code: 'ML257' },
    { name: '706 Diamond', price: 160000, code: 'ML706' }
  ],
  ff: [
    { name: '140 Diamond', price: 19000, code: 'FF140' },
    { name: '355 Diamond', price: 48000, code: 'FF355' },
    { name: '720 Diamond', price: 95000, code: 'FF720' }
  ],
  pubg: [
    { name: '60 Unknown Cash', price: 15000, code: 'PUBG60' },
    { name: '325 Unknown Cash', price: 75000, code: 'PUBG325' }
  ]
};

let currentGame = 'mlbb';
let selectedNominal = null;

function loadProducts(gameKey) {
  const grid = document.getElementById('nominalGrid');
  grid.innerHTML = '';
  selectedNominal = null;

  products[gameKey].forEach(item => {
    const card = document.createElement('div');
    card.className = 'nominal-card';
    card.innerHTML = `
      <div class="item-name">💎 ${item.name}</div>
      <div class="item-price">Rp ${item.price.toLocaleString('id-ID')}</div>
    `;
    card.onclick = () => {
      document.querySelectorAll('.nominal-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedNominal = item;
    };
    grid.appendChild(card);
  });
}

function switchGame(gameKey, element) {
  currentGame = gameKey;
  document.querySelectorAll('.game-card').forEach(c => c.classList.remove('active'));
  element.classList.add('active');

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
    alert('Harap isi User ID dan pilih nominal item!');
    return;
  }

  const btn = document.querySelector('.pay-btn');
  btn.innerText = 'Memproses Pesanan...';
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
    btn.innerText = 'Beli Sekarang 🚀';
    btn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => loadProducts('mlbb'));
