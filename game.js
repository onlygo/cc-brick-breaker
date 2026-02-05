const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- Game State ---
let score = 0;
let lives = 3;
let gameState = "start"; // "start", "playing", "gameover", "win"

// --- Paddle ---
const paddle = {
  width: 120,
  height: 14,
  x: 0,
  y: canvas.height - 30,
  speed: 7,
  color: "#e94560",
};
paddle.x = (canvas.width - paddle.width) / 2;

// --- Ball ---
const ball = {
  x: canvas.width / 2,
  y: paddle.y - 12,
  radius: 8,
  dx: 4,
  dy: -4,
  color: "#f5f5f5",
};

// --- Bricks ---
const brickConfig = {
  rows: 5,
  cols: 10,
  width: 68,
  height: 20,
  padding: 6,
  offsetTop: 50,
  offsetLeft: 35,
  colors: ["#e94560", "#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff"],
  points: [50, 40, 30, 20, 10],
};

let bricks = [];

function createBricks() {
  bricks = [];
  for (let r = 0; r < brickConfig.rows; r++) {
    bricks[r] = [];
    for (let c = 0; c < brickConfig.cols; c++) {
      bricks[r][c] = {
        x: brickConfig.offsetLeft + c * (brickConfig.width + brickConfig.padding),
        y: brickConfig.offsetTop + r * (brickConfig.height + brickConfig.padding),
        alive: true,
        color: brickConfig.colors[r],
        points: brickConfig.points[r],
      };
    }
  }
}

createBricks();

function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = paddle.y - 12;
  ball.dx = 4 * (Math.random() > 0.5 ? 1 : -1);
  ball.dy = -4;
  paddle.x = (canvas.width - paddle.width) / 2;
}

function resetGame() {
  score = 0;
  lives = 3;
  createBricks();
  resetBall();
  gameState = "playing";
}

function allBricksDestroyed() {
  for (let r = 0; r < brickConfig.rows; r++) {
    for (let c = 0; c < brickConfig.cols; c++) {
      if (bricks[r][c].alive) return false;
    }
  }
  return true;
}

// --- Input ---
const keys = {};
let mouseX = paddle.x + paddle.width / 2;

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (e.key === " " || e.key === "Enter") {
    if (gameState === "start" || gameState === "gameover" || gameState === "win") {
      resetGame();
    }
  }
});
document.addEventListener("keyup", (e) => (keys[e.key] = false));
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
});
canvas.addEventListener("click", () => {
  if (gameState === "start" || gameState === "gameover" || gameState === "win") {
    resetGame();
  }
});

function updatePaddle() {
  if (keys["ArrowLeft"] || keys["a"]) paddle.x -= paddle.speed;
  if (keys["ArrowRight"] || keys["d"]) paddle.x += paddle.speed;

  // Mouse control
  const target = mouseX - paddle.width / 2;
  paddle.x += (target - paddle.x) * 0.15;

  // Clamp to canvas
  paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, paddle.x));
}

function updateBall() {
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Wall collisions (left/right)
  if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= canvas.width) {
    ball.dx = -ball.dx;
  }
  // Ceiling
  if (ball.y - ball.radius <= 0) {
    ball.dy = -ball.dy;
  }
  // Floor - lose a life
  if (ball.y + ball.radius >= canvas.height) {
    lives--;
    if (lives <= 0) {
      gameState = "gameover";
    } else {
      resetBall();
    }
    return;
  }

  // Paddle collision
  if (
    ball.dy > 0 &&
    ball.y + ball.radius >= paddle.y &&
    ball.y + ball.radius <= paddle.y + paddle.height &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.width
  ) {
    ball.dy = -ball.dy;
    const hitPos = (ball.x - paddle.x) / paddle.width;
    ball.dx = 6 * (hitPos - 0.5);
  }

  // Brick collisions
  for (let r = 0; r < brickConfig.rows; r++) {
    for (let c = 0; c < brickConfig.cols; c++) {
      const b = bricks[r][c];
      if (!b.alive) continue;
      if (
        ball.x + ball.radius > b.x &&
        ball.x - ball.radius < b.x + brickConfig.width &&
        ball.y + ball.radius > b.y &&
        ball.y - ball.radius < b.y + brickConfig.height
      ) {
        b.alive = false;
        ball.dy = -ball.dy;
        score += b.points;
        if (allBricksDestroyed()) {
          gameState = "win";
        }
        return;
      }
    }
  }
}

// --- Drawing ---
function drawPaddle() {
  ctx.fillStyle = paddle.color;
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 6);
  ctx.fill();
}

function drawBricks() {
  for (let r = 0; r < brickConfig.rows; r++) {
    for (let c = 0; c < brickConfig.cols; c++) {
      const b = bricks[r][c];
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, brickConfig.width, brickConfig.height, 4);
      ctx.fill();
    }
  }
}

function drawBall() {
  ctx.fillStyle = ball.color;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawHUD() {
  ctx.fillStyle = "#f5f5f5";
  ctx.font = "16px 'Segoe UI', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 15, 25);
  ctx.textAlign = "right";
  ctx.fillText(`Lives: ${lives}`, canvas.width - 15, 25);
}

function drawOverlay(title, subtitle) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#e94560";
  ctx.font = "bold 48px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 20);
  ctx.fillStyle = "#f5f5f5";
  ctx.font = "18px 'Segoe UI', sans-serif";
  ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 25);
}

// --- Game Loop ---
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState === "playing") {
    updatePaddle();
    updateBall();
    drawBricks();
    drawPaddle();
    drawBall();
    drawHUD();
  } else if (gameState === "start") {
    drawBricks();
    drawPaddle();
    drawBall();
    drawOverlay("BRICK BREAKER", "Click or press Space to start");
  } else if (gameState === "gameover") {
    drawBricks();
    drawPaddle();
    drawOverlay("GAME OVER", `Final Score: ${score} — Click or press Space to retry`);
  } else if (gameState === "win") {
    drawOverlay("YOU WIN!", `Score: ${score} — Click or press Space to play again`);
  }

  requestAnimationFrame(draw);
}

draw();
