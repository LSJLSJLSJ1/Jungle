(function () {
    'use strict';

    const canvas = document.getElementById('system-background');
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = window.matchMedia('(max-width: 680px)');
    const sectionModes = [
        ['intro', 'orbit'],
        ['learned', 'network'],
        ['journey', 'debug'],
        ['ghost-ai', 'chase'],
        ['philosophy', 'learning'],
        ['guestbook', 'signal']
    ];
    const palette = {
        blue: [41, 151, 255],
        cyan: [84, 214, 255],
        violet: [139, 125, 255],
        green: [66, 211, 146],
        orange: [255, 180, 84],
        red: [255, 101, 122]
    };
    const modeThemes = {
        orbit: {
            primary: palette.blue,
            secondary: palette.violet,
            anchor: [0.52, 0.42],
            index: '00',
            label: 'PLAYER ORIGIN'
        },
        network: {
            primary: palette.blue,
            secondary: palette.cyan,
            anchor: [0.76, 0.35],
            index: '01',
            label: 'SYSTEM PROFILE'
        },
        debug: {
            primary: palette.orange,
            secondary: palette.red,
            anchor: [0.22, 0.58],
            index: '02',
            label: 'DEBUG LOOP'
        },
        chase: {
            primary: palette.cyan,
            secondary: [255, 135, 190],
            anchor: [0.78, 0.48],
            index: '03',
            label: 'CHASE LOGIC'
        },
        learning: {
            primary: palette.green,
            secondary: palette.blue,
            anchor: [0.24, 0.42],
            index: '04',
            label: 'LEARNING LOOP'
        },
        signal: {
            primary: palette.blue,
            secondary: palette.violet,
            anchor: [0.52, 0.62],
            index: '05',
            label: 'PLAYER SIGNAL'
        }
    };

    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes = [];
    let mode = 'orbit';
    let previousMode = 'orbit';
    let transition = 1;
    let lastFrame = 0;
    let time = 0;
    let visible = true;
    let pointer = { x: -9999, y: -9999, active: false };
    let frameId = 0;

    function rgba(color, alpha) {
        return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        createNodes();
        if (reduceMotion.matches) drawFrame(0, true);
    }

    function createNodes() {
        const areaCount = Math.round((width * height) / 28000);
        const count = Math.max(22, Math.min(mobile.matches ? 34 : 62, areaCount));
        nodes = Array.from({ length: count }, (_, index) => ({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.12,
            vy: (Math.random() - 0.5) * 0.12,
            radius: index % 9 === 0 ? 2 : 1 + Math.random() * 0.7,
            phase: Math.random() * Math.PI * 2,
            kind: index % 4
        }));
    }

    function updateMode() {
        const focusY = height * 0.48;
        let nextMode = mode;
        let closest = Infinity;
        sectionModes.forEach(([id, candidate]) => {
            const section = document.getElementById(id);
            if (!section) return;
            const rect = section.getBoundingClientRect();
            const distance = Math.abs((rect.top + rect.bottom) / 2 - focusY);
            if (rect.bottom > 0 && rect.top < height && distance < closest) {
                closest = distance;
                nextMode = candidate;
            }
        });
        if (nextMode !== mode) {
            previousMode = mode;
            mode = nextMode;
            transition = 0;
            canvas.dataset.mode = mode;
            document.getElementById('main-portfolio')?.setAttribute('data-background-mode', mode);
        }
    }

    function drawGrid(alpha) {
        const spacing = mobile.matches ? 52 : 44;
        const scrollOffset = window.scrollY % spacing;
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(86, 138, 205, ${0.035 * alpha})`;
        ctx.beginPath();
        for (let x = 0; x <= width; x += spacing) {
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, height);
        }
        for (let y = -spacing; y <= height + spacing; y += spacing) {
            ctx.moveTo(0, y - scrollOffset + 0.5);
            ctx.lineTo(width, y - scrollOffset + 0.5);
        }
        ctx.stroke();

        ctx.fillStyle = `rgba(107, 163, 230, ${0.09 * alpha})`;
        for (let x = 0; x <= width; x += spacing * 4) {
            for (let y = -spacing * 4; y <= height + spacing * 4; y += spacing * 4) {
                ctx.fillRect(x, y - (window.scrollY % (spacing * 4)), 1.4, 1.4);
            }
        }
    }

    function drawAtmosphere(currentMode, alpha) {
        const theme = modeThemes[currentMode] || modeThemes.orbit;
        const anchorX = width * theme.anchor[0];
        const anchorY = height * theme.anchor[1];
        const radius = Math.max(width, height) * 0.68;

        const primaryGlow = ctx.createRadialGradient(anchorX, anchorY, 0, anchorX, anchorY, radius);
        primaryGlow.addColorStop(0, rgba(theme.primary, 0.15 * alpha));
        primaryGlow.addColorStop(0.32, rgba(theme.primary, 0.065 * alpha));
        primaryGlow.addColorStop(1, rgba(theme.primary, 0));
        ctx.fillStyle = primaryGlow;
        ctx.fillRect(0, 0, width, height);

        const secondaryX = width * (1 - theme.anchor[0] * 0.72);
        const secondaryY = height * (1 - theme.anchor[1] * 0.62);
        const secondaryGlow = ctx.createRadialGradient(secondaryX, secondaryY, 0, secondaryX, secondaryY, radius * 0.72);
        secondaryGlow.addColorStop(0, rgba(theme.secondary, 0.09 * alpha));
        secondaryGlow.addColorStop(1, rgba(theme.secondary, 0));
        ctx.fillStyle = secondaryGlow;
        ctx.fillRect(0, 0, width, height);
    }

    function drawTopography(currentMode, alpha) {
        const theme = modeThemes[currentMode] || modeThemes.orbit;
        const cx = width * theme.anchor[0];
        const cy = height * theme.anchor[1];
        const baseRadius = Math.min(width, height) * 0.18;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.sin(time * 0.08) * 0.08 - 0.12);
        ctx.lineWidth = 0.8;
        ctx.setLineDash([2, 10]);
        for (let ring = 0; ring < 6; ring += 1) {
            const wave = Math.sin(time * 0.22 + ring * 0.9) * 4;
            const radius = baseRadius + ring * 34 + wave;
            ctx.strokeStyle = rgba(ring % 2 ? theme.secondary : theme.primary, (0.028 + ring * 0.004) * alpha);
            ctx.beginPath();
            ctx.ellipse(0, 0, radius * 1.34, radius * 0.64, ring * 0.055, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
        ctx.setLineDash([]);
    }

    function drawTelemetry(currentMode, alpha) {
        const theme = modeThemes[currentMode] || modeThemes.orbit;
        ctx.save();
        ctx.lineWidth = 0.8;
        for (let lane = 0; lane < 3; lane += 1) {
            const laneY = height * (0.2 + lane * 0.29);
            const drift = Math.sin(time * 0.18 + lane * 1.7) * height * 0.045;
            ctx.strokeStyle = rgba(lane % 2 ? theme.secondary : theme.primary, 0.035 * alpha);
            ctx.beginPath();
            ctx.moveTo(-80, laneY + drift);
            ctx.bezierCurveTo(
                width * 0.28, laneY - 70 + drift,
                width * 0.68, laneY + 72 - drift,
                width + 80, laneY - drift
            );
            ctx.stroke();

            const tracerX = ((time * (24 + lane * 5) + lane * width * 0.31) % (width + 160)) - 80;
            const tracerY = laneY + Math.sin((tracerX / Math.max(width, 1)) * Math.PI * 2 + lane) * 28 + drift * 0.35;
            ctx.fillStyle = rgba(lane % 2 ? theme.secondary : theme.primary, 0.38 * alpha);
            ctx.beginPath();
            ctx.arc(tracerX, tracerY, 1.6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawSectionMarker(currentMode, alpha) {
        if (mobile.matches) return;
        const theme = modeThemes[currentMode] || modeThemes.orbit;
        const markerSize = Math.min(210, Math.max(132, width * 0.145));
        ctx.save();
        ctx.textAlign = 'right';
        ctx.fillStyle = rgba(theme.primary, 0.042 * alpha);
        ctx.font = `700 ${markerSize}px Outfit, sans-serif`;
        ctx.fillText(theme.index, width - 34, height * 0.88);
        ctx.fillStyle = rgba(theme.primary, 0.18 * alpha);
        ctx.font = '600 9px IBM Plex Mono, monospace';
        ctx.letterSpacing = '0.12em';
        ctx.fillText(`${theme.index} / ${theme.label}`, width - 42, height * 0.88 + 20);
        ctx.restore();
    }

    function updateNodes(delta) {
        const speed = Math.min(delta, 34);
        nodes.forEach(node => {
            node.x += node.vx * speed;
            node.y += node.vy * speed;
            if (node.x < -30) node.x = width + 30;
            if (node.x > width + 30) node.x = -30;
            if (node.y < -30) node.y = height + 30;
            if (node.y > height + 30) node.y = -30;
        });
    }

    function drawNetwork(alpha, color, connectionDistance) {
        const maxDistance = connectionDistance || (mobile.matches ? 105 : 145);
        ctx.lineWidth = 0.75;
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            for (let j = i + 1; j < nodes.length; j += 1) {
                const other = nodes[j];
                const distance = Math.hypot(node.x - other.x, node.y - other.y);
                if (distance < maxDistance) {
                    ctx.strokeStyle = rgba(color, (1 - distance / maxDistance) * 0.12 * alpha);
                    ctx.beginPath();
                    ctx.moveTo(node.x, node.y);
                    ctx.lineTo(other.x, other.y);
                    ctx.stroke();
                }
            }
        }

        nodes.forEach(node => {
            let glow = 0;
            if (pointer.active) {
                const distance = Math.hypot(pointer.x - node.x, pointer.y - node.y);
                glow = Math.max(0, 1 - distance / 170);
                if (glow > 0) {
                    ctx.strokeStyle = rgba(color, glow * 0.16 * alpha);
                    ctx.beginPath();
                    ctx.moveTo(pointer.x, pointer.y);
                    ctx.lineTo(node.x, node.y);
                    ctx.stroke();
                }
            }
            ctx.fillStyle = rgba(color, (0.16 + glow * 0.38) * alpha);
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius + glow * 1.2, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawOrbit(alpha) {
        const cx = width * 0.5;
        const cy = height * 0.46;
        const radius = Math.min(width, height) * 0.31;
        ctx.lineWidth = 1;
        [0.55, 0.78, 1].forEach((scale, index) => {
            ctx.strokeStyle = rgba(index === 1 ? palette.violet : palette.blue, (0.055 + index * 0.018) * alpha);
            ctx.beginPath();
            ctx.ellipse(cx, cy, radius * scale, radius * scale * (0.72 + index * 0.08), time * 0.025 * (index % 2 ? -1 : 1), 0, Math.PI * 2);
            ctx.stroke();
            const angle = time * (0.16 + index * 0.04) + index * 2.1;
            const px = cx + Math.cos(angle) * radius * scale;
            const py = cy + Math.sin(angle) * radius * scale * (0.72 + index * 0.08);
            ctx.fillStyle = rgba(index === 2 ? palette.orange : palette.blue, 0.5 * alpha);
            ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2); ctx.fill();
        });
        drawNetwork(alpha * 0.55, palette.blue, 120);
    }

    function drawFourAnchors(alpha) {
        const points = [
            [width * 0.18, height * 0.28, palette.blue],
            [width * 0.82, height * 0.3, palette.violet],
            [width * 0.24, height * 0.74, palette.green],
            [width * 0.76, height * 0.72, palette.orange]
        ];
        ctx.lineWidth = 1;
        points.forEach((point, i) => {
            const next = points[(i + 1) % points.length];
            ctx.strokeStyle = rgba(point[2], 0.12 * alpha);
            ctx.beginPath(); ctx.moveTo(point[0], point[1]); ctx.lineTo(next[0], next[1]); ctx.stroke();
            ctx.fillStyle = rgba(point[2], 0.42 * alpha);
            ctx.beginPath(); ctx.arc(point[0], point[1], 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = rgba(point[2], 0.12 * alpha);
            ctx.beginPath(); ctx.arc(point[0], point[1], 18 + Math.sin(time + i) * 3, 0, Math.PI * 2); ctx.stroke();
        });
        drawNetwork(alpha, palette.blue, 150);
    }

    function drawDebug(alpha) {
        drawNetwork(alpha * 0.62, palette.violet, 125);
        const count = mobile.matches ? 5 : 9;
        ctx.font = '9px IBM Plex Mono, monospace';
        for (let i = 0; i < count; i += 1) {
            const x = ((i * 193 + 83) % Math.max(width, 1));
            const y = ((i * 127 + time * 7) % (height + 100)) - 50;
            const pulse = 0.45 + Math.sin(time * 2 + i) * 0.25;
            ctx.strokeStyle = rgba(i % 3 ? palette.red : palette.orange, pulse * 0.28 * alpha);
            ctx.beginPath(); ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5); ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5); ctx.stroke();
            ctx.fillStyle = rgba(palette.red, 0.18 * alpha);
            ctx.fillText(i % 2 ? 'CONFLICT' : 'BUG', x + 10, y + 3);
        }
    }

    function drawChase(alpha) {
        drawNetwork(alpha * 0.34, palette.cyan, 112);
        const targetX = pointer.active ? pointer.x : width * (0.5 + Math.sin(time * 0.28) * 0.18);
        const targetY = pointer.active ? pointer.y : height * (0.5 + Math.cos(time * 0.23) * 0.16);
        const colors = [palette.red, [255, 135, 190], palette.cyan, palette.orange];
        colors.forEach((color, index) => {
            const angle = time * (0.22 + index * 0.025) + index * Math.PI / 2;
            const distance = 100 + index * 24;
            const x = targetX + Math.cos(angle) * distance;
            const y = targetY + Math.sin(angle * 1.15) * distance * 0.65;
            ctx.setLineDash([4, 7]);
            ctx.strokeStyle = rgba(color, 0.16 * alpha);
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(targetX, targetY); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = rgba(color, 0.48 * alpha);
            ctx.beginPath(); ctx.arc(x, y, 2.8, 0, Math.PI * 2); ctx.fill();
        });
        ctx.strokeStyle = rgba(palette.blue, 0.25 * alpha);
        ctx.beginPath(); ctx.arc(targetX, targetY, 7, 0, Math.PI * 2); ctx.stroke();
    }

    function drawLearning(alpha) {
        drawNetwork(alpha * 0.42, palette.green, 135);
        const cx = width * 0.5;
        const cy = height * 0.52;
        const radius = Math.min(width, height) * 0.25;
        const labels = ['STATE', 'ACTION', 'REWARD'];
        ctx.font = '9px IBM Plex Mono, monospace';
        for (let i = 0; i < 3; i += 1) {
            const angle = -Math.PI / 2 + i * Math.PI * 2 / 3;
            const nextAngle = -Math.PI / 2 + ((i + 1) % 3) * Math.PI * 2 / 3;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius * 0.65;
            const nx = cx + Math.cos(nextAngle) * radius;
            const ny = cy + Math.sin(nextAngle) * radius * 0.65;
            ctx.strokeStyle = rgba(palette.green, 0.13 * alpha);
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke();
            ctx.fillStyle = rgba(palette.green, 0.38 * alpha);
            ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = rgba(palette.green, 0.17 * alpha);
            ctx.fillText(labels[i], x + 9, y + 3);
        }
        const progress = (time * 0.12) % 3;
        const from = Math.floor(progress);
        const to = (from + 1) % 3;
        const mix = progress - from;
        const a1 = -Math.PI / 2 + from * Math.PI * 2 / 3;
        const a2 = -Math.PI / 2 + to * Math.PI * 2 / 3;
        const px = cx + (Math.cos(a1) * (1 - mix) + Math.cos(a2) * mix) * radius;
        const py = cy + (Math.sin(a1) * (1 - mix) + Math.sin(a2) * mix) * radius * 0.65;
        ctx.fillStyle = rgba(palette.orange, 0.65 * alpha);
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    function drawSignal(alpha) {
        drawNetwork(alpha * 0.22, palette.blue, 105);
        const baseY = height * 0.58;
        ctx.strokeStyle = rgba(palette.blue, 0.12 * alpha);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 8) {
            const distance = Math.abs(x - width * 0.5);
            const envelope = Math.max(0, 1 - distance / (width * 0.42));
            const y = baseY + Math.sin(x * 0.026 + time * 0.8) * 12 * envelope;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    function drawMode(currentMode, alpha) {
        if (alpha <= 0) return;
        if (currentMode === 'orbit') drawOrbit(alpha);
        if (currentMode === 'network') drawFourAnchors(alpha);
        if (currentMode === 'debug') drawDebug(alpha);
        if (currentMode === 'chase') drawChase(alpha);
        if (currentMode === 'learning') drawLearning(alpha);
        if (currentMode === 'signal') drawSignal(alpha);
    }

    function drawFrame(delta, forceStatic) {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(1, 4, 12, 0.82)';
        ctx.fillRect(0, 0, width, height);
        if (!forceStatic) {
            updateNodes(delta);
            time += delta / 1000;
            transition = Math.min(1, transition + delta / 700);
        }
        const previousAlpha = forceStatic ? 0 : 1 - transition;
        const currentAlpha = forceStatic ? 1 : transition;
        drawAtmosphere(previousMode, previousAlpha);
        drawAtmosphere(mode, currentAlpha);
        drawGrid(0.92);
        drawTelemetry(previousMode, previousAlpha);
        drawTelemetry(mode, currentAlpha);
        drawTopography(previousMode, previousAlpha);
        drawTopography(mode, currentAlpha);
        drawMode(previousMode, previousAlpha);
        drawMode(mode, currentAlpha);
        drawSectionMarker(previousMode, previousAlpha);
        drawSectionMarker(mode, currentAlpha);

        const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.2, width / 2, height / 2, Math.max(width, height) * 0.72);
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(0.62, 'rgba(0, 0, 0, 0.08)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.46)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);
    }

    function loop(now) {
        if (!visible || reduceMotion.matches) return;
        const delta = now - lastFrame;
        if (delta >= 33) {
            lastFrame = now;
            drawFrame(delta, false);
        }
        frameId = requestAnimationFrame(loop);
    }

    function restartAnimation() {
        cancelAnimationFrame(frameId);
        if (reduceMotion.matches) {
            drawFrame(0, true);
        } else if (visible) {
            lastFrame = performance.now();
            frameId = requestAnimationFrame(loop);
        }
    }

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('scroll', updateMode, { passive: true });
    window.addEventListener('pointermove', event => {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        pointer.active = true;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { pointer.active = false; });
    document.addEventListener('visibilitychange', () => {
        visible = !document.hidden;
        restartAnimation();
    });
    reduceMotion.addEventListener('change', restartAnimation);
    mobile.addEventListener('change', resize);

    resize();
    updateMode();
    canvas.dataset.mode = mode;
    document.getElementById('main-portfolio')?.setAttribute('data-background-mode', mode);
    restartAnimation();
}());
