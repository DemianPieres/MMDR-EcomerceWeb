// Panel de Administrador - Funcionalidad JavaScript con Base de Datos
function initAdminPanelDeferred() {
    // Configuración de la API
    const API_BASE_URL =
        typeof window.MMDR_API_BASE === 'string' && window.MMDR_API_BASE
            ? window.MMDR_API_BASE
            : window.location && window.location.hostname
              ? `http://${window.location.hostname}:4000`
              : 'http://localhost:4000';
    
    // Variables globales
    let currentSection = 'inicio';
    let users = [];
    let products = [];
    let sales = [];
    let currentPage = 1;
    let itemsPerPage = 10;
    let currentProductFilter = 'all';
    let editingProductId = null;
    let dashboardStats = null;
    let supportTickets = [];
    let currentTicketDetailId = null;

    // Inicializar la aplicación
    initializeApp();

    async function initializeApp() {
        await loadUsers();
        await loadProducts();
        setupNavigation();
        setupPasswordToggle();
        setupTableActions();
        setupSearchFunctionality();
        setupPagination();
        setupModals();
        setupAnimations();
        updateDashboardStats();
        setupLogout();
        setupProductManagement();
    }

    // Cargar usuarios desde la base de datos
    async function loadUsers() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                users = data.users || [];
                renderUsersTable();
                updateDashboardStats();
                showNotification('Usuarios cargados exitosamente', 'success');
            } else {
                console.error('Error al cargar usuarios:', response.statusText);
                showNotification('Error al cargar usuarios', 'error');
                // Mostrar tabla vacía si falla la conexión
                users = [];
                renderUsersTable();
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            showNotification('Error de conexión con el servidor', 'error');
            // Mostrar tabla vacía si falla la conexión
            users = [];
            renderUsersTable();
        }
    }


    // Renderizar tabla de usuarios
    function renderUsersTable() {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        const filteredUsers = filterUsers(users);
        const paginatedUsers = paginateUsers(filteredUsers);
        
        tbody.innerHTML = '';
        
        if (paginatedUsers.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="3" style="text-align: center; padding: 2rem; color: #666;">
                    ${users.length === 0 ? 'No hay usuarios registrados' : 'No se encontraron usuarios'}
                </td>
            `;
            tbody.appendChild(row);
        } else {
            paginatedUsers.forEach((user, index) => {
                const row = createUserRow(user, index);
                tbody.appendChild(row);
            });
        }

        renderPagination(filteredUsers.length, 'users');
    }

    // Crear fila de usuario
    function createUserRow(user, index) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td class="admin-actions">
                <button class="admin-action-btn edit" data-user-id="${user._id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="admin-action-btn delete" data-user-id="${user._id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        return row;
    }


    // Filtrar usuarios
    function filterUsers(users) {
        return users; // Ya no hay filtros por rol
    }

    // Paginar usuarios
    function paginateUsers(users) {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return users.slice(startIndex, endIndex);
    }

    // Renderizar paginación
    function renderPagination(totalItems, type) {
        const paginationContainer = document.getElementById(`${type}-pagination`);
        if (!paginationContainer) return;

        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '<div class="admin-pagination-info">No hay páginas adicionales</div>';
            return;
        }

        let paginationHTML = '';

        // Información de página actual
        paginationHTML += `
            <div class="admin-pagination-info">
                Página <strong>${currentPage}</strong> de <strong>${totalPages}</strong> 
                (<strong>${totalItems}</strong> ${type === 'users' ? 'usuarios' : 'productos'} totales)
            </div>
        `;

        paginationHTML += '<div class="admin-pagination-buttons">';

        // Botón anterior
        paginationHTML += `
            <button class="admin-page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}" title="Página anterior">
                <i class="fas fa-angle-left"></i>
            </button>
        `;

        // Mostrar páginas con lógica inteligente
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        // Asegurarse de que siempre se muestren 5 páginas si es posible
        if (endPage - startPage < 4) {
            if (startPage === 1) {
                endPage = Math.min(totalPages, startPage + 4);
            } else if (endPage === totalPages) {
                startPage = Math.max(1, endPage - 4);
            }
        }

        // Primera página
        if (startPage > 1) {
            paginationHTML += `
                <button class="admin-page-btn" data-page="1">1</button>
            `;
            if (startPage > 2) {
                paginationHTML += `<span class="admin-page-ellipsis">...</span>`;
            }
        }

        // Páginas alrededor de la actual
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="admin-page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>
            `;
        }

        // Última página
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="admin-page-ellipsis">...</span>`;
            }
            paginationHTML += `
                <button class="admin-page-btn" data-page="${totalPages}">${totalPages}</button>
            `;
        }

        // Botón siguiente
        paginationHTML += `
            <button class="admin-page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}" title="Página siguiente">
                <i class="fas fa-angle-right"></i>
            </button>
        `;

        paginationHTML += '</div>';

        paginationContainer.innerHTML = paginationHTML;

        // Event listeners para paginación
        paginationContainer.querySelectorAll('.admin-page-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (this.hasAttribute('disabled')) return;
                const page = parseInt(this.dataset.page);
                if (page >= 1 && page <= totalPages && page !== currentPage) {
                    currentPage = page;
                    // Resetear a página 1 cuando cambias de sección
                    if (type === 'users') {
                        renderUsersTable();
                    } else if (type === 'products') {
                        renderProductsTable();
                    }
                }
            });
        });
    }

    // Navegación entre secciones
    function setupNavigation() {
        const sidebarLinks = document.querySelectorAll('.admin-sidebar-link');
        const contentSections = document.querySelectorAll('.admin-content-section');

        sidebarLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetSection = this.getAttribute('data-section');
                
                // Remover clase active de todos los enlaces
                sidebarLinks.forEach(l => l.classList.remove('active'));
                // Agregar clase active al enlace clickeado
                this.classList.add('active');
                
                // Ocultar todas las secciones
                contentSections.forEach(section => {
                    section.classList.remove('active');
                });
                
                // Mostrar la sección seleccionada
                const targetElement = document.getElementById(`${targetSection}-section`);
                if (targetElement) {
                    targetElement.classList.add('active');
                    currentSection = targetSection;
                    // Resetear a página 1 cuando cambias de sección
                    currentPage = 1;
                    updatePageTitle(targetSection);
                    
                    // Actualizar tabla correspondiente
                    if (targetSection === 'usuarios') {
                        renderUsersTable();
                    } else if (targetSection === 'productos') {
                        renderProductsTable();
                    } else if (targetSection === 'tickets') {
                        loadSupportTickets();
                    }
                }
            });
        });
    }

    function updatePageTitle(section) {
        const titles = {
            'inicio': 'Dashboard - MMDR E-COMMERCE',
            'usuarios': 'Gestión de Usuarios - MMDR E-COMMERCE',
            'tickets': 'Gestión de tickets - MMDR E-COMMERCE',
            'productos': 'Gestión de Productos - MMDR E-COMMERCE',
            'insumos': 'Administrar Insumos - MMDR E-COMMERCE',
            'paginas': 'Gestión de Páginas - MMDR E-COMMERCE',
            'graficos': 'Gráficos y Estadísticas - MMDR E-COMMERCE'
        };
        
        document.title = titles[section] || 'Panel de Administrador - MMDR E-COMMERCE';
    }

    // Toggle de visibilidad de contraseñas - ELIMINADO
    function setupPasswordToggle() {
        // Función eliminada - ya no se muestran contraseñas
    }

    // Acciones de la tabla (editar, eliminar)
    function setupTableActions() {
        document.addEventListener('click', function(e) {
            if (e.target.closest('.admin-action-btn.edit')) {
                const userId = e.target.closest('.admin-action-btn').dataset.userId;
                const user = users.find(u => u._id === userId);
                if (user) {
                    showEditUserModal(user);
                }
            }

            if (e.target.closest('.admin-action-btn.delete')) {
                const userId = e.target.closest('.admin-action-btn').dataset.userId;
                const user = users.find(u => u._id === userId);
                if (user) {
                    showDeleteUserConfirm(user);
                }
            }
        });
    }

    // Mostrar modal de edición de usuario
    function showEditUserModal(user) {
        const modal = createModal('Editar Usuario', `
            <div class="admin-form-group">
                <label>Nombre:</label>
                <input type="text" id="edit-name" value="${user.name}" class="admin-form-input">
            </div>
            <div class="admin-form-group">
                <label>Email:</label>
                <input type="email" id="edit-email" value="${user.email}" class="admin-form-input">
            </div>
        `);
        
        const saveBtn = modal.querySelector('.save-btn');
        saveBtn.addEventListener('click', function() {
            saveUserChanges(user._id, modal);
        });
        
        document.body.appendChild(modal);
        showModal(modal);
    }

    // Guardar cambios de usuario
    async function saveUserChanges(userId, modal) {
        const name = modal.querySelector('#edit-name').value;
        const email = modal.querySelector('#edit-email').value;

        if (!name || !email) {
            showNotification('Por favor, complete todos los campos obligatorios', 'error');
            return;
        }

        try {
            const updateData = {
                name: name.trim(),
                email: email.toLowerCase().trim()
            };

            const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                },
                credentials: 'include',
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                const result = await response.json();
                // Actualizar usuario en la lista local
                const userIndex = users.findIndex(u => u._id === userId);
                if (userIndex !== -1) {
                    users[userIndex] = { ...users[userIndex], ...updateData };
                }
                
                showNotification('Usuario actualizado exitosamente', 'success');
                hideModal(modal);
                renderUsersTable();
                updateDashboardStats();
            } else {
                const error = await response.json();
                showNotification(error.message || 'Error al actualizar usuario', 'error');
            }
        } catch (error) {
            console.error('Error al actualizar usuario:', error);
            showNotification('Error de conexión al actualizar usuario', 'error');
        }
    }

    // Mostrar confirmación de eliminación
    function showDeleteUserConfirm(user) {
        const modal = createModal('Confirmar Eliminación', `
            <div class="admin-delete-confirm">
                <i class="fas fa-exclamation-triangle"></i>
                <p>¿Estás seguro de que deseas eliminar al usuario <strong>${user.name}</strong>?</p>
                <p class="admin-warning-text">Esta acción no se puede deshacer.</p>
            </div>
        `);
        
        const confirmBtn = modal.querySelector('.confirm-btn');
        confirmBtn.addEventListener('click', function() {
            deleteUser(user._id);
            hideModal(modal);
        });
        
        document.body.appendChild(modal);
        showModal(modal);
    }

    // Eliminar usuario
    async function deleteUser(userId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                },
                credentials: 'include'
            });

            if (response.ok) {
                // Remover usuario de la lista local
                users = users.filter(u => u._id !== userId);
                
                showNotification('Usuario eliminado exitosamente', 'success');
                renderUsersTable();
                updateDashboardStats();
            } else {
                const error = await response.json();
                showNotification(error.message || 'Error al eliminar usuario', 'error');
            }
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            showNotification('Error de conexión al eliminar usuario', 'error');
        }
    }

    // Funcionalidad de búsqueda
    function setupSearchFunctionality() {
        const searchInput = document.getElementById('user-search');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                const filteredUsers = users.filter(user => 
                    user.name.toLowerCase().includes(searchTerm) ||
                    user.email.toLowerCase().includes(searchTerm)
                );
                
                // Actualizar la tabla con usuarios filtrados
                renderFilteredUsers(filteredUsers);
            });
        }

        // Filtro por rol - ELIMINADO
        const roleFilter = document.getElementById('role-filter');
        if (roleFilter) {
            // Ya no hay filtro por rol
        }
    }

    // Mostrar dropdown de filtro por rol - ELIMINADO
    function showRoleFilterDropdown() {
        // Función eliminada - ya no hay filtros por rol
    }

    // Renderizar usuarios filtrados
    function renderFilteredUsers(filteredUsers) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        if (filteredUsers.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="3" style="text-align: center; padding: 2rem; color: #666;">
                    No se encontraron usuarios que coincidan con la búsqueda
                </td>
            `;
            tbody.appendChild(row);
        } else {
            filteredUsers.forEach((user, index) => {
                const row = createUserRow(user, index);
                tbody.appendChild(row);
            });
        }
    }

    // Paginación
    function setupPagination() {
        // La paginación se maneja en renderPagination()
    }

    // Configurar modales
    function setupModals() {
        // Los estilos de modales ya están en el CSS
    }

    // Configurar animaciones
    function setupAnimations() {
        // Animación de entrada para las filas de la tabla
        const tableRows = document.querySelectorAll('.data-table tbody tr');
        tableRows.forEach((row, index) => {
            row.style.opacity = '0';
            row.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                row.style.transition = 'all 0.3s ease';
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }

    // Actualizar estadísticas del dashboard
    function updateDashboardStats() {
        const totalUsersElement = document.getElementById('total-users');
        if (totalUsersElement) {
            totalUsersElement.textContent = users.length;
        }
    }

    // Configurar logout
    function setupLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        }
    }

    // Función de logout
    async function logout() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            // Limpiar datos locales
            localStorage.removeItem('usuario');
            localStorage.removeItem('token');
            
            showNotification('Sesión cerrada exitosamente', 'success');
            
            // Redirigir al login
            setTimeout(() => {
                window.location.href = 'Index.html';
            }, 1500);
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            // Redirigir de todas formas
            localStorage.clear();
            window.location.href = 'Index.html';
        }
    }

    // Funciones auxiliares para modales
    function createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'admin-modal-overlay';
        modal.innerHTML = `
            <div class="admin-modal">
                <div class="admin-modal-header">
                    <h3>${title}</h3>
                    <button class="admin-close-btn">&times;</button>
                </div>
                <div class="admin-modal-body">
                    ${content}
                </div>
                <div class="admin-modal-footer">
                    <button class="admin-btn admin-btn-secondary cancel-btn">Cancelar</button>
                    <button class="admin-btn admin-btn-primary ${title === 'Confirmar Eliminación' ? 'confirm-btn' : 'save-btn'}">
                        ${title === 'Confirmar Eliminación' ? 'Eliminar' : 'Guardar'}
                    </button>
                </div>
            </div>
        `;
        
        // Event listeners para cerrar modal
        modal.querySelector('.admin-close-btn').addEventListener('click', () => hideModal(modal));
        modal.querySelector('.cancel-btn').addEventListener('click', () => hideModal(modal));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideModal(modal);
        });
        
        return modal;
    }

    function showModal(modal) {
        modal.style.display = 'flex';
        // Forzar reflow para asegurar que el display se aplique antes de la animación
        modal.offsetHeight;
        modal.classList.add('show');
    }

    function hideModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        }, 300);
    }

    // Sistema de notificaciones
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `admin-notification admin-notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    function getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // ===== FUNCIONALIDAD DE PRODUCTOS =====

    // Cargar productos desde la base de datos
    async function loadProducts() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/products?limit=100`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                products = data.data || [];
                renderProductsTable();
                updateProductStats();
                showNotification('Productos cargados exitosamente', 'success');
            } else {
                console.error('Error al cargar productos:', response.statusText);
                showNotification('Error al cargar productos', 'error');
                loadSampleProducts();
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            showNotification('Error de conexión con el servidor', 'error');
            loadSampleProducts();
        }
    }

    // Cargar productos de ejemplo si falla la conexión
    function loadSampleProducts() {
        products = [
            {
                _id: '1',
                name: 'Cubre Asientos Universal',
                description: 'Cubre asientos universal de alta calidad',
                price: 25000,
                originalPrice: 36000,
                category: 'asientos',
                stock: 15,
                image: 'Imagenes/cubreasientosuniversal.webp',
                discount: 31,
                isActive: true,
                createdAt: new Date().toISOString()
            },
            {
                _id: '2',
                name: 'Cubre Volante Universal',
                description: 'Cubre volante universal de cuero sintético',
                price: 16000,
                originalPrice: 18800,
                category: 'volantes',
                stock: 8,
                image: 'Imagenes/cubrevolanteuniversal.webp',
                discount: 15,
                isActive: true,
                createdAt: new Date().toISOString()
            }
        ];
        renderProductsTable();
        updateProductStats();
    }

    // Configurar gestión de productos
    function setupProductManagement() {
        // Botón agregar producto
        const addProductBtn = document.getElementById('add-product-btn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', function() {
                showProductModal();
            });
        }

        // Búsqueda de productos
        const productSearch = document.getElementById('product-search');
        if (productSearch) {
            productSearch.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                const filteredProducts = products.filter(product => 
                    product.name.toLowerCase().includes(searchTerm) ||
                    product.description.toLowerCase().includes(searchTerm) ||
                    product.category.toLowerCase().includes(searchTerm)
                );
                renderFilteredProducts(filteredProducts);
            });
        }

        // Filtro por categoría
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('click', function() {
                showCategoryFilterDropdown();
            });
        }

        // Modal de productos
        setupProductModal();
    }

    // Configurar modal de productos
    function setupProductModal() {
        const modal = document.getElementById('product-modal');
        const closeBtn = document.getElementById('close-product-modal');
        const cancelBtn = document.getElementById('cancel-product');
        const form = document.getElementById('product-form');

        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                hideProductModal();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                hideProductModal();
            });
        }

        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    hideProductModal();
                }
            });
        }

        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                saveProduct();
            });
        }
    }

    // Mostrar modal de producto
    function showProductModal(product = null) {
        const modal = document.getElementById('product-modal');
        const title = document.getElementById('product-modal-title');
        const form = document.getElementById('product-form');

        if (product) {
            // Modo edición
            editingProductId = product._id;
            title.textContent = 'Editar Producto';
            
            // Llenar formulario con datos del producto
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-description').value = product.description;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-original-price').value = product.originalPrice || '';
            document.getElementById('product-category').value = product.category;
            document.getElementById('product-stock').value = product.stock;
            document.getElementById('product-discount').value = product.discount || '';
            document.getElementById('product-image').value = product.image;
            document.getElementById('product-tags').value = product.tags ? product.tags.join(', ') : '';
            document.getElementById('product-featured').checked = product.featured || false;
        } else {
            // Modo creación
            editingProductId = null;
            title.textContent = 'Agregar Producto';
            form.reset();
        }

        modal.classList.add('show');
    }

    // Ocultar modal de producto
    function hideProductModal() {
        const modal = document.getElementById('product-modal');
        modal.classList.remove('show');
        editingProductId = null;
    }

    // Guardar producto
    async function saveProduct() {
        const form = document.getElementById('product-form');
        const formData = new FormData(form);
        
        const productData = {
            name: formData.get('name').trim(),
            description: formData.get('description').trim(),
            price: parseFloat(formData.get('price')),
            originalPrice: formData.get('originalPrice') ? parseFloat(formData.get('originalPrice')) : null,
            category: formData.get('category'),
            stock: parseInt(formData.get('stock')),
            discount: formData.get('discount') ? parseInt(formData.get('discount')) : 0,
            image: formData.get('image').trim(),
            tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            featured: formData.get('featured') === 'on'
        };

        // Validaciones
        if (!productData.name || !productData.description || !productData.price || !productData.category || !productData.image) {
            showNotification('Por favor, complete todos los campos obligatorios', 'error');
            return;
        }

        try {
            const url = editingProductId 
                ? `${API_BASE_URL}/api/products/${editingProductId}`
                : `${API_BASE_URL}/api/products`;
            
            const method = editingProductId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(productData)
            });

            if (response.ok) {
                const result = await response.json();
                
                if (editingProductId) {
                    // Actualizar producto existente
                    const productIndex = products.findIndex(p => p._id === editingProductId);
                    if (productIndex !== -1) {
                        products[productIndex] = result.data;
                    }
                    showNotification('Producto actualizado exitosamente', 'success');
                } else {
                    // Agregar nuevo producto
                    products.push(result.data);
                    showNotification('Producto creado exitosamente', 'success');
                }

                hideProductModal();
                renderProductsTable();
                updateProductStats();
            } else {
                const error = await response.json();
                showNotification(error.message || 'Error al guardar producto', 'error');
            }
        } catch (error) {
            console.error('Error al guardar producto:', error);
            showNotification('Error de conexión al guardar producto', 'error');
        }
    }

    // Renderizar tabla de productos
    function renderProductsTable() {
        const tbody = document.getElementById('products-table-body');
        if (!tbody) return;

        const filteredProducts = filterProducts(products);
        
        tbody.innerHTML = '';
        
        if (filteredProducts.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
                    ${products.length === 0 ? 'No hay productos registrados' : 'No se encontraron productos'}
                </td>
            `;
            tbody.appendChild(row);
        } else {
            filteredProducts.forEach((product) => {
                const row = createProductRow(product);
                tbody.appendChild(row);
            });
        }

        // Mostrar información de productos sin paginación
        const paginationContainer = document.getElementById('products-pagination');
        if (paginationContainer) {
            paginationContainer.innerHTML = `
                <div class="admin-pagination-info">
                    Mostrando <strong>${filteredProducts.length}</strong> de <strong>${products.length}</strong> productos totales
                </div>
            `;
        }
    }

    // Crear fila de producto
    function createProductRow(product) {
        const row = document.createElement('tr');
        const discountBadge = product.discount > 0 ? `<span class="discount-badge">-${product.discount}%</span>` : '';
        
        row.innerHTML = `
            <td>
                <div class="product-name-cell">
                    <strong>${product.name}</strong>
                    ${discountBadge}
                </div>
            </td>
            <td>$${product.price.toLocaleString()}</td>
            <td>${product.stock}</td>
            <td><span class="category-badge ${product.category}">${getCategoryDisplayName(product.category)}</span></td>
            <td><span class="admin-status-badge ${product.isActive ? 'active' : 'inactive'}">${product.isActive ? 'Activo' : 'Inactivo'}</span></td>
            <td>
                <img src="${product.image}" alt="${product.name}" class="product-thumbnail" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
            </td>
            <td class="admin-actions">
                <button class="admin-action-btn edit" data-product-id="${product._id}" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="admin-action-btn delete" data-product-id="${product._id}" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        // Event listeners para acciones
        const editBtn = row.querySelector('.admin-action-btn.edit');
        const deleteBtn = row.querySelector('.admin-action-btn.delete');

        editBtn.addEventListener('click', function() {
            const productId = this.dataset.productId;
            const product = products.find(p => p._id === productId);
            if (product) {
                showProductModal(product);
            }
        });

        deleteBtn.addEventListener('click', function() {
            const productId = this.dataset.productId;
            const product = products.find(p => p._id === productId);
            if (product) {
                showDeleteProductConfirm(product);
            }
        });

        return row;
    }

    // Obtener nombre de categoría para mostrar
    function getCategoryDisplayName(category) {
        const categoryNames = {
            'asientos': 'Asientos',
            'volantes': 'Volantes',
            'electronica': 'Electrónica',
            'suspension': 'Suspensión',
            'accesorios': 'Accesorios',
            'otros': 'Otros'
        };
        return categoryNames[category] || category;
    }

    // Filtrar productos
    function filterProducts(products) {
        if (currentProductFilter === 'all') return products;
        return products.filter(product => product.category === currentProductFilter);
    }

    // Paginar productos
    function paginateProducts(products) {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return products.slice(startIndex, endIndex);
    }

    // Renderizar productos filtrados
    function renderFilteredProducts(filteredProducts) {
        const tbody = document.getElementById('products-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        if (filteredProducts.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
                    No se encontraron productos que coincidan con la búsqueda
                </td>
            `;
            tbody.appendChild(row);
        } else {
            filteredProducts.forEach((product) => {
                const row = createProductRow(product);
                tbody.appendChild(row);
            });
        }

        // Mostrar información de productos filtrados
        const paginationContainer = document.getElementById('products-pagination');
        if (paginationContainer) {
            paginationContainer.innerHTML = `
                <div class="admin-pagination-info">
                    Mostrando <strong>${filteredProducts.length}</strong> productos filtrados de <strong>${products.length}</strong> totales
                </div>
            `;
        }
    }

    // Mostrar dropdown de filtro por categoría
    function showCategoryFilterDropdown() {
        const dropdown = document.createElement('div');
        dropdown.className = 'filter-dropdown-menu';
        dropdown.innerHTML = `
            <div class="filter-option" data-category="all">Todas las categorías</div>
            <div class="filter-option" data-category="asientos">Asientos</div>
            <div class="filter-option" data-category="volantes">Volantes</div>
            <div class="filter-option" data-category="electronica">Electrónica</div>
            <div class="filter-option" data-category="suspension">Suspensión</div>
            <div class="filter-option" data-category="accesorios">Accesorios</div>
            <div class="filter-option" data-category="otros">Otros</div>
        `;

        // Estilos para el dropdown
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            margin-top: 4px;
        `;

        const filterBtn = document.getElementById('category-filter');
        filterBtn.parentNode.style.position = 'relative';
        filterBtn.parentNode.appendChild(dropdown);

        // Event listeners para opciones
        dropdown.querySelectorAll('.filter-option').forEach(option => {
            option.addEventListener('click', function() {
                const category = this.dataset.category;
                currentProductFilter = category;
                filterBtn.querySelector('span').textContent = this.textContent;
                renderProductsTable();
                dropdown.remove();
            });
        });

        // Cerrar dropdown al hacer click fuera
        document.addEventListener('click', function(e) {
            if (!filterBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.remove();
            }
        });
    }

    // Mostrar confirmación de eliminación de producto
    function showDeleteProductConfirm(product) {
        const modal = createModal('Confirmar Eliminación', `
            <div class="admin-delete-confirm">
                <i class="fas fa-exclamation-triangle"></i>
                <p>¿Estás seguro de que deseas eliminar el producto <strong>${product.name}</strong>?</p>
                <p class="admin-warning-text">Esta acción no se puede deshacer.</p>
            </div>
        `);
        
        const confirmBtn = modal.querySelector('.confirm-btn');
        confirmBtn.addEventListener('click', function() {
            deleteProduct(product._id);
            hideModal(modal);
        });
        
        document.body.appendChild(modal);
        showModal(modal);
    }

    // Eliminar producto
    async function deleteProduct(productId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (response.ok) {
                // Remover producto de la lista local
                products = products.filter(p => p._id !== productId);
                
                showNotification('Producto eliminado exitosamente', 'success');
                renderProductsTable();
                updateProductStats();
            } else {
                const error = await response.json();
                showNotification(error.message || 'Error al eliminar producto', 'error');
            }
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            showNotification('Error de conexión al eliminar producto', 'error');
        }
    }

    // Actualizar estadísticas de productos
    function updateProductStats() {
        // Actualizar contador de productos en el dashboard
        const productStatsElement = document.querySelector('.admin-stat-card:nth-child(2) .admin-stat-number');
        if (productStatsElement) {
            productStatsElement.textContent = products.length;
        }
    }

    // Mostrar notificación de bienvenida
    setTimeout(() => {
        showNotification('¡Bienvenido al Panel de Administración!', 'success');
    }, 1000);

    // ===== FUNCIONES DE ANALYTICS Y VENTAS =====
    
    // Cargar estadísticas del dashboard
    async function loadDashboardStats(year = null) {
        try {
            // Calcular fechas para el año especificado o el año actual
            const now = new Date();
            const targetYear = year || now.getFullYear();
            const fechaInicio = new Date(targetYear, 0, 1).toISOString();
            const fechaFin = new Date(targetYear, 11, 31, 23, 59, 59).toISOString();

            // Calcular fechas para las últimas 8 semanas
            const fechaInicioSemanas = new Date(now);
            fechaInicioSemanas.setDate(fechaInicioSemanas.getDate() - 56); // 8 semanas = 56 días

            // Calcular fechas para ingresos diarios (últimas 2 semanas)
            const fechaInicioIngresos = new Date(now);
            fechaInicioIngresos.setDate(fechaInicioIngresos.getDate() - 14);
            const fechaFinIngresos = now.toISOString();

            // Cargar datos reales de la API
            const [statsResponse, productsResponse, usersResponse, ventasMensualesResponse, ingresosDiariosResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/api/sales/analytics/dashboard`, {
                    method: 'GET',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                    },
                    credentials: 'include'
                }),
                fetch(`${API_BASE_URL}/api/sales/analytics/productos-mas-vendidos?limite=6`, {
                    method: 'GET',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                    },
                    credentials: 'include'
                }),
                fetch(`${API_BASE_URL}/api/admin/users`, {
                    method: 'GET',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                    },
                    credentials: 'include'
                }),
                fetch(`${API_BASE_URL}/api/sales/analytics/ventas-por-periodo?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&agrupacion=mes`, {
                    method: 'GET',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                    },
                    credentials: 'include'
                }),
                fetch(`${API_BASE_URL}/api/sales/analytics/ventas-por-periodo?fechaInicio=${fechaInicioIngresos.toISOString()}&fechaFin=${fechaFinIngresos}&agrupacion=dia`, {
                    method: 'GET',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                    },
                    credentials: 'include'
                })
            ]);

            if (statsResponse.ok && productsResponse.ok && usersResponse.ok) {
                const statsData = await statsResponse.json();
                const productsData = await productsResponse.json();
                const usersData = await usersResponse.json();
                
                let ventasMensualesData = [];
                if (ventasMensualesResponse.ok) {
                    const ventasData = await ventasMensualesResponse.json();
                    ventasMensualesData = ventasData.data || [];
                }

                let ingresosDiariosData = [];
                if (ingresosDiariosResponse.ok) {
                    const ingresosData = await ingresosDiariosResponse.json();
                    ingresosDiariosData = ingresosData.data || [];
                }
                
                dashboardStats = statsData.data;
                const processedData = processRealData(statsData.data, productsData.data, usersData.users || [], ventasMensualesData, ingresosDiariosData, targetYear);
                
                // Guardar datos por año
                chartDataByYear[targetYear] = processedData;
                
                // Si es el año actual, también actualizar chartData
                if (targetYear === now.getFullYear()) {
                    chartData = processedData;
                }
                
                console.log(`📊 Datos reales cargados para ${targetYear}:`, processedData);
            } else {
                throw new Error('Error al cargar datos');
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            chartData = null; // Usar datos de ejemplo
        }
    }

    // Procesar datos reales de la API
    function processRealData(stats, topProducts, users, ventasMensualesData = [], ingresosDiariosData = [], targetYear = null) {
        const now = new Date();
        const currentYear = targetYear || now.getFullYear();
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        // Procesar productos más vendidos
        const productosData = {
            labels: [],
            data: []
        };

        if (topProducts && topProducts.length > 0) {
            topProducts.forEach(producto => {
                productosData.labels.push(producto._id.nombre || 'Producto Desconocido');
                productosData.data.push(producto.cantidadVendida || 0);
            });
        } else {
            productosData.labels = ['Sin datos'];
            productosData.data = [1];
        }

        // Procesar usuarios activos con datos REALES
        const semanas = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5', 'Semana 6', 'Semana 7', 'Semana 8'];
        const usuariosData = [];
        
        if (users && users.length > 0) {
            // Agrupar usuarios por semana de registro
            for (let i = 7; i >= 0; i--) {
                const fechaInicioSemana = new Date(now);
                fechaInicioSemana.setDate(fechaInicioSemana.getDate() - ((i + 1) * 7));
                fechaInicioSemana.setHours(0, 0, 0, 0);
                
                const fechaFinSemana = new Date(now);
                fechaFinSemana.setDate(fechaFinSemana.getDate() - (i * 7));
                fechaFinSemana.setHours(23, 59, 59, 999);
                
                // Contar usuarios registrados en esta semana
                const usuariosEnSemana = users.filter(user => {
                    const fechaCreacion = new Date(user.createdAt);
                    return fechaCreacion >= fechaInicioSemana && fechaCreacion <= fechaFinSemana;
                }).length;
                
                usuariosData.push(usuariosEnSemana);
            }
        } else {
            // Si no hay usuarios, mostrar 0
            usuariosData.fill(0, 0, 8);
        }

        // Procesar datos de ventas por mes
        const ingresosPorMes = new Array(12).fill(0);
        
        if (ventasMensualesData && ventasMensualesData.length > 0) {
            ventasMensualesData.forEach(item => {
                // El formato viene como 'YYYY-MM'
                const [year, month] = item._id.split('-');
                const yearNum = parseInt(year);
                const mesIndex = parseInt(month) - 1;
                // Solo procesar si el año coincide con el año objetivo
                if (yearNum === currentYear && mesIndex >= 0 && mesIndex < 12) {
                    ingresosPorMes[mesIndex] = item.ingresos || 0;
                }
            });
        }

        // Procesar datos de ingresos diarios (últimas 2 semanas)
        const ingresosDiarios = {
            labels: [],
            data: []
        };

        if (ingresosDiariosData && ingresosDiariosData.length > 0) {
            ingresosDiariosData.forEach(item => {
                // El formato viene como 'YYYY-MM-DD'. Evitar desfase por zona horaria
                // Parsear como fecha local en lugar de Date(string) (que asume UTC)
                let fecha;
                if (typeof item._id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item._id)) {
                    const [yearStr, monthStr, dayStr] = item._id.split('-');
                    const year = parseInt(yearStr, 10);
                    const month = parseInt(monthStr, 10) - 1; // 0-index
                    const day = parseInt(dayStr, 10);
                    fecha = new Date(year, month, day);
                } else {
                    // Fallback seguro si viene con tiempo incluido
                    fecha = new Date(item._id);
                }
                const fechaFormateada = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
                ingresosDiarios.labels.push(fechaFormateada);
                ingresosDiarios.data.push(item.ingresos || 0);
            });
        } else {
            // Si no hay datos, crear estructura vacía para evitar errores
            ingresosDiarios.labels = [];
            ingresosDiarios.data = [];
        }
        
        return {
            salesByMonth: {
                labels: meses,
                data: ingresosPorMes
            },
            topProducts: productosData,
            activeUsers: {
                labels: semanas,
                data: usuariosData
            },
            dailyRevenue: ingresosDiarios,
            stats: {
                totalSales: stats?.mes?.totalVentas || 0,
                totalRevenue: stats?.mes?.ingresosCompletados || 0,
                avgSale: stats?.mes?.promedioVenta || 0,
                conversionRate: 3.8
            }
        };
    }

    // Actualizar estadísticas del dashboard
    function updateDashboardStats() {
        if (!dashboardStats) return;

        // Actualizar contador de usuarios
        const totalUsersEl = document.getElementById('total-users');
        if (totalUsersEl) {
            totalUsersEl.textContent = users.length;
        }

        // Actualizar estadísticas de ventas
        const salesStats = dashboardStats.mes || {};
        const salesCards = document.querySelectorAll('.admin-stat-card');
        
        salesCards.forEach(card => {
            const title = card.querySelector('h3');
            if (title) {
                switch (title.textContent) {
                    case 'Ventas':
                        const salesValue = card.querySelector('.admin-stat-number');
                        if (salesValue) {
                            salesValue.textContent = `$${formatNumber(salesStats.ingresosCompletados || 0)}`;
                        }
                        break;
                    case 'Crecimiento':
                        const growthValue = card.querySelector('.admin-stat-number');
                        if (growthValue) {
                            const growth = calculateGrowthRate(dashboardStats);
                            growthValue.textContent = `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`;
                        }
                        break;
                }
            }
        });
    }

    // Calcular tasa de crecimiento
    function calculateGrowthRate(stats) {
        if (!stats.semana || !stats.mes) return 0;
        
        const weeklyAvg = stats.semana.ingresosCompletados / 7;
        const monthlyAvg = stats.mes.ingresosCompletados / 30;
        
        if (monthlyAvg === 0) return 0;
        
        return ((weeklyAvg - monthlyAvg) / monthlyAvg) * 100;
    }

    // Renderizar gráficos de analytics
    function renderAnalyticsCharts() {
        if (!dashboardStats) return;

        // Renderizar gráfico de productos más vendidos
        renderTopProductsChart();
        
        // Renderizar gráfico de ventas por día
        renderSalesByDayChart();
        
        // Renderizar gráfico de métodos de pago
        renderPaymentMethodsChart();
    }

    // Gráfico de productos más vendidos
    function renderTopProductsChart() {
        const topProducts = dashboardStats.productosMasVendidos || [];
        const container = document.getElementById('top-products-chart');
        
        if (!container || topProducts.length === 0) return;

        const chartData = topProducts.slice(0, 5).map(product => ({
            name: product._id.nombre,
            value: product.cantidadVendida
        }));

        container.innerHTML = `
            <div class="chart-container">
                <h4>Productos Más Vendidos</h4>
                <div class="chart-bars">
                    ${chartData.map((item, index) => `
                        <div class="chart-bar-item">
                            <div class="bar-label">${item.name}</div>
                            <div class="bar-container">
                                <div class="bar-fill" style="width: ${(item.value / chartData[0].value) * 100}%"></div>
                                <span class="bar-value">${item.value}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Gráfico de ventas por día
    function renderSalesByDayChart() {
        const salesByDay = dashboardStats.ventasPorDia || [];
        const container = document.getElementById('sales-by-day-chart');
        
        if (!container || salesByDay.length === 0) return;

        const maxSales = Math.max(...salesByDay.map(day => day.ingresos));

        container.innerHTML = `
            <div class="chart-container">
                <h4>Ventas por Día</h4>
                <div class="chart-line">
                    ${salesByDay.map(day => `
                        <div class="line-point" style="height: ${(day.ingresos / maxSales) * 100}%">
                            <div class="point-tooltip">
                                <strong>${formatDate(day._id)}</strong><br>
                                Ventas: $${formatNumber(day.ingresos)}<br>
                                Cantidad: ${day.ventas}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="chart-labels">
                    ${salesByDay.map(day => `
                        <div class="label">${formatDateShort(day._id)}</div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Gráfico de métodos de pago
    function renderPaymentMethodsChart() {
        const paymentMethods = dashboardStats.ventasPorMetodoPago || [];
        const container = document.getElementById('payment-methods-chart');
        
        if (!container || paymentMethods.length === 0) return;

        const total = paymentMethods.reduce((sum, method) => sum + method.count, 0);

        container.innerHTML = `
            <div class="chart-container">
                <h4>Métodos de Pago</h4>
                <div class="chart-pie">
                    ${paymentMethods.map(method => {
                        const percentage = (method.count / total) * 100;
                        const methodName = getPaymentMethodName(method._id);
                        return `
                            <div class="pie-item">
                                <div class="pie-color" style="background: ${getPaymentMethodColor(method._id)}"></div>
                                <span class="pie-label">${methodName}</span>
                                <span class="pie-value">${method.count} (${percentage.toFixed(1)}%)</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // Obtener nombre del método de pago
    function getPaymentMethodName(method) {
        const names = {
            'credit-card': 'Tarjeta de Crédito',
            'debit-card': 'Tarjeta de Débito',
            'prepaid-card': 'Tarjeta Prepago',
            'paypal': 'PayPal',
            'apple-pay': 'Apple Pay',
            'google-pay': 'Google Pay',
            'bank-transfer': 'Transferencia Bancaria',
            'bnpl': 'Compra Ahora, Paga Después',
            'cash-on-delivery': 'Contra Reembolso'
        };
        return names[method] || method;
    }

    // Obtener color del método de pago
    function getPaymentMethodColor(method) {
        const colors = {
            'credit-card': '#e74c3c',
            'debit-card': '#3498db',
            'prepaid-card': '#9b59b6',
            'paypal': '#0070ba',
            'apple-pay': '#000',
            'google-pay': '#4285f4',
            'bank-transfer': '#27ae60',
            'bnpl': '#f39c12',
            'cash-on-delivery': '#8e44ad'
        };
        return colors[method] || '#95a5a6';
    }

    // Formatear número
    function formatNumber(num) {
        return new Intl.NumberFormat('es-AR').format(num);
    }

    // Formatear fecha
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-AR');
    }

    // Formatear fecha corta
    function formatDateShort(dateString) {
        return new Date(dateString).toLocaleDateString('es-AR', { 
            day: '2-digit', 
            month: '2-digit' 
        });
    }

    // Cargar ventas
    async function loadSales() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/sales`, {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                sales = data.data || [];
                console.log('Ventas cargadas:', sales.length);
            } else {
                console.error('Error cargando ventas:', response.statusText);
            }
        } catch (error) {
            console.error('Error cargando ventas:', error);
        }
    }

    // Cargar estadísticas al inicializar
    loadDashboardStats();
    loadSales();

    // Hacer la función loadDashboardStats global para el botón onclick
    window.loadDashboardStats = async function() {
        try {
            showNotification('Actualizando datos...', 'info');
            await loadDashboardStats();
            
            // Actualizar gráficos si ya están inicializados
            if (typeof initializeCharts === 'function') {
                setTimeout(() => {
                    initializeCharts();
                    showNotification('Datos actualizados exitosamente', 'success');
                }, 300);
            }
        } catch (error) {
            console.error('Error actualizando datos:', error);
            showNotification('Error al actualizar datos', 'error');
        }
    };

    // ===== EXPORTACIÓN DE ESTADÍSTICAS A EXCEL Y PDF =====
    function getAnalyticsExportData() {
        const dataSource = chartData || sampleData;

        return {
            resumen: [
                { Metrica: 'Total de Ventas', Valor: dataSource.stats.totalSales },
                { Metrica: 'Ingresos Totales', Valor: dataSource.stats.totalRevenue },
                { Metrica: 'Promedio por Venta', Valor: dataSource.stats.avgSale },
                { Metrica: 'Tasa de Conversión (%)', Valor: dataSource.stats.conversionRate }
            ],
            ventasMensuales: dataSource.salesByMonth.labels.map((mes, idx) => ({ Mes: mes, Ingresos: dataSource.salesByMonth.data[idx] || 0 })),
            topProductos: (dataSource.topProducts.labels || []).map((nombre, idx) => ({ Producto: nombre, Cantidad: dataSource.topProducts.data[idx] || 0 })),
            usuariosActivos: dataSource.activeUsers.labels.map((sem, idx) => ({ Semana: sem, Usuarios: dataSource.activeUsers.data[idx] || 0 })),
            ingresosDiarios: (dataSource.dailyRevenue.labels || []).map((dia, idx) => ({ Dia: dia, Ingresos: dataSource.dailyRevenue.data[idx] || 0 }))
        };
    }

    async function refreshDataBeforeExport() {
        try {
            await loadDashboardStats();
            if (typeof initializeCharts === 'function') {
                initializeCharts();
            }
        } catch (e) {
            console.warn('Exportando con datos existentes por error al refrescar:', e);
        }
    }

    async function loadExcelJS() {
        if (window.ExcelJS) return;
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async function getBase64FromUrl(url) {
        const res = await fetch(url, { cache: 'no-cache' });
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    function autosizeColumns(worksheet) {
        const colWidths = [];
        worksheet.eachRow({ includeEmpty: true }, (row) => {
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const value = cell.value == null ? '' : String(cell.value.richText ? cell.value.richText.map(r => r.text).join('') : cell.value);
                const length = value.length + 2;
                colWidths[colNumber] = Math.max(colWidths[colNumber] || 10, Math.min(length, 50));
            });
        });
        colWidths.forEach((w, i) => {
            if (i > 0) worksheet.getColumn(i).width = w;
        });
    }

    function applyTableStyles(worksheet, headerRowNumber, lastDataRow, firstCol, lastCol, options = {}) {
        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        const headerFont = { bold: true, color: { argb: 'FFFFFFFF' } };
        const altFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        const border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };

        // Header styles
        for (let c = firstCol; c <= lastCol; c++) {
            const cell = worksheet.getRow(headerRowNumber).getCell(c);
            cell.fill = headerFill;
            cell.font = headerFont;
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = border;
        }

        // Body styles with alternating rows
        for (let r = headerRowNumber + 1; r <= lastDataRow; r++) {
            for (let c = firstCol; c <= lastCol; c++) {
                const cell = worksheet.getRow(r).getCell(c);
                cell.border = border;
                if ((r - (headerRowNumber + 1)) % 2 === 1) {
                    cell.fill = altFill;
                }
            }
        }

        // Align numbers to right
        if (options.numericColumns && options.numericColumns.length) {
            for (let r = headerRowNumber + 1; r <= lastDataRow; r++) {
                options.numericColumns.forEach((colIdx) => {
                    const cell = worksheet.getRow(r).getCell(colIdx);
                    cell.alignment = { horizontal: 'right' };
                });
            }
        }
    }

    function addTitle(worksheet, title, mergeToCol) {
        worksheet.addRow(['']); // spacer to keep consistent top margin
        const titleRow = worksheet.addRow([title]);
        titleRow.font = { bold: true, size: 14 };
        titleRow.alignment = { horizontal: 'left' };
        worksheet.mergeCells(titleRow.number, 1, titleRow.number, mergeToCol);
        return titleRow.number;
    }

    function addTableWithHeader(worksheet, header, rows) {
        const headerRow = worksheet.addRow(header);
        rows.forEach(r => worksheet.addRow(r));
        return { headerRowNumber: headerRow.number, lastDataRow: worksheet.lastRow.number };
    }

    function addBrandHeader(worksheet, title, imageId) {
        // Reservar espacio (4 filas) para el encabezado corporativo
        worksheet.addRow([]); // 1
        worksheet.addRow([]); // 2
        worksheet.addRow([]); // 3
        worksheet.addRow([]); // 4

        // Logo en A1:B4
        try {
            worksheet.addImage(imageId, 'A1:B4');
        } catch (e) {
            // Si falla el anclaje por cualquier motivo, ignorar y continuar
        }

        // Título corporativo en C1:H4
        const startCol = 3; // C
        const endCol = 8;   // H
        worksheet.mergeCells(1, startCol, 4, endCol);
        const cell = worksheet.getCell(1, startCol);
        cell.value = title;
        cell.font = { bold: true, size: 16 };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };

        // Línea separadora
        const sep = worksheet.addRow(['']);
        sep.height = 6;
    }

    function formatNumberColumns(worksheet, rowsStart, rowsEnd, currencyCols = [], integerCols = [], percentCols = []) {
        const currencyFmt = '"$"#,##0.00';
        const integerFmt = '#,##0';
        const percentFmt = '0.0%';
        for (let r = rowsStart; r <= rowsEnd; r++) {
            currencyCols.forEach(c => worksheet.getRow(r).getCell(c).numFmt = currencyFmt);
            integerCols.forEach(c => worksheet.getRow(r).getCell(c).numFmt = integerFmt);
            percentCols.forEach(c => worksheet.getRow(r).getCell(c).numFmt = percentFmt);
        }
    }

    function addTotalsRow(worksheet, label, firstDataRow, lastDataRow, labelCol, sumCols = []) {
        const totals = [];
        for (let c = 1; c <= Math.max(labelCol, ...sumCols); c++) {
            if (c === labelCol) {
                totals.push(label);
            } else if (sumCols.includes(c)) {
                const colLetter = worksheet.getColumn(c).letter;
                totals.push({ formula: `SUM(${colLetter}${firstDataRow}:${colLetter}${lastDataRow})` });
            } else {
                totals.push('');
            }
        }
        const row = worksheet.addRow(totals);
        row.font = { bold: true };
        return row.number;
    }

    async function exportToExcel() {
        await refreshDataBeforeExport();
        const exportData = getAnalyticsExportData();

        try {
            await loadExcelJS();
            const wb = new ExcelJS.Workbook();
            wb.created = new Date();
            wb.modified = new Date();

            // Cargar logo
            let imageId = null;
            try {
                const base64 = await getBase64FromUrl('Imagenes/logommdr.png');
                imageId = wb.addImage({ base64, extension: 'png' });
            } catch (e) {
                console.warn('No se pudo cargar el logo, continuará sin imagen.', e);
            }

            // 1) Resumen
            const wsResumen = wb.addWorksheet('Resumen', { properties: { tabColor: { argb: 'FF1F2937' } } });
            if (imageId) addBrandHeader(wsResumen, 'MMDR E-COMMERCE · Reporte de Estadísticas', imageId);
            const titleRowResumen = addTitle(wsResumen, 'Resumen de Indicadores', 4);
            const resumenHeader = ['Métrica', 'Valor'];
            const resumenRows = exportData.resumen.map(r => [r.Metrica, r.Valor]);
            const { headerRowNumber: resHeaderRow, lastDataRow: resLastRow } = addTableWithHeader(wsResumen, resumenHeader, resumenRows);
            applyTableStyles(wsResumen, resHeaderRow, resLastRow, 1, 2, { numericColumns: [2] });
            // Formatos: moneda y porcentaje según métrica
            for (let r = resHeaderRow + 1; r <= resLastRow; r++) {
                const metric = wsResumen.getRow(r).getCell(1).value;
                const valCell = wsResumen.getRow(r).getCell(2);
                if (String(metric).toLowerCase().includes('ingresos') || String(metric).toLowerCase().includes('promedio')) {
                    valCell.numFmt = '"$"#,##0.00';
                } else if (String(metric).toLowerCase().includes('conversión')) {
                    // valor viene en porcentaje (ej: 3.8). Convertir a % base 1
                    const raw = Number(valCell.value);
                    if (!isNaN(raw)) valCell.value = raw / 100;
                    valCell.numFmt = '0.0%';
                } else {
                    valCell.numFmt = '#,##0';
                }
            }
            autosizeColumns(wsResumen);

            // 2) Ventas Mensuales
            const wsMensual = wb.addWorksheet('Ventas Mensuales');
            if (imageId) addBrandHeader(wsMensual, 'MMDR E-COMMERCE · Reporte de Estadísticas', imageId);
            addTitle(wsMensual, 'Ventas Mensuales del Año', 3);
            const mensualHeader = ['Mes', 'Ingresos'];
            const mensualRows = exportData.ventasMensuales.map(v => [v.Mes, v.Ingresos]);
            const { headerRowNumber: mHeader, lastDataRow: mLast } = addTableWithHeader(wsMensual, mensualHeader, mensualRows);
            applyTableStyles(wsMensual, mHeader, mLast, 1, 2, { numericColumns: [2] });
            formatNumberColumns(wsMensual, mHeader + 1, mLast, [2], [], []);
            const mTotalsRow = addTotalsRow(wsMensual, 'Total', mHeader + 1, mLast, 1, [2]);
            wsMensual.getRow(mTotalsRow).getCell(2).numFmt = '"$"#,##0.00';
            autosizeColumns(wsMensual);

            // 3) Top Productos
            const wsTop = wb.addWorksheet('Top Productos');
            if (imageId) addBrandHeader(wsTop, 'MMDR E-COMMERCE · Reporte de Estadísticas', imageId);
            addTitle(wsTop, 'Productos Más Vendidos', 3);
            const topHeader = ['Producto', 'Cantidad'];
            const topRows = exportData.topProductos.map(p => [p.Producto, p.Cantidad]);
            const { headerRowNumber: tHeader, lastDataRow: tLast } = addTableWithHeader(wsTop, topHeader, topRows);
            applyTableStyles(wsTop, tHeader, tLast, 1, 2, { numericColumns: [2] });
            formatNumberColumns(wsTop, tHeader + 1, tLast, [], [2], []);
            addTotalsRow(wsTop, 'Total', tHeader + 1, tLast, 1, [2]);
            autosizeColumns(wsTop);

            // 4) Usuarios Activos
            const wsUsers = wb.addWorksheet('Usuarios Activos');
            if (imageId) addBrandHeader(wsUsers, 'MMDR E-COMMERCE · Reporte de Estadísticas', imageId);
            addTitle(wsUsers, 'Usuarios Activos por Semana', 3);
            const usersHeader = ['Semana', 'Usuarios'];
            const usersRows = exportData.usuariosActivos.map(u => [u.Semana, u.Usuarios]);
            const { headerRowNumber: uHeader, lastDataRow: uLast } = addTableWithHeader(wsUsers, usersHeader, usersRows);
            applyTableStyles(wsUsers, uHeader, uLast, 1, 2, { numericColumns: [2] });
            formatNumberColumns(wsUsers, uHeader + 1, uLast, [], [2], []);
            addTotalsRow(wsUsers, 'Total', uHeader + 1, uLast, 1, [2]);
            autosizeColumns(wsUsers);

            // 5) Ingresos Diarios
            const wsDaily = wb.addWorksheet('Ingresos Diarios');
            if (imageId) addBrandHeader(wsDaily, 'MMDR E-COMMERCE · Reporte de Estadísticas', imageId);
            addTitle(wsDaily, 'Ingresos Diarios (Últimas 2 Semanas)', 3);
            const dailyHeader = ['Día', 'Ingresos'];
            const dailyRows = exportData.ingresosDiarios.map(d => [d.Dia, d.Ingresos]);
            const { headerRowNumber: dHeader, lastDataRow: dLast } = addTableWithHeader(wsDaily, dailyHeader, dailyRows);
            applyTableStyles(wsDaily, dHeader, dLast, 1, 2, { numericColumns: [2] });
            formatNumberColumns(wsDaily, dHeader + 1, dLast, [2], [], []);
            if (dLast >= dHeader + 1) {
                const dTotalsRow = addTotalsRow(wsDaily, 'Total', dHeader + 1, dLast, 1, [2]);
                wsDaily.getRow(dTotalsRow).getCell(2).numFmt = '"$"#,##0.00';
            }
            autosizeColumns(wsDaily);

            const fechaStr = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte-analytics-${fechaStr}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showNotification('Reporte Excel generado', 'success');
        } catch (err) {
            console.error('Error generando Excel con estilo. Se usará exportación básica.', err);
            // Fallback a exportación básica con SheetJS (sin estilos avanzados)
            try {
                const wb = XLSX.utils.book_new();
                const wsResumen = XLSX.utils.json_to_sheet(exportData.resumen);
                XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
                const wsMensual = XLSX.utils.json_to_sheet(exportData.ventasMensuales);
                XLSX.utils.book_append_sheet(wb, wsMensual, 'Ventas Mensuales');
                const wsTop = XLSX.utils.json_to_sheet(exportData.topProductos);
                XLSX.utils.book_append_sheet(wb, wsTop, 'Top Productos');
                const wsUsuarios = XLSX.utils.json_to_sheet(exportData.usuariosActivos);
                XLSX.utils.book_append_sheet(wb, wsUsuarios, 'Usuarios Activos');
                const wsDiario = XLSX.utils.json_to_sheet(exportData.ingresosDiarios);
                XLSX.utils.book_append_sheet(wb, wsDiario, 'Ingresos Diarios');
                const fechaStr = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
                XLSX.writeFile(wb, `reporte-analytics-${fechaStr}.xlsx`);
                showNotification('Reporte Excel básico generado', 'warning');
            } catch (e2) {
                showNotification('No se pudo generar el Excel', 'error');
            }
        }
    }

    async function exportToPDF() {
        await refreshDataBeforeExport();
        const exportData = getAnalyticsExportData();

        const { jsPDF } = window.jspdf || {};
        const doc = new jsPDF('p', 'pt');

        const marginLeft = 40;
        let currentY = 40;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('Reporte de Gráficos y Estadísticas', marginLeft, currentY);
        currentY += 12;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`, marginLeft, currentY);
        currentY += 20;

        // Resumen
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('Resumen', marginLeft, currentY);
        currentY += 8;
        doc.setFont('helvetica', 'normal');
        doc.autoTable({
            startY: currentY,
            head: [['Métrica', 'Valor']],
            body: exportData.resumen.map(r => [r.Metrica, formatNumber(r.Valor)]),
            styles: { fontSize: 10 },
            theme: 'grid',
            margin: { left: marginLeft, right: marginLeft }
        });
        currentY = doc.lastAutoTable.finalY + 16;

        // Ventas mensuales
        doc.setFont('helvetica', 'bold');
        doc.text('Ventas Mensuales', marginLeft, currentY);
        currentY += 8;
        doc.setFont('helvetica', 'normal');
        doc.autoTable({
            startY: currentY,
            head: [['Mes', 'Ingresos']],
            body: exportData.ventasMensuales.map(v => [v.Mes, '$' + formatNumber(v.Ingresos)]),
            styles: { fontSize: 10 },
            theme: 'grid',
            margin: { left: marginLeft, right: marginLeft }
        });
        currentY = doc.lastAutoTable.finalY + 16;

        // Top productos
        doc.setFont('helvetica', 'bold');
        doc.text('Productos Más Vendidos', marginLeft, currentY);
        currentY += 8;
        doc.setFont('helvetica', 'normal');
        doc.autoTable({
            startY: currentY,
            head: [['Producto', 'Cantidad']],
            body: exportData.topProductos.map(p => [p.Producto, formatNumber(p.Cantidad)]),
            styles: { fontSize: 10 },
            theme: 'grid',
            margin: { left: marginLeft, right: marginLeft }
        });
        currentY = doc.lastAutoTable.finalY + 16;

        // Usuarios activos
        doc.setFont('helvetica', 'bold');
        doc.text('Usuarios Activos por Semana', marginLeft, currentY);
        currentY += 8;
        doc.setFont('helvetica', 'normal');
        doc.autoTable({
            startY: currentY,
            head: [['Semana', 'Usuarios']],
            body: exportData.usuariosActivos.map(u => [u.Semana, formatNumber(u.Usuarios)]),
            styles: { fontSize: 10 },
            theme: 'grid',
            margin: { left: marginLeft, right: marginLeft }
        });
        currentY = doc.lastAutoTable.finalY + 16;

        // Ingresos diarios (si hay)
        if (exportData.ingresosDiarios.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Ingresos Diarios (últimas 2 semanas)', marginLeft, currentY);
            currentY += 8;
            doc.setFont('helvetica', 'normal');
            doc.autoTable({
                startY: currentY,
                head: [['Día', 'Ingresos']],
                body: exportData.ingresosDiarios.map(d => [d.Dia, '$' + formatNumber(d.Ingresos)]),
                styles: { fontSize: 10 },
                theme: 'grid',
                margin: { left: marginLeft, right: marginLeft }
            });
        }

        const fechaStr = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
        doc.save(`reporte-analytics-${fechaStr}.pdf`);
        showNotification('Reporte PDF generado', 'success');
    }

    // Listeners de exportación
    document.addEventListener('click', function(e) {
        const excelBtn = e.target.closest('#export-excel-btn');
        const pdfBtn = e.target.closest('#export-pdf-btn');
        const prodExcelBtn = e.target.closest('#export-products-excel-btn');
        const prodPdfBtn = e.target.closest('#export-products-pdf-btn');
        if (excelBtn) {
            exportToExcel();
        }
        if (pdfBtn) {
            exportToPDF();
        }
        if (prodExcelBtn) {
            exportProductsToExcel();
        }
        if (prodPdfBtn) {
            exportProductsToPDF();
        }
    });

    // ===== EXPORTACIÓN DE PRODUCTOS =====
    function getProductsExportData() {
        // Estructura plana con valores adecuados
        const rows = (products || []).map(p => ({
            Nombre: p.name,
            Descripción: p.description,
            Categoría: getCategoryDisplayName(p.category || ''),
            Precio: Number(p.price || 0),
            PrecioOriginal: p.originalPrice != null ? Number(p.originalPrice) : null,
            Descuento: Number(p.discount || 0),
            Stock: Number(p.stock || 0),
            Activo: p.isActive ? 'Sí' : 'No',
            Destacado: p.featured ? 'Sí' : 'No',
            Creado: p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-AR') : ''
        }));
        return rows;
    }

    async function refreshProductsBeforeExport() {
        try {
            await loadProducts();
        } catch (e) {
            console.warn('Exportando productos con datos existentes por error al refrescar:', e);
        }
    }

    async function exportProductsToExcel() {
        await refreshProductsBeforeExport();
        const rows = getProductsExportData();
        try {
            await loadExcelJS();
            const wb = new ExcelJS.Workbook();
            wb.created = new Date();
            wb.modified = new Date();

            // Cargar logo
            let imageId = null;
            try {
                const base64 = await getBase64FromUrl('Imagenes/logommdr.png');
                imageId = wb.addImage({ base64, extension: 'png' });
            } catch {}

            const ws = wb.addWorksheet('Productos');
            if (imageId) addBrandHeader(ws, 'MMDR E-COMMERCE · Listado de Productos', imageId);

            addTitle(ws, 'Listado completo de productos', 6);
            const header = ['Nombre', 'Descripción', 'Categoría', 'Precio', 'Precio Original', 'Descuento (%)', 'Stock', 'Activo', 'Destacado', 'Creado'];
            const data = rows.map(r => [r.Nombre, r.Descripción, r.Categoría, r.Precio, r.PrecioOriginal, r.Descuento / 100, r.Stock, r.Activo, r.Destacado, r.Creado]);
            const { headerRowNumber, lastDataRow } = addTableWithHeader(ws, header, data);

            // Estilos y formatos
            applyTableStyles(ws, headerRowNumber, lastDataRow, 1, header.length, { numericColumns: [4,5,6] });
            // Formatos numéricos: precios moneda, descuento %, stock entero
            for (let r = headerRowNumber + 1; r <= lastDataRow; r++) {
                ws.getRow(r).getCell(4).numFmt = '"$"#,##0.00';
                ws.getRow(r).getCell(5).numFmt = '"$"#,##0.00';
                ws.getRow(r).getCell(6).numFmt = '0.0%';
                ws.getRow(r).getCell(7).numFmt = '#,##0';
            }

            // Totales (suma de stock y promedio de precios)
            const totalRow = ws.addRow(['Totales', '', '', { formula: `AVERAGE(D${headerRowNumber + 1}:D${lastDataRow})` }, { formula: `AVERAGE(E${headerRowNumber + 1}:E${lastDataRow})` }, { formula: `AVERAGE(F${headerRowNumber + 1}:F${lastDataRow})` }, { formula: `SUM(G${headerRowNumber + 1}:G${lastDataRow})` }, '', '', '']);
            totalRow.font = { bold: true };
            ws.getRow(totalRow.number).getCell(4).numFmt = '"$"#,##0.00';
            ws.getRow(totalRow.number).getCell(5).numFmt = '"$"#,##0.00';
            ws.getRow(totalRow.number).getCell(6).numFmt = '0.0%';
            ws.getRow(totalRow.number).getCell(7).numFmt = '#,##0';

            autosizeColumns(ws);

            const fechaStr = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `productos-${fechaStr}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showNotification('Excel de productos generado', 'success');
        } catch (err) {
            console.error('Error generando Excel de productos', err);
            // Fallback básico con SheetJS
            try {
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(rows);
                XLSX.utils.book_append_sheet(wb, ws, 'Productos');
                const fechaStr = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
                XLSX.writeFile(wb, `productos-${fechaStr}.xlsx`);
                showNotification('Excel de productos básico generado', 'warning');
            } catch {
                showNotification('No se pudo generar el Excel de productos', 'error');
            }
        }
    }

    async function exportProductsToPDF() {
        await refreshProductsBeforeExport();
        const rows = getProductsExportData();
        try {
            const { jsPDF } = window.jspdf || {};
            const doc = new jsPDF('l', 'pt');

            const marginLeft = 40;
            let currentY = 40;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text('MMDR E-COMMERCE · Listado de Productos', marginLeft, currentY);
            currentY += 14;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`, marginLeft, currentY);
            currentY += 16;

            const head = [['Nombre', 'Descripción', 'Categoría', 'Precio', 'Precio Original', 'Descuento (%)', 'Stock', 'Activo', 'Destacado', 'Creado']];
            const body = rows.map(r => [
                r.Nombre,
                r.Descripción,
                r.Categoría,
                '$' + formatNumber(r.Precio),
                r.PrecioOriginal != null ? ('$' + formatNumber(r.PrecioOriginal)) : '',
                (Number(r.Descuento) || 0) + '%',
                formatNumber(r.Stock),
                r.Activo,
                r.Destacado,
                r.Creado
            ]);

            doc.autoTable({
                startY: currentY,
                head,
                body,
                styles: { fontSize: 9 },
                headStyles: { fillColor: [31, 41, 55], halign: 'center' },
                alternateRowStyles: { fillColor: [243, 244, 246] },
                theme: 'grid',
                margin: { left: marginLeft, right: marginLeft }
            });

            const fechaStr = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
            doc.save(`productos-${fechaStr}.pdf`);
            showNotification('PDF de productos generado', 'success');
        } catch (err) {
            console.error('Error generando PDF de productos', err);
            showNotification('No se pudo generar el PDF de productos', 'error');
        }
    }

    // ===== FUNCIONALIDAD PARA SECCIÓN DE INICIO =====

    // Variables para el calendario y recordatorios
    let currentDate = new Date();
    let reminders = JSON.parse(localStorage.getItem('admin-reminders')) || [];

    // Inicializar sección de inicio
    function initializeInicioSection() {
        updateWelcomeStats();
        initializeCalendar();
        loadReminders();
        setupReminderModal();
    }

    // Actualizar estadísticas de bienvenida
    function updateWelcomeStats() {
        // Obtener nombre del usuario logueado
        const userData = JSON.parse(localStorage.getItem('usuario') || '{}');
        const userName = userData.name || 'Administrador';
        
        // Actualizar título de bienvenida
        const welcomeTitle = document.getElementById('welcome-title');
        if (welcomeTitle) {
            welcomeTitle.textContent = `Bienvenido, ${userName}`;
        }

        // Actualizar estadísticas (por ahora hardcodeadas, después se conectarán con la API)
        const stats = {
            pendingOrders: 12,
            newUsers: 4,
            todayRevenue: 45678,
            lowStock: 3
        };

        // Actualizar elementos en el DOM
        const pendingOrdersEl = document.getElementById('pending-orders');
        const newUsersEl = document.getElementById('new-users');
        const todayRevenueEl = document.getElementById('today-revenue');
        const lowStockEl = document.getElementById('low-stock');

        if (pendingOrdersEl) pendingOrdersEl.textContent = stats.pendingOrders;
        if (newUsersEl) newUsersEl.textContent = stats.newUsers;
        if (todayRevenueEl) todayRevenueEl.textContent = `$${stats.todayRevenue.toLocaleString()}`;
        if (lowStockEl) lowStockEl.textContent = stats.lowStock;
    }

    // Inicializar calendario
    function initializeCalendar() {
        renderCalendar();
        setupCalendarNavigation();
    }

    // Renderizar calendario
    function renderCalendar() {
        const calendarGrid = document.getElementById('calendar-grid');
        const currentMonthEl = document.getElementById('current-month');
        
        if (!calendarGrid || !currentMonthEl) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Actualizar título del mes
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        currentMonthEl.textContent = `${monthNames[month]} ${year}`;

        // Limpiar calendario
        calendarGrid.innerHTML = '';

        // Días de la semana
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        dayNames.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            dayHeader.style.cssText = 'font-weight: 600; color: #6c757d; text-align: center; padding: 10px 0;';
            calendarGrid.appendChild(dayHeader);
        });

        // Obtener primer día del mes y número de días
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // Días del mes anterior
        const prevMonth = new Date(year, month - 1, 0);
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const day = document.createElement('div');
            day.className = 'calendar-day';
            day.textContent = prevMonth.getDate() - i;
            calendarGrid.appendChild(day);
        }

        // Días del mes actual
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day current-month';
            dayEl.textContent = day;

            // Marcar día actual
            if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                dayEl.classList.add('today');
            }

            // Verificar si hay eventos en este día
            const dayDate = new Date(year, month, day);
            const dayEvents = getEventsForDate(dayDate);
            if (dayEvents.length > 0) {
                dayEl.classList.add('has-events');
                dayEl.title = `${dayEvents.length} evento(s)`;
            }

            // Event listener para clic en día
            dayEl.addEventListener('click', () => showDayEvents(dayDate, dayEvents));
            
            calendarGrid.appendChild(dayEl);
        }

        // Días del mes siguiente
        const remainingCells = 42 - (startingDayOfWeek + daysInMonth);
        for (let day = 1; day <= remainingCells; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.textContent = day;
            calendarGrid.appendChild(dayEl);
        }
    }

    // Configurar navegación del calendario
    function setupCalendarNavigation() {
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() - 1);
                renderCalendar();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() + 1);
                renderCalendar();
            });
        }
    }

    // Obtener eventos para una fecha específica
    function getEventsForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return reminders.filter(reminder => reminder.date === dateStr);
    }

    // Mostrar eventos de un día específico
    function showDayEvents(date, events) {
        if (events.length === 0) {
            showNotification('No hay eventos para este día', 'info');
            return;
        }

        const dateStr = date.toLocaleDateString('es-AR');
        let message = `Eventos para ${dateStr}:\n\n`;
        
        events.forEach((event, index) => {
            message += `${index + 1}. ${event.title}\n`;
            if (event.description) {
                message += `   ${event.description}\n`;
            }
            message += `   Tipo: ${getTypeDisplayName(event.type)}\n`;
            message += `   Prioridad: ${getPriorityDisplayName(event.priority)}\n\n`;
        });

        alert(message);
    }

    // Obtener nombre de tipo para mostrar
    function getTypeDisplayName(type) {
        const types = {
            'campaign': 'Campaña de Descuento',
            'stock': 'Reposición de Stock',
            'delivery': 'Vencimiento de Entrega',
            'meeting': 'Reunión',
            'other': 'Otro'
        };
        return types[type] || type;
    }

    // Obtener nombre de prioridad para mostrar
    function getPriorityDisplayName(priority) {
        const priorities = {
            'low': 'Baja',
            'medium': 'Media',
            'high': 'Alta'
        };
        return priorities[priority] || priority;
    }

    // Cargar recordatorios
    function loadReminders() {
        const remindersList = document.getElementById('reminders-list');
        if (!remindersList) return;

        remindersList.innerHTML = '';

        if (reminders.length === 0) {
            remindersList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #6c757d;">
                    <i class="fas fa-calendar-plus" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <p>No hay recordatorios</p>
                    <p style="font-size: 12px;">Agrega tu primer recordatorio</p>
                </div>
            `;
            return;
        }

        // Ordenar recordatorios por fecha
        const sortedReminders = reminders.sort((a, b) => new Date(a.date) - new Date(b.date));

        sortedReminders.forEach(reminder => {
            const reminderEl = createReminderElement(reminder);
            remindersList.appendChild(reminderEl);
        });
    }

    // Crear elemento de recordatorio
    function createReminderElement(reminder) {
        const reminderEl = document.createElement('div');
        reminderEl.className = `reminder-item ${reminder.priority}-priority`;
        
        const date = new Date(reminder.date);
        const formattedDate = date.toLocaleDateString('es-AR', { 
            day: '2-digit', 
            month: '2-digit' 
        });

        reminderEl.innerHTML = `
            <div class="reminder-header">
                <span class="reminder-title">${reminder.title}</span>
                <span class="reminder-date">${formattedDate}</span>
            </div>
            ${reminder.description ? `<div class="reminder-description">${reminder.description}</div>` : ''}
            <span class="reminder-type ${reminder.type}">${getTypeDisplayName(reminder.type)}</span>
        `;

        // Event listener para eliminar recordatorio
        reminderEl.addEventListener('dblclick', () => {
            if (confirm('¿Eliminar este recordatorio?')) {
                deleteReminder(reminder.id);
            }
        });

        return reminderEl;
    }

    // Configurar modal de recordatorio
    function setupReminderModal() {
        const modal = document.getElementById('reminder-modal');
        const addBtn = document.getElementById('add-reminder-btn');
        const closeBtn = document.getElementById('close-reminder-modal');
        const cancelBtn = document.getElementById('cancel-reminder');
        const form = document.getElementById('reminder-form');

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                showReminderModal();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                hideReminderModal();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                hideReminderModal();
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    hideReminderModal();
                }
            });
        }

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                saveReminder();
            });
        }
    }

    // Mostrar modal de recordatorio
    function showReminderModal() {
        const modal = document.getElementById('reminder-modal');
        const form = document.getElementById('reminder-form');
        
        if (modal && form) {
            form.reset();
            // Establecer fecha por defecto como hoy
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('reminder-date').value = today;
            
            modal.classList.add('show');
        }
    }

    // Ocultar modal de recordatorio
    function hideReminderModal() {
        const modal = document.getElementById('reminder-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    // Guardar recordatorio
    function saveReminder() {
        const form = document.getElementById('reminder-form');
        const formData = new FormData(form);

        const reminder = {
            id: Date.now().toString(),
            title: formData.get('title').trim(),
            description: formData.get('description').trim(),
            date: formData.get('date'),
            type: formData.get('type'),
            priority: formData.get('priority'),
            createdAt: new Date().toISOString()
        };

        // Validaciones
        if (!reminder.title || !reminder.date) {
            showNotification('Por favor, complete todos los campos obligatorios', 'error');
            return;
        }

        // Agregar recordatorio
        reminders.push(reminder);
        localStorage.setItem('admin-reminders', JSON.stringify(reminders));

        // Actualizar UI
        loadReminders();
        renderCalendar();
        hideReminderModal();

        showNotification('Recordatorio guardado exitosamente', 'success');
    }

    // Eliminar recordatorio
    function deleteReminder(reminderId) {
        reminders = reminders.filter(r => r.id !== reminderId);
        localStorage.setItem('admin-reminders', JSON.stringify(reminders));
        
        loadReminders();
        renderCalendar();
        showNotification('Recordatorio eliminado', 'success');
    }

    // Inicializar sección de inicio cuando se accede a ella
    document.addEventListener('click', function(e) {
        if (e.target.closest('.admin-sidebar-link[data-section="inicio"]')) {
            setTimeout(() => {
                initializeInicioSection();
            }, 300);
        }
    });

    // Inicializar si ya estamos en la sección de inicio
    if (currentSection === 'inicio') {
        setTimeout(() => {
            initializeInicioSection();
        }, 500);
    }

    // ===== GRÁFICOS CON CHART.JS =====
    
    // Variables para los gráficos
    let salesByMonthChartInstance = null;
    let topProductsChartInstance = null;
    let activeUsersChartInstance = null;
    let dailyRevenueChartInstance = null;
    let chartData = null; // Almacenar datos reales
    let chartDataByYear = {}; // Almacenar datos por año
    let currentChartYear = new Date().getFullYear(); // Año actual seleccionado para el gráfico

    // Datos de ejemplo para cuando no hay conexión
    const sampleData = {
        salesByMonth: {
            labels: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
            data: [45000, 52000, 48000, 61000, 55000, 67000, 63000, 72000, 69000, 75000, 82000, 90000]
        },
        topProducts: {
            labels: ['Cubre Asientos Universal', 'Cubre Volante', 'Kit LED', 'Espirales con Refuerzo', 'Kit Turbo', 'Otros'],
            data: [245, 180, 165, 140, 120, 150]
        },
        activeUsers: {
            labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5', 'Semana 6', 'Semana 7', 'Semana 8'],
            data: [120, 145, 138, 162, 178, 195, 210, 235]
        },
        dailyRevenue: {
            labels: [],
            data: []
        },
        stats: {
            totalSales: 1245,
            totalRevenue: 1250000,
            avgSale: 1004,
            conversionRate: 3.8
        }
    };

    // Inicializar gráficos cuando se accede a la sección
    document.addEventListener('click', function(e) {
        if (e.target.closest('.admin-sidebar-link[data-section="graficos"]')) {
            // Esperar un momento para que la sección se renderice
            setTimeout(() => {
                initializeCharts();
            }, 300);
        }
    });

    // Inicializar todos los gráficos
    function initializeCharts() {
        createSalesByMonthChart();
        createTopProductsChart();
        createActiveUsersChart();
        createDailyRevenueChart();
        updateStatsSummary();
        setupYearNavigation();
    }

    // Configurar navegación por año
    function setupYearNavigation() {
        const prevBtn = document.getElementById('prev-year-btn');
        const nextBtn = document.getElementById('next-year-btn');
        const yearDisplay = document.getElementById('current-year-display');

        if (!prevBtn || !nextBtn || !yearDisplay) return;

        // Actualizar display del año
        yearDisplay.textContent = currentChartYear;

        // Función para cambiar de año
        async function changeYear(direction) {
            const newYear = currentChartYear + direction;
            
            // Limitar rango de años (por ejemplo, 2020-2030)
            if (newYear < 2020 || newYear > 2030) {
                return;
            }

            currentChartYear = newYear;
            yearDisplay.textContent = currentChartYear;

            // Cargar datos del año si no están en caché
            if (!chartDataByYear[currentChartYear]) {
                try {
                    await loadDashboardStats(currentChartYear);
                } catch (error) {
                    console.error('Error cargando datos del año:', error);
                }
            }

            // Actualizar gráfico
            createSalesByMonthChart();

            // Actualizar estado de botones
            prevBtn.disabled = currentChartYear <= 2020;
            nextBtn.disabled = currentChartYear >= 2030;
        }

        // Event listeners
        prevBtn.addEventListener('click', () => changeYear(-1));
        nextBtn.addEventListener('click', () => changeYear(1));

        // Actualizar estado inicial de botones
        prevBtn.disabled = currentChartYear <= 2020;
        nextBtn.disabled = currentChartYear >= 2030;
    }

    // Crear gráfico de ventas por mes (Barras)
    function createSalesByMonthChart() {
        const canvas = document.getElementById('salesByMonthChart');
        if (!canvas) return;

        // Destruir instancia anterior si existe
        if (salesByMonthChartInstance) {
            salesByMonthChartInstance.destroy();
        }

        // Obtener datos del año seleccionado
        let dataSource;
        if (chartDataByYear[currentChartYear]) {
            dataSource = chartDataByYear[currentChartYear];
        } else if (chartData) {
            dataSource = chartData;
        } else {
            dataSource = sampleData;
        }

        const ctx = canvas.getContext('2d');
        salesByMonthChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dataSource.salesByMonth.labels,
                datasets: [{
                    label: 'Ventas en Pesos',
                    data: dataSource.salesByMonth.data,
                    backgroundColor: [
                        'rgba(231, 76, 60, 0.8)',
                        'rgba(52, 152, 219, 0.8)',
                        'rgba(46, 204, 113, 0.8)',
                        'rgba(241, 196, 15, 0.8)',
                        'rgba(155, 89, 182, 0.8)',
                        'rgba(230, 126, 34, 0.8)',
                        'rgba(231, 76, 60, 0.8)',
                        'rgba(52, 152, 219, 0.8)',
                        'rgba(46, 204, 113, 0.8)',
                        'rgba(241, 196, 15, 0.8)',
                        'rgba(155, 89, 182, 0.8)',
                        'rgba(230, 126, 34, 0.8)'
                    ],
                    borderColor: [
                        'rgba(231, 76, 60, 1)',
                        'rgba(52, 152, 219, 1)',
                        'rgba(46, 204, 113, 1)',
                        'rgba(241, 196, 15, 1)',
                        'rgba(155, 89, 182, 1)',
                        'rgba(230, 126, 34, 1)',
                        'rgba(231, 76, 60, 1)',
                        'rgba(52, 152, 219, 1)',
                        'rgba(46, 204, 113, 1)',
                        'rgba(241, 196, 15, 1)',
                        'rgba(155, 89, 182, 1)',
                        'rgba(230, 126, 34, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                family: 'Inter, sans-serif',
                                size: 14,
                                weight: '600'
                            },
                            padding: 20,
                            color: '#333'
                        }
                    },
                    title: {
                        display: true,
                        text: `Ventas Mensuales del Año ${currentChartYear}`,
                        font: {
                            family: 'Inter, sans-serif',
                            size: 18,
                            weight: 'bold'
                        },
                        color: '#1a1a2e',
                        padding: {
                            top: 10,
                            bottom: 30
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: {
                            family: 'Inter, sans-serif',
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            family: 'Inter, sans-serif',
                            size: 13
                        },
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                return 'Ventas: $' + context.parsed.y.toLocaleString('es-AR');
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString('es-AR');
                            },
                            font: {
                                family: 'Inter, sans-serif',
                                size: 12
                            },
                            color: '#666'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                family: 'Inter, sans-serif',
                                size: 12
                            },
                            color: '#666'
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Crear gráfico de productos más vendidos (Pie)
    function createTopProductsChart() {
        const canvas = document.getElementById('topProductsChart');
        if (!canvas) return;

        // Destruir instancia anterior si existe
        if (topProductsChartInstance) {
            topProductsChartInstance.destroy();
        }

        // Usar datos reales si están disponibles, sino usar datos de ejemplo
        const dataSource = chartData || sampleData;

        const ctx = canvas.getContext('2d');
        topProductsChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: dataSource.topProducts.labels,
                datasets: [{
                    label: 'Cantidad Vendida',
                    data: dataSource.topProducts.data,
                    backgroundColor: [
                        'rgba(231, 76, 60, 0.9)',
                        'rgba(52, 152, 219, 0.9)',
                        'rgba(46, 204, 113, 0.9)',
                        'rgba(241, 196, 15, 0.9)',
                        'rgba(155, 89, 182, 0.9)',
                        'rgba(230, 126, 34, 0.9)'
                    ],
                    borderColor: [
                        'rgba(231, 76, 60, 1)',
                        'rgba(52, 152, 219, 1)',
                        'rgba(46, 204, 113, 1)',
                        'rgba(241, 196, 15, 1)',
                        'rgba(155, 89, 182, 1)',
                        'rgba(230, 126, 34, 1)'
                    ],
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            font: {
                                family: 'Inter, sans-serif',
                                size: 12,
                                weight: '500'
                            },
                            padding: 15,
                            color: '#333',
                            boxWidth: 15,
                            boxHeight: 15
                        }
                    },
                    title: {
                        display: true,
                        text: 'Distribución de Productos Vendidos',
                        font: {
                            family: 'Inter, sans-serif',
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#1a1a2e',
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: {
                            family: 'Inter, sans-serif',
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            family: 'Inter, sans-serif',
                            size: 13
                        },
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} unidades (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Crear gráfico de usuarios activos (Línea)
    function createActiveUsersChart() {
        const canvas = document.getElementById('activeUsersChart');
        if (!canvas) return;

        // Destruir instancia anterior si existe
        if (activeUsersChartInstance) {
            activeUsersChartInstance.destroy();
        }

        // Usar datos reales si están disponibles, sino usar datos de ejemplo
        const dataSource = chartData || sampleData;

        const ctx = canvas.getContext('2d');
        activeUsersChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dataSource.activeUsers.labels,
                datasets: [{
                    label: 'Usuarios Activos',
                    data: dataSource.activeUsers.data,
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: 'rgba(52, 152, 219, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                family: 'Inter, sans-serif',
                                size: 14,
                                weight: '600'
                            },
                            padding: 20,
                            color: '#333'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Tendencia de Usuarios Activos',
                        font: {
                            family: 'Inter, sans-serif',
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#1a1a2e',
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: {
                            family: 'Inter, sans-serif',
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            family: 'Inter, sans-serif',
                            size: 13
                        },
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                return 'Usuarios activos: ' + context.parsed.y;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            font: {
                                family: 'Inter, sans-serif',
                                size: 12
                            },
                            color: '#666'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                family: 'Inter, sans-serif',
                                size: 12
                            },
                            color: '#666'
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Crear gráfico de ingresos diarios (Área)
    function createDailyRevenueChart() {
        const canvas = document.getElementById('dailyRevenueChart');
        if (!canvas) return;

        // Destruir instancia anterior si existe
        if (dailyRevenueChartInstance) {
            dailyRevenueChartInstance.destroy();
        }

        // Usar datos reales si están disponibles, sino usar datos de ejemplo
        const dataSource = chartData || sampleData;

        // Si no hay datos, mostrar gráfico vacío
        if (!dataSource.dailyRevenue || !dataSource.dailyRevenue.labels || dataSource.dailyRevenue.labels.length === 0) {
            canvas.parentElement.innerHTML = '<div class="loading-analytics"><i class="fas fa-info-circle"></i><p>No hay datos disponibles</p></div>';
            return;
        }

        const ctx = canvas.getContext('2d');
        dailyRevenueChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dataSource.dailyRevenue.labels,
                datasets: [{
                    label: 'Ingresos Diarios',
                    data: dataSource.dailyRevenue.data,
                    backgroundColor: 'rgba(46, 204, 113, 0.2)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: 'rgba(46, 204, 113, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                family: 'Inter, sans-serif',
                                size: 14,
                                weight: '600'
                            },
                            padding: 20,
                            color: '#333'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Tendencia de Ingresos Diarios',
                        font: {
                            family: 'Inter, sans-serif',
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#1a1a2e',
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: {
                            family: 'Inter, sans-serif',
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            family: 'Inter, sans-serif',
                            size: 13
                        },
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                return 'Ingresos: $' + context.parsed.y.toLocaleString('es-AR');
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString('es-AR');
                            },
                            font: {
                                family: 'Inter, sans-serif',
                                size: 12
                            },
                            color: '#666'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                family: 'Inter, sans-serif',
                                size: 11
                            },
                            color: '#666',
                            maxRotation: 45,
                            minRotation: 0
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Actualizar resumen de estadísticas
    function updateStatsSummary() {
        const stats = chartData?.stats || sampleData.stats;
        
        const totalSalesEl = document.getElementById('total-sales');
        if (totalSalesEl) {
            totalSalesEl.textContent = stats.totalSales.toLocaleString('es-AR');
        }

        const totalRevenueEl = document.getElementById('total-revenue');
        if (totalRevenueEl) {
            totalRevenueEl.textContent = '$' + stats.totalRevenue.toLocaleString('es-AR');
        }

        const avgSaleEl = document.getElementById('avg-sale');
        if (avgSaleEl) {
            avgSaleEl.textContent = '$' + stats.avgSale.toLocaleString('es-AR');
        }

        const conversionRateEl = document.getElementById('conversion-rate');
        if (conversionRateEl) {
            conversionRateEl.textContent = stats.conversionRate + '%';
        }
    }

    // ===================================================================
    // ===== SISTEMA DE GESTIÓN DE INVENTARIO =====
    // ===================================================================

    // Variables globales del inventario
    let inventoryData = [];
    let movimientosData = [];
    let inventoryCurrentPage = 1;
    let movimientosCurrentPage = 1;
    let inventoryRefreshInterval = null;

    // Inicializar módulo de inventario
    function initInventoryModule() {
        setupInventoryTabs();
        setupInventoryModals();
        setupInventoryFilters();
        loadInventoryData();
        loadAlertas();
        
        // Auto-refresh de movimientos cada 30 segundos
        inventoryRefreshInterval = setInterval(() => {
            if (currentSection === 'inventario') {
                loadMovimientosRecientes();
            }
        }, 30000);
    }

    // Cargar cuando se accede a la sección de inventario
    document.querySelector('[data-section="inventario"]')?.addEventListener('click', () => {
        setTimeout(() => {
            initInventoryModule();
        }, 100);
    });

    // ===== TABS DE INVENTARIO =====
    function setupInventoryTabs() {
        const tabs = document.querySelectorAll('.inventory-tab');
        const contents = document.querySelectorAll('.inventory-tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const targetTab = this.dataset.tab;

                // Actualizar tabs activos
                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                // Mostrar contenido correspondiente
                contents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `tab-${targetTab}`) {
                        content.classList.add('active');
                    }
                });

                // Cargar datos según tab
                if (targetTab === 'productos') {
                    loadInventoryData();
                } else if (targetTab === 'movimientos') {
                    loadMovimientos();
                } else if (targetTab === 'precios') {
                    loadPreciosData();
                }
            });
        });
    }

    // ===== CARGAR DATOS DE INVENTARIO =====
    async function loadInventoryData() {
        try {
            const statusFilter = document.getElementById('inventory-status-filter')?.value || 'all';
            const categoryFilter = document.getElementById('inventory-category-filter')?.value || 'all';
            const search = document.getElementById('inventory-search')?.value || '';

            const params = new URLSearchParams({
                page: inventoryCurrentPage,
                limit: 15,
                stockStatus: statusFilter,
                category: categoryFilter,
                search: search
            });

            const response = await fetch(`${API_BASE_URL}/api/inventory?${params}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                inventoryData = data.data;
                renderInventoryTable();
                renderInventoryStats(data.estadisticas);
                renderInventoryPagination(data.pagination);
            } else {
                console.error('Error cargando inventario');
                showNotification('Error al cargar inventario', 'error');
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            showNotification('Error de conexión con el servidor', 'error');
        }
    }

    // ===== RENDERIZAR TABLA DE INVENTARIO =====
    function renderInventoryTable() {
        const tbody = document.getElementById('inventory-table-body');
        if (!tbody) return;

        if (inventoryData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
                        No se encontraron productos
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = inventoryData.map(producto => {
            const statusClass = producto.stockStatus || 'sin_stock';
            const statusText = {
                'disponible': 'Disponible',
                'bajo_stock': 'Bajo Stock',
                'sin_stock': 'Sin Stock'
            }[statusClass] || 'Sin Stock';

            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${producto.image}" alt="${producto.name}" 
                                 style="width: 45px; height: 45px; object-fit: cover; border-radius: 8px;"
                                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2245%22 height=%2245%22%3E%3Crect fill=%22%23f0f0f0%22 width=%2245%22 height=%2245%22/%3E%3C/svg%3E'">
                            <span style="font-weight: 500;">${producto.name}</span>
                        </div>
                    </td>
                    <td>${formatCategory(producto.category)}</td>
                    <td style="font-weight: 600; font-size: 16px;">${producto.stock}</td>
                    <td>${producto.stockMinimo || 5}</td>
                    <td><span class="stock-badge ${statusClass}">${statusText}</span></td>
                    <td style="font-weight: 500;">$${formatPrice(producto.price)}</td>
                    <td>
                        <div class="inventory-actions">
                            <button class="btn-entrada" title="Entrada de stock" onclick="openStockModal('${producto._id}', 'entrada')">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button class="btn-salida" title="Salida de stock" onclick="openStockModal('${producto._id}', 'salida')">
                                <i class="fas fa-minus"></i>
                            </button>
                            <button class="btn-ajuste" title="Ajuste de inventario" onclick="openAjusteModal('${producto._id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ===== RENDERIZAR ESTADÍSTICAS =====
    function renderInventoryStats(stats) {
        if (!stats) return;

        const disponibleEl = document.getElementById('inv-disponible');
        const bajoStockEl = document.getElementById('inv-bajo-stock');
        const sinStockEl = document.getElementById('inv-sin-stock');
        const valorEl = document.getElementById('inv-valor');

        if (disponibleEl) disponibleEl.textContent = stats.estadoStock?.disponible || 0;
        if (bajoStockEl) bajoStockEl.textContent = stats.estadoStock?.bajoStock || 0;
        if (sinStockEl) sinStockEl.textContent = stats.estadoStock?.sinStock || 0;
        if (valorEl) valorEl.textContent = '$' + formatPrice(stats.valorInventario || 0);
    }

    // ===== CARGAR ALERTAS =====
    async function loadAlertas() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/inventory/alertas`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                renderAlertas(data.data);
                
                // Actualizar contador
                const alertsCount = document.getElementById('alerts-count');
                if (alertsCount) alertsCount.textContent = data.total || 0;
            }
        } catch (error) {
            console.error('Error cargando alertas:', error);
        }
    }

    function renderAlertas(alertas) {
        const container = document.getElementById('alerts-list');
        if (!container) return;

        if (!alertas || alertas.length === 0) {
            container.innerHTML = `
                <div class="no-alerts">
                    <i class="fas fa-check-circle"></i>
                    <p>No hay alertas de inventario</p>
                </div>
            `;
            return;
        }

        container.innerHTML = alertas.map(alerta => `
            <div class="alert-item ${alerta.tipo}">
                <i class="fas ${alerta.tipo === 'critico' ? 'fa-times-circle' : 'fa-exclamation-triangle'}"></i>
                <span class="alert-text">${alerta.mensaje}</span>
                <button class="alert-action" onclick="openStockModal('${alerta.producto}', 'entrada')">
                    Reponer
                </button>
            </div>
        `).join('');
    }

    // ===== CARGAR MOVIMIENTOS =====
    async function loadMovimientos() {
        try {
            const tipoFilter = document.getElementById('movimiento-tipo-filter')?.value || 'all';
            const fechaDesde = document.getElementById('movimiento-fecha-desde')?.value || '';
            const fechaHasta = document.getElementById('movimiento-fecha-hasta')?.value || '';

            const params = new URLSearchParams({
                page: movimientosCurrentPage,
                limit: 30,
                tipo: tipoFilter
            });

            if (fechaDesde) params.append('fechaInicio', fechaDesde);
            if (fechaHasta) params.append('fechaFin', fechaHasta);

            const response = await fetch(`${API_BASE_URL}/api/inventory/movimientos?${params}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                movimientosData = data.data;
                renderMovimientos();
                renderMovimientosPagination(data.pagination);
            }
        } catch (error) {
            console.error('Error cargando movimientos:', error);
        }
    }

    async function loadMovimientosRecientes() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/inventory/movimientos/recientes?limite=20`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                movimientosData = data.data;
                renderMovimientos();
            }
        } catch (error) {
            console.error('Error cargando movimientos recientes:', error);
        }
    }

    function renderMovimientos() {
        const container = document.getElementById('movimientos-timeline');
        if (!container) return;

        if (!movimientosData || movimientosData.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #666;">
                    <i class="fas fa-history" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>No hay movimientos registrados</p>
                </div>
            `;
            return;
        }

        container.innerHTML = movimientosData.map(mov => {
            const tipoIcon = {
                'entrada': 'fa-arrow-down',
                'salida': 'fa-arrow-up',
                'ajuste': 'fa-sync-alt'
            }[mov.tipo] || 'fa-exchange-alt';

            const cantidadPrefix = mov.tipo === 'entrada' ? '+' : mov.tipo === 'salida' ? '-' : '';
            const fecha = new Date(mov.createdAt);
            const fechaStr = fecha.toLocaleDateString('es-AR') + ' ' + fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

            return `
                <div class="movimiento-item">
                    <div class="movimiento-icon ${mov.tipo}">
                        <i class="fas ${tipoIcon}"></i>
                    </div>
                    <div class="movimiento-content">
                        <div class="movimiento-header">
                            <span class="movimiento-producto">${mov.productoNombre}</span>
                            <span class="movimiento-fecha">${fechaStr}</span>
                        </div>
                        <div class="movimiento-detalles">
                            ${mov.descripcion || formatMotivo(mov.motivo)}
                            ${mov.numeroOrden ? `<span style="color: #3498db; margin-left: 8px;">#${mov.numeroOrden}</span>` : ''}
                        </div>
                        <div>
                            <span class="movimiento-cantidad ${mov.tipo}">${cantidadPrefix}${mov.cantidad} unidades</span>
                            <span class="movimiento-stock">(${mov.stockAnterior} → ${mov.stockNuevo})</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ===== CARGAR DATOS DE PRECIOS =====
    async function loadPreciosData() {
        try {
            const search = document.getElementById('precio-search')?.value || '';
            
            const params = new URLSearchParams({
                page: 1,
                limit: 50,
                search: search
            });

            const response = await fetch(`${API_BASE_URL}/api/inventory?${params}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                renderPreciosTable(data.data);
            }
        } catch (error) {
            console.error('Error cargando precios:', error);
        }
    }

    function renderPreciosTable(productos) {
        const tbody = document.getElementById('precios-table-body');
        if (!tbody) return;

        if (!productos || productos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem; color: #666;">
                        No se encontraron productos
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = productos.map(producto => {
            const fechaCambio = producto.fechaCambioPrecio 
                ? new Date(producto.fechaCambioPrecio).toLocaleDateString('es-AR')
                : '-';

            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${producto.image}" alt="${producto.name}" 
                                 style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px;">
                            <span style="font-weight: 500;">${producto.name}</span>
                        </div>
                    </td>
                    <td style="font-weight: 600; color: #27ae60;">$${formatPrice(producto.price)}</td>
                    <td class="precio-anterior">
                        ${producto.precioAnterior ? '$' + formatPrice(producto.precioAnterior) : '-'}
                    </td>
                    <td class="fecha-cambio">${fechaCambio}</td>
                    <td>
                        <div class="precio-input-group">
                            <input type="number" id="nuevo-precio-${producto._id}" 
                                   placeholder="${producto.price}" min="0" step="0.01">
                        </div>
                    </td>
                    <td>
                        <button class="btn-cambiar-precio" onclick="cambiarPrecio('${producto._id}')">
                            <i class="fas fa-check"></i> Aplicar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ===== MODALES DE INVENTARIO =====
    function setupInventoryModals() {
        // Modal de Stock
        const stockModal = document.getElementById('stock-modal');
        const closeStockModal = document.getElementById('close-stock-modal');
        const cancelStock = document.getElementById('cancel-stock');
        const stockForm = document.getElementById('stock-form');

        if (closeStockModal) {
            closeStockModal.addEventListener('click', () => {
                stockModal.style.display = 'none';
            });
        }

        if (cancelStock) {
            cancelStock.addEventListener('click', () => {
                stockModal.style.display = 'none';
            });
        }

        if (stockForm) {
            stockForm.addEventListener('submit', handleStockSubmit);
        }

        // Modal de Ajuste
        const ajusteModal = document.getElementById('ajuste-modal');
        const closeAjusteModal = document.getElementById('close-ajuste-modal');
        const cancelAjuste = document.getElementById('cancel-ajuste');
        const ajusteForm = document.getElementById('ajuste-form');

        if (closeAjusteModal) {
            closeAjusteModal.addEventListener('click', () => {
                ajusteModal.style.display = 'none';
            });
        }

        if (cancelAjuste) {
            cancelAjuste.addEventListener('click', () => {
                ajusteModal.style.display = 'none';
            });
        }

        if (ajusteForm) {
            ajusteForm.addEventListener('submit', handleAjusteSubmit);
        }

        // Cerrar modales al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target === stockModal) stockModal.style.display = 'none';
            if (e.target === ajusteModal) ajusteModal.style.display = 'none';
        });
    }

    // Abrir modal de stock
    window.openStockModal = async function(productoId, tipo) {
        const modal = document.getElementById('stock-modal');
        if (!modal) return;

        // Obtener datos del producto
        const producto = inventoryData.find(p => p._id === productoId);
        if (!producto) {
            // Cargar del servidor
            try {
                const response = await fetch(`${API_BASE_URL}/api/inventory/producto/${productoId}`, {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    fillStockModal(data.data.producto, tipo);
                }
            } catch (error) {
                console.error('Error:', error);
                return;
            }
        } else {
            fillStockModal(producto, tipo);
        }

        modal.style.display = 'flex';
    };

    function fillStockModal(producto, tipo) {
        document.getElementById('stock-producto-id').value = producto._id;
        document.getElementById('stock-tipo-movimiento').value = tipo;
        document.getElementById('stock-producto-nombre').textContent = producto.name;
        document.getElementById('stock-producto-imagen').src = producto.image;
        document.getElementById('stock-actual').textContent = producto.stock;
        document.getElementById('stock-cantidad').value = '';
        document.getElementById('stock-descripcion').value = '';

        // Título del modal
        document.getElementById('stock-modal-title').textContent = 
            tipo === 'entrada' ? 'Entrada de Stock' : 'Salida de Stock';

        // Opciones de motivo según tipo
        const motivoSelect = document.getElementById('stock-motivo');
        if (tipo === 'entrada') {
            motivoSelect.innerHTML = `
                <option value="reposicion">Reposición de mercadería</option>
                <option value="carga_inicial">Carga inicial</option>
                <option value="devolucion_cliente">Devolución de cliente</option>
                <option value="transferencia">Transferencia</option>
                <option value="otro">Otro</option>
            `;
        } else {
            motivoSelect.innerHTML = `
                <option value="dano_perdida">Daño o pérdida</option>
                <option value="transferencia">Transferencia</option>
                <option value="ajuste_inventario">Ajuste de inventario</option>
                <option value="otro">Otro</option>
            `;
        }
    }

    // Manejar submit de stock
    async function handleStockSubmit(e) {
        e.preventDefault();

        const productoId = document.getElementById('stock-producto-id').value;
        const tipo = document.getElementById('stock-tipo-movimiento').value;
        const cantidad = parseInt(document.getElementById('stock-cantidad').value);
        const motivo = document.getElementById('stock-motivo').value;
        const descripcion = document.getElementById('stock-descripcion').value;

        if (!cantidad || cantidad <= 0) {
            showNotification('Ingresa una cantidad válida', 'error');
            return;
        }

        try {
            const endpoint = tipo === 'entrada' ? 'entrada' : 'salida';
            const response = await fetch(`${API_BASE_URL}/api/inventory/${endpoint}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productoId,
                    cantidad,
                    motivo,
                    descripcion,
                    usuario: 'admin'
                })
            });

            if (response.ok) {
                const data = await response.json();
                showNotification(data.message, 'success');
                document.getElementById('stock-modal').style.display = 'none';
                loadInventoryData();
                loadAlertas();
                loadMovimientosRecientes();
            } else {
                const error = await response.json();
                showNotification(error.message || 'Error al registrar movimiento', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error de conexión', 'error');
        }
    }

    // Abrir modal de ajuste
    window.openAjusteModal = async function(productoId) {
        const modal = document.getElementById('ajuste-modal');
        if (!modal) return;

        const producto = inventoryData.find(p => p._id === productoId);
        if (!producto) return;

        document.getElementById('ajuste-producto-id').value = producto._id;
        document.getElementById('ajuste-producto-nombre').textContent = producto.name;
        document.getElementById('ajuste-producto-imagen').src = producto.image;
        document.getElementById('ajuste-stock-actual').textContent = producto.stock;
        document.getElementById('ajuste-nuevo-stock').value = producto.stock;
        document.getElementById('ajuste-stock-minimo').value = producto.stockMinimo || 5;
        document.getElementById('ajuste-descripcion').value = '';

        modal.style.display = 'flex';
    };

    // Manejar submit de ajuste
    async function handleAjusteSubmit(e) {
        e.preventDefault();

        const productoId = document.getElementById('ajuste-producto-id').value;
        const nuevoStock = parseInt(document.getElementById('ajuste-nuevo-stock').value);
        const stockMinimo = parseInt(document.getElementById('ajuste-stock-minimo').value);
        const motivo = document.getElementById('ajuste-motivo').value;
        const descripcion = document.getElementById('ajuste-descripcion').value;

        if (nuevoStock < 0) {
            showNotification('El stock no puede ser negativo', 'error');
            return;
        }

        try {
            // Ajustar stock
            const responseAjuste = await fetch(`${API_BASE_URL}/api/inventory/ajuste`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productoId,
                    nuevoStock,
                    motivo,
                    descripcion,
                    usuario: 'admin'
                })
            });

            // Actualizar stock mínimo
            if (stockMinimo >= 0) {
                await fetch(`${API_BASE_URL}/api/inventory/stock-minimo`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productoId, stockMinimo })
                });
            }

            if (responseAjuste.ok) {
                showNotification('Ajuste realizado correctamente', 'success');
                document.getElementById('ajuste-modal').style.display = 'none';
                loadInventoryData();
                loadAlertas();
                loadMovimientosRecientes();
            } else {
                const error = await responseAjuste.json();
                showNotification(error.message || 'Error al realizar ajuste', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error de conexión', 'error');
        }
    }

    // Cambiar precio
    window.cambiarPrecio = async function(productoId) {
        const inputId = `nuevo-precio-${productoId}`;
        const nuevoPrecio = parseFloat(document.getElementById(inputId).value);

        if (!nuevoPrecio || nuevoPrecio <= 0) {
            showNotification('Ingresa un precio válido', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/inventory/precio`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productoId, nuevoPrecio })
            });

            if (response.ok) {
                showNotification('Precio actualizado correctamente', 'success');
                loadPreciosData();
            } else {
                const error = await response.json();
                showNotification(error.message || 'Error al cambiar precio', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error de conexión', 'error');
        }
    };

    // ===== FILTROS DE INVENTARIO =====
    function setupInventoryFilters() {
        // Filtros de inventario
        const statusFilter = document.getElementById('inventory-status-filter');
        const categoryFilter = document.getElementById('inventory-category-filter');
        const searchInput = document.getElementById('inventory-search');

        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                inventoryCurrentPage = 1;
                loadInventoryData();
            });
        }

        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                inventoryCurrentPage = 1;
                loadInventoryData();
            });
        }

        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    inventoryCurrentPage = 1;
                    loadInventoryData();
                }, 300);
            });
        }

        // Filtros de movimientos
        const applyMovFilters = document.getElementById('apply-mov-filters');
        if (applyMovFilters) {
            applyMovFilters.addEventListener('click', () => {
                movimientosCurrentPage = 1;
                loadMovimientos();
            });
        }

        // Búsqueda de precios
        const precioSearch = document.getElementById('precio-search');
        if (precioSearch) {
            let searchTimeout;
            precioSearch.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    loadPreciosData();
                }, 300);
            });
        }

        // Botón de refresh
        const refreshBtn = document.getElementById('refresh-inventory-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadInventoryData();
                loadAlertas();
                showNotification('Inventario actualizado', 'success');
            });
        }
    }

    // ===== PAGINACIÓN =====
    function renderInventoryPagination(pagination) {
        const container = document.getElementById('inventory-pagination');
        if (!container || !pagination) return;

        if (pagination.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="admin-pagination-info">
                Página <strong>${pagination.currentPage}</strong> de <strong>${pagination.totalPages}</strong>
            </div>
            <div class="admin-pagination-buttons">
                <button class="admin-page-btn" ${pagination.currentPage === 1 ? 'disabled' : ''} 
                        onclick="inventoryGoToPage(${pagination.currentPage - 1})">
                    <i class="fas fa-angle-left"></i>
                </button>
                <button class="admin-page-btn" ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''} 
                        onclick="inventoryGoToPage(${pagination.currentPage + 1})">
                    <i class="fas fa-angle-right"></i>
                </button>
            </div>
        `;
    }

    function renderMovimientosPagination(pagination) {
        const container = document.getElementById('movimientos-pagination');
        if (!container || !pagination) return;

        if (pagination.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="admin-pagination-info">
                Página <strong>${pagination.currentPage}</strong> de <strong>${pagination.totalPages}</strong>
            </div>
            <div class="admin-pagination-buttons">
                <button class="admin-page-btn" ${pagination.currentPage === 1 ? 'disabled' : ''} 
                        onclick="movimientosGoToPage(${pagination.currentPage - 1})">
                    <i class="fas fa-angle-left"></i>
                </button>
                <button class="admin-page-btn" ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''} 
                        onclick="movimientosGoToPage(${pagination.currentPage + 1})">
                    <i class="fas fa-angle-right"></i>
                </button>
            </div>
        `;
    }

    window.inventoryGoToPage = function(page) {
        inventoryCurrentPage = page;
        loadInventoryData();
    };

    window.movimientosGoToPage = function(page) {
        movimientosCurrentPage = page;
        loadMovimientos();
    };

    // ===== FUNCIONES AUXILIARES =====
    function formatPrice(price) {
        return new Intl.NumberFormat('es-AR').format(price);
    }

    function formatCategory(category) {
        const categories = {
            'asientos': 'Asientos',
            'volantes': 'Volantes',
            'electronica': 'Electrónica',
            'suspension': 'Suspensión',
            'accesorios': 'Accesorios',
            'otros': 'Otros'
        };
        return categories[category] || category;
    }

    function formatMotivo(motivo) {
        const motivos = {
            'venta': 'Venta completada',
            'cancelacion_venta': 'Cancelación de venta',
            'devolucion_cliente': 'Devolución de cliente',
            'ajuste_inventario': 'Ajuste de inventario',
            'carga_inicial': 'Carga inicial',
            'reposicion': 'Reposición de mercadería',
            'dano_perdida': 'Daño o pérdida',
            'transferencia': 'Transferencia',
            'correccion_error': 'Corrección de error',
            'otro': 'Otro'
        };
        return motivos[motivo] || motivo;
    }

    // Inicializar módulo al cargar la página si estamos en inventario
    if (document.getElementById('inventario-section')) {
        // Esperar a que el DOM esté completamente listo
        setTimeout(initInventoryModule, 500);
    }

    // ----- Tickets (atención al cliente) -----
    function escapeTicketHtml(str) {
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    async function loadSupportTickets() {
        const sel = document.getElementById('tickets-filter-estado');
        const estado = sel && sel.value ? sel.value : '';
        const url = estado
            ? `${API_BASE_URL}/api/admin/tickets?estado=${encodeURIComponent(estado)}`
            : `${API_BASE_URL}/api/admin/tickets`;
        try {
            const res = await fetch(url, { credentials: 'include' });
            const data = await res.json();
            supportTickets = data.success && data.tickets ? data.tickets : [];
            renderSupportTicketsTable();
        } catch (e) {
            console.error(e);
            showNotification('Error al cargar tickets', 'error');
            supportTickets = [];
            renderSupportTicketsTable();
        }
    }

    function ticketEstadoPillClass(estado) {
        const e = String(estado || '');
        if (e === 'Pendiente') return 'ticket-estado-pill ticket-estado-pill--pendiente';
        if (e === 'En proceso') return 'ticket-estado-pill ticket-estado-pill--proceso';
        return 'ticket-estado-pill';
    }

    function renderSupportTicketsTable() {
        const tbody = document.getElementById('tickets-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!supportTickets.length) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="5" style="text-align:center;padding:2rem;color:#666;">No hay tickets</td>';
            tbody.appendChild(tr);
            return;
        }
        supportTickets.forEach((t) => {
            const u = t.usuarioId;
            const userLabel = u && (u.name || u.email) ? (u.name || u.email) : (t.guestLabel || 'Invitado');
            const fecha = t.updatedAt ? new Date(t.updatedAt).toLocaleString('es-AR') : '';
            const consulta = [t.tipoConsulta, t.mensajeInicial].filter(Boolean).join(' — ').slice(0, 100);
            const pillClass = ticketEstadoPillClass(t.estado);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeTicketHtml(fecha)}</td>
                <td>${escapeTicketHtml(userLabel)}</td>
                <td>${escapeTicketHtml(consulta)}</td>
                <td><span class="${pillClass}">${escapeTicketHtml(t.estado || '')}</span></td>
                <td class="admin-actions">
                    <button type="button" class="admin-action-btn edit ticket-open-btn" data-ticket-id="${t._id}" title="Ver / responder">
                        <i class="fas fa-comments"></i>
                    </button>
                </td>`;
            tbody.appendChild(tr);
        });
    }

    function openTicketModal() {
        document.getElementById('ticket-detail-modal')?.classList.add('open');
    }

    function closeTicketModal() {
        document.getElementById('ticket-detail-modal')?.classList.remove('open');
        currentTicketDetailId = null;
    }

    async function openTicketDetail(id) {
        currentTicketDetailId = id;
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/tickets/${id}`, { credentials: 'include' });
            const data = await res.json();
            if (!data.success || !data.ticket) {
                showNotification('No se pudo cargar el ticket', 'error');
                return;
            }
            const t = data.ticket;
            const u = t.usuarioId;
            const userLabel = u && (u.name || u.email) ? `${u.name} (${u.email})` : (t.guestLabel || 'Invitado');
            document.getElementById('ticket-modal-title').textContent = `Ticket ${t._id}`;
            document.getElementById('ticket-modal-meta').innerHTML = `
                <strong>Usuario:</strong> ${escapeTicketHtml(userLabel)}<br>
                <strong>Creado:</strong> ${escapeTicketHtml(t.createdAt ? new Date(t.createdAt).toLocaleString('es-AR') : '')}<br>
                <strong>Consulta:</strong> ${escapeTicketHtml(t.tipoConsulta || '')}<br>
                <strong>Mensaje inicial:</strong> ${escapeTicketHtml(t.mensajeInicial || '')}
            `;
            const thread = document.getElementById('ticket-modal-thread');
            thread.innerHTML = '';
            (t.mensajes || []).forEach((m) => {
                const div = document.createElement('div');
                div.className = `ticket-msg ${m.from === 'admin' ? 'admin' : 'user'}`;
                const when = m.createdAt ? new Date(m.createdAt).toLocaleString('es-AR') : '';
                div.innerHTML = `${escapeTicketHtml(m.texto)}<span class="ticket-msg-meta">${m.from === 'admin' ? 'Equipo' : 'Usuario'} · ${escapeTicketHtml(when)}</span>`;
                thread.appendChild(div);
            });
            thread.scrollTop = thread.scrollHeight;
            const estSel = document.getElementById('ticket-estado-select');
            if (estSel) estSel.value = t.estado || 'Pendiente';
            document.getElementById('ticket-reply-text').value = '';
            openTicketModal();
        } catch (e) {
            console.error(e);
            showNotification('Error al cargar el ticket', 'error');
        }
    }

    document.getElementById('tickets-filter-estado')?.addEventListener('change', () => loadSupportTickets());
    document.getElementById('tickets-refresh-btn')?.addEventListener('click', () => loadSupportTickets());
    document.getElementById('ticket-modal-close')?.addEventListener('click', closeTicketModal);
    document.querySelector('#ticket-detail-modal .ticket-modal-backdrop')?.addEventListener('click', closeTicketModal);

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.ticket-open-btn');
        if (btn && btn.dataset.ticketId) {
            e.preventDefault();
            openTicketDetail(btn.dataset.ticketId);
        }
    });

    document.getElementById('ticket-send-reply-btn')?.addEventListener('click', async () => {
        if (!currentTicketDetailId) return;
        const texto = document.getElementById('ticket-reply-text')?.value?.trim();
        if (!texto) {
            showNotification('Escribí un mensaje', 'error');
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/tickets/${currentTicketDetailId}/reply`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto })
            });
            const data = await res.json();
            if (!data.success) {
                showNotification(data.message || 'Error al enviar', 'error');
                return;
            }
            showNotification('Respuesta enviada', 'success');
            await openTicketDetail(currentTicketDetailId);
            loadSupportTickets();
        } catch (err) {
            console.error(err);
            showNotification('Error de red', 'error');
        }
    });

    document.getElementById('ticket-save-estado-btn')?.addEventListener('click', async () => {
        if (!currentTicketDetailId) return;
        const estado = document.getElementById('ticket-estado-select')?.value;
        const id = currentTicketDetailId;

        if (estado === 'Resuelto') {
            const msg = 'Recordá que una vez guardado como estado resuelto, este ticket desaparecerá y no podrás volver a verlo.';
            if (!window.confirm(msg)) return;
            try {
                const res = await fetch(`${API_BASE_URL}/api/admin/tickets/${id}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.success) {
                    showNotification(data.message || 'No se pudo cerrar el ticket', 'error');
                    return;
                }
                showNotification('Ticket resuelto y archivado', 'success');
                closeTicketModal();
                loadSupportTickets();
            } catch (err) {
                console.error(err);
                showNotification('Error de red', 'error');
            }
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/tickets/${id}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado })
            });
            const data = await res.json();
            if (!data.success) {
                showNotification(data.message || 'Error al actualizar', 'error');
                return;
            }
            showNotification('Estado actualizado', 'success');
            closeTicketModal();
            loadSupportTickets();
        } catch (err) {
            console.error(err);
            showNotification('Error de red', 'error');
        }
    });

}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminPanelDeferred);
} else {
    initAdminPanelDeferred();
}
