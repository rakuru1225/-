const SUPABASE_URL = 'https://wyrhupngsedlnjaylpcq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_G9hME9kEn9KzRMVxdtL-5Q_aeYOL7on';

let supabaseClient = null;
try {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.error('Supabase初期化エラー:', e);
}

function getMyPlayerCode() {
    let code = localStorage.getItem('anki_quest_my_code');
    if (!code) {
        code = 'player_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
        localStorage.setItem('anki_quest_my_code', code);
    }
    return code;
}

let player = {
    playerCode: getMyPlayerCode(),
    name: localStorage.getItem('anki_quest_player_name') || "冒険者",
    level: parseInt(localStorage.getItem('anki_quest_player_level') || '1'),
    exp: parseInt(localStorage.getItem('anki_quest_player_exp') || '0'),
    nextExp: parseInt(localStorage.getItem('anki_quest_player_nextexp') || '50'),
    defeatCount: parseInt(localStorage.getItem('anki_quest_player_defeats') || '0')
};

function savePlayerData() {
    localStorage.setItem('anki_quest_player_name', player.name);
    localStorage.setItem('anki_quest_player_level', player.level);
    localStorage.setItem('anki_quest_player_exp', player.exp);
    localStorage.setItem('anki_quest_player_nextexp', player.nextExp);
    localStorage.setItem('anki_quest_player_defeats', player.defeatCount);
    updatePlayerStatusUI();
}

// --- SVG・背景生成関数 ---
function sv(m, c, s) {
    let o = '';
    m.forEach(function(r, y) {
        for (let x = 0; x < r.length; x++) {
            if (r[x] !== '.') o += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + c[r[x]] + '"/>';
        }
    });
    return '<svg viewBox="0 0 ' + m[0].length + ' ' + m.length + '" width="' + m[0].length * s + '" height="' + m.length * s + '" shape-rendering="crispEdges" style="display:block">' + o + '</svg>';
}

const FM = ['...o...', '..oor..', '..ooyr.', '.oooyor', '.oyyyoo', '.oyyyo.', '..ooo..', '.bbbbb.'];
const FC = { o: '#e08a2e', r: '#d04a4a', y: '#ffcc00', b: '#6b533f' };

// ====== 横スクロール画面のデザイン（タイトル画面のダンジョンに合わせたドット絵） ======
let stageScale = 3;   // 1ドットが何pxか（画面の大きさに合わせて自動で決まります）

function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
function hashStr(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
}
function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(f < 1 ? v * f : v + (255 - v) * (f - 1)));
    return '#' + c.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

// 輪郭線（暗い縁取り）を自動で付ける
function addOutline(g) {
    const H = g.length, W = g[0].length, out = g.map(r => r.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (g[y][x] !== '.') continue;
        const near = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dy, dx]) => g[y + dy] && g[y + dy][x + dx] && g[y + dy][x + dx] !== '.');
        if (near) out[y][x] = 'o';
    }
    return out;
}

// 主人公：フード付きのマントに、ランタンと剣。壁のランプの光が左から当たっている
const HERO_C = { o: '#07090a', k: '#2c4446', K: '#1c2e30', q: '#8a7a44', b: '#2e405a', B: '#1f2d42', g: '#9a7436', s: '#d6b088', Q: '#f0d49a', S: '#9c7a58', e: '#10161a', l: '#3a2a1c', L: '#22170e', w: '#aebcc0', W: '#eef4f4', t: '#58402a', f: '#ffd866', F: '#e08a2e' };
function heroMap(frame) {
    const g = Array.from({ length: 20 }, () => Array(16).fill('.'));
    const R = (x, y, w, h, ch) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) g[y + 1 + j][x + 1 + i] = ch; };
    R(4, 0, 6, 1, 'k'); R(3, 1, 8, 2, 'k'); R(2, 3, 10, 3, 'k');                                   // フード
    R(4, 2, 6, 1, 'K'); R(4, 3, 6, 3, 's'); R(5, 4, 1, 1, 'e'); R(8, 4, 1, 1, 'e'); R(4, 5, 6, 1, 'S'); // 顔
    R(2, 6, 10, 8, 'k'); R(10, 7, 2, 6, 'K'); R(5, 6, 4, 1, 'S'); R(5, 7, 4, 6, 'b'); R(5, 12, 4, 1, 'B'); // マントと服
    R(2, 11, 10, 1, 'g'); R(6, 11, 2, 1, 'F'); R(2, 13, 10, 1, 'K');                                 // ベルトと裾
    R(1, 8, 1, 3, 'k'); R(12, 8, 1, 3, 'k'); R(1, 11, 1, 1, 's'); R(12, 11, 1, 1, 's');              // 腕と手
    R(13, 2, 1, 9, 'w'); R(13, 1, 1, 1, 'W'); R(13, 11, 1, 1, 'g'); R(13, 12, 1, 2, 't');           // 剣
    R(1, 12, 1, 1, 't'); R(0, 13, 3, 3, 't'); R(1, 14, 1, 1, 'f'); R(0, 14, 1, 1, 'F'); R(2, 14, 1, 1, 'F'); // ランタン
    if (frame) { R(5, 14, 2, 3, 'l'); R(7, 14, 2, 3, 'l'); R(5, 17, 2, 1, 'L'); R(7, 17, 2, 1, 'L'); }
    else { R(4, 14, 2, 3, 'l'); R(8, 14, 2, 3, 'l'); R(4, 17, 2, 1, 'L'); R(8, 17, 2, 1, 'L'); }
    for (let y = 0; y < g.length; y++) for (let x = 1; x < g[0].length; x++) {   // 光が当たる左と上のふちを明るくする
        const lit = { k: 'q', s: 'Q' }[g[y][x]];
        if (lit && (g[y][x - 1] === '.' || (g[y - 1] && g[y - 1][x] === '.' && x < 8))) g[y][x] = lit;
    }
    return addOutline(g).map(r => r.join(''));
}

// モンスター：問題ごとに、いつも同じ姿（スライム・ゴースト・コウモリのどれか）
function monsterMap(seed, boss) {
    const r = rng(seed), W = 13, H = 12, C = 6;
    const g = Array.from({ length: H }, () => Array(W).fill('.'));
    const kind = boss ? 0 : Math.floor(r() * 3);
    if (kind === 0) {            // スライム
        const top = 3 + Math.floor(r() * 2), bot = 8 + Math.floor(r() * 2), span = bot - top;
        for (let y = top; y <= bot; y++) {
            const dome = Math.sin(Math.PI * (0.2 + 0.6 * (y - top) / span));
            let w = Math.round(1 + 3.6 * dome + (r() - 0.5) * 1.4);
            w = Math.max(y <= top + 2 ? 3 : 1, Math.min(5, w));
            for (let d = -w; d <= w; d++) g[y][C + d] = 'm';
        }
        const ey = top + 1;
        if (r() < 0.25) { g[ey][C] = 'w'; g[ey + 1][C] = 'e'; }
        else { const dx = r() < 0.5 ? 1 : 2; [C - dx, C + dx].forEach(x => { g[ey][x] = 'w'; g[ey + 1][x] = 'e'; }); }
        if (r() < 0.7) { const my = bot - 1; for (let x = C - 1; x <= C + 1; x++) g[my][x] = (x === C) ? 'w' : 'e'; }
        if (boss || r() < 0.55) { [C - 2, C + 2].forEach(x => { g[top - 1][x] = 'm'; g[top - 2][x] = 'h'; }); }
        [C - 2, C + 2].forEach(x => { if (g[bot][x] === 'm') g[bot + 1][x] = 'd'; });
    } else if (kind === 1) {     // ゴースト
        for (let y = 1; y <= 9; y++) { const w = y === 1 ? 2 : (y === 2 ? 3 : 4); for (let d = -w; d <= w; d++) g[y][C + d] = 'm'; }
        for (let d = -4; d <= 4; d += 2) g[10][C + d] = 'm';
        [[-2, -1], [1, 2]].forEach(([a, b]) => { for (let x = C + a; x <= C + b; x++) { g[3][x] = 'e'; g[4][x] = 'e'; } });
        g[4][C - 1] = 'w'; g[4][C + 2] = 'w';
        for (let x = C - 1; x <= C + 1; x++) g[6][x] = 'e';
        [C - 5, C + 5].forEach(x => { g[6][x] = 'm'; g[7][x] = 'm'; });
    } else {                     // コウモリ
        for (let y = 4; y <= 7; y++) for (let x = C - 1; x <= C + 1; x++) g[y][x] = 'm';
        g[3][C - 1] = 'm'; g[3][C + 1] = 'm'; g[2][C - 1] = 'h'; g[2][C + 1] = 'h';
        [[3, -3, -2], [4, -5, -2], [5, -5, -2], [6, -5, -3], [7, -4, -3], [8, -3, -3]].forEach(([y, a, b]) => { for (let d = a; d <= b; d++) { g[y][C + d] = 'm'; g[y][C - d] = 'm'; } });
        g[5][C - 1] = 'w'; g[5][C + 1] = 'w'; g[7][C - 1] = 'w'; g[7][C + 1] = 'w';
    }
    const out = addOutline(g);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (g[y][x] !== 'm') continue;
        const below = (g[y + 1] || [])[x], above = (g[y - 1] || [])[x], left = g[y][x - 1];
        if (below === undefined || below === '.') out[y][x] = 'd';
        else if ((x + y) % 2 === 0 && (g[y + 2] === undefined || g[y + 2][x] === '.')) out[y][x] = 'd';   // 下のほうは市松模様の影
        else if (left === '.' || left === undefined || ((above === undefined || above === '.') && x < C)) out[y][x] = 'r';   // 光が当たるふち
    }
    return out.map(row => row.join(''));
}
function mixHex(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const c = [16, 8, 0].map(sh => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}
// 状態の色は、ダンジョンになじむように少し落ち着かせる
const MUTED = { '#3a82f6': '#4f7f93', '#ef4444': '#b0443a', '#f97316': '#b9772a', '#22c55e': '#5f9150' };
function monsterSvg(seed, hex, cell, boss) {
    const base = MUTED[hex] || hex;
    const colors = { m: base, d: shade(base, 0.55), r: mixHex(base, '#ffc060', 0.45), h: shade(base, 1.35), o: '#07090a', w: '#ffe9a0', e: '#10161a' };
    return sv(monsterMap(seed, boss), colors, cell);
}

// 背景：石ブロックの壁、ランタン、扉、石畳（タイトル画面の絵と同じ色合い）
function uri(s) {
    return 'url("data:image/svg+xml,' + encodeURIComponent(s) + '")';
}
function wallTile() {
    const r = rng(77), P = ['#222c26', '#26312b', '#1d2822', '#2a352e'];
    let o = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="64" shape-rendering="crispEdges"><rect width="160" height="64" fill="#0c1210"/>';
    const rect = (x, y, w, h, c, a) => { o += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + c + '"' + (a ? ' fill-opacity="' + a + '"' : '') + '/>'; };
    const cells = [];
    for (let y = 0; y < 4; y++) { cells[y] = []; for (let xi = 0; xi < 5; xi++) {
        const sp = []; for (let k = 0; k < 5; k++) sp.push([2 + Math.floor(r() * 27), 3 + Math.floor(r() * 10), r() < 0.5 ? 0.8 : 1.2]);
        cells[y][xi] = { c: P[Math.floor(r() * 4)], sp, moss: r() < 0.35 ? [2 + Math.floor(r() * 24), 3 + Math.floor(r() * 3)] : null };
    } }
    for (let y = 0; y < 4; y++) for (let x = -1; x < 6; x++) {
        const ox = x * 32 + (y % 2 ? 16 : 0), oy = y * 16, cell = cells[y][((x % 5) + 5) % 5], c = cell.c;
        rect(ox + 1, oy + 1, 30, 14, c);
        rect(ox + 1, oy + 1, 30, 1, shade(c, 1.3)); rect(ox + 1, oy + 1, 1, 14, shade(c, 1.15)); rect(ox + 1, oy + 14, 30, 1, shade(c, 0.7));
        cell.sp.forEach(([sx, sy, f]) => rect(ox + sx, oy + sy, 1, 1, shade(c, f)));
        if (cell.moss) { rect(ox + cell.moss[0], oy + 13, cell.moss[1], 1, '#2f4a2a'); rect(ox + cell.moss[0] + 1, oy + 12, 2, 1, '#3a5a30'); }
    }
    // 扉（開いた木の扉と暗い奥）
    const x0 = 56, w = 48;
    rect(x0 - 4, 8, w + 8, 52, '#3a2a1a'); rect(x0 - 4, 8, w + 8, 1, '#5a4228');
    rect(x0, 14, w, 46, '#04060a'); rect(x0, 56, w, 4, '#0c1115');
    rect(x0 - 1, 14, 1, 46, '#5a4228'); rect(x0 + w, 14, 1, 46, '#2a1e12');
    rect(x0 - 9, 16, 6, 44, '#2e2216'); rect(x0 - 7, 16, 1, 44, '#3d2d1c'); rect(x0 + w + 3, 16, 6, 44, '#2e2216'); rect(x0 + w + 5, 16, 1, 44, '#3d2d1c');
    // ランタン（ふち取りは暗い金具、ガラスは琥珀色）と、ぼんやりした光
    [24, 136].forEach(lx => [0, -160, 160].forEach(d => {
        const x = lx + d;
        [[72, 52, 0.03], [54, 40, 0.04], [38, 30, 0.06], [22, 20, 0.09]].forEach(([hw, hh, a]) => rect(x - hw / 2, 26 - hh / 2, hw, hh, '#e0a030', a));
        rect(x - 1, 0, 2, 9, '#3a403b'); rect(x - 4, 9, 8, 3, '#2a2e2b'); rect(x - 4, 9, 8, 1, '#454a45');
        rect(x - 3, 12, 6, 12, '#c8902a'); rect(x - 3, 12, 1, 12, '#e0a838'); rect(x - 1, 14, 2, 8, '#ffd866'); rect(x - 4, 24, 8, 2, '#2a2e2b');
    }));
    rect(0, 60, 160, 4, '#0a0f0c'); rect(0, 60, 160, 1, '#2a352e');
    return o + '</svg>';
}
function floorTile() {
    const r = rng(31), P = ['#2a3730', '#2d3a31', '#26332c', '#2e3935'];
    let o = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="32" shape-rendering="crispEdges"><rect width="160" height="32" fill="#0f1613"/>';
    const rect = (x, y, w, h, c, a) => { o += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + c + '"' + (a ? ' fill-opacity="' + a + '"' : '') + '/>'; };
    [[0, 9, 20], [9, 11, 32], [20, 12, 40]].forEach(([y, h, w], ri) => {
        const n = 160 / w, cols = []; for (let i = 0; i < n; i++) cols.push([P[Math.floor(r() * 4)], 1 + Math.floor(r() * (w - 4)), r() < 0.5 ? 0.8 : 1.2]);
        for (let x = -1; x <= n; x++) {
            const ox = x * w + (ri % 2 ? w / 2 : 0), [c, sx, f] = cols[((x % n) + n) % n];
            rect(ox + 1, y + 1, w - 2, h - 2, c); rect(ox + 1, y + 1, w - 2, 1, shade(c, 1.3)); rect(ox + 1, y + h - 2, w - 2, 1, shade(c, 0.7)); rect(ox + 1 + sx, y + 2 + (h > 10 ? 2 : 0), 2, 1, shade(c, f));
        }
    });
    [24, 136].forEach(lx => [0, -160, 160].forEach(d => { rect(lx + d - 26, 0, 52, 14, '#e0a030', 0.05); rect(lx + d - 16, 0, 32, 10, '#e0a030', 0.07); }));
    rect(56, 0, 48, 6, '#000000', 0.3); rect(0, 0, 160, 1, '#080c0a');
    return o + '</svg>';
}
let tileUris = null;
function getTileUris() {
    if (!tileUris) tileUris = { wall: uri(wallTile()), floor: uri(floorTile()) };
    return tileUris;
}

// 画面の大きさに合わせて、ステージ・主人公・敵の大きさを決める（1ドット＝整数px）
let stageHeroX = 40, stageEnemyX = 200;
function layoutStage() {
    const stage = document.getElementById('sc-stage'), panel = document.getElementById('battle-panel');
    const vw = window.innerWidth, vh = window.innerHeight;
    const panelH = Math.min(340, Math.round(vh * 0.42));
    panel.style.height = panelH + 'px';
    const byH = Math.floor((vh - panelH - 56) / 96);   // 上の情報バー（56px以上）と下のパネルを除いた高さ
    const byW = Math.floor(vw / 92);
    stageScale = Math.max(2, Math.min(7, byH, byW));
    const s = stageScale, wall = document.getElementById('wall-layer'), floor = document.getElementById('floor-layer');
    stage.style.setProperty('--s', s);
    stage.style.height = (96 * s) + 'px';
    wall.style.top = '0'; wall.style.height = (64 * s) + 'px'; wall.style.backgroundSize = (160 * s) + 'px ' + (64 * s) + 'px';
    floor.style.top = (64 * s) + 'px'; floor.style.height = (32 * s) + 'px'; floor.style.backgroundSize = (160 * s) + 'px ' + (32 * s) + 'px';
    // 広い画面では、主人公と敵を中央に寄せる
    const Wl = (stage.clientWidth || vw) / s;
    stageHeroX = Math.round((Wl > 200 ? Wl / 2 - 70 : Wl * 0.05) * s);
    stageEnemyX = Math.round((Wl > 200 ? Wl / 2 + 25 : Wl * 0.58) * s);
    const p = document.getElementById('player-sprite'), e = document.getElementById('enemy-sprite');
    p.style.left = stageHeroX + 'px'; p.style.bottom = (6 * s) + 'px'; e.style.bottom = (6 * s) + 'px';
}
// 階の名前のカード（出発時と、階段を降りたとき）
let floorTitleBusy = null;
function showFloorTitle(n, sub, holdMs = 700) {
    const el = document.getElementById('floor-title');
    if (!el) return;
    clearTimeout(floorTitleBusy);
    document.getElementById('ft-floor').textContent = 'B' + n + 'F';
    document.getElementById('ft-sub').textContent = sub;
    el.className = 'on';
    void el.offsetWidth;
    el.classList.add('show');
    floorTitleBusy = setTimeout(() => {
        el.classList.add('out');
        floorTitleBusy = setTimeout(() => { el.className = ''; }, 500);
    }, holdMs);
}
function setPlayerSprite(frame) {
    document.getElementById('player-sprite').innerHTML = sv(heroMap(frame), HERO_C, 2 * stageScale);
}
function enemySvg(text, hex) {
    return monsterSvg(hashStr(text), hex, 3 * stageScale, false);
}
window.addEventListener('resize', () => {
    const bs = document.getElementById('battle-screen');
    if (!bs || bs.classList.contains('hidden')) return;
    layoutStage();
    setPlayerSprite(0);
    const q = battleQueue[battleIndex], el = document.getElementById('enemy-sprite');
    if (q && el && el.innerHTML) el.innerHTML = enemySvg(q.q, getQuizStatus(q).hex);
});

function updatePlayerStatusUI() {
    const statusBox = document.getElementById('player-status');
    if (statusBox) {
        statusBox.innerHTML = `
            LV.${player.level} 冒険者・${player.name}<br>
            次のレベルまで XP ${player.exp}/${player.nextExp}
        `;
    }

    const container = document.getElementById('exp-bar-container');
    if (container) {
        container.innerHTML = '';
        const totalBlocks = 10;
        const ratio = Math.min(1, player.exp / player.nextExp);
        const filledCount = Math.floor(ratio * totalBlocks);
        for (let i = 0; i < totalBlocks; i++) {
            const div = document.createElement('div');
            div.className = 'exp-block' + (i < filledCount ? ' filled' : '');
            container.appendChild(div);
        }
    }

    const battleExpBarContainer = document.getElementById('battle-exp-bar-container');
    if (battleExpBarContainer) {
        battleExpBarContainer.innerHTML = '';
        const totalBlocks = 10;
        const ratio = Math.min(1, player.exp / player.nextExp);
        const filledCount = Math.floor(ratio * totalBlocks);
        for (let i = 0; i < totalBlocks; i++) {
            const div = document.createElement('div');
            div.className = 'exp-block' + (i < filledCount ? ' filled' : '');
            battleExpBarContainer.appendChild(div);
        }
    }
}

function updateProfileDisplay() {
    const nameInput = document.getElementById('input-player-name');
    if (nameInput) nameInput.value = player.name;
    document.getElementById('prof-level').textContent = player.level;
    document.getElementById('prof-defeats').textContent = player.defeatCount;
}

function savePlayerName() {
    const nameInput = document.getElementById('input-player-name');
    if (!nameInput) return;
    const val = nameInput.value.trim();
    if (val) {
        player.name = val;
        savePlayerData();
        alert('冒険者の名前を保存しました！');
    }
}

function exportData() {
    const data = { player: player, quizzes: quizList };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anki_quest_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (imported.player && imported.quizzes) {
                player = imported.player;
                quizList = imported.quizzes;
                savePlayerData();
                saveLocalQuizzes();
                alert('✨ データを正常に復元しました！');
                switchScreen('home-screen');
            } else {
                alert('無効なデータファイルです。');
            }
        } catch (err) {
            alert('ファイルの読み込みに失敗しました。');
        }
    };
    reader.readAsText(file);
}

function switchScreen(screenId) {
    const container = document.getElementById('game-container');
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.add('hidden'));
    
    const target = document.getElementById(screenId);
    if (target) target.classList.remove('hidden');

    container.classList.remove('screen-home', 'screen-wide', 'screen-full', 'battle-mode', 'fade-out');
    document.body.classList.toggle('in-dungeon', screenId === 'battle-screen');
    if (screenId !== 'battle-screen') stopBGM();

    if (screenId === 'home-screen') {
        container.classList.add('screen-home');
        updatePlayerStatusUI();
    } else if (screenId === 'monster-screen') {
        container.classList.add('screen-full');
        renderQuestBoard();
    } else if (screenId === 'battle-screen') {
        container.classList.add('battle-mode');
    } else {
        container.classList.add('screen-wide');
    }

    if (screenId === 'profile-screen') {
        updateProfileDisplay();
    }
}

let defaultQuizzes = [
    { q: "OSI参照モデルの第4層は？", choices: ["トランスポート層", "物理層", "ネットワーク層", "アプリケーション層"], answer: 0, correct_count: 0, wrong_count: 0, explanation: "トランスポート層はエンドシステム間のデータ伝送を信頼性高く行います。" },
    { q: "Webサイトの暗号化通信で使われるプロトコルは？", choices: ["HTTPS", "FTP", "SMTP", "DHCP"], answer: 0, correct_count: 0, wrong_count: 0, explanation: "HTTPSはSSL/TLSで通信を暗号化するWebプロトコルです。" }
];

let quizList = loadLocalQuizzes();

function loadLocalQuizzes() {
    const saved = localStorage.getItem('anki_quest_custom_quizzes');
    if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
    }
    return JSON.parse(JSON.stringify(defaultQuizzes));
}

function saveLocalQuizzes() {
    localStorage.setItem('anki_quest_custom_quizzes', JSON.stringify(quizList));
}

function getQuizStatus(quiz) {
    const c = quiz.correct_count || 0;
    const w = quiz.wrong_count || 0;
    if (c === 0 && w === 0) return { label: "新規", color: "#3a82f6", hex: "#3a82f6" };
    if (w > c) return { label: "苦手", color: "#ef4444", hex: "#ef4444" };
    if (c >= 2 && w === 0) return { label: "定着", color: "#22c55e", hex: "#22c55e" };
    return { label: "修行中", color: "#f97316", hex: "#f97316" };
}

let uploadedImagesBase64 = [];

function resizeImageToCanvas(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 1000;
                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function renderImagePreviews() {
    const preview = document.getElementById('image-preview');
    preview.innerHTML = '';
    if (uploadedImagesBase64.length === 0) return;

    let html = '<div style="display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; align-items: center; margin-bottom: 6px;">';
    uploadedImagesBase64.forEach((base64, index) => {
        html += `
            <div style="position: relative; display: inline-block; margin: 2px;">
                <img src="${base64}" style="width: 40px; height: 40px; object-fit: cover; border: 2px solid #6b533f; border-radius: 2px;">
                <button type="button" onclick="removeImage(${index})" style="position: absolute; top: -5px; right: -5px; background: #ff4444; color: white; border: none; border-radius: 50%; width: 16px; height: 16px; font-size: 9px; cursor: pointer;">×</button>
            </div>
        `;
    });
    html += '</div>';
    html += `<div style="text-align: center;"><button type="button" onclick="runAiAnalysis()" class="retro-btn btn-green" style="padding: 6px 12px; font-size: 0.75rem;">✨ ${uploadedImagesBase64.length}枚をサーバー経由でAI解析</button></div>`;
    preview.innerHTML = html;
}

function removeImage(index) {
    uploadedImagesBase64.splice(index, 1);
    renderImagePreviews();
}

async function handleImageUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const msg = document.getElementById('create-msg');
    msg.textContent = '🔄 画像圧縮中...';
    try {
        for (let i = 0; i < files.length; i++) {
            const base64 = await resizeImageToCanvas(files[i]);
            uploadedImagesBase64.push(base64);
        }
        event.target.value = '';
        renderImagePreviews();
        msg.textContent = `📸 ${uploadedImagesBase64.length}枚スタンバイ中`;
    } catch (error) {
        msg.textContent = `❌ エラー: ${error.message}`;
    }
}

async function runAiAnalysis() {
    if (uploadedImagesBase64.length === 0) return;
    const msg = document.getElementById('create-msg');
    msg.textContent = `🔄 AI解析中...（サーバー処理）`;
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: uploadedImagesBase64 })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || '解析失敗');

        const choicesArr = [
            result.choices?.['ア'] || '',
            result.choices?.['イ'] || '',
            result.choices?.['ウ'] || '',
            result.choices?.['エ'] || ''
        ];
        let ansIdx = 0;
        const ansChar = result.answer || 'ア';
        if (ansChar.includes('イ')) ansIdx = 1;
        else if (ansChar.includes('ウ')) ansIdx = 2;
        else if (ansChar.includes('エ')) ansIdx = 3;

        quizList.push({
            q: result.question,
            choices: choicesArr,
            answer: ansIdx,
            explanation: result.explanation || '解説なし',
            correct_count: 0,
            wrong_count: 0
        });
        saveLocalQuizzes();

        msg.textContent = `✨ 解析成功！問題を追加しました！`;
        uploadedImagesBase64 = [];
        renderImagePreviews();
        renderQuestBoard();
    } catch (error) {
        msg.textContent = `❌ AI解析失敗: ${error.message}`;
    }
}

function openMonsterScreen() {
    switchScreen('monster-screen');
}

function renderQuestBoard() {
    const board = document.getElementById('quest-board');
    if (!board) return;
    board.innerHTML = '';

    if (!quizList || quizList.length === 0) {
        const p = document.createElement('p');
        p.style.cssText = 'text-align: center; color: #d4c5ab; font-size: 0.75rem; grid-column: span 3; margin-top: 20px;';
        p.textContent = 'モンスターがいません。';
        board.appendChild(p);
        return;
    }

    quizList.forEach((quiz, index) => {
        const st = getQuizStatus(quiz);
        const isDanger = quiz.wrong_count > (quiz.correct_count || 0);
        
        const noteDiv = document.createElement('div');
        noteDiv.className = isDanger ? 'quest-note danger' : 'quest-note';
        noteDiv.id = `quest-note-${index}`;

        const innerFlex = document.createElement('div');
        innerFlex.style.cssText = 'display: flex; align-items: center; gap: 8px; height: 100%; position: relative; cursor: pointer;';
        innerFlex.onclick = () => openDetailModal(index);

        const pinIcon = document.createElement('div');
        pinIcon.style.cssText = 'position: absolute; top: -6px; left: 50%; transform: translateX(-50%); font-size: 10px; z-index: 2;';
        pinIcon.textContent = '📍';

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '❌';
        deleteBtn.style.cssText = 'position: absolute; top: -4px; right: -4px; background: #992222; color: white; border: 1px solid #ff4444; border-radius: 50%; width: 18px; height: 18px; font-size: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 5;';
        deleteBtn.title = 'ボードから剥がす';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            boardDeleteQuiz(index);
        };

        const svgWrapper = document.createElement('div');
        svgWrapper.style.cssText = 'flex-shrink: 0; margin-top: 4px;';
        svgWrapper.innerHTML = monsterSvg(hashStr(quiz.q), st.hex, 4, false);

        const textWrapper = document.createElement('div');
        textWrapper.style.cssText = 'overflow: hidden; flex: 1; margin-top: 4px;';

        const qTitle = document.createElement('div');
        qTitle.style.cssText = 'font-size: 0.7rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.2; color: #2b2219; font-weight: bold;';
        qTitle.textContent = quiz.q;

        const statusLabel = document.createElement('div');
        statusLabel.style.cssText = `font-size: 0.65rem; color: ${st.color}; margin-top: 2px; font-weight: bold;`;
        statusLabel.textContent = `${st.label} (正:${quiz.correct_count || 0} 誤:${quiz.wrong_count || 0})`;

        textWrapper.appendChild(qTitle);
        textWrapper.appendChild(statusLabel);
        innerFlex.appendChild(pinIcon);
        innerFlex.appendChild(deleteBtn);
        innerFlex.appendChild(svgWrapper);
        innerFlex.appendChild(textWrapper);
        noteDiv.appendChild(innerFlex);
        board.appendChild(noteDiv);
    });
}

let editingModalIndex = null;

function openDetailModal(index) {
    editingModalIndex = index;
    const quiz = quizList[index];

    document.getElementById('modal-title').textContent = `モンスター No.${index + 1} 討伐記録`;
    document.getElementById('modal-stats').innerHTML = `<b>正解数:</b> ${quiz.correct_count || 0}回 &nbsp;|&nbsp; <b>間違い数:</b> ${quiz.wrong_count || 0}回`;
    document.getElementById('modal-question').value = quiz.q;
    document.getElementById('modal-choice-0').value = quiz.choices[0];
    document.getElementById('modal-choice-1').value = quiz.choices[1];
    document.getElementById('modal-choice-2').value = quiz.choices[2];
    document.getElementById('modal-choice-3').value = quiz.choices[3];
    document.getElementById('modal-explanation').value = quiz.explanation || '';
    
    const ansChar = ['ア', 'イ', 'ウ', 'エ'][quiz.answer] || 'ア';
    document.getElementById('modal-answer').value = ansChar;

    const delBtn = document.getElementById('modal-delete-btn');
    if (delBtn) delBtn.style.display = 'inline-block';

    document.getElementById('detail-modal').classList.remove('hidden');
}

function openAddModal() {
    editingModalIndex = null;
    document.getElementById('modal-title').textContent = `新規モンスター問題の作成`;
    document.getElementById('modal-stats').innerHTML = `<b>新しいクエスト（問題）を手入力します</b>`;
    document.getElementById('modal-question').value = '';
    document.getElementById('modal-choice-0').value = '';
    document.getElementById('modal-choice-1').value = '';
    document.getElementById('modal-choice-2').value = '';
    document.getElementById('modal-choice-3').value = '';
    document.getElementById('modal-answer').value = 'ア';
    document.getElementById('modal-explanation').value = '';

    const delBtn = document.getElementById('modal-delete-btn');
    if (delBtn) delBtn.style.display = 'none';

    document.getElementById('detail-modal').classList.remove('hidden');
}

function closeDetailModal() {
    document.getElementById('detail-modal').classList.add('hidden');
    editingModalIndex = null;
}

function saveModalEdit() {
    const q = document.getElementById('modal-question').value.trim();
    const choiceA = document.getElementById('modal-choice-0').value.trim();
    const choiceB = document.getElementById('modal-choice-1').value.trim();
    const choiceC = document.getElementById('modal-choice-2').value.trim();
    const choiceD = document.getElementById('modal-choice-3').value.trim();
    const ansText = document.getElementById('modal-answer').value.trim();
    const explanation = document.getElementById('modal-explanation').value.trim();

    if (!q || !choiceA || !choiceB || !choiceC || !choiceD) {
        alert('すべての項目を入力してください！');
        return;
    }

    const choices = [choiceA, choiceB, choiceC, choiceD];
    let answerIndex = 0;
    if (ansText.includes('イ')) answerIndex = 1;
    else if (ansText.includes('ウ')) answerIndex = 2;
    else if (ansText.includes('エ')) answerIndex = 3;

    if (editingModalIndex === null) {
        quizList.push({
            q: q,
            choices: choices,
            answer: answerIndex,
            explanation: explanation,
            correct_count: 0,
            wrong_count: 0
        });
        alert('✨ 新しいモンスター（問題）をボードに追加しました！');
    } else {
        const target = quizList[editingModalIndex];
        target.q = q;
        target.choices = choices;
        target.answer = answerIndex;
        target.explanation = explanation;
        alert('✨ モンスター情報を更新しました！');
    }

    saveLocalQuizzes();
    closeDetailModal();
    renderQuestBoard();
}

function boardDeleteQuiz(index) {
    if (!confirm('このモンスターの紙をボードから剥がしますか？')) return;

    const noteEl = document.getElementById(`quest-note-${index}`);
    if (noteEl) {
        noteEl.classList.add('tearing');
    }

    setTimeout(() => {
        quizList.splice(index, 1);
        saveLocalQuizzes();
        renderQuestBoard();
    }, 380);
}

function deleteModalQuiz() {
    if (editingModalIndex === null) return;
    boardDeleteQuiz(editingModalIndex);
    closeDetailModal();
}

async function importDeck() {
    const codeInput = document.getElementById('share-code-input');
    const msg = document.getElementById('share-msg');
    const targetCode = codeInput.value.trim();
    if (!targetCode || !supabaseClient) return;

    try {
        const { data, error } = await supabaseClient.from('quizzes').select('*').eq('creator_code', targetCode);
        if (error || !data || data.length === 0) {
            alert('見つかりませんでした');
            return;
        }
        const imported = data.map(item => ({
            q: item.question,
            choices: item.choices,
            answer: item.answer,
            explanation: item.explanation || '',
            correct_count: 0,
            wrong_count: 0
        }));
        quizList = [...quizList, ...imported];
        saveLocalQuizzes();
        msg.textContent = `✨ ${imported.length}問のモンスターを取り込みました！`;
        codeInput.value = '';
        renderQuestBoard();
    } catch (err) {
        alert('取り込み失敗');
    }
}

// --- 音声・効果音 ---
// --- 音（効果音とBGM。音声ファイルは使わず、ブラウザの中で作ります） ---
let audioCtx = null, sfxBus = null, bgmBus = null;
let soundOn = localStorage.getItem('anki_quest_sound') !== 'off';
function initAudio() {
    try {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
            sfxBus = audioCtx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(audioCtx.destination);
            bgmBus = audioCtx.createGain(); bgmBus.gain.value = 0.5; bgmBus.connect(audioCtx.destination);
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) {}
}
function blip(type, f0, f1, at, dur, vol) {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, at);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    o.connect(g); g.connect(sfxBus);
    o.start(at); o.stop(at + dur + 0.02);
}
function noiseBurst(at, dur, f0, f1, vol, type) {
    const n = Math.floor(audioCtx.sampleRate * dur), buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource(); src.buffer = buf;
    const f = audioCtx.createBiquadFilter(); f.type = type || 'bandpass';
    f.frequency.setValueAtTime(f0, at); f.frequency.exponentialRampToValueAtTime(f1, at + dur);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(at); src.stop(at + dur);
}
function playSlashSound() {
    if (!soundOn) return;
    try { initAudio(); if (!audioCtx) return; noiseBurst(audioCtx.currentTime, 0.25, 1400, 250, 0.6); } catch (e) {}
}
function playSound(type) {
    if (!soundOn) return;
    try {
        initAudio();
        if (!audioCtx) return;
        const t = audioCtx.currentTime;
        if (type === 'correct') {          // 正解：明るい2音のチャイム
            blip('triangle', 784, 784, t, 0.18, 0.25);
            blip('triangle', 1046.5, 1046.5, t + 0.09, 0.32, 0.25);
            blip('sine', 2093, 2093, t + 0.09, 0.2, 0.06);
        } else if (type === 'wrong') {     // 不正解：低いブザー
            blip('square', 160, 120, t, 0.16, 0.18);
            blip('square', 120, 80, t + 0.14, 0.26, 0.18);
            noiseBurst(t, 0.12, 400, 100, 0.12, 'lowpass');
        } else if (type === 'defeat') {    // 敵を倒した：ぱっと消える音
            noiseBurst(t, 0.55, 2400, 160, 0.35, 'lowpass');
            blip('sine', 520, 130, t, 0.5, 0.2);
            blip('sine', 780, 260, t + 0.06, 0.4, 0.1);
        } else if (type === 'levelup') {   // レベルアップ：ファンファーレ
            [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => blip('square', f, f, t + i * 0.12, 0.2, 0.14));
        }
    } catch (e) {}
}

// BGM：ダンジョンの暗い雰囲気の環境音楽（低いうなり、ゆっくり変わる和音、ときどき響く音としずく）
let bgm = null;
const BGM_CHORDS = [[110, 130.81, 164.81], [87.31, 110, 130.81], [98, 123.47, 146.83], [82.41, 98, 123.47]];
const BGM_NOTES = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];
function startBGM() {
    if (!soundOn || bgm) return;
    initAudio();
    if (!audioCtx) return;
    const ctx = audioCtx, t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(1, t + 2.5); out.connect(bgmBus);
    const echo = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), send = ctx.createGain();
    echo.delayTime.value = 0.45; fb.gain.value = 0.4; lp.type = 'lowpass'; lp.frequency.value = 1600; send.gain.value = 0.7;
    send.connect(echo); echo.connect(lp); lp.connect(fb); fb.connect(echo); lp.connect(out);
    const dry = (node) => { node.connect(out); node.connect(send); };

    const drone = ctx.createGain(), dlp = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    drone.gain.value = 0.16; dlp.type = 'lowpass'; dlp.frequency.value = 170; dlp.Q.value = 2;
    lfo.frequency.value = 0.07; lfoGain.gain.value = 70; lfo.connect(lfoGain); lfoGain.connect(dlp.frequency);
    const oscs = [55, 55.4, 82.5].map((f, i) => {
        const o = ctx.createOscillator();
        o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f; o.connect(dlp); o.start(t);
        return o;
    });
    dlp.connect(drone); drone.connect(out); lfo.start(t);

    const me = { out, oscs, lfo, alive: true, timers: {} };
    let chordIdx = 0;
    const playChord = () => {
        if (!me.alive) return;
        const now = ctx.currentTime, chord = BGM_CHORDS[chordIdx++ % BGM_CHORDS.length];
        chord.forEach(f => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine'; o.frequency.value = f * 2;
            g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(0.05, now + 2.2); g.gain.linearRampToValueAtTime(0.0001, now + 7.5);
            o.connect(g); dry(g); o.start(now); o.stop(now + 7.6);
        });
        me.timers.chord = setTimeout(playChord, 7500);
    };
    const pluck = () => {
        if (!me.alive) return;
        if (Math.random() < 0.7) {
            const now = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'triangle'; o.frequency.value = BGM_NOTES[Math.floor(Math.random() * BGM_NOTES.length)];
            g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.09, now + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
            o.connect(g); dry(g); o.start(now); o.stop(now + 1.9);
        }
        me.timers.pluck = setTimeout(pluck, 1800 + Math.random() * 2600);
    };
    const drip = () => {
        if (!me.alive) return;
        const now = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(2000, now); o.frequency.exponentialRampToValueAtTime(1300, now + 0.09);
        g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.05, now + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        o.connect(g); dry(g); o.start(now); o.stop(now + 0.14);
        me.timers.drip = setTimeout(drip, 6000 + Math.random() * 7000);
    };
    playChord();
    me.timers.pluck = setTimeout(pluck, 2500);
    me.timers.drip = setTimeout(drip, 4000);
    bgm = me;
}
function stopBGM() {
    if (!bgm) return;
    const me = bgm;
    bgm = null;
    me.alive = false;
    Object.values(me.timers).forEach(id => clearTimeout(id));
    try {
        const now = audioCtx.currentTime;
        me.out.gain.cancelScheduledValues(now);
        me.out.gain.setValueAtTime(Math.max(me.out.gain.value, 0.0001), now);
        me.out.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
        setTimeout(() => {
            me.oscs.forEach(o => { try { o.stop(); } catch (e) {} });
            try { me.lfo.stop(); } catch (e) {}
            try { me.out.disconnect(); } catch (e) {}
        }, 900);
    } catch (e) {}
}
function updateSoundButton() {
    const b = document.getElementById('sound-btn');
    if (b) b.textContent = soundOn ? '音 ON' : '音 OFF';
}
function toggleSound() {
    soundOn = !soundOn;
    localStorage.setItem('anki_quest_sound', soundOn ? 'on' : 'off');
    updateSoundButton();
    if (soundOn) {
        initAudio();
        if (!document.getElementById('battle-screen').classList.contains('hidden')) startBGM();
        playSound('correct');
    } else {
        stopBGM();
    }
}
document.addEventListener('visibilitychange', () => {
    if (!audioCtx) return;
    if (document.hidden) audioCtx.suspend();
    else if (soundOn) audioCtx.resume();
});

// --- 倒したときの演出（ステージ上の動き） ---
function attackEffect() {
    const stage = document.getElementById('sc-stage'), enemyEl = document.getElementById('enemy-sprite'), p = document.getElementById('player-sprite');
    p.classList.remove('lunge'); void p.offsetWidth; p.classList.add('lunge');
    const sl = document.createElement('div');
    sl.className = 'slash';
    sl.style.left = (enemyEl.offsetLeft + enemyEl.offsetWidth * 0.1) + 'px';
    sl.style.bottom = (6 * stageScale + enemyEl.offsetHeight * 0.45) + 'px';
    sl.style.width = (enemyEl.offsetWidth * 0.8) + 'px';
    sl.style.height = (stageScale * 2) + 'px';
    stage.appendChild(sl);
    setTimeout(() => sl.remove(), 350);
}
function defeatEnemy() {
    const stage = document.getElementById('sc-stage'), enemyEl = document.getElementById('enemy-sprite');
    const cx = enemyEl.offsetLeft + enemyEl.offsetWidth / 2, cy = 6 * stageScale + enemyEl.offsetHeight / 2;
    playSound('defeat');
    enemyEl.className = 'defeat';     // 白く光って、ドット状にくずれて消える
    const colors = ['#ffe9a0', '#e0a030', '#ffffff', '#b0443a'];
    for (let i = 0; i < 16; i++) {
        const sp = document.createElement('i');
        const a = (Math.PI * 2 * i) / 16 + Math.random() * 0.4, d = (40 + Math.random() * 70) * (stageScale / 3);
        sp.className = 'spark';
        sp.style.left = cx + 'px'; sp.style.bottom = cy + 'px';
        sp.style.width = sp.style.height = (stageScale * 2) + 'px';
        sp.style.background = colors[i % colors.length];
        sp.style.setProperty('--dx', Math.round(Math.cos(a) * d) + 'px');
        sp.style.setProperty('--dy', Math.round(-Math.sin(a) * d + 20) + 'px');
        stage.appendChild(sp);
        setTimeout(() => sp.remove(), 800);
    }
}

let typewriterTimer = null;
function typewriterText(elementId, text, speed = 20, callback = null) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (typewriterTimer) clearInterval(typewriterTimer);
    el.textContent = '';
    let i = 0;
    typewriterTimer = setInterval(() => {
        if (i < text.length) {
            el.textContent += text.charAt(i);
            i++;
        } else {
            clearInterval(typewriterTimer);
            typewriterTimer = null;
            if (callback) callback();
        }
    }, speed);
}

// --- 自動横スクロール・バトルシステム ---
let battleQueue = [];
let battleIndex = 0;
let questionHearts = 3;
let isAnswering = false;
let hasFailedCurrentQuestion = false;
let sessionStats = { total: 0, perfect: 0, expEarned: 0 };

let floorNum = 1;
let enemyNum = 1;
let campCount = 0;
let scrollOffset = 0;
let isWalking = false;

// ★ クエスト出発時：UIがフェードアウトすると同時に独立した背景オーバーレイがダンジョン入口へズーム＆暗転
let fxBusy = false;
function startBattleWithTransition() {
    if (fxBusy) return;
    fxBusy = true;
    initAudio();
    const container = document.getElementById('game-container');
    const zoomOverlay = document.getElementById('dungeon-zoom-overlay');

    // 1. ホームの画面が消えて、ダンジョンの入口の奥へズーム
    if (container) container.classList.add('fade-out');
    if (zoomOverlay) zoomOverlay.classList.add('active');

    // 2. 真っ暗になったら、階の名前を出す
    setTimeout(() => {
        const ft = document.getElementById('floor-title');
        document.getElementById('ft-floor').textContent = 'B1F';
        document.getElementById('ft-sub').textContent = '地下1階';
        ft.className = 'on';
        void ft.offsetWidth;
        ft.classList.add('show');
        if (zoomOverlay) zoomOverlay.classList.remove('active');
    }, 1000);

    // 3. 暗闇のうちに、ダンジョンの中（バトル画面）へ切り替え
    setTimeout(() => {
        startBattle();
        if (container) container.classList.remove('fade-out');
    }, 1700);

    // 4. カードが消えて、ダンジョンの中を歩き始める
    setTimeout(() => { document.getElementById('floor-title').classList.add('out'); }, 2000);
    setTimeout(() => { document.getElementById('floor-title').className = ''; fxBusy = false; }, 2500);
}

function startBattle() {
    if (!quizList || quizList.length === 0) quizList = [...defaultQuizzes];
    
    let pool = [...quizList];
    pool.sort(() => Math.random() - 0.5);
    battleQueue = pool;
    battleIndex = 0;
    floorNum = 1;
    enemyNum = 1;
    campCount = 0;
    sessionStats = { total: battleQueue.length, perfect: 0, expEarned: 0 };

    switchScreen('battle-screen');
    
    layoutStage();
    document.getElementById('wall-layer').style.backgroundImage = getTileUris().wall;
    document.getElementById('floor-layer').style.backgroundImage = getTileUris().floor;
    setPlayerSprite(0);
    startBGM();

    nextEnemyWalk();
}

function quitBattle() {
    switchScreen('home-screen');
}

function updateHeartsDisplay(brokenIndex = null) {
    const container = document.getElementById('question-hearts');
    if (!container) return;
    const existingHearts = container.querySelectorAll('.heart-img-large');
    if (brokenIndex !== null && existingHearts[brokenIndex]) {
        existingHearts[brokenIndex].classList.add('break-animation');
        setTimeout(() => renderHeartsDOM(), 500);
    } else {
        renderHeartsDOM();
    }
}

function renderHeartsDOM() {
    const container = document.getElementById('question-hearts');
    if (!container) return;
    let html = '';
    for (let i = 0; i < 3; i++) {
        const lostClass = (i >= questionHearts) ? 'heart-img-large lost' : 'heart-img-large';
        html += `<img src="heart.png" class="${lostClass}" alt="♥" onerror="this.replaceWith('${i < questionHearts ? '❤️' : '🖤'}')">`;
    }
    container.innerHTML = html;
}

function updateBattleHud() {
    const flEl = document.getElementById('battle-floor-label');
    const cntEl = document.getElementById('battle-progress');
    const lvEl = document.getElementById('battle-player-level-top');
    const campEl = document.getElementById('camp-container');

    if (flEl) flEl.textContent = `B${floorNum}F`;
    if (cntEl) cntEl.textContent = `敵 ${enemyNum}/5`;
    if (lvEl) lvEl.textContent = `LV.${player.level}`;
    if (campEl) {
        campEl.innerHTML = campCount > 0 ? `<span>${sv(FM, FC, 2.5)}×${campCount}</span><button class="retro-btn" onclick="useCamp()" style="padding: 2px 6px; font-size:0.65rem; margin:0; background:#6b533f;">休む</button>` : '';
    }
    updatePlayerStatusUI();
}

function useCamp() {
    if (isWalking || campCount < 1) return;
    campCount--;
    questionHearts = 3;
    updateHeartsDisplay();
    updateBattleHud();
    const overlay = document.getElementById('battle-message-overlay');
    if (overlay) overlay.textContent = '焚き火で体力が全快した！';
    setTimeout(() => { if (overlay) overlay.textContent = ''; }, 2000);
}

function nextEnemyWalk() {
    if (battleIndex >= battleQueue.length) {
        showResultScreen();
        return;
    }

    isAnswering = true;
    questionHearts = 3;
    hasFailedCurrentQuestion = false;
    updateHeartsDisplay();
    updateBattleHud();

    document.getElementById('question-text').textContent = '探索中…';
    document.getElementById('battle-message').textContent = '';
    document.getElementById('choices-container').innerHTML = '';

    const qData = battleQueue[battleIndex];
    const st = getQuizStatus(qData);
    const enemyEl = document.getElementById('enemy-sprite');
    const overlay = document.getElementById('battle-message-overlay');

    enemyEl.className = ''; 
    enemyEl.innerHTML = enemySvg(qData.q, st.hex);
    enemyEl.style.left = '100%';

    isWalking = true;
    const stageWidth = document.getElementById('sc-stage').clientWidth || 400;
    const t0 = performance.now();
    const duration = 1200;
    let lastT = t0, lastFrame = -1;

    function animateWalk(t) {
        const p = Math.min(1, (t - t0) / duration);
        scrollOffset -= (t - lastT) * 0.09 * stageScale;
        lastT = t;
        document.getElementById('wall-layer').style.backgroundPositionX = scrollOffset + 'px';
        document.getElementById('floor-layer').style.backgroundPositionX = scrollOffset + 'px';
        
        const pSprite = document.getElementById('player-sprite');
        const frame = Math.floor(t / 130) % 2;
        if (frame !== lastFrame) { lastFrame = frame; setPlayerSprite(frame); }
        if (pSprite) pSprite.style.transform = frame ? `translateY(-${stageScale}px)` : '';

        const enemyX = Math.round(stageWidth + 10 - p * (stageWidth + 10 - stageEnemyX));
        enemyEl.style.left = enemyX + 'px';

        if (p < 1) {
            requestAnimationFrame(animateWalk);
        } else {
            isWalking = false;
            if (pSprite) pSprite.style.transform = '';
            setPlayerSprite(0);
            if (overlay) overlay.textContent = '＊ 恐ろしい敵が現れた！';
            setTimeout(() => { if (overlay) overlay.textContent = ''; }, 1500);
            loadQuestionContent();
        }
    }
    requestAnimationFrame(animateWalk);
}

let currentDisplayChoices = [];

function loadQuestionContent() {
    isAnswering = false;
    const qData = battleQueue[battleIndex];

    typewriterText('question-text', `＊ ${qData.q}`, 15);

    let originalChoicesWithIndex = qData.choices.map((text, idx) => ({ text, originalIdx: idx }));
    originalChoicesWithIndex.sort(() => Math.random() - 0.5);
    currentDisplayChoices = originalChoicesWithIndex;

    const container = document.getElementById('choices-container');
    if (!container) return;
    container.innerHTML = '';

    const labels = ['ア', 'イ', 'ウ', 'エ'];
    currentDisplayChoices.forEach((item, shuffledIdx) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = `${labels[shuffledIdx]}. ${item.text}`;
        const isCorrect = (item.originalIdx === qData.answer);
        btn.onclick = () => answerQuiz(isCorrect, btn);
        container.appendChild(btn);
    });
}

function answerQuiz(isCorrect, clickedBtn) {
    if (isAnswering) return;
    isAnswering = true;

    const messageEl = document.getElementById('battle-message');
    const enemySprite = document.getElementById('enemy-sprite');
    const qData = battleQueue[battleIndex];

    if (isCorrect) {
        playSlashSound();

        if (!hasFailedCurrentQuestion) {
            qData.correct_count = (qData.correct_count || 0) + 1;
            sessionStats.perfect++;
            player.exp += 20;
            sessionStats.expEarned += 20;
        }
        saveLocalQuizzes();

        playSound('correct');
        attackEffect();
        setTimeout(defeatEnemy, 200);

        let msg = '＊ ✨ 会心の一撃！ 討伐成功！';
        if (qData.explanation) {
            msg += ` (${qData.explanation})`;
        }
        typewriterText('battle-message', msg, 20);

        if ((enemyNum === 2 && floorNum === 1) || Math.random() < 0.2) {
            campCount++;
            setTimeout(() => {
                const overlay = document.getElementById('battle-message-overlay');
                if (overlay) {
                    overlay.textContent = '✨ 焚き火を手に入れた！';
                    setTimeout(() => overlay.textContent = '', 2000);
                }
            }, 500);
        }

        if (player.exp >= player.nextExp) {
            player.level++;
            player.exp -= player.nextExp;
            player.nextExp = Math.floor(player.nextExp * 1.3);
            playSound('levelup');
            setTimeout(() => alert(`🎉 レベルアップ！ Lv.${player.level} になった！`), 300);
        }
        player.defeatCount++;
        savePlayerData();
        updateBattleHud();

        setTimeout(() => {
            battleIndex++;
            enemyNum++;
            if (enemyNum > 5) {
                enemyNum = 1;
                floorNum++;
                showFloorTitle(floorNum, '階段を降りた');
            }
            nextEnemyWalk();
        }, 2200);

    } else {
        playSound('wrong');
        hasFailedCurrentQuestion = true;
        const brokenTargetIndex = questionHearts - 1;
        questionHearts--;
        qData.wrong_count = (qData.wrong_count || 0) + 1;
        saveLocalQuizzes();
        updateHeartsDisplay(brokenTargetIndex);

        if (clickedBtn) {
            clickedBtn.disabled = true;
        }

        if (enemySprite) {
            enemySprite.classList.remove('shk');
            void enemySprite.offsetWidth;
            enemySprite.classList.add('shk');
        }

        if (questionHearts > 0) {
            typewriterText('battle-message', `＊ 💥 不正解… ライフが減った（残り ${questionHearts} 個）`, 20);
            setTimeout(() => {
                isAnswering = false;
            }, 1000);
        } else {
            const failMsg = qData.explanation ? `正解は: ${qData.explanation}` : '次へ進む！';
            typewriterText('battle-message', `＊ 😵 討伐失敗… ${failMsg}`, 20);
            setTimeout(() => {
                battleIndex++;
                enemyNum++;
                if (enemyNum > 5) {
                    enemyNum = 1;
                    floorNum++;
                    showFloorTitle(floorNum, '階段を降りた');
                }
                nextEnemyWalk();
            }, 2500);
        }
    }
}

function showResultScreen() {
    document.getElementById('res-total').textContent = sessionStats.total;
    document.getElementById('res-perfect').textContent = sessionStats.perfect;
    document.getElementById('res-exp').textContent = sessionStats.expEarned;
    switchScreen('result-screen');
}

function initApp() {
    const container = document.getElementById('game-container');
    if (container) container.classList.add('screen-home');
    savePlayerData();
    updateSoundButton();
}

initApp();