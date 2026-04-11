// ==========================
// Configuración API (misma máquina → cookie de sesión en fetch credentialed)
// ==========================
function resolveApiBaseUrl() {
    if (typeof window === "undefined") return "http://localhost:4000";
    if (window.MMDR_API_BASE) return window.MMDR_API_BASE;
    const h = window.location.hostname;
    if (h) return `http://${h}:4000`;
    return "http://localhost:4000";
}

const API_BASE_URL = resolveApiBaseUrl();
if (typeof window !== "undefined") {
    window.MMDR_API_BASE = API_BASE_URL;
}

/** Si ya hay sesión en el servidor, no mostrar el formulario de login. */
async function redirectIfAlreadyLoggedIn() {
    const loginForm = document.querySelector("#login-form");
    if (!loginForm) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: "include" });
        if (!response.ok) return;
        const user = await response.json();
        const userPayload = {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role === "admin" ? "admin" : "user"
        };
        localStorage.setItem("usuario", JSON.stringify(userPayload));
        if (userPayload.role === "admin") {
            window.location.replace("mode-selection.html");
        } else {
            window.location.replace("inicio.html");
        }
    } catch {
        /* sin servidor: dejar ver login */
    }
}

// ==========================
// Utilidades
// ==========================
function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.textContent = message;
    notification.className = `notification ${type}`;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ==========================
// LOGIN
// ==========================
async function handleLogin() {
    const emailInput = document.querySelector("#login-email");
    const passwordInput = document.querySelector("#login-password");
    const submitBtn = document.querySelector("#login-submit");

    if (!emailInput.value || !passwordInput.value) {
        showNotification("Por favor, complete todos los campos", "error");
        return;
    }

    submitBtn.textContent = "Iniciando...";
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                email: emailInput.value.toLowerCase().trim(),
                password: passwordInput.value
            })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification("¡Inicio de sesión exitoso!", "success");
            const du = data.user || {};
            const uid = du.id != null ? String(du.id) : du._id != null ? String(du._id) : "";
            const userPayload = {
                id: uid,
                email: du.email,
                name: du.name,
                role: du.role === "admin" ? "admin" : "user"
            };
            localStorage.setItem("usuario", JSON.stringify(userPayload));

            setTimeout(() => {
                if (userPayload.role === "admin") {
                    window.location.href = "mode-selection.html";
                } else {
                    window.location.href = "inicio.html";
                }
            }, 1500);
        } else {
            showNotification(data.error || "Error en el inicio de sesión", "error");
        }
    } catch (error) {
        console.error("Error en login:", error);
        showNotification("Error de conexión con el servidor. Verifica que el backend esté ejecutándose.", "error");
    } finally {
        submitBtn.textContent = "Iniciar Sesión";
        submitBtn.disabled = false;
    }
}

// ==========================
// REGISTRO
// ==========================
async function handleSignup() {
    const nameInput = document.querySelector("#signup-name");
    const emailInput = document.querySelector("#signup-email");
    const passwordInput = document.querySelector("#signup-password");
    const submitBtn = document.querySelector("#signup-submit");

    if (!nameInput.value || !emailInput.value || !passwordInput.value) {
        showNotification("Por favor, complete todos los campos", "error");
        return;
    }

    if (passwordInput.value.length < 6) {
        showNotification("La contraseña debe tener al menos 6 caracteres", "error");
        return;
    }

    submitBtn.textContent = "Registrando...";
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                name: nameInput.value.trim(),
                email: emailInput.value.toLowerCase().trim(),
                password: passwordInput.value
            })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification("¡Cuenta creada exitosamente!", "success");
            const raw = data.user || data;
            const userPayload = {
                id: raw.id || raw._id,
                email: raw.email,
                name: raw.name,
                role: raw.role === "admin" ? "admin" : "user"
            };
            localStorage.setItem("usuario", JSON.stringify(userPayload));

            setTimeout(() => {
                window.location.href = "inicio.html";
            }, 1500);
        } else {
            showNotification(data.error || "Error al registrar usuario", "error");
        }
    } catch (error) {
        console.error("Error en registro:", error);
        showNotification("Error de conexión con el servidor. Verifica que el backend esté ejecutándose.", "error");
    } finally {
        submitBtn.textContent = "Crear Cuenta";
        submitBtn.disabled = false;
    }
}

// ==========================
// MODE SELECTION
// ==========================
function selectMode(mode) {
    let usuario;
    try {
        usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
    } catch (e) {
        usuario = {};
    }

    if (usuario.role !== "admin") {
        showNotification("No tenés permiso para acceder a esta pantalla.", "error");
        setTimeout(() => {
            window.location.href = "Index.html";
        }, 1200);
        return;
    }

    if (mode === "admin") {
        usuario.mode = "admin";
        localStorage.setItem("usuario", JSON.stringify(usuario));
        showNotification("Modo administrador", "success");
        setTimeout(() => {
            window.location.href = "admin-dashboard.html";
        }, 800);
        return;
    }

    usuario.mode = "user";
    localStorage.setItem("usuario", JSON.stringify(usuario));
    showNotification("Modo cliente", "success");
    setTimeout(() => {
        window.location.href = "inicio.html";
    }, 800);
}

// ==========================
// Verificar estado del backend
// ==========================
async function checkBackendStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (response.ok) {
            console.log("✅ Backend conectado correctamente");
            return true;
        }
    } catch (error) {
        console.error("❌ Backend no disponible:", error);
        showNotification('El servidor no está disponible. Ejecuta "npm run dev" en la carpeta backend.', "error");
        return false;
    }
}

// ==========================
// Página de inicio — carousel, búsqueda, navegación
// ==========================
function initHeroCarousel() {
    const slides = document.querySelectorAll(".carousel-slide");
    const dots = document.querySelectorAll(".dot");
    const prevBtn = document.querySelector(".carousel-prev");
    const nextBtn = document.querySelector(".carousel-next");

    if (!slides.length || !dots.length) return;

    let currentSlide = 0;
    let autoPlayInterval;

    function goToSlide(index) {
        slides.forEach((slide) => {
            slide.classList.remove("active", "prev");
        });
        dots.forEach((dot) => dot.classList.remove("active"));

        slides[index].classList.add("active");
        dots[index].classList.add("active");

        currentSlide = index;
    }

    function nextSlide() {
        const nextIndex = (currentSlide + 1) % slides.length;
        goToSlide(nextIndex);
    }

    function prevSlide() {
        const prevIndex = (currentSlide - 1 + slides.length) % slides.length;
        goToSlide(prevIndex);
    }

    dots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
            goToSlide(index);
            resetAutoPlay();
        });
    });

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            nextSlide();
            resetAutoPlay();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            prevSlide();
            resetAutoPlay();
        });
    }

    function startAutoPlay() {
        autoPlayInterval = setInterval(nextSlide, 5000);
    }

    function stopAutoPlay() {
        clearInterval(autoPlayInterval);
    }

    function resetAutoPlay() {
        stopAutoPlay();
        startAutoPlay();
    }

    startAutoPlay();

    const carousel = document.querySelector(".hero-banner");
    if (carousel) {
        carousel.addEventListener("mouseenter", stopAutoPlay);
        carousel.addEventListener("mouseleave", startAutoPlay);
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") prevSlide();
        if (e.key === "ArrowRight") nextSlide();
    });
}

function initSearch() {
    const searchInput = document.querySelector(".search-bar input");
    const searchIcon = document.querySelector(".search-bar i");

    if (!searchInput || !searchIcon) return;

    searchInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
            performSearch(this.value);
        }
    });

    searchIcon.addEventListener("click", function () {
        performSearch(searchInput.value);
    });

    function performSearch(query) {
        if (query.trim()) {
            console.log(`Searching for: ${query}`);
            showNotification(`Buscando: ${query}`, "info");
        }
    }
}

function initWishlist() {
    if (typeof favoritos !== "undefined" && favoritos) {
        return;
    }

    const wishlistIcons = document.querySelectorAll(".fa-heart:not([data-product-id])");

    wishlistIcons.forEach((icon) => {
        icon.addEventListener("click", function (e) {
            e.preventDefault();
            this.classList.toggle("active");

            if (this.classList.contains("active")) {
                this.style.color = "#ff0000";
                showNotification("Agregado a favoritos", "success");
            } else {
                this.style.color = "";
                showNotification("Removido de favoritos", "info");
            }
        });
    });
}

function initShoppingCart() {
    if (typeof carrito !== "undefined" && carrito) {
        return;
    }

    const cartIcons = document.querySelectorAll(".fa-shopping-cart");

    cartIcons.forEach((icon) => {
        icon.addEventListener("click", function (e) {
            e.preventDefault();
            showNotification("Producto agregado al carrito", "success");
        });
    });
}

function initProductQuickView() {
    const quickViewIcons = document.querySelectorAll(".fa-eye");

    quickViewIcons.forEach((icon) => {
        icon.addEventListener("click", function (e) {
            e.preventDefault();
            const productCard = this.closest(".product-card");
            const productName = productCard.querySelector("h3").textContent;
            showNotification(`Vista rápida: ${productName}`, "info");
        });
    });
}

function initAnimatedButtons() {
    const animatedButtons = document.querySelectorAll(".animated-button");

    animatedButtons.forEach((button) => {
        button.addEventListener("click", function (e) {
            e.preventDefault();

            const ripple = document.createElement("span");
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = size + "px";
            ripple.style.left = x + "px";
            ripple.style.top = y + "px";
            ripple.classList.add("ripple");

            this.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);

            const textEl = this.querySelector(".text");
            const buttonText = textEl ? textEl.textContent : "";

            if (buttonText.includes("Comprar Ahora")) {
                showNotification("Redirigiendo a compra...", "info");
            } else if (buttonText.includes("Ver Más Productos")) {
                showNotification("Redirigiendo a productos...", "info");
                setTimeout(() => {
                    window.location.href = "productos.html";
                }, 1000);
            }
        });
    });
}

function initSidebarNavigation() {
    const sidebarLinks = document.querySelectorAll(".menu .link");

    sidebarLinks.forEach((link) => {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            const category = this.querySelector(".link-title").textContent.trim();
            showNotification(`Categoría seleccionada: ${category}`, "info");
        });

        link.addEventListener("mouseenter", function () {
            const tooltip = this.querySelector(".link-title");
            const rect = this.getBoundingClientRect();
            tooltip.style.left = rect.right + 10 + "px";
            tooltip.style.top = rect.top + rect.height / 2 + "px";
            tooltip.style.transform = "translateY(-50%)";
            tooltip.style.zIndex = "99999";
        });

        link.addEventListener("mouseleave", function () {
            const tooltip = this.querySelector(".link-title");
            tooltip.style.zIndex = "99999";
        });
    });
}

/** No bloquear enlaces reales del header (ej. productos.html, contacto.html). */
function initMainNavigation() {
    const navLinks = document.querySelectorAll(".nav-links a");

    navLinks.forEach((link) => {
        link.addEventListener("click", function (e) {
            const href = (this.getAttribute("href") || "").trim();

            if (!href || href === "#") {
                e.preventDefault();
                const page = this.textContent.trim();
                showNotification(`Navegando a: ${page}`, "info");
                return;
            }

            navLinks.forEach((l) => l.classList.remove("active"));
            this.classList.add("active");
        });
    });
}

function initCreateAccountLink() {
    const createAccountLink =
        document.querySelector(".create-account-link") || document.querySelector(".create-account");

    if (!createAccountLink) return;

    createAccountLink.addEventListener("click", function (e) {
        e.preventDefault();
        this.style.transform = "scale(0.95)";
        setTimeout(() => {
            this.style.transform = "scale(1.05)";
        }, 100);
        window.location.href = "signup.html";
    });

    createAccountLink.addEventListener("mouseenter", function () {
        this.style.animationPlayState = "paused";
    });

    createAccountLink.addEventListener("mouseleave", function () {
        this.style.animationPlayState = "running";
    });
}

function initProductCardEffects() {
    const productCards = document.querySelectorAll(".product-card");

    productCards.forEach((card) => {
        card.addEventListener("mouseenter", function () {
            this.style.transform = "translateY(-5px)";
            this.style.boxShadow = "0 5px 15px rgba(0,0,0,0.1)";
        });

        card.addEventListener("mouseleave", function () {
            this.style.transform = "translateY(0)";
            this.style.boxShadow = "none";
        });
    });

    const newProductCards = document.querySelectorAll(".new-product-card");

    newProductCards.forEach((card) => {
        card.addEventListener("mouseenter", function () {
            this.style.transform = "scale(1.02)";
            this.style.transition = "transform 0.3s ease";
        });

        card.addEventListener("mouseleave", function () {
            this.style.transform = "scale(1)";
        });
    });
}

function initScrollEffects() {
    window.addEventListener("scroll", function () {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const header = document.querySelector("header");
        if (header && scrollTop > 50) {
            header.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
        } else if (header) {
            header.style.boxShadow = "none";
        }
    });
}

function addRippleStyles() {
    const style = document.createElement("style");
    style.textContent = `
        .ripple {
            position: absolute;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.3);
            transform: scale(0);
            animation: ripple-animation 0.6s linear;
            pointer-events: none;
        }
        @keyframes ripple-animation {
            to { transform: scale(4); opacity: 0; }
        }
        .fa-heart.active { color: #ff0000 !important; }
    `;
    document.head.appendChild(style);
}

// ==========================
// Inicialización
// ==========================
document.addEventListener("DOMContentLoaded", async () => {
    await redirectIfAlreadyLoggedIn();
    await checkBackendStatus();

    const loginForm = document.querySelector("#login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            handleLogin();
        });
    }

    const signupForm = document.querySelector("#signup-form");
    if (signupForm) {
        signupForm.addEventListener("submit", (e) => {
            e.preventDefault();
            handleSignup();
        });
    }

    initHeroCarousel();
    initSearch();
    initWishlist();
    initShoppingCart();
    initProductQuickView();
    initAnimatedButtons();
    initSidebarNavigation();
    initMainNavigation();
    initCreateAccountLink();
    initProductCardEffects();
    initScrollEffects();
    addRippleStyles();

    console.log("E-commerce website initialized successfully!");
});
