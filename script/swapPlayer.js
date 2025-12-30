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