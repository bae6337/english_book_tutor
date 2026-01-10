// ============================
// 전역 변수 및 설정
// ============================
let userProfile = null;

// ============================
// 사용자 프로필 관련
// ============================
async function loadUserProfile() {
    try {
        const response = await fetch('/api/user/profile');
        userProfile = await response.json();
        updateUserUI();
    } catch (error) {
        console.error('프로필 로드 오류:', error);
    }
}

function updateUserUI() {
    if (!userProfile) return;
    
    // 레벨 표시
    const levelElements = document.querySelectorAll('#userLevel');
    levelElements.forEach(el => el.textContent = userProfile.level);
    
    // 포인트 표시
    const pointsElement = document.getElementById('userPoints');
    if (pointsElement) {
        pointsElement.textContent = userProfile.points;
    }
    
    // 경험치 바 업데이트
    const expFill = document.getElementById('expFill');
    const expText = document.getElementById('expText');
    if (expFill && expText) {
        const requiredExp = userProfile.level * 100;
        const expPercent = (userProfile.experience / requiredExp) * 100;
        expFill.style.width = `${expPercent}%`;
        expText.textContent = `${userProfile.experience} / ${requiredExp} EXP`;
    }
    
    // 사용자 이름 표시
    const usernameElement = document.getElementById('username');
    if (usernameElement) {
        usernameElement.textContent = userProfile.username;
    }
    
    // 연속 학습일 표시
    const streakElement = document.getElementById('streakDays');
    if (streakElement) {
        streakElement.textContent = userProfile.streak_days || 0;
    }
    
    // 배지 표시
    if (userProfile.badges && userProfile.badges.length > 0) {
        const badgesList = document.getElementById('badgesList');
        if (badgesList) {
            badgesList.innerHTML = userProfile.badges.slice(0, 5).map(badge => `
                <div class="badge-item">
                    <span class="badge-icon">${badge.icon}</span>
                    <span class="badge-name">${badge.name}</span>
                </div>
            `).join('');
        }
    }
}

// ============================
// 알림 시스템
// ============================
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// ============================
// 레벨업 애니메이션
// ============================
function showLevelUpAnimation(newLevel) {
    showNotification(`🎉 레벨 업! 이제 레벨 ${newLevel}입니다!`, 'success');
    
    // 포인트 보너스 지급
    if (userProfile) {
        userProfile.points += 50;
        updateUserUI();
    }
}

// ============================
// 단어장 관련
// ============================
async function addToVocabulary(word, translation, sentence, bookId) {
    try {
        const response = await fetch('/api/vocabulary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                word: word,
                translation: translation,
                example_sentence: sentence,
                book_id: bookId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('📝 단어장에 추가되었습니다!', 'success');
            
            if (result.leveled_up) {
                await loadUserProfile();
                showLevelUpAnimation(userProfile.level);
            }
            
            return true;
        }
    } catch (error) {
        console.error('단어 추가 오류:', error);
        showNotification('❌ 단어를 추가할 수 없습니다.', 'error');
    }
    
    return false;
}

// ============================
// 번역 API
// ============================
async function translateText(text) {
    try {
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: text })
        });
        
        const result = await response.json();
        return result.translation;
    } catch (error) {
        console.error('번역 오류:', error);
        return '번역을 가져올 수 없습니다.';
    }
}

// ============================
// 읽기 진도 업데이트
// ============================
async function updateReadingProgress(pagesRead = 1) {
    try {
        const response = await fetch('/api/progress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pages_read: pagesRead
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (result.leveled_up) {
                await loadUserProfile();
                showLevelUpAnimation(userProfile.level);
            } else {
                await loadUserProfile();
            }
            
            if (result.points_earned > 0) {
                showNotification(`⭐ ${result.points_earned} 포인트 획득!`, 'success');
            }
        }
    } catch (error) {
        console.error('진도 업데이트 오류:', error);
    }
}

// ============================
// TTS (Text-to-Speech) 기능
// ============================
let currentUtterance = null;

function speakText(text, rate = 1.0) {
    // 기존 음성 중지
    window.speechSynthesis.cancel();
    
    if (!('speechSynthesis' in window)) {
        showNotification('❌ 음성 재생을 지원하지 않는 브라우저입니다.', 'error');
        return;
    }
    
    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = 'en-US';
    currentUtterance.rate = rate;
    currentUtterance.pitch = 1;
    currentUtterance.volume = 1;
    
    currentUtterance.onend = () => {
        console.log('음성 재생 완료');
    };
    
    currentUtterance.onerror = (event) => {
        console.error('TTS 오류:', event);
        showNotification('음성 재생 중 오류가 발생했습니다.', 'error');
    };
    
    window.speechSynthesis.speak(currentUtterance);
}

function stopSpeech() {
    window.speechSynthesis.cancel();
}

function pauseSpeech() {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
    }
}

function resumeSpeech() {
    if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
    }
}

// ============================
// 로컬 스토리지 유틸리티
// ============================
function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('로컬 스토리지 저장 오류:', error);
    }
}

function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('로컬 스토리지 로드 오류:', error);
        return defaultValue;
    }
}

// ============================
// 텍스트 처리 유틸리티
// ============================
function splitIntoSentences(text) {
    // 문장 단위로 분리
    return text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
}

function highlightDifficultWords(text) {
    // 어려운 단어 (7글자 이상) 강조
    const words = text.split(/\s+/);
    return words.map(word => {
        const cleanWord = word.replace(/[^\w]/g, '');
        if (cleanWord.length >= 7) {
            return `<span class="word-highlight" onclick="handleWordClick('${cleanWord}')">${word}</span>`;
        }
        return word;
    }).join(' ');
}

async function handleWordClick(word) {
    const translation = await translateText(word);
    
    // 간단한 팝업으로 표시
    const shouldAdd = confirm(`${word}\n\n뜻: ${translation}\n\n단어장에 추가하시겠습니까?`);
    
    if (shouldAdd) {
        const bookId = parseInt(window.location.pathname.split('/').pop());
        await addToVocabulary(word, translation, '', bookId || 1);
    }
}

// ============================
// 페이지 초기화
// ============================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📚 English Book Tutor 초기화 완료!');
    
    // Service Worker 등록 (PWA)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/static/service-worker.js')
            .then(registration => {
                console.log('Service Worker 등록 성공:', registration);
            })
            .catch(error => {
                console.log('Service Worker 등록 실패:', error);
            });
    }
    
    // 설치 프롬프트
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // 설치 안내 표시 (선택사항)
        console.log('앱을 홈 화면에 추가할 수 있습니다!');
    });
});

// ============================
// 디버그 헬퍼
// ============================
window.debugAddExperience = async (exp) => {
    await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages_read: Math.floor(exp / 10) })
    });
    await loadUserProfile();
    console.log('경험치 추가 완료!');
};

