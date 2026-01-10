from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_cors import CORS
from database import Database
import requests
import os
import json

app = Flask(__name__)
CORS(app)

# 데이터베이스 초기화
if not os.path.exists('data'):
    os.makedirs('data')
db = Database()

# 간단한 번역 함수 (MyMemory Translation API 사용)
def translate_text_api(text, src='en', dest='ko'):
    """무료 번역 API를 사용한 번역"""
    try:
        url = f"https://api.mymemory.translated.net/get?q={text}&langpair={src}|{dest}"
        response = requests.get(url, timeout=5)
        data = response.json()
        if response.status_code == 200 and 'responseData' in data:
            return data['responseData']['translatedText']
        return text
    except Exception as e:
        print(f"번역 오류: {e}")
        return text

# Project Gutenberg에서 난이도별 영어 책 목록
POPULAR_BOOKS = [
    # ========== 유치원/왕초보 (Kindergarten/Beginner) - 매우 짧고 쉬운 문장 ==========
    {
        'gutenberg_id': 17093,
        'title': 'The Tale of Peter Rabbit',
        'author': 'Beatrix Potter',
        'difficulty': 'beginner',
        'description': '장난꾸러기 토끼 피터의 이야기 (매우 쉬움)',
        'cover_url': 'https://www.gutenberg.org/cache/epub/17093/pg17093.cover.medium.jpg'
    },
    {
        'gutenberg_id': 21,
        'title': 'Aesop\'s Fables',
        'author': 'Aesop',
        'difficulty': 'beginner',
        'description': '짧고 쉬운 이솝 우화 모음 (동물 이야기)',
        'cover_url': 'https://www.gutenberg.org/cache/epub/21/pg21.cover.medium.jpg'
    },
    {
        'gutenberg_id': 15659,
        'title': 'The Three Little Pigs',
        'author': 'L. Leslie Brooke',
        'difficulty': 'beginner',
        'description': '아기 돼지 삼형제 (반복적이고 쉬운 문장)',
        'cover_url': 'https://www.gutenberg.org/cache/epub/15659/pg15659.cover.medium.jpg'
    },
    {
        'gutenberg_id': 19068,
        'title': 'The Story of the Three Bears',
        'author': 'L. Leslie Brooke',
        'difficulty': 'beginner',
        'description': '곰 세 마리와 골디락스 이야기 (쉬운 동화)',
        'cover_url': 'https://www.gutenberg.org/cache/epub/19068/pg19068.cover.medium.jpg'
    },
    {
        'gutenberg_id': 23467,
        'title': 'Cinderella',
        'author': 'Various',
        'difficulty': 'beginner',
        'description': '신데렐라 (어린이를 위한 쉬운 그림책 버전)',
        'cover_url': 'https://www.gutenberg.org/cache/epub/23467/pg23467.cover.medium.jpg'
    },
    
    # ========== 중급 (Intermediate) - 스토리가 있는 동화책 ==========
    {
        'gutenberg_id': 74,
        'title': 'The Adventures of Tom Sawyer',
        'author': 'Mark Twain',
        'difficulty': 'intermediate',
        'description': '말썽꾸러기 톰 소여의 유쾌한 모험 (청소년 소설)',
        'cover_url': 'https://www.gutenberg.org/cache/epub/74/pg74.cover.medium.jpg'
    },
    {
        'gutenberg_id': 1661,
        'title': 'The Adventures of Sherlock Holmes',
        'author': 'Arthur Conan Doyle',
        'difficulty': 'intermediate',
        'description': '명탐정 셜록 홈즈의 흥미진진한 추리 단편집',
        'cover_url': 'https://www.gutenberg.org/cache/epub/1661/pg1661.cover.medium.jpg'
    },
    {
        'gutenberg_id': 120,
        'title': 'Treasure Island',
        'author': 'Robert Louis Stevenson',
        'difficulty': 'intermediate',
        'description': '보물을 찾아 떠나는 해적 모험 이야기',
        'cover_url': 'https://www.gutenberg.org/cache/epub/120/pg120.cover.medium.jpg'
    },
    {
        'gutenberg_id': 113,
        'title': 'The Secret Garden',
        'author': 'Frances Hodgson Burnett',
        'difficulty': 'intermediate',
        'description': '비밀의 정원을 발견한 소녀의 성장 이야기',
        'cover_url': 'https://www.gutenberg.org/cache/epub/113/pg113.cover.medium.jpg'
    },
    {
        'gutenberg_id': 103,
        'title': 'Around the World in 80 Days',
        'author': 'Jules Verne',
        'difficulty': 'intermediate',
        'description': '80일 만에 세계일주를 하는 흥미진진한 모험',
        'cover_url': 'https://www.gutenberg.org/cache/epub/103/pg103.cover.medium.jpg'
    },
    
    # ========== 고급 (Advanced) - 고전 문학, 복잡한 문장 ==========
    {
        'gutenberg_id': 1342,
        'title': 'Pride and Prejudice',
        'author': 'Jane Austen',
        'difficulty': 'advanced',
        'description': '19세기 영국 고전 로맨스 (복잡한 문체)',
        'cover_url': 'https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg'
    },
    {
        'gutenberg_id': 84,
        'title': 'Frankenstein',
        'author': 'Mary Wollstonecraft Shelley',
        'difficulty': 'advanced',
        'description': '과학자가 창조한 괴물의 비극 (고전 고딕 소설)',
        'cover_url': 'https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg'
    },
    {
        'gutenberg_id': 345,
        'title': 'Dracula',
        'author': 'Bram Stoker',
        'difficulty': 'advanced',
        'description': '전설적인 뱀파이어 드라큘라 이야기 (고전 호러)',
        'cover_url': 'https://www.gutenberg.org/cache/epub/345/pg345.cover.medium.jpg'
    },
    {
        'gutenberg_id': 174,
        'title': 'The Picture of Dorian Gray',
        'author': 'Oscar Wilde',
        'difficulty': 'advanced',
        'description': '영원한 젊음을 갈망하는 남자의 이야기 (철학적 소설)',
        'cover_url': 'https://www.gutenberg.org/cache/epub/174/pg174.cover.medium.jpg'
    },
    {
        'gutenberg_id': 46,
        'title': 'A Christmas Carol',
        'author': 'Charles Dickens',
        'difficulty': 'advanced',
        'description': '구두쇠 스크루지의 변화 (디킨스 특유의 복잡한 문체)',
        'cover_url': 'https://www.gutenberg.org/cache/epub/46/pg46.cover.medium.jpg'
    }
]

def download_book_from_gutenberg(gutenberg_id):
    """Project Gutenberg에서 책 다운로드"""
    try:
        url = f'https://www.gutenberg.org/files/{gutenberg_id}/{gutenberg_id}-0.txt'
        response = requests.get(url, timeout=10)
        
        if response.status_code == 404:
            # 대체 URL 시도
            url = f'https://www.gutenberg.org/cache/epub/{gutenberg_id}/pg{gutenberg_id}.txt'
            response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            content = response.text
            # Project Gutenberg 헤더/푸터 제거
            start_markers = ['*** START OF THIS PROJECT GUTENBERG', '*** START OF THE PROJECT GUTENBERG']
            end_markers = ['*** END OF THIS PROJECT GUTENBERG', '*** END OF THE PROJECT GUTENBERG']
            
            for marker in start_markers:
                if marker in content:
                    content = content.split(marker)[1]
                    break
            
            for marker in end_markers:
                if marker in content:
                    content = content.split(marker)[0]
                    break
            
            return content.strip()
        return None
    except Exception as e:
        print(f"책 다운로드 오류: {e}")
        return None

@app.route('/')
def index():
    """홈페이지"""
    return render_template('index.html')

@app.route('/library')
def library():
    """도서관 페이지"""
    return render_template('library.html')

@app.route('/reader/<int:book_id>')
def reader(book_id):
    """책 읽기 페이지"""
    return render_template('reader.html', book_id=book_id)

@app.route('/vocabulary')
def vocabulary():
    """단어장 페이지"""
    return render_template('vocabulary.html')

@app.route('/api/user/profile')
def get_user_profile():
    """사용자 프로필 API"""
    profile = db.get_user_profile()
    badges = db.get_user_badges(1)
    profile['badges'] = badges
    return jsonify(profile)

@app.route('/api/books')
def get_books():
    """책 목록 API"""
    # DB에서 다운로드된 책 목록 가져오기
    downloaded_books = db.get_all_books()
    
    # 다운로드된 책을 맵으로 변환 (gutenberg_id 기준)
    downloaded_map = {book['gutenberg_id']: book for book in downloaded_books}
    
    # 결과 리스트
    result = []
    
    # POPULAR_BOOKS를 순회하면서 상태 병합
    for book in POPULAR_BOOKS:
        if book['gutenberg_id'] in downloaded_map:
            # 이미 다운로드됨 -> DB 정보 사용 (ID 포함)
            db_book = downloaded_map[book['gutenberg_id']]
            db_book['is_downloaded'] = True
            # 난이도 정보가 DB에 없을 수 있으므로 업데이트
            if 'difficulty' in book:
                db_book['difficulty'] = book['difficulty']
            result.append(db_book)
        else:
            # 다운로드 안 됨 -> 기본 정보 사용
            book_info = book.copy()
            book_info['is_downloaded'] = False
            result.append(book_info)
            
    return jsonify(result)

@app.route('/api/books/<int:book_id>')
def get_book(book_id):
    """특정 책 조회 API"""
    try:
        book = db.get_book(book_id)
        return jsonify(book)
    except:
        return jsonify({'error': '책을 찾을 수 없습니다'}), 404

@app.route('/api/books/download', methods=['POST'])
def download_book():
    """책 다운로드 API"""
    data = request.json
    gutenberg_id = data.get('gutenberg_id')
    
    # POPULAR_BOOKS에서 책 정보 찾기
    book_info = next((book for book in POPULAR_BOOKS if book['gutenberg_id'] == gutenberg_id), None)
    
    if not book_info:
        return jsonify({'error': '책 정보를 찾을 수 없습니다'}), 404
    
    # 책 내용 다운로드
    content = download_book_from_gutenberg(gutenberg_id)
    
    if not content:
        return jsonify({'error': '책을 다운로드할 수 없습니다'}), 500
    
    # DB에 저장
    book_info['content'] = content
    book_info['total_chapters'] = content.count('CHAPTER') or 1
    
    book_id = db.add_book(book_info)
    
    # 첫 책 시작 배지
    db.award_badge(1, 'start_first_book')
    
    return jsonify({'book_id': book_id, 'success': True})

@app.route('/api/translate', methods=['POST'])
def translate_text():
    """번역 API"""
    data = request.json
    text = data.get('text', '')
    
    try:
        translation = translate_text_api(text)
        return jsonify({
            'original': text,
            'translation': translation
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/vocabulary', methods=['GET', 'POST'])
def handle_vocabulary():
    """단어장 API"""
    if request.method == 'GET':
        vocab = db.get_vocabulary(1)
        return jsonify(vocab)
    
    elif request.method == 'POST':
        data = request.json
        db.add_vocabulary(1, data)
        
        # 단어 수 체크 및 배지 수여
        vocab_count = len(db.get_vocabulary(1))
        if vocab_count >= 50:
            db.award_badge(1, 'learn_50_words')
        if vocab_count >= 100:
            db.award_badge(1, 'learn_100_words')
        
        # 경험치 추가 (단어당 5 exp)
        leveled_up = db.add_experience(1, 5)
        
        return jsonify({'success': True, 'leveled_up': leveled_up})

@app.route('/api/progress', methods=['POST'])
def update_progress():
    """읽기 진도 업데이트 API"""
    data = request.json
    pages_read = data.get('pages_read', 1)
    
    # 경험치 추가 (페이지당 10 exp)
    leveled_up = db.add_experience(1, pages_read * 10)
    
    # 포인트 추가
    profile = db.get_user_profile()
    new_points = profile['points'] + (pages_read * 5)
    db.update_user_profile(1, points=new_points)
    
    return jsonify({
        'success': True,
        'leveled_up': leveled_up,
        'points_earned': pages_read * 5
    })

# 생활 영어 회화 데이터
CONVERSATION_SENTENCES = [
    "How is it going today?",
    "Could you do me a favor?",
    "I am looking for the subway station.",
    "What do you recommend for dinner?",
    "It is nice to meet you.",
    "Can I have a glass of water please?",
    "How long does it take to get there?",
    "I would like to make a reservation.",
    "Do you have any plans for the weekend?",
    "I am afraid I cannot make it.",
    "What seems to be the problem?",
    "Let me know if you need anything.",
    "I am looking forward to hearing from you.",
    "Would you mind opening the window?",
    "It has been a long time since we met.",
    "I am sorry for keeping you waiting.",
    "Make yourself at home.",
    "I totally agree with you.",
    "That sounds like a great idea.",
    "Could you please speak a little slower?"
]

@app.route('/game/<int:book_id>')
def game(book_id):
    """단어 갤러그 게임 페이지"""
    return render_template('game.html', book_id=book_id)

@app.route('/game/practice')
def game_practice():
    """회화 연습 게임 페이지"""
    return render_template('game.html', book_id=0)  # 0은 연습 모드

@app.route('/api/game/sentences/<int:book_id>')
def get_game_sentences(book_id):
    """게임용 문장 추출"""
    # book_id가 0이면 회화 연습 모드
    if book_id == 0:
        import random
        # 회화 문장 중 랜덤 10개 반환
        return jsonify(random.sample(CONVERSATION_SENTENCES, min(10, len(CONVERSATION_SENTENCES))))

    try:
        book = db.get_book(book_id)
        content = book['content']
        
        # 문장 추출 (간단한 정규식 사용)
        import re
        sentences = re.split(r'[.!?]+', content)
        
        # 적당한 길이의 문장만 필터링 (단어 3개 이상 10개 이하)
        valid_sentences = []
        for s in sentences:
            s = s.strip()
            words = s.split()
            if 3 <= len(words) <= 10:
                valid_sentences.append(s)
        
        # 랜덤으로 5개 선택
        import random
        selected = random.sample(valid_sentences, min(5, len(valid_sentences)))
        
        return jsonify(selected)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/manifest.json')
def manifest():
    """PWA Manifest"""
    return send_from_directory('static', 'manifest.json')

if __name__ == '__main__':
    print("=" * 50)
    print("English Book Tutor 시작!")
    print("=" * 50)
    print("PC에서 접속: http://localhost:5000")
    print("핸드폰에서 접속: http://[컴퓨터IP]:5000")
    print("같은 와이파이에 연결되어 있어야 합니다.")
    print("=" * 50)
    app.run(debug=True, host='0.0.0.0', port=5000)

