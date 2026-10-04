const products = {
  mlbb: {
    title: 'Mobile Legends Diamonds',
    needsZone: true,
    items: [
      { name: '86 Diamond', price: 20000, code: 'ML86' },
      { name: '172 Diamond', price: 40000, code: 'ML172' },
      { name: '257 Diamond', price: 60000, code: 'ML257' },
      { name: '706 Diamond', price: 160000, code: 'ML706' }
    ]
  },
  ff: {
    title: 'Free Fire Diamonds',
    needsZone: false,
    items: [
      { name: '140 Diamond', price: 19000, code: 'FF140' },
      { name: '355 Diamond', price: 48000, code: 'FF355' },
      { name: '720 Diamond', price: 95000, code: 'FF720' }
    ]
  },
  pubg: {
    title: 'PUBG Mobile UC',
    needsZone: false,
    items: [
      { name: '60 UC', price: 15000, code: 'PUBG60' },
      { name: '325 UC', price: 75000, code: 'PUBG325' }
    ]
  }
};

let selectedGame = 'mlbb';
let selectedNominal = null;

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const gameParam = urlParams.get('game');
  
  if (gameParam && products[gameParam]) {
    selectedGame = gameParam;
  }

  const gameData = products[selectedGame];
  if (gameData && document.getElementById('gameTitle')) {
    document.getElementById('gameTitle').innerText = gameData.title;
    
    const zoneInput = document.getElementById('zoneId');
    if (!gameData.needsZone) zoneInput.style.display = 'none';

    const grid = document.getElementById('nominalGrid');
    grid.innerHTML = '';
    
    gameData.items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'nominal-card';
      card.innerHTML = `
        <div style="font-weight: 700; font-size: 0.85rem;">💎 ${item.name}</div>
        <div style="color: #00c853; font-weight: 800; font-size: 0.8rem;">Rp ${item.price.toLocaleString('id-ID')}</div>
      `;
      card.onclick = () => {
        document.querySelectorAll('.nominal-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedNominal = item;
      };
      grid.appendChild(card);
    });
  }
});

async function processPayment() {
  const userId = document.getElementById('userId').value;
  const zoneId = document.getElementById('zoneId')?.value || '';
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
    alert('Terjadi kesalahan koneksi.');
  } finally {
    btn.innerText = 'Bayar Sekarang 🚀';
    btn.disabled = false;
  }
}
