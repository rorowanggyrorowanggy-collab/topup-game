// DATABASE KATALOG GAME
const gameProducts = {
  mlbb: {
    name: 'Mobile Legends',
    needsZone: true,
    items: [
      { name: '86 Diamond', price: 20000, code: 'ML86' },
      { name: '172 Diamond', price: 40000, code: 'ML172' },
      { name: '257 Diamond', price: 60000, code: 'ML257' },
      { name: '706 Diamond', price: 160000, code: 'ML706' }
    ]
  },
  ff: {
    name: 'Free Fire',
    needsZone: false,
    items: [
      { name: '140 Diamond', price: 19000, code: 'FF140' },
      { name: '355 Diamond', price: 48000, code: 'FF355' },
      { name: '720 Diamond', price: 95000, code: 'FF720' }
    ]
  },
  pubg: {
    name: 'PUBG Mobile',
    needsZone: false,
    items: [
      { name: '60 UC', price: 15000, code: 'PUBG60' },
      { name: '325 UC', price: 75000, code: 'PUBG325' }
    ]
  }
};

let currentGame = 'mlbb';
let selectedNominal = null;

function loadNominals(gameKey) {
  const grid = document.getElementById('nominalGrid');
  if (!grid) return;
  grid.innerHTML = '';
  selectedNominal = null;

  gameProducts[gameKey].items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'nominal-card';
    card.innerHTML = `
      <div style="font-weight: 700; font-size: 0.85rem;">💎 ${item.name}</div>
      <div style="color: #38bdf8; font-weight: 800; font-size: 0.8rem; margin-top: 4px;">Rp ${item.price.toLocaleString('id-ID')}</div>
    `;
    card.onclick = () => {
      document.querySelectorAll('.nominal-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedNominal = item;
    };
    grid.appendChild(card);
  });
}

function selectGame(gameKey, element) {
  currentGame = gameKey;
  document.querySelectorAll('.game-card').forEach(c => c.classList.remove('active'));
  element.classList.add('active');

  const zoneInput = document.getElementById('zoneId');
  if (zoneInput) {
    zoneInput.style.display = gameProducts[gameKey].needsZone ? 'block' : 'none';
  }

  loadNominals(gameKey);
}

// PROSES CHECKOUT INTEGRASI FULL BACKEND
async function processPayment() {
  const userId = document.getElementById('userId').value;
  const zoneId = document.getElementById('zoneId')?.value || '';

  if (!userId || !selectedNominal) {
    alert('Harap isi User ID dan pilih nominal item!');
    return;
  }

  const btn = document.querySelector('.pay-btn');
  btn.innerText = 'Memproses Pesanan Ke Gateway...';
  btn.disabled = true;

  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        zoneId,
        productCode: selectedNominal.code,
        price: selectedNominal.price
      })
    });

    const result = await response.json();

    if (result.success && result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
    } else {
      alert('Gagal memproses transaksi: ' + (result.message || 'Terjadi kesalahan sistem'));
    }
  } catch (error) {
    alert('Gagal terhubung ke Backend Server API.');
  } finally {
    btn.innerText = 'Beli Sekarang 🚀';
    btn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => loadNominals('mlbb'));
