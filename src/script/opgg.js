function openOpggMulti() {
    if(!players.length) return alert("플레이어 없음");
    window.open(`https://www.op.gg/multisearch/kr?summoners=${encodeURIComponent(players.map(p=>p.name).join(','))}`, '_blank');
}

window.openOpggMulti = openOpggMulti;