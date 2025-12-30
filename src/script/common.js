// 공통 상수/유틸리티 함수 분리
// 예시: LANES, LANE_NAMES, TIER_DATA, getChampName 등

const LANES = ['TOP', 'JUG', 'MID', 'ADC', 'SUP'];
const LANE_NAMES = { 'TOP': '탑', 'JUG': '정글', 'MID': '미드', 'ADC': '원딜', 'SUP': '서폿', 'ALL': '랜덤', 'NONE': '없음' };
const DUO_COLORS = ['#fd79a8', '#00b894', '#0984e3', '#e17055', '#6c5ce7', '#fdcb6e'];

let LANE_WEIGHTS = { 'TOP': 1.0, 'JUG': 1.0, 'MID': 1.0, 'ADC': 1.0, 'SUP': 1.0 };

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

// 챔피언 이름 조회 헬퍼
function getChampName(id) {
    if (!window.championList) return id;
    const c = window.championList.find(x => x.id === id);
    return c ? c.name : id;
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
        let d;
        try {
            d = JSON.parse(jsonStr);
        } catch (jsonErr) {
            throw new Error("공유 코드가 올바르지 않거나 손상되었습니다. (JSON 파싱 실패)\n\n다시 복사해 붙여넣어 주세요.");
        }
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
    } catch (err) {
        console.error(err);
        alert(err.message || '올바르지 않거나 손상된 코드입니다.');
    }
}

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

function playSound(name) {
    const audio = new Audio(`sounds/${name}.mp3`);
    audio.volume = 0.5;
    audio.play();
}

// 전역 등록
window.LANES = LANES;
window.LANE_NAMES = LANE_NAMES;
window.DUO_COLORS = DUO_COLORS;
window.LANE_WEIGHTS = LANE_WEIGHTS;
window.TIER_DATA = TIER_DATA;
window.getChampName = getChampName;
window.generateModalCode = generateModalCode;
window.importPlayerCode = importPlayerCode;
window.copyResultImage = copyResultImage;
window.playSound = playSound;

if (championList !== 'undefined') {
    window.championList = championList;
}
else {
    console.warn("championList.js가 로드되지 않았습니다.");
}