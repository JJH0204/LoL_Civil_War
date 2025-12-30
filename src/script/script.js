import '../style.css'
import './championList.js';
import './opgg.js';
import './player.js';
import './common.js';
import './ai.js';
import './file.js';
import './swapPlayer.js';
import './team.js';
import './gemini.js';

let IS_DUO_ACTIVE = true;
if (typeof window !== 'undefined') {
    window.IS_DUO_ACTIVE = IS_DUO_ACTIVE;
}
// let tempSelectedChamps = []; // 중복 선언 방지: 이미 다른 파일에서 선언됨

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
    window.championList.forEach(champ => {
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
    window.LANE_WEIGHTS[lane] = parseFloat(val);
    const el = document.getElementById(`wVal_${lane}`);
    if (el) el.innerText = val;
}

function toggleDuoActive(isChecked) {
    window.IS_DUO_ACTIVE = isChecked;
    renderList();
}

function showModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('show');
    }
}
window.showModal = showModal;

function openSettings() {
    const el = document.getElementById('settingsModal');
    if (el) el.style.display = 'block';
    const providerSel = document.getElementById('aiProviderSelect');
    if (providerSel) window.toggleAiInput(providerSel.value);
}
window.openSettings = openSettings;

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
window.openChampModal = openChampModal;

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

// HTML에서 직접 호출할 수 있도록 window에 등록
window.filterChampGrid = filterChampGrid;

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

function saveAndRender() { localStorage.setItem('lol_cw_v20_8', JSON.stringify(players)); renderList(); }
window.saveAndRender = saveAndRender;
function loadData() { const d = localStorage.getItem('lol_cw_v20_8'); if (d) { players = JSON.parse(d); renderList(); } }
function resetAll() { if (confirm('리셋?')) { players = []; document.getElementById('resultArea').style.display = 'none'; saveAndRender(); } }
function exportPlayerCode() { /* Deprecated */ }