// js/admin-proposals.js
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('user_token');
    if (!token) return window.location.href = '/login.html';

    await loadAllProposals();
});

async function loadAllProposals() {
    const grid = document.getElementById('adminProposalsGrid');
    const token = localStorage.getItem('user_token');

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/proposals`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const proposals = await response.json();

        if (proposals.length === 0) {
            grid.innerHTML = "<h3>لا توجد عروض شراكة حالياً.</h3>";
            return;
        }

        grid.innerHTML = proposals.map(prop => createProposalCard(prop)).join('');
    } catch (error) {
        grid.innerHTML = "<p class='text-red'>خطأ في جلب البيانات.</p>";
    }
}

function createProposalCard(prop) {
    const statusMap = {
        'pending': { text: 'قيد الانتظار', class: 'status-pending' },
        'accepted': { text: 'تم القبول', class: 'status-approved' },
        'rejected': { text: 'تم الرفض', class: 'status-rejected' }
    };
    const status = statusMap[prop.status] || { text: prop.status, class: '' };

    return `
        <div class="project-card">
            <div class="project-header">
                <h3 class="project-title">عرض من: ${prop.investorId?.fullName}</h3>
                <span class="project-status ${status.class}">${status.text}</span>
            </div>
            <div class="project-info">
                <div class="info-row"><span class="label">المشروع المستهدف:</span> <span class="value">${prop.projectId?.projectName}</span></div>
                <div class="info-row"><span class="label">صاحب المشروع:</span> <span class="value">${prop.projectId?.owner?.fullName}</span></div>
                <div class="info-row"><span class="label">نوع الشراكة:</span> <span class="value">${prop.partnershipType}</span></div>
            </div>
            <p class="project-description">${prop.proposedTerms.substring(0, 100)}...</p>
            <div class="project-actions">
                <button class="action-btn btn-primary" onclick="viewProposalFullDetail('${prop._id}')">عرض التفاصيل الكاملة</button>
            </div>
        </div>
    `;
}

// يمكن إضافة ميزة فتح المودال لعرض مجالات الخبرة والرسائل المتبادلة
window.viewProposalFullDetail = (id) => {
    // منطق جلب التفاصيل من المصفوفة وعرضها في المودال
    alert("سيتم عرض تفاصيل العرض والخبرات المقترحة هنا...");
};

function closeModal() {
    document.getElementById('proposalDetailModal').classList.remove('show');
}