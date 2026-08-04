(function () {
    'use strict';

    const canvas = document.getElementById('bug-hunt-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const overlay = document.getElementById('bug-hunt-overlay');
    const restartButton = document.getElementById('bug-hunt-restart');
    const scoreNode = document.getElementById('bug-hunt-score');
    const W = canvas.width;
    const H = canvas.height;
    const keys = new Set();
    const pointer = { down: false, dragged: false, startX: 0, startY: 0 };
    const enemyTypes = [
        { label: '불', color: '#ff657a', speed: 0.9, hp: 1, radius: 14 },
        { label: '편', color: '#bc8cff', speed: 0.68, hp: 2, radius: 17 },
        { label: '함', color: '#ffbd69', speed: 0.52, hp: 3, radius: 20 }
    ];
    let player, bullets, enemies, particles, score, hp, elapsed, spawnClock;
    let running = false;
    let lastTime = 0;
    let animationId = 0;

    function resetState() {
        player = { x: W / 2, y: H / 2, radius: 14, speed: 3.1, aimX: 1, aimY: 0, cooldown: 0, invulnerable: 0 };
        bullets = [];
        enemies = [];
        particles = [];
        score = 0;
        hp = 1;
        elapsed = 0;
        spawnClock = 0;
        for (let i = 0; i < 9; i += 1) spawnEnemy();
        updateHud();
        draw();
    }

    function begin() {
        resetState();
        running = true;
        lastTime = performance.now();
        overlay.classList.add('is-hidden');
        canvas.focus({ preventScroll: true });
        cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(loop);
    }

    function end() {
        running = false;
        overlay.classList.remove('is-hidden');
        overlay.querySelector('strong').textContent = '불편함은 끝이 없다.';
    }

    function updateHud() {
        scoreNode.textContent = score;
    }

    function canvasPoint(event) {
        const rect = canvas.getBoundingClientRect();
        return { x: (event.clientX - rect.left) * W / rect.width, y: (event.clientY - rect.top) * H / rect.height };
    }

    function setAim(x, y) {
        const dx = x - player.x;
        const dy = y - player.y;
        const length = Math.hypot(dx, dy) || 1;
        player.aimX = dx / length;
        player.aimY = dy / length;
    }

    function shoot() {
        if (!running || player.cooldown > 0) return;
        bullets.push({ x: player.x + player.aimX * 18, y: player.y + player.aimY * 18, vx: player.aimX * 7.5, vy: player.aimY * 7.5, life: 75 });
        player.cooldown = 9;
    }

    function spawnEnemy() {
        const level = 1 + Math.floor(elapsed / 14);
        const maxType = Math.min(enemyTypes.length, 2 + Math.floor(level / 2));
        const base = enemyTypes[Math.floor(Math.random() * maxType)];
        const edge = Math.floor(Math.random() * 4);
        let x = Math.random() * W;
        let y = Math.random() * H;
        if (edge === 0) y = -24;
        if (edge === 1) x = W + 24;
        if (edge === 2) y = H + 24;
        if (edge === 3) x = -24;
        enemies.push({ ...base, x, y, hp: base.hp + Math.floor(level / 5), pulse: Math.random() * Math.PI * 2 });
    }

    function burst(x, y, color) {
        for (let i = 0; i < 7; i += 1) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.8 + Math.random() * 2.2;
            particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 24, color });
        }
    }

    function update(delta) {
        const step = Math.min(2, delta / 16.667);
        elapsed += delta / 1000;
        spawnClock -= delta;
        player.cooldown = Math.max(0, player.cooldown - step);
        player.invulnerable = Math.max(0, player.invulnerable - step);

        let mx = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
        let my = (keys.has('s') ? 1 : 0) - (keys.has('w') ? 1 : 0);
        if (mx || my) {
            const length = Math.hypot(mx, my);
            player.x += mx / length * player.speed * step;
            player.y += my / length * player.speed * step;
        }
        player.x = Math.max(player.radius, Math.min(W - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(H - player.radius, player.y));

        if (spawnClock <= 0) {
            spawnEnemy();
            spawnClock = Math.max(260, 920 - elapsed * 15) * (0.72 + Math.random() * 0.5);
        }

        bullets.forEach(b => { b.x += b.vx * step; b.y += b.vy * step; b.life -= step; });
        bullets = bullets.filter(b => b.life > 0 && b.x > -10 && b.x < W + 10 && b.y > -10 && b.y < H + 10);

        enemies.forEach(enemy => {
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const length = Math.hypot(dx, dy) || 1;
            enemy.x += dx / length * enemy.speed * step;
            enemy.y += dy / length * enemy.speed * step;
            enemy.pulse += 0.06 * step;
            if (length < enemy.radius + player.radius && player.invulnerable <= 0) {
                hp = 0;
                player.invulnerable = 55;
                enemy.hp = 0;
                burst(enemy.x, enemy.y, enemy.color);
            }
        });

        bullets.forEach(bullet => {
            enemies.forEach(enemy => {
                if (bullet.life <= 0 || enemy.hp <= 0) return;
                if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < enemy.radius + 4) {
                    bullet.life = 0;
                    enemy.hp -= 1;
                    burst(bullet.x, bullet.y, enemy.color);
                    if (enemy.hp <= 0) score += 1;
                }
            });
        });
        enemies = enemies.filter(enemy => enemy.hp > 0);
        particles.forEach(p => { p.x += p.vx * step; p.y += p.vy * step; p.vx *= 0.95; p.vy *= 0.95; p.life -= step; });
        particles = particles.filter(p => p.life > 0);
        updateHud();
        if (hp <= 0) end();
    }

    function drawGrid() {
        ctx.strokeStyle = 'rgba(80, 130, 200, 0.07)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= W; x += 35) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y <= H; y += 35) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        const gradient = ctx.createRadialGradient(player.x, player.y, 10, player.x, player.y, 260);
        gradient.addColorStop(0, 'rgba(20, 58, 100, 0.25)');
        gradient.addColorStop(1, 'rgba(3, 6, 13, 0)');
        ctx.fillStyle = '#050812'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
        drawGrid();

        ctx.save();
        ctx.setLineDash([7, 8]);
        ctx.strokeStyle = 'rgba(68, 169, 255, 0.42)';
        ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(player.x + player.aimX * 95, player.y + player.aimY * 95); ctx.stroke();
        ctx.restore();

        bullets.forEach(b => {
            ctx.fillStyle = '#8fd7ff'; ctx.shadowColor = '#2997ff'; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(b.x, b.y, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        });

        enemies.forEach(drawDiscomfortMonster);

        particles.forEach(p => { ctx.globalAlpha = p.life / 24; ctx.fillStyle = p.color; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); });
        ctx.globalAlpha = 1;

        ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(Math.atan2(player.aimY, player.aimX));
        ctx.globalAlpha = player.invulnerable > 0 && Math.floor(player.invulnerable / 4) % 2 ? 0.35 : 1;
        ctx.shadowColor = '#2997ff'; ctx.shadowBlur = 18; ctx.fillStyle = '#2997ff';
        ctx.beginPath(); ctx.arc(0, 0, player.radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#dff2ff'; ctx.fillRect(6, -3, 18, 6);
        ctx.fillStyle = '#07101e'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    function drawDiscomfortMonster(enemy) {
        const pulse = 1 + Math.sin(enemy.pulse) * 0.07;
        const radius = enemy.radius;
        const legReach = radius * 0.86;

        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.scale(pulse, pulse);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // A compact halo keeps the silhouette readable when several bugs overlap.
        ctx.fillStyle = `${enemy.color}18`;
        ctx.strokeStyle = `${enemy.color}55`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // The six legs and antennae keep the glyphs readable as incoming monsters.
        ctx.strokeStyle = enemy.color;
        ctx.lineWidth = Math.max(1.4, radius * 0.11);
        for (let side = -1; side <= 1; side += 2) {
            for (let row = -1; row <= 1; row += 1) {
                const y = row * radius * 0.34;
                ctx.beginPath();
                ctx.moveTo(side * radius * 0.28, y);
                ctx.lineTo(side * legReach, y + row * radius * 0.18);
                ctx.stroke();
            }
        }
        ctx.beginPath();
        ctx.moveTo(-radius * 0.2, -radius * 0.5);
        ctx.lineTo(-radius * 0.55, -radius * 0.94);
        ctx.moveTo(radius * 0.2, -radius * 0.5);
        ctx.lineTo(radius * 0.55, -radius * 0.94);
        ctx.stroke();
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(-radius * 0.55, -radius * 0.94, Math.max(1.3, radius * 0.1), 0, Math.PI * 2);
        ctx.arc(radius * 0.55, -radius * 0.94, Math.max(1.3, radius * 0.1), 0, Math.PI * 2);
        ctx.fill();

        // The Korean glyph is the monster's body: the discomfort itself is the target.
        ctx.fillStyle = '#0d1728';
        ctx.strokeStyle = enemy.color;
        ctx.lineWidth = Math.max(1.7, radius * 0.12);
        ctx.beginPath();
        ctx.roundRect(-radius * 0.58, -radius * 0.68, radius * 1.16, radius * 1.38, radius * 0.22);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = enemy.color;
        ctx.font = `900 ${Math.max(17, radius * 1.22)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = enemy.color;
        ctx.shadowBlur = 11;
        ctx.fillText(enemy.label, 0, radius * 0.06);
        ctx.shadowBlur = 0;

        // Two tiny eyes turn the letter into a character without obscuring its meaning.
        ctx.fillStyle = '#f3f8ff';
        ctx.beginPath();
        ctx.arc(-radius * 0.22, -radius * 0.76, Math.max(1.3, radius * 0.09), 0, Math.PI * 2);
        ctx.arc(radius * 0.22, -radius * 0.76, Math.max(1.3, radius * 0.09), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function loop(now) {
        if (!running) { draw(); return; }
        const delta = now - lastTime;
        lastTime = now;
        update(delta);
        draw();
        if (running) animationId = requestAnimationFrame(loop);
    }

    window.addEventListener('keydown', event => {
        const key = event.key.toLowerCase();
        if (running && ['w', 'a', 's', 'd'].includes(key)) { event.preventDefault(); keys.add(key); }
    });
    window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
    window.addEventListener('blur', () => keys.clear());

    canvas.addEventListener('pointerdown', event => {
        if (!running) return;
        const point = canvasPoint(event);
        pointer.down = true; pointer.dragged = false; pointer.startX = point.x; pointer.startY = point.y;
        setAim(point.x, point.y);
        canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
        const point = canvasPoint(event);
        if (pointer.down && Math.hypot(point.x - pointer.startX, point.y - pointer.startY) > 5) pointer.dragged = true;
        if (running) setAim(point.x, point.y);
    });
    canvas.addEventListener('pointerup', event => {
        if (!pointer.down) return;
        const point = canvasPoint(event);
        setAim(point.x, point.y);
        if (!pointer.dragged) shoot();
        pointer.down = false;
        canvas.releasePointerCapture(event.pointerId);
    });

    restartButton.addEventListener('click', begin);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && running) lastTime = performance.now(); });
    resetState();
    const visibilityObserver = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting) && !running) begin();
    }, { threshold: 0.2 });
    visibilityObserver.observe(document.getElementById('bug-hunt'));
}());
