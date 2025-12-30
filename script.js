// [V20.8] LZString 압축 및 데이터 최적화 적용
let players = [];
let editingId = null;
let IS_DUO_ACTIVE = true;
let LANE_WEIGHTS = { 'TOP': 1.0, 'JUG': 1.0, 'MID': 1.0, 'ADC': 1.0, 'SUP': 1.0 };
const LANES = ['TOP', 'JUG', 'MID', 'ADC', 'SUP'];
const LANE_NAMES = { 'TOP': '탑', 'JUG': '정글', 'MID': '미드', 'ADC': '원딜', 'SUP': '서폿', 'ALL': '랜덤', 'NONE': '없음' };
const DUO_COLORS = ['#fd79a8', '#00b894', '#0984e3', '#e17055', '#6c5ce7', '#fdcb6e'];

let safeChampionList = [];
if (typeof championList !== 'undefined') {
    safeChampionList = championList;
} else {
    console.warn("championList.js가 로드되지 않았습니다.");
}

const TIER_DATA = [
    {name: "아이언 4", score: 100}, {name: "아이언 3", score: 125}, {name: "아이언 2", score: 150}, {name: "아이언 1", score: 175},
    {name: "브론즈 4", score: 300}, {name: "브론즈 3", score: 325}, {name: "브론즈 2", score: 350}, {name: "브론즈 1", score: 375},
    {name: "실버 4", score: 500}, {name: "실버 3", score: 525}, {name: "실버 2", score: 550}, {name: "실버 1", score: 575},
    {name: "골드 4", score: 700}, {name: "골드 3", score: 725}, {name: "골드 2", score: 750}, {name: "골드 1", score: 775},
    {name: "플래티넘 4", score: 900}, {name: "플래티넘 3", score: 925}, {name: "플래티넘 2", score: 950}, {name: "플래티넘 1", score: 975},
    {name: "에메랄드 4", score: 1100}, {name: "에메랄드 3", score: 1125}, {name: "에메랄드 2", score: 1150}, {name: "에메랄드 1", score: 1175},
    {name: "다이아 4", score: 1300}, {name: "다이아 3", score: 1325}, {name: "다이아 2", score: 1350}, {name: "다이아 1", score: 1375},
    {name: "마스터", score: 1500}, {name: "그랜드마스터", score: 1700}, {name: "챌린저", score: 2000}
];

let tempSelectedChamps = [];

// [초기화] URL 파라미터 확인 및 데이터 로드
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const compressedData = urlParams.get('d'); // 'p' 대신 'd' 사용 (Data)

    if (compressedData) {
        if (decodeData(compressedData)) {
            console.log("URL에서 데이터를 복원했습니다.");
            // URL을 깔끔하게 정리 (새로고침 시 중복 로드 방지)
            window.history.replaceState({}, document.title, window.location.pathname);
            // 데이터 로드 후 바로 계산 실행
            setTimeout(calculateAndAssign, 500);
        } else {
            alert("공유된 링크의 데이터가 손상되었거나 호환되지 않습니다.");
            loadData();
        }
    } else {
        loadData();
    }

    initUI();
    initChampGrid();
    renderList();
});

function initUI() {
    const tSel = document.getElementById('pTierCombined');
    if (tSel) {
        tSel.innerHTML = '';
        TIER_DATA.forEach((t) => {
            let opt = document.createElement('option');
            opt.value = t.score;
            opt.text = t.name;
            if (t.name === "골드 4") opt.selected = true;
            tSel.appendChild(opt);
        });
    }

    const lOpts = LANES.map(l => ({ v: l, n: LANE_NAMES[l] }));
    lOpts.push({ v: 'ALL', n: '🎲 랜덤' });
    ['pTargetPos', 'pSubPos', 'pMainPos'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '';
            lOpts.forEach(o => el.innerHTML += `<option value="${o.v}">${o.n}</option>`);
        }
    });

    const avoidOpts = [{ v: 'NONE', n: '없음' }, ...LANES.map(l => ({ v: l, n: LANE_NAMES[l] }))];
    const avoidEl = document.getElementById('pAvoidPos');
    if (avoidEl) {
        avoidEl.innerHTML = '';
        avoidOpts.forEach(o => avoidEl.innerHTML += `<option value="${o.v}">${o.n}</option>`);
    }

    const wContainer = document.getElementById('weightInputs');
    if (wContainer) {
        wContainer.innerHTML = ''; 
        LANES.forEach(lane => {
            wContainer.innerHTML += `
            <div class="slider-row">
                <label>${LANE_NAMES[lane]}</label>
                <input type="range" min="0.5" max="1.5" step="0.1" value="1.0" oninput="updateWeight('${lane}', this.value)">
                <span id="wVal_${lane}" class="slider-val">1.0</span>
            </div>`;
        });
    }
}

function initChampGrid() {
    const grid = document.getElementById('champGrid');
    if (!grid) return;

    grid.innerHTML = '';
    safeChampionList.forEach(champ => {
        const div = document.createElement('div');
        div.className = 'champ-item';
        div.setAttribute('data-id', champ.id);
        div.setAttribute('data-name', champ.name);
        div.onclick = () => toggleChampSelection(champ.id);

        div.innerHTML = `
            <img src="champion_images/${champ.id}.png" alt="${champ.name}">
            <span>${champ.name}</span>
        `;
        grid.appendChild(div);
    });
}

function updateWeight(lane, val) {
    LANE_WEIGHTS[lane] = parseFloat(val);
    const el = document.getElementById(`wVal_${lane}`);
    if (el) el.innerText = val;
}

function toggleDuoActive(isChecked) {
    IS_DUO_ACTIVE = isChecked;
    renderList();
}

function openModal(mode, id = null) {
    const modal = document.getElementById('playerModal');
    if (!modal) return console.error("Modal not found");

    const title = document.getElementById('modalTitle');
    const duoArea = document.getElementById('duoSelectionArea');
    const champArea = document.getElementById('champSelectionArea'); 
    const duoSel = document.getElementById('pDuoLink');

    tempSelectedChamps = [];

    if (duoArea && champArea) {
        if (mode === 'edit' && IS_DUO_ACTIVE) {
            duoArea.style.display = 'block';
            champArea.style.flex = '2'; 
            
            if(duoSel) {
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
    if (el) el.style.display = 'none';
}

function openSettings() {
    const el = document.getElementById('settingsModal');
    if (el) el.style.display = 'block';
}

function openChampModal() {
    const el = document.getElementById('champModal');
    if (el) {
        el.style.display = 'block';
        const search = document.getElementById('champSearch');
        if (search) search.value = '';
        filterChampGrid();
        updateChampGridSelection();
        updateChampCount();
    }
}

function filterChampGrid() {
    const search = document.getElementById('champSearch');
    if (!search) return;
    const keyword = search.value.toLowerCase();
    const items = document.querySelectorAll('.champ-item');
    items.forEach(item => {
        const name = item.getAttribute('data-name') || "";
        if (name.includes(keyword)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
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
    if (editingId && IS_DUO_ACTIVE && duoLinkEl) {
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
    return DUO_COLORS[seed % DUO_COLORS.length];
}

// [V20.6] 챔피언 이름 조회 헬퍼 (함수 위치 이동)
function getChampName(id) {
    const c = safeChampionList.find(x => x.id === id);
    return c ? c.name : id;
}

// 드래그 앤 드롭 핸들러
function handleDragStart(e, t, l) {
    e.dataTransfer.setData('text/plain', JSON.stringify({ t, l }));
    e.target.closest('.role-row').classList.add('dragging');
}
function handleDragEnd(e) {
    e.target.closest('.role-row').classList.remove('dragging');
}
function handleDragOver(e) {
    e.preventDefault();
    e.target.closest('.role-row')?.classList.add('drag-over');
}
function handleDragLeave(e) {
    e.target.closest('.role-row')?.classList.remove('drag-over');
}
function handleDrop(e, tgtTeam) {
    e.preventDefault();
    e.target.closest('.role-row')?.classList.remove('drag-over');
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    if (!data) return;
    let row = e.target.closest('.role-row');
    let tgtLane = row ? Object.keys(LANE_NAMES).find(k => LANE_NAMES[k] === row.querySelector('.role-icon div').innerText) : null;
    if (data.t === tgtTeam && data.l === tgtLane) return;
    swapPlayers(data.t, data.l, tgtTeam, tgtLane);
}
function swapPlayers(st, sl, tt, tl) {
    const sSlots = st === 'BLUE' ? lastBlueSlots : lastRedSlots;
    const tSlots = tt === 'BLUE' ? lastBlueSlots : lastRedSlots;
    const sp = sSlots[sl];
    const tp = tSlots[tl];
    sSlots[sl] = tp;
    tSlots[tl] = sp;
    if (sp) sp.assignedLane = tl;
    if (tp) tp.assignedLane = sl;
    renderTR('blueList', 'blueScoreDisp', lastBlueSlots, 'BLUE');
    renderTR('redList', 'redScoreDisp', lastRedSlots, 'RED');
    if (typeof playSound === 'function') playSound('pick');
}

function renderList() {
    const list = document.getElementById('playerList');
    if (!list) return;

    const countEl = document.getElementById('playerCount');
    if (countEl) countEl.innerText = `${players.length} / 10 명`;

    list.innerHTML = '';

    players.forEach(p => {
        let duoHtml = '';
        if (IS_DUO_ACTIVE && p.duoId) {
            const partner = players.find(x => x.id === p.duoId);
            if (partner) {
                const color = getDuoColor(p);
                duoHtml = `<span class="badge duo" style="background:${color}">🔗 ${partner.name}</span>`;
            }
        }

        const avoidTxt = p.avoidPos !== 'NONE' ? `<span class="badge avoid">🚫 ${LANE_NAMES[p.avoidPos]}</span>` : '';

        let champHtml = '';
        if (Array.isArray(p.champ) && p.champ.length > 0) {
            champHtml = '<div class="champ-preview-list">';
            p.champ.forEach(id => {
                champHtml += `<img src="champion_images/${id}.png" class="champ-icon-small">`;
            });
            champHtml += '</div>';
        }

        list.innerHTML += `
        <div class="player-card">
            <div class="player-info" onclick="openModal('edit', ${p.id})">
                <span class="player-name">${p.name}</span>
                <div class="badges">
                    <span class="badge tier">${p.tierName}</span>
                    <span class="badge" style="background:#27ae60">1: ${LANE_NAMES[p.targetPos]}</span>
                    ${avoidTxt} ${duoHtml}
                </div>
                ${champHtml}
            </div>
            <button class="btn-del" onclick="removePlayer(${p.id})">×</button>
        </div>`;
    });
}

function calculateAndAssign() {
    if (players.length < 2) return alert("최소 2명");

    let blueSlots = {}, redSlots = {}; LANES.forEach(l => { blueSlots[l] = null; redSlots[l] = null; });
    let blueTeam = [], redTeam = [];

    let sorted = [...players].sort((a, b) => b.baseScore - a.baseScore || a.name.localeCompare(b.name));
    let unassigned = [...sorted];

    unassigned = attemptAssign(unassigned, '1ST', blueSlots, redSlots, blueTeam, redTeam, 1.0);
    unassigned = sortForNextRound(unassigned, 0.9);
    unassigned = attemptAssign(unassigned, '2ND', blueSlots, redSlots, blueTeam, redTeam, 0.9);
    unassigned = sortForNextRound(unassigned, 0.95);
    unassigned = attemptAssign(unassigned, 'MAIN', blueSlots, redSlots, blueTeam, redTeam, 0.95);
    unassigned = sortForNextRound(unassigned, 0.7);

    unassigned.forEach(p => {
        if (isAssignedInSlots(p.id, blueSlots, redSlots)) return;

        let candidates = [];
        let myPower = Math.round(p.baseScore * 0.7);
        if (blueTeam.length < 5) scanSlots(blueSlots, 'BLUE', candidates, myPower, redSlots, p.avoidPos);
        if (redTeam.length < 5) scanSlots(redSlots, 'RED', candidates, myPower, blueSlots, p.avoidPos);
        candidates.sort((a, b) => a.gap - b.gap);

        if (candidates.length > 0) {
            let best = candidates[0];
            let targetSlots = (best.team === 'BLUE') ? blueSlots : redSlots;
            let targetTeam = (best.team === 'BLUE') ? blueTeam : redTeam;

            if (assignTo(targetSlots, targetTeam, best.lane, p, 'AUTO', 0.7)) {
                if (IS_DUO_ACTIVE) handleDuo(p, targetSlots, targetTeam, blueSlots, redSlots);
            }
        } else {
            forceAssign(p, blueSlots, redSlots, blueTeam, redTeam);
        }
    });

    renderTR('blueList', 'blueScoreDisp', blueSlots);
    renderTR('redList', 'redScoreDisp', redSlots);
    findAce(blueSlots); findAce(redSlots);
    analyzeGap(blueSlots, redSlots);

    const rArea = document.getElementById('resultArea');
    if (rArea) {
        rArea.style.display = 'flex';
        setTimeout(() => rArea.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    const shareSec = document.getElementById('shareSection');
    if (shareSec) shareSec.style.display = 'flex';
}

function handleDuo(p, teamSlots, teamList, bSlots, rSlots) {
    if (!IS_DUO_ACTIVE || !p.duoId) return false;

    const partner = players.find(x => x.id === p.duoId);
    if (!partner || isAssignedInSlots(partner.id, bSlots, rSlots)) return false;

    if (teamList.length >= 5) return false;

    if (checkSafe(teamSlots, partner.targetPos, partner.avoidPos)) {
        assignTo(teamSlots, teamList, partner.targetPos, partner, 'DUO', 1.0);
        return true;
    }
    if (checkSafe(teamSlots, partner.subPos, partner.avoidPos)) {
        assignTo(teamSlots, teamList, partner.subPos, partner, 'DUO', 0.95);
        return true;
    }
    return false;
}

function isAssignedInSlots(pid, bSlots, rSlots, singleTeamSlots = null) {
    if (singleTeamSlots) return Object.values(singleTeamSlots).some(p => p && p.id === pid);
    let found = false;
    if (bSlots) found = found || Object.values(bSlots).some(p => p && p.id === pid);
    if (rSlots) found = found || Object.values(rSlots).some(p => p && p.id === pid);
    return found;
}

function sortForNextRound(queue, ratio) {
    return queue.map(p => ({ ...p, tempScore: Math.round(p.baseScore * ratio) }))
        .sort((a, b) => b.tempScore - a.tempScore || a.name.localeCompare(b.name));
}

function attemptAssign(queue, mode, bSlots, rSlots, bTeam, rTeam, ratio) {
    let nextQueue = [];
    let assignedIds = new Set();

    [bSlots, rSlots].forEach(slots => {
        Object.values(slots).forEach(p => { if (p) assignedIds.add(p.id); });
    });

    queue.forEach(p => {
        if (assignedIds.has(p.id)) return;

        let isTarget = false;
        let targetPos = null;
        let typeCode = mode;

        if (mode === '1ST') {
            if (p.targetPos !== 'ALL') { isTarget = true; targetPos = p.targetPos; }
            else { isTarget = true; targetPos = 'ALL'; typeCode = '1ST_RAND'; }
        } else if (mode === '2ND') {
            if (p.subPos !== 'ALL') { isTarget = true; targetPos = p.subPos; }
            else { isTarget = true; targetPos = 'ALL'; typeCode = '2ND_RAND'; }
        } else if (mode === 'MAIN') {
            if (p.mainPos !== 'ALL') { isTarget = true; targetPos = p.mainPos; }
        }

        if (!isTarget) { nextQueue.push(p); return; }

        let assigned = false;
        let bScore = calcTotalScore(bTeam);
        let rScore = calcTotalScore(rTeam);

        let weakTeamIsBlue;
        if (bTeam.length < rTeam.length) weakTeamIsBlue = true;
        else if (rTeam.length < bTeam.length) weakTeamIsBlue = false;
        else weakTeamIsBlue = (bScore <= rScore);

        let mySlots = weakTeamIsBlue ? bSlots : rSlots;
        let myTeam = weakTeamIsBlue ? bTeam : rTeam;
        let otherSlots = weakTeamIsBlue ? rSlots : bSlots;
        let otherTeam = weakTeamIsBlue ? rTeam : bTeam;

        if (checkSafe(mySlots, targetPos, p.avoidPos)) {
            assignTo(mySlots, myTeam, targetPos, p, typeCode, ratio);
            assigned = true;
            assignedIds.add(p.id);
            if (handleDuo(p, mySlots, myTeam, bSlots, rSlots)) {
                if (p.duoId) assignedIds.add(p.duoId);
            }
        }
        else if (otherTeam.length < 5 && checkSafe(otherSlots, targetPos, p.avoidPos)) {
            assignTo(otherSlots, otherTeam, targetPos, p, typeCode, ratio);
            assigned = true;
            assignedIds.add(p.id);
            if (handleDuo(p, otherSlots, otherTeam, bSlots, rSlots)) {
                if (p.duoId) assignedIds.add(p.duoId);
            }
        }

        if (!assigned) nextQueue.push(p);
    });

    return nextQueue.filter(x => !assignedIds.has(x.id));
}

function calcTotalScore(team) {
    return team.reduce((sum, p) => sum + (p.finalScore * (LANE_WEIGHTS[p.assignedLane] || 1.0)), 0);
}

function forceAssign(p, bSlots, rSlots, bTeam, rTeam) {
    let bestTeam = (bTeam.length < 5) ? bTeam : rTeam;
    let bestSlots = (bTeam.length < 5) ? bSlots : rSlots;
    let lane = LANES.find(l => bestSlots[l] === null);

    if (!lane && bTeam.length < 5) {
        bestTeam = (bestTeam === bTeam) ? rTeam : bTeam;
        bestSlots = (bestSlots === bSlots) ? rSlots : bSlots;
        lane = LANES.find(l => bestSlots[l] === null);
    }

    if (lane) {
        assignTo(bestSlots, bestTeam, lane, p, 'FORCE', 0.5);
    }
}

function checkSafe(slots, pos, avoidPos) {
    if (pos === 'ALL') return LANES.some(l => slots[l] === null && l !== avoidPos);
    if (pos === avoidPos) return false;
    return slots[pos] === null;
}

function assignTo(slots, teamList, pos, p, type, ratio) {
    let lane = pos;
    if (pos === 'ALL' || type.includes('RAND') || type === 'AUTO' || type === 'FORCE') {
        lane = LANES.find(l => slots[l] === null && (type === 'FORCE' ? true : l !== p.avoidPos));
    }

    if (!lane) return false;

    p.finalScore = Math.round(p.baseScore * ratio);
    p.isUnderdog = false; p.isAce = false;
    slots[lane] = { ...p, assignType: type, assignedLane: lane };
    teamList.push(p);
    return true;
}

function findAce(slots) {
    let bestP = null, maxScore = -1;
    LANES.forEach(l => {
        const p = slots[l];
        if (!p) return;
        if (['1ST', '1ST_RAND', '2ND', '2ND_RAND', 'MAIN'].includes(p.assignType) && p.mainPos === p.assignedLane) {
            if(p.finalScore > maxScore) { maxScore = p.finalScore; bestP = p; }
        }
    });
    if(bestP) bestP.isAce = true;
}

function scanSlots(slots, teamName, candidates, myPower, enemySlots, avoidPos) {
    LANES.forEach(lane => {
        if (slots[lane] === null && (avoidPos === 'IGNORE' || lane !== avoidPos)) {
            let enemy = enemySlots[lane];
            let gap = 5000;
            if (enemy) gap = Math.abs(myPower - enemy.finalScore);
            candidates.push({ team: teamName, lane: lane, gap: gap });
        }
    });
}

function analyzeGap(bSlots, rSlots) {
    LANES.forEach(lane => {
        const bp = bSlots[lane], rp = rSlots[lane];
        if (bp && rp && Math.abs(bp.finalScore - rp.finalScore) >= 350) {
            if (bp.finalScore < rp.finalScore) bp.isUnderdog = true; else rp.isUnderdog = true;
        }
    });
}


// 개선된 팀 라인업 렌더링 함수 (드래그 앤 드롭 지원)
function renderTR(lid, sid, slots, tStr) {
    const el = document.getElementById(lid); let total=0; el.innerHTML='';
    LANES.forEach(l => {
        const p = slots[l];
        let h = `<div class="role-row" draggable="true" ondragstart="handleDragStart(event,'${tStr}','${l}')" ondragend="handleDragEnd(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event,'${tStr}')" onclick="this.classList.toggle('active')">`;
        if(p) {
            total += p.finalScore * LANE_WEIGHTS[l];
            let b = '';
            if(IS_DUO_ACTIVE && p.duoId && Object.values(slots).some(teammate=>teammate&&teammate.id===p.duoId)) b=`<span class="pref-badge" style="background:${getDuoColor(p)}">🔗 듀오</span>`;
            else b=`<span class="pref-badge pref-${p.assignType.toLowerCase().split('_')[0]}">${p.assignType}</span>`;
            if(p.isAce) b+=' <span class="ace-badge">👑 ACE</span>';
            if(p.isUnderdog) b+=' <span class="pref-badge gap-warning">⚠️ 열세</span>';
            let c=''; if(p.champ?.length) { c='<div class="result-champ-container">'; p.champ.slice(0,10).forEach(id=>c+=`<img src="champion_images/${id}.png" class="result-champ-icon" title="${getChampName(id)}">`); c+='</div>'; }
            h += `<div class="role-icon lane-${l.toLowerCase()}"><div>${LANE_NAMES[l]}</div></div><div class="player-detail-col"><span class="player-name">${p.name} ${b}</span><div style="font-size:0.8rem; color:#888;">${p.tierName} (${LANE_NAMES[p.targetPos]})</div>${c}</div></div>`;
        } else { h += `<div class="role-icon lane-${l.toLowerCase()}"><div>${LANE_NAMES[l]}</div></div><div style="flex:1;">(비어있음)</div></div>`; }
        el.innerHTML+=h;
    });
}

function saveAndRender() { localStorage.setItem('lol_cw_v20_8', JSON.stringify(players)); renderList(); }
function loadData() { const d = localStorage.getItem('lol_cw_v20_8'); if (d) { players = JSON.parse(d); renderList(); } }
function resetAll() { if (confirm('리셋?')) { players = []; document.getElementById('resultArea').style.display = 'none'; saveAndRender(); } }
function exportPlayerCode() { /* Deprecated */ }
// [V21.0] 이미지 캡처 및 클립보드 복사 함수 (핵심)
function copyResultImage() {
    const element = document.getElementById('resultArea');
    if (!element || element.style.display === 'none') {
        return alert("결과가 생성된 후에 캡처할 수 있습니다.");
    }

    const btn = document.getElementById('btnCapture');
    const originalText = btn.innerText;
    btn.innerText = "📸 캡처 중...";
    btn.disabled = true;

    // html2canvas 옵션 설정
    html2canvas(element, {
        backgroundColor: "#121212", // 투명 배경 방지 (디스코드 최적화)
        scale: 2, // 고해상도 캡처
        useCORS: true, // 이미지 로드 이슈 방지
        logging: false
    }).then(canvas => {
        canvas.toBlob(blob => {
            if (!blob) {
                alert("이미지 생성 실패");
                resetBtn();
                return;
            }

            try {
                // Clipboard API로 이미지 쓰기
                const item = new ClipboardItem({ "image/png": blob });
                navigator.clipboard.write([item]).then(() => {
                    alert("✅ 이미지가 클립보드에 복사되었습니다!\n디스코드 입력창에 붙여넣기(Ctrl+V) 하세요.");
                    resetBtn();
                }).catch(err => {
                    console.error("클립보드 쓰기 실패:", err);
                    alert("클립보드 접근 권한이 없거나 지원하지 않는 브라우저입니다.");
                    resetBtn();
                });
            } catch (err) {
                console.error("ClipboardItem 오류:", err);
                alert("이 브라우저에서는 이미지 복사를 지원하지 않을 수 있습니다.");
                resetBtn();
            }
        });
    }).catch(err => {
        console.error("html2canvas 오류:", err);
        alert("캡처 중 오류가 발생했습니다.");
        resetBtn();
    });

    function resetBtn() {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// [V21.0] 로스터 파일 저장 (이전 기획 유지)
function saveRosterToFile() {
    if (players.length === 0) return alert("저장할 플레이어 데이터가 없습니다.");

    const dataObj = {
        version: "v21.0",
        timestamp: new Date().toISOString(),
        players: players
    };

    const jsonStr = JSON.stringify(dataObj, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const date = new Date();
    const fileName = `lol_cw_${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}_${date.getHours()}${date.getMinutes()}.json`;
    
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// [V21.0] 로스터 파일 불러오기
function handleFileLoad(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            const data = JSON.parse(content);

            if (data.players && Array.isArray(data.players)) {
                if(confirm("현재 리스트를 지우고 불러온 파일로 대체하시겠습니까?")) {
                    players = data.players;
                } else {
                    players = [...players, ...data.players];
                }
                saveAndRender(); 
                alert(`성공적으로 불러왔습니다! (${data.players.length}명)`);
            } else {
                alert("올바르지 않은 로스터 파일 형식입니다.");
            }
        } catch (err) {
            console.error(err);
            alert("파일을 읽는 중 오류가 발생했습니다.");
        }
    };
    reader.readAsText(file);
    input.value = ''; 
}

// [V21.0] 공유 텍스트 생성 함수 수정 (URL 제거)
function copyResultText() {
    const getTxt = (id) => {
        let s = "";
        const el = document.getElementById(id);
        if (!el) return "";
        const rows = el.getElementsByClassName('role-row');
        for (let row of rows) {
            let l = row.querySelector('.role-icon div').innerText; 
            let nameContainer = row.querySelector('.player-name');
            let nameClone = nameContainer.cloneNode(true);
            nameClone.querySelectorAll('span').forEach(e => e.remove());
            let name = nameClone.innerText.trim();

            let extras = [];
            if (row.querySelector('.ace-badge')) extras.push("👑ACE");
            if (row.querySelector('.gap-warning')) extras.push("⚠️열세");
            
            let extraTxt = extras.length > 0 ? ` ${extras.join(' ')}` : "";
            s += `${l.padEnd(3, ' ')} :: ${name}${extraTxt}\n`;
        } 
        return s;
    };

    const txt = "```asciidoc\n= 결과 =\n[BLUE]\n" + getTxt('blueList') + "\n[RED]\n" + getTxt('redList') + "```\n" +
                "💡 **상세 설정 공유:** '로스터 저장' 버튼을 눌러 .json 파일을 디스코드에 업로드하세요.";

    if (navigator.clipboard) {
        navigator.clipboard.writeText(txt).then(() => alert('결과 텍스트가 복사되었습니다!'));
    } else {
        alert("클립보드 복사를 지원하지 않는 브라우저입니다.");
    }
}

// [V20.8] 수정된 코드 생성 (압축 적용)
function generateModalCode() {
    const nameEl = document.getElementById('pName');
    const n = nameEl ? nameEl.value.trim() : '';
    if (!n) return alert("이름을 먼저 입력하세요.");

    // 압축을 위해 필요한 데이터만 선별
    const d = {
        n: n,
        s: parseInt(document.getElementById('pTierCombined').value),
        t: document.getElementById('pTargetPos').value,
        u: document.getElementById('pSubPos').value,
        m: document.getElementById('pMainPos').value,
        a: document.getElementById('pAvoidPos').value,
        c: [...tempSelectedChamps]
    };

    // JSON -> String -> LZString Compress
    const jsonStr = JSON.stringify(d);
    const code = LZString.compressToEncodedURIComponent(jsonStr);

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(code).then(() => alert("압축된 공유 코드가 복사되었습니다!"));
    } else {
        prompt("아래 코드를 복사하세요:", code);
    }
}

// [V20.8] 수정된 코드 가져오기 (압축 해제)
function importPlayerCode() {
    const cEl = document.getElementById('importCode');
    const code = cEl ? cEl.value.trim() : '';
    if (!code) return;

    try {
        // LZString Decompress
        const jsonStr = LZString.decompressFromEncodedURIComponent(code);
        if(!jsonStr) throw new Error("압축 해제 실패");
        
        const d = JSON.parse(jsonStr);
        
        // 티어 점수로 티어 이름 찾기
        const tierObj = TIER_DATA.find(t => t.score === d.s) || { name: "Unknown" };

        players.push({ 
            id: Date.now(), 
            name: d.n, 
            baseScore: d.s, 
            tierName: tierObj.name, 
            targetPos: d.t, 
            subPos: d.u, 
            mainPos: d.m, 
            avoidPos: d.a, 
            champ: d.c || []
        });
        cEl.value = ''; 
        saveAndRender();
    } catch (e) { 
        console.error(e);
        alert('올바르지 않거나 손상된 코드입니다.'); 
    }
}

// 개선된 밸런싱 및 결과 표시 로직
let lastBlueSlots = null, lastRedSlots = null;
// 최신 calculateAndAssign 함수만 유지 (renderTR 사용)
function calculateAndAssign() {
    if (players.length < 2) return alert("최소 2명");
    let blueSlots = {}, redSlots = {}; LANES.forEach(l => { blueSlots[l] = null; redSlots[l] = null; });
    let blueTeam = [], redTeam = [];

    let sorted = [...players].sort((a, b) => b.baseScore - a.baseScore || a.name.localeCompare(b.name));
    let unassigned = [...sorted];

    unassigned = attemptAssign(unassigned, '1ST', blueSlots, redSlots, blueTeam, redTeam, 1.0);
    unassigned = sortForNextRound(unassigned, 0.9);
    unassigned = attemptAssign(unassigned, '2ND', blueSlots, redSlots, blueTeam, redTeam, 0.9);
    unassigned = sortForNextRound(unassigned, 0.95);
    unassigned = attemptAssign(unassigned, 'MAIN', blueSlots, redSlots, blueTeam, redTeam, 0.95);
    unassigned = sortForNextRound(unassigned, 0.7);

    unassigned.forEach(p => {
        if (isAssignedInSlots(p.id, blueSlots, redSlots)) return;

        let candidates = [];
        let myPower = Math.round(p.baseScore * 0.7);
        if (blueTeam.length < 5) scanSlots(blueSlots, 'BLUE', candidates, myPower, redSlots, p.avoidPos);
        if (redTeam.length < 5) scanSlots(redSlots, 'RED', candidates, myPower, blueSlots, p.avoidPos);
        candidates.sort((a, b) => a.gap - b.gap);

        if (candidates.length > 0) {
            let best = candidates[0];
            let targetSlots = (best.team === 'BLUE') ? blueSlots : redSlots;
            let targetTeam = (best.team === 'BLUE') ? blueTeam : redTeam;

            if (assignTo(targetSlots, targetTeam, best.lane, p, 'AUTO', 0.7)) {
                if (IS_DUO_ACTIVE) handleDuo(p, targetSlots, targetTeam, blueSlots, redSlots);
            }
        } else {
            forceAssign(p, blueSlots, redSlots, blueTeam, redTeam);
        }
    });

    lastBlueSlots = blueSlots; lastRedSlots = redSlots;
    findAce(blueSlots); findAce(redSlots);
    analyzeGap(blueSlots, redSlots);
    renderTR('blueList', 'blueScoreDisp', blueSlots, 'BLUE');
    renderTR('redList', 'redScoreDisp', redSlots, 'RED');
    const rArea = document.getElementById('resultArea');
    if (rArea) {
        rArea.style.display = 'flex';
        setTimeout(() => rArea.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    const shareSec = document.getElementById('shareSection');
    if (shareSec) shareSec.style.display = 'flex';

    const aiAnalyzeSec = document.getElementById('aiAnalyzeSection');
    if (aiAnalyzeSec) aiAnalyzeSec.style.display = 'flex';
}