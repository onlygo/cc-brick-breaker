// roundRect polyfill for older browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
    const r = typeof radii === "number" ? radii : Array.isArray(radii) ? radii[0] : 0;
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.arcTo(x + w, y, x + w, y + r, r);
    this.lineTo(x + w, y + h - r);
    this.arcTo(x + w, y + h, x + w - r, y + h, r);
    this.lineTo(x + r, y + h);
    this.arcTo(x, y + h, x, y + h - r, r);
    this.lineTo(x, y + r);
    this.arcTo(x, y, x + r, y, r);
    this.closePath();
  };
}

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

const BALL_SPEED = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);

function normalizeBallSpeed() {
  const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
  if (currentSpeed === 0) return;
  const scale = BALL_SPEED / currentSpeed;
  ball.dx *= scale;
  ball.dy *= scale;
}

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

// --- Particles ---
const particles = [];

function spawnParticles(x, y, color) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x,
      y,
      dx: (Math.random() - 0.5) * 6,
      dy: (Math.random() - 0.5) * 6,
      radius: Math.random() * 3 + 1,
      color,
      life: 1,
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.dx;
    p.y += p.dy;
    p.life -= 0.03;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// --- Ball Trail ---
const trail = [];

function updateTrail() {
  trail.push({ x: ball.x, y: ball.y });
  if (trail.length > 10) trail.shift();
}

function drawTrail() {
  for (let i = 0; i < trail.length; i++) {
    const alpha = (i / trail.length) * 0.3;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(trail[i].x, trail[i].y, ball.radius * (i / trail.length), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
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

  // Wall collisions (left/right) with position clamping
  if (ball.x - ball.radius <= 0) {
    ball.dx = Math.abs(ball.dx);
    ball.x = ball.radius;
  } else if (ball.x + ball.radius >= canvas.width) {
    ball.dx = -Math.abs(ball.dx);
    ball.x = canvas.width - ball.radius;
  }
  // Ceiling
  if (ball.y - ball.radius <= 0) {
    ball.dy = Math.abs(ball.dy);
    ball.y = ball.radius;
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
    ball.y = paddle.y - ball.radius; // Prevent sticking inside paddle
    const hitPos = (ball.x - paddle.x) / paddle.width;
    ball.dx = 6 * (hitPos - 0.5);
    ball.dy = -Math.abs(ball.dy);
    normalizeBallSpeed();
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
        // Determine which face was hit
        const overlapLeft = ball.x + ball.radius - b.x;
        const overlapRight = b.x + brickConfig.width - (ball.x - ball.radius);
        const overlapTop = ball.y + ball.radius - b.y;
        const overlapBottom = b.y + brickConfig.height - (ball.y - ball.radius);
        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);
        if (minOverlapX < minOverlapY) {
          ball.dx = -ball.dx;
        } else {
          ball.dy = -ball.dy;
        }
        score += b.points;
        spawnParticles(b.x + brickConfig.width / 2, b.y + brickConfig.height / 2, b.color);
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
  ctx.shadowColor = paddle.color;
  ctx.shadowBlur = 15;
  ctx.fillStyle = paddle.color;
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 6);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawBricks() {
  for (let r = 0; r < brickConfig.rows; r++) {
    for (let c = 0; c < brickConfig.cols; c++) {
      const b = bricks[r][c];
      if (!b.alive) continue;
      const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + brickConfig.height);
      grad.addColorStop(0, b.color);
      grad.addColorStop(1, shadeColor(b.color, -30));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, brickConfig.width, brickConfig.height, 4);
      ctx.fill();
      // Top highlight
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.roundRect(b.x + 2, b.y + 2, brickConfig.width - 4, brickConfig.height / 2 - 2, 2);
      ctx.fill();
    }
  }
}

function shadeColor(hex, amt) {
  let r = parseInt(hex.slice(1, 3), 16) + amt;
  let g = parseInt(hex.slice(3, 5), 16) + amt;
  let b = parseInt(hex.slice(5, 7), 16) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
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

  updateParticles();

  if (gameState === "playing") {
    updatePaddle();
    updateBall();
    updateTrail();
    drawBricks();
    drawTrail();
    drawPaddle();
    drawBall();
    drawParticles();
    drawHUD();
  } else if (gameState === "start") {
    drawBricks();
    drawPaddle();
    drawBall();
    drawParticles();
    drawOverlay("BRICK BREAKER", "Click or press Space to start");
  } else if (gameState === "gameover") {
    drawBricks();
    drawPaddle();
    drawParticles();
    drawOverlay("GAME OVER", `Final Score: ${score} — Click or press Space to retry`);
  } else if (gameState === "win") {
    drawParticles();
    drawOverlay("YOU WIN!", `Score: ${score} — Click or press Space to play again`);
  }

  requestAnimationFrame(draw);
}

draw();
