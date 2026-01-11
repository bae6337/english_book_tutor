import sqlite3
import json
from datetime import datetime

class Database:
    def __init__(self, db_name='data/books.db'):
        self.db_name = db_name
        self.init_db()
    
    def get_connection(self):
        conn = sqlite3.connect(self.db_name)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_db(self):
        """데이터베이스 초기화"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # 사용자 프로필 테이블
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_profile (
                id INTEGER PRIMARY KEY,
                username TEXT NOT NULL,
                level INTEGER DEFAULT 1,
                experience INTEGER DEFAULT 0,
                points INTEGER DEFAULT 0,
                streak_days INTEGER DEFAULT 0,
                last_activity TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 책 테이블
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS books (
                id INTEGER PRIMARY KEY,
                gutenberg_id INTEGER,
                title TEXT NOT NULL,
                author TEXT,
                language TEXT DEFAULT 'en',
                difficulty TEXT DEFAULT 'beginner',
                cover_url TEXT,
                description TEXT,
                content TEXT,
                total_chapters INTEGER DEFAULT 1
            )
        ''')
        
        # 읽기 진도 테이블
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS reading_progress (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                book_id INTEGER,
                current_position INTEGER DEFAULT 0,
                total_read INTEGER DEFAULT 0,
                completed INTEGER DEFAULT 0,
                last_read TEXT,
                FOREIGN KEY (user_id) REFERENCES user_profile (id),
                FOREIGN KEY (book_id) REFERENCES books (id)
            )
        ''')
        
        # 단어장 테이블
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vocabulary (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                word TEXT NOT NULL,
                translation TEXT,
                example_sentence TEXT,
                book_id INTEGER,
                learned INTEGER DEFAULT 0,
                review_count INTEGER DEFAULT 0,
                next_review TEXT,
                added_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES user_profile (id),
                FOREIGN KEY (book_id) REFERENCES books (id)
            )
        ''')
        
        # 배지 테이블
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS badges (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                icon TEXT,
                requirement TEXT
            )
        ''')
        
        # 사용자 배지 테이블
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_badges (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                badge_id INTEGER,
                earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES user_profile (id),
                FOREIGN KEY (badge_id) REFERENCES badges (id)
            )
        ''')
        
        # 퀴즈 기록 테이블
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS quiz_history (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                book_id INTEGER,
                quiz_type TEXT,
                score INTEGER,
                total_questions INTEGER,
                completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES user_profile (id),
                FOREIGN KEY (book_id) REFERENCES books (id)
            )
        ''')

        # 회화 문장 테이블
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS practice_sentences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                english TEXT NOT NULL,
                korean TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                difficulty INTEGER DEFAULT 1
            )
        ''')
        
        # 기본 사용자 생성
        cursor.execute('SELECT COUNT(*) as count FROM user_profile')
        if cursor.fetchone()['count'] == 0:
            cursor.execute('''
                INSERT INTO user_profile (username, level, experience, points)
                VALUES (?, ?, ?, ?)
            ''', ('학습자', 1, 0, 0))
        
        # 기본 배지 추가
        cursor.execute('SELECT COUNT(*) as count FROM badges')
        if cursor.fetchone()['count'] == 0:
            badges = [
                ('첫 걸음', '첫 책 읽기 시작', '🌱', 'start_first_book'),
                ('독서왕', '첫 책 완독', '📚', 'complete_first_book'),
                ('단어 수집가', '50개 단어 학습', '📝', 'learn_50_words'),
                ('꾸준함의 힘', '7일 연속 학습', '🔥', '7_day_streak'),
                ('퀴즈 마스터', '퀴즈 10회 만점', '🎯', '10_perfect_quizzes'),
                ('초보 탈출', '레벨 5 달성', '⭐', 'reach_level_5'),
                ('단어 마스터', '100개 단어 학습', '🏆', 'learn_100_words'),
                ('열정적인 독서가', '30일 연속 학습', '💎', '30_day_streak'),
            ]
            cursor.executemany('''
                INSERT INTO badges (name, description, icon, requirement)
                VALUES (?, ?, ?, ?)
            ''', badges)
        
        conn.commit()
        conn.close()
    
    def get_user_profile(self, user_id=1):
        """사용자 프로필 조회"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM user_profile WHERE id = ?', (user_id,))
        profile = dict(cursor.fetchone())
        conn.close()
        return profile
    
    def update_user_profile(self, user_id, **kwargs):
        """사용자 프로필 업데이트"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        set_clause = ', '.join([f'{key} = ?' for key in kwargs.keys()])
        values = list(kwargs.values()) + [user_id]
        
        cursor.execute(f'''
            UPDATE user_profile SET {set_clause} WHERE id = ?
        ''', values)
        
        conn.commit()
        conn.close()
    
    def add_experience(self, user_id, exp):
        """경험치 추가 및 레벨업 체크"""
        profile = self.get_user_profile(user_id)
        new_exp = profile['experience'] + exp
        new_level = profile['level']
        
        # 레벨업 계산 (100 exp per level)
        required_exp = new_level * 100
        if new_exp >= required_exp:
            new_level += 1
            new_exp = new_exp - required_exp
        
        self.update_user_profile(user_id, experience=new_exp, level=new_level)
        return new_level > profile['level']  # 레벨업 여부 반환
    
    def add_book(self, book_data):
        """책 추가"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO books (gutenberg_id, title, author, language, difficulty, 
                             cover_url, description, content, total_chapters)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            book_data.get('gutenberg_id'),
            book_data.get('title'),
            book_data.get('author'),
            book_data.get('language', 'en'),
            book_data.get('difficulty', 'beginner'),
            book_data.get('cover_url'),
            book_data.get('description'),
            book_data.get('content'),
            book_data.get('total_chapters', 1)
        ))
        
        book_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return book_id
    
    def get_all_books(self):
        """모든 책 조회"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM books')
        books = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return books
    
    def get_book(self, book_id):
        """특정 책 조회"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM books WHERE id = ?', (book_id,))
        book = dict(cursor.fetchone())
        conn.close()
        return book
    
    def add_vocabulary(self, user_id, word_data):
        """단어장에 단어 추가"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO vocabulary (user_id, word, translation, example_sentence, book_id)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            user_id,
            word_data.get('word'),
            word_data.get('translation'),
            word_data.get('example_sentence'),
            word_data.get('book_id')
        ))
        
        conn.commit()
        conn.close()
    
    def get_vocabulary(self, user_id):
        """사용자 단어장 조회"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM vocabulary 
            WHERE user_id = ? 
            ORDER BY added_at DESC
        ''', (user_id,))
        vocab = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return vocab
    
    def get_user_badges(self, user_id):
        """사용자가 획득한 배지 조회"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT b.*, ub.earned_at 
            FROM user_badges ub
            JOIN badges b ON ub.badge_id = b.id
            WHERE ub.user_id = ?
            ORDER BY ub.earned_at DESC
        ''', (user_id,))
        badges = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return badges
    
    def award_badge(self, user_id, badge_requirement):
        """배지 수여"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # 배지 찾기
        cursor.execute('SELECT id FROM badges WHERE requirement = ?', (badge_requirement,))
        badge = cursor.fetchone()
        
        if badge:
            badge_id = badge['id']
            # 이미 획득했는지 확인
            cursor.execute('''
                SELECT id FROM user_badges 
                WHERE user_id = ? AND badge_id = ?
            ''', (user_id, badge_id))
            
            if not cursor.fetchone():
                cursor.execute('''
                    INSERT INTO user_badges (user_id, badge_id)
                    VALUES (?, ?)
                ''', (user_id, badge_id))
                conn.commit()
                conn.close()
                return True
        
        conn.close()
        return False

    def add_practice_sentence(self, english, korean, category='general', difficulty=1):
        """회화 연습 문장 추가"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # 중복 확인
        cursor.execute('SELECT id FROM practice_sentences WHERE english = ?', (english,))
        if cursor.fetchone():
            conn.close()
            return False
            
        cursor.execute('''
            INSERT INTO practice_sentences (english, korean, category, difficulty)
            VALUES (?, ?, ?, ?)
        ''', (english, korean, category, difficulty))
        
        conn.commit()
        conn.close()
        return True

    def get_random_practice_sentences(self, limit=10, difficulty=None):
        """회화 연습 문장 랜덤 추출"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        if difficulty:
            cursor.execute('''
                SELECT english, korean FROM practice_sentences 
                WHERE difficulty = ?
                ORDER BY RANDOM() LIMIT ?
            ''', (difficulty, limit))
        else:
            cursor.execute('''
                SELECT english, korean FROM practice_sentences 
                ORDER BY RANDOM() LIMIT ?
            ''', (limit,))
        
        sentences = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return sentences

    def get_practice_sentences_count(self):
        """전체 회화 문장 수 조회"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) as count FROM practice_sentences')
        count = cursor.fetchone()['count']
        conn.close()
        return count

