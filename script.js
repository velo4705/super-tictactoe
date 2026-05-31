const mainBoard = document.getElementById('mainBoard');
const statusDisplay = document.querySelector('.status');
const aiThinking = document.getElementById('aiThinking');
const resetBtn = document.getElementById('resetBtn');
const themeToggle = document.getElementById('themeToggle');
const difficultySelect = document.getElementById('difficulty');

// New controls and modals
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const rulesToggle = document.getElementById('rulesToggle');
const rulesOverlay = document.getElementById('rulesOverlay');
const rulesClose = document.getElementById('rulesClose');
const rulesGotItBtn = document.getElementById('rulesGotItBtn');

const HUMAN = 'X';
const COMPUTER = 'O';
const PLAYER2 = 'O'; // Alias for second human player in Pass‑and‑Play

let gameState = {
    miniBoards: Array(9).fill(null).map(() => Array(9).fill('')),
    mainBoard: Array(9).fill(''),
    currentPlayer: HUMAN,
    gameActive: true,
    difficulty: 'medium',
    mode: 'single', // 'single' or 'pass'
    lastMove: null
};

let history = [];
let redoStack = [];

const winConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

// HTML5 Web Audio Synthesizer
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    try {
        initAudio();
        if (!audioCtx) return;
        
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        const now = audioCtx.currentTime;
        
        if (type === 'humanMove') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.1);
        } 
        else if (type === 'computerMove') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.exponentialRampToValueAtTime(250, now + 0.15);
            
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        }
        else if (type === 'boardWin') {
            const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
            notes.forEach((freq, idx) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                
                gain.gain.setValueAtTime(0.1, now + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.15);
                
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.15);
            });
        }
        else if (type === 'gameWin') {
            const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 1046.50]; // C4, E4, G4, C5, E5, C6
            notes.forEach((freq, idx) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.06);
                
                gain.gain.setValueAtTime(0.12, now + idx * 0.06);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.4);
                
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now + idx * 0.06);
                osc.stop(now + idx * 0.06 + 0.4);
            });
        }
        else if (type === 'gameLose') {
            const notes = [392.00, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4
            notes.forEach((freq, idx) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, now + idx * 0.12);
                
                gain.gain.setValueAtTime(0.08, now + idx * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.25);
                
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now + idx * 0.12);
                osc.stop(now + idx * 0.12 + 0.25);
            });
        }
        else if (type === 'click') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.03);
        }
    } catch (e) {
        console.warn('Audio failed to play', e);
    }
}

// Action History State Managers
function saveState() {
    history.push(JSON.parse(JSON.stringify(gameState)));
    redoStack = [];
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
    const isHumanTurnOrOver = gameState.currentPlayer === HUMAN || !gameState.gameActive;
    undoBtn.disabled = history.length === 0 || !isHumanTurnOrOver;
    redoBtn.disabled = redoStack.length === 0 || !isHumanTurnOrOver;
}

function undo() {
    if (history.length === 0) return;
    playSound('click');
    redoStack.push(JSON.parse(JSON.stringify(gameState)));
    gameState = history.pop();
    updateUndoRedoButtons();
    renderBoard();
}

function redo() {
    if (redoStack.length === 0) return;
    playSound('click');
    history.push(JSON.parse(JSON.stringify(gameState)));
    gameState = redoStack.pop();
    updateUndoRedoButtons();
    renderBoard();
}

// Global Board Renderer & Sync System
function renderBoard() {
    mainBoard.innerHTML = '';
    resizeBoard();
    
    for (let i = 0; i < 9; i++) {
        const miniBoard = document.createElement('div');
        miniBoard.className = 'mini-board';
        miniBoard.dataset.boardIndex = i;
        
        const winner = gameState.mainBoard[i];
        if (winner) {
            miniBoard.innerHTML = winner;
            miniBoard.classList.add('won', winner.toLowerCase());
        } else {
            const miniGrid = document.createElement('div');
            miniGrid.className = 'mini-grid';
            
            for (let j = 0; j < 9; j++) {
                const cell = document.createElement('div');
                cell.className = 'mini-cell';
                cell.dataset.boardIndex = i;
                cell.dataset.cellIndex = j;
                
                const cellVal = gameState.miniBoards[i][j];
                if (cellVal) {
                    cell.textContent = cellVal;
                    cell.classList.add('taken', cellVal.toLowerCase());
                }
                
                cell.addEventListener('click', handleCellClick);
                miniGrid.appendChild(cell);
            }
            miniBoard.appendChild(miniGrid);
        }
        mainBoard.appendChild(miniBoard);
    }
    
    highlightLastMove();
    
    updateOpponentDisplay();

    if (gameState.gameActive) {
        if (gameState.currentPlayer === HUMAN) {
            statusDisplay.textContent = 'Your turn (X)';
        } else if (gameState.mode === 'pass' && gameState.currentPlayer === PLAYER2) {
            statusDisplay.textContent = "Player 2's turn (O)";
        } else {
            statusDisplay.textContent = 'Computer thinking...';
            statusDisplay.style.color = 'var(--color-o)';
        }
        statusDisplay.style.fontSize = '';
    } else {
        const gameWinner = checkGameWinnerNoSideEffects();
        if (gameWinner === 'draw') {
            statusDisplay.textContent = "It's a Draw!";
            statusDisplay.style.color = 'var(--text-secondary)';
            statusDisplay.style.fontSize = '1.5rem';
        } else if (gameWinner) {
            const winnerText = gameWinner === HUMAN ? 'You Win!' : (gameState.mode === 'pass' ? 'Player 2 Wins!' : 'Computer Wins!');
            statusDisplay.textContent = winnerText;
            statusDisplay.style.color = '';
            statusDisplay.style.fontSize = '1.5rem';
        }
    }
}

function checkGameWinnerNoSideEffects() {
    for (let condition of winConditions) {
        const [a, b, c] = condition;
        if (gameState.mainBoard[a] && 
            gameState.mainBoard[a] === gameState.mainBoard[b] && 
            gameState.mainBoard[a] === gameState.mainBoard[c]) {
            return gameState.mainBoard[a];
        }
    }
    if (!gameState.mainBoard.includes('')) {
        return 'draw';
    }
    return null;
}

function initGame() {
    mainBoard.innerHTML = '';
    gameState = {
        miniBoards: Array(9).fill(null).map(() => Array(9).fill('')),
        mainBoard: Array(9).fill(''),
        currentPlayer: HUMAN,
        gameActive: true,
        difficulty: difficultySelect.value,
        lastMove: null,
        mode: gameState.mode
    };
    
    history = [];
    redoStack = [];
    updateUndoRedoButtons();
    
    const existingOverlay = document.querySelector('.winner-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    updateScoreDisplay();
    renderBoard();
    resizeBoard();
}

function handleCellClick(e) {
    if (!gameState.gameActive) return;
    if (gameState.mode === 'single' && gameState.currentPlayer !== HUMAN) return;
    
    const boardIndex = parseInt(e.target.dataset.boardIndex);
    const cellIndex = parseInt(e.target.dataset.cellIndex);
    
    if (gameState.mainBoard[boardIndex] !== '' || 
        gameState.miniBoards[boardIndex][cellIndex] !== '') {
        return;
    }
    
    saveState();
    makeMove(boardIndex, cellIndex, gameState.currentPlayer);
    
    if (gameState.mode === 'single' && gameState.gameActive && gameState.currentPlayer === COMPUTER) {
        statusDisplay.textContent = 'Computer thinking...';
        statusDisplay.style.color = 'var(--color-o)';
        setTimeout(computerMove, 500);
    }
}

function makeMove(boardIndex, cellIndex, player) {
    gameState.miniBoards[boardIndex][cellIndex] = player;
    gameState.lastMove = { boardIndex, cellIndex, player };
    
    updateCell(boardIndex, cellIndex, player);
    playSound(player === HUMAN ? 'humanMove' : 'computerMove');
    
    const winCondition = checkMiniBoardWinCondition(boardIndex);
    if (winCondition) {
        gameState.mainBoard[boardIndex] = player;
        
        const miniBoard = document.querySelector(`[data-board-index="${boardIndex}"]`);
        if (miniBoard) miniBoard.style.pointerEvents = 'none';
        
        drawMiniWinningLine(boardIndex, winCondition, player);
        playSound('boardWin');
        
        setTimeout(() => {
            updateMiniBoardDisplay(boardIndex, player);
            
            if (gameState.gameActive) {
                gameState.currentPlayer = player === HUMAN ? (gameState.mode === 'single' ? COMPUTER : PLAYER2) : HUMAN;
                renderBoard();
                updateUndoRedoButtons();
            }
            
            checkGameWinner();
            
            if (gameState.mode === 'single' && gameState.gameActive && gameState.currentPlayer === COMPUTER) {
                statusDisplay.textContent = 'Computer thinking...';
                statusDisplay.style.color = 'var(--color-o)';
                setTimeout(computerMove, 500);
            }
        }, 800);
    } else if (isMiniBoardFull(boardIndex)) {
        resetMiniBoard(boardIndex);
        gameState.currentPlayer = player === HUMAN ? (gameState.mode === 'single' ? COMPUTER : PLAYER2) : HUMAN;
        renderBoard();
        updateUndoRedoButtons();
    } else {
        gameState.currentPlayer = player === HUMAN ? (gameState.mode === 'single' ? COMPUTER : PLAYER2) : HUMAN;
        renderBoard();
        updateUndoRedoButtons();
    }
}

function updateCell(boardIndex, cellIndex, player) {
    const miniBoard = document.querySelector(`[data-board-index="${boardIndex}"]`);
    if (!miniBoard) return;
    const cells = miniBoard.querySelectorAll('.mini-cell');
    if (!cells || !cells[cellIndex]) return;
    const cell = cells[cellIndex];
    cell.textContent = player;
    cell.classList.add('taken', player.toLowerCase());
    highlightLastMove();
}

function highlightLastMove() {
    document.querySelectorAll('.mini-cell.last-move').forEach(el => {
        el.classList.remove('last-move');
    });
    
    if (gameState.lastMove) {
        const { boardIndex, cellIndex } = gameState.lastMove;
        if (gameState.mainBoard[boardIndex] === '') {
            const miniBoard = document.querySelector(`[data-board-index="${boardIndex}"]`);
            if (miniBoard) {
                const cells = miniBoard.querySelectorAll('.mini-cell');
                if (cells && cells[cellIndex]) {
                    cells[cellIndex].classList.add('last-move');
                }
            }
        }
    }
}

function checkMiniBoardWinner(boardIndex) {
    const board = gameState.miniBoards[boardIndex];
    
    for (let condition of winConditions) {
        const [a, b, c] = condition;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

function checkMiniBoardWinCondition(boardIndex) {
    const board = gameState.miniBoards[boardIndex];
    
    for (let condition of winConditions) {
        const [a, b, c] = condition;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return condition;
        }
    }
    return null;
}

function isMiniBoardFull(boardIndex) {
    return !gameState.miniBoards[boardIndex].includes('');
}

function resetMiniBoard(boardIndex) {
    gameState.miniBoards[boardIndex] = Array(9).fill('');
    const miniBoard = document.querySelector(`[data-board-index="${boardIndex}"]`);
    if (!miniBoard) return;
    const cells = miniBoard.querySelectorAll('.mini-cell');
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('taken', 'x', 'o');
    });
}

function updateMiniBoardDisplay(boardIndex, winner) {
    const miniBoard = document.querySelector(`[data-board-index="${boardIndex}"]`);
    if (!miniBoard) return;
    miniBoard.innerHTML = winner;
    miniBoard.classList.add('won', winner.toLowerCase());
}

// SVG Winning Line Drawer Elements
function drawMiniWinningLine(boardIndex, condition, player) {
    const miniBoard = document.querySelector(`[data-board-index="${boardIndex}"]`);
    if (!miniBoard) return;
    
    const cells = Array.from(miniBoard.querySelectorAll('.mini-cell'));
    const startCell = cells[condition[0]];
    const endCell = cells[condition[2]];
    
    if (!startCell || !endCell) return;
    
    const miniBoardRect = miniBoard.getBoundingClientRect();
    const startRect = startCell.getBoundingClientRect();
    const endRect = endCell.getBoundingClientRect();
    
    const x1 = startRect.left - miniBoardRect.left + startRect.width / 2;
    const y1 = startRect.top - miniBoardRect.top + startRect.height / 2;
    const x2 = endRect.left - miniBoardRect.left + endRect.width / 2;
    const y2 = endRect.top - miniBoardRect.top + endRect.height / 2;
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'winning-line-svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    
    const color = player === HUMAN ? 'var(--color-x)' : 'var(--color-o)';
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '6');
    line.setAttribute('stroke-linecap', 'round');
    
    const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    line.style.strokeDasharray = length;
    line.style.strokeDashoffset = length;
    line.style.transition = 'stroke-dashoffset 0.4s ease-in-out';
    
    svg.appendChild(line);
    miniBoard.appendChild(svg);
    
    setTimeout(() => {
        line.style.strokeDashoffset = '0';
    }, 50);
}

function drawWinningLine(condition) {
    const mainBoardRect = mainBoard.getBoundingClientRect();
    const boards = Array.from(mainBoard.children);
    const startBoard = boards[condition[0]];
    const endBoard = boards[condition[2]];
    
    if (!startBoard || !endBoard) return;
    
    const startRect = startBoard.getBoundingClientRect();
    const endRect = endBoard.getBoundingClientRect();
    
    const x1 = startRect.left - mainBoardRect.left + startRect.width / 2;
    const y1 = startRect.top - mainBoardRect.top + startRect.height / 2;
    const x2 = endRect.left - mainBoardRect.left + endRect.width / 2;
    const y2 = endRect.top - mainBoardRect.top + endRect.height / 2;
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'winning-line-svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '10';
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    
    const winner = gameState.mainBoard[condition[0]];
    const color = winner === HUMAN ? 'var(--color-x)' : 'var(--color-o)';
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '10');
    line.setAttribute('stroke-linecap', 'round');
    
    const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    line.style.strokeDasharray = length;
    line.style.strokeDashoffset = length;
    line.style.transition = 'stroke-dashoffset 0.6s ease-in-out';
    
    svg.appendChild(line);
    mainBoard.appendChild(svg);
    
    setTimeout(() => {
        line.style.strokeDashoffset = '0';
    }, 50);
}

function checkGameWinner() {
    for (let condition of winConditions) {
        const [a, b, c] = condition;
        if (gameState.mainBoard[a] && 
            gameState.mainBoard[a] === gameState.mainBoard[b] && 
            gameState.mainBoard[a] === gameState.mainBoard[c]) {
            gameState.gameActive = false;
            const winner = gameState.mainBoard[a];
            
            drawWinningLine(condition);
            
            setTimeout(() => {
                showWinner(winner);
            }, 1000);
            return;
        }
    }
    
    const isBoardFull = !gameState.mainBoard.includes('');
    if (isBoardFull) {
        gameState.gameActive = false;
        showDraw();
    }
}

function shareResult(message) {
    const text = `${message} — Play Super Tic-Tac-Toe at ${window.location.href}`;
    if (navigator.share) {
        navigator.share({ title: 'Super Tic-Tac-Toe', text }).catch(() => {});
    } else {
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.querySelector('.share-btn');
            if (btn) {
                const orig = btn.textContent;
                btn.textContent = '✓ Copied!';
                setTimeout(() => btn.textContent = orig, 2000);
            }
        }).catch(() => {});
    }
}

function showWinner(winner) {
    const message = winner === HUMAN ? 'You Win!' : (gameState.mode === 'pass' ? 'Player 2 Wins!' : 'Computer Wins!');
    statusDisplay.textContent = message;
    statusDisplay.style.fontSize = '1.5rem';
    playSound(winner === HUMAN ? 'gameWin' : 'gameLose');
    aiThinking.classList.remove('visible');
    if (winner === HUMAN) addWin(); else addLoss();
    
    const overlay = document.createElement('div');
    overlay.className = 'winner-overlay';
    
    const box = document.createElement('div');
    box.className = 'winner-message';
    
    const title = document.createElement('h2');
    title.textContent = message;
    title.style.color = winner === HUMAN ? 'var(--color-x)' : 'var(--color-o)';
    
    const playAgainBtn = document.createElement('button');
    playAgainBtn.className = 'reset-btn';
    playAgainBtn.textContent = 'Play Again';
    playAgainBtn.addEventListener('click', () => {
        playSound('click');
        overlay.remove();
        initGame();
    });
    
    const shareBtn = document.createElement('button');
    shareBtn.className = 'share-btn';
    shareBtn.textContent = '📤 Share';
    shareBtn.addEventListener('click', () => {
        playSound('click');
        shareResult(message);
    });
    
    const btnRow = document.createElement('div');
    btnRow.className = 'winner-buttons';
    btnRow.appendChild(playAgainBtn);
    btnRow.appendChild(shareBtn);
    
    box.appendChild(title);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

function showDraw() {
    statusDisplay.textContent = "It's a Draw!";
    statusDisplay.style.fontSize = '1.5rem';
    statusDisplay.style.color = 'var(--text-secondary)';
    playSound('gameLose');
    aiThinking.classList.remove('visible');
    addDraw();
    
    const overlay = document.createElement('div');
    overlay.className = 'winner-overlay';
    
    const box = document.createElement('div');
    box.className = 'winner-message';
    
    const title = document.createElement('h2');
    title.textContent = "It's a Draw!";
    title.style.color = 'var(--text-secondary)';
    
    const playAgainBtn = document.createElement('button');
    playAgainBtn.className = 'reset-btn';
    playAgainBtn.textContent = 'Play Again';
    playAgainBtn.addEventListener('click', () => {
        playSound('click');
        overlay.remove();
        initGame();
    });
    
    const shareBtn = document.createElement('button');
    shareBtn.className = 'share-btn';
    shareBtn.textContent = '📤 Share';
    shareBtn.addEventListener('click', () => {
        playSound('click');
        shareResult("It's a Draw!");
    });
    
    const btnRow = document.createElement('div');
    btnRow.className = 'winner-buttons';
    btnRow.appendChild(playAgainBtn);
    btnRow.appendChild(shareBtn);
    
    box.appendChild(title);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

function computerMove() {
    if (gameState.mode !== 'single') return;
    if (!gameState.gameActive) return;
    
    aiThinking.classList.add('visible');
    
    const availableBoards = [];
    for (let i = 0; i < 9; i++) {
        if (gameState.mainBoard[i] === '') {
            availableBoards.push(i);
        }
    }
    
    if (availableBoards.length === 0) return;
    
    let bestMove;
    
    if (gameState.difficulty === 'easy') {
        bestMove = findMediumMove(availableBoards);
    } else if (gameState.difficulty === 'medium') {
        bestMove = findHardMove(availableBoards);
    } else {
        bestMove = findExtremeMove(availableBoards);
    }
    
    if (bestMove) {
        makeMove(bestMove.boardIndex, bestMove.cellIndex, COMPUTER);
    }
    
    aiThinking.classList.remove('visible');
}

// Medium: Random moves (formerly Easy)
function findMediumMove(availableBoards) {
    const randomBoard = availableBoards[Math.floor(Math.random() * availableBoards.length)];
    const board = gameState.miniBoards[randomBoard];
    const emptyCells = [];
    
    for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
            emptyCells.push(i);
        }
    }
    
    if (emptyCells.length > 0) {
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        return { boardIndex: randomBoard, cellIndex: randomCell };
    }
    
    return null;
}

// Hard: Win if possible, block if necessary, otherwise random strategic (formerly Medium)
function findHardMove(availableBoards) {
    // Try to win
    for (let boardIndex of availableBoards) {
        const winMove = findWinningMove(boardIndex, COMPUTER);
        if (winMove !== null) {
            return { boardIndex, cellIndex: winMove };
        }
    }
    
    // Block opponent
    for (let boardIndex of availableBoards) {
        const blockMove = findWinningMove(boardIndex, HUMAN);
        if (blockMove !== null) {
            return { boardIndex, cellIndex: blockMove };
        }
    }
    
    // Random from available
    const randomBoard = availableBoards[Math.floor(Math.random() * availableBoards.length)];
    const board = gameState.miniBoards[randomBoard];
    const emptyCells = [];
    
    for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
            emptyCells.push(i);
        }
    }
    
    if (emptyCells.length > 0) {
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        return { boardIndex: randomBoard, cellIndex: randomCell };
    }
    
    return null;
}

// Extreme: Full strategic AI with main board awareness and predictive blocking
function findExtremeMove(availableBoards) {
    // CRITICAL: Block opponent from winning a mini-board that would win them the main game
    for (let boardIndex of availableBoards) {
        const blockMove = findWinningMove(boardIndex, HUMAN);
        if (blockMove !== null) {
            // Check if human winning this board would win them the main game
            const tempMainBoard = [...gameState.mainBoard];
            tempMainBoard[boardIndex] = HUMAN;
            if (checkWinner(tempMainBoard)) {
                // CRITICAL BLOCK - must prevent this immediately!
                return { boardIndex, cellIndex: blockMove };
            }
        }
    }
    
    // Try to win a mini-board that wins the main game
    for (let boardIndex of availableBoards) {
        const winMove = findWinningMove(boardIndex, COMPUTER);
        if (winMove !== null) {
            // Check if winning this board wins the main game
            const tempMainBoard = [...gameState.mainBoard];
            tempMainBoard[boardIndex] = COMPUTER;
            if (checkWinner(tempMainBoard)) {
                return { boardIndex, cellIndex: winMove };
            }
        }
    }
    
    // PREDICTIVE: Find boards where user is close to winning and that would threaten main board
    const threatBoard = findPredictiveThreatBoard(availableBoards);
    if (threatBoard !== null) {
        // Aggressively contest this board
        const winMove = findWinningMove(threatBoard, COMPUTER);
        if (winMove !== null) {
            return { boardIndex: threatBoard, cellIndex: winMove };
        }
        const blockMove = findWinningMove(threatBoard, HUMAN);
        if (blockMove !== null) {
            return { boardIndex: threatBoard, cellIndex: blockMove };
        }
        // Place strategically to disrupt user's plans
        const board = gameState.miniBoards[threatBoard];
        if (board[4] === '') {
            return { boardIndex: threatBoard, cellIndex: 4 };
        }
        const corners = [0, 2, 6, 8];
        for (let corner of corners) {
            if (board[corner] === '') {
                return { boardIndex: threatBoard, cellIndex: corner };
            }
        }
        // Take any cell to contest
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                return { boardIndex: threatBoard, cellIndex: i };
            }
        }
    }
    
    // Block opponent from setting up a winning main board position (2 in a row)
    const criticalBlockBoard = findCriticalBlockBoard(availableBoards);
    if (criticalBlockBoard !== null) {
        // Try to win this board for ourselves or at least contest it
        const winMove = findWinningMove(criticalBlockBoard, COMPUTER);
        if (winMove !== null) {
            return { boardIndex: criticalBlockBoard, cellIndex: winMove };
        }
        const blockMove = findWinningMove(criticalBlockBoard, HUMAN);
        if (blockMove !== null) {
            return { boardIndex: criticalBlockBoard, cellIndex: blockMove };
        }
        // Place strategically in this critical board
        const board = gameState.miniBoards[criticalBlockBoard];
        if (board[4] === '') {
            return { boardIndex: criticalBlockBoard, cellIndex: 4 };
        }
        const corners = [0, 2, 6, 8];
        for (let corner of corners) {
            if (board[corner] === '') {
                return { boardIndex: criticalBlockBoard, cellIndex: corner };
            }
        }
        // Take any cell in this critical board
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                return { boardIndex: criticalBlockBoard, cellIndex: i };
            }
        }
    }
    
    // Try to win any mini-board
    for (let boardIndex of availableBoards) {
        const winMove = findWinningMove(boardIndex, COMPUTER);
        if (winMove !== null) {
            return { boardIndex, cellIndex: winMove };
        }
    }
    
    // Block opponent from winning any mini-board
    for (let boardIndex of availableBoards) {
        const blockMove = findWinningMove(boardIndex, HUMAN);
        if (blockMove !== null) {
            return { boardIndex, cellIndex: blockMove };
        }
    }
    
    // Strategic main board play: prioritize boards that create winning opportunities
    const strategicBoard = findStrategicBoard(availableBoards, COMPUTER);
    if (strategicBoard !== null) {
        const board = gameState.miniBoards[strategicBoard];
        // Try center first
        if (board[4] === '') {
            return { boardIndex: strategicBoard, cellIndex: 4 };
        }
        // Try corners
        const corners = [0, 2, 6, 8];
        for (let corner of corners) {
            if (board[corner] === '') {
                return { boardIndex: strategicBoard, cellIndex: corner };
            }
        }
    }
    
    // Block opponent's strategic main board positions
    const blockStrategicBoard = findStrategicBoard(availableBoards, HUMAN);
    if (blockStrategicBoard !== null) {
        const board = gameState.miniBoards[blockStrategicBoard];
        // Try center first
        if (board[4] === '') {
            return { boardIndex: blockStrategicBoard, cellIndex: 4 };
        }
        // Try corners
        const corners = [0, 2, 6, 8];
        for (let corner of corners) {
            if (board[corner] === '') {
                return { boardIndex: blockStrategicBoard, cellIndex: corner };
            }
        }
    }
    
    // Take center of any available board
    for (let boardIndex of availableBoards) {
        const board = gameState.miniBoards[boardIndex];
        if (board[4] === '') {
            return { boardIndex, cellIndex: 4 };
        }
    }
    
    // Take corners
    for (let boardIndex of availableBoards) {
        const corners = [0, 2, 6, 8];
        for (let corner of corners) {
            if (gameState.miniBoards[boardIndex][corner] === '') {
                return { boardIndex, cellIndex: corner };
            }
        }
    }
    
    // Take any available
    for (let boardIndex of availableBoards) {
        const board = gameState.miniBoards[boardIndex];
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                return { boardIndex, cellIndex: i };
            }
        }
    }
    
    return null;
}

// Predictive threat detection: Find boards where user is building strength AND would threaten main board
function findPredictiveThreatBoard(availableBoards) {
    let maxThreatScore = -1;
    let mostThreateningBoard = null;
    
    for (let boardIndex of availableBoards) {
        const board = gameState.miniBoards[boardIndex];
        
        // Calculate how close user is to winning this mini-board
        let userThreats = 0;
        let userPieces = 0;
        let strategicAdvantage = 0;
        
        // Check if user has center (huge advantage)
        if (board[4] === HUMAN) {
            strategicAdvantage += 8;
        }
        
        // Check if user has corners
        const corners = [0, 2, 6, 8];
        let userCorners = 0;
        for (let corner of corners) {
            if (board[corner] === HUMAN) {
                userCorners++;
            }
        }
        strategicAdvantage += userCorners * 2;
        
        for (let condition of winConditions) {
            const [a, b, c] = condition;
            const values = [board[a], board[b], board[c]];
            const humanCount = values.filter(v => v === HUMAN).length;
            const emptyCount = values.filter(v => v === '').length;
            const computerCount = values.filter(v => v === COMPUTER).length;
            
            // User has 2 in a row (immediate threat)
            if (humanCount === 2 && emptyCount === 1 && computerCount === 0) {
                userThreats += 10;
            }
            // User has 1 in a row with 2 empty (potential threat)
            else if (humanCount === 1 && emptyCount === 2 && computerCount === 0) {
                userThreats += 3;
            }
            
            if (humanCount > 0) {
                userPieces += humanCount;
            }
        }
        
        // Calculate main board threat if user wins this board
        let mainBoardThreat = 0;
        const tempMainBoard = [...gameState.mainBoard];
        tempMainBoard[boardIndex] = HUMAN;
        
        // Check if this board position is strategically important on main board
        // Center of main board (position 4)
        if (boardIndex === 4) {
            mainBoardThreat += 15;
        }
        
        // Corners of main board (0, 2, 6, 8)
        const mainCorners = [0, 2, 6, 8];
        if (mainCorners.includes(boardIndex)) {
            mainBoardThreat += 8;
        }
        
        for (let condition of winConditions) {
            const [a, b, c] = condition;
            const values = [tempMainBoard[a], tempMainBoard[b], tempMainBoard[c]];
            const humanCount = values.filter(v => v === HUMAN).length;
            const emptyCount = values.filter(v => v === '').length;
            
            // Would give user 2 in a row on main board (critical!)
            if (humanCount === 2 && emptyCount === 1) {
                mainBoardThreat += 25;
            }
            // Would give user 1 in a row on main board
            else if (humanCount === 1 && emptyCount === 2) {
                mainBoardThreat += 7;
            }
        }
        
        // Combined threat score
        const totalThreat = userThreats + mainBoardThreat + userPieces + strategicAdvantage;
        
        if (totalThreat > maxThreatScore) {
            maxThreatScore = totalThreat;
            mostThreateningBoard = boardIndex;
        }
    }
    
    // Only return if there's a significant threat
    return maxThreatScore > 8 ? mostThreateningBoard : null;
}

// Find boards where opponent is about to create a winning main board position
function findCriticalBlockBoard(availableBoards) {
    // Check each winning condition on the main board
    for (let condition of winConditions) {
        const [a, b, c] = condition;
        const values = [gameState.mainBoard[a], gameState.mainBoard[b], gameState.mainBoard[c]];
        const humanCount = values.filter(v => v === HUMAN).length;
        const emptyCount = values.filter(v => v === '').length;
        
        // If human has 2 in a row and 1 empty, that empty position is CRITICAL
        if (humanCount === 2 && emptyCount === 1) {
            if (gameState.mainBoard[a] === '' && availableBoards.includes(a)) return a;
            if (gameState.mainBoard[b] === '' && availableBoards.includes(b)) return b;
            if (gameState.mainBoard[c] === '' && availableBoards.includes(c)) return c;
        }
    }
    return null;
}

// Find boards that would create winning opportunities on the main board
function findStrategicBoard(availableBoards, player) {
    for (let condition of winConditions) {
        const [a, b, c] = condition;
        const values = [gameState.mainBoard[a], gameState.mainBoard[b], gameState.mainBoard[c]];
        const playerCount = values.filter(v => v === player).length;
        const emptyCount = values.filter(v => v === '').length;
        
        // If player has 1 in a line and 2 empty, prioritize those empty positions
        if (playerCount === 1 && emptyCount === 2) {
            if (gameState.mainBoard[a] === '' && availableBoards.includes(a)) return a;
            if (gameState.mainBoard[b] === '' && availableBoards.includes(b)) return b;
            if (gameState.mainBoard[c] === '' && availableBoards.includes(c)) return c;
        }
    }
    return null;
}

// Check if a main board configuration has a winner
function checkWinner(board) {
    for (let condition of winConditions) {
        const [a, b, c] = condition;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return true;
        }
    }
    return false;
}

function findWinningMove(boardIndex, player) {
    const board = gameState.miniBoards[boardIndex];
    for (let condition of winConditions) {
        const [a, b, c] = condition;
        const values = [board[a], board[b], board[c]];
        const playerCount = values.filter(v => v === player).length;
        const emptyCount = values.filter(v => v === '').length;
        if (playerCount === 2 && emptyCount === 1) {
            if (board[a] === '') return a;
            if (board[b] === '') return b;
            if (board[c] === '') return c;
        }
    }
    return null;
}

// Theme handling
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeDropdown = document.getElementById('themeDropdown');
const themeOptions = document.querySelectorAll('.theme-opt');
const lightModeBtn = document.getElementById('lightModeBtn');
const darkModeBtn = document.getElementById('darkModeBtn');

// Initialize saved theme and dark mode
function initTheme() {
    // Apply saved theme or default to Night (dark)
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.classList.add(`theme-${savedTheme}`);
    } else {
        // Default to night theme (dark)
        document.body.classList.add('theme-night');
        localStorage.setItem('theme', 'night');
    }
    // Apply saved dark mode state
    const savedDark = localStorage.getItem('dark-mode');
    if (savedDark === 'true') {
        document.body.classList.add('dark-mode');
    }
}

function setTheme(theme) {
    // Remove any existing theme classes
    document.body.classList.forEach(cls => {
        if (cls.startsWith('theme-')) {
            document.body.classList.remove(cls);
        }
    });
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('theme', theme);
    // Close dropdown after selection
    themeDropdown.classList.remove('active');
    setTimeout(resizeBoard, 100);
}

function setLightMode() {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('dark-mode', 'false');
}

function setDarkMode() {
    document.body.classList.add('dark-mode');
    localStorage.setItem('dark-mode', 'true');
}

// Theme toggle button (dropdown visibility)
themeToggleBtn.addEventListener('click', () => {
    playSound('click');
    themeDropdown.classList.toggle('active');
});

// Theme option click handlers
themeOptions.forEach(option => {
    option.addEventListener('click', () => {
        if (!option.dataset.theme) return;
        playSound('click');
        setTheme(option.dataset.theme);
        themeDropdown.classList.remove('active');
    });
});

// Light/Dark mode button handlers
lightModeBtn.addEventListener('click', () => {
    playSound('click');
    setLightMode();
    themeDropdown.classList.remove('active');
});

darkModeBtn.addEventListener('click', () => {
    playSound('click');
    setDarkMode();
    themeDropdown.classList.remove('active');
});

// Click overlay or outside to close theme popup
document.addEventListener('click', (e) => {
    if (e.target === themeDropdown || (!themeDropdown.contains(e.target) && e.target !== themeToggleBtn)) {
        themeDropdown.classList.remove('active');
    }
});

// Existing listeners for reset, difficulty, undo/redo remain unchanged
resetBtn.addEventListener('click', () => {
    playSound('click');
    initGame();
});

difficultySelect.addEventListener('change', () => {
    playSound('click');
    gameState.difficulty = difficultySelect.value;
    initGame();
});

// Username system
const adjectives = ['Swift', 'Brave', 'Cosmic', 'Silent', 'Neon', 'Shadow', 'Crimson', 'Frost', 'Lunar', 'Solar', 'Mythic', 'Stealth', 'Velvet', 'Cyber', 'Pixel', 'Quantum', 'Savage', 'Noble', 'Cipher', 'Phantom'];
const nouns = ['Fox', 'Wolf', 'Tiger', 'Eagle', 'Panda', 'Falcon', 'Raven', 'Viper', 'Lynx', 'Otter', 'Hawk', 'Lion', 'Bear', 'Kite', 'Wren', 'Elk', 'Owl', 'Ape', 'Ram', 'Yak'];

function generateUsername() {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 99) + 1;
    return `${adj}${noun}${num}`;
}

let currentUsername = localStorage.getItem('username') || generateUsername();

function saveUsername(name) {
    currentUsername = name;
    localStorage.setItem('username', name);
    document.getElementById('usernameDisplay').textContent = name;
}

function initUsername() {
    const display = document.getElementById('usernameDisplay');
    display.textContent = currentUsername;
    display.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'username-input';
        input.value = currentUsername;
        input.maxLength = 20;
        display.replaceWith(input);
        input.focus();
        input.select();
        const finish = () => {
            const val = input.value.trim();
            saveUsername(val || generateUsername());
            const newDisplay = document.getElementById('usernameDisplay');
            input.replaceWith(newDisplay);
            newDisplay.textContent = currentUsername;
        };
        input.addEventListener('blur', finish);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') { input.value = currentUsername; input.blur(); }
        });
    });
}

// Opponent display
function updateOpponentDisplay() {
    const el = document.getElementById('opponentDisplay');
    if (!el) return;
    if (gameState.mode === 'pass') {
        el.textContent = 'Player 2';
    } else if (gameState.mode === 'public' || gameState.mode === 'private') {
        el.textContent = 'Opponent';
    } else {
        el.textContent = 'Computer';
    }
}

// Sidebar toggle (mobile)
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');

if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== sidebarToggle) {
            sidebar.classList.remove('open');
        }
    });
}

// Score system
function loadScores() {
    const key = `scores_${currentUsername}`;
    return JSON.parse(localStorage.getItem(key)) || { wins: 0, losses: 0, draws: 0 };
}

function saveScores(scores) {
    localStorage.setItem(`scores_${currentUsername}`, JSON.stringify(scores));
}

function updateScoreDisplay() {
    const scores = loadScores();
    document.getElementById('scoreWins').textContent = scores.wins;
    document.getElementById('scoreLosses').textContent = scores.losses;
}

function resetScores() {
    saveScores({ wins: 0, losses: 0, draws: 0 });
    updateScoreDisplay();
}

function addWin() { const s = loadScores(); s.wins++; saveScores(s); updateScoreDisplay(); }
function addLoss() { const s = loadScores(); s.losses++; saveScores(s); updateScoreDisplay(); }
function addDraw() { const s = loadScores(); s.draws++; saveScores(s); }

// Match mode selector
const matchMode = document.getElementById('matchMode');

matchMode.addEventListener('change', () => {
    playSound('click');
    const mode = matchMode.value;
    if (mode === 'public' || mode === 'private') {
        matchMode.value = gameState.mode === 'pass' ? 'local' : 'single';
        statusDisplay.textContent = 'Online modes coming soon!';
        statusDisplay.style.color = 'var(--text-secondary)';
        return;
    }
    gameState.mode = mode === 'local' ? 'pass' : 'single';
    localStorage.setItem('mode', gameState.mode);
    const diffSection = document.getElementById('diffSection');
    if (diffSection) {
        diffSection.style.display = mode === 'single' ? '' : 'none';
    }
    const controls = document.querySelector('.sidebar-controls');
    if (controls) {
        controls.style.display = mode === 'single' ? '' : 'none';
    }
    resetScores();
    initGame();
});

function initMatchMode() {
    const saved = localStorage.getItem('mode') || 'single';
    gameState.mode = saved;
    matchMode.value = saved === 'pass' ? 'local' : 'single';
    const diffSection = document.getElementById('diffSection');
    if (diffSection) {
        diffSection.style.display = saved === 'single' ? '' : 'none';
    }
    const controls = document.querySelector('.sidebar-controls');
    if (controls) {
        controls.style.display = saved === 'single' ? '' : 'none';
    }
}

undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);

// Rules Modal Events
rulesToggle.addEventListener('click', () => {
    playSound('click');
    rulesOverlay.classList.add('active');
    setTimeout(resizeBoard, 300);
});

const closeRules = () => {
    playSound('click');
    rulesOverlay.classList.remove('active');
    setTimeout(resizeBoard, 300);
};

rulesClose.addEventListener('click', closeRules);
rulesGotItBtn.addEventListener('click', closeRules);

rulesOverlay.addEventListener('click', (e) => {
    if (e.target === rulesOverlay) {
        closeRules();
    }
});

// Initialize theme, username, mode, scores
initTheme();
initUsername();
initMatchMode();
updateScoreDisplay();
initGame();
resizeBoard();

// Fetch GitHub star count
fetch('https://api.github.com/repos/velo4705/super-tictactoe')
    .then(res => res.json())
    .then(data => {
        const count = data.stargazers_count;
        document.getElementById('starCount').textContent = count;
    })
    .catch(() => {
        document.getElementById('starCount').style.display = 'none';
    });

// Dynamic board sizing
function resizeBoard() {
    const board = document.getElementById('mainBoard');
    if (!board) return;

    const vh = window.innerHeight;

    // Measure available width from the container
    const container = board.closest('.container');
    let availW = window.innerWidth - 32;
    if (container) {
        availW = container.clientWidth;
    }

    const desktopMax = 580;

    let boardPx = Math.min(availW, desktopMax);

    if (vh < 600) {
        const h1 = document.querySelector('h1');
        const info = document.querySelector('.info');
        const controls = document.querySelector('.controls');
        const h1h = h1 ? h1.getBoundingClientRect().height : 0;
        const infoh = info ? info.getBoundingClientRect().height : 0;
        const controlsh = controls ? controls.getBoundingClientRect().height : 0;
        const container = board.closest('.container');
        const bodyPadV = parseFloat(getComputedStyle(document.body).paddingTop) * 2 || 64;
        const containerPadV = container ? parseFloat(getComputedStyle(container).paddingTop) * 2 || 64 : 64;
        const overhead = h1h + infoh + controlsh + bodyPadV + containerPadV + 24;
        const maxH = vh - overhead;
        boardPx = Math.min(boardPx, Math.max(maxH, 200));
    }

    boardPx = Math.max(boardPx, 200);

    const gap = Math.max(4, Math.min(12, Math.floor(boardPx / 50)));
    const cellPad = Math.max(2, Math.min(8, Math.floor(boardPx / 80)));
    const cellGap = Math.max(1, Math.min(4, Math.floor(boardPx / 120)));

    const mini = (boardPx - gap * 4) / 3;
    const cellPx = (mini - cellPad * 2 - cellGap * 2) / 3;
    const fontSize = Math.max(10, Math.round(cellPx * 0.45));
    const wonSize = Math.max(24, Math.round(cellPx * 0.65));

    board.style.setProperty('--board-size', `${boardPx}px`);
    board.style.setProperty('--board-gap', `${gap}px`);
    board.style.setProperty('--cell-padding', `${cellPad}px`);
    board.style.setProperty('--cell-gap', `${cellGap}px`);
    board.style.setProperty('--cell-font-size', `${fontSize}px`);
    board.style.setProperty('--won-font-size', `${wonSize}px`);
}

// Particle animation
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();

window.addEventListener('resize', () => {
    resizeCanvas();
    resizeBoard();
});

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 2 + 1;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }
    
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        const particleColor = getComputedStyle(document.body).getPropertyValue('--particle-color').trim();
        ctx.fillStyle = `rgba(${particleColor}, 0.5)`;
        ctx.fill();
    }
}

const particles = [];
const particleCount = 80;

for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
}

function connectParticles() {
    const lineColor = getComputedStyle(document.body).getPropertyValue('--particle-line').trim() || '255, 255, 255';
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 120) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(${lineColor}, ${0.2 * (1 - distance / 120)})`;
                ctx.lineWidth = 1;
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });
    
    connectParticles();
    
    requestAnimationFrame(animate);
}

animate();
