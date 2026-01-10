// ============================
// Space Grammar Game: STT & Fixes
// ============================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const comboElement = document.getElementById('comboCount');
const sentenceDisplay = document.getElementById('sentenceDisplay');
const speedSlider = document.getElementById('speedSlider');
const strictSlider = document.getElementById('strictSlider');

// 게임 상태
let gameState = 'START'; 
let gameDifficulty = 'NORMAL';
let score = 0;
let completedSentencesCount = 0; 

// 데이터
let allSentences = []; 
let activeSentences = []; 
let enemies = []; 
let particles = [];
let time = 0;
let globalSpeedMultiplier = parseFloat(speedSlider.value); 
let speechStrictness = parseFloat(strictSlider ? strictSlider.value : 0.3);

// 오디오 & 음성인식
let isSpeaking = false;
let audioQueue = []; 
let recognition = null; // 음성 인식 객체

// 플레이어
const player = {
    x: 0, y: 0, width: 70, height: 70,
    color: '#FCD34D',
    paddleWidth: 100, paddleHeight: 15 
};

let balls = [];

let animationId = null;

// ============================
// 초기화
// ============================
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player.x = canvas.width / 2;
    player.y = canvas.height - 150;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 음성 인식 초기화
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
    } else {
        console.warn('Speech Recognition not supported');
    }
}
initSpeechRecognition();

speedSlider.addEventListener('input', (e) => {
    globalSpeedMultiplier = parseFloat(e.target.value);
});

if (strictSlider) {
    strictSlider.addEventListener('input', (e) => {
        speechStrictness = parseFloat(e.target.value);
    });
}

async function loadSentences() {
    try {
        const response = await fetch(`/api/game/sentences/${BOOK_ID}`);
        allSentences = await response.json();
    } catch (error) {
        allSentences = ["The quick brown fox jumps over the lazy dog."];
    }
}

// ============================
// 오디오 시스템
// ============================
function initAudio() {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    audioQueue = [];
}

function queueAudio(text, lang, onEndCallback) {
    audioQueue.push({ text, lang, onEndCallback });
    processAudioQueue();
}

function processAudioQueue() {
    if (isSpeaking || audioQueue.length === 0) return;

    const item = audioQueue.shift();
    isSpeaking = true;

    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.lang = item.lang;
    utterance.rate = item.lang === 'en-US' ? 0.9 : 1.1;

    const onFinish = () => {
        isSpeaking = false;
        if (item.onEndCallback) item.onEndCallback();
        setTimeout(processAudioQueue, 50); // 대기 시간 단축 (300ms -> 50ms)
    };

    utterance.onend = onFinish;
    utterance.onerror = onFinish;

    window.speechSynthesis.speak(utterance);
}

function stopAudio() {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    audioQueue = [];
    if (recognition) recognition.stop();
}

function startBackgroundAudioLoop() {
    if (gameState !== 'PLAYING') return;
    
    if (audioQueue.length === 0 && !isSpeaking && activeSentences.length > 0) {
        const sent = activeSentences[0];
        
        queueAudio(sent.fullText, 'en-US', () => {
             if (gameState !== 'PLAYING') return;
             setTimeout(() => {
                 if (gameState !== 'PLAYING') return;
                 if (!sent.translation) {
                     fetch('/api/translate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: sent.fullText })
                     }).then(res => res.json()).then(data => {
                         sent.translation = data.translation;
                         playKoreanTranslation(sent);
                     }).catch(() => {
                         setTimeout(startBackgroundAudioLoop, 1000);
                     });
                 } else {
                     playKoreanTranslation(sent);
                 }
             }, 1000);
        });
    } else {
        setTimeout(startBackgroundAudioLoop, 1000);
    }
}

function playKoreanTranslation(sent) {
    if (gameState !== 'PLAYING') return;
    queueAudio(sent.translation, 'ko-KR', () => {
        setTimeout(startBackgroundAudioLoop, 2000);
    });
}

// ============================
// 게임 흐름 제어
// ============================
function startGame(difficulty) {
    gameDifficulty = difficulty;
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('sentenceDisplay').style.display = 'block';
    canvas.style.cursor = 'none';
    
    initAudio();
    if (allSentences.length === 0) {
        loadSentences().then(() => {
            startRound();
            if (animationId) cancelAnimationFrame(animationId);
            gameLoop();
        });
    } else {
        startRound();
        if (animationId) cancelAnimationFrame(animationId);
        gameLoop();
    }
}

function startRound() {
    if (allSentences.length === 0 && activeSentences.length === 0) {
        gameOver(true);
        return;
    }

    gameState = 'PLAYING';
    particles = [];
    time = 0; // 시간 초기화 (흔들림 패턴 리셋)
    
    while (activeSentences.length < 2 && allSentences.length > 0) {
        const text = allSentences.shift();
        if (text) createActiveSentence(text);
    }
    
    updateSentenceUI();
    spawnEnemies();
    startBackgroundAudioLoop();
    // requestAnimationFrame(gameLoop); // 제거: 중복 루프 방지
}

// ============================
// 게임 로직
// ============================
function createActiveSentence(text) {
    const words = text.replace(/[.!?]/g, '').split(/\s+/);
    const candidates = words.map((w, i) => ({ word: w, index: i }));
    candidates.sort(() => Math.random() - 0.5);
    
    let ratio = 0.6;
    if (gameDifficulty === 'EASY') ratio = 0.3;
    if (gameDifficulty === 'HARD') ratio = 0.9;
    
    let blankCount = Math.max(Math.ceil(words.length * ratio), 1);
    const blanks = candidates.slice(0, blankCount).map(c => c.index).sort((a,b) => a-b);
    
    activeSentences.push({
        fullText: text, words: words, blanks: blanks, filled: [], translation: null, isCompleted: false
    });
}

function spawnEnemies() {
    activeSentences.forEach((sent, sentIndex) => {
        if (sent.isCompleted) return;
        
        sent.blanks.forEach(wordIndex => {
            if (sent.filled.includes(wordIndex)) return;
            const word = sent.words[wordIndex];
            if (enemies.some(e => e.text === word && e.sentIndex === sentIndex && e.wordIndex === wordIndex)) return;
            
            // [속도 완전 고정]
            const enemy = {
                text: word,
                sentIndex: sentIndex,
                wordIndex: wordIndex,
                x: Math.random() * (canvas.width - 100) + 50,
                y: -Math.random() * 300 - 50,
                width: ctx.measureText(word).width + 30,
                height: 40,
                baseSpeed: Math.random() * 0.4 + 0.4, // 기본 속도 하향 (0.4 ~ 0.8)
                swayOffset: Math.random() * 100, 
                swaySpeed: 0.02, // 흔들림 속도 고정
                color: sentIndex === 0 ? '#F87171' : '#60A5FA'
            };
            enemies.push(enemy);
        });
    });
}

function gameLoop() {
    if (gameState === 'GAME_OVER') return;

    time += 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStars();

    if (gameState === 'PLAYING') {
        updateEnemies();
        checkCollisions();
        drawPlayer(); 
    } else if (gameState === 'BONUS') {
        updateBonusGame();
        drawPaddle(); 
        drawBalls();
    } else if (gameState === 'REVIEW' || gameState === 'SPEAKING') {
        // 복습/말하기 중에는 배경만 그림
        // drawPlayer(); // 필요 시 그리기
    }
    
    updateParticles();
    drawEnemies(); 
    drawParticles();

    animationId = requestAnimationFrame(gameLoop);
}

function updateEnemies() {
    enemies.forEach(enemy => {
        // [중요] 속도 계산 로직 수정
        // enemy.baseSpeed는 절대 변하지 않는 고정값 (0.5 ~ 1.0)
        // globalSpeedMultiplier는 슬라이더 값
        // 이 두 개를 곱해서 매 프레임 '새로운' 이동량을 계산함 (누적 X)
        
        let moveY = enemy.baseSpeed * globalSpeedMultiplier;
        
        // 오답으로 인한 튕겨나감 효과(dy)가 있으면 그것을 우선 적용
        if (enemy.dy && enemy.dy < 0) {
            enemy.y += enemy.dy;
            enemy.dy += 0.2; // 중력 적용 (점점 다시 내려오게)
            if (enemy.dy > 0) enemy.dy = 0; // 튕김 끝
        } else {
            // 평상시: 정해진 속도로 내려옴
            enemy.y += moveY;
        }
        
        // 흔들림 (고정된 패턴)
        enemy.x += Math.sin(time * enemy.swaySpeed + enemy.swayOffset) * 0.1;
        
        // 바닥 닿으면 위로
        if (enemy.y > canvas.height + 50) {
            enemy.y = -50;
            enemy.x = Math.random() * (canvas.width - 100) + 50;
            // 여기서도 속도는 건드리지 않음
        }
        
        enemy.width = ctx.measureText(enemy.text).width + 30;
    });
}

function checkCollisions() {
    const px = player.x;
    const py = player.y;
    const radius = player.width / 2;

    for (let j = enemies.length - 1; j >= 0; j--) {
        let e = enemies[j];
        
        const ex = e.x + e.width / 2;
        const ey = e.y + e.height / 2;
        const dx = px - ex;
        const dy = py - ey;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < radius + 15) {
            const sent = activeSentences[e.sentIndex];
            if (sent) {
                const nextBlank = sent.blanks.find(idx => !sent.filled.includes(idx));
                if (e.wordIndex === nextBlank) {
                    handleHit(e, j);
                    createExplosion(ex, ey, e.color);
                } else {
                    // [수정] 오답 시 처리
                    score = Math.max(0, score - 50);
                    scoreElement.textContent = score;
                    
                    // 위로 튕겨나가는 힘(dy)만 부여하고, 기본 속도(baseSpeed)는 건드리지 않음
                    e.dy = -5; // 위로 튕김
                    
                    createExplosion(ex, ey, '#FFFFFF');
                }
            }
            break; 
        }
    }
}

function handleHit(enemy, index) {
    enemies.splice(index, 1);
    score += 100;
    scoreElement.textContent = score;
    
    if (activeSentences[enemy.sentIndex]) {
        activeSentences[enemy.sentIndex].filled.push(enemy.wordIndex);
    }
    updateSentenceUI();
    
    const sent = activeSentences[enemy.sentIndex];
    if (sent && sent.filled.length === sent.blanks.length) {
        completeSentence(sent);
    }
}

// [수정] 문장 완성 -> 발음 평가 단계로
function completeSentence(sent) {
    sent.isCompleted = true;
    score += 500;
    completedSentencesCount++;
    comboElement.textContent = completedSentencesCount;
    
    gameState = 'REVIEW';
    stopAudio();
    updateSentenceUI();
    
    startSpeakingChallenge(sent);
}

// [신규] 발음 평가 챌린지 (안전장치 강화)
function startSpeakingChallenge(sent) {
    // 음성 인식 미지원 시 바로 통과
    if (!recognition) {
        finishReview(sent);
        return;
    }
    
    // 상태 변경 (입력 차단)
    gameState = 'SPEAKING';
    
    // 안내 메시지 표시
    const micStatus = document.createElement('div');
    micStatus.id = 'micStatus';
    micStatus.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:rgba(0,0,0,0.8); color:white; padding:20px; border-radius:10px; font-size:1.5rem; z-index:100; text-align:center;';
    micStatus.innerHTML = '🔊 Listen...';
    document.body.appendChild(micStatus);
    
    // 1. 영어 문장 읽어주기
    queueAudio(sent.fullText, 'en-US', () => {
        // [중요] 말하기 단계 시작 전, 게임 상태를 확실히 고정
        if (gameState !== 'SPEAKING') return; 

        // 즉시 UI 업데이트
        micStatus.innerHTML = '🎙️ Speak Now!<br><span style="font-size:1rem; color:#aaa;">(말해보세요)</span>';
        micStatus.style.border = '2px solid #EF4444';
        micStatus.style.background = 'rgba(20, 20, 20, 0.9)'; // 배경을 좀 더 진하게
        
        let recognitionActive = false;
        let speechTimeout = null;

        // 결과 처리 함수
        const handleResult = (success) => {
            if (!recognitionActive) return;
            recognitionActive = false;
            
            if (speechTimeout) clearTimeout(speechTimeout);
            
            if (success) {
                micStatus.innerHTML = '🎉 Good Job!';
                micStatus.style.borderColor = '#10B981';
                setTimeout(() => {
                    if(document.body.contains(micStatus)) document.body.removeChild(micStatus);
                    finishReview(sent);
                }, 1500);
            } else {
                micStatus.innerHTML = '👂 Try Again...';
                setTimeout(() => {
                    if(document.body.contains(micStatus)) document.body.removeChild(micStatus);
                    // 다시 시도 (재귀 호출)
                    startSpeakingChallenge(sent);
                }, 1500);
            }
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            const target = sent.fullText.toLowerCase().replace(/[^\w\s]/g, '');
            
            console.log(`Target: ${target}, Spoken: ${transcript}`);
            
            const targetWords = target.split(' ');
            const spokenWords = transcript.split(' ');
            let matchCount = 0;
            targetWords.forEach(w => { if (spokenWords.includes(w)) matchCount++; });
            
            // 설정된 정확도 기준 이상이면 통과
            const accuracy = matchCount / targetWords.length;
            console.log(`Accuracy: ${accuracy.toFixed(2)} (Threshold: ${speechStrictness})`);
            handleResult(accuracy >= speechStrictness);
        };
        
        recognition.onerror = (e) => {
            console.warn('Speech error:', e.error);
            // 에러 시 그냥 통과시켜서 게임 진행 (멈춤 방지)
            micStatus.innerHTML = '⚠️ Skip...';
            setTimeout(() => {
                if(document.body.contains(micStatus)) document.body.removeChild(micStatus);
                finishReview(sent); 
            }, 1000);
        };
        
        recognition.onend = () => {
            // 결과 없이 끝났으면(침묵 등) 재시도
            if (recognitionActive) {
                console.log('Speech ended without result');
                if(document.body.contains(micStatus)) document.body.removeChild(micStatus);
                
                // [수정] 즉시 재시작하지 않고 finishReview 호출 (무한루프/오류 방지)
                // 사용자가 아무 말 안 하면 그냥 통과 처리
                finishReview(sent);
            }
        };
        
        // 시작
        try {
            recognitionActive = true;
            recognition.start();
            
            // [안전장치] 8초 -> 5초로 단축 (빠른 피드백)
            speechTimeout = setTimeout(() => {
                if (recognitionActive) {
                    recognition.stop();
                    console.log('Speech timeout');
                    if(document.body.contains(micStatus)) document.body.removeChild(micStatus);
                    finishReview(sent);
                }
            }, 5000);
            
        } catch(e) {
            console.error('Recognition start failed:', e);
            if(document.body.contains(micStatus)) document.body.removeChild(micStatus);
            finishReview(sent);
        }
    });
}

function showMicIcon(show) {
    // UI에 마이크 표시 (간단하게 토스트나 오버레이로)
    if (show) {
        // 기존 UI 활용 (오버레이 등)
        const display = document.getElementById('sentenceDisplay');
        display.style.border = '4px solid #EF4444'; // 빨간 테두리 (녹음 중)
    } else {
        const display = document.getElementById('sentenceDisplay');
        display.style.border = 'none';
    }
}

function finishReview(completedSent) {
    if (completedSentencesCount >= 10) {
        startBonusStage();
        return;
    }

    const idx = activeSentences.indexOf(completedSent);
    if (idx > -1) {
        activeSentences.splice(idx, 1);
        enemies.forEach(e => {
            if (e.sentIndex > idx) { 
                e.sentIndex--; 
                e.color = e.sentIndex === 0 ? '#F87171' : '#60A5FA'; 
            }
        });
        enemies = enemies.filter(e => e.sentIndex !== -1);
    }
    
    // 오디오 정리 후 다음 라운드 시작
    stopAudio();
    startRound();
}

// ============================
// 보너스 모드 (공 부활)
// ============================
function startBonusStage() {
    gameState = 'BONUS';
    stopAudio();
    enemies = []; 
    balls = [];
    activeSentences = [];
    
    sentenceDisplay.style.display = 'none';
    createExplosion(canvas.width/2, canvas.height/2, '#FCD34D');
    
    // 벽돌 생성
    const bonusWords = ["BONUS", "TIME", "HIT", "THE", "WORDS", "SCORE", "UP", "YEAH!"];
    const rows = 4; const cols = 4;
    const blockWidth = 100; const blockHeight = 40; const padding = 20;
    const startX = (canvas.width - (cols * (blockWidth + padding))) / 2 + padding/2;
    
    for(let r=0; r<rows; r++) {
        for(let c=0; c<cols; c++) {
            enemies.push({
                text: bonusWords[(r*cols+c) % bonusWords.length],
                x: startX + c * (blockWidth + padding),
                y: 100 + r * (blockHeight + padding),
                width: blockWidth, height: blockHeight,
                color: `hsl(${Math.random()*360}, 70%, 60%)`,
                isBonusBrick: true
            });
        }
    }
    
    spawnBall();
    requestAnimationFrame(gameLoop);
}

function spawnBall() {
    balls.push({
        x: canvas.width/2, y: canvas.height - 100,
        dx: 4, dy: -4, radius: 8, color: 'white' // 속도 낮춤 (4)
    });
}

function updateBonusGame() {
    if (player.x < 0) player.x = 0;
    if (player.x + player.paddleWidth > canvas.width) player.x = canvas.width - player.paddleWidth;
    
    for(let bIdx = balls.length-1; bIdx >= 0; bIdx--) {
        let ball = balls[bIdx];
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) ball.dx *= -1;
        if (ball.y - ball.radius < 0) ball.dy *= -1;
        
        if (ball.dy > 0 && 
            ball.x > player.x && ball.x < player.x + player.paddleWidth &&
            ball.y + ball.radius > canvas.height - 50 && ball.y - ball.radius < canvas.height - 35) {
            ball.dy *= -1;
            const hitPoint = ball.x - (player.x + player.paddleWidth/2);
            ball.dx = hitPoint * 0.15; 
        }
        
        // [수정] 바닥 닿으면 공 제거 후 재생성 (무한 부활)
        if (ball.y > canvas.height) {
            balls.splice(bIdx, 1);
            setTimeout(spawnBall, 500); // 0.5초 후 부활
        }
        
        for(let i=enemies.length-1; i>=0; i--) {
            const b = enemies[i];
            if (ball.x > b.x && ball.x < b.x + b.width &&
                ball.y > b.y && ball.y < b.y + b.height) {
                ball.dy *= -1;
                enemies.splice(i, 1);
                score += 200;
                scoreElement.textContent = score;
                createExplosion(b.x + b.width/2, b.y + b.height/2, b.color);
                break; 
            }
        }
    }
    
    if (enemies.length === 0) {
        setTimeout(endBonusStage, 1000);
    }
}

function endBonusStage() {
    if (gameState !== 'BONUS') return;
    completedSentencesCount = 0;
    comboElement.textContent = 0;
    gameState = 'PLAYING';
    sentenceDisplay.style.display = 'block';
    startRound();
}

function drawPaddle() {
    ctx.fillStyle = '#60A5FA';
    ctx.beginPath();
    ctx.roundRect(player.x, canvas.height - 50, player.paddleWidth, player.paddleHeight, 5);
    ctx.fill();
}

function drawBalls() {
    balls.forEach(ball => {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI*2);
        ctx.fillStyle = ball.color;
        ctx.fill();
    });
}

// ... UI 및 그리기 함수 (유지) ...
function updateSentenceUI() {
    let html = '';
    activeSentences.forEach((sent, index) => {
        let style = index === 0 ? 'border-left: 4px solid #F87171;' : 'border-left: 4px solid #60A5FA;';
        let bgStyle = 'background: rgba(0,0,0,0.3);';
        if (sent.isCompleted) {
            style = 'border: 2px solid #F59E0B;';
            bgStyle = 'background: rgba(245, 158, 11, 0.2); transform: scale(1.02); transition: all 0.3s;';
        }
        html += `<div style="margin-bottom: 15px; padding: 15px; border-radius: 8px; ${bgStyle} ${style}">`;
        sent.words.forEach((word, wordIndex) => {
            if (sent.blanks.includes(wordIndex)) {
                 if (sent.filled.includes(wordIndex)) {
                     html += `<span class="word-slot filled" style="color: #10B981; border-bottom: 2px solid #10B981; font-weight:bold;">${word}</span>`;
                 } else {
                     html += `<span class="word-slot empty" style="color: #9CA3AF; border-bottom: 2px dashed #6B7280;">????</span>`;
                 }
            } else {
                html += `<span class="word-slot fixed" style="color: #D1D5DB;">${word}</span>`;
            }
        });
        if (sent.isCompleted && sent.translation) {
            html += `<div style="margin-top: 10px; color: #FCD34D; font-size: 0.9em;">${sent.translation}</div>`;
        }
        html += `</div>`;
    });
    sentenceDisplay.innerHTML = html;
}

function drawPlayer() {
    const x = player.x; const y = player.y; const size = player.width;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, size/2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(252, 211, 77, 0.1)'; ctx.fill();
    ctx.strokeStyle = player.color; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath();
    const step = size / 5;
    for(let i=1; i<5; i++) {
        const chord = Math.sqrt(Math.pow(size/2, 2) - Math.pow(Math.abs(i*step - size/2), 2));
        ctx.moveTo(x - chord, y - size/2 + i*step); ctx.lineTo(x + chord, y - size/2 + i*step);
        ctx.moveTo(x - size/2 + i*step, y - chord); ctx.lineTo(x - size/2 + i*step, y + chord);
    }
    ctx.strokeStyle = 'rgba(252, 211, 77, 0.4)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + size/2); ctx.lineTo(x, y + size/2 + 50);
    ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = 6; ctx.stroke();
    ctx.restore();
}

function drawEnemies() {
    ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    enemies.forEach(e => {
        ctx.fillStyle = e.color;
        ctx.beginPath(); ctx.roundRect(e.x, e.y, e.width, e.height, 8); ctx.fill();
        ctx.fillStyle = 'white'; ctx.fillText(e.text, e.x + e.width / 2, e.y + e.height / 2);
    });
}
function drawParticles() {
    particles.forEach(p => {
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1.0;
    });
}
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.dx; p.y += p.dy; p.life -= 0.05;
        if (p.life <= 0) particles.splice(i, 1);
    }
}
function createExplosion(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x, y: y, dx: (Math.random() - 0.5) * 6, dy: (Math.random() - 0.5) * 6,
            size: Math.random() * 3 + 1, life: 1.0, color: color
        });
    }
}
function drawStars() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for(let i=0; i<3; i++) { ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2); }
}

window.addEventListener('mousemove', e => { 
    if (gameState === 'PLAYING') { player.x = e.clientX; player.y = e.clientY; } 
    else if (gameState === 'BONUS') { player.x = e.clientX - player.paddleWidth/2; }
});
window.addEventListener('touchmove', e => { 
    e.preventDefault(); 
    if (gameState === 'PLAYING') { player.x = e.touches[0].clientX; player.y = e.touches[0].clientY; }
    else if (gameState === 'BONUS') { player.x = e.touches[0].clientX - player.paddleWidth/2; }
}, { passive: false });

function gameOver(cleared) {
    gameState = 'GAME_OVER';
    stopAudio();
    if (animationId) cancelAnimationFrame(animationId); // 루프 정지
    canvas.style.cursor = 'default';
    document.getElementById('gameOverScreen').style.display = 'flex';
    document.getElementById('finalScore').textContent = score;
}
