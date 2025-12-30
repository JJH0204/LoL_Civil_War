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
    let tgtLane = row ? Object.keys(window.LANE_NAMES).find(k => window.LANE_NAMES[k] === row.querySelector('.role-icon div').innerText) : null;
    if (data.t === tgtTeam && data.l === tgtLane) return;
    swapPlayers(data.t, data.l, tgtTeam, tgtLane);
}
function swapPlayers(st, sl, tt, tl) {
    const sSlots = st === 'BLUE' ? window.lastBlueSlots : window.lastRedSlots;
    const tSlots = tt === 'BLUE' ? window.lastBlueSlots : window.lastRedSlots;
    const sp = sSlots[sl];
    const tp = tSlots[tl];
    sSlots[sl] = tp;
    tSlots[tl] = sp;
    if (sp) sp.assignedLane = tl;
    if (tp) tp.assignedLane = sl;

    // window.players의 assignedLane, 팀 정보 동기화 및 해당 라인만 isAce/isUnderdog 초기화
    if (Array.isArray(window.players)) {
        window.players.forEach(p => {
            // 스왑된 라인만 초기화
            if (p.assignedLane === tl && p.team === tt) { p.isAce = false; p.isUnderdog = false; }
            if (p.assignedLane === sl && p.team === st) { p.isAce = false; p.isUnderdog = false; }
            // BLUE
            for (const lane in window.lastBlueSlots) {
                const slotP = window.lastBlueSlots[lane];
                if (slotP && p.id === slotP.id) {
                    p.assignedLane = lane;
                    p.team = 'BLUE';
                }
            }
            // RED
            for (const lane in window.lastRedSlots) {
                const slotP = window.lastRedSlots[lane];
                if (slotP && p.id === slotP.id) {
                    p.assignedLane = lane;
                    p.team = 'RED';
                }
            }
        });
    }

    // 스왑된 라인만 에이스/열세 재분석 (팀 내 교체도 상대 라인과 비교)
    function updateLaneAceUnderdog(lane) {
        const bp = window.lastBlueSlots[lane];
        const rp = window.lastRedSlots[lane];
        if (bp && rp) {
            // 에이스: 둘 중 전투력 높은 쪽
            if (bp.finalScore > rp.finalScore) { bp.isAce = true; rp.isAce = false; }
            else if (rp.finalScore > bp.finalScore) { rp.isAce = true; bp.isAce = false; }
            else { bp.isAce = false; rp.isAce = false; }
            // 열세: 350 이상 차이
            bp.isUnderdog = rp.isUnderdog = false;
            if (Math.abs(bp.finalScore - rp.finalScore) >= 350) {
                if (bp.finalScore < rp.finalScore) bp.isUnderdog = true;
                else rp.isUnderdog = true;
            }
        } else if (bp) {
            bp.isAce = true; bp.isUnderdog = false;
        } else if (rp) {
            rp.isAce = true; rp.isUnderdog = false;
        }
    }
    // 팀 내 교체면 두 라인 모두, 팀 교체면 각각
    updateLaneAceUnderdog(tl);
    if (sl !== tl || st !== tt) updateLaneAceUnderdog(sl);

    // 해당 라인만 렌더링 (전체 갱신)
    if (typeof window.renderTR === 'function') {
        window.renderTR('blueList', 'blueScoreDisp', window.lastBlueSlots, 'BLUE');
        window.renderTR('redList', 'redScoreDisp', window.lastRedSlots, 'RED');
    }
    if (typeof window.playSound === 'function') window.playSound('pick');
}

// 전역 등록
window.handleDragStart = handleDragStart;
window.handleDragEnd = handleDragEnd;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleDrop = handleDrop;
window.swapPlayers = swapPlayers;