const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /* ── Products ── */
  products: {
    getAll: () => ipcRenderer.invoke('products:getAll'),
    getById: (id) => ipcRenderer.invoke('products:getById', id),
    search: (term) => ipcRenderer.invoke('products:search', term),
    add: (product) => ipcRenderer.invoke('products:add', product),
    update: (id, product) => ipcRenderer.invoke('products:update', id, product),
    delete: (id) => ipcRenderer.invoke('products:delete', id),
    lowStock: (threshold) => ipcRenderer.invoke('products:lowStock', threshold),
    expiring: (days) => ipcRenderer.invoke('products:expiring', days),
    getLastPrice: (name) => ipcRenderer.invoke('products:getLastPrice', name),
  },

  /* ── Sales ── */
  sales: {
    create: (data) => ipcRenderer.invoke('sales:create', data),
    getAll: () => ipcRenderer.invoke('sales:getAll'),
    getById: (id) => ipcRenderer.invoke('sales:getById', id),
    getByInvoice: (inv) => ipcRenderer.invoke('sales:getByInvoice', inv),
    getByDateRange: (from, to) => ipcRenderer.invoke('sales:getByDateRange', from, to),
    getToday: () => ipcRenderer.invoke('sales:getToday'),
  },

  /* ── Purchases ── */
  purchases: {
    create: (data) => ipcRenderer.invoke('purchases:create', data),
    getAll: () => ipcRenderer.invoke('purchases:getAll'),
    getById: (id) => ipcRenderer.invoke('purchases:getById', id),
  },

  /* ── Purchases ── */
  purchases: {
    create: (data) => ipcRenderer.invoke('purchases:create', data),
    getAll: () => ipcRenderer.invoke('purchases:getAll'),
    getById: (id) => ipcRenderer.invoke('purchases:getById', id),
  },

  /* ── Expenses ── */
  expenses: {
    getAll: () => ipcRenderer.invoke('expenses:getAll'),
    add: (data) => ipcRenderer.invoke('expenses:add', data),
    delete: (id) => ipcRenderer.invoke('expenses:delete', id),
  },

  /* ── Dashboard ── */
  stats: {
    dashboard: () => ipcRenderer.invoke('stats:dashboard'),
    getMonthly: () => ipcRenderer.invoke('stats:getMonthly'),
  },

  /* ── Reports ── */
  reports: {
    sales: (from, to) => ipcRenderer.invoke('reports:sales', from, to),
    purchases: (from, to) => ipcRenderer.invoke('reports:purchases', from, to),
    stock: () => ipcRenderer.invoke('reports:stock'),
  },

  /* ── Parties ── */
  parties: {
    getAll: (type) => ipcRenderer.invoke('parties:getAll', type),
    getById: (id) => ipcRenderer.invoke('parties:getById', id),
    add: (data) => ipcRenderer.invoke('parties:add', data),
    update: (id, data) => ipcRenderer.invoke('parties:update', id, data),
    delete: (id) => ipcRenderer.invoke('parties:delete', id),
    updateBalance: (id, amount) => ipcRenderer.invoke('parties:updateBalance', id, amount),
    getLedger: (id) => ipcRenderer.invoke('parties:getLedger', id),
    recordPayment: (data) => ipcRenderer.invoke('parties:recordPayment', data),
  },

  /* ── AI ── */
  ai: {
    selectFile: () => ipcRenderer.invoke('ai:selectFile'),
    parseInvoice: (data) => ipcRenderer.invoke('ai:parseInvoice', data),
    printInvoice: (html) => ipcRenderer.invoke('ai:printInvoice', html),
  },

  /* ── Settings ── */
  settings: {
    getGeminiKey: () => ipcRenderer.invoke('settings:getGeminiKey'),
    setGeminiKey: (key) => ipcRenderer.invoke('settings:setGeminiKey', key),
    resetData: () => ipcRenderer.invoke('settings:resetData'),
  },

  /* ── Business Profile ── */
  business: {
    getProfile: () => ipcRenderer.invoke('business:getProfile'),
    updateProfile: (data) => ipcRenderer.invoke('business:updateProfile', data),
    pickLogo: () => ipcRenderer.invoke('business:pickLogo'),
  },

  /* ── Categories ── */
  categories: {
    getAll: () => ipcRenderer.invoke('categories:getAll'),
    add: (name) => ipcRenderer.invoke('categories:add', name),
    delete: (id) => ipcRenderer.invoke('categories:delete', id),
  },

  /* ── Expense Categories ── */
  expenseCategories: {
    getAll: () => ipcRenderer.invoke('expenseCategories:getAll'),
    add: (name) => ipcRenderer.invoke('expenseCategories:add', name),
    delete: (id) => ipcRenderer.invoke('expenseCategories:delete', id),
  },

  /* ── Product Attributes ── */
  attributes: {
    getAll: () => ipcRenderer.invoke('attributes:getAll'),
    add: (attr) => ipcRenderer.invoke('attributes:add', attr),
    delete: (id) => ipcRenderer.invoke('attributes:delete', id),
  },
  
  /* ── PDF ── */
  pdf: {
    generate: (html) => ipcRenderer.invoke('pdf:generate', html),
    saveAs: (base64, name) => ipcRenderer.invoke('pdf:saveAs', base64, name),
    share: (base64) => ipcRenderer.invoke('pdf:share', base64),
  },

  /* ── Data Management ── */
  storage: {
    exportData: () => ipcRenderer.invoke('storage:export'),
    importData: () => ipcRenderer.invoke('storage:import'),
  },

  /* ── System ── */
  system: {
    checkUpdate: () => ipcRenderer.invoke('app:checkUpdate'),
  }
});
