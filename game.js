(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const message = document.querySelector("#gameMessage");
  const messageTitle = document.querySelector("#messageTitle");
  const messageText = document.querySelector("#messageText");
  const startButton = document.querySelector("#startButton");
  const scoreLabel = document.querySelector("#score");
  const nextGateLabel = document.querySelector("#nextGate");
  const energyText = document.querySelector("#energyText");
  const energyFill = document.querySelector("#energyFill");
  const energyBar = document.querySelector("#energyBar");
  const status = document.querySelector("#status");
  const leftButton = document.querySelector("#leftButton");
  const rightButton = document.querySelector("#rightButton");
  const jumpButton = document.querySelector("#jumpButton");

  const W = canvas.width;
  const H = canvas.height;
  const LANES = 3;
  const GATE_INTERVAL = 1;
  const JUMP_COST = 40;
  const ENERGY_RECHARGE = 18;
  const JUMP_MS = 620;
  const PLAYER_Y = 425;
  const state = {
    mode: "ready",
    lane: 1,
    energy: 100,
    score: 0,
    elapsed: 0,
    lastFrame: 0,
    spawnTimer: 0,
    obstacleCount: 0,
    jumpUntil: 0,
    obstacles: [],
    lastAnnouncedLane: null,
  };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function laneX(lane, progress) {
    const top = [444, 480, 516][lane];
    const bottom = [300, 480, 660][lane];
    return lerp(top, bottom, progress);
  }
  function obstacleY(progress) { return lerp(142, 420, progress); }
  function setStatus(text) { status.textContent = text; }

  function updateNextGate() {
    const nearest = state.obstacles.reduce((closest, obstacle) =>
      !closest || obstacle.progress > closest.progress ? obstacle : closest, null);
    const label = nearest ? `${["Left", "Center", "Right"][nearest.lane]} lane` : "None in sight";
    if (nextGateLabel.textContent !== label) nextGateLabel.textContent = label;
  }

  function setEnergy(value) {
    state.energy = Math.max(0, Math.min(100, value));
    const rounded = Math.round(state.energy);
    energyText.textContent = `${rounded} / 100`;
    energyFill.style.width = `${state.energy}%`;
    energyBar.setAttribute("aria-valuenow", String(rounded));
  }

  function roundedRect(x, y, w, h, radius, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#244b3e");
    sky.addColorStop(.5, "#1b382e");
    sky.addColorStop(1, "#10221f");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Original, abstract jungle canopy made only from simple shapes.
    ctx.fillStyle = "#19362c";
    for (let i = 0; i < 11; i++) {
      const x = i * 102 - 18;
      const height = 74 + (i % 4) * 19;
      ctx.beginPath();
      ctx.moveTo(x - 38, 154);
      ctx.lineTo(x, 154 - height);
      ctx.lineTo(x + 42, 154);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#d7d998";
    ctx.beginPath();
    ctx.arc(795, 83, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#29493a";
    ctx.beginPath();
    ctx.ellipse(480, 205, 305, 46, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#72593d";
    ctx.beginPath();
    ctx.moveTo(370, 130);
    ctx.lineTo(590, 130);
    ctx.lineTo(890, H);
    ctx.lineTo(70, H);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#92744a";
    ctx.beginPath();
    ctx.moveTo(390, 143);
    ctx.lineTo(570, 143);
    ctx.lineTo(817, H);
    ctx.lineTo(143, H);
    ctx.closePath();
    ctx.fill();

    // Three lane guides converge toward the horizon.
    for (const topX of [456, 504]) {
      const bottomX = topX < 480 ? 390 : 570;
      ctx.strokeStyle = "rgba(238, 220, 159, .52)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(topX, 145);
      ctx.lineTo(bottomX, H);
      ctx.stroke();
    }
    // Small stones give the track motion even before hazards arrive.
    for (let i = 0; i < 8; i++) {
      const p = ((state.elapsed * .18 + i / 8) % 1);
      const y = 160 + p * 380;
      const x = 185 + ((i * 173) % 590) * (0.45 + p * .55);
      const size = 2 + p * 7;
      ctx.fillStyle = `rgba(218, 194, 142, ${.15 + p * .25})`;
      ctx.beginPath();
      ctx.ellipse(x, y, size, size * .55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawObstacle(obstacle) {
    const p = Math.max(0, Math.min(1, obstacle.progress));
    const x = laneX(obstacle.lane, p);
    const y = obstacleY(p);
    const scale = .28 + p * .9;
    const width = 35 * scale;
    const height = 30 * scale;
    ctx.fillStyle = "rgba(6, 15, 12, .28)";
    ctx.beginPath();
    ctx.ellipse(x, y + height * .62, width * .8, 7 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    roundedRect(x - width / 2, y - height / 2, width, height, 5 * scale, "#d77e48");
    roundedRect(x - width / 2 + 5 * scale, y - height / 2 + 5 * scale, width - 10 * scale, height * .28, 3 * scale, "#f1b76a");
    ctx.fillStyle = "#563b2c";
    ctx.fillRect(x - width * .34, y + height * .05, width * .13, height * .32);
    ctx.fillRect(x + width * .2, y + height * .05, width * .13, height * .32);
  }

  function drawRunner() {
    const jumping = performance.now() < state.jumpUntil;
    const x = laneX(state.lane, .96);
    const hop = jumping ? 62 * Math.sin(Math.PI * (1 - (state.jumpUntil - performance.now()) / JUMP_MS)) : 0;
    const y = PLAYER_Y - hop;
    ctx.fillStyle = "rgba(7, 16, 13, .4)";
    ctx.beginPath();
    ctx.ellipse(x, PLAYER_Y + 17, jumping ? 29 : 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // A simple original runner silhouette: no copied game character or art.
    roundedRect(x - 15, y - 33, 30, 38, 10, "#b8df8d");
    ctx.fillStyle = "#243d30";
    ctx.beginPath();
    ctx.arc(x, y - 41, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f1d99a";
    ctx.beginPath();
    ctx.arc(x + 4, y - 42, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#243d30";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 4); ctx.lineTo(x - 13, y + 17);
    ctx.moveTo(x + 7, y + 4); ctx.lineTo(x + 13, y + 15);
    ctx.stroke();
    ctx.fillStyle = jumping ? "#f7a45a" : "#a9e879";
    ctx.beginPath();
    ctx.arc(x + 21, y - 19, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHudOnCanvas() {
    const laneNames = ["LEFT", "CENTER", "RIGHT"];
    ctx.fillStyle = "rgba(8, 21, 17, .56)";
    ctx.fillRect(22, 20, 185, 62);
    ctx.fillStyle = "#d4dfc3";
    ctx.font = "12px 'DM Mono', monospace";
    ctx.fillText("CURRENT LANE", 36, 42);
    ctx.fillStyle = "#c8ef8a";
    ctx.font = "bold 19px Manrope, sans-serif";
    ctx.fillText(laneNames[state.lane], 36, 68);
    if (state.mode === "running") {
      const nearest = state.obstacles.reduce((closest, obstacle) =>
        !closest || obstacle.progress > closest.progress ? obstacle : closest, null);
      const upcomingLane = nearest ? nearest.lane : (state.obstacleCount * 2 + 1) % LANES;
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(8, 21, 17, .56)";
      ctx.fillRect(W - 177, 20, 155, 44);
      ctx.fillStyle = "#f3e8bb";
      ctx.font = "12px 'DM Mono', monospace";
      ctx.fillText(`NEXT ${["LEFT", "CENTER", "RIGHT"][upcomingLane]}`, W - 36, 47);
      ctx.textAlign = "left";
    }
  }

  function draw() {
    drawBackground();
    for (const obstacle of state.obstacles) drawObstacle(obstacle);
    drawRunner();
    drawHudOnCanvas();
  }

  function startRun() {
    state.mode = "running";
    state.lane = 1;
    state.score = 0;
    state.elapsed = 0;
    state.spawnTimer = 0;
    state.obstacleCount = 0;
    state.jumpUntil = 0;
    state.obstacles = [];
    state.lastAnnouncedLane = null;
    updateNextGate();
    setEnergy(100);
    scoreLabel.textContent = "0";
    message.hidden = true;
    setStatus("Run started. Change lanes freely; jumps spend energy.");
    state.lastFrame = performance.now();
    canvas.focus({ preventScroll: true });
  }

  function endRun() {
    if (state.mode !== "running") return;
    state.mode = "over";
    const finalScore = Math.floor(state.score);
    messageTitle.textContent = "Run ended";
    messageText.textContent = `A stone gate caught you. You survived ${finalScore} meters.`;
    startButton.textContent = "Run again";
    message.hidden = false;
    setStatus(`Run ended at ${finalScore} meters. Press Run again to restart.`);
  }

  function moveLane(direction) {
    if (state.mode !== "running") return;
    const next = Math.max(0, Math.min(LANES - 1, state.lane + direction));
    if (next === state.lane) {
      setStatus(direction < 0 ? "You are already in the left lane." : "You are already in the right lane.");
      return;
    }
    state.lane = next;
    setStatus(`Moved to the ${["left", "center", "right"][next]} lane.`);
  }

  function jump() {
    if (state.mode !== "running") return;
    if (performance.now() < state.jumpUntil) {
      setStatus("Already jumping. Wait until you land before jumping again.");
      return;
    }
    if (state.energy < JUMP_COST) {
      setStatus("Not enough energy. Keep running to recharge before jumping.");
      return;
    }
    setEnergy(state.energy - JUMP_COST);
    state.jumpUntil = performance.now() + JUMP_MS;
    setStatus("Jump! 40 energy spent. Energy returns while you run.");
  }

  function spawnObstacle() {
    const lane = (state.obstacleCount * 2 + 1) % LANES;
    state.obstacleCount += 1;
    state.obstacles.push({ lane, progress: 0 });
    updateNextGate();
    if (state.obstacles.length === 1) {
      state.lastAnnouncedLane = lane;
      setStatus(`A gate is approaching in the ${["left", "center", "right"][lane]} lane.`);
    }
  }

  function update(deltaMs) {
    if (state.mode !== "running") return;
    const dt = Math.min(deltaMs, 45) / 1000;
    state.elapsed += dt;
    state.score += dt * 10;
    state.spawnTimer += dt;
    scoreLabel.textContent = String(Math.floor(state.score));

    if (performance.now() >= state.jumpUntil) setEnergy(state.energy + ENERGY_RECHARGE * dt);
    if (state.spawnTimer >= GATE_INTERVAL) {
      state.spawnTimer -= GATE_INTERVAL;
      spawnObstacle();
    }

    const speed = .39 + Math.min(.13, state.elapsed * .002);
    for (const obstacle of state.obstacles) {
      obstacle.progress += dt * speed;
      if (obstacle.progress >= .88 && obstacle.lane === state.lane && performance.now() >= state.jumpUntil) {
        endRun();
        return;
      }
    }
    state.obstacles = state.obstacles.filter(obstacle => obstacle.progress < 1.08);
    updateNextGate();
  }

  function frame(now) {
    const delta = state.lastFrame ? now - state.lastFrame : 16;
    state.lastFrame = now;
    update(delta);
    draw();
    requestAnimationFrame(frame);
  }

  startButton.addEventListener("click", startRun);
  leftButton.addEventListener("click", () => { moveLane(-1); canvas.focus({ preventScroll: true }); });
  rightButton.addEventListener("click", () => { moveLane(1); canvas.focus({ preventScroll: true }); });
  jumpButton.addEventListener("click", () => { jump(); canvas.focus({ preventScroll: true }); });
  document.addEventListener("keydown", event => {
    if (event.code === "ArrowLeft" || event.code === "ArrowRight" || event.code === "Space") event.preventDefault();
    if (event.repeat) return;
    if (event.code === "ArrowLeft") moveLane(-1);
    if (event.code === "ArrowRight") moveLane(1);
    if (event.code === "Space" && !(event.target instanceof HTMLButtonElement)) jump();
  });

  setEnergy(100);
  draw();
  requestAnimationFrame(frame);
})();
