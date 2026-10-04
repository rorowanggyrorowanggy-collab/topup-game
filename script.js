const gameCatalog = [
  { id: 1, title: 'Cyberpunk 2077', genre: 'RPG', price: 450000, img: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=400' },
  { id: 2, title: 'Resident Evil 4', genre: 'Horror', price: 380000, img: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=400' },
  { id: 3, title: 'Civilization VI', genre: 'Strategy', price: 250000, img: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?q=80&w=400' },
  { id: 4, title: 'Grand Theft Auto V', genre: 'Action', price: 200000, img: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=400' },
  { id: 5, title: 'The Witcher 3', genre: 'RPG', price: 180000, img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400' }
];

let cart = [];
let wishlist = [];

function renderCatalog(games) {
  const grid = document.getElementById('gameGrid');
  grid.innerHTML = '';
  games.forEach(game => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
      <img src="${game.img}" alt="${game.title}">
      <div class="card-body">
        <div class="card-title">${game.title}</div>
        <div class="card-genre">${game.genre}</div>
        <div class="card-footer">
          <span class="card-price">Rp ${game.price.toLocaleString('id-ID')}</span>
          <button class="add-cart-btn" onclick="addToCart('${game.title}', ${game.price})">+ Cart</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function filterGenre(genre) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  
  if (genre === 'All' || genre === 'Deals') {
    renderCatalog(gameCatalog);
  } else {
    const filtered = gameCatalog.filter(g => g.genre === genre);
    renderCatalog(filtered);
  }
}

function filterGames() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const filtered = gameCatalog.filter(g => g.title.toLowerCase().includes(query));
  renderCatalog(filtered);
}

function addToCart(title, price) {
  cart.push({ title, price });
  updateCartUI();
  alert(`${title} added to shopping cart!`);
}

function updateCartUI() {
  document.getElementById('cartCount').innerText = cart.length;
  const list = document.getElementById('cartItems');
  list.innerHTML = '';
  let total = 0;
  cart.forEach((item, index) => {
    total += item.price;
    list.innerHTML += `
      <div class="cart-item">
        <span>${item.title}</span>
        <span>Rp ${item.price.toLocaleString('id-ID')}</span>
      </div>
    `;
  });
  document.getElementById('cartTotal').innerText = `Rp ${total.toLocaleString('id-ID')}`;
}

async function processCheckout() {
  if (cart.length === 0) {
    alert('Cart is empty!');
    return;
  }

  const totalAmount = cart.reduce((sum, i) => sum + i.price, 0);

  try {
    const response = await fetch('/api/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'USER-' + Date.now(),
        zoneId: '',
        productCode: 'GAME_BUNDLE',
        price: totalAmount,
        paymentMethod: 'NQ'
      })
    });

    const result = await response.json();
    if (result.success && result.data.checkout_url) {
      window.location.href = result.data.checkout_url;
    } else {
      alert('Checkout Failed: ' + (result.message || 'Payment Gateway Error'));
    }
  } catch (err) {
    alert('Error connecting to backend API.');
  }
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function handleLogin(e) { e.preventDefault(); alert('Authentication Successful! 2FA Verified.'); closeModal('authModal'); }

document.addEventListener('DOMContentLoaded', () => renderCatalog(gameCatalog));
