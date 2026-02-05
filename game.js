const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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
      };
    }
  }
}

createBricks();

// --- Input ---
const keys = {};
let mouseX = paddle.x + paddle.width / 2;

document.addEventListener("keydown", (e) => (keys[e.key] = true));
document.addEventListener("keyup", (e) => (keys[e.key] = false));
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
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
  // Floor (reset for now)
  if (ball.y + ball.radius >= canvas.height) {
    ball.x = canvas.width / 2;
    ball.y = paddle.y - 12;
    ball.dx = 4;
    ball.dy = -4;
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
    // Angle the ball based on where it hits the paddle
    const hitPos = (ball.x - paddle.x) / paddle.width; // 0..1
    ball.dx = 6 * (hitPos - 0.5); // range -3..3
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
      }
    }
  }
}

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

// --- Game Loop ---
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updatePaddle();
  updateBall();

  drawBricks();
  drawPaddle();
  drawBall();

  requestAnimationFrame(draw);
}

draw();
