/**
 * js/state.js
 * Tiszta adatreprezentáció és szimulációs fizikai/gráfmodell modul.
 * Nem tartalmaz semmilyen DOM lekérdezést vagy megjelenítési hívást!
 */

export const CANVAS_WIDTH = 1040;
export const CANVAS_HEIGHT = 540;

export const WARNING_DISTANCE = 75;
export const CRITICAL_WARNING_DISTANCE = 46;
export const COLLISION_DISTANCE = 25;
export const SWITCH_HIT_RADIUS = 22;
export const SIGNAL_HIT_RADIUS = 22;
export const TRAIN_HIT_RADIUS = 20;

export const COLORS = {
  red: { key: 'red', name: 'Piros', hex: '#ef4444', border: '#fecaca' },
  blue: { key: 'blue', name: 'Kék', hex: '#3b82f6', border: '#bfdbfe' },
  yellow: { key: 'yellow', name: 'Sárga', hex: '#f59e0b', border: '#fde68a' },
  green: { key: 'green', name: 'Zöld', hex: '#10b981', border: '#a7f3d0' }
};

/**
 * 2D lineáris vektorinterpoláció (LERP):
 * P(t) = P1 + t * (P2 - P1), ahol t in [0, 1]
 */
export function lerp2D(p1, p2, t) {
  const clampedT = Math.max(0, Math.min(1, t));
  return {
    x: p1.x + (p2.x - p1.x) * clampedT,
    y: p1.y + (p2.y - p1.y) * clampedT
  };
}

/**
 * Euklideszi távolságszámítás két 2D pont között:
 * d = sqrt((x2 - x1)^2 + (y2 - y1)^2)
 */
export function euclideanDistance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}

/**
 * Másodperc formázása perc:másodperc (MM:SS) alakba
 */
export function formatTimeMMSS(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * A három rögzített topológiájú pálya definíciója.
 */
export const LEVEL_DEFINITIONS = {
  1: {
    id: 1,
    name: '1. szint: Kitérő vágány jelzőkkel',
    difficulty: 'Könnyű',
    fullTitle: '1. szint: Kitérő vágány jelzőkkel (Könnyű)',
    nodes: [
      { id: 'entry1', x: 95, y: 270, type: 'entry', label: 'Belépő →' },
      { id: 'sw1', x: 325, y: 270, type: 'switch', label: 'V1' },
      { id: 'wp_top', x: 495, y: 155, type: 'waypoint' },
      { id: 'wp_bot', x: 465, y: 385, type: 'waypoint' },
      { id: 'sw2', x: 650, y: 385, type: 'switch', label: 'V2' },
      { id: 'st1', x: 865, y: 155, type: 'station', color: 'red', label: '1. Vágány (Piros)', platformNumber: 1 },
      { id: 'st2', x: 865, y: 385, type: 'station', color: 'blue', label: '2. Vágány (Kék)', platformNumber: 2 },
      { id: 'dead1', x: 815, y: 485, type: 'deadend', label: 'Vágányvég' }
    ],
    edges: [
      { id: 'e1_in', from: 'entry1', to: 'sw1' },
      { id: 'e1_top_a', from: 'sw1', to: 'wp_top' },
      { id: 'e1_top_b', from: 'wp_top', to: 'st1' },
      { id: 'e1_bot_a', from: 'sw1', to: 'wp_bot' },
      { id: 'e1_bot_b', from: 'wp_bot', to: 'sw2' },
      { id: 'e1_sw2_blue', from: 'sw2', to: 'st2' },
      { id: 'e1_sw2_red', from: 'sw2', to: 'st1' },
      { id: 'e1_sw2_dead', from: 'sw2', to: 'dead1' }
    ],
    switches: [
      { id: 'sw1', nodeId: 'sw1', branches: ['e1_top_a', 'e1_bot_a'], activeBranchIndex: 0 },
      { id: 'sw2', nodeId: 'sw2', branches: ['e1_sw2_blue', 'e1_sw2_red', 'e1_sw2_dead'], activeBranchIndex: 0 }
    ],
    signals: [
      { id: 'sig1', edgeId: 'e1_in', progress: 0.56, isGreen: true, label: 'J1' },
      { id: 'sig2', edgeId: 'e1_top_b', progress: 0.35, isGreen: true, label: 'J2' },
      { id: 'sig3', edgeId: 'e1_bot_b', progress: 0.45, isGreen: true, label: 'J3' }
    ],
    schedule: [
      { id: 'T1', entryNodeId: 'entry1', spawnTime: 0.5, speed: 74, targetColor: 'red', trainName: 'Személy #101' },
      { id: 'T2', entryNodeId: 'entry1', spawnTime: 5.5, speed: 82, targetColor: 'blue', trainName: 'Gyors #204' },
      { id: 'T3', entryNodeId: 'entry1', spawnTime: 11.5, speed: 68, targetColor: 'red', trainName: 'Teher #309' },
      { id: 'T4', entryNodeId: 'entry1', spawnTime: 17.0, speed: 86, targetColor: 'blue', trainName: 'InterCity #402' }
    ]
  },

  2: {
    id: 2,
    name: '2. szint: Rendező-pályaudvar',
    difficulty: 'Közepes',
    fullTitle: '2. szint: Rendező-pályaudvar (Közepes)',
    nodes: [
      { id: 'entry1', x: 95, y: 165, type: 'entry', label: '1. Belépő →' },
      { id: 'entry2', x: 95, y: 375, type: 'entry', label: '2. Belépő →' },
      { id: 'sw1', x: 330, y: 165, type: 'switch', label: 'V1' },
      { id: 'sw2', x: 330, y: 375, type: 'switch', label: 'V2' },
      { id: 'sw3', x: 585, y: 270, type: 'switch', label: 'V3' },
      { id: 'st1', x: 865, y: 130, type: 'station', color: 'red', label: '1. Vágány (Piros)', platformNumber: 1 },
      { id: 'st2', x: 865, y: 270, type: 'station', color: 'yellow', label: '2. Vágány (Sárga)', platformNumber: 2 },
      { id: 'st3', x: 865, y: 410, type: 'station', color: 'blue', label: '3. Vágány (Kék)', platformNumber: 3 },
      { id: 'dead2', x: 525, y: 485, type: 'deadend', label: 'Vágányvég' }
    ],
    edges: [
      { id: 'e2_in1', from: 'entry1', to: 'sw1' },
      { id: 'e2_in2', from: 'entry2', to: 'sw2' },
      { id: 'e2_top_direct', from: 'sw1', to: 'st1' },
      { id: 'e2_top_cross', from: 'sw1', to: 'sw3' },
      { id: 'e2_bot_direct', from: 'sw2', to: 'st3' },
      { id: 'e2_bot_cross', from: 'sw2', to: 'sw3' },
      { id: 'e2_bot_dead', from: 'sw2', to: 'dead2' },
      { id: 'e2_mid_yellow', from: 'sw3', to: 'st2' },
      { id: 'e2_mid_red', from: 'sw3', to: 'st1' },
      { id: 'e2_mid_blue', from: 'sw3', to: 'st3' }
    ],
    switches: [
      { id: 'sw1', nodeId: 'sw1', branches: ['e2_top_direct', 'e2_top_cross'], activeBranchIndex: 0 },
      { id: 'sw2', nodeId: 'sw2', branches: ['e2_bot_direct', 'e2_bot_cross', 'e2_bot_dead'], activeBranchIndex: 0 },
      { id: 'sw3', nodeId: 'sw3', branches: ['e2_mid_yellow', 'e2_mid_red', 'e2_mid_blue'], activeBranchIndex: 0 }
    ],
    signals: [
      { id: 'sig1', edgeId: 'e2_in1', progress: 0.56, isGreen: true, label: 'J1' },
      { id: 'sig2', edgeId: 'e2_in2', progress: 0.56, isGreen: true, label: 'J2' },
      { id: 'sig3', edgeId: 'e2_top_direct', progress: 0.42, isGreen: true, label: 'J3' },
      { id: 'sig4', edgeId: 'e2_bot_direct', progress: 0.42, isGreen: true, label: 'J4' }
    ],
    schedule: [
      { id: 'T1', entryNodeId: 'entry1', spawnTime: 0.5, speed: 76, targetColor: 'red', trainName: 'Személy #201' },
      { id: 'T2', entryNodeId: 'entry2', spawnTime: 3.5, speed: 70, targetColor: 'blue', trainName: 'Teher #202' },
      { id: 'T3', entryNodeId: 'entry1', spawnTime: 7.5, speed: 88, targetColor: 'yellow', trainName: 'Gyors #203' },
      { id: 'T4', entryNodeId: 'entry2', spawnTime: 11.5, speed: 66, targetColor: 'red', trainName: 'Teher #204' },
      { id: 'T5', entryNodeId: 'entry2', spawnTime: 16.0, speed: 84, targetColor: 'yellow', trainName: 'InterCity #205' }
    ]
  },

  3: {
    id: 3,
    name: '3. szint: Fejpályaudvari csúcsforgalom',
    difficulty: 'Nehéz',
    fullTitle: '3. szint: Fejpályaudvari csúcsforgalom (Nehéz)',
    nodes: [
      { id: 'entry1', x: 95, y: 165, type: 'entry', label: '1. Belépő →' },
      { id: 'entry2', x: 95, y: 375, type: 'entry', label: '2. Belépő →' },
      { id: 'sw1', x: 330, y: 165, type: 'switch', label: 'V1' },
      { id: 'sw2', x: 330, y: 375, type: 'switch', label: 'V2' },
      { id: 'sw3', x: 545, y: 195, type: 'switch', label: 'V3' },
      { id: 'sw4', x: 545, y: 345, type: 'switch', label: 'V4' },
      { id: 'st1', x: 865, y: 110, type: 'station', color: 'red', label: '1. Vágány (Piros)', platformNumber: 1 },
      { id: 'st2', x: 865, y: 215, type: 'station', color: 'yellow', label: '2. Vágány (Sárga)', platformNumber: 2 },
      { id: 'st3', x: 865, y: 325, type: 'station', color: 'green', label: '3. Vágány (Zöld)', platformNumber: 3 },
      { id: 'st4', x: 865, y: 430, type: 'station', color: 'blue', label: '4. Vágány (Kék)', platformNumber: 4 },
      { id: 'dead3', x: 720, y: 492, type: 'deadend', label: 'Vágányvég' }
    ],
    edges: [
      { id: 'e3_in1', from: 'entry1', to: 'sw1' },
      { id: 'e3_in2', from: 'entry2', to: 'sw2' },
      { id: 'e3_top_straight', from: 'sw1', to: 'sw3' },
      { id: 'e3_top_cross', from: 'sw1', to: 'sw4' },
      { id: 'e3_bot_straight', from: 'sw2', to: 'sw4' },
      { id: 'e3_bot_cross', from: 'sw2', to: 'sw3' },
      { id: 'e3_sw3_p1', from: 'sw3', to: 'st1' },
      { id: 'e3_sw3_p2', from: 'sw3', to: 'st2' },
      { id: 'e3_sw4_p3', from: 'sw4', to: 'st3' },
      { id: 'e3_sw4_p4', from: 'sw4', to: 'st4' },
      { id: 'e3_sw4_dead', from: 'sw4', to: 'dead3' }
    ],
    switches: [
      { id: 'sw1', nodeId: 'sw1', branches: ['e3_top_straight', 'e3_top_cross'], activeBranchIndex: 0 },
      { id: 'sw2', nodeId: 'sw2', branches: ['e3_bot_straight', 'e3_bot_cross'], activeBranchIndex: 0 },
      { id: 'sw3', nodeId: 'sw3', branches: ['e3_sw3_p1', 'e3_sw3_p2'], activeBranchIndex: 0 },
      { id: 'sw4', nodeId: 'sw4', branches: ['e3_sw4_p3', 'e3_sw4_p4', 'e3_sw4_dead'], activeBranchIndex: 0 }
    ],
    signals: [
      { id: 'sig1', edgeId: 'e3_in1', progress: 0.56, isGreen: true, label: 'J1' },
      { id: 'sig2', edgeId: 'e3_in2', progress: 0.56, isGreen: true, label: 'J2' },
      { id: 'sig3', edgeId: 'e3_top_straight', progress: 0.5, isGreen: true, label: 'J3' },
      { id: 'sig4', edgeId: 'e3_bot_straight', progress: 0.5, isGreen: true, label: 'J4' }
    ],
    schedule: [
      { id: 'T1', entryNodeId: 'entry1', spawnTime: 0.5, speed: 78, targetColor: 'red', trainName: 'InterCity #301' },
      { id: 'T2', entryNodeId: 'entry2', spawnTime: 3.0, speed: 74, targetColor: 'green', trainName: 'Személy #302' },
      { id: 'T3', entryNodeId: 'entry1', spawnTime: 6.5, speed: 84, targetColor: 'blue', trainName: 'Gyors #303' },
      { id: 'T4', entryNodeId: 'entry2', spawnTime: 9.5, speed: 72, targetColor: 'yellow', trainName: 'Teher #304' },
      { id: 'T5', entryNodeId: 'entry1', spawnTime: 13.5, speed: 80, targetColor: 'green', trainName: 'Személy #305' },
      { id: 'T6', entryNodeId: 'entry2', spawnTime: 16.5, speed: 88, targetColor: 'red', trainName: 'Expressz #306' }
    ]
  }
};

/**
 * Csomópont megkeresése azonosító alapján
 */
export function getNodeById(state, nodeId) {
  return state.nodes.find((n) => n.id === nodeId) || null;
}

/**
 * Él megkeresése azonosító alapján
 */
export function getEdgeById(state, edgeId) {
  return state.edges.find((e) => e.id === edgeId) || null;
}

/**
 * Él geometriai adatainak (kezdőpont, végpont, hossz, irányvektor) kiszámítása
 */
export function getEdgeGeometry(state, edgeId) {
  const edge = getEdgeById(state, edgeId);
  if (!edge) {
    throw new Error(`Ismeretlen vágányél azonosító: ${edgeId}`);
  }
  const fromNode = getNodeById(state, edge.from);
  const toNode = getNodeById(state, edge.to);
  if (!fromNode || !toNode) {
    throw new Error(`Hiányzó csomópont az élhez: ${edgeId}`);
  }
  const length = Math.max(1, euclideanDistance(fromNode, toNode));
  const dirX = (toNode.x - fromNode.x) / length;
  const dirY = (toNode.y - fromNode.y) / length;
  const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
  return { fromNode, toNode, length, dirX, dirY, angle };
}

/**
 * Fényjelző fizikai koordinátájának kiszámítása a vágányélen
 */
export function getSignalPosition(state, signal) {
  const geom = getEdgeGeometry(state, signal.edgeId);
  const point = lerp2D(geom.fromNode, geom.toNode, signal.progress);
  return {
    x: point.x,
    y: point.y - 24,
    trackX: point.x,
    trackY: point.y
  };
}

/**
 * Új játékállapot létrehozása a kiválasztott pálya és játékosnév alapján
 */
export function createGameState(levelId = 1, playerName = 'Diszpécser') {
  const numericLevelId = Number(levelId) || 1;
  const def = LEVEL_DEFINITIONS[numericLevelId];
  if (!def) {
    throw new Error(`Érvénytelen pályaszint azonosító: ${levelId}`);
  }

  const nodes = def.nodes.map((n) => ({ ...n }));
  const edges = def.edges.map((e) => ({ ...e }));
  const switches = def.switches.map((sw) => ({
    ...sw,
    branches: [...sw.branches]
  }));
  const signals = def.signals.map((sig) => ({ ...sig }));
  const schedule = def.schedule.map((item) => ({
    ...item,
    spawned: false
  }));

  return {
    playerName: String(playerName || 'Diszpécser').trim(),
    levelId: def.id,
    levelName: def.name,
    difficulty: def.difficulty,
    fullTitle: def.fullTitle,
    status: 'running', // 'running' | 'paused' | 'victory' | 'gameover'
    elapsedTime: 0,
    totalTrains: schedule.length,
    arrivedCount: 0,
    errorCount: 0,
    nodes,
    edges,
    switches,
    signals,
    schedule,
    trains: [],
    dangerPairs: [],
    visualEffects: [],
    explosion: null,
    deadlockWarning: false,
    statusBanner: {
      text: `${def.fullTitle} elindult. Irányítsd biztonságosan a szerelvényeket!`,
      type: 'info'
    },
    outcomeReason: ''
  };
}

/**
 * Vizuális effekt hozzáadása a Canvas-hoz (pl. kisiklás, célba érés, téves peron)
 */
function addVisualEffect(state, x, y, text, color, duration = 2.4) {
  state.visualEffects.push({
    x,
    y,
    text,
    color,
    age: 0,
    duration
  });
}

/**
 * Következő csomópontból induló él meghatározása
 */
function resolveNextEdgeFromNode(state, node) {
  if (node.type === 'switch') {
    const sw = state.switches.find((s) => s.nodeId === node.id);
    if (!sw || !sw.branches[sw.activeBranchIndex]) {
      return null;
    }
    return sw.branches[sw.activeBranchIndex];
  }

  if (node.type === 'waypoint' || node.type === 'entry') {
    const outEdge = state.edges.find((e) => e.from === node.id);
    return outEdge ? outEdge.id : null;
  }

  return null;
}

/**
 * Vonat indítása a menetrend alapján, ha a belépési zóna szabad
 */
function updateTrainSpawning(state) {
  for (const item of state.schedule) {
    if (item.spawned) {
      continue;
    }

    if (state.elapsedTime >= item.spawnTime) {
      const entryNode = getNodeById(state, item.entryNodeId);
      if (!entryNode) {
        continue;
      }

      // Ellenőrizzük, hogy nincs-e közvetlenül a belépési ponton másik szerelvény
      const blockedByTrain = state.trains.some(
        (t) => t.active && euclideanDistance(t, entryNode) < 68
      );
      if (blockedByTrain) {
        continue;
      }

      const firstEdgeId = resolveNextEdgeFromNode(state, entryNode);
      if (!firstEdgeId) {
        continue;
      }

      const geom = getEdgeGeometry(state, firstEdgeId);
      item.spawned = true;

      state.trains.push({
        id: item.id,
        trainName: item.trainName,
        targetColor: item.targetColor,
        edgeId: firstEdgeId,
        progress: 0.02,
        x: geom.fromNode.x,
        y: geom.fromNode.y,
        dirX: geom.dirX,
        dirY: geom.dirY,
        angle: geom.angle,
        baseSpeed: item.speed,
        speed: item.speed,
        manualBrake: false,
        waitingAtSignal: false,
        inDanger: false,
        dangerLevel: 'none',
        active: true,
        stateLabel: ''
      });

      const colorInfo = COLORS[item.targetColor];
      state.statusBanner = {
        text: `Új szerelvény lépett a pályára: ${item.trainName} → Cél: ${colorInfo ? colorInfo.name : item.targetColor} peron.`,
        type: 'info'
      };
    }
  }
}

/**
 * Egyetlen szerelvény mozgatása a topológiai gráfon dt időegységgel
 */
function moveSingleTrain(state, train, dt) {
  if (!train.active) {
    return;
  }

  // Kézi vészfékezés ellenőrzése
  if (train.manualBrake) {
    train.speed = 0;
    train.waitingAtSignal = false;
    train.stateLabel = 'FÉK';
    return;
  }

  const geom = getEdgeGeometry(state, train.edgeId);

  // Ellenőrizzük, van-e vörös fényjelző a vonat előtt az aktuális élen
  const signalOnEdge = state.signals.find((s) => s.edgeId === train.edgeId);
  const stopOffsetNormalized = 22 / geom.length;

  if (signalOnEdge && !signalOnEdge.isGreen) {
    const stopProgress = Math.max(0.05, signalOnEdge.progress - stopOffsetNormalized);
    if (train.progress <= stopProgress + 0.02) {
      const nextProgressCandidate = train.progress + (train.baseSpeed * dt) / geom.length;
      if (nextProgressCandidate >= stopProgress) {
        train.progress = stopProgress;
        const pos = lerp2D(geom.fromNode, geom.toNode, train.progress);
        train.x = pos.x;
        train.y = pos.y;
        train.speed = 0;
        train.waitingAtSignal = true;
        train.stateLabel = 'TILOS';
        return;
      }
    }
  }

  train.waitingAtSignal = false;
  train.stateLabel = '';
  train.speed = train.baseSpeed;

  let remainingDistance = train.baseSpeed * dt;

  while (remainingDistance > 0 && train.active) {
    const currentGeom = getEdgeGeometry(state, train.edgeId);
    const distToEnd = (1 - train.progress) * currentGeom.length;

    if (remainingDistance < distToEnd) {
      train.progress += remainingDistance / currentGeom.length;
      remainingDistance = 0;
      const pos = lerp2D(currentGeom.fromNode, currentGeom.toNode, train.progress);
      train.x = pos.x;
      train.y = pos.y;
      train.dirX = currentGeom.dirX;
      train.dirY = currentGeom.dirY;
      train.angle = currentGeom.angle;
    } else {
      remainingDistance -= distToEnd;
      const targetNode = currentGeom.toNode;
      train.x = targetNode.x;
      train.y = targetNode.y;

      // Célállomás (peron) elérése
      if (targetNode.type === 'station') {
        train.active = false;
        if (targetNode.color === train.targetColor) {
          state.arrivedCount += 1;
          addVisualEffect(state, targetNode.x - 40, targetNode.y - 25, '✓ CÉLBA ÉRT', '#10b981');
          state.statusBanner = {
            text: `${train.trainName} sikeresen befutott a helyes (${targetNode.label}) peronra!`,
            type: 'success'
          };
        } else {
          state.errorCount += 1;
          addVisualEffect(state, targetNode.x - 50, targetNode.y - 25, '✗ TÉVES PERON! (+1 Hiba)', '#f59e0b');
          state.statusBanner = {
            text: `Hiba! ${train.trainName} téves célállomásra (${targetNode.label}) érkezett! (+1 hibapont)`,
            type: 'warning'
          };
        }
        return;
      }

      // Nyitott vágányvég (csonkavágány) -> Kisiklás!
      if (targetNode.type === 'deadend') {
        train.active = false;
        state.errorCount += 1;
        addVisualEffect(state, targetNode.x - 45, targetNode.y - 24, '💥 KISIKLÁS! (+1 Hiba)', '#ef4444', 3.0);
        state.statusBanner = {
          text: `Kisiklás! ${train.trainName} nyitott vágányvégre futott! (+1 hibapont)`,
          type: 'danger'
        };
        return;
      }

      // Továbbhaladás váltón vagy köztes csomóponton keresztül
      const nextEdgeId = resolveNextEdgeFromNode(state, targetNode);
      if (!nextEdgeId) {
        train.active = false;
        state.errorCount += 1;
        addVisualEffect(state, targetNode.x, targetNode.y - 20, '💥 KISIKLÁS! (+1 Hiba)', '#ef4444', 3.0);
        state.statusBanner = {
          text: `Kisiklás! ${train.trainName} nem bekötött váltóra futott! (+1 hibapont)`,
          type: 'danger'
        };
        return;
      }

      train.edgeId = nextEdgeId;
      train.progress = 0;
      const nextGeom = getEdgeGeometry(state, nextEdgeId);
      train.dirX = nextGeom.dirX;
      train.dirY = nextGeom.dirY;
      train.angle = nextGeom.angle;
    }
  }
}

/**
 * Fizikai ütközésvizsgálat és korai veszélyjelzés (75px biztonsági zóna)
 */
function checkCollisionsAndWarnings(state) {
  state.dangerPairs = [];
  const activeTrains = state.trains.filter((t) => t.active);

  for (const t of activeTrains) {
    t.inDanger = false;
    t.dangerLevel = 'none';
  }

  for (let i = 0; i < activeTrains.length; i += 1) {
    for (let j = i + 1; j < activeTrains.length; j += 1) {
      const tA = activeTrains[i];
      const tB = activeTrains[j];
      const dist = euclideanDistance(tA, tB);

      // Kritikus ütközés -> Katasztrófa (Game Over)
      if (dist < COLLISION_DISTANCE) {
        tA.active = false;
        tB.active = false;
        const midX = (tA.x + tB.x) / 2;
        const midY = (tA.y + tB.y) / 2;

        state.explosion = {
          x: midX,
          y: midY,
          trainAName: tA.trainName,
          trainBName: tB.trainName
        };
        state.status = 'gameover';
        state.outcomeReason = `Katasztrófa! ${tA.trainName} és ${tB.trainName} összeütközött a nyílt pályán!`;
        state.statusBanner = {
          text: state.outcomeReason,
          type: 'danger'
        };
        return;
      }

      // Korai figyelmeztetés: 75 képpontos biztonsági zónán belül
      if (dist < WARNING_DISTANCE) {
        const severity = dist < CRITICAL_WARNING_DISTANCE ? 'critical' : 'warning';
        tA.inDanger = true;
        tB.inDanger = true;
        if (tA.dangerLevel !== 'critical') {
          tA.dangerLevel = severity;
        }
        if (tB.dangerLevel !== 'critical') {
          tB.dangerLevel = severity;
        }

        state.dangerPairs.push({
          trainA: tA,
          trainB: tB,
          distance: dist,
          severity
        });
      }
    }
  }

  if (state.dangerPairs.length > 0 && state.status === 'running') {
    state.statusBanner = {
      text: '⚠️ Ütközésveszély! Két szerelvény biztonsági távolságon (75px) belülre került! Használj vészféket (jobb klikk)!',
      type: 'warning'
    };
  }
}

/**
 * Holtpont (Deadlock) figyelése és futam végi győzelmi feltétel ellenőrzése
 */
function checkSimulationCompletion(state) {
  if (state.status !== 'running') {
    return;
  }

  const allSpawned = state.schedule.every((item) => item.spawned);
  const activeTrains = state.trains.filter((t) => t.active);

  // Holtpont (Deadlock) figyelmeztetés, ha minden aktív vonat áll
  if (activeTrains.length > 0 && activeTrains.every((t) => t.manualBrake || t.waitingAtSignal)) {
    state.deadlockWarning = true;
  } else {
    state.deadlockWarning = false;
  }

  // Ha minden menetrendi szerelvény feldolgozásra került
  if (allSpawned && activeTrains.length === 0) {
    state.status = 'victory';
    if (state.errorCount === 0) {
      state.outcomeReason = 'Tökéletes forgalomirányítás! Minden szerelvény baleset- és hibamentesen befutott a kijelölt peronjára.';
    } else {
      state.outcomeReason = `A menetrend véget ért, de ${state.errorCount} hibapont (kisiklás vagy téves peron) keletkezett.`;
    }
    state.statusBanner = {
      text: state.outcomeReason,
      type: state.errorCount === 0 ? 'success' : 'warning'
    };
  }
}

/**
 * A szimuláció fő állapotfrissítő lépése (dt másodperc időközzel)
 */
export function updateSimulation(state, dt) {
  if (!state || state.status !== 'running') {
    return;
  }

  const safeDt = Math.min(0.05, Math.max(0, Number(dt) || 0));
  state.elapsedTime += safeDt;

  // Lebegő vizuális effektek öregítése
  for (let i = state.visualEffects.length - 1; i >= 0; i -= 1) {
    state.visualEffects[i].age += safeDt;
    if (state.visualEffects[i].age >= state.visualEffects[i].duration) {
      state.visualEffects.splice(i, 1);
    }
  }

  updateTrainSpawning(state);

  for (const train of state.trains) {
    if (train.active) {
      moveSingleTrain(state, train, safeDt);
    }
  }

  checkCollisionsAndWarnings(state);
  checkSimulationCompletion(state);
}

/**
 * Bal egérgomb kattintás kezelése a Canvas koordinátáin (váltó vagy fényjelző)
 */
export function handleCanvasLeftClick(state, canvasX, canvasY) {
  if (!state || (state.status !== 'running' && state.status !== 'paused')) {
    return false;
  }

  const clickPoint = { x: canvasX, y: canvasY };

  // 1. Váltók ellenőrzése
  for (const sw of state.switches) {
    const node = getNodeById(state, sw.nodeId);
    if (!node) {
      continue;
    }

    if (euclideanDistance(clickPoint, node) <= SWITCH_HIT_RADIUS) {
      // Ellenőrizzük, halad-e éppen vonat közvetlenül a váltó csomópontján
      const trainOnSwitch = state.trains.find(
        (t) => t.active && euclideanDistance(t, node) < 14
      );
      if (trainOnSwitch) {
        trainOnSwitch.active = false;
        state.errorCount += 1;
        addVisualEffect(state, node.x - 45, node.y - 25, '💥 KISIKLÁS! (+1 Hiba)', '#ef4444', 3.0);
        state.statusBanner = {
          text: `Kisiklás! A(z) ${node.label} váltót közvetlenül az áthaladó ${trainOnSwitch.trainName} alatt állítottad át!`,
          type: 'danger'
        };
        checkSimulationCompletion(state);
        return true;
      }

      sw.activeBranchIndex = (sw.activeBranchIndex + 1) % sw.branches.length;
      const activeEdge = getEdgeById(state, sw.branches[sw.activeBranchIndex]);
      const targetNode = activeEdge ? getNodeById(state, activeEdge.to) : null;
      state.statusBanner = {
        text: `Váltó (${node.label}) átállítva → irány: ${targetNode && targetNode.label ? targetNode.label : 'következő vágányág'}.`,
        type: 'info'
      };
      return true;
    }
  }

  // 2. Kétoptikás fényjelzők ellenőrzése
  for (const sig of state.signals) {
    const sigPos = getSignalPosition(state, sig);
    const hitCenter = { x: sigPos.x, y: sigPos.y };
    const trackCenter = { x: sigPos.trackX, y: sigPos.trackY };

    if (
      euclideanDistance(clickPoint, hitCenter) <= SIGNAL_HIT_RADIUS ||
      euclideanDistance(clickPoint, trackCenter) <= 18
    ) {
      sig.isGreen = !sig.isGreen;
      state.statusBanner = {
        text: `Fényjelző (${sig.label}) átkapcsolva: ${sig.isGreen ? 'ZÖLD (Szabad az út!)' : 'VÖRÖS (Megállj!)'}.`,
        type: sig.isGreen ? 'success' : 'warning'
      };
      return true;
    }
  }

  return false;
}

/**
 * Jobb egérgomb kattintás kezelése a Canvas koordinátáin (Kézi vészfékezés)
 */
export function handleCanvasRightClick(state, canvasX, canvasY) {
  if (!state || (state.status !== 'running' && state.status !== 'paused')) {
    return false;
  }

  const clickPoint = { x: canvasX, y: canvasY };

  for (const train of state.trains) {
    if (!train.active) {
      continue;
    }

    if (euclideanDistance(clickPoint, train) <= TRAIN_HIT_RADIUS) {
      train.manualBrake = !train.manualBrake;
      train.stateLabel = train.manualBrake ? 'FÉK' : (train.waitingAtSignal ? 'TILOS' : '');
      state.statusBanner = {
        text: train.manualBrake
          ? `🛑 Kézi vészfékezés aktiválva: ${train.trainName} megállt!`
          : `▶ Vészfék feloldva: ${train.trainName} folytatja útját.`,
        type: train.manualBrake ? 'warning' : 'info'
      };
      return true;
    }
  }

  return false;
}

/**
 * Játékállás szerializálása JSON mentéshez (localStorage előírások szerint)
 */
export function serializeState(state) {
  if (!state) {
    throw new Error('Nincs menthető játékállapot.');
  }

  return {
    savedAt: new Date().toISOString(),
    playerName: state.playerName,
    levelId: state.levelId,
    elapsedTime: state.elapsedTime,
    arrivedCount: state.arrivedCount,
    errorCount: state.errorCount,
    status: state.status === 'running' ? 'running' : 'paused',
    switches: state.switches.map((sw) => ({
      id: sw.id,
      activeBranchIndex: sw.activeBranchIndex
    })),
    signals: state.signals.map((sig) => ({
      id: sig.id,
      isGreen: sig.isGreen
    })),
    schedule: state.schedule.map((item) => ({
      id: item.id,
      spawned: item.spawned
    })),
    trains: state.trains.map((t) => ({
      id: t.id,
      trainName: t.trainName,
      targetColor: t.targetColor,
      edgeId: t.edgeId,
      progress: t.progress,
      x: t.x,
      y: t.y,
      dirX: t.dirX,
      dirY: t.dirY,
      angle: t.angle,
      baseSpeed: t.baseSpeed,
      speed: t.speed,
      manualBrake: t.manualBrake,
      waitingAtSignal: t.waitingAtSignal,
      active: t.active,
      stateLabel: t.stateLabel
    }))
  };
}

/**
 * Mentett JSON állapot visszaállítása teljes szimulációs állapottérré
 */
export function deserializeState(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Érvénytelen vagy sérült mentési adat.');
  }

  const restored = createGameState(payload.levelId, payload.playerName);
  restored.elapsedTime = Number(payload.elapsedTime) || 0;
  restored.arrivedCount = Number(payload.arrivedCount) || 0;
  restored.errorCount = Number(payload.errorCount) || 0;
  restored.status = 'running';

  if (Array.isArray(payload.switches)) {
    for (const savedSw of payload.switches) {
      const targetSw = restored.switches.find((s) => s.id === savedSw.id);
      if (targetSw) {
        const idx = Number(savedSw.activeBranchIndex) || 0;
        targetSw.activeBranchIndex = idx % targetSw.branches.length;
      }
    }
  }

  if (Array.isArray(payload.signals)) {
    for (const savedSig of payload.signals) {
      const targetSig = restored.signals.find((s) => s.id === savedSig.id);
      if (targetSig) {
        targetSig.isGreen = Boolean(savedSig.isGreen);
      }
    }
  }

  if (Array.isArray(payload.schedule)) {
    for (const savedSched of payload.schedule) {
      const targetSched = restored.schedule.find((s) => s.id === savedSched.id);
      if (targetSched) {
        targetSched.spawned = Boolean(savedSched.spawned);
      }
    }
  }

  if (Array.isArray(payload.trains)) {
    restored.trains = payload.trains.map((t) => ({
      ...t,
      inDanger: false,
      dangerLevel: 'none'
    }));
  }

  restored.statusBanner = {
    text: `Mentett játékállás sikeresen betöltve (${restored.playerName} – ${formatTimeMMSS(restored.elapsedTime)}).`,
    type: 'success'
  };

  return restored;
}
