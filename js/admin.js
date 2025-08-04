// Configuración de Supabase mejorada
const SUPABASE_CONFIG = {
  url: "https://pnozgtpqjymbevfwvsja.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBub3pndHBxanltYmV2Znd2c2phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MTU0NTQsImV4cCI6MjA2ODM5MTQ1NH0.pHQLBvXuBtX9ubyVM7dcp8DI5vUCmaAaVJ2sejXwov0"
};

class AdminPanel {
  constructor() {
    this.supabase = null;
    this.allProducts = [];
    this.currentEditingId = null;
    this.elements = {};
    this.isConnected = false;
    this.checkAuth();
  }

  checkAuth() {
    const isAuthenticated = sessionStorage.getItem('bonvivant_admin_auth') === 'true';
    const authTime = parseInt(sessionStorage.getItem('bonvivant_admin_time') || '0');
    const now = Date.now();
    const sessionDuration = 2 * 60 * 60 * 1000;

    if (!isAuthenticated || (now - authTime) > sessionDuration) {
      sessionStorage.removeItem('bonvivant_admin_auth');
      sessionStorage.removeItem('bonvivant_admin_time');
      window.location.href = 'login.html';
      return;
    }
    this.init();
  }

  logout() {
    sessionStorage.removeItem('bonvivant_admin_auth');
    sessionStorage.removeItem('bonvivant_admin_time');
    window.location.href = 'login.html';
  }

  async init() {
    try {
      this.showInitialLoading();
      this.supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
      console.log('Inicializando conexión con Supabase...');
      
      this.getElements();
      this.setupEventListeners();
      await this.testConnection();
    } catch (error) {
      console.error('Error inicializando panel:', error);
      this.showError('Error al inicializar la aplicación');
      this.hideInitialLoading();
    }
  }

  showInitialLoading() {
    document.body.style.opacity = '0.5';
    const loadingMsg = document.createElement('div');
    loadingMsg.id = 'initial-loading';
    loadingMsg.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(212, 184, 150, 0.95); color: #0d0d0d; padding: 30px 50px;
      border-radius: 15px; font-family: "Sorts Mill Goudy", serif; font-size: 1.2rem;
      z-index: 10000; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    `;
    loadingMsg.innerHTML = `
      <div style="margin-bottom: 15px; font-size: 2rem;">🍷</div>
      <div>Conectando con la base de datos...</div>
      <div style="margin-top: 10px; font-size: 0.9rem; opacity: 0.7;">Verificando productos disponibles</div>
    `;
    document.body.appendChild(loadingMsg);
  }

  hideInitialLoading() {
    const loadingMsg = document.getElementById('initial-loading');
    if (loadingMsg) loadingMsg.remove();
    document.body.style.opacity = '1';
  }

  async testConnection() {
    try {
      console.log('Probando conexión con Supabase...');
      const { data, error, count } = await this.supabase
        .from('wines')
        .select('id', { count: 'exact', head: true });

      if (error) throw error;

      console.log('Conexión exitosa. Productos encontrados:', count);
      this.isConnected = true;
      this.hideInitialLoading();
      await this.loadProducts();
    } catch (error) {
      console.error('Error de conectividad:', error);
      this.isConnected = false;
      this.hideInitialLoading();
      this.showConnectionError();
    }
  }

  showConnectionError() {
    this.hideLoading();
    const errorContainer = document.createElement('div');
    errorContainer.style.cssText = `
      background: linear-gradient(135deg, rgba(220, 53, 69, 0.1), rgba(220, 53, 69, 0.05));
      border: 2px solid rgba(220, 53, 69, 0.3); border-radius: 15px; padding: 40px;
      margin: 20px 0; text-align: center; color: #ffffff; backdrop-filter: blur(10px);
    `;
    
    errorContainer.innerHTML = `
      <div style="font-size: 4rem; margin-bottom: 20px; opacity: 0.7;">⚠️</div>
      <h3 style="color: #dc3545; margin-bottom: 20px; font-family: 'Great Vibes', cursive; font-size: 2.5rem;">Error de Conexión</h3>
      <p style="margin-bottom: 25px; font-family: 'Sorts Mill Goudy', serif; font-size: 1.1rem;">No se pudo conectar con la base de datos de productos.</p>
      <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; margin-bottom: 25px;">
        <button onclick="adminPanel.retryConnection()" class="btn-primary" style="min-width: 150px;">🔄 Reintentar</button>
        <button onclick="adminPanel.showDemoMode()" class="btn-secondary" style="min-width: 150px;">🎭 Modo Demo</button>
      </div>
      <details style="margin-top: 20px; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 10px; cursor: pointer;">
        <summary style="color: #d4b896; font-weight: 500; margin-bottom: 15px;">💡 Posibles soluciones</summary>
        <ul style="text-align: left; max-width: 400px; margin: 0 auto; line-height: 1.6;">
          <li>Verificar conexión a internet</li>
          <li>Revisar configuración de Supabase</li>
          <li>Verificar permisos de la base de datos</li>
          <li>Contactar al administrador del sistema</li>
        </ul>
      </details>
    `;
    
    this.elements.productsGrid.parentNode.insertBefore(errorContainer, this.elements.productsGrid);
  }

  async retryConnection() {
    const errorContainers = document.querySelectorAll('[style*="rgba(220, 53, 69"]');
    errorContainers.forEach(container => container.remove());
    this.showInitialLoading();
    await this.testConnection();
  }

  showDemoMode() {
    const errorContainers = document.querySelectorAll('[style*="rgba(220, 53, 69"]');
    errorContainers.forEach(container => container.remove());
    
    const demoProducts = [
      {
        id: 'demo-1', name: 'Château Margaux 2015', price: '$899.99', category: 'Tintos',
        image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI2MCIgdmlld0JveD0iMCAwIDIwMCAyNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjYwIiBmaWxsPSIjMmEyYTJhIi8+CjxyZWN0IHg9IjUwIiB5PSI0MCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxODAiIGZpbGw9IiMxYTUzM2EiLz4KPGNpcmNsZSBjeD0iMTAwIiBjeT0iNDAiIHI9IjE1IiBmaWxsPSIjOGQ1NTI0Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMjQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjZDRiODk2IiBmb250LXNpemU9IjEyIiBmb250LWZhbWlseT0ic2VyaWYiPkRlbW88L3RleHQ+Cjwvc3ZnPg==',
        description: 'Vino tinto de alta gama - Producto de demostración'
      },
      {
        id: 'demo-2', name: 'Dom Pérignon Vintage', price: '$349.99', category: 'Champagne y Espumosos',
        image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI2MCIgdmlld0JveD0iMCAwIDIwMCAyNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjYwIiBmaWxsPSIjMmEyYTJhIi8+CjxyZWN0IHg9IjUwIiB5PSI0MCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxODAiIGZpbGw9IiMwYzM0MmQiLz4KPGNpcmNsZSBjeD0iMTAwIiBjeT0iNDAiIHI9IjE1IiBmaWxsPSIjZmZkNzAwIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMjQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjZDRiODk2IiBmb250LXNpemU9IjEyIiBmb250LWZhbWlseT0ic2VyaWYiPkRlbW88L3RleHQ+Cjwvc3ZnPg==',
        description: 'Champagne premium - Producto de demostración'
      },
      {
        id: 'demo-3', name: 'Chardonnay Reserva', price: '$45.99', category: 'Blancos y Rosados',
        image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI2MCIgdmlld0JveD0iMCAwIDIwMCAyNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjYwIiBmaWxsPSIjMmEyYTJhIi8+CjxyZWN0IHg9IjUwIiB5PSI0MCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxODAiIGZpbGw9IiNmZmY4ZGMiLz4KPGNpcmNsZSBjeD0iMTAwIiBjeT0iNDAiIHI9IjE1IiBmaWxsPSIjOGQ1NTI0Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMjQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjZDRiODk2IiBmb250LXNpemU9IjEyIiBmb250LWZhbWlseT0ic2VyaWYiPkRlbW88L3RleHQ+Cjwvc3ZnPg==',
        description: 'Vino blanco elegante - Producto de demostración'
      }
    ];
    
    this.allProducts = demoProducts;
    this.displayProducts(demoProducts);
    this.updateStats();
    
    const infoMessage = document.createElement('div');
    infoMessage.style.cssText = `
      background: linear-gradient(135deg, rgba(255, 193, 7, 0.15), rgba(255, 193, 7, 0.05));
      color: #ffffff; padding: 25px; border-radius: 15px; margin-bottom: 25px;
      border: 2px solid rgba(255, 193, 7, 0.3); text-align: center;
      font-family: "Sorts Mill Goudy", serif; backdrop-filter: blur(10px);
    `;
    infoMessage.innerHTML = `
      <div style="font-size: 3rem; margin-bottom: 15px;">🎭</div>
      <h3 style="color: #ffc107; margin-bottom: 15px; font-family: 'Great Vibes', cursive; font-size: 2rem;">Modo de Demostración</h3>
      <p style="margin-bottom: 20px; font-size: 1.1rem;">Sin conexión a la base de datos. Mostrando productos de ejemplo.</p>
      <button onclick="adminPanel.retryConnection()" class="btn-primary">🔄 Intentar Conectar Nuevamente</button>
    `;
    
    this.elements.productsGrid.parentNode.insertBefore(infoMessage, this.elements.productsGrid);
  }

  getElements() {
    this.elements = {
      productsGrid: document.getElementById('products-grid'),
      searchInput: document.getElementById('search-input'),
      categoryFilter: document.getElementById('category-filter'),
      addProductBtn: document.getElementById('add-product-btn'),
      modal: document.getElementById('product-modal'),
      modalTitle: document.getElementById('modal-title'),
      productForm: document.getElementById('product-form'),
      closeBtn: document.getElementsByClassName('close')[0],
      cancelBtn: document.getElementById('cancel-btn'),
      loading: document.getElementById('loading'),
      errorMessage: document.getElementById('error-message'),
      successMessage: document.getElementById('success-message'),
      formFields: {
        name: document.getElementById('product-name'),
        price: document.getElementById('product-price'),
        category: document.getElementById('product-category'),
        imageUrl: document.getElementById('product-image-url'),
        description: document.getElementById('product-description')
      }
    };
  }

  setupEventListeners() {
    this.elements.searchInput.addEventListener('input', () => this.filterProducts());
    this.elements.categoryFilter.addEventListener('change', () => this.filterProducts());
    this.elements.addProductBtn.addEventListener('click', () => this.openAddModal());
    this.elements.closeBtn.addEventListener('click', () => this.closeModal());
    this.elements.cancelBtn.addEventListener('click', () => this.closeModal());
    
    window.addEventListener('click', (event) => {
      if (event.target === this.elements.modal) this.closeModal();
    });
    
    this.elements.productForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    this.elements.formFields.price.addEventListener('input', (e) => this.formatPrice(e));
    this.elements.formFields.imageUrl.addEventListener('blur', (e) => this.validateImageUrl(e));
  }

  showLoading() {
    this.elements.loading.style.display = 'block';
    this.elements.productsGrid.style.display = 'none';
  }

  hideLoading() {
    this.elements.loading.style.display = 'none';
    this.elements.productsGrid.style.display = 'grid';
  }

  showError(message) {
    this.elements.errorMessage.textContent = message;
    this.elements.errorMessage.style.display = 'block';
    setTimeout(() => this.elements.errorMessage.style.display = 'none', 5000);
  }

  showSuccess(message) {
    this.elements.successMessage.textContent = message;
    this.elements.successMessage.style.display = 'block';
    setTimeout(() => this.elements.successMessage.style.display = 'none', 3000);
  }

  async loadProducts() {
    try {
      this.showLoading();
      const { data, error } = await this.supabase.from('wines').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      
      this.allProducts = data || [];
      this.displayProducts(this.allProducts);
      this.updateStats();
      this.hideLoading();
    } catch (error) {
      console.error('Error cargando productos:', error);
      this.showError('Error al cargar los productos');
      this.hideLoading();
      throw error;
    }
  }

  displayProducts(products) {
    if (products.length === 0) {
      this.elements.productsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #ffffff;">
          <div style="font-size: 5rem; margin-bottom: 25px; opacity: 0.3;">🍷</div>
          <h3 style="font-family: 'Great Vibes', cursive; font-size: 2.5rem; color: #d4b896; margin-bottom: 20px;">No hay productos</h3>
          <p style="font-family: 'Sorts Mill Goudy', serif; font-size: 1.2rem; color: rgba(255, 255, 255, 0.7); margin-bottom: 30px;">
            ${this.allProducts.length === 0 ? 'Comience añadiendo su primer producto al catálogo' : 'Intente ajustar los filtros de búsqueda'}
          </p>
          ${this.allProducts.length === 0 && this.isConnected ? '<button onclick="adminPanel.openAddModal()" class="btn-primary" style="padding: 15px 30px; font-size: 1.1rem;">✨ Añadir Primer Producto</button>' : ''}
        </div>
      `;
      return;
    }

    this.elements.productsGrid.innerHTML = products.map(product => `
      <div class="product-card" data-product-id="${product.id}" style="
        display: flex; flex-direction: column; height: 100%;
        transition: all 0.3s ease; position: relative; overflow: hidden;
      ">
        <div class="product-image-container" style="
          position: relative; overflow: hidden; border-radius: 12px; margin-bottom: 15px;
          background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
        ">
          <img 
            src="${product.image_url}" 
            alt="${product.name}" 
            class="product-image" 
            style="transition: transform 0.4s ease; border-radius: 12px;"
            onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzMzMzMzIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIyMCIgZmlsbD0iI2Q0Yjg5NiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjZDRiODk2IiBmb250LXNpemU9IjEyIj5JbWFnZW4gbm8gZGlzcG9uaWJsZTwvdGV4dD4KPC9zdmc+'"
            loading="lazy"
          >
          <div class="product-overlay" style="
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.8));
            opacity: 0; transition: opacity 0.3s ease; display: flex; align-items: flex-end; padding: 15px;
          ">
            <span style="color: white; font-size: 0.9rem; font-family: 'Sorts Mill Goudy', serif;">👁️ Ver detalles</span>
          </div>
        </div>
        <div class="product-info" style="flex-grow: 1; display: flex; flex-direction: column;">
          <div class="product-name" style="font-size: 1.3rem; margin-bottom: 10px; line-height: 1.3;">${this.escapeHtml(product.name)}</div>
          <div class="product-price" style="font-size: 1.4rem; font-weight: 600; margin-bottom: 10px; color: #d4b896;">${this.escapeHtml(product.price)}</div>
          <div class="product-category" style="
            background: rgba(212, 184, 150, 0.2); padding: 6px 12px; border-radius: 20px;
            font-size: 0.8rem; display: inline-block; margin-bottom: 15px; border: 1px solid rgba(212, 184, 150, 0.3);
          ">${this.escapeHtml(product.category)}</div>
          ${product.description ? `<div class="product-description" style="
            font-size: 0.9rem; color: rgba(255, 255, 255, 0.6); margin: 10px 0; line-height: 1.5;
            flex-grow: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
          ">${this.escapeHtml(product.description)}</div>` : '<div style="flex-grow: 1;"></div>'}
        </div>
        <div class="product-actions" style="margin-top: auto; padding-top: 20px; display: flex; gap: 10px;">
          <button class="btn-secondary" onclick="adminPanel.editProduct('${product.id}')" style="
            flex: 1; padding: 12px; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 8px;
          ">✏️ Editar</button>
          <button class="btn-danger" onclick="adminPanel.deleteProduct('${product.id}')" style="
            flex: 1; padding: 12px; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 8px;
          ">🗑️ Eliminar</button>
        </div>
      </div>
    `).join('');

    // Agregar efectos hover
    this.addHoverEffects();
  }

  addHoverEffects() {
    document.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-8px)';
        this.style.boxShadow = '0 15px 35px rgba(212, 184, 150, 0.2)';
        const img = this.querySelector('.product-image');
        const overlay = this.querySelector('.product-overlay');
        if (img) img.style.transform = 'scale(1.05)';
        if (overlay) overlay.style.opacity = '1';
      });
      
      card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = 'initial';
        const img = this.querySelector('.product-image');
        const overlay = this.querySelector('.product-overlay');
        if (img) img.style.transform = 'scale(1)';
        if (overlay) overlay.style.opacity = '0';
      });
    });
  }

  filterProducts() {
    const searchTerm = this.elements.searchInput.value.toLowerCase().trim();
    const selectedCategory = this.elements.categoryFilter.value;

    const filtered = this.allProducts.filter(product => {
      const matchesSearch = searchTerm === '' || 
        product.name.toLowerCase().includes(searchTerm) ||
        (product.description && product.description.toLowerCase().includes(searchTerm)) ||
        product.category.toLowerCase().includes(searchTerm);
      
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    this.displayProducts(filtered);
  }

  openAddModal() {
    if (!this.isConnected) {
      this.showError('Funcionalidad no disponible en modo demostración');
      return;
    }
    
    this.currentEditingId = null;
    this.elements.modalTitle.textContent = 'Añadir Producto';
    this.elements.productForm.reset();
    this.clearValidationErrors();
    this.elements.modal.style.display = 'block';
    this.elements.formFields.name.focus();
  }

  closeModal() {
    this.elements.modal.style.display = 'none';
    this.clearValidationErrors();
  }

  async editProduct(id) {
    if (!this.isConnected) {
      this.showError('Funcionalidad no disponible en modo demostración');
      return;
    }
    
    try {
      const { data, error } = await this.supabase.from('wines').select('*').eq('id', id).single();
      if (error) throw error;

      this.currentEditingId = id;
      this.elements.modalTitle.textContent = 'Editar Producto';
      
      this.elements.formFields.name.value = data.name || '';
      this.elements.formFields.price.value = data.price || '';
      this.elements.formFields.category.value = data.category || '';
      this.elements.formFields.imageUrl.value = data.image_url || '';
      this.elements.formFields.description.value = data.description || '';
      
      this.clearValidationErrors();
      this.elements.modal.style.display = 'block';
      this.elements.formFields.name.focus();
    } catch (error) {
      console.error('Error cargando producto:', error);
      this.showError('Error al cargar el producto para editar');
    }
  }

  async deleteProduct(id) {
    if (!this.isConnected) {
      this.showError('Funcionalidad no disponible en modo demostración');
      return;
    }
    
    const product = this.allProducts.find(p => p.id === id);
    const productName = product ? product.name : 'este producto';
    
    if (!confirm(`¿Estás seguro de que quieres eliminar "${productName}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const { error } = await this.supabase.from('wines').delete().eq('id', id);
      if (error) throw error;

      this.showSuccess(`Producto "${productName}" eliminado exitosamente`);
      await this.loadProducts();
    } catch (error) {
      console.error('Error eliminando producto:', error);
      this.showError('Error al eliminar el producto');
    }
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    
    if (!this.isConnected) {
      this.showError('Funcionalidad no disponible en modo demostración');
      return;
    }
    
    const formData = this.getFormData();
    if (!this.validateFormData(formData)) return;

    try {
      await this.saveProduct(formData);
    } catch (error) {
      console.error('Error en el formulario:', error);
      this.showError('Error al procesar el formulario');
    }
  }

  getFormData() {
    return {
      name: this.elements.formFields.name.value.trim(),
      price: this.elements.formFields.price.value.trim(),
      category: this.elements.formFields.category.value,
      image_url: this.elements.formFields.imageUrl.value.trim(),
      description: this.elements.formFields.description.value.trim()
    };
  }

  validateFormData(formData) {
    this.clearValidationErrors();
    let isValid = true;

    if (!formData.name) {
      this.showFieldError('name', 'El nombre es requerido');
      isValid = false;
    } else if (formData.name.length < 2) {
      this.showFieldError('name', 'El nombre debe tener al menos 2 caracteres');
      isValid = false;
    }

    if (!formData.price) {
      this.showFieldError('price', 'El precio es requerido');
      isValid = false;
    } else if (!this.isValidPrice(formData.price)) {
      this.showFieldError('price', 'Formato de precio inválido (ej: $25.99)');
      isValid = false;
    }

    if (!formData.category) {
      this.showFieldError('category', 'La categoría es requerida');
      isValid = false;
    }

    if (!formData.image_url) {
      this.showFieldError('image_url', 'La URL de la imagen es requerida');
      isValid = false;
    } else if (!this.isValidUrl(formData.image_url)) {
      this.showFieldError('image_url', 'URL de imagen inválida');
      isValid = false;
    }

    return isValid;
  }

  async saveProduct(formData) {
    try {
      if (this.currentEditingId) {
        const { error } = await this.supabase.from('wines').update({
          name: formData.name, price: formData.price, category: formData.category,
          image_url: formData.image_url, description: formData.description || null,
          updated_at: new Date().toISOString()
        }).eq('id', this.currentEditingId);

        if (error) throw error;
        this.showSuccess('Producto actualizado exitosamente');
      } else {
        const { error } = await this.supabase.from('wines').insert([{
          name: formData.name, price: formData.price, category: formData.category,
          image_url: formData.image_url, description: formData.description || null
        }]);

        if (error) throw error;
        this.showSuccess('Producto añadido exitosamente');
      }

      this.closeModal();
      await this.loadProducts();
    } catch (error) {
      console.error('Error guardando producto:', error);
      if (error.message.includes('duplicate')) {
        this.showError('Ya existe un producto con ese nombre');
      } else if (error.message.includes('permission')) {
        this.showError('No tiene permisos para realizar esta acción');
      } else {
        this.showError('Error al guardar el producto. Inténtelo de nuevo.');
      }
    }
  }

  isValidPrice(price) {
    const priceRegex = /^\$?\d+(\.\d{1,2})?$/;
    return priceRegex.test(price);
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  formatPrice(e) {
    let value = e.target.value;
    value = value.replace(/[^0-9.$]/g, '');
    if (value.includes('$')) {
      value = '$' + value.replace(/\$/g, '');
    }
    e.target.value = value;
  }

  validateImageUrl(e) {
    const url = e.target.value.trim();
    if (url && !this.isValidUrl(url)) {
      this.showFieldError('image_url', 'URL inválida');
    } else {
      this.clearFieldError('image_url');
    }
  }

  showFieldError(fieldName, message) {
    const field = this.elements.formFields[fieldName] || document.getElementById(`product-${fieldName.replace('_', '-')}`);
    if (field) {
      field.style.borderColor = '#dc3545';
      
      const existingError = field.parentNode.querySelector('.field-error');
      if (existingError) existingError.remove();
      
      const errorDiv = document.createElement('div');
      errorDiv.className = 'field-error';
      errorDiv.style.cssText = 'color: #dc3545; font-size: 0.85rem; margin-top: 5px; font-family: "Sorts Mill Goudy", serif;';
      errorDiv.textContent = message;
      field.parentNode.appendChild(errorDiv);
    }
  }

  clearFieldError(fieldName) {
    const field = this.elements.formFields[fieldName] || document.getElementById(`product-${fieldName.replace('_', '-')}`);
    if (field) {
      field.style.borderColor = 'rgba(212, 184, 150, 0.3)';
      const errorDiv = field.parentNode.querySelector('.field-error');
      if (errorDiv) errorDiv.remove();
    }
  }

  clearValidationErrors() {
    Object.keys(this.elements.formFields).forEach(fieldName => {
      this.clearFieldError(fieldName);
    });
  }

  escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  getProductStats() {
    const stats = { total: this.allProducts.length, byCategory: {} };
    this.allProducts.forEach(product => {
      if (!stats.byCategory[product.category]) {
        stats.byCategory[product.category] = 0;
      }
      stats.byCategory[product.category]++;
    });
    return stats;
  }

  updateStats() {
    const stats = this.getProductStats();
    const statsContainer = document.getElementById('stats-container');
    if (statsContainer) {
      statsContainer.style.display = stats.total > 0 ? 'flex' : 'none';
    }
    
    const updateStat = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value || 0;
    };
    
    updateStat('total-products', stats.total);
    updateStat('total-tintos', stats.byCategory['Tintos']);
    updateStat('total-blancos', stats.byCategory['Blancos y Rosados']);
    updateStat('total-espumosos', stats.byCategory['Champagne y Espumosos']);
    updateStat('total-destilados', stats.byCategory['Destilados y Otras Bebidas']);
  }
}

// Inicializar
let adminPanel;
document.addEventListener('DOMContentLoaded', function() {
  adminPanel = new AdminPanel();
});
window.adminPanel = adminPanel;
