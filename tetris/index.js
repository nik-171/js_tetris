// Глобальные переменные
let animationId = null;
let gameRunning = false;
let dropInterval = 1000; // Значение выбирается из меню сложности
let lastTime = 0;
let dropCounter = 0;
let nextPieceMatrix = null; // Для предпросмотра следующей фигуры
let pause = false;
let score = 0;
let level = 1;

// Настройка основного холста
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scale = 20;
context.scale(scale, scale);

// Элементы интерфейса
const menuOverlay = document.getElementById('menu-overlay');
const difficultySelect = document.getElementById('difficulty');
const startBtn = document.getElementById('start-btn');
const overlay = document.querySelector(".back-overlay"); // фон

// Холст для предпросмотра следующей фигуры
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');
const previewScale = 20;

// Создание арены (игрового поля)
function createMatrix(width, height) {
  const matrix = [];
  for (let i = 0; i < height; i++) {
    matrix.push(new Array(width).fill(0));
  }
  return matrix;
}
const arena = createMatrix(12, 20);

// Функция создания фигур
function createPiece(type) {
  if (type === 'T') {
    return [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ];
  } else if (type === 'O') {
    return [
      [2, 2],
      [2, 2]
    ];
  } else if (type === 'L') {
    return [
      [0, 3, 0],
      [0, 3, 0],
      [0, 3, 3]
    ];
  } else if (type === 'J') {
    return [
      [0, 4, 0],
      [0, 4, 0],
      [4, 4, 0]
    ];
  } else if (type === 'I') {
    return [
      [0, 5, 0, 0],
      [0, 5, 0, 0],
      [0, 5, 0, 0],
      [0, 5, 0, 0]
    ];
  } else if (type === 'S') {
    return [
      [0, 6, 6],
      [6, 6, 0],
      [0, 0, 0]
    ];
  } else if (type === 'Z') {
    return [
      [7, 7, 0],
      [0, 7, 7],
      [0, 0, 0]
    ];
  }
}

// Цвета фигур
const pieceColors = [
  null,
  '#e838ec', // T – фиолетовый
  '#FFD700', // O – золотой
  '#FFA500', // L – оранжевый
  '#00BFFF', // J – голубой
  '#00FFFF', // I – голубой (cyan)
  '#00FF00', // S – зелёный
  '#FF0000'  // Z – красный
];

// преобразование HEX в RGB и обратно для смешивания
function mixColors(hex1, hex2, weight = 0.5) {
  let r1 = parseInt(hex1.slice(1, 3), 16);
  let g1 = parseInt(hex1.slice(3, 5), 16);
  let b1 = parseInt(hex1.slice(5, 7), 16);

  let r2 = parseInt(hex2.slice(1, 3), 16);
  let g2 = parseInt(hex2.slice(3, 5), 16);
  let b2 = parseInt(hex2.slice(5, 7), 16);

  // Смешиваем цвета
  let r = Math.round(r1 * (1 - weight) + r2 * weight);
  let g = Math.round(g1 * (1 - weight) + g2 * weight);
  let b = Math.round(b1 * (1 - weight) + b2 * weight);

  // Преобразуем обратно в HEX
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

// Отрисовка матрицы на основном холсте
function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          context.fillStyle = mixColors(pieceColors[value], '#2f2')
          context.fillRect(x + offset.x + 0.1, y + offset.y + 0.1, 1.3, 1.14)

          context.fillStyle = pieceColors[value];
          context.fillRect(x + offset.x + 0.1, y + offset.y + 0.1, 1, 1);

          context.fillStyle = mixColors(pieceColors[value], '#ffffff', 0.7); // Рисуем сам блок
          context.fillRect(x + offset.x + 0.1, y + offset.y + 0.1, 0.85, 0.9);
        }
      });
    });
  }
  

// Отрисовка ghost-фигуры (куда опустится фигура)
function drawGhost() {
  const ghostPos = { x: player.pos.x, y: player.pos.y };
  while (!collide(arena, { matrix: player.matrix, pos: { x: ghostPos.x, y: ghostPos.y + 1 } })) {
    ghostPos.y++;
  }
  context.globalAlpha = 0.3;
  drawMatrix(player.matrix, ghostPos);
  context.globalAlpha = 1;
}

function draw() {
  // Цвет фона
  context.fillStyle = '#090915';
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawShadow(); // Отрисовываем тень рамки

  // Тень
  drawGhost();

  // Фигура
  drawMatrix(player.matrix, player.pos);

  // отрисовка текущей фигуры
  drawMatrix(arena, { x: 0, y: 0 });
}

// отрисовка псевдотени для игрового поля
function drawShadow(angle = 30, cellSize = 30) {
  const radians = (Math.PI / 180) * angle; // Конвертируем угол в радианы
  const dx = Math.cos(radians) * cellSize; // Смещение по X
  const dy = Math.sin(radians) * cellSize; // Смещение по Y

  context.lineWidth = 13;

  // верхняя тень
  context.strokeStyle = "#11112b";

  for (let i = -canvas.height; i < canvas.width; i += cellSize) {
      context.beginPath();
      context.moveTo(i, 2.5);
      context.lineTo(i + dx * (canvas.height / dy) + 150, canvas.height);
      context.stroke();
  }

  context.fillStyle = '#151535';
  context.fillRect(1.5, 0.74, 100, 100);
}

// отрисовка псевдотени для окна предпросмотра
function drawShadowNext(angle = 30, cellSize = 2) {
  const radians = (Math.PI / 180) * angle; // Конвертируем угол в радианы
  const dx = Math.cos(radians) * cellSize; // Смещение по X
  const dy = Math.sin(radians) * cellSize; // Смещение по Y

  nextContext.lineWidth = 13;

  // верхняя тень
  nextContext.strokeStyle = "#090915";

  for (let i = -nextCanvas.height; i < nextCanvas.width; i += cellSize) {
      nextContext.beginPath();
      nextContext.moveTo(i, -71);
      nextContext.lineTo(i + dx * (nextCanvas.height / dy) + 150, nextCanvas.height);
      nextContext.stroke();
  }

  nextContext.fillStyle = '#151535';
  nextContext.fillRect(20, 11, 150, 150);
}

function drawPause() {
  context.clearRect(0, 0, canvas.height, canvas.width)

  context.fillStyle = '#090915';
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawShadow();

  context.font = "0.5px Monospace"; // Размер и шрифт

  context.textBaseline = "middle"; // Базовая линия

  // Рисуем текст в центре
  context.fillStyle = '#000'
  context.fillRect((canvas.height / 100) - 2.9, (canvas.width / 100) + 7.2, 10, 0.85)
  context.fillStyle = '#ff0000'; // Цвет текста

  context.fillText("t.me/nik_17171", (canvas.height / 100) + 0.1, (canvas.width / 100) + 7.5);
}

// отрисовка блока информаци
function drawPixelInfo() {
  const canvas = document.getElementById("hud"); // Берём холст
  const ctx = canvas.getContext("2d");

  ctx.imageSmoothingEnabled = false; // Отключаем сглаживание (чистые пиксели)
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Чистим холст
  ctx.fillStyle = '#225'
  ctx.fillRect(0, 0, 200, 80)
  ctx.font = "16px monospace"; // Пиксельный шрифт
  ctx.textBaseline = "top";

  // Данные

  // Отрисовка текста (с тенью)
  ctx.fillStyle = "#000"; // Тень
  ctx.fillText(`SCORE: ${score}`, 12, 12);
  ctx.fillText(`LVL: ${level}`, 12, 32);
  ctx.fillText(`NEXT:`, 12, 52);

  ctx.fillStyle = "#61dafb"; // Основной цвет
  ctx.fillText(`SCORE: ${score}`, 10, 10);
  ctx.fillText(`LVL: ${level}`, 10, 30);
  ctx.fillText(`NEXT:`, 10, 50);
}    

// Автоматически обновлять инфо
setInterval(drawPixelInfo, 100);


// Отрисовка следующей фигуры в окне предпросмотра
function drawNextPiece() {
  nextContext.fillStyle = '#11112b';
  nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  const piece = nextPieceMatrix;
  const rows = piece.length;
  const cols = piece[0].length;
  const previewWidth = nextCanvas.width / previewScale;
  const previewHeight = nextCanvas.height / previewScale;
  const offsetX = Math.floor((previewWidth - cols) / 2);
  const offsetY = Math.floor((previewHeight - rows) / 2);
  drawShadowNext();
  piece.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        
        nextContext.fillStyle = mixColors(pieceColors[value], '#2f2', 0.7); // Рисуем тень блока
        nextContext.fillRect((x + offsetX + 0.1) * previewScale, (y + offsetY + 0.1) * previewScale, 25.5, 23);

        nextContext.fillStyle = pieceColors[value]; // полутень блока
        nextContext.fillRect((x + offsetX + 0.1) * previewScale, (y + offsetY + 0.1) * previewScale, 20, 20);

        nextContext.fillStyle = mixColors(pieceColors[value], '#ffffff', 0.7); // центр блока
        nextContext.fillRect((x + offsetX + 0.1) * previewScale, (y + offsetY + 0.1) * previewScale, 17.5, 17.5);
      }
    });
  });
}

// Проверка столкновений
function collide(arena, playerObj) {
  const m = playerObj.matrix;
  const o = playerObj.pos;
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[y].length; x++) {
      if (m[y][x] !== 0 &&
          (!arena[y + o.y] || arena[y + o.y][x + o.x] !== 0)) {
        return true;
      }
    }
  }
  return false;
}

// Слияние фигуры с ареной
function merge(arena, playerObj) {
  playerObj.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + playerObj.pos.y][x + playerObj.pos.x] = value;
      }
    });
  });
}

// Удаление заполненных строк, начисление очков и повышение уровня
function arenaSweep() {
  let rowCount = 1;
  for (let y = arena.length - 1; y >= 0; y--) {
    if (arena[y].every(value => value !== 0)) {
      const row = arena.splice(y, 1)[0].fill(0);
      arena.unshift(row);
      player.score += rowCount * 10;
      player.lines++;
      rowCount *= 2;
      y++;
    }
  }
  const newLevel = Math.floor(player.lines / 10) + 1;
  if (newLevel > player.level) {
    player.level = newLevel;
    dropInterval = Math.max(100, dropInterval - 100);
    updateLevel();
  }
}

// Поворот матрицы
function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < y; x++) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

// Объект игрока
const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  score: 0,
  lines: 0,
  level: 1
};

let pieces = "TOLJISZ";
let lastPiece = null;

function randomPiece() {
  let filteredPieces = pieces.split("").filter(p => p !== lastPiece); // Исключаем последнюю фигуру
  let type = filteredPieces[Math.floor(Math.random() * filteredPieces.length)]; // Случайный выбор

  lastPiece = type; // Запоминаем последнюю фигуру
  return createPiece(type);
}

// Сброс фигуры (используем nextPieceMatrix для предпросмотра)
function playerReset() {
  if (!nextPieceMatrix) {
    nextPieceMatrix = randomPiece();
  }
  player.matrix = nextPieceMatrix;
  nextPieceMatrix = randomPiece();
  drawNextPiece();
  player.pos.y = 0;
  player.pos.x = Math.floor(arena[0].length / 2) - Math.floor(player.matrix[0].length / 2);
  if (collide(arena, player)) {
    arena.forEach(row => row.fill(0));
    player.score = 0;
    player.lines = 0;
    player.level = 1;
    dropInterval = parseInt(difficultySelect.value);
    updateScore();
    updateLevel();
    stopGame();
  }
}

// Опускание фигуры на 1 ряд
function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
  }
  dropCounter = 0;
}

// Hard drop (мгновенное падение, пробел)
function playerHardDrop() {
  while (!collide(arena, { matrix: player.matrix, pos: { x: player.pos.x, y: player.pos.y + 1 } })) {
    player.pos.y++;
  }

  // НЕ РАБОТАЕТ КАК НАДО СВОЛОЧЬ
  //    \/  \/  \/
  let dropInterval = setInterval(() => {
    if (!collide(arena, { matrix: player.matrix, pos: { x: player.pos.x, y: player.pos.y + 1 } })) {
      
    } else {
      clearInterval(dropInterval); // Останавливаем цикл, если фигура уперлась
      merge(arena, player);
      playerReset();
      arenaSweep();
      updateScore();
    }
  }, 200);
  dropCounter = 0;
}


// Передвижение фигуры влево/вправо
function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  }
}

// Поворот фигуры
function playerRotate() {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, 1);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (Math.abs(offset) > player.matrix[0].length) {
      rotate(player.matrix, -1);
      player.pos.x = pos;
      return;
    }
  }
}

// Игровой цикл
function update(time = 0) {
  if (!gameRunning) return;
  
  if (!pause) {
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
      playerDrop();
    }
    draw();
    animationId = requestAnimationFrame(update); // Продолжаем обновление
  }
}

// Обновление интерфейса
function updateScore() {
  score = player.score;
}
function updateLevel() {
  level = player.level;
}

// Обработка нажатий клавиш (для ПК)
document.addEventListener('keydown', event => {
  if (!gameRunning) return;
  
  switch (event.keyCode) {
    case 37: // Влево
      if (!pause) playerMove(-1);
      break;
    case 39: // Вправо
      if (!pause) playerMove(1);
      break;
    case 40: // Вниз
      if (!pause) playerDrop();
      break;
    case 38: // Вверх – поворот
      if (!pause) playerRotate();
      break;
    case 32: // Пробел – hard drop
      if (!pause) playerHardDrop();
      break;
    case 27: // ESC – пауза/возобновление
      pause = !pause;
      if (!pause) {
        lastTime = performance.now(); // Обновляем тайминг, чтобы не было скачка
        update(); // Перезапускаем анимацию
      }
      drawPause();
      break;

    // для удобных тестов. возможно потом вырежу
    case 82: // R
      stopGame();
      startBtn.click();
      break;
  }
});

// Кнопка "Старт" в меню
startBtn.addEventListener('click', () => {
  overlay.style.display = "none"; // Скрываем фон при нажатии
  dropInterval = parseInt(difficultySelect.value);
  arena.forEach(row => row.fill(0));
  player.score = 0;
  player.lines = 0;
  player.level = 1;
  updateScore();
  updateLevel();
  playerReset();
  menuOverlay.style.display = 'none';
  gameRunning = true;
  lastTime = 0;
  dropCounter = 0;
  update();
});

function stopGame() {
  gameRunning = false;
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  menuOverlay.style.display = 'flex';
  overlay.style.display = 'flex'
}

// Обработка нажатий на мобильных кнопках
function initMobileControls() {
  const leftBtn = document.getElementById('left-btn');
  const rightBtn = document.getElementById('right-btn');
  const downBtn = document.getElementById('down-btn');
  const rotateBtn = document.getElementById('rotate-btn');
  const harddropBtn = document.getElementById('harddrop-btn');
  
  leftBtn.addEventListener('click', () => {
    if (gameRunning) playerMove(-1);
  });
  rightBtn.addEventListener('click', () => {
    if (gameRunning) playerMove(1);
  });
  downBtn.addEventListener('click', () => {
    if (gameRunning) playerDrop();
  });
  rotateBtn.addEventListener('click', () => {
    if (gameRunning) playerRotate();
  });
  harddropBtn.addEventListener('click', () => {
    if (gameRunning) playerHardDrop();
  });
  
  // Показываем блок мобильных кнопок, если устройство поддерживает touch
  if ('ontouchstart' in window) {
    document.getElementById('mobile-controls').style.display = 'block';
  }
}

// Инициализируем мобильное управление
initMobileControls();