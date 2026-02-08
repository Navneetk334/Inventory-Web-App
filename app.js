/**
 * Primal Barcode Pro - Application Logic
 */

// --- State Management ---
let state = {
    products: JSON.parse(localStorage.getItem('p_pro_products')) || [],
    categories: JSON.parse(localStorage.getItem('p_pro_categories')) || ['Stationery', 'Electronics', 'Home'],
    logs: JSON.parse(localStorage.getItem('p_pro_logs')) || [],
    profile: JSON.parse(localStorage.getItem('p_pro_profile')) || {
        companyName: 'Primal Pro',
        profileImage: null
    },
    settings: JSON.parse(localStorage.getItem('p_pro_settings')) || {
        currency: '₹',
        lowStockThreshold: 10
    },
    auth: {
        password: localStorage.getItem('p_pro_password') || null, // Master Store Password
        isLoggedIn: sessionStorage.getItem('p_pro_session') === 'true'
    },
    currentView: 'dashboard',
    theme: localStorage.getItem('p_pro_theme') || 'light',
    sidebarCollapsed: localStorage.getItem('p_pro_sidebar') === 'true',
    selectedProducts: []
};

const saveState = () => {
    localStorage.setItem('p_pro_products', JSON.stringify(state.products));
    localStorage.setItem('p_pro_categories', JSON.stringify(state.categories));
    localStorage.setItem('p_pro_logs', JSON.stringify(state.logs));
    localStorage.setItem('p_pro_profile', JSON.stringify(state.profile));
    localStorage.setItem('p_pro_settings', JSON.stringify(state.settings));
    localStorage.setItem('p_pro_theme', state.theme);
    localStorage.setItem('p_pro_sidebar', state.sidebarCollapsed);
    if (state.auth.password) localStorage.setItem('p_pro_password', state.auth.password);
};

const addLog = (type, action, details) => {
    const log = {
        id: Date.now(),
        type,
        action,
        details,
        timestamp: new Date().toLocaleString()
    };
    state.logs.unshift(log);
    if (state.logs.length > 100) state.logs.pop();
    saveState();
};

// --- DOM Elements ---
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const viewTitle = document.getElementById('view-title');
const contentArea = document.getElementById('content-area');
const navItems = document.querySelectorAll('.nav-item');
const themeToggleSingle = document.getElementById('theme-toggle-single');
const fabAdd = document.getElementById('fab-add');
const productModal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');
const categoryModal = document.getElementById('category-modal');
const categoryForm = document.getElementById('category-form');
const profileTrigger = document.getElementById('profile-trigger');
const globalSearch = document.getElementById('global-search');
const bulkBar = document.getElementById('bulk-print-bar');

// Auth DOM
const loginOverlay = document.getElementById('login-overlay');
const loginForm = document.getElementById('login-form');
const loginPasswordInput = document.getElementById('login-password');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    applyState();
    renderCurrentView();
    setupEventListeners();
});

const checkAuth = () => {
    if (!state.auth.password) {
        // First time setup
        document.body.classList.add('logged-out');
        loginOverlay.classList.remove('hidden');
        document.getElementById('login-title').textContent = 'Secure Your Store';
        document.getElementById('login-subtitle').textContent = 'Set a master password to protect your inventory';
        document.getElementById('login-input-label').textContent = 'Create Master Password';
    } else if (!state.auth.isLoggedIn) {
        // Require Login
        document.body.classList.add('logged-out');
        loginOverlay.classList.remove('hidden');
        const logo = state.profile.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(state.profile.companyName)}&background=6366f1&color=fff`;
        document.getElementById('login-logo-img').src = logo;
    } else {
        // Logged In
        document.body.classList.remove('logged-out');
        loginOverlay.classList.add('hidden');
    }
};

const applyState = () => {
    document.body.setAttribute('data-theme', state.theme);
    updateThemeIcon();

    if (state.sidebarCollapsed) sidebar.classList.add('collapsed');

    // Sync Profile
    document.getElementById('display-company').textContent = state.profile.companyName;
    document.getElementById('sidebar-company-name').textContent = state.profile.companyName;

    const profileImg = state.profile.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(state.profile.companyName)}&background=6366f1&color=fff`;
    document.getElementById('display-profile-img').src = profileImg;
    document.getElementById('sidebar-logo-img').src = profileImg;
};

const updateThemeIcon = () => {
    const icon = themeToggleSingle.querySelector('.theme-icon');
    icon.textContent = state.theme === 'light' ? '🌙' : '☀️';
};

// --- View Rendering ---
const renderCurrentView = () => {
    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.view === state.currentView);
    });

    fabAdd.style.display = (state.currentView === 'products' || state.currentView === 'dashboard') ? 'flex' : 'none';
    document.body.classList.remove('bulk-active');

    switch (state.currentView) {
        case 'dashboard': renderDashboard(); break;
        case 'products': renderProducts(); break;
        case 'categories': renderCategories(); break;
        case 'stock': renderStock(); break;
        case 'activity': renderActivity(); break;
        case 'settings': renderSettings(); break;
    }
};

const renderDashboard = () => {
    viewTitle.textContent = 'Dashboard';
    const totalStock = state.products.reduce((acc, p) => acc + parseInt(p.stock || 0), 0);

    contentArea.innerHTML = `
        <div class="dashboard-grid">
            <div class="stats-card card-categories" onclick="switchView('categories')">
                <div class="label">Total Categories</div>
                <div class="value">${state.categories.length}</div>
            </div>
            <div class="stats-card card-products" onclick="switchView('products')">
                <div class="label">Total Products</div>
                <div class="value">${state.products.length}</div>
            </div>
            <div class="stats-card card-stock" onclick="switchView('stock')">
                <div class="label">Total Stock Items</div>
                <div class="value">${totalStock}</div>
            </div>
        </div>
        <h3 style="margin-bottom: 20px;">Recent Activity</h3>
        <div class="activity-list">
            ${state.logs.slice(0, 5).map(log => `
                <div class="activity-item">
                    <strong>${log.action}</strong>: ${log.details}
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${log.timestamp}</div>
                </div>
            `).join('') || '<p>No recent activity</p>'}
        </div>
    `;
};

const renderProducts = () => {
    viewTitle.textContent = 'All Products';
    const searchTerm = globalSearch.value.toLowerCase();
    const filtered = state.products.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.barcode.toLowerCase().includes(searchTerm) ||
        (p.brand && p.brand.toLowerCase().includes(searchTerm))
    );

    contentArea.innerHTML = `
        <div class="data-table-container">
            <table>
                <thead>
                    <tr>
                        <th class="checkbox-col"><input type="checkbox" id="select-all"></th>
                        <th>Product Details</th>
                        <th>Category</th>
                        <th>Barcode (SKU)</th>
                        <th>Stock</th>
                        <th>Price</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(p => `
                        <tr>
                            <td class="checkbox-col"><input type="checkbox" class="prod-select" data-id="${p.id}" ${state.selectedProducts.includes(p.id) ? 'checked' : ''}></td>
                            <td>
                                <strong>${p.name}</strong><br>
                                <span style="font-size: 0.8rem; color: var(--text-muted);">${p.brand || 'No Brand'}</span>
                            </td>
                            <td><span class="badge">${p.category}</span></td>
                            <td><code>${p.barcode}</code></td>
                            <td>${p.stock}</td>
                            <td>${state.settings.currency}${parseFloat(p.price).toFixed(2)}</td>
                            <td class="action-btns">
                                <button class="icon-btn" onclick="printSingle('${p.id}')" title="Print Barcode">🖨️</button>
                                <button class="icon-btn" onclick="editProduct('${p.id}')" title="Edit Product">✏️</button>
                                <button class="icon-btn" onclick="deleteProduct('${p.id}')" title="Delete Product">🗑️</button>
                            </td>
                        </tr>
                    `).join('') || '<tr><td colspan="7" style="text-align:center">No products found</td></tr>'}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('select-all').addEventListener('change', toggleSelectAll);
    document.querySelectorAll('.prod-select').forEach(cb => cb.addEventListener('change', toggleItemSelection));
    updateBulkBar();
};

const renderStock = () => {
    viewTitle.textContent = 'Stock Forecast';
    const threshold = parseInt(state.settings.lowStockThreshold);
    const lowStock = state.products.filter(p => parseInt(p.stock) <= threshold);
    const totalValue = state.products.reduce((acc, p) => acc + (parseFloat(p.price) * parseInt(p.stock)), 0);

    contentArea.innerHTML = `
        <div class="dashboard-grid">
            <div class="stats-card card-stock">
                <div class="label">Low Stock (At or Below ${threshold})</div>
                <div class="value" style="color: #ef4444;">${lowStock.length}</div>
            </div>
            <div class="stats-card card-stock">
                <div class="label">Inventory Value</div>
                <div class="value">${state.settings.currency}${totalValue.toFixed(2)}</div>
            </div>
        </div>
        <h3>Stock Inventory List</h3>
        <div class="data-table-container">
            <table>
                <thead>
                    <tr><th>Product</th><th>Barcode</th><th>Stock Level</th><th>Status</th></tr>
                </thead>
                <tbody>
                    ${state.products.map(p => {
        const s = parseInt(p.stock);
        const status = s <= threshold ? '<span style="color:#ef4444; font-weight:bold;">Low Stock</span>' : '<span style="color:#22c55e;">In Stock</span>';
        return `
                            <tr>
                                <td><strong>${p.name}</strong></td>
                                <td><code>${p.barcode}</code></td>
                                <td>${p.stock}</td>
                                <td>${status}</td>
                            </tr>
                        `;
    }).join('') || '<tr><td colspan="4">No stock data</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
};

const renderSettings = () => {
    viewTitle.textContent = 'Global Settings';
    contentArea.innerHTML = `
        <div class="settings-page">
            <div class="settings-section">
                <h3>Profile Settings</h3>
                <div class="settings-row">
                    <div class="form-group">
                        <label>Company Name</label>
                        <input type="text" id="set-company" value="${state.profile.companyName}">
                    </div>
                    <div class="form-group">
                        <label>Profile Image / Logo</label>
                        <div class="image-upload-wrapper">
                            <img id="set-preview-img" class="profile-preview-large" src="${state.profile.profileImage || 'https://ui-avatars.com/api/?name=' + state.profile.companyName}" alt="Preview">
                            <input type="file" id="set-input-img" accept="image/*">
                        </div>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3>System Configuration</h3>
                <div class="settings-row">
                    <div class="form-group">
                        <label>Currency Symbol</label>
                        <select id="set-currency">
                            <option value="₹" ${state.settings.currency === '₹' ? 'selected' : ''}>INR (₹)</option>
                            <option value="$" ${state.settings.currency === '$' ? 'selected' : ''}>USD ($)</option>
                            <option value="€" ${state.settings.currency === '€' ? 'selected' : ''}>EUR (€)</option>
                            <option value="£" ${state.settings.currency === '£' ? 'selected' : ''}>GBP (£)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Low Stock Alert Threshold</label>
                        <input type="number" id="set-threshold" value="${state.settings.lowStockThreshold}" min="1">
                    </div>
                </div>
                <div class="settings-row">
                    <div class="form-group">
                        <label>Change Master Password</label>
                        <input type="password" id="set-new-password" placeholder="Enter new password">
                    </div>
                    <div class="form-group" style="display:flex; align-items:flex-end;">
                        <p style="font-size:0.75rem; color:var(--text-muted);">Master password secures your entire store data.</p>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3>Data Portability (Backup & Restore)</h3>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom: 20px;">Use this for moving your store data between laptops for the demo.</p>
                <div style="display: flex; gap: 12px;">
                    <button class="secondary-btn" onclick="exportData()">📤 Export Data (.json)</button>
                    <button class="secondary-btn" onclick="triggerImport()">📥 Restore Data (Import)</button>
                    <input type="file" id="import-file" accept=".json" style="display:none" onchange="importData(this)">
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px;">
                <button class="primary-btn" onclick="saveSettings()">Save All Settings</button>
                <button class="secondary-btn" onclick="logout()">Logout</button>
            </div>
        </div>
    `;

    // Handle Setting Image Preview
    document.getElementById('set-input-img').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (re) => {
                document.getElementById('set-preview-img').src = re.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
};

const renderCategories = () => {
    viewTitle.textContent = 'Manage Categories';
    contentArea.innerHTML = `
        <div style="margin-bottom: 24px; display: flex; justify-content: flex-end;">
            <button class="primary-btn" onclick="openCategoryModal()">+ Add Category</button>
        </div>
        <div class="data-table-container">
            <table>
                <thead>
                    <tr><th style="padding-left: 20px;">Category Name</th><th style="text-align: center;">Products Count</th><th style="text-align: right; padding-right: 20px;">Actions</th></tr>
                </thead>
                <tbody>
                    ${state.categories.map(cat => {
        const count = state.products.filter(p => p.category === cat).length;
        return `
                            <tr>
                                <td style="padding-left: 20px;"><strong>${cat}</strong></td>
                                <td style="text-align: center;">${count} items</td>
                                <td class="action-btns" style="text-align: right; padding-right: 20px; justify-content: flex-end;">
                                    <button class="icon-btn" onclick="deleteCategory('${cat}')" title="Delete Category">🗑️</button>
                                </td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </div>
    `;
};

const renderActivity = () => {
    viewTitle.textContent = 'Activity Feed';
    contentArea.innerHTML = `
        <div class="activity-feed">
            ${state.logs.map(log => `
                <div class="activity-item">
                    <div style="display: flex; justify-content: space-between;">
                        <strong>${log.action}</strong>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">${log.timestamp}</span>
                    </div>
                    <div style="margin-top: 4px;">${log.details}</div>
                </div>
            `).join('') || '<p>No activity yet</p>'}
        </div>
    `;
};

// --- Logic Helpers ---

window.saveSettings = () => {
    state.profile.companyName = document.getElementById('set-company').value;
    state.profile.profileImage = document.getElementById('set-preview-img').src;
    state.settings.currency = document.getElementById('set-currency').value;
    state.settings.lowStockThreshold = document.getElementById('set-threshold').value;

    const newPass = document.getElementById('set-new-password').value;
    if (newPass) {
        state.auth.password = newPass;
        addLog('System', 'Updated Security', 'Master password changed');
    }

    addLog('System', 'Updated Settings', 'Global configuration changed');
    saveState();
    applyState();
    alert('Settings saved successfully!');
    renderCurrentView();
};

window.logout = () => {
    state.auth.isLoggedIn = false;
    sessionStorage.removeItem('p_pro_session');
    checkAuth();
};

window.exportData = () => {
    const data = {
        products: state.products,
        categories: state.categories,
        logs: state.logs,
        profile: state.profile,
        settings: state.settings,
        password: state.auth.password
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `primal_pro_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('System', 'Exported Data', 'Created full backup for demo');
};

window.triggerImport = () => {
    document.getElementById('import-file').click();
};

window.importData = (input) => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.products || !data.categories) throw new Error('Invalid format');

            state.products = data.products;
            state.categories = data.categories;
            state.logs = data.logs || [];
            state.profile = data.profile || state.profile;
            state.settings = data.settings || state.settings;
            state.auth.password = data.password || state.auth.password;

            saveState();
            alert('Data restored successfully! The app will now reload.');
            window.location.reload();
        } catch (err) {
            alert('Error importing data. Please ensure the file is a valid Primal Pro backup.');
        }
    };
    reader.readAsText(file);
};

window.switchView = (view) => {
    state.currentView = view;
    renderCurrentView();
};

const toggleSelectAll = (e) => {
    const isChecked = e.target.checked;
    const checkboxes = document.querySelectorAll('.prod-select');
    state.selectedProducts = isChecked ? state.products.map(p => p.id) : [];
    checkboxes.forEach(cb => cb.checked = isChecked);
    updateBulkBar();
};

const toggleItemSelection = (e) => {
    const id = e.target.dataset.id;
    if (e.target.checked) {
        if (!state.selectedProducts.includes(id)) state.selectedProducts.push(id);
    } else {
        state.selectedProducts = state.selectedProducts.filter(sid => sid !== id);
    }
    updateBulkBar();
};

const updateBulkBar = () => {
    const count = state.selectedProducts.length;
    document.getElementById('selected-count').textContent = count;
    bulkBar.classList.toggle('hidden', count === 0);
    document.body.classList.toggle('bulk-active', count > 0);
};

const setupEventListeners = () => {
    // Auth Listener
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pwd = loginPasswordInput.value;

        if (!state.auth.password) {
            // Setup
            state.auth.password = pwd;
            state.auth.isLoggedIn = true;
            sessionStorage.setItem('p_pro_session', 'true');
            saveState();
            checkAuth();
            alert('Store password set successfully!');
        } else if (pwd === state.auth.password) {
            // Success
            state.auth.isLoggedIn = true;
            sessionStorage.setItem('p_pro_session', 'true');
            checkAuth();
        } else {
            alert('Incorrect store password');
        }
    });

    sidebarToggle.addEventListener('click', () => {
        state.sidebarCollapsed = !state.sidebarCollapsed;
        sidebar.classList.toggle('collapsed');
        saveState();
    });

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            state.currentView = item.dataset.view;
            renderCurrentView();
            // Auto-close sidebar on mobile after selection
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('mobile-active');
            }
        });
    });

    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-active');
        });
    }

    themeToggleSingle.addEventListener('click', () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', state.theme);
        updateThemeIcon();
        saveState();
    });

    fabAdd.addEventListener('click', () => {
        productForm.reset();
        productForm.dataset.mode = 'add';
        document.getElementById('modal-title').textContent = 'Add New Product';
        populateCategories();
        document.getElementById('prod-barcode').value = 'SKU' + Math.floor(Math.random() * 1000000);
        updateBarcodePreview();
        productModal.classList.remove('hidden');
    });

    profileTrigger.addEventListener('click', () => {
        state.currentView = 'settings';
        renderCurrentView();
    });

    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    });

    document.querySelectorAll('.cancel-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal-overlay').classList.add('hidden');
        });
    });

    productForm.addEventListener('submit', handleProductSubmit);
    categoryForm.addEventListener('submit', handleCategorySubmit);

    document.querySelector('.main-content').addEventListener('click', () => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('mobile-active')) {
            sidebar.classList.remove('mobile-active');
        }
    });

    globalSearch.addEventListener('input', () => {
        if (state.currentView !== 'products') state.currentView = 'products';
        renderCurrentView();
    });
};

const populateCategories = () => {
    const sel = document.getElementById('prod-category');
    sel.innerHTML = state.categories.map(c => `<option value="${c}">${c}</option>`).join('');
};

function handleProductSubmit(e) {
    e.preventDefault();
    const id = productForm.dataset.editingId || Date.now().toString();
    const product = {
        id,
        name: document.getElementById('prod-name').value,
        brand: document.getElementById('prod-brand').value,
        category: document.getElementById('prod-category').value,
        barcode: document.getElementById('prod-barcode').value,
        stock: document.getElementById('prod-stock').value,
        price: document.getElementById('prod-price').value
    };

    if (productForm.dataset.mode === 'edit') {
        const idx = state.products.findIndex(p => p.id === id);
        state.products[idx] = product;
        addLog('Product', 'Updated Product', `${product.name}`);
    } else {
        state.products.push(product);
        addLog('Product', 'Added Product', `${product.name}`);
    }

    saveState();
    productModal.classList.add('hidden');
    renderCurrentView();
}

const openCategoryModal = () => {
    categoryForm.reset();
    categoryModal.classList.remove('hidden');
};

function handleCategorySubmit(e) {
    e.preventDefault();
    const name = document.getElementById('cat-name').value;
    if (state.categories.includes(name)) return alert('Category already exists');
    state.categories.push(name);
    addLog('Category', 'Added Category', name);
    saveState();
    categoryModal.classList.add('hidden');
    renderCategories();
}

window.deleteProduct = (id) => {
    if (!confirm('Delete this product?')) return;
    state.products = state.products.filter(x => x.id !== id);
    saveState();
    renderCurrentView();
};

window.editProduct = (id) => {
    const p = state.products.find(x => x.id === id);
    productForm.dataset.mode = 'edit';
    productForm.dataset.editingId = id;
    document.getElementById('modal-title').textContent = 'Edit Product';

    populateCategories();
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-brand').value = p.brand;
    document.getElementById('prod-category').value = p.category;
    document.getElementById('prod-barcode').value = p.barcode;
    document.getElementById('prod-stock').value = p.stock;
    document.getElementById('prod-price').value = p.price;

    updateBarcodePreview();
    productModal.classList.remove('hidden');
};

window.deleteCategory = (name) => {
    if (state.products.some(p => p.category === name)) return alert('Category is in use');
    state.categories = state.categories.filter(c => c !== name);
    saveState();
    renderCategories();
};

const updateBarcodePreview = () => {
    const val = document.getElementById('prod-barcode').value || 'PREVIEW';
    JsBarcode("#barcode-preview", val, { height: 40, width: 2, displayValue: true });
};

document.getElementById('prod-barcode').addEventListener('input', updateBarcodePreview);

// --- Print ---
window.printSingle = (id) => {
    const p = state.products.find(x => x.id === id);
    const container = document.getElementById('a4-print-container');
    container.innerHTML = `<div class="barcode-card"><h2>${p.name}</h2><p>${p.brand}</p><svg id="single-svg"></svg></div>`;
    JsBarcode("#single-svg", p.barcode, { width: 3, height: 100 });
    window.print();
};

function performBulkPrint() {
    const container = document.getElementById('a4-print-container');
    container.innerHTML = `<div class="barcode-grid" id="bulk-grid"></div>`;
    const grid = document.getElementById('bulk-grid');
    state.selectedProducts.forEach((id, index) => {
        const p = state.products.find(x => x.id === id);
        const card = document.createElement('div');
        card.className = 'barcode-card';
        card.innerHTML = `<div style="font-weight:bold;">${p.name}</div><div style="font-size:8pt;">${p.brand}</div><svg id="bulk-s-${index}"></svg>`;
        grid.appendChild(card);
        JsBarcode(`#bulk-s-${index}`, p.barcode, { width: 1.5, height: 40 });
    });
    window.print();
}
