// 공통 상수/유틸리티 함수 분리
// 예시: LANES, LANE_NAMES, TIER_DATA, getChampName 등

const LANES = ['TOP', 'JUG', 'MID', 'ADC', 'SUP'];
const LANE_NAMES = { 'TOP': '탑', 'JUG': '정글', 'MID': '미드', 'ADC': '원딜', 'SUP': '서폿', 'ALL': '랜덤', 'NONE': '없음' };
const DUO_COLORS = ['#fd79a8', '#00b894', '#0984e3', '#e17055', '#6c5ce7', '#fdcb6e'];

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

// 전역 등록
window.LANES = LANES;
window.LANE_NAMES = LANE_NAMES;
window.DUO_COLORS = DUO_COLORS;
window.TIER_DATA = TIER_DATA;
window.getChampName = getChampName;
