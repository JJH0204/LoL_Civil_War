import os
import requests
import json

# ==========================================
# 설정
# ==========================================
SAVE_DIR = "champion_images"  # 이미지가 저장될 폴더명
DATA_FILE = "championList.js" # 생성될 자바스크립트 데이터 파일명

# ==========================================
# 로직
# ==========================================

def download_lol_assets():
    # 1. 폴더 생성
    if not os.path.exists(SAVE_DIR):
        os.makedirs(SAVE_DIR)
        print(f"📁 '{SAVE_DIR}' 폴더를 생성했습니다.")

    # 2. 최신 버전 확인 (Data Dragon Versions)
    print("🔍 최신 버전을 확인 중...")
    version_url = "https://ddragon.leagueoflegends.com/api/versions.json"
    versions = requests.get(version_url).json()
    latest_version = versions[0]
    print(f"✅ 현재 최신 버전: {latest_version}")

    # 3. 챔피언 데이터 가져오기 (한국어 기준)
    print("📥 챔피언 리스트 데이터를 가져오는 중...")
    data_url = f"http://ddragon.leagueoflegends.com/cdn/{latest_version}/data/ko_KR/champion.json"
    response = requests.get(data_url)
    champion_data = response.json()['data']

    # 웹에서 사용할 데이터 리스트 준비
    web_data_list = []

    print(f"🚀 총 {len(champion_data)}명의 챔피언 이미지를 다운로드합니다...")

    # 4. 순회하며 다운로드 및 데이터 가공
    count = 0
    for champ_id, info in champion_data.items():
        # champ_id는 영문명 (예: Aatrox), info['name']은 한글명 (예: 아트록스)
        
        # 이미지 URL 생성 (정사각형 120x120)
        img_url = f"http://ddragon.leagueoflegends.com/cdn/{latest_version}/img/champion/{champ_id}.png"
        
        # 이미지 다운로드
        img_data = requests.get(img_url).content
        
        # 파일 저장 (영문명.png)
        file_path = os.path.join(SAVE_DIR, f"{champ_id}.png")
        with open(file_path, 'wb') as handler:
            handler.write(img_data)
        
        # 웹용 데이터 리스트에 추가
        web_data_list.append({
            "id": champ_id,      # 영문 ID (이미지 파일명과 동일)
            "name": info['name'] # 한글 이름
        })
        
        count += 1
        print(f"[{count}/{len(champion_data)}] 다운로드 완료: {info['name']} ({champ_id}.png)")

    # 5. JS 파일 생성 (export const 형태로 저장)
    js_content = f"// 자동 생성된 챔피언 데이터 (버전: {latest_version})\n"
    js_content += "const championList = " + json.dumps(web_data_list, ensure_ascii=False, indent=4) + ";\n"
    
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        f.write(js_content)

    print("\n" + "="*40)
    print(f"🎉 모든 작업 완료!")
    print(f"1. 이미지 폴더: ./{SAVE_DIR}/ (총 {count}개)")
    print(f"2. 데이터 파일: ./{DATA_FILE}")
    print("="*40)

if __name__ == "__main__":
    download_lol_assets()