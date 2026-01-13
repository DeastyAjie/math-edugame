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
    case 'encouragement':
      playTone(1000, 0.08, 'square', 0.15);
      playTone(1200, 0.08, 'square', 0.15, 0.08);
      playTone(1400, 0.08, 'square', 0.15, 0.16);
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
  bgMusic.frequency.value = 220; // Low bass
  bgMusic.type = 'sawtooth';
  gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
  bgMusic.start();
  // Simple melody loop
  let noteIndex = 0;
  const notes = [220, 330, 440, 330, 220, 330, 440, 330]; // Simple retro tune
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
let score = 0,
  life = 3,
  combo = 1,
  isPaused = false;
let meteor, fallInterval, problem;
let speed, maxNum, ops;
let answered = 0,
  correct = 0;
let timerInterval,
  timeLeft = 60;
let playerName = '',
  levelName = '';
let gameData = {};

// DOM ELEMENTS
const scoreEl = document.getElementById('score');
const lifeEl = document.getElementById('life');
const answer = document.getElementById('answer');
const progressBar = document.getElementById('progress-bar');
const message = document.getElementById('message');
const game = document.getElementById('game');
const alertBox = document.getElementById('wrong-alert');
const comboPopup = document.getElementById('combo-popup');
const ship = document.getElementById('ship');
const laser = document.getElementById('laser');

let shipX = innerWidth / 2 - 35;
let keys = {};
let shipSpeed = 5;
let shipInterval;

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
  const lvl = level.value;
  levelName = lvl.toUpperCase();
  if (lvl === 'easy') {
    speed = 1.2;
    maxNum = 10;
    ops = ['+', '−'];
  }
  if (lvl === 'medium') {
    speed = 1.8;
    maxNum = 20;
    ops = ['+', '−', '×'];
  }
  if (lvl === 'hard') {
    speed = 2.6;
    maxNum = 30;
    ops = ['+', '−', '×', '÷'];
  }
}

function genProblem() {
  let a = ~~(Math.random() * maxNum) + 1;
  let b = ~~(Math.random() * maxNum) + 1;
  let op = ops[~~(Math.random() * ops.length)];
  let ans;
  if (op === '÷') {
    a = a * b;
    ans = a / b;
  }
  if (op === '×') ans = a * b;
  if (op === '+') ans = a + b;
  if (op === '−') ans = a - b;
  return { text: `${a} ${op} ${b}`, answer: ans };
}

function spawnMeteor() {
  if (meteor) meteor.remove();
  clearInterval(fallInterval);
  problem = genProblem();
  meteor = document.createElement('div');
  meteor.className = 'meteor';
  meteor.textContent = problem.text;
  meteor.style.left = Math.random() * (innerWidth - 80) + 'px';
  meteor.style.top = '80px';
  game.appendChild(meteor);
  answer.disabled = false;
  answer.focus();
  // Jeda 3 detik sebelum meteor mulai jatuh
  setTimeout(fallMeteor, 3000);
}

function fallMeteor() {
  let y = 80;
  fallInterval = setInterval(() => {
    if (isPaused) return;
    y += speed;
    meteor.style.top = y + 'px';
    if (y > innerHeight - 180) {
      playSound('fall');
      loseLife();
    }
  }, 30);
}

function fireLaser() {
  if (!meteor) return;
  playSound('laser');
  const shipRect = ship.getBoundingClientRect();
  const meteorRect = meteor.getBoundingClientRect();
  const laserX = shipRect.left + shipRect.width / 2 - 2.5;
  const laserY = shipRect.top;
  const laserHeight = meteorRect.top - laserY;
  laser.style.left = laserX + 'px';
  laser.style.top = laserY + 'px';
  laser.style.height = laserHeight + 'px';
  laser.style.display = 'block';
  // Laser tetap terlihat untuk durasi animasi
  setTimeout(() => {
    laser.style.display = 'none';
    explodeMeteor();
  }, 200);
}

function explodeMeteor() {
  const meteorRect = meteor.getBoundingClientRect();
  const explosion = document.createElement('div');
  explosion.className = 'explosion';
  explosion.style.left = meteorRect.left + meteorRect.width / 2 - 50 + 'px';
  explosion.style.top = meteorRect.top + meteorRect.height / 2 - 50 + 'px';
  explosion.style.width = '100px';
  explosion.style.height = '100px';
  game.appendChild(explosion);
  meteor.remove();
  meteor = null;
  setTimeout(() => explosion.remove(), 500);
}

function submitAnswer() {
  playSound('click');
  if (answer.value.trim() === '') {
    showAlert('JAWABAN KOSONG');
    return;
  }
  answered++;
  if (+answer.value === problem.answer) {
    playSound('correct');
    correct++;
    combo = Math.min(combo + 1, 3);
    score += combo;
    scoreEl.textContent = `⭐ ${score} x${combo}`;
    progressBar.style.width = (correct / 12) * 100 + '%';
    showCombo();
    fireLaser();
    setTimeout(spawnMeteor, 500);
  } else {
    playSound('wrong');
    combo = 1;
    shake();
    showAlert('KURANG BENAR');
    loseLife();
  }
  answer.value = '';
}

function loseLife() {
  clearInterval(fallInterval);
  life--;
  lifeEl.textContent = '❤️'.repeat(life);
  if (life <= 0) endGame();
  else spawnMeteor();
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
  shipX = innerWidth / 2 - 35;
  ship.style.left = shipX + 'px';
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
  meteor = null;
  clearInterval(fallInterval);
  clearInterval(timerInterval);
  clearInterval(shipInterval);
  document.getElementById('end-screen').style.display = 'none';
  document.getElementById('start-screen').style.display = 'flex';
  answer.value = '';
}

function exportPDF() {
  playSound('click');
  const jsPDFModule = window.jspdf;
  const { jsPDF } = jsPDFModule;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
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
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (e.key === 'Enter') submitAnswer();
});

window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});
