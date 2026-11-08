// render.js - Deklaratív megjelenítő modul (UI = render(state))
// Minden képkockán letörli és az aktuális state alapján újrarajzolja a Canvas 2D-t,
// valamint frissíti a HUD számlálókat és a modális ablakokat.

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLORS,
  WARNING_DISTANCE,
  getNodeById,
  getEdgeGeometry,
  getSignalPosition,
  lerp2D,
  formatTimeMMSS
} from './state.js';

// Sötét diszpécseri háttér és négyzetháló kirajzolása
function drawBackgroundGrid(ctx) {
  ctx.save();
  ctx.fillStyle = '#060911';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.strokeStyle = 'rgba(30, 41, 59, 0.35)';
  ctx.lineWidth = 1;
  const step = 40;

  for (let x = 0; x <= CANVAS_WIDTH; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }

  for (let y = 0; y <= CANVAS_HEIGHT; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();
}

// Vágányhálózat (ágyazat, talpfák és sínszálak) kirajzolása
function drawTrackEdges(ctx, state) {
  // Kigyűjtjük, mely élek aktívak jelenleg a váltók állása szerint (ezek világosabban jelennek meg)
  const activeSwitchEdges = new Set();
  for (const sw of state.switches) {
    const activeEdgeId = sw.branches[sw.activeBranchIndex];
    if (activeEdgeId) {
      activeSwitchEdges.add(activeEdgeId);
    }
  }

  for (const edge of state.edges) {
    const geom = getEdgeGeometry(state, edge.id);
    const toNode = geom.toNode;
    const isDeadEnd = toNode.type === 'deadend';
    const isControlled = state.switches.some((sw) => sw.branches.includes(edge.id));
    const isActive = !isControlled || activeSwitchEdges.has(edge.id);

    ctx.save();

    // 1. Alsó kavicságyazat vonala
    ctx.beginPath();
    ctx.moveTo(geom.fromNode.x, geom.fromNode.y);
    ctx.lineTo(geom.toNode.x, geom.toNode.y);
    ctx.strokeStyle = isDeadEnd ? 'rgba(127, 29, 29, 0.45)' : 'rgba(51, 65, 85, 0.65)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 2. Merőleges talpfák kirajzolása LERP és forgatás (translate + rotate) segítségével
    // A save() és restore() biztosítja, hogy a forgatás ne rontsa el a többi elem koordinátáit!
    const sleeperStep = 16;
    const count = Math.floor(geom.length / sleeperStep);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.75)';
    ctx.lineWidth = 2;

    for (let i = 1; i < count; i += 1) {
      const t = i / count;
      const pt = lerp2D(geom.fromNode, geom.toNode, t);
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(geom.angle);
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(0, 6);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Felső sínszál (csonkavágány esetén szaggatott pirosas vonal)
    ctx.beginPath();
    ctx.moveTo(geom.fromNode.x, geom.fromNode.y);
    ctx.lineTo(geom.toNode.x, geom.toNode.y);
    if (isDeadEnd) {
      ctx.strokeStyle = isActive ? '#f87171' : '#64748b';
      ctx.setLineDash([7, 5]);
    } else {
      ctx.strokeStyle = isActive ? '#94a3b8' : '#475569';
    }
    ctx.lineWidth = isActive ? 4.5 : 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
  }
}

// Belépési pontok, színes célperonok és csonkavágány-ütközők kirajzolása
function drawTrackTerminals(ctx, state) {
  for (const node of state.nodes) {
    if (node.type === 'entry') {
      // Bal oldali belépési címke
      ctx.save();
      ctx.translate(node.x, node.y);

      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-78, -14, 70, 28, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 12px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label || 'Belépő →', -43, 0);

      ctx.restore();
    } else if (node.type === 'station') {
      // Színkódolt célperon (Piros, Kék, Sárga, Zöld)
      const colorInfo = COLORS[node.color] || COLORS.red;
      ctx.save();
      ctx.translate(node.x, node.y);

      ctx.fillStyle = colorInfo.hex;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-10, -28, 22, 56, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 13px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, 20, 0);

      ctx.restore();
    } else if (node.type === 'deadend') {
      // Nyitott vágányvég piros X jelzéssel (ide futva kisiklik a vonat)
      ctx.save();
      ctx.translate(node.x, node.y);

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-6, -12);
      ctx.lineTo(6, 12);
      ctx.moveTo(6, -12);
      ctx.lineTo(-6, 12);
      ctx.stroke();

      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 11px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${node.label} (Csonka)`, 12, 0);

      ctx.restore();
    }
  }
}

// Váltó csomópontok és a narancssárga aktív irányjelző nyíl kirajzolása
function drawSwitches(ctx, state) {
  for (const sw of state.switches) {
    const node = getNodeById(state, sw.nodeId);
    if (!node) {
      continue;
    }

    const activeEdgeId = sw.branches[sw.activeBranchIndex];
    const activeGeom = activeEdgeId ? getEdgeGeometry(state, activeEdgeId) : null;

    ctx.save();
    ctx.translate(node.x, node.y);

    // Váltó kör alakú alapja
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fillStyle = '#0b192c';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();

    // Narancssárga nyíl az aktív kimeneti ág irányába forgatva
    if (activeGeom) {
      ctx.save();
      ctx.rotate(activeGeom.angle);

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.lineTo(13, 0);
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(8, -4.5);
      ctx.lineTo(8, 4.5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // Váltó felirata (pl. V1, V2)
    ctx.fillStyle = '#7dd3fc';
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(node.label || sw.id, 0, 21);

    ctx.restore();
  }
}

// Kétoptikás vasúti fényjelzők (Vörös = Megállj, Zöld = Szabad) kirajzolása
function drawSignals(ctx, state) {
  for (const sig of state.signals) {
    const pos = getSignalPosition(state, sig);

    ctx.save();
    ctx.translate(pos.trackX, pos.trackY);

    // Ha vörös a jelző, egy piros megállító vonalat is húzunk a sínre
    if (!sig.isGreen) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(0, 9);
      ctx.stroke();
    }

    // Jelzőoszlop
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -14);
    ctx.stroke();

    // Jelzőfej háza
    ctx.fillStyle = '#111827';
    ctx.strokeStyle = sig.isGreen ? '#10b981' : '#ef4444';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-10, -42, 20, 29, 6);
    ctx.fill();
    ctx.stroke();

    // Felső optika: Vörös lámpa
    ctx.beginPath();
    ctx.arc(0, -34, 5.2, 0, Math.PI * 2);
    if (!sig.isGreen) {
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
    } else {
      ctx.fillStyle = '#3f1d24';
      ctx.shadowBlur = 0;
    }
    ctx.fill();

    // Alsó optika: Zöld lámpa
    ctx.beginPath();
    ctx.arc(0, -21, 5.2, 0, Math.PI * 2);
    if (sig.isGreen) {
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 10;
    } else {
      ctx.fillStyle = '#13332a';
      ctx.shadowBlur = 0;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // Jelző azonosítója (J1, J2...)
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sig.label, 0, -47);

    ctx.restore();
  }
}

// 75px-es korai ütközésveszély-zóna (pulzáló szaggatott sárga/piros kör és összekötő vonal)
function drawCollisionWarnings(ctx, state) {
  if (!state.dangerPairs || state.dangerPairs.length === 0) {
    return;
  }

  // Szinuszos pulzálás az eltelt idő alapján
  const pulse = 0.5 + 0.5 * Math.sin(state.elapsedTime * 10);

  for (const pair of state.dangerPairs) {
    const isCritical = pair.severity === 'critical';
    const strokeColor = isCritical ? '#ef4444' : '#f59e0b';
    const fillColor = isCritical
      ? `rgba(239, 68, 68, ${0.12 + pulse * 0.14})`
      : `rgba(245, 158, 11, ${0.1 + pulse * 0.12})`;

    for (const train of [pair.trainA, pair.trainB]) {
      ctx.save();
      ctx.translate(train.x, train.y);
      ctx.beginPath();
      ctx.arc(0, 0, WARNING_DISTANCE / 2 + pulse * 5, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
      ctx.restore();
    }

    // Szaggatott vonal és pixel-távolság kiírása a két veszélyben lévő vonat között
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pair.trainA.x, pair.trainA.y);
    ctx.lineTo(pair.trainB.x, pair.trainB.y);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    const midX = (pair.trainA.x + pair.trainB.x) / 2;
    const midY = (pair.trainA.y + pair.trainB.y) / 2 - 18;
    ctx.fillStyle = strokeColor;
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`VESZÉLY (${Math.round(pair.distance)}px)`, midX, midY);
    ctx.restore();
  }
}

// Mozgó és várakozó szerelvények kirajzolása (célperon színével, menetiránnyal és FÉK/TILOS címkével)
function drawTrains(ctx, state) {
  for (const train of state.trains) {
    if (!train.active) {
      continue;
    }

    const colorInfo = COLORS[train.targetColor] || COLORS.red;

    ctx.save();
    ctx.translate(train.x, train.y);

    // Magát a vonattestet és a menetirány-nyilat a sín szögébe forgatjuk
    ctx.save();
    ctx.rotate(train.angle);

    ctx.beginPath();
    ctx.arc(0, 0, 12.5, 0, Math.PI * 2);
    ctx.fillStyle = colorInfo.hex;
    ctx.fill();

    if (train.waitingAtSignal) {
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#ef4444';
    } else if (train.manualBrake) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fbbf24';
    } else {
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#f8fafc';
    }
    ctx.stroke();

    // Fehér menetirány-háromszög a vonaton
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(2, -4);
    ctx.lineTo(2, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Ha áll a vonat (kézi fék vagy vörös lámpa miatt), kiírjuk fölé vízszintesen: FÉK vagy TILOS
    if (train.manualBrake || train.waitingAtSignal) {
      const badgeText = train.manualBrake ? 'FÉK' : 'TILOS';
      const badgeColor = train.manualBrake ? '#fbbf24' : '#f87171';

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = badgeColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(-22, -31, 44, 15, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = badgeColor;
      ctx.font = 'bold 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, 0, -23.5);
    }

    // Vonat rövid kódja a kör alatt (T1, T2...)
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(train.id, 0, 15);

    ctx.restore();
  }
}

// Ütközés (Game Over) esetén csillag alakú robbanásikon kirajzolása az ütközési pontban
function drawExplosion(ctx, state) {
  if (!state.explosion) {
    return;
  }

  const { x, y } = state.explosion;
  ctx.save();
  ctx.translate(x, y);

  const spikes = 12;
  const outerR = 36;
  const innerR = 16;

  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i += 1) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / spikes;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fillStyle = '#ef4444';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#fde047';
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ÜTKÖZÉS!', 0, -46);

  ctx.restore();
}

// Felugró visszajelző feliratok (pl. "CÉLBA ÉRT", "KISIKLÁS!") kirajzolása elhalványuló (alpha) effekttel
function drawVisualEffects(ctx, state) {
  for (const fx of state.visualEffects) {
    const progress = fx.age / fx.duration;
    const alpha = Math.max(0, 1 - progress);
    const offsetY = progress * 24;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(fx.x, fx.y - offsetY);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = fx.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-75, -13, 150, 24, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = fx.color;
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fx.text, 0, -1);

    ctx.restore();
  }
}

// Felső figyelmeztető sáv a vásznon, ha minden vonat megállt (holtpont)
function drawDeadlockBanner(ctx, state) {
  if (!state.deadlockWarning) {
    return;
  }

  ctx.save();
  ctx.translate(CANVAS_WIDTH / 2, 26);
  ctx.fillStyle = 'rgba(245, 158, 11, 0.92)';
  ctx.beginPath();
  ctx.roundRect(-240, -15, 480, 30, 6);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FIGYELEM: Minden vonat áll! Oldd fel a féket vagy adj szabad jelzést!', 0, 0);
  ctx.restore();
}

// Fő renderelő függvény: letörli a vásznat (clearRect) és rétegről rétegre mindent újrarajzol
export function render(ctx, state) {
  if (!ctx || !state) {
    return;
  }

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawBackgroundGrid(ctx);
  drawTrackEdges(ctx, state);
  drawTrackTerminals(ctx, state);
  drawSwitches(ctx, state);
  drawSignals(ctx, state);
  drawCollisionWarnings(ctx, state);
  drawTrains(ctx, state);
  drawExplosion(ctx, state);
  drawVisualEffects(ctx, state);
  drawDeadlockBanner(ctx, state);

  updateHudElements(state);
}

// A vászon feletti és alatti HTML kijelzők (HUD) frissítése querySelector segítségével
export function updateHudElements(state) {
  const playerEl = document.querySelector('#hud-player-name');
  const levelEl = document.querySelector('#hud-level-name');
  const timerEl = document.querySelector('#hud-timer');
  const arrivedEl = document.querySelector('#hud-arrived');
  const errorsEl = document.querySelector('#hud-errors');
  const pauseBtn = document.querySelector('#btn-pause-resume');
  const statusBanner = document.querySelector('#hud-status-banner');
  const nextTrainEl = document.querySelector('#hud-next-train');
  const levelSelect = document.querySelector('#hud-level-select');

  if (playerEl) {
    playerEl.textContent = state.playerName;
  }
  if (levelEl) {
    levelEl.textContent = state.fullTitle;
  }
  if (timerEl) {
    timerEl.textContent = formatTimeMMSS(state.elapsedTime);
  }
  if (arrivedEl) {
    arrivedEl.textContent = `${state.arrivedCount} / ${state.totalTrains}`;
  }
  if (errorsEl) {
    errorsEl.textContent = String(state.errorCount);
    errorsEl.style.color = state.errorCount > 0 ? '#f87171' : '#ffffff';
  }
  if (levelSelect && String(levelSelect.value) !== String(state.levelId)) {
    levelSelect.value = String(state.levelId);
  }

  if (pauseBtn) {
    pauseBtn.textContent = state.status === 'paused' ? 'Folytatás' : 'Szünet';
  }

  // Következő érkező vonat visszaszámlálója
  if (nextTrainEl) {
    const upcoming = state.schedule.find((item) => !item.spawned);
    if (upcoming) {
      const colorInfo = COLORS[upcoming.targetColor] || COLORS.red;
      const remainingSec = Math.max(0, Math.ceil(upcoming.spawnTime - state.elapsedTime));
      nextTrainEl.textContent = `Következő: ${upcoming.id} (${colorInfo.name}) ${remainingSec} mp múlva`;
    } else {
      nextTrainEl.textContent = 'Minden vonat a pályán';
    }
  }

  if (statusBanner && state.statusBanner) {
    statusBanner.textContent = state.statusBanner.text;
    statusBanner.className = `status-banner ${state.statusBanner.type || 'info'}`;
  }
}

// Helyi ranglista táblázat felépítése a kiválasztott nehézségi szinthez
export function renderLeaderboard(entries, selectedLevelId) {
  const tbody = document.querySelector('#leaderboard-tbody');
  const tabButtons = document.querySelectorAll('#leaderboard-tabs .tab-btn');

  tabButtons.forEach((btn) => {
    const btnLevel = Number(btn.dataset.leaderboardLevel);
    btn.classList.toggle('active', btnLevel === Number(selectedLevelId));
  });

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  if (!Array.isArray(entries) || entries.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.className = 'empty-row';
    td.textContent = 'Még nincs mentett eredmény ezen a szinten.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  entries.forEach((entry, index) => {
    const tr = document.createElement('tr');

    const tdRank = document.createElement('td');
    tdRank.textContent = `${index + 1}.`;

    const tdName = document.createElement('td');
    tdName.textContent = entry.playerName;

    const tdTime = document.createElement('td');
    tdTime.textContent = entry.formattedTime || formatTimeMMSS(entry.elapsedSeconds);

    const tdErrors = document.createElement('td');
    tdErrors.textContent = entry.errorCount === 0 ? '0 (Hibátlan)' : `${entry.errorCount} hiba`;
    tdErrors.style.color = entry.errorCount === 0 ? '#34d399' : '#fbbf24';

    const tdDate = document.createElement('td');
    tdDate.textContent = entry.date || '-';

    tr.append(tdRank, tdName, tdTime, tdErrors, tdDate);
    tbody.appendChild(tr);
  });
}

// Játék végi (Győzelem vagy Game Over) modális ablak megjelenítése
export function showOutcomeModal(state) {
  const modal = document.querySelector('#outcome-modal');
  const iconEl = document.querySelector('#outcome-icon');
  const titleEl = document.querySelector('#outcome-title');
  const msgEl = document.querySelector('#outcome-message');
  const playerStat = document.querySelector('#modal-stat-player');
  const timeStat = document.querySelector('#modal-stat-time');
  const arrivedStat = document.querySelector('#modal-stat-arrived');
  const errorsStat = document.querySelector('#modal-stat-errors');
  const nextBtn = document.querySelector('#btn-modal-next');

  if (!modal) {
    return;
  }

  const isGameOver = state.status === 'gameover';
  const isPerfect = state.status === 'victory' && state.errorCount === 0;

  if (iconEl) {
    iconEl.textContent = isGameOver ? 'X' : (isPerfect ? 'OK' : '!');
  }
  if (titleEl) {
    titleEl.textContent = isGameOver
      ? 'Katasztrófa – Game Over!'
      : (isPerfect ? 'Sikeres teljesítés!' : 'Pálya teljesítve (hibapontokkal)');
  }
  if (msgEl) {
    msgEl.textContent = state.outcomeReason;
  }
  if (playerStat) {
    playerStat.textContent = state.playerName;
  }
  if (timeStat) {
    timeStat.textContent = formatTimeMMSS(state.elapsedTime);
  }
  if (arrivedStat) {
    arrivedStat.textContent = `${state.arrivedCount} / ${state.totalTrains}`;
  }
  if (errorsStat) {
    errorsStat.textContent = String(state.errorCount);
  }
  if (nextBtn) {
    nextBtn.classList.toggle('hidden', state.levelId >= 3);
  }

  modal.classList.remove('hidden');
}

export function hideOutcomeModal() {
  const modal = document.querySelector('#outcome-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}
