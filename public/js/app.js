// Global state
let token = localStorage.getItem('token');
let currentUser = null;
let selectedFiles = [];
let currentInvoiceId = null;
let currentPage = 1;

// Helper functions
function formatCurrency(amount) {
  return `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// API helper
async function api(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    // Auto-logout on authentication errors
    if (response.status === 401) {
      localStorage.removeItem('token');
      token = null;
      currentUser = null;
      location.reload();
    }
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  // Setup auth tab listeners
  const authTabs = document.querySelectorAll('#authTabs .nav-link');
  authTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const tabType = tab.textContent.toLowerCase().trim();
      showAuthTab(tabType, e);
    });
  });

  // Setup button listeners
  const loginBtn = document.querySelector('#loginForm button');
  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      login();
    });
  }

  const registerBtn = document.querySelector('#registerForm button');
  if (registerBtn) {
    registerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      register();
    });
  }

  // Setup navigation listeners
  const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.getAttribute('data-section');
      if (section) {
        showSection(section);
      }
    });
  });

  // Setup logout listener
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Setup upload button listener
  const uploadBtn = document.getElementById('uploadBtn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      uploadFiles();
    });
  }

  // Setup export buttons
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => exportInvoices('csv'));
  }

  const exportJsonBtn = document.getElementById('exportJsonBtn');
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => exportInvoices('json'));
  }

  const exportXmlBtn = document.getElementById('exportXmlBtn');
  if (exportXmlBtn) {
    exportXmlBtn.addEventListener('click', () => exportInvoices('xml'));
  }

  // Setup save invoice button
  const saveInvoiceBtn = document.getElementById('saveInvoiceBtn');
  if (saveInvoiceBtn) {
    saveInvoiceBtn.addEventListener('click', () => saveInvoiceChanges());
  }

  if (token) {
    checkAuth();
  }

  setupUploadArea();
});

// Auth functions
function showAuthTab(tab, event) {
  document.querySelectorAll('#authTabs .nav-link').forEach(el => el.classList.remove('active'));
  if (event && event.target) {
    event.target.classList.add('active');
  }

  if (tab === 'login') {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
  } else {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
  }
}

async function login() {
  try {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const response = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    token = response.data.token;
    currentUser = response.data.user;
    localStorage.setItem('token', token);

    showApp();
  } catch (error) {
    alert(error.message);
  }
}

async function register() {
  try {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    const response = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    token = response.data.token;
    currentUser = response.data.user;
    localStorage.setItem('token', token);

    showApp();
  } catch (error) {
    alert(error.message);
  }
}

async function checkAuth() {
  try {
    const response = await api('/auth/me');
    currentUser = response.data;
    showApp();
  } catch (error) {
    logout();
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');

  document.getElementById('authSection').style.display = 'flex';
  document.getElementById('dashboardSection').style.display = 'none';
  document.getElementById('uploadSection').style.display = 'none';
  document.getElementById('invoicesSection').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'none';
  document.getElementById('userInfo').textContent = '';
}

function showApp() {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'block';
  document.getElementById('userInfo').textContent = currentUser.name;

  showSection('dashboard');
}

// Section navigation
function showSection(section) {
  document.querySelectorAll('.navbar-nav .nav-link').forEach(el => el.classList.remove('active'));
  event?.target?.classList.add('active');

  document.getElementById('dashboardSection').style.display = 'none';
  document.getElementById('uploadSection').style.display = 'none';
  document.getElementById('invoicesSection').style.display = 'none';

  if (section === 'dashboard') {
    document.getElementById('dashboardSection').style.display = 'block';
    loadDashboard();
  } else if (section === 'upload') {
    document.getElementById('uploadSection').style.display = 'block';
  } else if (section === 'invoices') {
    document.getElementById('invoicesSection').style.display = 'block';
    loadInvoices();
  }
}

// Dashboard
async function loadDashboard() {
  try {
    const [statsResponse, invoicesResponse] = await Promise.all([
      api('/invoices/stats/summary'),
      api('/invoices?limit=5&sortBy=createdAt&sortOrder=desc'),
    ]);

    const stats = statsResponse.data;
    const invoices = invoicesResponse.data.invoices;

    // Update stats
    document.getElementById('totalInvoices').textContent = stats.totalInvoices;
    document.getElementById('totalValue').textContent = formatCurrency(stats.totalValue);

    const completed = stats.byStatus.find(s => s._id === 'completed');
    const pending = stats.byStatus.find(s => s._id === 'review_required');

    document.getElementById('completedInvoices').textContent = completed?.count || 0;
    document.getElementById('pendingReview').textContent = pending?.count || 0;

    // Update recent invoices
    const tbody = document.getElementById('recentInvoices');
    tbody.innerHTML = invoices.map(inv => `
      <tr class="invoice-row" data-id="${inv.id}" style="cursor:pointer;">
        <td>${inv.invoiceNumber || 'N/A'}</td>
        <td>${inv.vendorName || 'Unknown'}</td>
        <td>${formatCurrency(inv.totalAmount)}</td>
        <td>${getStatusBadge(inv.status)}</td>
        <td>${getConfidenceBar(inv.confidenceScore)}</td>
      </tr>
    `).join('');

    // Add click event listeners to rows
    tbody.querySelectorAll('.invoice-row').forEach(row => {
      row.addEventListener('click', () => viewInvoice(row.dataset.id));
    });

    // Load queue status
    try {
      const queueResponse = await api('/invoices/queue/status');
      const queue = queueResponse.data;

      document.getElementById('queueLength').textContent = queue.queueLength;
      document.getElementById('activeProcessing').textContent = queue.activeProcessing;

      const progress = queue.maxConcurrent > 0
        ? (queue.activeProcessing / queue.maxConcurrent) * 100
        : 0;
      document.getElementById('queueProgress').style.width = `${progress}%`;
    } catch (e) {
      // Queue status may require admin
    }
  } catch (error) {
    console.error('Dashboard load error:', error);
  }
}

// Upload functions
function setupUploadArea() {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');

  uploadArea.addEventListener('click', () => fileInput.click());

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });
}

function handleFiles(files) {
  selectedFiles = Array.from(files);
  updateFileList();
}

function updateFileList() {
  const fileList = document.getElementById('fileList');
  const uploadBtn = document.getElementById('uploadBtn');

  if (selectedFiles.length === 0) {
    fileList.innerHTML = '';
    uploadBtn.disabled = true;
    return;
  }

  uploadBtn.disabled = false;

  fileList.innerHTML = selectedFiles.map((file, index) => `
    <div class="file-item">
      <div class="file-name">
        <i class="bi bi-file-earmark"></i>
        <span>${file.name}</span>
        <small class="text-muted ms-2">(${formatFileSize(file.size)})</small>
      </div>
      <i class="bi bi-x-circle remove-file" onclick="removeFile(${index})"></i>
    </div>
  `).join('');
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  updateFileList();
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function uploadFiles() {
  if (selectedFiles.length === 0) return;

  const uploadProgress = document.getElementById('uploadProgress');
  const progressBar = document.getElementById('uploadProgressBar');
  const uploadStatus = document.getElementById('uploadStatus');

  uploadProgress.style.display = 'block';
  progressBar.style.width = '0%';
  uploadStatus.textContent = 'Uploading...';

  const formData = new FormData();

  if (selectedFiles.length === 1) {
    formData.append('invoice', selectedFiles[0]);
  } else {
    selectedFiles.forEach(file => formData.append('invoices', file));
  }

  const webhookUrl = document.getElementById('webhookUrl').value;
  if (webhookUrl) {
    formData.append('webhookUrl', webhookUrl);
  }

  try {
    const endpoint = selectedFiles.length === 1 ? '/invoices/upload' : '/invoices/batch';

    const response = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    progressBar.style.width = '100%';
    uploadStatus.textContent = `Successfully uploaded ${selectedFiles.length} file(s)`;

    // Reset
    selectedFiles = [];
    updateFileList();
    document.getElementById('webhookUrl').value = '';

    setTimeout(() => {
      uploadProgress.style.display = 'none';
      showSection('invoices');
    }, 2000);
  } catch (error) {
    uploadStatus.textContent = `Error: ${error.message}`;
    progressBar.classList.add('bg-danger');
  }
}

// Invoices list
async function loadInvoices(page = 1) {
  try {
    currentPage = page;
    const status = document.getElementById('statusFilter').value;

    let url = `/invoices?page=${page}&limit=10`;
    if (status) url += `&status=${status}`;

    const response = await api(url);
    const { invoices, pagination } = response.data;

    const tbody = document.getElementById('invoicesList');
    tbody.innerHTML = invoices.map(inv => `
      <tr>
        <td>${inv.invoiceNumber || 'N/A'}</td>
        <td>${inv.vendorName || 'Unknown'}</td>
        <td>${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : 'N/A'}</td>
        <td>${formatCurrency(inv.totalAmount)}</td>
        <td>${getStatusBadge(inv.status)}</td>
        <td>${getConfidenceBar(inv.confidenceScore)}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary action-btn view-invoice-btn" data-id="${inv.id}">
            <i class="bi bi-eye"></i>
          </button>
          ${inv.status === 'failed' ? `
            <button class="btn btn-sm btn-outline-warning action-btn retry-invoice-btn" data-id="${inv.id}">
              <i class="bi bi-arrow-clockwise"></i>
            </button>
          ` : ''}
          <button class="btn btn-sm btn-outline-danger action-btn delete-invoice-btn" data-id="${inv.id}">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');

    // Add event listeners to buttons
    tbody.querySelectorAll('.view-invoice-btn').forEach(btn => {
      btn.addEventListener('click', () => viewInvoice(btn.dataset.id));
    });
    tbody.querySelectorAll('.retry-invoice-btn').forEach(btn => {
      btn.addEventListener('click', () => retryInvoice(btn.dataset.id));
    });
    tbody.querySelectorAll('.delete-invoice-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteInvoice(btn.dataset.id));
    });

    // Pagination
    const paginationEl = document.getElementById('pagination');
    let paginationHtml = '';

    if (pagination.pages > 1) {
      for (let i = 1; i <= pagination.pages; i++) {
        paginationHtml += `
          <li class="page-item ${i === page ? 'active' : ''}">
            <a class="page-link" href="#" onclick="loadInvoices(${i})">${i}</a>
          </li>
        `;
      }
    }

    paginationEl.innerHTML = paginationHtml;
  } catch (error) {
    console.error('Load invoices error:', error);
  }
}

// View invoice detail
async function viewInvoice(id) {
  try {
    const response = await api(`/invoices/${id}`);
    const invoice = response.data;
    currentInvoiceId = id;

    const details = document.getElementById('invoiceDetails');
    details.innerHTML = `
      ${Array.isArray(invoice.validationErrors) && invoice.validationErrors.length ? `
        <div class="validation-errors">
          <strong><i class="bi bi-exclamation-triangle"></i> Errors:</strong>
          <ul>${invoice.validationErrors.map(e => `<li>${e}</li>`).join('')}</ul>
        </div>
      ` : ''}

      ${Array.isArray(invoice.validationWarnings) && invoice.validationWarnings.length ? `
        <div class="validation-warnings">
          <strong><i class="bi bi-exclamation-circle"></i> Warnings:</strong>
          <ul>${invoice.validationWarnings.map(w => `<li>${w}</li>`).join('')}</ul>
        </div>
      ` : ''}

      <div class="row">
        <div class="col-md-6">
          <div class="mb-3">
            <label class="form-label">Vendor Name</label>
            <input type="text" class="form-control" id="editVendorName" value="${invoice.vendorName || ''}">
          </div>
          <div class="mb-3">
            <label class="form-label">Invoice Number</label>
            <input type="text" class="form-control" id="editInvoiceNumber" value="${invoice.invoiceNumber || ''}">
          </div>
          <div class="mb-3">
            <label class="form-label">Invoice Date</label>
            <input type="date" class="form-control" id="editInvoiceDate" value="${invoice.invoiceDate ? invoice.invoiceDate.split('T')[0] : ''}">
          </div>
        </div>
        <div class="col-md-6">
          <div class="mb-3">
            <label class="form-label">Due Date</label>
            <input type="date" class="form-control" id="editDueDate" value="${invoice.dueDate ? invoice.dueDate.split('T')[0] : ''}">
          </div>
          <div class="mb-3">
            <label class="form-label">Subtotal</label>
            <input type="number" class="form-control" id="editSubtotal" value="${invoice.subtotal || 0}">
          </div>
          <div class="mb-3">
            <label class="form-label">Total Amount</label>
            <input type="number" class="form-control" id="editTotalAmount" value="${invoice.totalAmount || 0}">
          </div>
        </div>
      </div>

      <h6>Line Items</h6>
      <table class="table table-sm line-items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${Array.isArray(invoice.lineItems) && invoice.lineItems.length > 0 ? invoice.lineItems.map(item => `
            <tr>
              <td>${item.description || 'N/A'}</td>
              <td>${item.quantity || 0}</td>
              <td>${formatCurrency(item.unitPrice || 0)}</td>
              <td>${formatCurrency(item.amount || 0)}</td>
            </tr>
          `).join('') : '<tr><td colspan="4" class="text-center text-muted">No line items found</td></tr>'}
        </tbody>
      </table>

      <div class="text-muted processing-time mt-3">
        Processed in ${invoice.processingTimeMs || 0}ms | Confidence: ${((invoice.confidenceScore || 0) * 100).toFixed(1)}%
      </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('invoiceModal'));
    modal.show();
  } catch (error) {
    alert(error.message);
  }
}

async function saveInvoiceChanges() {
  try {
    const updates = {
      vendorName: document.getElementById('editVendorName').value,
      invoiceNumber: document.getElementById('editInvoiceNumber').value,
      invoiceDate: document.getElementById('editInvoiceDate').value,
      dueDate: document.getElementById('editDueDate').value,
      subtotal: parseFloat(document.getElementById('editSubtotal').value),
      totalAmount: parseFloat(document.getElementById('editTotalAmount').value),
    };

    await api(`/invoices/${currentInvoiceId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });

    bootstrap.Modal.getInstance(document.getElementById('invoiceModal')).hide();
    loadInvoices(currentPage);
    alert('Invoice updated successfully');
  } catch (error) {
    alert(error.message);
  }
}

async function retryInvoice(id) {
  try {
    await api(`/invoices/${id}/retry`, { method: 'POST' });
    loadInvoices(currentPage);
    alert('Invoice queued for reprocessing');
  } catch (error) {
    alert(error.message);
  }
}

async function deleteInvoice(id) {
  if (!confirm('Are you sure you want to delete this invoice?')) return;

  try {
    await api(`/invoices/${id}`, { method: 'DELETE' });
    loadInvoices(currentPage);
  } catch (error) {
    alert(error.message);
  }
}

async function exportInvoices(format) {
  try {
    const status = document.getElementById('statusFilter').value;
    const filter = status ? { status } : { status: 'completed' };

    const response = await api('/invoices/export', {
      method: 'POST',
      body: JSON.stringify({ format, filter }),
    });

    alert(`Export created: ${response.data.filename}\nRecords: ${response.data.recordCount}`);
  } catch (error) {
    alert(error.message);
  }
}

// Helper functions
function getStatusBadge(status) {
  const badges = {
    pending: '<span class="badge bg-secondary status-badge">Pending</span>',
    processing: '<span class="badge bg-info status-badge">Processing</span>',
    completed: '<span class="badge bg-success status-badge">Completed</span>',
    review_required: '<span class="badge bg-warning status-badge">Review Required</span>',
    failed: '<span class="badge bg-danger status-badge">Failed</span>',
  };
  return badges[status] || status;
}

function getConfidenceBar(score) {
  const percentage = (score || 0) * 100;
  let colorClass = 'confidence-low';

  if (percentage >= 80) colorClass = 'confidence-high';
  else if (percentage >= 60) colorClass = 'confidence-medium';

  return `
    <div class="confidence-bar">
      <div class="confidence-fill ${colorClass}" style="width: ${percentage}%"></div>
    </div>
    <small class="text-muted">${percentage.toFixed(0)}%</small>
  `;
}
