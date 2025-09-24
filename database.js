// Firebase-powered database for GRIITX Store
// This file connects to the central Firestore database.

class GRIITXDatabase {
  constructor() {
    // The 'db' object is created in the HTML script tag from Firebase
    if (!window.db) {
      console.error("Firebase Firestore is not initialized! Make sure the config is in your HTML.");
      alert("DATABASE CONNECTION FAILED. Check console.");
      return;
    }
    this.db = window.db;
  }

  // ===== STOCK MANAGEMENT =====
  async getAllStock() {
    try {
      const snapshot = await this.db.collection('stock').get();
      if (snapshot.empty) {
        console.warn("No documents found in the 'stock' collection.");
        return {};
      }
      const stock = {};
      snapshot.forEach(doc => { stock[doc.id] = doc.data(); });
      return stock;
    } catch (e) {
      console.error("Error fetching stock:", e);
    }
    return stock;
  }

  async getProductStock(productId) {
    const doc = await this.db.collection('stock').doc(productId).get();
    if (!doc.exists) return { S: 0, M: 0, L: 0, XL: 0 };
    return doc.data();
  }

  async setProductStock(productId, stockMap) {
    const cleanStock = {
      S: Math.max(0, parseInt(stockMap.S, 10) || 0),
      M: Math.max(0, parseInt(stockMap.M, 10) || 0),
      L: Math.max(0, parseInt(stockMap.L, 10) || 0),
      XL: Math.max(0, parseInt(stockMap.XL, 10) || 0)
    };
    await this.db.collection('stock').doc(productId).set(cleanStock, { merge: true });
    return cleanStock;
  }

  // ===== ORDER MANAGEMENT =====
  async addPreorder(preorder) {
    const docRef = await this.db.collection('orders').add({
      ...preorder,
      createdAt: new Date() // Use server date for accuracy
    });
    return { ...preorder, id: docRef.id };
  }

  async getAllPreorders() {
    const snapshot = await this.db.collection('orders').orderBy('createdAt', 'desc').get();
    if (snapshot.empty) return [];
    const orders = [];
    snapshot.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
    return orders;
  }

  async deletePreorder(id) {
    await this.db.collection('orders').doc(id).delete();
    return true;
  }

  async clearAll() {
    const snapshot = await this.db.collection('orders').get();
    const batch = this.db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    return true;
  }

  // ===== UTILITIES =====
  exportToCSV(data) {
    if (data.length === 0) return '';

    const headers = ['ID', 'Date', 'Name', 'Phone', 'Email', 'Items', 'Total', 'Notes'];
    const rows = data.map(preorder => {
      const items = preorder.payload?.items || [];
      const itemsText = items.map(item => `${item.name} (Size: ${item.size}) x${item.qty}`).join('; ');
      const date = preorder.createdAt.toDate ? preorder.createdAt.toDate() : new Date(preorder.createdAt);

      return [
        preorder.id,
        date.toLocaleDateString(),
        `"${preorder.name}"`,
        preorder.phone,
        preorder.email || '',
        `"${itemsText}"`,
        preorder.payload?.total || 0,
        `"${preorder.notes || ''}"`
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}

// Create global database instance
window.griitxDB = new GRIITXDatabase();
