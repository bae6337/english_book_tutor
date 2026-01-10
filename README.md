# English Book Tutor 📚

영어 초보자를 위한 인터랙티브 영어 학습 프로그램입니다. 
게임화 요소를 통해 재미있게 영어 원서를 읽을 수 있습니다!

## ✨ 주요 기능

### 📖 책 읽기
- Project Gutenberg의 무료 영어 원서 제공
- TTS(Text-to-Speech)로 원어민 발음 듣기
- 문장 단위 번역 및 단어 설명
- 읽기 속도 조절 (느리게/보통/빠르게)
- 자동 읽기 모드

### 🎮 게임화 요소
- **레벨 & 경험치 시스템**: 읽을수록 성장
- **포인트 획득**: 학습 활동으로 포인트 적립
- **배지 수집**: 다양한 도전 과제 달성
- **연속 학습일 추적**: 매일 학습 습관 형성

### 📝 학습 기능
- **개인 단어장**: 모르는 단어 저장 및 복습
- **단어 퀴즈**: 재미있는 퀴즈로 복습
- **진도 추적**: 어디까지 읽었는지 자동 저장
- **학습 통계**: 나의 학습 현황 한눈에 보기

### 📱 모바일 지원
- 반응형 디자인 (PC/태블릿/모바일)
- PWA 지원 (앱처럼 설치 가능)
- 오프라인에서도 사용 가능

## 🚀 설치 및 실행

### 1. 필요한 패키지 설치
```bash
pip install -r requirements.txt
```

### 2. 프로그램 실행
```bash
python app.py
```

### 3. 브라우저에서 접속
- PC: `http://localhost:5000`
- 핸드폰 (같은 와이파이): `http://[컴퓨터IP]:5000`

## 📁 프로젝트 구조

```
English_book/
├── app.py                 # Flask 서버
├── database.py            # 데이터베이스 관리
├── requirements.txt       # 필요한 패키지
├── templates/            # HTML 템플릿
│   ├── index.html        # 홈 페이지
│   ├── library.html      # 도서관
│   ├── reader.html       # 책 읽기
│   └── vocabulary.html   # 단어장
├── static/               # 정적 파일
│   ├── css/
│   │   └── style.css     # 스타일시트
│   ├── js/
│   │   └── app.js        # JavaScript
│   ├── manifest.json     # PWA 설정
│   └── service-worker.js # Service Worker
└── data/                 # 데이터베이스
    └── books.db          # SQLite DB
```

## 🎯 사용 방법

### 1️⃣ 책 선택하기
- 도서관에서 읽고 싶은 책 선택
- 난이도별 필터링 가능 (초급/중급/고급)

### 2️⃣ 책 읽기
- 문장 클릭 → 발음 듣기 + 번역 보기
- 모르는 단어 → 단어장에 추가
- 자동 읽기 모드로 편하게 듣기

### 3️⃣ 단어 복습
- 나의 단어장에서 저장한 단어 확인
- 퀴즈로 재미있게 복습

### 4️⃣ 성장하기
- 읽을수록 레벨업
- 배지 수집
- 연속 학습일 기록

## 🛠 기술 스택

- **Backend**: Python, Flask
- **Database**: SQLite
- **Frontend**: HTML5, CSS3, JavaScript
- **APIs**: 
  - Project Gutenberg (책 데이터)
  - Google Translate (번역)
  - Web Speech API (TTS)

## 📱 핸드폰에 설치하기 (PWA)

### Android (Chrome)
1. 브라우저에서 사이트 접속
2. 메뉴 → "홈 화면에 추가"

### iOS (Safari)
1. Safari에서 사이트 접속
2. 공유 버튼 → "홈 화면에 추가"

## 🎓 제공되는 책

- Pride and Prejudice (오만과 편견)
- Alice's Adventures in Wonderland (이상한 나라의 앨리스)
- The Adventures of Sherlock Holmes (셜록 홈즈)
- Peter Pan (피터팬)
- Frankenstein (프랑켄슈타인)
- A Christmas Carol (크리스마스 캐럴)
- 그 외 다수...

## 💡 팁

- 매일 조금씩 읽으면 연속 학습일 기록 유지!
- 모르는 단어는 바로바로 단어장에 추가
- 퀴즈로 복습하면 더 잘 기억됨
- 느린 속도로 따라 읽으면 발음 연습 효과

## 📝 라이선스

이 프로젝트는 교육 목적으로 만들어졌습니다.
Project Gutenberg의 책들은 모두 저작권이 만료된 무료 도서입니다.

## 🤝 기여

버그 리포트나 기능 제안은 언제든 환영합니다!

---

**즐거운 영어 학습 되세요! 📚✨**

