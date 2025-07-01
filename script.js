 // Menú hamburguesa
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
        
        // Cerrar menú al hacer clic en un enlace
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
        
        // Modal de producto
        const modal = document.getElementById('productModal');
        const closeModal = document.querySelector('.close-modal');
        const productBtns = document.querySelectorAll('.product-btn');
        
        // Datos de productos
        const products = {
            1: {
                title: 'Cubre Asientos Premium',
                price: '$12,500',
                image: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                            <rect width="200" height="200" fill="#e0e0e0"/>
                            <circle cx="100" cy="80" r="40" fill="#ff0000"/>
                            <rect x="60" y="80" width="80" height="60" fill="#333"/>
                            <circle cx="80" cy="150" r="15" fill="#666"/>
                            <circle cx="120" cy="150" r="15" fill="#666"/>
                        </svg>`
            },
            2: {
                title: 'Filtro de Aire Deportivo',
                price: '$3,200',
                image: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                            <rect width="200" height="200" fill="#e0e0e0"/>
                            <rect x="40" y="60" width="120" height="80" fill="#333"/>
                            <rect x="50" y="70" width="100" height="60" fill="#ff0000"/>
                            <circle cx="100" cy="100" r="20" fill="#fff"/>
                        </svg>`
            },
            3: {
                title: 'Volante Deportivo',
                price: '$8,900',
                image: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                            <rect width="200" height="200" fill="#e0e0e0"/>
                            <circle cx="100" cy="100" r="60" fill="#333"/>
                            <circle cx="100" cy="100" r="50" fill="#666"/>
                            <circle cx="100" cy="100" r="10" fill="#ff0000"/>
                            <path d="M100,50 L100,90" stroke="#ff0000" stroke-width="5"/>
                            <path d="M100,110 L100,150" stroke="#ff0000" stroke-width="5"/>
                            <path d="M50,100 L90,100" stroke="#ff0000" stroke-width="5"/>
                            <path d="M110,100 L150,100" stroke="#ff0000" stroke-width="5"/>
                        </svg>`
            },
            4: {
                title: 'Kit de Frenos Completo',
                price: '$15,800',
                image: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                            <rect width="200" height="200" fill="#e0e0e0"/>
                            <rect x="50" y="50" width="100" height="100" fill="#333"/>
                            <rect x="60" y="60" width="80" height="80" fill="#ff0000"/>
                            <rect x="70" y="70" width="60" height="60" fill="#fff"/>
                        </svg>`
            }
        };
        
        // Abrir modal con datos del producto
        productBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const productId = btn.getAttribute('data-id');
                const product = products[productId];
                
                document.getElementById('modalProductTitle').textContent = product.title;
                document.getElementById('modalProductPrice').textContent = product.price;
                document.getElementById('modalProductImage').innerHTML = product.image;
                
                modal.style.display = 'block';
            });
        });
        
        // Cerrar modal
        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

document.addEventListener('DOMContentLoaded', function() {
    const cartButton = document.getElementById('cart-button');
    const cartSidebar = document.getElementById('cart-sidebar');
    const closeCart = document.getElementById('close-cart');
    const overlay = document.getElementById('overlay');
    const continueShopping = document.getElementById('continue-shopping');
    const cartItems = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const checkoutBtn = document.getElementById('checkout-btn');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    
    // Cargar carrito desde localStorage
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Función para abrir el carrito
    function openCart() {
        cartSidebar.classList.add('open');
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    
    // Función para cerrar el carrito
    function closeCartSidebar() {
        cartSidebar.classList.remove('open');
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    // Actualizar la interfaz del carrito
    function updateCartUI() {
        cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        // Limpiar elementos del carrito excepto el mensaje de vacío
        const children = Array.from(cartItems.children);
        children.forEach(child => {
            if (child.id !== 'empty-cart-message') {
                cartItems.removeChild(child);
            }
        });
        
        // Mostrar mensaje si el carrito está vacío
        if (cart.length === 0) {
            emptyCartMessage.classList.remove('hidden');
            checkoutBtn.disabled = true;
            cartSubtotal.textContent = '$0.00';
            localStorage.removeItem('cart');
            return;
        }
        
        emptyCartMessage.classList.add('hidden');
        checkoutBtn.disabled = false;
        
        // Calcular subtotal y agregar items
        let subtotal = 0;
        
        cart.forEach((item, index) => {
            subtotal += item.price * item.quantity;
            
            const cartItem = document.createElement('div');
            cartItem.className = 'flex items-center justify-between pb-4';
            cartItem.innerHTML = `
                <div class="flex items-center">
                    <div class="bg-gray-200 rounded-md w-12 h-12 flex items-center justify-center mr-3">
                        <svg class="h-6 w-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                        </svg>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium text-gray-800">${item.name}</h4>
                        <span class="text-sm text-gray-600">Cantidad: ${item.quantity}</span>
                        <span class="text-sm text-gray-600 block">$${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                </div>
                <button class="remove-item text-gray-400 hover:text-red-600" data-id="${item.id}">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            `;
            
            cartItems.appendChild(cartItem);
        });
        
        // Actualizar subtotal
        cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
        localStorage.setItem('cart', JSON.stringify(cart));
    }
    
    // Delegación de eventos para eliminar items
    cartItems.addEventListener('click', (e) => {
        if (e.target.closest('.remove-item')) {
            const itemId = e.target.closest('.remove-item').dataset.id;
            cart = cart.filter(item => item.id !== itemId);
            updateCartUI();
        }
    });
    
    // Event listeners para abrir/cerrar carrito
    cartButton.addEventListener('click', openCart);
    closeCart.addEventListener('click', closeCartSidebar);
    overlay.addEventListener('click', closeCartSidebar);
    continueShopping.addEventListener('click', closeCartSidebar);
    
    // Agregar productos al carrito
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productCard = this.closest('.product-card');
            const productId = productCard.dataset.productId;
            const productName = productCard.querySelector('h3').textContent;
            const productPrice = parseFloat(productCard.querySelector('.text-xl').textContent.replace('$', ''));
            
            // Verificar si el producto ya está en el carrito
            const existingItem = cart.find(item => item.id === productId);
            
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    id: productId,
                    name: productName,
                    price: productPrice,
                    quantity: 1
                });
            }
            
            updateCartUI();
            openCart();
            
            // Animación de feedback
            this.classList.add('scale-110');
            setTimeout(() => this.classList.remove('scale-110'), 200);
        });
    });
    
    // Finalizar compra
    checkoutBtn.addEventListener('click', () => {
        if (cart.length > 0) {
            alert('¡Gracias por tu compra! Total: $' + cartSubtotal.textContent);
            cart = [];
            updateCartUI();
            closeCartSidebar();
        }
    });
    
    // Inicializar carrito
    updateCartUI();
});
