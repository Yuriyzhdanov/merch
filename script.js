const defaultConfig = {
  hero_title: 'Одягайся стильно — підтримай батальйон!',
  hero_subtitle: 'Мерч для патріотів. Кожна покупка — допомога нашим героям',
}

let config = { ...defaultConfig }

// ✅ ВАЖНО: для карусели используем images: [...]
// products are loaded from products.js

// ===== Helper: Random saleType for clothes only =====
function getRandomSaleType() {
  const types = ['Вільний продаж', 'З погодження', 'По замовленню']
  return types[Math.floor(Math.random() * types.length)]
}

// ===== Helper: Get color class for saleType badge =====
function getSaleTypeClass(saleType) {
  switch (saleType) {
    case 'Вільний продаж':
      return 'bg-green-100 text-green-700 border border-green-300'
    case 'З погодження':
      return 'bg-yellow-100 text-yellow-700 border border-yellow-300'
    case 'По замовленню':
      return 'bg-red-100 text-red-700 border border-red-300'
    default:
      return 'bg-gray-100 text-gray-700 border border-gray-300'
  }
}

// ===== Data enrichment: add saleType to clothes only (run once) =====
function enrichProducts(list) {
  if (!Array.isArray(list)) return
  list.forEach(product => {
    if (product.category === 'clothes' && !product.saleType) {
      product.saleType = getRandomSaleType()
    }
  })
}

// Run enrichment at startup
enrichProducts(products)

// ===== UI helper: render sale badge HTML (keeps renderProducts clean) =====
function renderSaleBadge(product) {
  if (!product || !product.saleType) return ''
  const cls = getSaleTypeClass(product.saleType)
  return `<div class="mb-3"><span class="inline-block px-3 py-1 text-xs font-bold rounded-full ${cls}">${product.saleType}</span></div>`
}

let cart = []
let activeCategory = 'all'

// ===== Carousel state =====
const carouselState = new Map() // productId -> index

function getImagesById(productId) {
  const p = products.find(x => x.id === productId)
  if (!p) return []
  if (Array.isArray(p.images) && p.images.length) return p.images
  return []
}

function setCarouselIndex(productId, newIndex) {
  const imgs = getImagesById(productId)
  if (!imgs.length) return

  const idx = ((newIndex % imgs.length) + imgs.length) % imgs.length
  carouselState.set(productId, idx)

  const root = document.querySelector(
    `[data-carousel="true"][data-product-id="${productId}"]`,
  )
  if (!root) return

  const imgEl = root.querySelector('[data-carousel-img="true"]')
  if (imgEl) imgEl.src = imgs[idx]

  const dots = root.querySelectorAll('.carousel-dot')
  dots.forEach((d, i) => d.classList.toggle('active', i === idx))
}

function stepCarousel(productId, dir) {
  const current = carouselState.get(productId) ?? 0
  setCarouselIndex(productId, current + dir)
}

function renderProducts() {
  const grid = document.getElementById('products-grid')
  const filtered =
    activeCategory === 'all'
      ? products
      : products.filter(p => p.category === activeCategory)

  const cards = filtered.map(product => {
    const statusClass = product.inStock
      ? 'status-available'
      : 'status-unavailable'
    const statusText = product.inStock
      ? '✓ Є в наявності'
      : '✗ Нема в наявності'

    const imgs =
      Array.isArray(product.images) && product.images.length
        ? product.images
        : []
    const firstImg = imgs[0] || './img/no-image.svg'
    const hasMany = imgs.length > 1

    const categoryLabel =
      product.category === 'clothes'
        ? 'ОДЯГ'
        : product.category === 'accessories'
          ? 'АКСЕСУАРИ'
          : 'КАНЦЕЛЯРІЯ'

    const sizesHtml = product.sizes
      ? `
        <div class="mb-4">
          <p class="text-xs font-bold text-gray-700 mb-2">РОЗМІРИ:</p>
          <div class="flex gap-2 flex-wrap">
            ${Object.entries(product.sizes)
              .map(
                ([size, available]) =>
                  `<div class="size-btn ${available ? 'available' : 'unavailable'}" title="${available ? 'Доступно' : 'Недоступно'}">${size}</div>`,
              )
              .join('')}
          </div>
        </div>
      `
      : ''

    const carouselControls = hasMany
      ? `
        <button class="carousel-btn left-3" type="button" data-carousel-prev="true" aria-label="Prev">‹</button>
        <button class="carousel-btn right-3" type="button" data-carousel-next="true" aria-label="Next">›</button>
        <div class="carousel-dots" data-carousel-dots="true">
          ${imgs.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}" data-dot="${i}"></span>`).join('')}
        </div>
      `
      : ''

    return `
      <div class="product-card">
        <div class="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden" data-carousel="true" data-product-id="${product.id}">
          <img src="${firstImg}" alt="${product.name}" class="w-full h-full object-cover" loading="lazy" data-carousel-img="true" draggable="false" onerror="this.src='./img/no-image.svg'" />
          ${carouselControls}
          <div class="absolute top-3 right-3 px-2 py-1 bg-gray-900 text-white text-xs font-bold rounded z-[7]">${categoryLabel}</div>
        </div>

        <div class="p-4 flex flex-col flex-grow">
          <h3 class="font-bold text-base mb-2 text-gray-900">${product.name}</h3>
          <div class="mb-2"><span class="status-badge ${statusClass}">${statusText}</span></div>
          ${renderSaleBadge(product)}
          ${sizesHtml}
          <div class="flex items-center justify-between mt-auto">
            <span class="text-lg font-bold text-[#8B0000]">${product.price} ₴</span>
            <button onclick="addToCart(${product.id})" class="px-3 py-2 bg-gradient-to-r from-[#8B0000] to-[#DC143C] text-white font-bold rounded-lg hover:shadow-lg transition-all text-sm" type="button">+ ДОДАТИ</button>
          </div>
        </div>
      </div>
    `
  })

  grid.innerHTML = cards.join('')

  /* // восстановить текущие индексы после перерендера */
  filtered.forEach(p => {
    const idx = carouselState.get(p.id)
    if (idx != null) setCarouselIndex(p.id, idx)
  })
}

function addToCart(productId) {
  const product = products.find(p => p.id === productId)
  const existing = cart.find(item => item.id === productId)

  if (existing) existing.quantity++
  else cart.push({ ...product, quantity: 1 })

  updateCart()
  showNotification(`✓ ${product.name} додано до кошика!`)
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId)
  updateCart()
}

function updateCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0)
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  document.getElementById('cart-count').textContent = count

  const cartItems = document.getElementById('cart-items')
  const cartEmpty = document.getElementById('cart-empty')
  const cartFooter = document.getElementById('cart-footer')

  if (cart.length === 0) {
    cartItems.innerHTML = ''
    cartEmpty.classList.remove('hidden')
    cartFooter.classList.add('hidden')
  } else {
    cartEmpty.classList.add('hidden')
    cartFooter.classList.remove('hidden')
    document.getElementById('cart-total').textContent = `${total} ₴`

    cartItems.innerHTML = cart
      .map(item => {
        const img =
          Array.isArray(item.images) && item.images.length
            ? item.images[0]
            : './img/no-image.svg'
        return `
          <div class="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div class="w-14 h-14 rounded-lg overflow-hidden bg-white border border-gray-200 shrink-0">
              <img
                src="${img}"
                alt="${item.name}"
                class="w-full h-full object-cover"
                loading="lazy"
                onerror="this.src='./img/no-image.svg'"
              />
            </div>

            <div class="flex-1 min-w-0">
              <h4 class="font-bold text-gray-900 text-sm truncate">${item.name}</h4>
              <p class="text-sm text-gray-600">
                ${item.price} ₴ × ${item.quantity} =
                <span class="font-bold text-[#8B0000]">${item.price * item.quantity} ₴</span>
              </p>
            </div>

            <button
              onclick="removeFromCart(${item.id})"
              class="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600 font-bold"
              type="button"
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
        `
      })
      .join('')
  }
}

function showNotification(message) {
  const notification = document.createElement('div')
  notification.className =
    'fixed bottom-4 right-4 px-6 py-3 bg-white border-2 border-[#8B0000] rounded-lg shadow-lg z-50 animate-fadeIn'
  notification.innerHTML = `<p class="font-bold text-[#8B0000] text-sm">${message}</p>`
  document.body.appendChild(notification)

  setTimeout(() => notification.remove(), 2500)
}

/* // Category filter */
document.querySelectorAll('.category-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.category-btn').forEach(b => {
      b.classList.remove('active', 'bg-[#8B0000]', 'text-white')
      b.classList.add(
        'bg-white',
        'text-gray-900',
        'border-2',
        'border-gray-300',
      )
    })
    btn.classList.remove(
      'bg-white',
      'text-gray-900',
      'border-2',
      'border-gray-300',
    )
    btn.classList.add('active', 'bg-[#8B0000]', 'text-white')
    activeCategory = btn.dataset.category
    renderProducts()
  })
})

/* // Cart modal */
document.getElementById('cart-btn').addEventListener('click', () => {
  document.getElementById('cart-modal').classList.remove('hidden')
})
document.getElementById('close-cart').addEventListener('click', () => {
  document.getElementById('cart-modal').classList.add('hidden')
})
document.getElementById('cart-overlay').addEventListener('click', () => {
  document.getElementById('cart-modal').classList.add('hidden')
})

/* // Copy phone number to clipboard */
const copyPhoneBtn = document.getElementById('copy-phone')
if (copyPhoneBtn) {
  copyPhoneBtn.addEventListener('click', () => {
    const phoneNumber = '098 927 29 39'
    navigator.clipboard
      .writeText(phoneNumber)
      .then(() => {
        const originalText = copyPhoneBtn.textContent
        copyPhoneBtn.textContent = '✓ Скопійовано!'
        setTimeout(() => {
          copyPhoneBtn.textContent = originalText
        }, 2000)
      })
      .catch(() => {
        alert('Не вдалось скопіювати номер')
      })
  })
}

/* // ===== Carousel interactions (click + swipe) ===== */
document.getElementById('products-grid').addEventListener('click', e => {
  const card = e.target.closest('[data-carousel="true"]')
  if (!card) return

  const productId = Number(card.dataset.productId)
  if (!productId) return

  if (e.target.closest('[data-carousel-prev="true"]')) {
    e.preventDefault()
    stepCarousel(productId, -1)
    return
  }
  if (e.target.closest('[data-carousel-next="true"]')) {
    e.preventDefault()
    stepCarousel(productId, +1)
    return
  }

  const dot = e.target.closest('[data-dot]')
  if (dot) {
    const idx = Number(dot.dataset.dot)
    setCarouselIndex(productId, idx)
  }
})

let swipeStartX = null
document.getElementById('products-grid').addEventListener(
  'touchstart',
  e => {
    const card = e.target.closest('[data-carousel="true"]')
    if (!card) return
    swipeStartX = e.touches[0].clientX
  },
  { passive: true },
)

document.getElementById('products-grid').addEventListener(
  'touchend',
  e => {
    const card = e.target.closest('[data-carousel="true"]')
    if (!card || swipeStartX === null) return

    const productId = Number(card.dataset.productId)
    const endX = e.changedTouches[0].clientX
    const dx = endX - swipeStartX
    swipeStartX = null

    const threshold = 35
    if (Math.abs(dx) < threshold) return

    stepCarousel(productId, dx < 0 ? +1 : -1)
  },
  { passive: true },
)

/* // Element SDK Integration */
async function onConfigChange(newConfig) {
  config = { ...defaultConfig, ...newConfig }
  renderProducts()
}

function mapToCapabilities(config) {
  return {
    recolorables: [],
    borderables: [],
    fontEditable: undefined,
    fontSizeable: undefined,
  }
}

function mapToEditPanelValues(config) {
  return new Map([
    ['hero_title', config.hero_title || defaultConfig.hero_title],
    ['hero_subtitle', config.hero_subtitle || defaultConfig.hero_subtitle],
  ])
}

if (window.elementSdk) {
  window.elementSdk.init({
    defaultConfig,
    onConfigChange,
    mapToCapabilities,
    mapToEditPanelValues,
  })
}

renderProducts()
updateCart()
