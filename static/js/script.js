document.addEventListener('DOMContentLoaded', init);

// === CONFIGURATION ===
const TOTAL_STALLS = 119;
const STALL_CONFIG = {
    Sapphire: { name: 'Sapphire', price: 100000 },
    Diamond: { name: 'Diamond', price: 75000 },
    Platinum: { name: 'Platinum', price: 65000 },
    Gold: { name: 'Gold', price: 55000 },
    Silver: { name: 'Silver', price: 45000 },
    Bronze: { name: 'Bronze', price: 35000 },
    Standard: { name: 'Standard', price: 21000 }
};

// === STATE ===
let stallsData = {};  // Combined status from API
let currentUser = null;
let selectedStall = null;

// === DOM ELEMENTS ===
const stallsGrid = document.getElementById('stalls-grid');

// Modals
const authModal = document.getElementById('auth-modal');
const stallAvailableModal = document.getElementById('stall-available-modal');
const stallBookedModal = document.getElementById('stall-booked-modal');
const stallPendingModal = document.getElementById('stall-pending-modal');
const bookingRequestModal = document.getElementById('booking-request-modal');
const myBookingsModal = document.getElementById('my-bookings-modal');

// Auth Views
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');

// Navbar elements
const userLoggedIn = document.getElementById('user-logged-in');
const userLoggedOut = document.getElementById('user-logged-out');
const userWelcome = document.getElementById('user-welcome');

// Forms
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const bookingRequestForm = document.getElementById('booking-request-form');

// Toast
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const toastIcon = document.getElementById('toast-icon');

// === INITIALIZATION ===

async function init() {
    checkSession();
    loadStalls();
    setupEventListeners();

    // Auto-refresh every 15 seconds
    setInterval(loadStalls, 15000);
}

async function checkSession() {
    try {
        const res = await fetch('/api/me');
        const user = await res.json();
        if (user && user.email) {
            currentUser = user;
            showLoggedInState();
        } else {
            showLoggedOutState();
        }
    } catch (e) {
        showLoggedOutState();
    }
}

function showLoggedInState() {
    userLoggedIn.classList.remove('hidden');
    userLoggedOut.classList.add('hidden');
    userWelcome.textContent = `Hi, ${currentUser.name.split(' ')[0]}!`;
}

function showLoggedOutState() {
    currentUser = null;
    userLoggedIn.classList.add('hidden');
    userLoggedOut.classList.remove('hidden');
}

// === STALLS ===

async function loadStalls() {
    try {
        const res = await fetch('/api/stalls');
        stallsData = await res.json();
        renderMap();
    } catch (e) {
        console.error('Failed to load stalls:', e);
    }
}

function getStallType(id) {
    // Mappings based on visual layout
    const sapphire = [39, 40, 79, 80];
    const diamond = [1, 2, 3, 117, 118, 119];
    const platinum = [4, 5, 6, 37, 38, 41, 42, 77, 78, 81, 82, 114, 115, 116];
    const gold = [7, 34, 35, 36, 43, 44, 45, 74, 75, 76, 83, 84, 85, 113];
    const silver = [8, 9, 10, 11, 30, 31, 32, 33, 46, 47, 48, 49, 70, 71, 72, 73, 86, 87, 88, 89, 109, 110, 111, 112];
    const bronze = [12, 13, 14, 26, 27, 28, 29, 50, 51, 52, 53, 66, 67, 68, 69, 90, 91, 92, 93, 106, 107, 108];
    const standard = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105];

    if (sapphire.includes(id)) return 'Sapphire';
    if (diamond.includes(id)) return 'Diamond';
    if (platinum.includes(id)) return 'Platinum';
    if (gold.includes(id)) return 'Gold';
    if (silver.includes(id)) return 'Silver';
    if (bronze.includes(id)) return 'Bronze';
    return 'Standard';
}

function getStallPosition(id) {
    // Returns { col, row }
    // Grid is 9 cols. Total Rows expanded to ~26 due to gaps.
    // Base Start Row adjusted.
    const START_ROW = 4;
    const END_ROW = 26; // Expanded 

    /**
     * Logic:
     * We have to map ID to Row Index carefully considering gaps.
     * Col 1 (1-19, Bottom to Top):
     *   1-6 (Normal stacking from bottom)
     *   GAP (Row)
     *   7-14 (Normal stacking)
     *   GAP (Row)
     *   15-19 (Normal stacking)
     */
    if (id <= 19) {
        // Base offset from bottom (END_ROW)
        let baseRow = END_ROW - (id - 1);

        // Apply Gaps. 
        // If ID > 6 (7+), shift up by 1 row (decrease row index)
        if (id > 6) baseRow -= 1;
        // If ID > 14 (15+), shift up another 1 row
        if (id > 14) baseRow -= 1;

        return { col: 1, row: baseRow };
    }

    // Col 3 (20-39, Top to Bottom)
    // No gaps mentioned here, but let's align top with others?
    // Let's assume standard top start.
    if (id <= 39) {
        return { col: 3, row: START_ROW + (id - 20) };
    }

    // Col 4 (59-40, Top to Bottom - Reverse IDs but top-down physical?)
    // Wait, 40 is next to 39 (Bottom). 59 is Top.
    // So 59 is START_ROW. 40 is max row.
    if (id <= 59) {
        return { col: 4, row: START_ROW + (59 - id) };
    }

    // Col 6 (60-79, Top to Bottom)
    // 60 Top. 79 Bottom.
    if (id <= 79) {
        return { col: 6, row: START_ROW + (id - 60) };
    }

    // Col 7 (99-80, Top to Bottom - Reverse IDs)
    // 99 Top. 80 Bottom.
    if (id <= 99) {
        return { col: 7, row: START_ROW + (99 - id) };
    }

    // Col 9 (100-119, Top to Bottom)
    // Gaps between 105 & 106, 113 & 114.
    if (id <= 119) {
        let baseRow = START_ROW + (id - 100);

        // Apply Gaps (shift down, so increase row index)
        if (id > 105) baseRow += 1; // Gap after 105 (before 106)
        if (id > 113) baseRow += 1; // Gap after 113 (before 114)

        return { col: 9, row: baseRow };
    }
    return null;
}

function renderMap() {
    stallsGrid.innerHTML = '';

    // --- LABELS ---
    // Office (Col 1, Rows 1-3)
    const office = document.createElement('div');
    office.className = 'map-label office';
    office.textContent = 'OFFICE';
    office.style.gridColumn = '1';
    office.style.gridRow = '1 / span 3';
    stallsGrid.appendChild(office);

    // Exits (Top)
    const exitTop1 = document.createElement('div');
    exitTop1.className = 'map-label exit-marker';
    exitTop1.textContent = 'E. EXIT';
    exitTop1.style.gridColumn = '2';
    exitTop1.style.gridRow = '1';
    stallsGrid.appendChild(exitTop1);

    const exitTop2 = document.createElement('div');
    exitTop2.className = 'map-label exit-marker';
    exitTop2.textContent = 'E. EXIT';
    exitTop2.style.gridColumn = '8';
    exitTop2.style.gridRow = '1';
    stallsGrid.appendChild(exitTop2);

    // Other E. EXITs (Specific placements)
    const exitGap1 = document.createElement('div');
    exitGap1.className = 'map-label exit-marker';
    exitGap1.textContent = 'E. EXIT';
    exitGap1.style.gridColumn = '1';
    exitGap1.style.gridRow = '20'; // Between 6 & 7
    exitGap1.style.fontSize = '0.5rem';
    exitGap1.style.background = 'transparent';
    exitGap1.style.color = 'black';
    exitGap1.style.border = 'none';
    stallsGrid.appendChild(exitGap1);

    const exitGap2 = document.createElement('div');
    exitGap2.className = 'map-label exit-marker';
    exitGap2.textContent = 'E. EXIT';
    exitGap2.style.gridColumn = '1';
    exitGap2.style.gridRow = '11'; // Between 14 & 15
    exitGap2.style.fontSize = '0.5rem';
    exitGap2.style.background = 'transparent';
    exitGap2.style.color = 'black';
    exitGap2.style.border = 'none';
    stallsGrid.appendChild(exitGap2);

    const exitGap3 = document.createElement('div');
    exitGap3.className = 'map-label exit-marker';
    exitGap3.textContent = 'E. EXIT';
    exitGap3.style.gridColumn = '9';
    exitGap3.style.gridRow = '10'; // Between 105 & 106
    exitGap3.style.fontSize = '0.5rem';
    exitGap3.style.background = 'transparent';
    exitGap3.style.color = 'black';
    exitGap3.style.border = 'none';
    stallsGrid.appendChild(exitGap3);

    const exitGap4 = document.createElement('div');
    exitGap4.className = 'map-label exit-marker';
    exitGap4.textContent = 'E. EXIT';
    exitGap4.style.gridColumn = '9';
    exitGap4.style.gridRow = '19'; // Between 113 & 114
    exitGap4.style.fontSize = '0.5rem';
    exitGap4.style.background = 'transparent';
    exitGap4.style.color = 'black';
    exitGap4.style.border = 'none';
    stallsGrid.appendChild(exitGap4);

    // Bottom Entry/Exits
    const entry = document.createElement('div');
    entry.className = 'map-label entry-gate';
    entry.textContent = 'ENTRY';
    entry.style.gridColumn = '3 / span 2';
    entry.style.gridRow = '27'; // Shifted down (26+1)
    stallsGrid.appendChild(entry);

    const exitBtm = document.createElement('div');
    exitBtm.className = 'map-label exit-gate';
    exitBtm.textContent = 'EXIT';
    exitBtm.style.gridColumn = '6 / span 2';
    exitBtm.style.gridRow = '27';
    stallsGrid.appendChild(exitBtm);

    // --- STALLS ---
    for (let i = 1; i <= TOTAL_STALLS; i++) {
        const pos = getStallPosition(i);
        if (!pos) continue;

        const stallId = String(i);
        const type = getStallType(i);
        const config = STALL_CONFIG[type];
        const data = stallsData[stallId];
        let status = 'available';
        if (data) status = data.status;

        const card = document.createElement('div');
        card.className = `stall-card ${status}`;
        card.dataset.id = stallId;
        card.dataset.type = type; // Used for CSS coloring
        card.style.gridColumn = pos.col;
        card.style.gridRow = pos.row;

        card.innerHTML = `<div class="stall-number">${i}</div>`;

        // Add Company Name if confirmed
        if (status === 'confirmed' && data.company_name) {
            const companyEl = document.createElement('div');
            companyEl.className = 'stall-company';
            companyEl.textContent = data.company_name;
            card.appendChild(companyEl);
        }

        card.addEventListener('click', () => handleStallClick(stallId, type, status, data));
        stallsGrid.appendChild(card);
    }

    // --- DASHED LINES (AISLES) ---
    // Should ideally be pseudo-elements or background, but let's add simple visual markers
    // Col 2, 5, 8 are gaps.
}

function handleStallClick(stallId, type, status, data) {
    // Reset state
    closeAllModals();
    selectedStall = { id: stallId, type, config: STALL_CONFIG[type] };

    if (status === 'available') {
        openAvailableModal(stallId, type);
    } else if (status === 'pending') {
        openPendingModal(stallId, data);
    } else if (status === 'confirmed') {
        openBookedModal(stallId, data);
    }
}

// === MODALS ===

function openAvailableModal(stallId, type) {
    const config = STALL_CONFIG[type];
    document.getElementById('avail-stall-title').textContent = `Stall #${stallId}`;

    // Update Info Grid to remove Size/Location and emphasize Category/Price
    const infoGrid = document.querySelector('.stall-info-grid');
    infoGrid.innerHTML = `
            <div class="info-item">
                <span class="info-label">Category</span>
                <span class="info-value" style="color: var(--cat-${type.toLowerCase()})">${config.name}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Price</span>
                <span class="info-value price">INR ${config.price}</span>
            </div>
        `;

    stallAvailableModal.classList.remove('hidden');
}

function openBookedModal(stallId, data) {
    document.getElementById('booked-stall-title').textContent = `Stall #${stallId}`;
    document.getElementById('booked-company').textContent = data.company_name || '--';
    document.getElementById('booked-contact').textContent = data.contact_person || '--';
    // Phone Removed
    document.getElementById('booked-category').textContent = data.category || '--';
    document.getElementById('booked-date').textContent = formatDate(data.confirmed_at);

    stallBookedModal.classList.remove('hidden');
}

function openPendingModal(stallId, data) {
    document.getElementById('pending-stall-title').textContent = `Stall #${stallId}`;
    document.getElementById('pending-company').textContent = `Requested by: ${data.company_name || 'User'}`;
    stallPendingModal.classList.remove('hidden');
}

function openBookingRequestModal() {
    if (!selectedStall) return;

    const info = `Stall #${selectedStall.id} • ${selectedStall.config.name} • INR ${selectedStall.config.price}`;
    document.getElementById('booking-stall-info').textContent = info;

    bookingRequestForm.reset();
    document.getElementById('bookingCategory').value = '';
    document.getElementById('other-category-container').classList.add('hidden');
    bookingRequestModal.classList.remove('hidden');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

function setupEventListeners() {
    // Close modals on X or outside click
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', closeAllModals);
    });

    // Navbar buttons
    document.getElementById('login-btn').addEventListener('click', () => {
        authModal.classList.remove('hidden');
        loginView.classList.remove('hidden');
        registerView.classList.add('hidden');
        document.getElementById('auth-context').classList.add('hidden');
    });

    document.getElementById('signup-btn').addEventListener('click', () => {
        authModal.classList.remove('hidden');
        loginView.classList.add('hidden');
        registerView.classList.remove('hidden');
        document.getElementById('auth-context').classList.add('hidden');
    });

    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Switch auth views
    document.getElementById('switch-to-register').addEventListener('click', () => {
        loginView.classList.add('hidden');
        registerView.classList.remove('hidden');
    });

    document.getElementById('switch-to-login').addEventListener('click', () => {
        registerView.classList.add('hidden');
        loginView.classList.remove('hidden');
    });

    // Forms
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    bookingRequestForm.addEventListener('submit', handleBookingRequest);

    // Category "Other" toggle
    document.getElementById('bookingCategory').addEventListener('change', (e) => {
        const otherContainer = document.getElementById('other-category-container');
        if (e.target.value === 'Other') {
            otherContainer.classList.remove('hidden');
        } else {
            otherContainer.classList.add('hidden');
        }
    });

    // Book this stall button
    document.getElementById('book-this-stall-btn').addEventListener('click', () => {
        closeAllModals();
        if (!currentUser) {
            authModal.classList.remove('hidden');
            loginView.classList.remove('hidden');
            registerView.classList.add('hidden');
            document.getElementById('auth-context').classList.remove('hidden');
            document.getElementById('auth-context-stall').textContent = `#${selectedStall.id}`;
        } else {
            openBookingRequestModal();
        }
    });

    // My Bookings
    document.getElementById('my-bookings-btn').addEventListener('click', openMyBookingsModal);
}

async function openMyBookingsModal() {
    myBookingsModal.classList.remove('hidden');
    const content = document.getElementById('my-bookings-content');
    content.innerHTML = '<p style="text-align:center; padding: 2rem;">Loading...</p>';

    try {
        // Re-fetch user to get latest bookings
        const res = await fetch('/api/me');
        const user = await res.json();

        if (!user.bookings || user.bookings.length === 0) {
            content.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 2rem;">No bookings yet.</p>';
            return;
        }

        content.innerHTML = user.bookings.map(b => `
                <div class="my-booking-card ${b.status}">
                    <div class="booking-header">
                        <span class="booking-id">Stall #${b.stall_id}</span>
                        <span class="booking-status status-${b.status}">${b.status.toUpperCase()}</span>
                    </div>
                    <div class="booking-details">
                        <div class="booking-row">
                            <span>Type:</span> <span>${b.stall_type || '-'}</span>
                        </div>
                        <div class="booking-row">
                            <span>Price:</span> <span>INR ${b.stall_price || '-'}</span>
                        </div>
                         <div class="booking-row">
                            <span>Category:</span> <span>${b.category || '-'}</span>
                        </div>
                        <div class="booking-row">
                            <span>Date:</span> <span>${formatDate(b.requested_at)}</span>
                        </div>
                    </div>
                </div>
            `).join('');

    } catch (e) {
        content.innerHTML = '<p style="text-align:center; color: var(--confirmed); padding: 2rem;">Failed to load bookings.</p>';
    }
}


// === AUTH HANDLERS ===

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const btn = loginForm.querySelector('.btn-primary');
    const originalText = btn.textContent;
    btn.textContent = 'Signing In...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            currentUser = data.user;
            showLoggedInState();
            closeAllModals();
            showToast(`Welcome back, ${currentUser.name.split(' ')[0]}!`);

            // If there was a selected stall context, open booking immediately
            if (!document.getElementById('auth-context').classList.contains('hidden') && selectedStall) {
                setTimeout(() => openBookingRequestModal(), 300);
            }
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (e) {
        showToast('Network error', 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const btn = registerForm.querySelector('.btn-primary');
    btn.textContent = 'Creating Account...';
    btn.disabled = true;

    const formData = {
        name: document.getElementById('regName').value,
        company: document.getElementById('regCompany').value,
        email: document.getElementById('regEmail').value,
        phone: document.getElementById('regPhone').value,
        category: document.getElementById('regCategory').value,
        // GST Removed
        password: document.getElementById('regPassword').value
    };

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const data = await res.json();

        if (res.ok) {
            currentUser = data.user;
            showLoggedInState();
            closeAllModals();
            showToast(`Welcome, ${currentUser.name}! Account created.`);

            // If there was a selected stall, open booking modal
            if (selectedStall) {
                setTimeout(() => openBookingRequestModal(), 300);
            }
        } else {
            showToast(data.error || 'Registration failed', 'error');
        }
    } catch (e) {
        showToast('Network error', 'error');
    } finally {
        btn.textContent = 'Create Account';
        btn.disabled = false;
    }
}

async function handleBookingRequest(e) {
    e.preventDefault();

    if (!selectedStall || !currentUser) {
        showToast('Please login first', 'error');
        return;
    }

    const btn = bookingRequestForm.querySelector('.btn-primary');
    btn.classList.add('loading');
    btn.disabled = true;

    let category = document.getElementById('bookingCategory').value;
    if (category === 'Other') {
        category = document.getElementById('otherCategoryInput').value.trim();
        if (!category) {
            showToast('Please specify the other category', 'warning');
            btn.classList.remove('loading');
            btn.disabled = false;
            return;
        }
    }

    const bookedBy = document.getElementById('bookingReference').value;

    try {
        const res = await fetch('/api/booking-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stall_id: selectedStall.id,
                stall_type: selectedStall.config.name,
                stall_price: selectedStall.config.price,
                category,
                booked_by: bookedBy
            })
        });

        const data = await res.json();

        if (res.ok) {
            showToast('Booking requested successfully!');
            closeAllModals();
            loadStalls(); // Refresh to show pending status
        } else {
            showToast(data.error || 'Request failed', 'error');
        }
    } catch (e) {
        showToast('Network error', 'error');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    currentUser = null;
    showLoggedOutState();
    showToast('Logged out successfully');
}

// === UTILITIES ===

function getLocation(stallId) {
    // Redundant with new map but kept for safety
    const id = parseInt(stallId);
    if (id <= 19) return 'Left Wing';
    if (id >= 100) return 'Right Wing';
    return 'Center Hall';
}

function formatDate(isoString) {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'success') {
    const icons = { success: '✓', error: '✕', warning: '⚠' };
    toastIcon.textContent = icons[type] || '✓';
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}
