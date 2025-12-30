// AI 분석 캐시: 팀 상태 해시 → 결과 텍스트
window.aiAnalysisCache = {};
function getTeamHash() {
    // 팀 상태를 문자열로 serialize (순서 보장)
    const blue = window.lastBlueSlots ? JSON.stringify(window.lastBlueSlots) : '';
    const red = window.lastRedSlots ? JSON.stringify(window.lastRedSlots) : '';
    return blue + '|' + red;
}

// 전역 변수 선언 및 동기화
window.AI_PROVIDER = localStorage.getItem('ai_provider') || 'openai';
window.OPENAI_API_KEY = localStorage.getItem('openai_key') || '';
window.GEMINI_API_KEY = localStorage.getItem('gemini_key') || '';

// 설정 select/input 변경 시 동기화 함수
function saveApiKeys() {
    const providerSel = document.getElementById('aiProviderSelect');
    const openaiInput = document.getElementById('openaiKeyInput');
    const geminiInput = document.getElementById('geminiKeyInput');
    if (providerSel) {
        window.AI_PROVIDER = providerSel.value;
        localStorage.setItem('ai_provider', providerSel.value);
    }
    if (openaiInput) {
        window.OPENAI_API_KEY = openaiInput.value;
        localStorage.setItem('openai_key', openaiInput.value);
    }
    if (geminiInput) {
        window.GEMINI_API_KEY = geminiInput.value;
        localStorage.setItem('gemini_key', geminiInput.value);
    }
}

// 페이지 로드시 select/input 값 동기화
window.addEventListener('DOMContentLoaded', () => {
    const providerSel = document.getElementById('aiProviderSelect');
    const openaiInput = document.getElementById('openaiKeyInput');
    const geminiInput = document.getElementById('geminiKeyInput');
    if (providerSel && window.AI_PROVIDER) providerSel.value = window.AI_PROVIDER;
    if (openaiInput && window.OPENAI_API_KEY) openaiInput.value = window.OPENAI_API_KEY;
    if (geminiInput && window.GEMINI_API_KEY) geminiInput.value = window.GEMINI_API_KEY;
});

// AI 분석 프롬프트 생성
function createAiPrompt() {
    const system = '당신은 LoL 전문 해설가입니다. 분석적이고 위트 있게 게임 양상을 예측해주세요.';
    let user = `[블루팀]\n`;
    LANES.forEach(l => {
        const p = window.lastBlueSlots[l];
        const c = (p && p.champ && p.champ.length) ? p.champ.map(id => getChampName(id)).join(',') : '모름';
        user += `- ${LANE_NAMES[l]}: ${p ? p.name : '비어있음'} (${p ? p.tierName : '-'}) [${c}]\n`;
    });
    user += `\n[레드팀]\n`;
    LANES.forEach(l => {
        const p = window.lastRedSlots[l];
        const c = (p && p.champ && p.champ.length) ? p.champ.map(id => getChampName(id)).join(',') : '모름';
        user += `- ${LANE_NAMES[l]}: ${p ? p.name : '비어있음'} (${p ? p.tierName : '-'}) [${c}]\n`;
    });
    return AI_PROVIDER === 'gemini'
        ? `${system}\n\n${user}\n\n분석 항목: 1.🔥격전지 2.⚖️양상 3.👑승리플랜 4.🎙️한줄평`
        : user + '\n항목: 1.🔥격전지 2.⚖️양상 3.👑승리플랜 4.🎙️한줄평';
}

// OpenAI API 호출
async function fetchOpenAIResponse(key, userPrompt) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: '당신은 LoL 전문 해설가입니다.' },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 600
        })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
}

// Gemini API 호출 (공식 SDK 예제 스타일 반영, gemini-3-flash-preview)
async function fetchGeminiResponse(key, prompt) {
    // GoogleGenAI SDK 없이 REST API로 최대한 유사하게 구현
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${key}`;
    const body = {
        contents: [
            {
                role: "user",
                parts: [ { text: prompt } ]
            }
        ]
    };
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    // 공식 SDK 예제와 동일하게 응답 파싱
    if (data.response && data.response.candidates && data.response.candidates[0]?.content?.parts[0]?.text) {
        return data.response.candidates[0].content.parts[0].text;
    }
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text;
    }
    if (data.text) return data.text;
    if (data.error) throw new Error(data.error.message);
    return '분석 실패';
}

// AI 분석 메인 함수
async function analyzeGameAI() {
    // console.log('[AI] lastBlueSlots:', window.lastBlueSlots);
    // console.log('[AI] lastRedSlots:', window.lastRedSlots);
    if (!window.lastBlueSlots || !window.lastRedSlots) return alert("먼저 팀 배정을 완료해주세요.");
    const apiKey = (AI_PROVIDER === 'gemini') ? GEMINI_API_KEY : OPENAI_API_KEY;
    if (!apiKey) { alert("API Key가 없습니다. 설정에서 입력해주세요."); openSettings(); return; }

    const modal = document.getElementById('aiModal');
    const loading = document.getElementById('aiLoading');
    const content = document.getElementById('aiResultContent');
    showModal('aiModal'); loading.style.display = 'block'; content.style.display = 'none'; content.innerHTML = '';

    const teamHash = getTeamHash();
    if (window.aiAnalysisCache[teamHash]) {
        loading.style.display = 'none';
        content.style.display = 'block';
        renderAiResultWithShare(content, window.aiAnalysisCache[teamHash]);
        return;
    }

    const prompt = createAiPrompt();
    try {
        let aiText = "";
        if (AI_PROVIDER === 'gemini') aiText = await fetchGeminiResponse(apiKey, prompt);
        else aiText = await fetchOpenAIResponse(apiKey, prompt);
        window.aiAnalysisCache[teamHash] = aiText;
        loading.style.display = 'none'; content.style.display = 'block';
        renderAiResultWithShare(content, aiText);
    } catch (error) {
        loading.style.display = 'none'; content.style.display = 'block';
        content.innerHTML = `<p style=\"color: #e74c3c;\">⚠️ 오류: ${error.message}</p>`;
        let debugMsg =
            '[AI 분석 예외 발생!]\n' +
            '에러: ' + (error && error.message ? error.message : error) + '\n' +
            (error && error.stack ? ('스택: ' + error.stack + '\n') : '') +
            'AI_PROVIDER: ' + (typeof AI_PROVIDER !== 'undefined' ? AI_PROVIDER : 'undefined') + '\n' +
            'API Key: ' + (apiKey ? (apiKey.slice(0,6) + '...') : '없음') + '\n' +
            'Prompt: ' + (prompt ? prompt.slice(0,120) + (prompt.length>120?'...':'') : '없음');
        alert(debugMsg);
    }
}

// 분석 결과 + 디스코드 공유 버튼 렌더링
function renderAiResultWithShare(contentEl, aiText) {
    contentEl.innerHTML = marked.parse(aiText) +
        `<div style="margin-top:24px; text-align:right;">
            <button id="btnCopyAiResult" class="btn-icon" style="background:#5865F2; color:#fff; font-weight:bold; border:none; padding:10px 18px; border-radius:6px; font-size:1rem;">
                📋 디스코드로 공유(텍스트 복사)
            </button>
        </div>`;
    const btn = document.getElementById('btnCopyAiResult');
    if (btn) {
        btn.onclick = function() {
            const plain = aiText.replace(/<[^>]+>/g, '');
            navigator.clipboard.writeText(plain).then(() => {
                btn.innerText = '✅ 복사 완료!';
                setTimeout(()=>{btn.innerText='📋 디스코드로 공유(텍스트 복사)';}, 1500);
            }).catch(()=>{
                btn.innerText = '❌ 복사 실패';
                setTimeout(()=>{btn.innerText='📋 디스코드로 공유(텍스트 복사)';}, 1500);
            });
        };
    }
}

function toggleAiInput(val) {
    const openaiArea = document.getElementById('openaiKeyArea');
    const geminiArea = document.getElementById('geminiKeyArea');
    if (val === 'openai') {
        if (openaiArea) openaiArea.style.display = '';
        if (geminiArea) geminiArea.style.display = 'none';
    } else if (val === 'gemini') {
        if (openaiArea) openaiArea.style.display = 'none';
        if (geminiArea) geminiArea.style.display = '';
    }
}

window.analyzeGameAI = analyzeGameAI;
window.createAiPrompt = createAiPrompt;
window.fetchOpenAIResponse = fetchOpenAIResponse;
window.fetchGeminiResponse = fetchGeminiResponse;
window.saveApiKeys = saveApiKeys;
window.toggleAiInput = toggleAiInput;
