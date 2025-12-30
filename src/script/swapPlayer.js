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
    window.renderTR('blueList', 'blueScoreDisp', window.lastBlueSlots, 'BLUE');
    window.renderTR('redList', 'redScoreDisp', window.lastRedSlots, 'RED');
    if (typeof window.playSound === 'function') window.playSound('pick');
}

// 전역 등록
window.handleDragStart = handleDragStart;
window.handleDragEnd = handleDragEnd;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleDrop = handleDrop;
window.swapPlayers = swapPlayers;