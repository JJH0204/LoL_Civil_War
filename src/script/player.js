var players = [];
if (typeof window !== 'undefined') {
    window.players = players;
}
let editingId = null;
let tempSelectedChamps = [];

function openModal(mode, id = null) {
    const modal = document.getElementById('playerModal');
    if (!modal) return console.error("Modal not found");

    const title = document.getElementById('modalTitle');
    const duoArea = document.getElementById('duoSelectionArea');
    const champArea = document.getElementById('champSelectionArea');
    const duoSel = document.getElementById('pDuoLink');

    tempSelectedChamps = [];

    if (duoArea && champArea) {
        if (mode === 'edit' && window.IS_DUO_ACTIVE) {
            duoArea.style.display = 'block';
            champArea.style.flex = '2';
            if (duoSel) {
                duoSel.innerHTML = '<option value="">없음</option>';
                players.forEach(p => {
                    if (p.id !== id) {
                        let selected = (players.find(x => x.id === id).duoId == p.id) ? 'selected' : '';
                        duoSel.innerHTML += `<option value="${p.id}" ${selected}>${p.name}</option>`;
                    }
                });
            }
        } else {
            duoArea.style.display = 'none';
            champArea.style.flex = '1';
        }
    }

    if (mode === 'new') {
        editingId = null;
        if (title) title.innerText = "새 참가자 등록";
        const nEl = document.getElementById('pName');
        if (nEl) nEl.value = '';
        renderSelectedChampsPreview();
    } else {
        editingId = id;
        if (title) title.innerText = "정보 수정";
        const p = players.find(x => x.id === id);
        if (p) {
            const setVal = (eid, val) => { const e = document.getElementById(eid); if (e) e.value = val; };
            setVal('pName', p.name);
            setVal('pTierCombined', p.baseScore);
            setVal('pTargetPos', p.targetPos);
            setVal('pSubPos', p.subPos);
            setVal('pMainPos', p.mainPos);
            setVal('pAvoidPos', p.avoidPos);
            if (Array.isArray(p.champ)) {
                tempSelectedChamps = [...p.champ];
            } else {
                tempSelectedChamps = [];
            }
            renderSelectedChampsPreview();
        }
    }
    modal.style.display = 'block';
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('show');
        el.style.display = '';
    }
}

function renderSelectedChampsPreview() {
    const container = document.getElementById('selectedChampPreview');
    if (!container) return;

    container.innerHTML = '';
    if (tempSelectedChamps.length === 0) {
        container.innerHTML = '<span style="color:#666; font-size:0.8rem; line-height:24px;">클릭하여 선택...</span>';
        return;
    }

    tempSelectedChamps.forEach(id => {
        const img = document.createElement('img');
        img.src = `champion_images/${id}.png`;
        img.className = 'champ-icon-small';
        container.appendChild(img);
    });
}

function toggleChampSelection(id) {
    if (tempSelectedChamps.includes(id)) {
        tempSelectedChamps = tempSelectedChamps.filter(c => c !== id);
    } else {
        if (tempSelectedChamps.length >= 10) {
            alert("최대 10명까지만 선택 가능합니다.");
            return;
        }
        tempSelectedChamps.push(id);
    }
    updateChampGridSelection();
    updateChampCount();
}

function updateChampGridSelection() {
    const items = document.querySelectorAll('.champ-item');
    items.forEach(item => {
        const id = item.getAttribute('data-id');
        if (tempSelectedChamps.includes(id)) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

function updateChampCount() {
    const el = document.getElementById('champCountDisplay');
    if (el) el.innerText = `${tempSelectedChamps.length} / 10 선택됨`;
}

function confirmChampSelect() {
    closeModal('champModal');
    renderSelectedChampsPreview();
}

function savePlayer() {
    const nameEl = document.getElementById('pName');
    if (!nameEl) return;
    const name = nameEl.value.trim();
    if (!name) return alert("이름을 입력하세요");

    const scoreEl = document.getElementById('pTierCombined');
    const score = parseInt(scoreEl.value);
    const tierName = scoreEl.selectedOptions[0].text;

    let selectedDuoId = null;
    const duoLinkEl = document.getElementById('pDuoLink');
    if (editingId && window.IS_DUO_ACTIVE && duoLinkEl) {
        const val = duoLinkEl.value;
        if (val) selectedDuoId = parseInt(val);
    }

    const newPlayer = {
        id: editingId || Date.now(),
        name,
        baseScore: score,
        tierName,
        targetPos: document.getElementById('pTargetPos').value,
        subPos: document.getElementById('pSubPos').value,
        mainPos: document.getElementById('pMainPos').value,
        avoidPos: document.getElementById('pAvoidPos').value,
        champ: [...tempSelectedChamps],
        duoId: selectedDuoId
    };

    if (editingId) {
        const oldP = players.find(p => p.id === editingId);
        if (oldP && oldP.duoId && oldP.duoId !== selectedDuoId) {
            const oldPartner = players.find(p => p.id === oldP.duoId);
            if (oldPartner) oldPartner.duoId = null;
        }
        const idx = players.findIndex(p => p.id === editingId);
        if (idx !== -1) players[idx] = newPlayer;
    } else {
        if (players.length >= 10) return alert("최대 10명입니다.");
        players.push(newPlayer);
    }

    if (selectedDuoId) {
        const partner = players.find(p => p.id === selectedDuoId);
        if (partner) {
            if (partner.duoId && partner.duoId !== newPlayer.id) {
                const thirdWheel = players.find(p => p.id === partner.duoId);
                if (thirdWheel) thirdWheel.duoId = null;
            }
            partner.duoId = newPlayer.id;
        }
    }

    closeModal('playerModal');
    saveAndRender();
}

function removePlayer(id) {
    if (confirm("삭제하시겠습니까?")) {
        players = players.filter(p => p.id !== id);
        players.forEach(p => { if (p.duoId === id) p.duoId = null; });
        saveAndRender();
    }
}

function getDuoColor(p) {
    if (!p.duoId) return null;
    const seed = Math.min(p.id, p.duoId);
    return window.DUO_COLORS ? window.DUO_COLORS[seed % window.DUO_COLORS.length] : null;
}

// 참가자 목록 반환
function getParticipants() {
    return players;
}

// 전역 등록
window.openModal = openModal;
window.closeModal = closeModal;
window.renderSelectedChampsPreview = renderSelectedChampsPreview;
window.toggleChampSelection = toggleChampSelection;
window.updateChampGridSelection = updateChampGridSelection;
window.updateChampCount = updateChampCount;
window.confirmChampSelect = confirmChampSelect;
window.savePlayer = savePlayer;
window.removePlayer = removePlayer;
window.getDuoColor = getDuoColor;
window.getParticipants = getParticipants;
