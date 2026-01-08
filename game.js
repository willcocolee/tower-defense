/**
 * NEON DEFENSE - Core Game Logic
 */

const CANVAS = document.getElementById('gameCanvas');
const CTX = CANVAS.getContext('2d');

// --- CONSTANTS & CONFIG ---
const TILE_SIZE = 40;
const COLS = 20;
const ROWS = 15;
const FPS = 60;

// Colors
const COLOR_BG = '#0f172a';
const COLOR_GRID = '#1e293b';
const COLOR_PATH = '#334155';
const COLOR_TOWER = '#3b82f6';
const COLOR_ENEMY = '#ef4444';
const COLOR_PROJECTILE = '#facc15';

// Game State
const STATE = {
    money: 100,
    lives: 20,
    wave: 1,
    enemies: [],
    towers: [],
    projectiles: [],
    particles: [],
    gameOver: false,
    waveActive: false
};

// Map Path (Simple winding path)
// Coordinates in TILE units (x, y)
const PATH_POINTS = [
    {x: 0, y: 2},
    {x: 4, y: 2},
    {x: 4, y: 8},
    {x: 10, y: 8},
    {x: 10, y: 3},
    {x: 16, y: 3},
    {x: 16, y: 10},
    {x: 8, y: 10},
    {x: 8, y: 13},
    {x: 19, y: 13} // Exit
];

// UI Elements
const uiMoney = document.getElementById('money-display');
const uiLives = document.getElementById('lives-display');
const uiWave = document.getElementById('wave-display');
const btnNextWave = document.getElementById('next-wave-btn');

// --- CLASSES ---

class Game {
    constructor() {
        this.lastTime = 0;
        this.spawnTimer = 0;
        this.enemiesToSpawn = 0;
        
        this.initInput();
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
        
        btnNextWave.addEventListener('click', () => this.startWave());
        this.updateUI();
    }

    initInput() {
        CANVAS.addEventListener('click', (e) => {
            if (STATE.gameOver) return;
            
            const rect = CANVAS.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const gridX = Math.floor(x / TILE_SIZE);
            const gridY = Math.floor(y / TILE_SIZE);
            
            this.tryPlaceTower(gridX, gridY);
        });
    }

    tryPlaceTower(gx, gy) {
        // Check cost
        if (STATE.money < 50) return;

        // Check bounds
        if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return;

        // Check if on path
        if (isPointOnPath(gx, gy)) {
            // Cannot place on path
            return;
        }

        // Check if occupied
        const existing = STATE.towers.find(t => t.gx === gx && t.gy === gy);
        if (existing) return;

        // Place tower
        STATE.towers.push(new Tower(gx, gy));
        STATE.money -= 50;
        createParticles(gx * TILE_SIZE + TILE_SIZE/2, gy * TILE_SIZE + TILE_SIZE/2, 10, '#38bdf8');
        this.updateUI();
    }

    startWave() {
        if (STATE.waveActive) return;
        
        STATE.waveActive = true;
        this.enemiesToSpawn = 5 + (STATE.wave * 2); // Simple scaling
        this.spawnTimer = 0;
        
        btnNextWave.disabled = true;
        btnNextWave.textContent = 'WAVE IN PROGRESS...';
    }

    endWave() {
        STATE.waveActive = false;
        STATE.wave++;
        
        btnNextWave.disabled = false;
        btnNextWave.textContent = 'START NEXT WAVE';
        this.updateUI();
    }

    update(dt) {
        if (STATE.gameOver) return;

        // Spawning
        if (STATE.waveActive && this.enemiesToSpawn > 0) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                STATE.enemies.push(new Enemy(PATH_POINTS));
                this.enemiesToSpawn--;
                this.spawnTimer = 1000; // 1 second gap
            }
        } else if (STATE.waveActive && this.enemiesToSpawn <= 0 && STATE.enemies.length === 0) {
            this.endWave();
        }

        // Update Entities
        STATE.enemies.forEach(e => e.update(dt));
        STATE.towers.forEach(t => t.update(dt));
        STATE.projectiles.forEach(p => p.update(dt));
        STATE.particles.forEach(p => p.update(dt));

        // Cleanup
        STATE.enemies = STATE.enemies.filter(e => e.active);
        STATE.projectiles = STATE.projectiles.filter(p => p.active);
        STATE.particles = STATE.particles.filter(p => p.active);

        // Check Game Over
        if (STATE.lives <= 0) {
            STATE.gameOver = true;
            alert("GAME OVER! Reload to restart.");
        }
    }

    draw() {
        // Clear
        CTX.fillStyle = COLOR_BG;
        CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);

        // Draw Map
        this.drawGrid();
        this.drawPath();

        // Draw Entities
        STATE.towers.forEach(t => t.draw(CTX));
        STATE.enemies.forEach(e => e.draw(CTX));
        STATE.projectiles.forEach(p => p.draw(CTX));
        STATE.particles.forEach(p => p.draw(CTX));
    }

    drawGrid() {
        CTX.strokeStyle = COLOR_GRID;
        CTX.lineWidth = 1;
        
        for (let x = 0; x <= CANVAS.width; x += TILE_SIZE) {
            CTX.beginPath();
            CTX.moveTo(x, 0);
            CTX.lineTo(x, CANVAS.height);
            CTX.stroke();
        }

        for (let y = 0; y <= CANVAS.height; y += TILE_SIZE) {
            CTX.beginPath();
            CTX.moveTo(0, y);
            CTX.lineTo(CANVAS.width, y);
            CTX.stroke();
        }
    }

    drawPath() {
        CTX.strokeStyle = COLOR_PATH;
        CTX.lineWidth = TILE_SIZE * 0.6;
        CTX.lineCap = 'round';
        CTX.lineJoin = 'round';
        
        CTX.beginPath();
        if (PATH_POINTS.length > 0) {
            const start = PATH_POINTS[0];
            CTX.moveTo(start.x * TILE_SIZE + TILE_SIZE/2, start.y * TILE_SIZE + TILE_SIZE/2);
            
            for (let i = 1; i < PATH_POINTS.length; i++) {
                const p = PATH_POINTS[i];
                CTX.lineTo(p.x * TILE_SIZE + TILE_SIZE/2, p.y * TILE_SIZE + TILE_SIZE/2);
            }
        }
        CTX.stroke();
    }

    loop(timestamp) {
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        this.update(dt);
        this.draw();
        
        requestAnimationFrame(this.loop);
    }
    
    updateUI() {
        uiMoney.textContent = STATE.money;
        uiLives.textContent = STATE.lives;
        uiWave.textContent = STATE.wave;
    }
}

class Enemy {
    constructor(path) {
        this.path = path;
        this.pathIndex = 0;
        this.active = true;
        
        // Start position
        const start = this.path[0];
        this.x = start.x * TILE_SIZE + TILE_SIZE/2;
        this.y = start.y * TILE_SIZE + TILE_SIZE/2;
        
        // Stats
        this.speed = 0.05 * TILE_SIZE; // Pixels per ms (adjusted for dt)
        this.hp = 20 + (STATE.wave * 10);
        this.maxHp = this.hp;
        this.radio = 12;
    }

    update(dt) {
        // Move towards next point
        if (this.pathIndex >= this.path.length - 1) {
            // Reached end
            this.active = false;
            STATE.lives--;
            game.updateUI();
            return;
        }

        const target = this.path[this.pathIndex + 1];
        const tx = target.x * TILE_SIZE + TILE_SIZE/2;
        const ty = target.y * TILE_SIZE + TILE_SIZE/2;
        
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Normalize speed
        const moveStep = (120 * dt / 1000); // Speed control
        
        if (dist <= moveStep) {
            // Reached point
            this.x = tx;
            this.y = ty;
            this.pathIndex++;
        } else {
            this.x += (dx / dist) * moveStep;
            this.y += (dy / dist) * moveStep;
        }
    }

    draw(ctx) {
        ctx.fillStyle = COLOR_ENEMY;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radio, 0, Math.PI * 2);
        ctx.fill();
        
        // Health bar
        const hpPct = this.hp / this.maxHp;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(this.x - 10, this.y - 20, 20, 4);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(this.x - 10, this.y - 20, 20 * hpPct, 4);
    }
    
    takeDamage(amount) {
        this.hp -= amount;
        createParticles(this.x, this.y, 3, '#ef4444');
        if (this.hp <= 0) {
            this.active = false;
            STATE.money += 15;
            game.updateUI();
            createParticles(this.x, this.y, 8, '#facc15');
        }
    }
}

class Tower {
    constructor(gx, gy) {
        this.gx = gx;
        this.gy = gy;
        this.x = gx * TILE_SIZE + TILE_SIZE/2;
        this.y = gy * TILE_SIZE + TILE_SIZE/2;
        
        this.range = 3 * TILE_SIZE;
        this.cooldown = 0;
        this.fireRate = 800; // ms
        this.angle = 0;
    }

    update(dt) {
        if (this.cooldown > 0) this.cooldown -= dt;
        
        // Find target
        const target = this.findTarget();
        if (target) {
            // Rotate towards target
            this.angle = Math.atan2(target.y - this.y, target.x - this.x);
            
            // Shoot
            if (this.cooldown <= 0) {
                this.shoot(target);
                this.cooldown = this.fireRate;
            }
        }
    }

    findTarget() {
        // Simple closest target logic
        let closest = null;
        let minDst = Infinity;
        
        for (const e of STATE.enemies) {
            const dist = Math.hypot(e.x - this.x, e.y - this.y);
            if (dist <= this.range && dist < minDst) {
                minDst = dist;
                closest = e;
            }
        }
        return closest;
    }

    shoot(target) {
        STATE.projectiles.push(new Projectile(this.x, this.y, target));
    }

    draw(ctx) {
        // Base
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(this.gx*TILE_SIZE+2, this.gy*TILE_SIZE+2, TILE_SIZE-4, TILE_SIZE-4);
        
        // Turret (Rotatable)
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.fillStyle = COLOR_TOWER;
        ctx.fillRect(-10, -10, 20, 20);
        
        // Barrel
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(0, -4, 24, 8);
        
        ctx.restore();
        
        // Range (optional - shown on hover? Skipping for now)
    }
}

class Projectile {
    constructor(x, y, target) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.active = true;
        this.speed = 0.4; // px per ms
        this.damage = 10;
        
        // Lock target pos incase it dies (homing or last known pos)
        // For simplicity, we'll do homing, but if target dies, missile fizzles
    }

    update(dt) {
        if (!this.target || !this.target.active) {
            this.active = false;
            return;
        }

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        const move = this.speed * dt;
        
        if (dist <= move) {
            // Hit
            this.target.takeDamage(this.damage);
            this.active = false;
        } else {
            this.x += (dx/dist) * move;
            this.y += (dy/dist) * move;
        }
    }

    draw(ctx) {
        ctx.fillStyle = COLOR_PROJECTILE;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI*2);
        ctx.fill();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.active = true;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.1 + 0.05;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.decay = 0.02;
    }
    
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= this.decay * (dt / 16);
        
        if (this.life <= 0) this.active = false;
    }
    
    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 3, 3);
        ctx.globalAlpha = 1.0;
    }
}

// --- UTILS ---

function isPointOnPath(gx, gy) {
    if (PATH_POINTS.length < 2) return false;
    
    // Check segments
    for (let i = 0; i < PATH_POINTS.length - 1; i++) {
        const p1 = PATH_POINTS[i];
        const p2 = PATH_POINTS[i+1];
        
        // Check if point on segment
        // Horizontal
        if (p1.y === p2.y && gy === p1.y) {
            if ((gx >= p1.x && gx <= p2.x) || (gx >= p2.x && gx <= p1.x)) return true;
        }
        // Vertical
        if (p1.x === p2.x && gx === p1.x) {
            if ((gy >= p1.y && gy <= p2.y) || (gy >= p2.y && gy <= p1.y)) return true;
        }
    }
    return false;
}

function createParticles(x, y, count, color) {
    for(let i=0; i<count; i++) {
        STATE.particles.push(new Particle(x, y, color));
    }
}

// Start
const game = new Game();
