// Vezérlő modul: játékhurok, eseménykezelés, mentés/betöltés és ranglista

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  LEVEL_DEFINITIONS,
  createGameState,
  updateSimulation,
  handleCanvasLeftClick,
  handleCanvasRightClick,
  serializeState,
  deserializeState,
  formatTimeMMSS
} from './state.js';

import {
  render,
  renderLeaderboard,
  showOutcomeModal,
  hideOutcomeModal
} from './render.js';

const STORAGE_KEY_SAVE = 'vasut_szimulator_saved_state_v2';
const STORAGE_KEY_LEADERBOARD = 'vasut_szimulator_leaderboard_v2';

const appController = {
  state: null,
  ctx: null,
  canvas: null,
  selectedMenuLevelId: 1,
  activeLeaderboardLevelId: 1,
  lastFrameTime: 0,
  animationFrameId: null,
  outcomeHandled: false
};

function loadAllLeaderboards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LEADERBOARD);
    if (!raw) {
      return { 1: [], 2: [], 3: [] };
    }
    const parsed = JSON.parse(raw);
    return {
      1: Array.isArray(parsed[1]) ? parsed[1] : [],
      2: Array.isArray(parsed[2]) ? parsed[2] : [],
      3: Array.isArray(parsed[3]) ? parsed[3] : []
    };
  } catch (err) {
    console.error('Ranglista olvasási hiba:', err);
    return { 1: [], 2: [], 3: [] };
  }
}

// Új eredmény mentése a helyi ranglistába (hibapont, majd idő alapján rendezve)
function recordLeaderboardEntry(state) {
  try {
    const boards = loadAllLeaderboards();
    const levelKey = Number(state.levelId) || 1;
    if (!Array.isArray(boards[levelKey])) {
      boards[levelKey] = [];
    }

    const now = new Date();
    const dateString = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    boards[levelKey].push({
      playerName: state.playerName,
      elapsedSeconds: Math.floor(state.elapsedTime),
      formattedTime: formatTimeMMSS(state.elapsedTime),
      errorCount: state.errorCount,
      date: dateString
    });

    boards[levelKey].sort((a, b) => {
      if (a.errorCount !== b.errorCount) {
        return a.errorCount - b.errorCount;
      }
      return a.elapsedSeconds - b.elapsedSeconds;
    });

    boards[levelKey] = boards[levelKey].slice(0, 15);
    localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(boards));
    refreshLeaderboardUI(appController.activeLeaderboardLevelId);
  } catch (err) {
    console.error('Ranglista mentési hiba:', err);
  }
}

function refreshLeaderboardUI(levelId) {
  appController.activeLeaderboardLevelId = Number(levelId) || 1;
  const boards = loadAllLeaderboards();
  renderLeaderboard(boards[appController.activeLeaderboardLevelId] || [], appController.activeLeaderboardLevelId);
}

function refreshSavedGamePreview() {
  const previewEl = document.querySelector('#saved-game-preview');
  if (!previewEl) {
    return;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVE);
    if (!raw) {
      previewEl.classList.add('hidden');
      previewEl.textContent = '';
      return;
    }

    const saved = JSON.parse(raw);
    const levelDef = LEVEL_DEFINITIONS[saved.levelId];
    const levelTitle = levelDef ? levelDef.fullTitle : `${saved.levelId}. szint`;

    previewEl.textContent = `Mentett játékállás: ${saved.playerName} | ${levelTitle} | Idő: ${formatTimeMMSS(saved.elapsedTime)} | Célba ért: ${saved.arrivedCount}`;
    previewEl.classList.remove('hidden');
  } catch (err) {
    console.error('Mentett állás előnézet hiba:', err);
    previewEl.classList.add('hidden');
  }
}

function saveCurrentGame() {
  if (!appController.state) {
    return;
  }

  try {
    const serialized = serializeState(appController.state);
    localStorage.setItem(STORAGE_KEY_SAVE, JSON.stringify(serialized));
    refreshSavedGamePreview();
    appController.state.statusBanner = {
      text: `Játékállás elmentve (${formatTimeMMSS(appController.state.elapsedTime)}).`,
      type: 'success'
    };
    render(appController.ctx, appController.state);
  } catch (err) {
    console.error('Mentési hiba:', err);
    appController.state.statusBanner = {
      text: `Hiba a mentés során: ${err.message}`,
      type: 'danger'
    };
    render(appController.ctx, appController.state);
  }
}

function loadSavedGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVE);
    if (!raw) {
      const nameError = document.querySelector('#name-error');
      if (nameError && !document.querySelector('#start-screen').classList.contains('hidden')) {
        nameError.textContent = 'Nem található korábban elmentett játékállás!';
        nameError.classList.remove('hidden');
      } else if (appController.state) {
        appController.state.statusBanner = {
          text: 'Nincs elmentett játékállás a böngészőben!',
          type: 'warning'
        };
        render(appController.ctx, appController.state);
      }
      return;
    }

    const parsed = JSON.parse(raw);
    const restoredState = deserializeState(parsed);

    const nameInput = document.querySelector('#player-name-input');
    if (nameInput) {
      nameInput.value = restoredState.playerName;
    }

    appController.state = restoredState;
    appController.outcomeHandled = false;
    hideOutcomeModal();
    switchScreen('game');
    appController.lastFrameTime = performance.now();
    render(appController.ctx, appController.state);
  } catch (err) {
    console.error('Betöltési hiba:', err);
    if (appController.state) {
      appController.state.statusBanner = {
        text: `Hiba a betöltéskor: ${err.message}`,
        type: 'danger'
      };
      render(appController.ctx, appController.state);
    }
  }
}

function switchScreen(screenName) {
  const startScreen = document.querySelector('#start-screen');
  const gameScreen = document.querySelector('#game-screen');

  if (!startScreen || !gameScreen) {
    return;
  }

  if (screenName === 'game') {
    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
  } else {
    gameScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    hideOutcomeModal();
    refreshSavedGamePreview();
    refreshLeaderboardUI(appController.activeLeaderboardLevelId);
  }
}

function startNewSimulation(levelId, explicitPlayerName = null) {
  const nameInput = document.querySelector('#player-name-input');
  const nameError = document.querySelector('#name-error');

  const candidateName = explicitPlayerName !== null
    ? explicitPlayerName
    : (nameInput ? nameInput.value.trim() : '');

  if (!candidateName) {
    if (nameInput) {
      nameInput.classList.add('input-invalid');
      nameInput.focus();
    }
    if (nameError) {
      nameError.textContent = 'A szimuláció indításához kötelező megadni a neved!';
      nameError.classList.remove('hidden');
    }
    return;
  }

  if (nameInput) {
    nameInput.classList.remove('input-invalid');
  }
  if (nameError) {
    nameError.classList.add('hidden');
  }

  try {
    appController.state = createGameState(levelId, candidateName);
    appController.outcomeHandled = false;
    hideOutcomeModal();
    switchScreen('game');
    appController.lastFrameTime = performance.now();
    render(appController.ctx, appController.state);
  } catch (err) {
    console.error('Indítási hiba:', err);
  }
}

// 60 FPS játékhurok
function gameLoop(timestamp) {
  if (!appController.lastFrameTime) {
    appController.lastFrameTime = timestamp;
  }

  const dt = (timestamp - appController.lastFrameTime) / 1000;
  appController.lastFrameTime = timestamp;

  if (appController.state) {
    try {
      if (appController.state.status === 'running') {
        updateSimulation(appController.state, dt);
      }

      render(appController.ctx, appController.state);

      if (
        (appController.state.status === 'victory' || appController.state.status === 'gameover') &&
        !appController.outcomeHandled
      ) {
        appController.outcomeHandled = true;
        if (appController.state.status === 'victory') {
          recordLeaderboardEntry(appController.state);
        }
        showOutcomeModal(appController.state);
      }
    } catch (err) {
      console.error('Játékhurok hiba:', err);
    }
  }

  appController.animationFrameId = requestAnimationFrame(gameLoop);
}

// Egérpozíció átszámítása a Canvas belső méretére
function getCanvasCoordinates(event) {
  const rect = appController.canvas.getBoundingClientRect();
  const scaleX = CANVAS_WIDTH / rect.width;
  const scaleY = CANVAS_HEIGHT / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

function setupEventDelegation() {
  const appShell = document.querySelector('.app-shell');
  const nameInput = document.querySelector('#player-name-input');
  const hudLevelSelect = document.querySelector('#hud-level-select');

  if (nameInput) {
    nameInput.addEventListener('input', () => {
      nameInput.classList.remove('input-invalid');
      const nameError = document.querySelector('#name-error');
      if (nameError) {
        nameError.classList.add('hidden');
      }
    });
  }

  if (hudLevelSelect) {
    hudLevelSelect.addEventListener('change', (event) => {
      const newLevelId = Number(event.target.value) || 1;
      const currentName = appController.state ? appController.state.playerName : 'Játékos';
      appController.selectedMenuLevelId = newLevelId;
      startNewSimulation(newLevelId, currentName);
    });
  }

  if (appShell) {
    appShell.addEventListener('click', (event) => {
      const levelCard = event.target.closest('.level-card');
      if (levelCard) {
        const chosenId = Number(levelCard.dataset.levelId) || 1;
        appController.selectedMenuLevelId = chosenId;
        document.querySelectorAll('.level-card').forEach((card) => {
          card.classList.toggle('selected', Number(card.dataset.levelId) === chosenId);
        });
        refreshLeaderboardUI(chosenId);
        return;
      }

      const tabBtn = event.target.closest('.tab-btn');
      if (tabBtn && tabBtn.dataset.leaderboardLevel) {
        refreshLeaderboardUI(Number(tabBtn.dataset.leaderboardLevel));
        return;
      }

      const button = event.target.closest('button');
      if (!button) {
        return;
      }

      switch (button.id) {
        case 'btn-start-sim':
          startNewSimulation(appController.selectedMenuLevelId);
          break;

        case 'btn-load-menu':
        case 'btn-load-game':
          loadSavedGame();
          break;

        case 'btn-open-rules':
        case 'btn-rules-game': {
          const rulesModal = document.querySelector('#rules-modal');
          if (rulesModal) {
            rulesModal.classList.remove('hidden');
          }
          break;
        }

        case 'btn-close-rules':
        case 'btn-close-rules-x': {
          const rulesModal = document.querySelector('#rules-modal');
          if (rulesModal) {
            rulesModal.classList.add('hidden');
          }
          break;
        }

        case 'btn-clear-leaderboard': {
          try {
            localStorage.removeItem(STORAGE_KEY_LEADERBOARD);
            refreshLeaderboardUI(appController.activeLeaderboardLevelId);
          } catch (err) {
            console.error('Ranglista törlési hiba:', err);
          }
          break;
        }

        case 'btn-pause-resume': {
          if (!appController.state) {
            break;
          }
          if (appController.state.status === 'running') {
            appController.state.status = 'paused';
            appController.state.statusBanner = {
              text: 'Szimuláció szüneteltetve.',
              type: 'warning'
            };
          } else if (appController.state.status === 'paused') {
            appController.state.status = 'running';
            appController.lastFrameTime = performance.now();
            appController.state.statusBanner = {
              text: 'Szimuláció folytatva.',
              type: 'info'
            };
          }
          render(appController.ctx, appController.state);
          break;
        }

        case 'btn-reset':
        case 'btn-modal-retry': {
          if (appController.state) {
            startNewSimulation(appController.state.levelId, appController.state.playerName);
          }
          break;
        }

        case 'btn-modal-next': {
          if (appController.state && appController.state.levelId < 3) {
            const nextLevel = appController.state.levelId + 1;
            appController.selectedMenuLevelId = nextLevel;
            startNewSimulation(nextLevel, appController.state.playerName);
          }
          break;
        }

        case 'btn-save':
          saveCurrentGame();
          break;

        case 'btn-back-menu':
        case 'btn-modal-menu':
          if (appController.state && appController.state.status === 'running') {
            appController.state.status = 'paused';
          }
          switchScreen('start');
          break;

        default:
          break;
      }
    });
  }

  if (appController.canvas) {
    appController.canvas.addEventListener('click', (event) => {
      if (!appController.state) {
        return;
      }
      const coords = getCanvasCoordinates(event);
      const changed = handleCanvasLeftClick(appController.state, coords.x, coords.y);
      if (changed) {
        render(appController.ctx, appController.state);
      }
    });

    appController.canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      if (!appController.state) {
        return;
      }
      const coords = getCanvasCoordinates(event);
      const changed = handleCanvasRightClick(appController.state, coords.x, coords.y);
      if (changed) {
        render(appController.ctx, appController.state);
      }
    });
  }
}

function initApp() {
  try {
    const canvas = document.querySelector('#railway-canvas');
    if (!canvas) {
      throw new Error('A #railway-canvas elem nem található.');
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('A Canvas 2D kontextus nem érhető el.');
    }

    appController.canvas = canvas;
    appController.ctx = ctx;

    setupEventDelegation();
    refreshSavedGamePreview();
    refreshLeaderboardUI(1);

    appController.lastFrameTime = performance.now();
    appController.animationFrameId = requestAnimationFrame(gameLoop);
  } catch (err) {
    console.error('Inicializálási hiba:', err);
  }
}

initApp();
