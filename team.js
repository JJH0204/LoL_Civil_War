
// 팀 밸런싱/결과 렌더링 관련 데이터 및 함수
let lastBlueSlots = null, lastRedSlots = null;

function calculateAndAssign() {
    if (window.players.length < 2) return alert("최소 2명");

    let blueSlots = {}, redSlots = {};
    window.LANES.forEach(l => { blueSlots[l] = null; redSlots[l] = null; });
    let blueTeam = [], redTeam = [];

    let sorted = [...window.players].sort((a, b) => b.baseScore - a.baseScore || a.name.localeCompare(b.name));
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
                if (window.IS_DUO_ACTIVE) handleDuo(p, targetSlots, targetTeam, blueSlots, redSlots);
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

function handleDuo(p, teamSlots, teamList, bSlots, rSlots) {
    if (!window.IS_DUO_ACTIVE || !p.duoId) return false;

    const partner = window.players.find(x => x.id === p.duoId);
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
    return team.reduce((sum, p) => sum + (p.finalScore * (window.LANE_WEIGHTS[p.assignedLane] || 1.0)), 0);
}

function forceAssign(p, bSlots, rSlots, bTeam, rTeam) {
    let bestTeam = (bTeam.length < 5) ? bTeam : rTeam;
    let bestSlots = (bTeam.length < 5) ? bSlots : rSlots;
    let lane = window.LANES.find(l => bestSlots[l] === null);

    if (!lane && bTeam.length < 5) {
        bestTeam = (bestTeam === bTeam) ? rTeam : bTeam;
        bestSlots = (bestSlots === bSlots) ? rSlots : bSlots;
        lane = window.LANES.find(l => bestSlots[l] === null);
    }

    if (lane) {
        assignTo(bestSlots, bestTeam, lane, p, 'FORCE', 0.5);
    }
}

function checkSafe(slots, pos, avoidPos) {
    if (pos === 'ALL') return window.LANES.some(l => slots[l] === null && l !== avoidPos);
    if (pos === avoidPos) return false;
    return slots[pos] === null;
}

function assignTo(slots, teamList, pos, p, type, ratio) {
    let lane = pos;
    if (pos === 'ALL' || type.includes('RAND') || type === 'AUTO' || type === 'FORCE') {
        lane = window.LANES.find(l => slots[l] === null && (type === 'FORCE' ? true : l !== p.avoidPos));
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
    window.LANES.forEach(l => {
        const p = slots[l];
        if (!p) return;
        if ([
            '1ST', '1ST_RAND', '2ND', '2ND_RAND', 'MAIN'
        ].includes(p.assignType) && p.mainPos === p.assignedLane) {
            if(p.finalScore > maxScore) { maxScore = p.finalScore; bestP = p; }
        }
    });
    if(bestP) bestP.isAce = true;
}

function scanSlots(slots, teamName, candidates, myPower, enemySlots, avoidPos) {
    window.LANES.forEach(lane => {
        if (slots[lane] === null && (avoidPos === 'IGNORE' || lane !== avoidPos)) {
            let enemy = enemySlots[lane];
            let gap = 5000;
            if (enemy) gap = Math.abs(myPower - enemy.finalScore);
            candidates.push({ team: teamName, lane: lane, gap: gap });
        }
    });
}

function analyzeGap(bSlots, rSlots) {
    window.LANES.forEach(lane => {
        const bp = bSlots[lane], rp = rSlots[lane];
        if (bp && rp && Math.abs(bp.finalScore - rp.finalScore) >= 350) {
            if (bp.finalScore < rp.finalScore) bp.isUnderdog = true; else rp.isUnderdog = true;
        }
    });
}

function renderTR(lid, sid, slots, tStr) {
    const el = document.getElementById(lid); let total=0; el.innerHTML='';
    window.LANES.forEach(l => {
        const p = slots[l];
        let h = `<div class="role-row" draggable="true" ondragstart="handleDragStart(event,'${tStr}','${l}')" ondragend="handleDragEnd(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event,'${tStr}')" onclick="this.classList.toggle('active')">`;
        if(p) {
            total += p.finalScore * window.LANE_WEIGHTS[l];
            let b = '';
            if(window.IS_DUO_ACTIVE && p.duoId && Object.values(slots).some(teammate=>teammate&&teammate.id===p.duoId)) b=`<span class="pref-badge" style="background:${window.getDuoColor ? window.getDuoColor(p) : ''}">🔗 듀오</span>`;
            else b=`<span class="pref-badge pref-${p.assignType.toLowerCase().split('_')[0]}">${p.assignType}</span>`;
            if(p.isAce) b+=' <span class="ace-badge">👑 ACE</span>';
            if(p.isUnderdog) b+=' <span class="pref-badge gap-warning">⚠️ 열세</span>';
            let c=''; if(p.champ?.length) { c='<div class="result-champ-container">'; p.champ.slice(0,10).forEach(id=>c+=`<img src="champion_images/${id}.png" class="result-champ-icon" title="${window.getChampName ? window.getChampName(id) : id}">`); c+='</div>'; }
            h += `<div class="role-icon lane-${l.toLowerCase()}"><div>${window.LANE_NAMES[l]}</div></div><div class="player-detail-col"><span class="player-name">${p.name} ${b}</span><div style="font-size:0.8rem; color:#888;">${p.tierName} (${window.LANE_NAMES[p.targetPos]})</div>${c}</div></div>`;
        } else { h += `<div class="role-icon lane-${l.toLowerCase()}"><div>${window.LANE_NAMES[l]}</div></div><div style="flex:1;">(비어있음)</div></div>`; }
        el.innerHTML+=h;
    });
}

// 전역 등록
window.calculateAndAssign = calculateAndAssign;
window.renderTR = renderTR;
window.attemptAssign = attemptAssign;
window.forceAssign = forceAssign;
window.lastBlueSlots = lastBlueSlots;
window.lastRedSlots = lastRedSlots;
