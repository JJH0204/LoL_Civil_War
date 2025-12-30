var players = [];
if (typeof window !== 'undefined') {
    window.players = players;
}

let _tempSelectedChamps = [];
Object.defineProperty(window, 'tempSelectedChamps', {
    get() { return _tempSelectedChamps; },
    set(v) { _tempSelectedChamps = v; },
    configurable: true
});
let editingId = null;

// tempSelectedChamps를 항상 window에 동기화하는 setter 함수 사용
function setTempSelectedChamps(arr) {
    window.tempSelectedChamps = arr;
}

// 기존 코드에서 tempSelectedChamps = [] 또는 tempSelectedChamps.push 등 사용되는 부분을 setTempSelectedChamps로 래핑

function openModal(mode, id = null) {
    const modal = document.getElementById('playerModal');
    if (!modal) return console.error("Modal not found");

    const title = document.getElementById('modalTitle');
    const duoArea = document.getElementById('duoSelectionArea');
    const champArea = document.getElementById('champSelectionArea');
    const duoSel = document.getElementById('pDuoLink');

    setTempSelectedChamps([]);

    if (duoArea && champArea) {
        if (mode === 'edit' && window.IS_DUO_ACTIVE) {
            duoArea.style.display = 'block';
            champArea.style.flex = '2';
            if (duoSel) {
                duoSel.innerHTML = '<option value="">없음</option>';
                window.players.forEach(p => {
                    if (p.id !== id) {
                        let selected = (window.players.find(x => x.id === id)?.duoId == p.id) ? 'selected' : '';
                        duoSel.innerHTML += `<option value="${p.id}" ${selected}>${p.name}</option>`;
                    }
                });
            }
        } else {
            duoArea.style.display = 'none';
            champArea.style.flex = '1';
        }
    }

    const setVal = (eid, val) => {
        const e = document.getElementById(eid);
        if (!e) return;
        if (e.tagName === 'SELECT') {
            // 값이 없는 경우 option 추가 후 세팅
            if (![...e.options].some(opt => opt.value == val)) {
                const opt = document.createElement('option');
                opt.value = val;
                opt.text = val;
                e.appendChild(opt);
            }
        }
        e.value = val;
    };

    if (mode === 'new') {
        editingId = null;
        if (title) title.innerText = "새 참가자 등록";
        setVal('pName', '');
        // 기본값: 티어=골드 4, 1지망=탑, 2지망=정글, 본캐=미드, 기피=없음
        setVal('pTierCombined', '700'); // 골드 4
        setVal('pTargetPos', 'TOP');
        setVal('pSubPos', 'JUG');
        setVal('pMainPos', 'MID');
        setVal('pAvoidPos', 'NONE');
        setTempSelectedChamps([]);
        renderSelectedChampsPreview();
    } else {
        editingId = id;
        if (title) title.innerText = "정보 수정";
        const p = window.players.find(x => x.id === id);
        if (p) {
            setVal('pName', p.name);
            setVal('pTierCombined', p.baseScore);
            setVal('pTargetPos', p.targetPos);
            setVal('pSubPos', p.subPos);
            setVal('pMainPos', p.mainPos);
            setVal('pAvoidPos', p.avoidPos);
            if (Array.isArray(p.champ)) {
                setTempSelectedChamps([...p.champ]);
            } else {
                setTempSelectedChamps([]);
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

    window.tempSelectedChamps.forEach(id => {
        const img = document.createElement('img');
        img.src = `champion_images/${id}.png`;
        img.className = 'champ-icon-small';
        container.appendChild(img);
    });
}

function toggleChampSelection(id) {
    if (window.tempSelectedChamps.includes(id)) {
        setTempSelectedChamps(window.tempSelectedChamps.filter(c => c !== id));
    } else {
        if (window.tempSelectedChamps.length >= 10) {
            alert("최대 10명까지만 선택 가능합니다.");
            return;
        }
        setTempSelectedChamps([...window.tempSelectedChamps, id]);
    }
    updateChampGridSelection();
    updateChampCount();
}

function updateChampGridSelection() {
    const items = document.querySelectorAll('.champ-item');
    items.forEach(item => {
        const id = item.getAttribute('data-id');
        if (window.tempSelectedChamps.includes(id)) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

function updateChampCount() {
    const el = document.getElementById('champCountDisplay');
    if (el) el.innerText = `${window.tempSelectedChamps.length} / 10 선택됨`;
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
        champ: [...window.tempSelectedChamps],
        duoId: selectedDuoId
    };

    if (editingId) {
        const oldP = window.players.find(p => Number(p.id) === Number(editingId));
        if (oldP && oldP.duoId && oldP.duoId !== selectedDuoId) {
            const oldPartner = window.players.find(p => Number(p.id) === Number(oldP.duoId));
            if (oldPartner) oldPartner.duoId = null;
        }
        const idx = window.players.findIndex(p => Number(p.id) === Number(editingId));
        if (idx !== -1) window.players[idx] = newPlayer;
    } else {
        if (window.players.length >= 10) return alert("최대 10명입니다.");
        window.players.push(newPlayer);
    }

    if (selectedDuoId) {
        const partner = window.players.find(p => p.id === selectedDuoId);
        if (partner) {
            if (partner.duoId && partner.duoId !== newPlayer.id) {
                const thirdWheel = window.players.find(p => p.id === partner.duoId);
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
        window.players = window.players.filter(p => p.id !== id);
        window.players.forEach(p => { if (p.duoId === id) p.duoId = null; });
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
    return window.players;
}

// 전역 등록
window.openModal = openModal;
window.closeModal = closeModal;
window.renderSelectedChampsPreview = renderSelectedChampsPreview;
window.toggleChampSelection = toggleChampSelection;
window.updateChampGridSelection = updateChampGridSelection;
window.updateChampCount = updateChampCount;
window.confirmChampSelect = confirmChampSelect;
// 항상 window에 등록 (중복 안전)
if (typeof window !== 'undefined') {
    window.savePlayer = savePlayer;
}
window.removePlayer = removePlayer;
window.getDuoColor = getDuoColor;
window.getParticipants = getParticipants;
