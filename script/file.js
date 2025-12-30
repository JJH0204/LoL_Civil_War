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

window.saveRosterToFile = saveRosterToFile;
window.handleFileLoad = handleFileLoad;