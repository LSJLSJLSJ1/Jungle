/*
 * Pac-Man Ghost Gang AI Playground — Authentic Arcade AI Pursuit Engine
 *
 * Demonstrates the 4 classic deterministic target algorithms from 1980 Pac-Man:
 *  1. Blinky (Red)   — Direct Chaser (Target = Pac-Man tile)
 *  2. Pinky (Pink)   — Ambusher (Target = 4 tiles ahead of Pac-Man)
 *  3. Inky (Cyan)    — Flanker (Target = 2x vector from Blinky to 2 tiles ahead of Pac-Man)
 *  4. Clyde (Orange) — Feigned Coward (Target = Pac-Man if dist > 8 tiles, else Scatter Corner)
 *
 * Wall-safe targeting & route visualization:
 *  - Rule math can evaluate to a wall or an off-board coordinate.
 *  - Every raw target is projected onto a corridor reachable from the ghost.
 *  - Ghosts choose a legal shortest-path step and the visualization follows that route.
 */
(function () {
    'use strict';

    const TILE_SIZE = 20;
    const GRID_SIZE = 21;
    const PLAYER_SPEED = 5.4;
    const GHOST_SPEED = 3.6;

    // 21 x 21 Arcade Tile Grid
    const MAP = [
        '#####################',
        '#.........#.........#',
        '#.###.###.#.###.###.#',
        '#.#...#...#...#...#.#',
        '#.###.#.#####.#.###.#',
        '#..........#........#',
        '#.###.###.#.###.###.#',
        '#.#.....#.#.#.....#.#',
        '#.#.###.#...#.###.#.#',
        '#.....#...#...#.....#',
        '#####.#.###.###.#.###',
        '#.....#...#...#.....#',
        '#.#.###.#...#.###.#.#',
        '#.#.....#.#.#.....#.#',
        '#.###.###.#.###.###.#',
        '#..........#........#',
        '#.###.#.#####.#.###.#',
        '#.#...#...#...#...#.#',
        '#.###.###.#.###.###.#',
        '#.........#.........#',
        '#####################'
    ];

    const DIRECTIONS = {
        up:    { x: 0,  y: -1, angle: -Math.PI / 2 },
        left:  { x: -1, y: 0,  angle: Math.PI },
        down:  { x: 0,  y: 1,  angle: Math.PI / 2 },
        right: { x: 1,  y: 0,  angle: 0 }
    };
    const DIRECTION_NAMES = ['up', 'left', 'down', 'right'];

    // Authentic arcade Ghost Definitions. Clyde's fallback tile is used only
    // by his 8-tile Chase rule; there is no global Scatter mode in this demo.
    const GHOSTS = [
        { id: 'blinky', name: 'Blinky', color: '#ff445d', rule: '현재 위치 직진 추격', home: { x: 9,  y: 9 } },
        { id: 'pinky',  name: 'Pinky',  color: '#ff8ed8', rule: '전방 4칸 앞 길목 매복', home: { x: 11, y: 9 } },
        { id: 'inky',   name: 'Inky',   color: '#31d9e8', rule: 'Blinky 연장 벡터 포위', home: { x: 13, y: 11 } },
        { id: 'clyde',  name: 'Clyde',  color: '#ffae54', rule: '8칸 내 접근시 후퇴', fallback: { x: 1, y: 19 }, home: { x: 7, y: 11 } }
    ];

    let canvas;
    let ctx;
    let animationFrame;
    let lastTime = 0;
    let game;

    function createDots() {
        const dots = new Set();
        MAP.forEach((row, y) => {
            [...row].forEach((cell, x) => {
                if (cell === '.') dots.add(`${x},${y}`);
            });
        });
        return dots;
    }

    function createGhost(template, index) {
        return {
            ...template,
            index,
            x: template.home.x + 0.5,
            y: template.home.y + 0.5,
            cell: { ...template.home },
            centered: true,
            direction: index % 2 === 0 ? 'left' : 'right',
            rawTarget: { ...template.home },
            target: { ...template.home },
            path: [{ ...template.home }]
        };
    }

    function createGame() {
        return {
            time: 0,
            score: 0,
            dots: createDots(),
            player: {
                x: 1.5,
                y: 19.5,
                cell: { x: 1, y: 19 },
                centered: true,
                direction: 'right',
                pendingDirection: 'right',
                facing: 'right'
            },
            ghosts: GHOSTS.map(createGhost),
            aiVisible: true,
            message: 'AI 시각화 활성화: 점선은 각 유령의 실시간 타겟 좌표입니다.',
            messageUntil: 5,
            flashUntil: 0
        };
    }

    function isWalkable(x, y) {
        return y >= 0 && y < GRID_SIZE && x >= 0 && x < GRID_SIZE && MAP[y][x] !== '#';
    }

    // Finds the nearest corridor when a raw target lands inside a wall or off-board.
    function resolveNearestWalkableTile(tx, ty) {
        const cx = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(tx)));
        const cy = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(ty)));

        if (isWalkable(cx, cy)) return { x: cx, y: cy };

        const queue = [{ x: cx, y: cy }];
        const visited = new Set([`${cx},${cy}`]);
        for (let head = 0; head < queue.length; head += 1) {
            const cell = queue[head];
            for (const directionName of DIRECTION_NAMES) {
                const direction = DIRECTIONS[directionName];
                const next = { x: cell.x + direction.x, y: cell.y + direction.y };
                const key = `${next.x},${next.y}`;
                if (next.x < 0 || next.x >= GRID_SIZE || next.y < 0 || next.y >= GRID_SIZE || visited.has(key)) continue;
                if (isWalkable(next.x, next.y)) return next;
                visited.add(key);
                queue.push(next);
            }
        }
        return { x: 1, y: 1 };
    }

    function cellOf(actor) {
        return actor.cell ? { ...actor.cell } : { x: Math.floor(actor.x), y: Math.floor(actor.y) };
    }

    function snapToCenter(actor) {
        const cell = cellOf(actor);
        actor.x = cell.x + 0.5;
        actor.y = cell.y + 0.5;
    }

    function canTakeDirection(actor, directionName) {
        if (!directionName) return false;
        const dir = DIRECTIONS[directionName];
        if (!dir) return false;
        const cell = cellOf(actor);
        return isWalkable(cell.x + dir.x, cell.y + dir.y);
    }

    function opposite(directionName) {
        return { up: 'down', down: 'up', left: 'right', right: 'left' }[directionName];
    }

    function moveActor(actor, dt, onCenter) {
        if (!actor.cell) actor.cell = cellOf(actor);
        let remaining = actor.speed * dt;
        if (actor.centered !== false) {
            actor.centered = false;
            onCenter(actor);
        }

        while (remaining > 0.0001 && actor.direction) {
            if (!canTakeDirection(actor, actor.direction)) {
                actor.direction = null;
                snapToCenter(actor);
                actor.centered = true;
                onCenter(actor);
                if (actor.direction) actor.centered = false;
                break;
            }

            const dir = DIRECTIONS[actor.direction];
            const nextCell = {
                x: actor.cell.x + dir.x,
                y: actor.cell.y + dir.y
            };
            const targetX = nextCell.x + 0.5;
            const targetY = nextCell.y + 0.5;
            const distance = Math.hypot(targetX - actor.x, targetY - actor.y);
            const travel = Math.min(remaining, distance);

            actor.x += dir.x * travel;
            actor.y += dir.y * travel;
            remaining -= travel;

            if (travel >= distance - 0.0001) {
                actor.cell = nextCell;
                snapToCenter(actor);
                actor.centered = true;
                onCenter(actor);
                if (actor.direction) actor.centered = false;
            }
        }
    }

    function playerOnCenter(player) {
        if (player.pendingDirection && canTakeDirection(player, player.pendingDirection)) {
            player.direction = player.pendingDirection;
            player.facing = player.pendingDirection;
        } else if (canTakeDirection(player, player.direction)) {
            player.facing = player.direction;
        } else {
            player.direction = null;
        }
    }

    function requestPlayerDirection(directionName) {
        const player = game.player;
        player.pendingDirection = directionName;

        if (player.direction === null || player.direction === opposite(directionName) || player.centered !== false) {
            if (canTakeDirection(player, directionName)) {
                player.direction = directionName;
                player.facing = directionName;
            }
        }
    }

    function playerTarget() {
        return cellOf(game.player);
    }

    // =========================================================================
    // PAC-MAN GHOST TARGETING ALGORITHMS & WALL-SAFE ROUTING
    // =========================================================================
    function computeGhostTarget(ghost, player, playerFacing, blinkyCell) {
        const playerDir = DIRECTIONS[playerFacing || 'right'];
        // CHASE ONLY:
        // 1. Blinky (Red): Direct Chaser -> Target = Pac-Man's exact tile
        if (ghost.id === 'blinky') {
            return { ...player };
        }

        // 2. Pinky (Pink): Ambusher -> Target = 4 tiles ahead of Pac-Man
        if (ghost.id === 'pinky') {
            return targetAheadOfPlayer(player, playerDir, 4);
        }

        // 3. Inky (Cyan): Double the vector from Blinky to Pac-Man's 2-ahead tile.
        if (ghost.id === 'inky') {
            const ahead = targetAheadOfPlayer(player, playerDir, 2);
            return {
                x: ahead.x + (ahead.x - blinkyCell.x),
                y: ahead.y + (ahead.y - blinkyCell.y)
            };
        }

        // 4. Clyde (Orange): Feigned Coward -> Pac-Man at >= 8 tiles, fallback tile below 8
        const ghostCell = ghost.cell || { x: Math.floor(ghost.x), y: Math.floor(ghost.y) };
        const distToPlayer = Math.hypot(ghostCell.x - player.x, ghostCell.y - player.y);
        return distToPlayer >= 8 ? { ...player } : { ...ghost.fallback };
    }

    function targetForGhost(ghost) {
        return computeGhostTarget(
            ghost,
            playerTarget(),
            game.player.facing || 'right',
            cellOf(game.ghosts[0])
        );
    }

    // Pure look-ahead rule. The arcade cabinet's historical up-facing overflow
    // bug is intentionally omitted so the behavior matches the explanation.
    function targetAheadOfPlayer(player, direction, tiles) {
        return {
            x: player.x + direction.x * tiles,
            y: player.y + direction.y * tiles
        };
    }

    function tileKey(tile) {
        return `${tile.x},${tile.y}`;
    }

    function resolveReachableTarget(rawTarget, startCell) {
        const safeStart = isWalkable(startCell.x, startCell.y)
            ? { ...startCell }
            : resolveNearestWalkableTile(startCell.x, startCell.y);
        const queue = [safeStart];
        const visited = new Set([tileKey(safeStart)]);
        let best = safeStart;
        let bestDistance = Math.hypot(best.x - rawTarget.x, best.y - rawTarget.y);

        for (let head = 0; head < queue.length; head += 1) {
            const cell = queue[head];
            const distance = Math.hypot(cell.x - rawTarget.x, cell.y - rawTarget.y);
            if (distance < bestDistance - 0.0001) {
                best = cell;
                bestDistance = distance;
            }

            for (const directionName of DIRECTION_NAMES) {
                const direction = DIRECTIONS[directionName];
                const next = { x: cell.x + direction.x, y: cell.y + direction.y };
                const key = tileKey(next);
                if (!isWalkable(next.x, next.y) || visited.has(key)) continue;
                visited.add(key);
                queue.push(next);
            }
        }
        return { ...best };
    }

    function findShortestPath(startCell, targetCell, blockedCell) {
        if (!isWalkable(startCell.x, startCell.y) || !isWalkable(targetCell.x, targetCell.y)) return [];
        const startKey = tileKey(startCell);
        const targetKey = tileKey(targetCell);
        const blockedKey = blockedCell ? tileKey(blockedCell) : null;
        const queue = [{ ...startCell }];
        const parents = new Map([[startKey, null]]);

        for (let head = 0; head < queue.length; head += 1) {
            const cell = queue[head];
            const currentKey = tileKey(cell);
            if (currentKey === targetKey) break;

            for (const directionName of DIRECTION_NAMES) {
                const direction = DIRECTIONS[directionName];
                const next = { x: cell.x + direction.x, y: cell.y + direction.y };
                const nextKey = tileKey(next);
                if (nextKey === blockedKey || !isWalkable(next.x, next.y) || parents.has(nextKey)) continue;
                parents.set(nextKey, currentKey);
                queue.push(next);
            }
        }

        if (!parents.has(targetKey)) return [];
        const path = [];
        let currentKey = targetKey;
        while (currentKey) {
            const [x, y] = currentKey.split(',').map(Number);
            path.push({ x, y });
            currentKey = parents.get(currentKey);
        }
        return path.reverse();
    }

    function chooseGhostDirection(ghost) {
        ghost.rawTarget = targetForGhost(ghost);
        const cell = cellOf(ghost);
        ghost.target = resolveReachableTarget(ghost.rawTarget, cell);
        let options = DIRECTION_NAMES.filter((dirName) => canTakeDirection(ghost, dirName));
        if (options.length > 1) {
            options = options.filter((dirName) => dirName !== opposite(ghost.direction));
        }
        if (options.length === 0) {
            options = DIRECTION_NAMES.filter((dirName) => canTakeDirection(ghost, dirName));
        }
        if (!options.length) return null;

        const candidates = options.map((directionName) => {
            const direction = DIRECTIONS[directionName];
            const nextCell = { x: cell.x + direction.x, y: cell.y + direction.y };
            let route = findShortestPath(nextCell, ghost.target, cell);
            if (!route.length) route = findShortestPath(nextCell, ghost.target);
            return {
                directionName,
                route,
                distance: route.length ? route.length - 1 : Infinity
            };
        });

        candidates.sort((a, b) => {
            if (a.distance !== b.distance) return a.distance - b.distance;
            // Stable arcade tie-break order: Up, Left, Down, Right.
            return DIRECTION_NAMES.indexOf(a.directionName) - DIRECTION_NAMES.indexOf(b.directionName);
        });

        const choice = candidates[0];
        ghost.path = [{ ...cell }, ...choice.route];
        return choice.directionName;
    }

    function ghostOnCenter(ghost) {
        ghost.direction = chooseGhostDirection(ghost);
    }

    function updatePlayer(dt) {
        game.player.speed = PLAYER_SPEED;
        moveActor(game.player, dt, playerOnCenter);

        if (game.player.direction === null && game.player.pendingDirection) {
            if (canTakeDirection(game.player, game.player.pendingDirection)) {
                game.player.direction = game.player.pendingDirection;
                game.player.facing = game.player.pendingDirection;
                game.player.centered = false;
            }
        }

        collectDot();
    }

    function updateGhosts(dt) {
        game.ghosts.forEach((ghost) => {
            ghost.speed = GHOST_SPEED;
            moveActor(ghost, dt, ghostOnCenter);
        });
    }

    function collectDot() {
        const cell = cellOf(game.player);
        const key = `${cell.x},${cell.y}`;
        if (!game.dots.has(key)) return;

        game.dots.delete(key);
        game.score += 10;

        if (game.dots.size === 0) {
            game.dots = createDots();
            setMessage('미로 클리어! 점을 다시 채우고 추격전을 계속합니다.', 3);
        }
    }

    function checkCollisions() {
        game.ghosts.forEach((ghost) => {
            const distance = Math.hypot(ghost.x - game.player.x, ghost.y - game.player.y);
            if (distance > 0.62) return;

            game.player.x = 1.5;
            game.player.y = 19.5;
            game.player.cell = { x: 1, y: 19 };
            game.player.centered = true;
            game.player.direction = 'right';
            game.player.pendingDirection = 'right';
            game.player.facing = 'right';

            game.ghosts.forEach((item) => {
                item.x = item.home.x + 0.5;
                item.y = item.home.y + 0.5;
                item.cell = { ...item.home };
                item.centered = true;
                item.direction = null;
                item.rawTarget = { ...item.home };
                item.target = { ...item.home };
                item.path = [{ ...item.home }];
            });
            game.flashUntil = game.time + 0.35;
            setMessage(`포위 성공! ${ghost.name}에게 붙잡혔습니다. AI 타겟 패턴을 관찰해보세요.`, 2.5);
        });
    }

    function setMessage(message, duration) {
        game.message = message;
        game.messageUntil = game.time + duration;
    }

    function update(dt) {
        game.time += dt;
        updatePlayer(dt);
        updateGhosts(dt);
        checkCollisions();
        updateHud();
    }

    function screenPoint(x, y) {
        return { x: x * TILE_SIZE, y: y * TILE_SIZE };
    }

    function drawMaze() {
        ctx.save();
        ctx.shadowColor = '#3c5cff';
        ctx.shadowBlur = 8;
        MAP.forEach((row, y) => {
            [...row].forEach((cell, x) => {
                if (cell !== '#') return;
                const px = x * TILE_SIZE;
                const py = y * TILE_SIZE;
                ctx.fillStyle = '#101b49';
                ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
                ctx.strokeStyle = 'rgba(104, 132, 255, 0.55)';
                ctx.lineWidth = 1;
                ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            });
        });
        ctx.restore();
    }

    function drawDots() {
        game.dots.forEach((key) => {
            const [x, y] = key.split(',').map(Number);
            const point = screenPoint(x + 0.5, y + 0.5);
            ctx.beginPath();
            ctx.arc(point.x, point.y, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = '#d9e4ff';
            ctx.fill();
        });
    }

    function drawTargetVectors() {
        if (!game.aiVisible) return;
        game.ghosts.forEach((ghost) => {
            const start = screenPoint(ghost.x, ghost.y);
            const target = ghost.target || resolveReachableTarget(targetForGhost(ghost), cellOf(ghost));
            const end = screenPoint(target.x + 0.5, target.y + 0.5);
            const route = ghost.path?.length
                ? ghost.path
                : findShortestPath(cellOf(ghost), target);
            ctx.save();
            ctx.setLineDash([3, 4]);
            ctx.strokeStyle = ghost.color;
            ctx.globalAlpha = 0.76;
            ctx.lineWidth = 1.45;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            route.slice(1).forEach((cell) => {
                const point = screenPoint(cell.x + 0.5, cell.y + 0.5);
                ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(end.x, end.y, 5, 0, Math.PI * 2);
            ctx.strokeStyle = ghost.color;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(end.x - 5, end.y);
            ctx.lineTo(end.x + 5, end.y);
            ctx.moveTo(end.x, end.y - 5);
            ctx.lineTo(end.x, end.y + 5);
            ctx.stroke();
            ctx.restore();
        });
    }

    function drawPacman() {
        const player = game.player;
        const point = screenPoint(player.x, player.y);
        const direction = DIRECTIONS[player.facing || 'right'];
        const mouth = player.direction ? 0.18 + Math.abs(Math.sin(game.time * 12)) * 0.28 : 0.2;
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(direction.angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 8.5, mouth, Math.PI * 2 - mouth);
        ctx.closePath();
        ctx.fillStyle = '#ffe16b';
        ctx.shadowColor = '#ffcf33';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.restore();
    }

    function drawGhost(ghost) {
        const point = screenPoint(ghost.x, ghost.y);
        const radius = 8;
        ctx.save();
        ctx.fillStyle = ghost.color;
        ctx.shadowColor = ghost.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(point.x, point.y - 1.5, radius, Math.PI, 0);
        ctx.lineTo(point.x + radius, point.y + 7);
        ctx.lineTo(point.x + 4, point.y + 4);
        ctx.lineTo(point.x, point.y + 7);
        ctx.lineTo(point.x - 4, point.y + 4);
        ctx.lineTo(point.x - radius, point.y + 7);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        const direction = DIRECTIONS[ghost.direction || 'left'];
        const eyeOffsetX = direction.x * 1.8;
        const eyeOffsetY = direction.y * 1.8;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(point.x - 3.2, point.y - 3, 2.6, 3.2, 0, 0, Math.PI * 2);
        ctx.ellipse(point.x + 3.2, point.y - 3, 2.6, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#18204c';
        ctx.beginPath();
        ctx.arc(point.x - 3.2 + eyeOffsetX, point.y - 3 + eyeOffsetY, 1.3, 0, Math.PI * 2);
        ctx.arc(point.x + 3.2 + eyeOffsetX, point.y - 3 + eyeOffsetY, 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawOverlay() {
        if (game.time < game.flashUntil) {
            ctx.fillStyle = 'rgba(255, 68, 93, 0.25)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        if (game.messageUntil > game.time) {
            ctx.save();
            ctx.fillStyle = 'rgba(5, 8, 22, 0.88)';
            ctx.fillRect(12, canvas.height - 34, canvas.width - 24, 24);
            ctx.fillStyle = '#e9efff';
            ctx.font = '600 10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(game.message, canvas.width / 2, canvas.height - 18);
            ctx.restore();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#070b21';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawMaze();
        drawDots();
        drawTargetVectors();
        game.ghosts.forEach(drawGhost);
        drawPacman();
        drawOverlay();
    }

    function modeLabel(mode) {
        return 'CHASE (협공 추격)';
    }

    function updateHud() {
        const mode = 'chase';
        const modeLabelElement = document.getElementById('pacman-mode-label');
        const dotsLabel = document.getElementById('pacman-dots-label');
        if (modeLabelElement) modeLabelElement.textContent = `모드: ${modeLabel(mode)}`;
        if (dotsLabel) dotsLabel.textContent = `남은 점: ${game.dots.size}`;

        const list = document.getElementById('ghost-target-list');
        if (list) {
            list.innerHTML = game.ghosts.map((ghost) => {
                const rawTarget = ghost.rawTarget || targetForGhost(ghost);
                const target = ghost.target || resolveReachableTarget(rawTarget, cellOf(ghost));
                const projected = rawTarget.x !== target.x || rawTarget.y !== target.y;
                const coordinate = projected
                    ? `${rawTarget.x}, ${rawTarget.y} → ${target.x}, ${target.y}`
                    : `${target.x}, ${target.y}`;
                return `<div class="ghost-target-row"><span class="target-color" style="background:${ghost.color}"></span><strong>${ghost.name}</strong><span title="원시 타겟 → 이동 가능한 타겟">${coordinate}</span></div>`;
            }).join('');
        }
    }

    function sameTile(actual, expected) {
        return actual.x === expected.x && actual.y === expected.y;
    }

    function routeIsLegal(route) {
        if (!route?.length) return false;
        return route.every((cell, index) => {
            if (!isWalkable(cell.x, cell.y)) return false;
            if (index === 0) return true;
            const previous = route[index - 1];
            return Math.abs(previous.x - cell.x) + Math.abs(previous.y - cell.y) === 1;
        });
    }

    function runPacmanDiagnostics() {
        const checks = [];
        const record = (name, passed, details) => checks.push({ name, passed, details });
        const samplePlayer = { x: 10, y: 10 };
        const sampleBlinky = { x: 2, y: 10 };

        record(
            'Blinky targets Pac-Man tile',
            sameTile(computeGhostTarget({ ...GHOSTS[0], cell: sampleBlinky }, samplePlayer, 'right', sampleBlinky), { x: 10, y: 10 })
        );
        record(
            'Pinky targets four tiles ahead',
            sameTile(computeGhostTarget({ ...GHOSTS[1], cell: { x: 4, y: 4 } }, samplePlayer, 'right', sampleBlinky), { x: 14, y: 10 })
        );
        record(
            'Pinky up target has no legacy left offset',
            sameTile(computeGhostTarget({ ...GHOSTS[1], cell: { x: 4, y: 4 } }, samplePlayer, 'up', sampleBlinky), { x: 10, y: 6 })
        );
        record(
            'Inky doubles Blinky-to-two-ahead vector',
            sameTile(computeGhostTarget({ ...GHOSTS[2], cell: { x: 4, y: 4 } }, samplePlayer, 'right', sampleBlinky), { x: 22, y: 10 })
        );
        record(
            'Clyde chases from eight or more tiles away',
            sameTile(computeGhostTarget({ ...GHOSTS[3], cell: { x: 2, y: 10 } }, samplePlayer, 'right', sampleBlinky), samplePlayer)
        );
        record(
            'Clyde retreats inside eight tiles',
            sameTile(computeGhostTarget({ ...GHOSTS[3], cell: { x: 4, y: 10 } }, samplePlayer, 'right', sampleBlinky), GHOSTS[3].fallback)
        );

        const walkableCells = [];
        MAP.forEach((row, y) => {
            [...row].forEach((cell, x) => {
                if (cell !== '#') walkableCells.push({ x, y });
            });
        });
        const playerSpawn = { x: 1, y: 19 };
        const allCorridorsConnected = walkableCells.every((cell) => findShortestPath(playerSpawn, cell).length > 0);
        record('All corridor tiles are connected', allCorridorsConnected, `${walkableCells.length} corridor tiles`);

        const rawTargets = [
            { x: -8, y: -8 },
            { x: 10, y: 10 },
            { x: 22, y: 10 },
            { x: 1, y: 19 }
        ];
        const wallSafeRoutes = GHOSTS.every((ghost, index) => {
            const target = resolveReachableTarget(rawTargets[index], ghost.home);
            const route = findShortestPath(ghost.home, target);
            return isWalkable(target.x, target.y) && routeIsLegal(route);
        });
        record('Projected targets and routes never enter walls', wallSafeRoutes);

        return {
            passed: checks.every((check) => check.passed),
            checks
        };
    }

    function getPacmanDebugState() {
        return {
            diagnostics: runPacmanDiagnostics(),
            player: game ? { cell: cellOf(game.player), facing: game.player.facing } : null,
            ghosts: game ? game.ghosts.map((ghost) => ({
                id: ghost.id,
                cell: cellOf(ghost),
                direction: ghost.direction,
                rawTarget: ghost.rawTarget ? { ...ghost.rawTarget } : null,
                target: ghost.target ? { ...ghost.target } : null,
                routeLength: ghost.path?.length || 0,
                routeIsLegal: routeIsLegal(ghost.path)
            })) : []
        };
    }

    function loop(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
        lastTime = timestamp;
        update(dt);
        draw();
        animationFrame = window.requestAnimationFrame(loop);
    }

    function handleKeydown(event) {
        const keyMap = {
            ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right',
            w: 'up', a: 'left', s: 'down', d: 'right',
            W: 'up', A: 'left', S: 'down', D: 'right'
        };
        const direction = keyMap[event.key] || keyMap[event.code];
        if (!direction || !game) return;
        requestPlayerDirection(direction);
        event.preventDefault();
    }

    function resetPacmanGame() {
        if (!game) return;
        game = createGame();
        lastTime = performance.now();
        syncAIVisualizationUI();
        updateHud();
    }

    function syncAIVisualizationUI() {
        const button = document.getElementById('btn-ai-toggle');
        if (!button || !game) return;
        button.textContent = game.aiVisible ? '🧠 AI 시각화 끄기' : '🧠 AI 시각화 켜기';
        button.setAttribute('aria-pressed', String(game.aiVisible));
    }

    function toggleAIVisualization() {
        if (!game) return;
        game.aiVisible = !game.aiVisible;
        syncAIVisualizationUI();
        setMessage(game.aiVisible ? '점선 = 각 유령의 실시간 길목 타겟 좌표' : 'AI 시각화를 끄고 유령의 협공 패턴을 관찰합니다.', 2.5);
    }

    function initPacmanGame(canvasId) {
        canvas = document.getElementById(canvasId);
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.tabIndex = 0;
        canvas.addEventListener('pointerdown', () => canvas.focus());
        game = createGame();
        window.addEventListener('keydown', handleKeydown, { passive: false });
        syncAIVisualizationUI();
        updateHud();
        const diagnostics = runPacmanDiagnostics();
        if (!diagnostics.passed) console.warn('[Pac-Man AI] Diagnostics failed', diagnostics.checks);
        if (animationFrame) window.cancelAnimationFrame(animationFrame);
        lastTime = 0;
        animationFrame = window.requestAnimationFrame(loop);
    }

    window.initPacmanGame = initPacmanGame;
    window.resetPacmanGame = resetPacmanGame;
    window.toggleAIVisualization = toggleAIVisualization;
    window.__pacmanDebug = Object.freeze({
        getState: getPacmanDebugState,
        runDiagnostics: runPacmanDiagnostics
    });
})();
