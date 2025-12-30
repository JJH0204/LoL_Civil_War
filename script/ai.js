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
        const p = lastBlueSlots[l];
        const c = p.champ && p.champ.length ? p.champ.map(id => getChampName(id)).join(',') : '모름';
        user += `- ${LANE_NAMES[l]}: ${p.name} (${p.tierName}) [${c}]\n`;
    });
    user += `\n[레드팀]\n`;
    LANES.forEach(l => {
        const p = lastRedSlots[l];
        const c = p.champ && p.champ.length ? p.champ.map(id => getChampName(id)).join(',') : '모름';
        user += `- ${LANE_NAMES[l]}: ${p.name} (${p.tierName}) [${c}]\n`;
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

// Gemini API 호출
async function fetchGeminiResponse(key, prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '분석 실패';
}

// AI 분석 메인 함수
async function analyzeGameAI() {
    if (!lastBlueSlots || !lastRedSlots) return alert("먼저 팀 배정을 완료해주세요.");
    const apiKey = (AI_PROVIDER === 'gemini') ? GEMINI_API_KEY : OPENAI_API_KEY;
    if (!apiKey) { alert("API Key가 없습니다. 설정에서 입력해주세요."); openSettings(); return; }

    const modal = document.getElementById('aiModal');
    const loading = document.getElementById('aiLoading');
    const content = document.getElementById('aiResultContent');
    showModal('aiModal'); loading.style.display = 'block'; content.style.display = 'none'; content.innerHTML = '';

    const prompt = createAiPrompt();
    try {
        let aiText = "";
        if (AI_PROVIDER === 'gemini') aiText = await fetchGeminiResponse(apiKey, prompt);
        else aiText = await fetchOpenAIResponse(apiKey, prompt);
        loading.style.display = 'none'; content.style.display = 'block'; content.innerHTML = marked.parse(aiText);
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

window.analyzeGameAI = analyzeGameAI;
window.createAiPrompt = createAiPrompt;
window.fetchOpenAIResponse = fetchOpenAIResponse;
window.fetchGeminiResponse = fetchGeminiResponse;
window.saveApiKeys = saveApiKeys;
