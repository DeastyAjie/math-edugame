// AUDIO SYSTEM
let audioCtx, bgMusic;

function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playTone(frequency, duration, type = 'square', volume = 0.1) {
  if (!audioCtx) return;
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + duration);
}

function playSound(type) {
  if (!audioCtx) initAudio();
  switch (type) {
    case 'correct':
      playTone(800, 0.2, 'square', 0.2);
      playTone(1000, 0.2, 'square', 0.2, 0.2);
      break;
    case 'wrong':
      playTone(200, 0.5, 'sawtooth', 0.3);
      break;
    case 'fall':
      playTone(100, 0.3, 'sawtooth', 0.4);
      break;
    case 'start':
      playTone(600, 0.3);
      playTone(800, 0.3, 'square', 0.2, 0.3);
      break;
    case 'gameOver':
      playTone(300, 1, 'sawtooth', 0.5);
      break;
    case 'victory':
      playTone(800, 0.15, 'square', 0.3);
      playTone(1000, 0.15, 'square', 0.3, 0.15);
      playTone(1200, 0.3, 'square', 0.3, 0.3);
      break;
    case 'click':
      playTone(1000, 0.1, 'square', 0.1);
      break;
    case 'laser':
      playTone(1200, 0.15, 'square', 0.2);
      playTone(800, 0.15, 'square', 0.15, 0.05);
      break;
  }
}

function startBgMusic() {
  if (!audioCtx) initAudio();
  bgMusic = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  bgMusic.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  bgMusic.frequency.value = 220;
  bgMusic.type = 'sawtooth';
  gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
  bgMusic.start();
  let noteIndex = 0;
  const notes = [220, 330, 440, 330, 220, 330, 440, 330];
  setInterval(() => {
    if (isPaused) return;
    bgMusic.frequency.setValueAtTime(notes[noteIndex % notes.length], audioCtx.currentTime);
    noteIndex++;
  }, 500);
}

function stopBgMusic() {
  if (bgMusic) bgMusic.stop();
}

// GAME VARIABLES
let score = 0, life = 3, combo = 1, isPaused = false;
let problem, currentAnswer;
let speed, maxNum, ops;
let answered = 0, correct = 0;
let timerInterval, timeLeft = 60;
let playerName = '', levelName = '';
let gameData = {};
let meteors = []; // Array untuk 3 meteor
let fallIntervals = []; // Array untuk tracking interval

// DOM ELEMENTS
let scoreEl, lifeEl, progressBar, message, game, alertBox, comboPopup, ship, laser, problemDisplay;

function initDOM() {
  scoreEl = document.getElementById('score');
  lifeEl = document.getElementById('life');
  progressBar = document.getElementById('progress-bar');
  message = document.getElementById('message');
  game = document.getElementById('game');
  alertBox = document.getElementById('wrong-alert');
  comboPopup = document.getElementById('combo-popup');
  ship = document.getElementById('ship');
  laser = document.getElementById('laser');
  problemDisplay = document.getElementById('problem-display');
  
  // Add event listeners
  ship.addEventListener('click', () => {
    if (!isPaused && timeLeft > 0) {
      fireLaser();
    }
  });

  ship.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!isPaused && timeLeft > 0) {
      fireLaser();
    }
  });

  document.addEventListener('touchmove', (e) => {
    if (!isPaused && timeLeft > 0 && meteors.length > 0) {
      const touch = e.touches[0];
      touchX = touch.clientX;
    }
  }, false);

  document.addEventListener('touchend', () => {
    touchX = null;
  }, false);
}

let shipX = innerWidth / 2 - 35;
let shipY = innerHeight - 180;
let keys = {};
let shipSpeed = 7;
let shipInterval;
let touchX = null;

// UI FUNCTIONS
function shake() {
  game.classList.add('shake');
  setTimeout(() => game.classList.remove('shake'), 300);
}

function showAlert(t) {
  alertBox.textContent = t;
  alertBox.classList.remove('show');
  void alertBox.offsetWidth;
  alertBox.classList.add('show');
}

function showCombo() {
  if (combo > 1) {
    comboPopup.textContent = `COMBO x${combo}!`;
    comboPopup.style.animation = 'none';
    void comboPopup.offsetWidth;
    comboPopup.style.animation = 'comboAnim 1s ease-out forwards';
  }
}

// GAME LOGIC
function setLevel() {
  const lvl = document.getElementById('level').value;
  levelName = lvl.toUpperCase();
  if (lvl === 'easy') {
    speed = 2;
    maxNum = 10;
    ops = ['+', '−'];
  }
  if (lvl === 'medium') {
    speed = 3;
    maxNum = 20;
    ops = ['+', '−', '×'];
  }
  if (lvl === 'hard') {
    speed = 4;
    maxNum = 30;
    ops = ['+', '−', '×', '÷'];
  }
}

function genProblem() {
  let a, b, op, ans;
  let validProblem = false;
  
  // Keep generating until we have a valid problem with integer answer
  while (!validProblem) {
    a = ~~(Math.random() * maxNum) + 1;
    b = ~~(Math.random() * maxNum) + 1;
    op = ops[~~(Math.random() * ops.length)];
    
    if (op === '÷') {
      // Untuk pembagian, pastikan a habis dibagi b
      ans = a / b;
      if (Number.isInteger(ans)) {
        validProblem = true;
      }
    } else if (op === '×') {
      ans = a * b;
      validProblem = true;
    } else if (op === '+') {
      ans = a + b;
      validProblem = true;
    } else if (op === '−') {
      // Pengurangan pastikan hasilnya positif
      ans = a - b;
      if (ans > 0) {
        validProblem = true;
      }
    }
  }
  
  ans = Math.round(ans);
  return { text: `${a} ${op} ${b}`, answer: ans };
}

function spawnMeteor() {
  // Clear old meteors
  meteors.forEach(m => m.remove());
  meteors = [];
  fallIntervals.forEach(interval => clearInterval(interval));
  fallIntervals = [];
  
  problem = genProblem();
  currentAnswer = problem.answer;
  
  problemDisplay.textContent = `📝 ${problem.text}`;
  
  // Generate 3 jawaban: 1 benar + 2 salah
  let answers = [currentAnswer];
  while (answers.length < 3) {
    let wrongAns = ~~(Math.random() * (maxNum * 2)) + 1;
    if (!answers.includes(wrongAns)) {
      answers.push(wrongAns);
    }
  }
  answers.sort(() => Math.random() - 0.5); // Shuffle
  
  // Create 3 meteor
  const positions = [
    innerWidth * 0.25,
    innerWidth * 0.5,
    innerWidth * 0.75
  ];
  
  answers.forEach((ans, idx) => {
    const meteor = document.createElement('div');
    meteor.className = 'meteor';
    meteor.textContent = ans;
    meteor.style.left = positions[idx] - 50 + 'px';
    meteor.style.top = '50px';
    meteor.style.cursor = 'default';
    meteor.dataset.answer = ans;
    meteor.dataset.correct = (ans === currentAnswer) ? 'true' : 'false';
    game.appendChild(meteor);
    meteors.push(meteor);
  });
  
  fallMeteors();
}

function fallMeteors() {
  meteors.forEach((meteor, idx) => {
    let y = 50;
    const interval = setInterval(() => {
      if (isPaused || !meteor.parentNode) {
        clearInterval(interval);
        return;
      }
      y += speed;
      meteor.style.top = y + 'px';
      if (y > innerHeight - 150) {
        clearInterval(interval);
        playSound('fall');
        // Jika yang jatuh adalah jawaban benar, lose life
        if (meteor.dataset.correct === 'true') {
          loseLife();
        } else {
          // Jika salah jatuh, destroy it saja
          meteor.remove();
          meteors = meteors.filter(m => m !== meteor);
        }
      }
    }, 30);
    fallIntervals.push(interval);
  });
}

function fireLaser() {
  if (meteors.length === 0 || isPaused || answered >= 12) return;
  
  // Find meteor yang paling dekat dengan ship (center bottom)
  const shipRect = ship.getBoundingClientRect();
  const shipCenterX = shipRect.left + shipRect.width / 2;
  
  let closestMeteor = null;
  let minDist = 100; // tolerance 100px
  
  meteors.forEach(meteor => {
    const meteorRect = meteor.getBoundingClientRect();
    const meteorCenterX = meteorRect.left + meteorRect.width / 2;
    const distX = Math.abs(meteorCenterX - shipCenterX);
    if (distX < minDist) {
      minDist = distX;
      closestMeteor = meteor;
    }
  });
  
  if (!closestMeteor) return;
  
  const meteorRect = closestMeteor.getBoundingClientRect();
  const laserX = shipCenterX - 2.5;
  const laserY = shipRect.top;
  const laserHeight = meteorRect.top - laserY;
  
  laser.style.left = laserX + 'px';
  laser.style.top = laserY + 'px';
  laser.style.height = Math.max(0, laserHeight) + 'px';
  laser.style.display = 'block';
  playSound('laser');
  
  answered++;
  
  // Cek apakah yang diklik adalah jawaban benar
  if (closestMeteor.dataset.correct === 'true') {
    playSound('correct');
    correct++;
    combo = Math.min(combo + 1, 3);
    score += combo;
    scoreEl.textContent = `⭐ ${score} x${combo}`;
    progressBar.style.width = (correct / 12) * 100 + '%';
    showCombo();
    
    setTimeout(() => {
      laser.style.display = 'none';
      explodeMeteor(closestMeteor);
      if (answered >= 12) {
        // Game selesai! End immediately
        setTimeout(endGame, 500);
      } else {
        setTimeout(spawnMeteor, 1000);
      }
    }, 200);
  } else {
    playSound('wrong');
    shake();
    showAlert('MELESET! JAWABAN SALAH!');
    combo = 1;
    
    setTimeout(() => {
      laser.style.display = 'none';
      if (answered >= 12) {
        // Game selesai! End immediately
        setTimeout(endGame, 500);
      } else {
        setTimeout(spawnMeteor, 1000);
      }
    }, 200);
  }
}

function explodeMeteor(meteor) {
  if (!meteor) return;
  const meteorRect = meteor.getBoundingClientRect();
  const explosion = document.createElement('div');
  explosion.className = 'explosion';
  explosion.style.left = meteorRect.left + meteorRect.width / 2 - 50 + 'px';
  explosion.style.top = meteorRect.top + meteorRect.height / 2 - 50 + 'px';
  explosion.style.width = '100px';
  explosion.style.height = '100px';
  game.appendChild(explosion);
  
  meteor.remove();
  meteors = meteors.filter(m => m !== meteor);
  setTimeout(() => explosion.remove(), 500);
}

function loseLife() {
  fallIntervals.forEach(interval => clearInterval(interval));
  fallIntervals = [];
  life--;
  lifeEl.textContent = '❤️'.repeat(Math.max(life, 0));
  if (life <= 0) endGame();
  else if (answered < 12) spawnMeteor();
}

function startTimer() {
  timeLeft = 60;
  message.textContent = '⏱ 60 DETIK';
  timerInterval = setInterval(() => {
    if (isPaused) return;
    timeLeft--;
    message.textContent = `⏱ ${timeLeft} DETIK`;
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function updateShip() {
  if (isPaused) return;
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) shipX -= shipSpeed;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) shipX += shipSpeed;
  
  if (touchX !== null) {
    shipX = touchX - 35;
  }
  
  shipX = Math.max(0, Math.min(innerWidth - 70, shipX));
  ship.style.left = shipX + 'px';
}

// SCREEN FUNCTIONS
function beginGame() {
  initAudio();
  playSound('start');
  startBgMusic();
  playerName = document.getElementById('playerName').value || 'Player';
  setLevel();
  score = 0;
  life = 3;
  combo = 1;
  answered = 0;
  correct = 0;
  progressBar.style.width = '0%';
  scoreEl.textContent = '⭐ 0';
  lifeEl.textContent = '❤️❤️❤️';
  document.getElementById('start-screen').style.display = 'none';
  
  // Clear old meteors
  meteors.forEach(m => m.remove());
  meteors = [];
  fallIntervals.forEach(interval => clearInterval(interval));
  fallIntervals = [];
  
  shipX = innerWidth / 2 - 35;
  ship.style.left = shipX + 'px';
  ship.style.top = shipY + 'px';
  
  shipInterval = setInterval(updateShip, 16);
  startTimer();
  spawnMeteor();
}

function togglePause() {
  playSound('click');
  isPaused = !isPaused;
  if (isPaused) stopBgMusic();
  else startBgMusic();
  document.getElementById('pause-screen').style.display = isPaused ? 'flex' : 'none';
}

function confirmQuit() {
  playSound('click');
  document.getElementById('confirm-screen').style.display = 'flex';
}

function closeConfirm() {
  playSound('click');
  document.getElementById('confirm-screen').style.display = 'none';
}

function doQuit() {
  playSound('click');
  closeConfirm();
  restart();
}

function endGame() {
  stopBgMusic();
  clearInterval(timerInterval);
  clearInterval(shipInterval);

  const accuracy = Math.round((correct / answered) * 100) || 0;
  const isPassed = accuracy >= 70;

  gameData = {
    playerName: playerName,
    levelName: levelName,
    score: score,
    correct: correct,
    answered: answered,
    timeLeft: timeLeft,
    accuracy: accuracy,
    date: new Date().toLocaleDateString('id-ID'),
    time: new Date().toLocaleTimeString('id-ID'),
  };

  if (isPassed) {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }

  const resultMessage = isPassed 
    ? `🎉 SELAMAT 🎉<br>Kamu Luar Biasa!` 
    : `💪 Bagus Coba Lagi 💪<br>Jangan Menyerah!`;

  document.getElementById('final-score').innerHTML = `
${resultMessage}<br><br>
👤 ${playerName}<br>
🎮 ${levelName}<br>
⭐ Skor: ${score}<br>
📊 Jawaban Benar: ${correct}/12<br>
🎯 Akurasi: ${accuracy}%<br>
⏱ Sisa Waktu: ${timeLeft}s
  `;
  document.getElementById('end-screen').style.display = 'flex';
}

function restart() {
  playSound('click');
  clearInterval(shipInterval);
  clearInterval(timerInterval);
  fallIntervals.forEach(interval => clearInterval(interval));
  fallIntervals = [];
  document.getElementById('end-screen').style.display = 'none';
  document.getElementById('start-screen').style.display = 'flex';
  problemDisplay.textContent = '';
  meteors.forEach(m => m.remove());
  meteors = [];
}

function exportPDF() {
  playSound('click');
  const jsPDFModule = window.jspdf;
  const { jsPDF } = jsPDFModule;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  doc.setFont('courier');
  doc.setFontSize(22);
  doc.setTextColor(0, 102, 204);
  doc.setFont('courier', 'bold');
  doc.text('MATH METEOR', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 14;
  doc.setFontSize(16);
  doc.setFont('courier', 'bold');
  doc.text('HASIL AKHIR', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 16;
  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(0.8);
  doc.line(20, yPosition, pageWidth - 20, yPosition);

  yPosition += 14;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('courier', 'normal');

  const data = [
    ['NAMA PEMAIN:', gameData.playerName || '-'],
    ['TINGKAT:', gameData.levelName || '-'],
    ['SKOR TOTAL:', gameData.score || 0],
    ['JAWABAN BENAR:', `${gameData.correct || 0}/12`],
    ['AKURASI:', `${gameData.accuracy || 0}%`],
    ['SISA WAKTU:', `${gameData.timeLeft || 0} DETIK`],
    ['TOTAL PERTANYAAN:', gameData.answered || 0],
  ];

  data.forEach(([label, value]) => {
    doc.setFont('courier', 'bold');
    doc.text(label, 25, yPosition);
    doc.setFont('courier', 'normal');
    doc.text(String(value), 95, yPosition);
    yPosition += 11;
  });

  yPosition += 10;
  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(0.8);
  doc.line(20, yPosition, pageWidth - 20, yPosition);

  yPosition += 14;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('courier', 'normal');
  doc.text(`TANGGAL: ${gameData.date || '-'}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 8;
  doc.text(`WAKTU: ${gameData.time || '-'}`, pageWidth / 2, yPosition, { align: 'center' });

  doc.save(`MATH_METEOR_${gameData.playerName || 'Report'}_${new Date().getTime()}.pdf`);
}

// EVENT LISTENERS
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDOM);
} else {
  initDOM();
}

window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  // Klik space atau enter untuk tembak
  if ((e.code === 'Space' || e.key === 'Enter') && !isPaused && timeLeft > 0) {
    e.preventDefault();
    fireLaser();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});
