const mainBoard = document.getElementById('mainBoard');
const statusDisplay = document.querySelector('.status');
const resetBtn = document.getElementById('resetBtn');
const themeToggle = document.getElementById('themeToggle');
const difficultySelect = document.getElementById('difficulty');

const HUMAN = 'X';
const COMPUTER = 'O';

let gameState = {
    miniBoards: Array(9).fill(null).map(() => Array(9).fill('')),
    mainBoard: Array(9).fill(''),
    currentPlayer: HUMAN,
    gameActive: true,
    difficulty: 'hard'
};

const winConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

function initGame() {
    mainBoard.innerHTML = '';
    gameState = {
        miniBoards: Array(9).fill(null).map(() => Array(9).fill('')),
        mainBoard: Array(9).fill(''),
        currentPlayer: HUMAN,
        gameActive: true,
        difficulty: difficultySelect.value
    };
    
    for (let i = 0; i < 9; i++) {
        const miniBoard = document.createElement('div');
        miniBoard.className = 'mini-board';
        miniBoard.dataset.boardIndex = i;
        
        const miniGrid = document.createElement('div');
        miniGrid.className = 'mini-grid';
        
        for (let j = 0; j < 9; j++) {
            const cell = document.createElement('div');
            cell.className = 'mini-cell';
            cell.dataset.boardIndex = i;
            cell.dataset.cellIndex = j;
            cell.addEventListener('click', handleCellClick);
            miniGrid.appendChild(cell);
        }
        
        miniBoard.appendChild(miniGrid);
        mainBoard.appendChild(miniBoard);
    }
    
    statusDisplay.textContent = 'Your turn (X)';
    statusDisplay.style.fontSize = '';
    statusDisplay.style.color = '';
}

function handleCellClick(e) {
    if (!gameState.gameActive || gameState.currentPlayer !== HUMAN) return;
    
    const boardIndex = parseInt(e.target.dataset.boardIndex);
    const cellIndex = parseInt(e.target.dataset.cellIndex);
    
    if (gameState.mainBoard[boardIndex] !== '' || 
        gameState.miniBoards[boardIndex][cellIndex] !== '') {
        return;
    }
    
    makeMove(boardIndex, cellIndex, HUMAN);
    
    if (gameState.gameActive && gameState.currentPlayer === COMPUTER) {
        statusDisplay.textContent = 'Computer thinking...';
        statusDisplay.style.color = 'var(--color-o)';
        setTimeout(computerMove, 500);
    }
}

function makeMove(boardIndex, cellIndex, player) {
    gameState.miniBoards[boardIndex][cellIndex] = player;
    updateCell(boardIndex, cellIndex, player);
    
    const winner = checkMiniBoardWinner(boardIndex);
    if (winner) {
        gameState.mainBoard[boardIndex] = winner;
        updateMiniBoardDisplay(boardIndex, winner);
        checkGameWinner();
    } else if (isMiniBoardFull(boardIndex)) {
        resetMiniBoard(boardIndex);
    }
    
    if (gameState.gameActive) {
        gameState.currentPlayer = player === HUMAN ? COMPUTER : HUMAN;
        if (gameState.currentPlayer === HUMAN) {
            statusDisplay.textContent = 'Your turn (X)';
            statusDisplay.style.color = '';
        }
    }
}

function updateCell(boardIndex, cellIndex, player) {
    const miniBoard = document.querySelector(`[data-board-index="${boardIndex}"]`);
    const cells = miniBoard.querySelectorAll('.mini-cell');
    const cell = cells[cellIndex];
    cell.textContent = player;
    cell.classList.add('taken', player.toLowerCase());
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

function isMiniBoardFull(boardIndex) {
    return !gameState.miniBoards[boardIndex].includes('');
}

function resetMiniBoard(boardIndex) {
    gameState.miniBoards[boardIndex] = Array(9).fill('');
    const miniBoard = document.querySelector(`[data-board-index="${boardIndex}"]`);
    const cells = miniBoard.querySelectorAll('.mini-cell');
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('taken', 'x', 'o');
    });
}

function updateMiniBoardDisplay(boardIndex, winner) {
    const miniBoard = document.querySelector(`[data-board-index="${boardIndex}"]`);
    miniBoard.innerHTML = winner;
    miniBoard.classList.add('won', winner.toLowerCase());
}

function checkGameWinner() {
    for (let condition of winConditions) {
        const [a, b, c] = condition;
        if (gameState.mainBoard[a] && 
            gameState.mainBoard[a] === gameState.mainBoard[b] && 
            gameState.mainBoard[a] === gameState.mainBoard[c]) {
            gameState.gameActive = false;
            const winner = gameState.mainBoard[a];
            showWinner(winner);
            return;
        }
    }
    
    // Check for draw - all main board positions filled
    const isBoardFull = !gameState.mainBoard.includes('');
    if (isBoardFull) {
        gameState.gameActive = false;
        showDraw();
    }
}

function showWinner(winner) {
    const message = winner === HUMAN ? 'You Win!' : 'Computer Wins!';
    statusDisplay.textContent = message;
    statusDisplay.style.fontSize = '1.5rem';
    statusDisplay.style.color = '';
}

function showDraw() {
    statusDisplay.textContent = "It's a Draw!";
    statusDisplay.style.fontSize = '1.5rem';
    statusDisplay.style.color = 'var(--text-secondary)';
}

function computerMove() {
    if (!gameState.gameActive) return;
    
    const availableBoards = [];
    for (let i = 0; i < 9; i++) {
        if (gameState.mainBoard[i] === '') {
            availableBoards.push(i);
        }
    }
    
    if (availableBoards.length === 0) return;
    
    let bestMove;
    
    if (gameState.difficulty === 'medium') {
        bestMove = findMediumMove(availableBoards);
    } else if (gameState.difficulty === 'hard') {
        bestMove = findHardMove(availableBoards);
    } else {
        bestMove = findExtremeMove(availableBoards);
    }
    
    if (bestMove) {
        makeMove(bestMove.boardIndex, bestMove.cellIndex, COMPUTER);
    }
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

// Dark mode toggle functionality
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

themeToggle.addEventListener('click', toggleTheme);
resetBtn.addEventListener('click', initGame);
difficultySelect.addEventListener('change', () => {
    gameState.difficulty = difficultySelect.value;
});

initTheme();
initGame();
