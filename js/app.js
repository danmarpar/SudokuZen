document.addEventListener('DOMContentLoaded', () => {
    // --- STATE VARIABLES ---
    let solution = [];
    let currentBoard = [];
    let initialBoard = [];
    let selectedCellIndex = null;
    
    // --- DOM ELEMENTS ---
    const boardElement = document.getElementById('game-board');
    const diffSelect = document.getElementById('diff-select');
    const btnCheck = document.getElementById('btn-check');
    const btnHint = document.getElementById('btn-hint');
    const btnNewGame = document.getElementById('btn-new-game');
    const numPad = document.querySelectorAll('.num-btn');
    
    // Feedback elements
    const feedbackElement = document.getElementById('feedback');
    const feedbackContent = document.getElementById('feedback-content');
    const closeFeedbackBtn = document.getElementById('close-feedback');
    
    // Modal elements
    const hintModal = document.getElementById('hint-modal');
    const modalText = document.getElementById('hint-text');
    const closeHintModal = document.getElementById('close-hint');
    const confirmModal = document.getElementById('confirm-modal');
    const confirmNewBtn = document.getElementById('confirm-new');
    const cancelNewBtn = document.getElementById('cancel-new');

    // --- INITIALIZATION ---
    initGame();

    // --- EVENT LISTENERS ---
    // Remove the change listener that was regenerating the game on difficulty change
    // We'll only regenerate when New Game is clicked
    
    boardElement.addEventListener('click', (e) => {
        const cell = e.target.closest('.cell');
        if (cell) selectCell(parseInt(cell.dataset.index));
    });
    
    // Close feedback when clicking the close button
    closeFeedbackBtn.addEventListener('click', () => {
        feedbackElement.classList.add('hidden');
    });

    document.addEventListener('keydown', (e) => {
        if (!selectedCellIndex && selectedCellIndex !== 0) return;
        
        const key = e.key;
        if (key >= '1' && key <= '9') fillCell(key);
        if (key === 'Backspace' || key === 'Delete' || key === '0') fillCell('0');
        if (key === 'Escape') selectCell(null);
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            moveSelection(key);
        }
    });

    numPad.forEach(btn => {
        btn.addEventListener('click', () => fillCell(parseInt(btn.dataset.val)));
    });

    // Game control buttons
    btnCheck.addEventListener('click', checkSolution);
    btnHint.addEventListener('click', provideHint);
    btnNewGame.addEventListener('click', showNewGameModal);
    
    // Modal controls
    closeHintModal.addEventListener('click', () => hintModal.classList.add('hidden'));
    confirmNewBtn.addEventListener('click', startNewGame);
    cancelNewBtn.addEventListener('click', () => confirmModal.classList.add('hidden'));
    
    // Close modal when clicking outside
    [hintModal, confirmModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });

    // --- CORE FUNCTIONS ---

    function initGame() {
        // 1. Generate a full valid 9x9 Sudoku solution
        solution = generateCompleteBoard();
        
        // 2. Remove numbers based on current difficulty to create the puzzle
        const difficulty = diffSelect.value;
        const attempts = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 45 : 55;
        
        // Create a deep copy for the initial state
        initialBoard = JSON.parse(JSON.stringify(solution));
        removeNumbers(initialBoard, attempts);
        
        // currentBoard tracks the user's progress
        currentBoard = JSON.parse(JSON.stringify(initialBoard));

        // 3. Render the grid
        renderBoard();
    }

    function renderBoard() {
        boardElement.innerHTML = ''; // Clear previous
        selectedCellIndex = null;

        for (let i = 0; i < 81; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.index = i;

            // Add thick bottom border for rows 2 and 5 (visual grouping)
            const row = Math.floor(i / 9);
            if (row === 2 || row === 5) {
                cell.style.borderBottom = '2px solid var(--grid-line-thick)';
            }

            // Fill value if it exists
            const val = currentBoard[Math.floor(i / 9)][i % 9];
            if (val !== 0) {
                cell.textContent = val;
                // If it was part of the initial puzzle, make it bold/fixed
                if (initialBoard[Math.floor(i / 9)][i % 9] !== 0) {
                    cell.classList.add('fixed');
                } else {
                    cell.classList.add('user-input');
                }
            }

            cell.addEventListener('click', () => selectCell(i));
            boardElement.appendChild(cell);
        }
    }

    function selectCell(index) {
        if (selectedCellIndex !== null) {
            boardElement.children[selectedCellIndex].classList.remove('selected');
        }
        selectedCellIndex = index;
        const cell = boardElement.children[index];
        cell.classList.add('selected');

        // Highlight all instances of this number
        const val = cell.textContent;
        document.querySelectorAll('.cell').forEach(c => c.style.backgroundColor = ''); // Reset
        
        if (val) {
            document.querySelectorAll('.cell').forEach(c => {
                if (c.textContent === val) c.style.backgroundColor = '#e2e6ea';
            });
        }
        cell.style.backgroundColor = 'var(--highlight-color)'; // Keep selection active
    }

    function fillCell(value) {
        if (selectedCellIndex === null) return;
        
        const row = Math.floor(selectedCellIndex / 9);
        const col = selectedCellIndex % 9;

        // Prevent editing fixed initial cells
        if (initialBoard[row][col] !== 0) return;

        const cell = boardElement.children[selectedCellIndex];

        if (value === '0') {
            currentBoard[row][col] = 0;
            cell.textContent = '';
            cell.classList.remove('user-input', 'error');
        } else {
            currentBoard[row][col] = parseInt(value);
            cell.textContent = value;
            cell.classList.add('user-input');
            cell.classList.remove('error'); // Clear error state on new input
            
            // Check if board is now full after filling a cell
            if (isBoardFull()) {
                // Automatically check solution when board is complete
                setTimeout(() => checkSolution(true), 500); // Small delay for better UX
            }
        }
        
        // Re-highlight similar numbers
        selectCell(selectedCellIndex);
    }

    function checkSolution(autoCheck = false) {
        let isCorrect = true;
        let emptyCells = 0;
        const cells = document.querySelectorAll('.cell');
        
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const val = currentBoard[r][c];
                
                if (val === 0) emptyCells++;
                
                const index = r * 9 + c;
                
                // Only check user inputs, not empty or fixed cells
                if (initialBoard[r][c] === 0 && val !== 0) {
                    if (val !== solution[r][c]) {
                        cells[index].classList.add('error');
                        isCorrect = false;
                    }
                }
            }
        }
        
        if (autoCheck && emptyCells === 0) {
            // Board is full and was auto-checked
            if (isCorrect) {
                showCongratulationsModal();
            } else {
                showErrorsModal();
            }
        } else {
            // Manual check or board not full
            if (isCorrect) {
                if (emptyCells === 0) {
                    showFeedback('Congratulations! You solved the puzzle!', 'correct');
                } else {
                    showFeedback('All your entries are correct so far!', 'correct');
                }
            } else {
                showFeedback('Some cells have incorrect numbers. Try again!', 'error');
            }
        }
    }

    // --- FEEDBACK FUNCTIONS ---
    function showFeedback(message, type = '') {
        feedbackContent.textContent = message;
        feedbackContent.className = 'feedback-content';
        if (type) {
            feedbackContent.classList.add(`feedback-${type}`);
        }
        feedbackElement.classList.remove('hidden');
        
        // Auto-hide feedback after 5 seconds
        clearTimeout(feedbackElement.timeoutId);
        feedbackElement.timeoutId = setTimeout(() => {
            feedbackElement.classList.add('hidden');
        }, 5000);
    }

    // --- HELPER FUNCTIONS ---
    function isBoardFull() {
        return currentBoard.flat().every(cell => cell !== 0);
    }

    function provideHint() {
        // Smart Hint: Find a cell that MUST be a specific number based on row/col/box logic
        // This is a simplified "Naked Single" solver.
        
        let foundHint = false;
        
        // Try to find a cell with only 1 valid possibility
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (currentBoard[r][c] === 0) {
                    const possibilities = [];
                    for (let n = 1; n <= 9; n++) {
                        if (isValid(currentBoard, r, c, n)) {
                            possibilities.push(n);
                        }
                    }

                    if (possibilities.length === 1) {
                        const correctNum = solution[r][c]; // Double check with solution
                        const idx = r * 9 + c;
                        
                        selectCell(idx);
                        fillCell(correctNum.toString());
                        
                        showFeedback(`Hint: At Row ${r+1}, Column ${c+1}, the number ${correctNum} is the only one that fits locally.`, 'hint');
                        foundHint = true;
                        return;
                    }
                }
            }
        }

        // Fallback: If no "logic" hint found (hard puzzle), just reveal a random empty cell
        if (!foundHint) {
            const emptyIndices = [];
            currentBoard.flat().forEach((val, idx) => {
                if (val === 0) emptyIndices.push(idx);
            });
            
            if (emptyIndices.length > 0) {
                const randIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
                const r = Math.floor(randIdx / 9);
                const c = randIdx % 9;
                
                selectCell(randIdx);
                fillCell(solution[r][c].toString());
                showFeedback("This was a tricky one! I've revealed this cell for you.", 'hint');
            } else {
                showFeedback("The board is full!", 'hint');
            }
        }
    }

    // --- GAME CONTROL FUNCTIONS ---
    function showNewGameModal() {
        confirmModal.classList.remove('hidden');
    }
    
    function startNewGame() {
        confirmModal.classList.add('hidden');
        // Get the current difficulty before initializing
        const currentDifficulty = diffSelect.value;
        // Store the current scroll position to prevent jumping
        const scrollPosition = window.scrollY;
        // Initialize the game
        initGame();
        // Restore the selected difficulty
        diffSelect.value = currentDifficulty;
        // Restore scroll position
        window.scrollTo(0, scrollPosition);
    }
    
    // --- MODAL FUNCTIONS ---
    function showModal(msg) {
        modalText.textContent = msg;
        hintModal.classList.remove('hidden');
    }

    function showCongratulationsModal() {
        const congratsModal = document.createElement('div');
        congratsModal.className = 'modal';
        congratsModal.innerHTML = `
            <div class="modal-content">
                <h3>🎉 Congratulations!</h3>
                <p>You successfully solved the Sudoku puzzle!</p>
                <div class="modal-actions">
                    <button class="modal-btn" onclick="this.closest('.modal').classList.add('hidden')">Play Again</button>
                </div>
            </div>
        `;
        document.body.appendChild(congratsModal);
        
        // Add event listener to close modal
        congratsModal.addEventListener('click', (e) => {
            if (e.target === congratsModal) {
                congratsModal.remove();
            }
        });
    }

    function showErrorsModal() {
        const errorsModal = document.createElement('div');
        errorsModal.className = 'modal';
        errorsModal.innerHTML = `
            <div class="modal-content">
                <h3>❌ Almost There!</h3>
                <p>Some numbers are incorrect. The errors have been highlighted in red.</p>
                <div class="modal-actions">
                    <button class="modal-btn" onclick="this.closest('.modal').remove()">Continue Solving</button>
                </div>
            </div>
        `;
        document.body.appendChild(errorsModal);
        
        // Add event listener to close modal
        errorsModal.addEventListener('click', (e) => {
            if (e.target === errorsModal) {
                errorsModal.remove();
            }
        });
    }

    function moveSelection(key) {
        if (selectedCellIndex === null) return;
        let row = Math.floor(selectedCellIndex / 9);
        let col = selectedCellIndex % 9;
        
        if (key === 'ArrowUp') row = Math.max(0, row - 1);
        if (key === 'ArrowDown') row = Math.min(8, row + 1);
        if (key === 'ArrowLeft') col = Math.max(0, col - 1);
        if (key === 'ArrowRight') col = Math.min(8, col + 1);
        
        selectCell(row * 9 + col);
    }

    // --- SUDOKU GENERATOR ALGORITHMS ---

    function generateCompleteBoard() {
        const board = Array.from({ length: 9 }, () => Array(9).fill(0));
        fillBoard(board);
        return board;
    }

    function fillBoard(board) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0) {
                    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                    for (let num of nums) {
                        if (isValid(board, row, col, num)) {
                            board[row][col] = num;
                            if (fillBoard(board)) return true;
                            board[row][col] = 0; // Backtrack
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    function removeNumbers(board, attempts) {
        while (attempts > 0) {
            let row = Math.floor(Math.random() * 9);
            let col = Math.floor(Math.random() * 9);
            while (board[row][col] === 0) {
                row = Math.floor(Math.random() * 9);
                col = Math.floor(Math.random() * 9);
            }
            board[row][col] = 0;
            attempts--;
        }
    }

    function isValid(board, row, col, num) {
        for (let i = 0; i < 9; i++) {
            // Check Row & Col
            if (board[row][i] === num) return false;
            if (board[i][col] === num) return false;
            
            // Check 3x3 Box
            const boxRow = 3 * Math.floor(row / 3) + Math.floor(i / 3);
            const boxCol = 3 * Math.floor(col / 3) + i % 3;
            if (board[boxRow][boxCol] === num) return false;
        }
        return true;
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
});