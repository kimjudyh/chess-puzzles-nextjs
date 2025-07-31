'use client';

import { useState, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import { Chessboard, SquareHandlerArgs, PieceDropHandlerArgs, } from 'react-chessboard';
import lichessPuzzles from '../data/lichessPuzzles'


// ChatGPT generated puzzles
const puzzles = [
  {
    id: 1,
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3',
    solution: ['Bxf7+'],
    difficulty: 'easy',
  },
  {
    id: 2,
    fen: '4r1k1/1pp2ppp/p1n2q2/3np3/1P2P3/P1N1BP2/2PQ2PP/3RR1K1 w - - 0 1',
    solution: ['Nxd5', 'Bxd4+', 'exd4'],
    difficulty: 'medium',
  },
  {
    id: 3,
    fen: 'r4rk1/1pp1qppp/p1n1bn2/4N3/3P4/2PB1N2/PP3PPP/R2QR1K1 w - - 0 1',
    solution: ['Nxc6', 'bxc6', 'Bxh7+'],
    difficulty: 'hard',
  },
];

type Difficulty = 'easy' | 'medium' | 'hard';

export default function HomePage() {

  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [puzzle, setPuzzle] = useState<typeof lichessPuzzles[0] | null>(null);
  const [hint, setHint] = useState('');
  const [remainingMovesIndex, setRemainingMovesIndex] = useState<number>(0);
  const [solution, setSolution] = useState<string[]>([]); // Store the moves for the puzzle
  const [isPuzzleComplete, setIsPuzzleComplete] = useState(false);
  const [isIncorrectMove, setIsIncorrectMove] = useState<true | false>(false);

  const chessGameRef = useRef(new Chess());
  const chessGame = chessGameRef.current;

  // track the current position of the chess game in state to trigger a re-render of the chessboard
  const [chessPosition, setChessPosition] = useState(chessGame.fen());
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');


  // get the move options for a square to show valid moves
  function getMoveOptions(square: Square) {
    // get the moves for the square
    const moves = chessGame.moves({
      square,
      verbose: true
    });

    // if no moves, clear the option squares
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    // create a new object to store the option squares
    const newSquares: Record<string, React.CSSProperties> = {};

    // loop through the moves and set the option squares
    for (const move of moves) {
      newSquares[move.to] = {
        background: chessGame.get(move.to) && chessGame.get(move.to)?.color !== chessGame.get(square)?.color 
        ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)' // larger circle for capturing
        : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
        // smaller circle for moving
        borderRadius: '50%'
      };
    }

    // set the square clicked to move from to yellow
    newSquares[square] = {
      background: 'rgba(255, 255, 0, 0.4)'
    };

    // set the option squares
    setOptionSquares(newSquares);

    // return true to indicate that there are move options
    return true;
  }

  const checkPuzzleComplete = (index: number) => {
    // Check if we've completed all solution moves
    if (index >= solution.length) {
      setIsPuzzleComplete(true);
    }
  }

  function moveOpponentPiece(index: number) {
    // Automatically move the opponent's piece
    console.log("Remaining Moves:", solution, remainingMovesIndex);
    if (index < solution.length) {
      const opponentMove = solution[index]; // Get the opponent's move
      if (opponentMove) {
        chessGame.move({
          from: opponentMove.slice(0, 2),
          to: opponentMove.slice(2, 4),
          promotion: opponentMove.length === 5 ? opponentMove[4] as 'q' | 'r' | 'b' | 'n' : undefined
        });
        // setChessPosition(chessGame.fen());
        setRemainingMovesIndex(index + 1); // Update the remaining moves
        // puzzle?.Moves = moves.join(' '); // Update the remaining moves

        // Highlight the opponent's move
        const newSquares: Record<string, React.CSSProperties> = {
          [opponentMove.slice(0, 2)]: { background: 'rgba(255, 213, 0, 0.4)' }, // Highlight the source square
          [opponentMove.slice(2, 4)]: { background: 'rgba(0, 255, 0, 0.4)' }  // Highlight the target square
        };
        setOptionSquares(newSquares); // Update the square styles
        setChessPosition(chessGame.fen());

        // Check if puzzle is complete after opponent's move
        checkPuzzleComplete(index + 1);
      }
    }
  }

  function onSquareClick({
    square,
    piece
  }: SquareHandlerArgs) {
    // piece clicked to move
    if (!moveFrom && piece) {
      // get the move options for the square
      const hasMoveOptions = getMoveOptions(square as Square);

      // if move options, set the moveFrom to the square
      if (hasMoveOptions) {
        setMoveFrom(square);
      }

      // return early
      return;
    }

    // square clicked to move to, check if valid move
    const moves = chessGame.moves({
      square: moveFrom as Square,
      verbose: true
    });
    const foundMove = moves.find(m => m.from === moveFrom && m.to === square);

    // not a valid move
    if (!foundMove) {
      // check if clicked on new piece
      const hasMoveOptions = getMoveOptions(square as Square);

      // if new piece, setMoveFrom, otherwise clear moveFrom
      setMoveFrom(hasMoveOptions ? square : '');

      // return early
      return;
    }

    // is normal move
    try {
      chessGame.move({
        from: moveFrom,
        to: square,
        promotion: 'q'
      });
      if (moveFrom === solution[remainingMovesIndex]?.slice(0, 2) 
        && square === solution[remainingMovesIndex]?.slice(2, 4)) {
        // If the correct move is made, increment the remaining moves index
        setIsIncorrectMove(false);
        const newIndex = remainingMovesIndex + 1;
        setRemainingMovesIndex(newIndex);
        checkPuzzleComplete(newIndex);
        setTimeout(() => moveOpponentPiece(newIndex), 500)
        // update the position state
        setChessPosition(chessGame.fen());
      } else {
        setIsIncorrectMove(true);
      }

      // clear moveFrom and optionSquares
      setMoveFrom('');
      setOptionSquares({});

      setChessPosition(chessGame.fen());
      return true
    } catch {
      // if invalid, setMoveFrom and getMoveOptions
      const hasMoveOptions = getMoveOptions(square as Square);

      // if new piece, setMoveFrom, otherwise clear moveFrom
      if (hasMoveOptions) {
        setMoveFrom(square);
      }

      // return early
      return;
    }
  }

  // handle piece drop
  function onPieceDrop({
    sourceSquare,
    targetSquare
  }: PieceDropHandlerArgs) {
    // type narrow targetSquare potentially being null (e.g. if dropped off board)
    if (!targetSquare) {
      return false;
    }

    // try to make the move according to chess.js logic
    try {
      chessGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // always promote to a queen for example simplicity
      });

      if (sourceSquare === solution[remainingMovesIndex]?.slice(0, 2) 
        && targetSquare === solution[remainingMovesIndex]?.slice(2, 4)) {
        // If the correct move is made, increment the remaining moves index
        setIsIncorrectMove(false);
        const newIndex = remainingMovesIndex + 1
        checkPuzzleComplete(newIndex);
        setTimeout(() => moveOpponentPiece(newIndex), 500)
        setRemainingMovesIndex(newIndex);
      } else {
        setIsIncorrectMove(true);
      }
      // update the position state upon successful move to trigger a re-render of the chessboard
      setChessPosition(chessGame.fen());

      // clear moveFrom and optionSquares
      setMoveFrom('');
      setOptionSquares({});


      setChessPosition(chessGame.fen());

      // return true as the move was successful
      return true;
    } catch {
      // return false as the move was not successful
      return false;
    }
  }

  // Add this new function to handle retrying after an incorrect move
  const handleRetry = () => {
    chessGame.undo(); // Undo the last move
    setChessPosition(chessGame.fen());
    setIsIncorrectMove(false);
  };

  const loadPuzzle = () => {
    setIsPuzzleComplete(false); // Reset puzzle completion state
    setIsIncorrectMove(false); // Reset incorrect move state
    const filteredPuzzles = lichessPuzzles.filter(p => {
      const rating = parseInt(p.Rating);
      if (difficulty === 'easy') {
        return rating < 1500 && p.Themes.includes("mate");
      } else if (difficulty === 'medium') {
        return rating >= 1500 && rating < 2000 && p.Themes.includes("mate");
      } else {
        return rating >= 2000 && p.Themes.includes("mate");
      }
    });

    if (filteredPuzzles.length === 0) {
      console.warn(`No puzzles found for difficulty: ${difficulty}`);
      setPuzzle(null);
      // Optionally, inform the user via UI state
      return;
    }

    const randomPuzzle = filteredPuzzles[Math.floor(Math.random() * filteredPuzzles.length)];

    setPuzzle(randomPuzzle);
    const moves = randomPuzzle.Moves.split(' ');
    setSolution(moves)

    try {
      setRemainingMovesIndex(0); // Reset remaining moves index
      chessGame.load(randomPuzzle.FEN);
      setChessPosition(chessGame.fen());
      // Set up the first move
      const firstMove = moves[0]
      // Determine player's color based on the first move
      if (firstMove) {
        const playerIsWhite = randomPuzzle.FEN.split(' ')[1] === 'b'; // If FEN indicates black to move, player is white
        setBoardOrientation(playerIsWhite ? 'white' : 'black');
      }

      chessGame.move({
        from: firstMove.slice(0, 2),
        to: firstMove.slice(2, 4),
        promotion: firstMove.length === 5 ? firstMove[4] as 'q' | 'r' | 'b' | 'n' : undefined
      });

      // Highlight the opponent's move
      const newSquares: Record<string, React.CSSProperties> = {
        [firstMove.slice(0, 2)]: { background: 'rgba(255, 213, 0, 0.4)' }, // Highlight the source square
        [firstMove.slice(2, 4)]: { background: 'rgba(0, 255, 0, 0.4)' }  // Highlight the target square
      };
      setOptionSquares(newSquares); // Update the square styles

      console.log(randomPuzzle)
      console.log(remainingMovesIndex)
      setRemainingMovesIndex(1); // Update remaining moves after the first move
      setChessPosition(chessGame.fen());
    } catch (e) {
      console.warn("Invalid FEN. Loading default board.");
      chessGame.reset();
      setChessPosition(chessGame.fen());
    }
    setHint('');
  };

  const getHint = () => {
    console.log("current puzzle", puzzle, solution, remainingMovesIndex)
    if (remainingMovesIndex < solution.length) {
      setHint(`Try moving ${solution[remainingMovesIndex]}.`);
    } else {
      setHint('No hints available.');
    }
  };

  const chessboardOptions = {
    onPieceDrop,
    onSquareClick,
    position: chessPosition,
    squareStyles: optionSquares,
    id: 'click-or-drag-to-move',
    boardOrientation
  };

  return (
    <main className="p-4 max-w-screen-md mx-auto">
      <h1 className="text-2xl font-bold mb-2">Chess Puzzle Trainer</h1>
      <div className="mb-2">
        <label className="mr-2">Select difficulty:</label>
        {(['easy', 'medium', 'hard'] as Difficulty[]).map(level => (
          <button
            key={level}
            className={`mr-2 px-3 py-1 rounded ${
              difficulty === level ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setDifficulty(level)}
          >
            {level}
          </button>
        ))}
        <button
          className="mb-2 px-4 py-2 bg-green-500 text-white rounded"
          onClick={loadPuzzle}
        >
          Load Puzzle
        </button>
      </div>
      {isPuzzleComplete && (
        <div className="mt-2 p-4 bg-green-100 border border-green-500 rounded-lg">
          <p className="text-green-700 font-bold">
            Puzzle completed successfully! 🎉
          </p>
        </div>
      )}
      {isIncorrectMove && (
        <div className="mt-4 p-4 bg-red-100 border border-red-500 rounded-lg">
          <p className="text-red-700 font-bold">
            Incorrect move! Try again.
          </p>
          <button
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={handleRetry}
          >
            Retry Move
          </button>
        </div>
      )}
      {puzzle && (
        <>
          <div className="flex items-center space-x-4 mt-2 mb-4">
            <button
              className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded"
              onClick={getHint}
            >
              Get Hint
            </button>
            {hint && <p className="mt-2 text-lg font-semibold">Hint: {hint}</p>}
          </div>
          <Chessboard
            options={chessboardOptions}
          />
          <div>
            {boardOrientation.toUpperCase()} to move
          </div>
        </>
      )}
    </main>
  );
}
