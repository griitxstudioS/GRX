// Simple JSON database for GRIITX preorders
// This file acts as a local database

class GRIITXDatabase {
  constructor() {
    this.dbName = 'griitx_preorders';
    this.stockKey = 'griitx_stock_v1';
    this.productsKey = 'griitx_products_v1';
    this.data = this.loadData();
    this.stock = this.loadStock();
    this.products = this.loadProducts();
    // Seed defaults on first run so old products remain available
    if (!this.products || this.products.length === 0) {
      try { this.seedDefaultProducts(); } catch(_) {}
    }
  }

  loadData() {
    try {
      const stored = localStorage.getItem(this.dbName);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading database:', error);
      return [];
    }
  }

  saveData() {
    try {
      localStorage.setItem(this.dbName, JSON.stringify(this.data));
      return true;
    } catch (error) {
      console.error('Error saving database:', error);
      return false;
    }
  }

  // ===== STOCK MANAGEMENT =====
  loadStock() {
    try {
      const raw = localStorage.getItem(this.stockKey);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('Error loading stock:', e);
      return {};
    }
  }

  saveStock() {
    try {
      localStorage.setItem(this.stockKey, JSON.stringify(this.stock));
      return true;
    } catch (e) {
      console.error('Error saving stock:', e);
      return false;
    }
  }

  // ===== PRODUCTS MANAGEMENT =====
  loadProducts() {
    try {
      const raw = localStorage.getItem(this.productsKey);
      const products = raw ? JSON.parse(raw) : [];
      return Array.isArray(products) ? products : [];
    } catch (e) {
      console.error('Error loading products:', e);
      return [];
    }
  }

  saveProducts() {
    try {
      localStorage.setItem(this.productsKey, JSON.stringify(this.products));
      return true;
    } catch (e) {
      console.error('Error saving products:', e);
      return false;
    }
  }

  seedDefaultProducts() {
    const defaults = [
      { id: 'sanji', name: 'Sanji Oversized T-Shirt – Purple Grunge Edition', price: 1599, originalPrice: 1999, img:'sanji-main.png', images:['sanji-main.png'], sizes:['S','M','L','XL'] },
      { id: 'gyomei', name: 'Gyomei Oversized T-Shirt – Black Acid Wash Edition', price: 1599, originalPrice: 1999, img:'gyomei-main.png', images:['gyomei-main.png'], sizes:['S','M','L','XL'] },
      { id: 'rengoku', name: 'Rengoku Oversized T-Shirt – Red & Black Tie-Dye Edition', price: 1599, originalPrice: 1999, img:'rengoku-main.png', images:['rengoku-main.png'], sizes:['S','M','L','XL'] },
      { id: 'tanjiro', name: 'Tanjiro Oversized T-Shirt – Solid Black Edition', price: 1599, originalPrice: 1999, img:'tanjiro-main.png', images:['tanjiro-main.png'], sizes:['S','M','L','XL'] }
    ];
    this.products = defaults;
    this.saveProducts();
    defaults.forEach(d => this.ensureProductStock(d.id));
    this.saveStock();
  }

  getProducts() {
    return JSON.parse(JSON.stringify(this.products));
  }

  getProductById(productId) {
    return this.products.find(p => p.id === productId) || null;
  }

  /**
   * Adds a product. product: { id, name, description, price, originalPrice, img, images?, video?, sizes? }
   */
  addProduct(product) {
    if (!product || !product.id) throw new Error('Product id required');
    const existing = this.getProductById(product.id);
    if (existing) throw new Error('Product with this id already exists');
    const prod = {
      id: String(product.id),
      name: product.name || 'New Product',
      description: product.description || '',
      price: parseInt(product.price, 10) || 0,
      originalPrice: parseInt(product.originalPrice, 10) || 0,
      img: product.img || '',
      images: Array.isArray(product.images) ? product.images : [],
      video: product.video || '',
      sizes: Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ['S','M','L','XL']
    };
    this.products.push(prod);
    this.saveProducts();
    // Initialize stock
    this.ensureProductStock(prod.id);
    this.saveStock();
    return prod;
  }

  updateProduct(productId, updates) {
    const idx = this.products.findIndex(p => p.id === productId);
    if (idx === -1) throw new Error('Product not found');
    const prev = this.products[idx];
    const merged = {
      ...prev,
      ...updates,
      id: prev.id,
      price: updates.price !== undefined ? parseInt(updates.price, 10) || 0 : prev.price,
      originalPrice: updates.originalPrice !== undefined ? parseInt(updates.originalPrice, 10) || 0 : prev.originalPrice,
      sizes: Array.isArray(updates.sizes) && updates.sizes.length ? updates.sizes : prev.sizes,
    };
    this.products[idx] = merged;
    this.saveProducts();
    return merged;
  }

  deleteProduct(productId) {
    const idx = this.products.findIndex(p => p.id === productId);
    if (idx === -1) return false;
    this.products.splice(idx, 1);
    this.saveProducts();
    // Optionally clean stock
    if (this.stock[productId]) {
      delete this.stock[productId];
      this.saveStock();
    }
    return true;
  }

  /**
   * Ensure product stock object exists with S/M/L/XL integers
   */
  ensureProductStock(productId) {
    if (!this.stock[productId]) {
      this.stock[productId] = { S: 0, M: 0, L: 0, XL: 0 };
    }
    return this.stock[productId];
  }

  getAllStock() {
    return JSON.parse(JSON.stringify(this.stock));
  }

  getProductStock(productId) {
    return { ...this.ensureProductStock(productId) };
  }

  setProductStock(productId, stockMap) {
    const current = this.ensureProductStock(productId);
    this.stock[productId] = {
      S: Math.max(0, parseInt(stockMap.S ?? current.S, 10) || 0),
      M: Math.max(0, parseInt(stockMap.M ?? current.M, 10) || 0),
      L: Math.max(0, parseInt(stockMap.L ?? current.L, 10) || 0),
      XL: Math.max(0, parseInt(stockMap.XL ?? current.XL, 10) || 0)
    };
    this.saveStock();
    return this.getProductStock(productId);
  }

  updateSizeStock(productId, size, delta) {
    const s = this.ensureProductStock(productId);
    const key = String(size).toUpperCase();
    if (!['S','M','L','XL'].includes(key)) return false;
    s[key] = Math.max(0, (parseInt(s[key], 10) || 0) + (parseInt(delta, 10) || 0));
    this.saveStock();
    return true;
  }

  /**
   * Check if payload items can be fulfilled by stock
   * payload: { items: [{ id,name,size,qty }] }
   */
  canFulfill(payload) {
    const needed = {};
    (payload?.items || []).forEach(it => {
      const pid = it.id;
      const size = String(it.size).toUpperCase();
      const qty = parseInt(it.qty, 10) || 0;
      if (!needed[pid]) needed[pid] = { S:0,M:0,L:0,XL:0 };
      if (['S','M','L','XL'].includes(size)) needed[pid][size] += qty;
    });

    return Object.entries(needed).every(([pid, req]) => {
      const s = this.ensureProductStock(pid);
      return ['S','M','L','XL'].every(sz => (s[sz] || 0) >= (req[sz] || 0));
    });
  }

  /**
   * Reserve stock (decrement) if available, returns { ok:boolean, error?:string }
   */
  reserveStock(payload) {
    if (!this.canFulfill(payload)) {
      return { ok: false, error: 'Insufficient stock' };
    }
    (payload?.items || []).forEach(it => {
      const pid = it.id;
      const size = String(it.size).toUpperCase();
      const qty = parseInt(it.qty, 10) || 0;
      if (!['S','M','L','XL'].includes(size)) return;
      const s = this.ensureProductStock(pid);
      s[size] = Math.max(0, (s[size] || 0) - qty);
    });
    this.saveStock();
    return { ok: true };
  }

  // Add new preorder
  addPreorder(preorder) {
    const newPreorder = {
      id: Math.floor(Date.now() + Math.random() * 1000), // Generate unique numeric ID
      ...preorder,
      createdAt: new Date().toISOString()
    };
    
    this.data.unshift(newPreorder); // Add to beginning
    this.saveData();
    return newPreorder;
  }

  // Get all preorders
  getAllPreorders() {
    return [...this.data]; // Return copy
  }

  // Search preorders by Order ID only
  searchPreorders(query) {
    if (!query) return this.getAllPreorders();
    
    const searchTerm = query.toString().trim();
    return this.data.filter(preorder => 
      preorder.id.toString().includes(searchTerm)
    );
  }

  // Delete preorder by ID
  deletePreorder(id) {
    const index = this.data.findIndex(p => p.id == id);
    if (index !== -1) {
      this.data.splice(index, 1);
      this.saveData();
      return true;
    }
    return false;
  }

  // Clear all preorders
  clearAll() {
    this.data = [];
    this.saveData();
    return true;
  }

  // Get preorder count
  getCount() {
    return this.data.length;
  }

  // Export to CSV format
  exportToCSV() {
    if (this.data.length === 0) return '';
    
    const headers = ['ID', 'Date', 'Name', 'Phone', 'Email', 'Items', 'Total', 'Notes'];
    const rows = this.data.map(preorder => {
      const items = preorder.payload?.items || [];
      const itemsText = items.map(item => `${item.name} (Size: ${item.size}) x${item.qty}`).join('; ');
      
      return [
        preorder.id,
        new Date(preorder.createdAt).toLocaleDateString(),
        `"${preorder.name}"`,
        preorder.phone,
        preorder.email || '',
        `"${itemsText}"`,
        preorder.payload?.total || 0,
        `"${preorder.notes || ''}"`
      ];
    });
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

// Create global database instance
window.griitxDB = new GRIITXDatabase();


