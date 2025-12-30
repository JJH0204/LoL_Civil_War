// gemini.js
// Google Gemini API 연동 전용 모듈 (번들러 환경에서 import 사용)
// window.gemini로 등록

import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = window.GEMINI_API_KEY || ""; // index.html 등에서 window.GEMINI_API_KEY로 주입
const GEMINI_MODEL = "gemini-3-flash-preview";

let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

async function geminiChat(messages, options = {}) {
  if (!genAI) throw new Error("Gemini API 키가 없습니다.");
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent({ contents: messages, ...options });
  return result.response.text();
}

window.gemini = {
  chat: geminiChat,
  getGenAI: () => genAI,
  model: GEMINI_MODEL,
};
