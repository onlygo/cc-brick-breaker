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

(function () {
  "use strict";

  // =========================================================================
  // Configuration
  // =========================================================================

  const CONFIG = {
    canvas: { width: 800, height: 600 },
    paddle: { width: 120, height: 14, speed: 7, bottomOffset: 30, color: "#00d9ff" },
    ball: { radius: 8, initialDx: 4, initialDy: -4, color: "#ffffff", maxDeflection: 6 },
    bricks: {
      rows: 5,
      cols: 10,
      width: 68,
      height: 20,
      padding: 6,
      offsetTop: 50,
      offsetLeft: 35,
      colors: ["#ff006e", "#fb5607", "#ffbe0b", "#8338ec", "#3a86ff"],
      points: [50, 40, 30, 20, 10],
    },
    particles: { count: 8, speed: 6, decay: 0.03, maxRadius: 3, minRadius: 1 },
    trail: { maxLength: 10, maxAlpha: 0.3 },
    lives: 3,
    font: "'Segoe UI', sans-serif",
  };

  const BALL_SPEED = Math.sqrt(
    CONFIG.ball.initialDx ** 2 + CONFIG.ball.initialDy ** 2,
  );

  // =========================================================================
  // Canvas setup
  // =========================================================================

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // =========================================================================
  // Utility
  // =========================================================================

  function shadeColor(hex, amt) {
    const clamp = (v) => Math.max(0, Math.min(255, v));
    const r = clamp(parseInt(hex.slice(1, 3), 16) + amt);
    const g = clamp(parseInt(hex.slice(3, 5), 16) + amt);
    const b = clamp(parseInt(hex.slice(5, 7), 16) + amt);
    return `rgb(${r},${g},${b})`;
  }

  // =========================================================================
  // Input
  // =========================================================================

  const input = {
    keys: {},
    mouseX: CONFIG.canvas.width / 2,
    mouseActive: false,

    init() {
      document.addEventListener("keydown", (e) => {
        this.keys[e.key] = true;
        if (e.key === " " || e.key === "Enter") game.handleStart();
      });
      document.addEventListener("keyup", (e) => (this.keys[e.key] = false));
      canvas.addEventListener("mouseenter", () => (this.mouseActive = true));
      canvas.addEventListener("mouseleave", () => (this.mouseActive = false));
      canvas.addEventListener("mousemove", (e) => {
        this.mouseActive = true;
        this.mouseX = e.clientX - canvas.getBoundingClientRect().left;
      });
      canvas.addEventListener("click", () => game.handleStart());
    },

    isLeft() {
      return this.keys["ArrowLeft"] || this.keys["a"];
    },
    isRight() {
      return this.keys["ArrowRight"] || this.keys["d"];
    },
  };

  // =========================================================================
  // Particle system
  // =========================================================================

  const particleSystem = {
    items: [],

    spawn(x, y, color) {
      const cfg = CONFIG.particles;
      for (let i = 0; i < cfg.count; i++) {
        this.items.push({
          x,
          y,
          dx: (Math.random() - 0.5) * cfg.speed,
          dy: (Math.random() - 0.5) * cfg.speed,
          radius: Math.random() * cfg.maxRadius + cfg.minRadius,
          color,
          life: 1,
        });
      }
    },

    update() {
      for (let i = this.items.length - 1; i >= 0; i--) {
        const p = this.items[i];
        p.x += p.dx;
        p.y += p.dy;
        p.life -= CONFIG.particles.decay;
        if (p.life <= 0) this.items.splice(i, 1);
      }
    },

    draw() {
      for (const p of this.items) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };

  // =========================================================================
  // Ball trail
  // =========================================================================

  const trail = {
    points: [],

    update(x, y) {
      this.points.push({ x, y });
      if (this.points.length > CONFIG.trail.maxLength) this.points.shift();
    },

    draw() {
      const len = this.points.length;
      for (let i = 0; i < len; i++) {
        ctx.globalAlpha = (i / len) * CONFIG.trail.maxAlpha;
        ctx.fillStyle = CONFIG.ball.color;
        ctx.beginPath();
        ctx.arc(this.points[i].x, this.points[i].y, CONFIG.ball.radius * (i / len), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },

    clear() {
      this.points.length = 0;
    },
  };

  // =========================================================================
  // Game objects
  // =========================================================================

  const paddle = {
    x: 0,
    y: CONFIG.canvas.height - CONFIG.paddle.bottomOffset,

    reset() {
      this.x = (CONFIG.canvas.width - CONFIG.paddle.width) / 2;
    },

    update() {
      if (input.isLeft()) this.x -= CONFIG.paddle.speed;
      if (input.isRight()) this.x += CONFIG.paddle.speed;
      if (input.mouseActive) this.x = input.mouseX - CONFIG.paddle.width / 2;
      this.x = Math.max(0, Math.min(CONFIG.canvas.width - CONFIG.paddle.width, this.x));
    },

    draw() {
      ctx.shadowColor = CONFIG.paddle.color;
      ctx.shadowBlur = 15;
      ctx.fillStyle = CONFIG.paddle.color;
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, CONFIG.paddle.width, CONFIG.paddle.height, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
    },
  };

  const ball = {
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,

    reset() {
      this.x = CONFIG.canvas.width / 2;
      this.y = paddle.y - CONFIG.ball.radius - 4;
      this.dx = CONFIG.ball.initialDx * (Math.random() > 0.5 ? 1 : -1);
      this.dy = CONFIG.ball.initialDy;
      trail.clear();
    },

    normalizeSpeed() {
      const speed = Math.sqrt(this.dx ** 2 + this.dy ** 2);
      if (speed === 0) return;
      const scale = BALL_SPEED / speed;
      this.dx *= scale;
      this.dy *= scale;
    },

    update() {
      this.x += this.dx;
      this.y += this.dy;

      // Wall collisions with position clamping
      if (this.x - CONFIG.ball.radius <= 0) {
        this.dx = Math.abs(this.dx);
        this.x = CONFIG.ball.radius;
      } else if (this.x + CONFIG.ball.radius >= CONFIG.canvas.width) {
        this.dx = -Math.abs(this.dx);
        this.x = CONFIG.canvas.width - CONFIG.ball.radius;
      }
      if (this.y - CONFIG.ball.radius <= 0) {
        this.dy = Math.abs(this.dy);
        this.y = CONFIG.ball.radius;
      }

      // Floor — lose a life
      if (this.y + CONFIG.ball.radius >= CONFIG.canvas.height) {
        game.loseLife();
        return;
      }

      this.collidePaddle();
      this.collideBricks();
    },

    collidePaddle() {
      if (
        this.dy > 0 &&
        this.y + CONFIG.ball.radius >= paddle.y &&
        this.y + CONFIG.ball.radius <= paddle.y + CONFIG.paddle.height &&
        this.x >= paddle.x &&
        this.x <= paddle.x + CONFIG.paddle.width
      ) {
        this.y = paddle.y - CONFIG.ball.radius;
        const hitPos = (this.x - paddle.x) / CONFIG.paddle.width;
        this.dx = CONFIG.ball.maxDeflection * (hitPos - 0.5);
        this.dy = -Math.abs(this.dy);
        this.normalizeSpeed();
      }
    },

    collideBricks() {
      const cfg = CONFIG.bricks;
      for (let r = 0; r < cfg.rows; r++) {
        for (let c = 0; c < cfg.cols; c++) {
          const b = brickGrid.bricks[r][c];
          if (!b.alive) continue;
          if (
            this.x + CONFIG.ball.radius > b.x &&
            this.x - CONFIG.ball.radius < b.x + cfg.width &&
            this.y + CONFIG.ball.radius > b.y &&
            this.y - CONFIG.ball.radius < b.y + cfg.height
          ) {
            b.alive = false;

            // Determine collision face
            const overlapX = Math.min(
              this.x + CONFIG.ball.radius - b.x,
              b.x + cfg.width - (this.x - CONFIG.ball.radius),
            );
            const overlapY = Math.min(
              this.y + CONFIG.ball.radius - b.y,
              b.y + cfg.height - (this.y - CONFIG.ball.radius),
            );
            if (overlapX < overlapY) {
              this.dx = -this.dx;
            } else {
              this.dy = -this.dy;
            }

            game.addScore(b.points);
            particleSystem.spawn(b.x + cfg.width / 2, b.y + cfg.height / 2, b.color);

            if (brickGrid.allDestroyed()) game.state = "win";
            return;
          }
        }
      }
    },

    draw() {
      ctx.fillStyle = CONFIG.ball.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, CONFIG.ball.radius, 0, Math.PI * 2);
      ctx.fill();
    },
  };

  const brickGrid = {
    bricks: [],

    create() {
      const cfg = CONFIG.bricks;
      this.bricks = [];
      for (let r = 0; r < cfg.rows; r++) {
        this.bricks[r] = [];
        for (let c = 0; c < cfg.cols; c++) {
          this.bricks[r][c] = {
            x: cfg.offsetLeft + c * (cfg.width + cfg.padding),
            y: cfg.offsetTop + r * (cfg.height + cfg.padding),
            alive: true,
            color: cfg.colors[r],
            points: cfg.points[r],
          };
        }
      }
    },

    allDestroyed() {
      for (let r = 0; r < CONFIG.bricks.rows; r++) {
        for (let c = 0; c < CONFIG.bricks.cols; c++) {
          if (this.bricks[r][c].alive) return false;
        }
      }
      return true;
    },

    draw() {
      const cfg = CONFIG.bricks;
      for (let r = 0; r < cfg.rows; r++) {
        for (let c = 0; c < cfg.cols; c++) {
          const b = this.bricks[r][c];
          if (!b.alive) continue;

          const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + cfg.height);
          grad.addColorStop(0, b.color);
          grad.addColorStop(1, shadeColor(b.color, -30));
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(b.x, b.y, cfg.width, cfg.height, 4);
          ctx.fill();

          // Top highlight
          ctx.fillStyle = "rgba(255,255,255,0.15)";
          ctx.beginPath();
          ctx.roundRect(b.x + 2, b.y + 2, cfg.width - 4, cfg.height / 2 - 2, 2);
          ctx.fill();
        }
      }
    },
  };

  // =========================================================================
  // HUD / Overlays
  // =========================================================================

  function drawHUD() {
    ctx.fillStyle = "#ffffff";
    ctx.font = `16px ${CONFIG.font}`;
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${game.score}`, 15, 25);
    ctx.textAlign = "right";
    ctx.fillText(`Lives: ${game.lives}`, CONFIG.canvas.width - 15, 25);
  }

  function drawOverlay(title, subtitle) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    ctx.fillStyle = "#00d9ff";
    ctx.font = `bold 48px ${CONFIG.font}`;
    ctx.textAlign = "center";
    ctx.fillText(title, CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 - 20);
    ctx.fillStyle = "#ffffff";
    ctx.font = `18px ${CONFIG.font}`;
    ctx.fillText(subtitle, CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 25);
  }

  // =========================================================================
  // Game controller
  // =========================================================================

  const game = {
    state: "start",
    score: 0,
    lives: CONFIG.lives,

    handleStart() {
      if (this.state !== "playing") this.reset();
    },

    reset() {
      this.score = 0;
      this.lives = CONFIG.lives;
      this.state = "playing";
      brickGrid.create();
      paddle.reset();
      ball.reset();
    },

    loseLife() {
      this.lives--;
      if (this.lives <= 0) {
        this.state = "gameover";
      } else {
        paddle.reset();
        ball.reset();
      }
    },

    addScore(points) {
      this.score += points;
    },

    // --- Main loop -----------------------------------------------------------

    update() {
      particleSystem.update();
      if (this.state !== "playing") return;
      paddle.update();
      ball.update();
      trail.update(ball.x, ball.y);
    },

    render() {
      ctx.clearRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

      if (this.state === "playing") {
        brickGrid.draw();
        trail.draw();
        paddle.draw();
        ball.draw();
        particleSystem.draw();
        drawHUD();
      } else if (this.state === "start") {
        brickGrid.draw();
        paddle.draw();
        ball.draw();
        particleSystem.draw();
        drawOverlay("BRICK BREAKER", "Click or press Space to start");
      } else if (this.state === "gameover") {
        brickGrid.draw();
        paddle.draw();
        particleSystem.draw();
        drawOverlay("GAME OVER", `Final Score: ${this.score} \u2014 Click or press Space to retry`);
      } else if (this.state === "win") {
        particleSystem.draw();
        drawOverlay("YOU WIN!", `Score: ${this.score} \u2014 Click or press Space to play again`);
      }
    },

    loop() {
      this.update();
      this.render();
      requestAnimationFrame(() => this.loop());
    },

    start() {
      brickGrid.create();
      paddle.reset();
      ball.reset();
      input.init();
      this.loop();
    },
  };

  // =========================================================================
  // Boot
  // =========================================================================

  game.start();
})();
