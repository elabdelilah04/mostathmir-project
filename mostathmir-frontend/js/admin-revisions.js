let allRequests = [];
let currentRequestId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('user_token');
    if (!token) return window.location.href = 'login.html';
    await fetchRevisions();
});

async function fetchRevisions() {
    const grid = document.getElementById('revisionsGrid');
    const token = localStorage.getItem('user_token');

    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/revisions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allRequests = await res.json();
        renderRevisions(allRequests);
    } catch (err) {
        grid.innerHTML = "<p class='text-red'>فشل تحميل البيانات</p>";
    }
}

function renderRevisions(requests) {
    const grid = document.getElementById('revisionsGrid');
    if (requests.length === 0) {
        grid.innerHTML = "<h3 class='text-center text-gray-400 py-10'>لا توجد طلبات معلقة</h3>";
        return;
    }

    grid.innerHTML = requests.map(req => `
        <div class="project-card">
            <div class="project-header">
                <h3 class="project-title">${req.project.projectName}</h3>
                <span class="project-status status-${req.status}">${req.status}</span>
            </div>
            <div class="project-info">
                <div class="info-row"><span class="label">المقدم:</span> <span class="value">${req.user.fullName}</span></div>
                <div class="info-row"><span class="label">الأقسام:</span> <div class="value">${req.sections.map(s => `<span class="section-tag">${s}</span>`).join('')}</div></div>
            </div>
            <div class="project-description" style="background:#f1f5f9; padding:10px; border-radius:8px; margin:15px 0;">
                <strong>السبب:</strong> ${req.reason}
            </div>
            ${req.status === 'pending' ? `
                <div class="project-actions">
                    <button class="action-btn btn-primary" onclick="openDecisionModal('${req._id}')">اتخاذ قرار</button>
                </div>
            ` : `<p class="text-center font-bold text-gray-400">تمت المعالجة</p>`}
        </div>
    `).join('');
}

window.openDecisionModal = (id) => {
    currentRequestId = id;
    const req = allRequests.find(r => r._id === id);
    document.getElementById('modalTitle').textContent = `قرار بشأن: ${req.project.projectName}`;
    document.getElementById('decisionModal').classList.add('show');
    
    document.getElementById('approveBtn').onclick = () => processDecision('approved');
    document.getElementById('rejectBtn').onclick = () => processDecision('rejected');
};

async function processDecision(decision) {
    const adminNote = document.getElementById('adminNote').value;
    const token = localStorage.getItem('user_token');

    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/revisions/decision`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ requestId: currentRequestId, decision, adminNote })
        });

        if (res.ok) {
            alert("تم تسجيل القرار بنجاح");
            location.reload();
        }
    } catch (err) {
        alert("حدث خطأ");
    }
}

window.closeModal = () => document.getElementById('decisionModal').classList.remove('show');