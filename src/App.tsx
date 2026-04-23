/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState } from './types';
import Game from './components/Game';
import Menu from './components/Menu';
import GameOver from './components/GameOver';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [lastScore, setLastScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('highScore');
    return saved ? parseInt(saved, 10) : 0;
  });

  const startGame = () => setGameState(GameState.PLAYING);
  const endGame = (score: number) => {
    setLastScore(score);
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('highScore', score.toString());
    }
    setGameState(GameState.GAMEOVER);
  };
  const returnToMenu = () => setGameState(GameState.MENU);

  return (
    <div className="relative w-full h-screen bg-[#020617] overflow-hidden font-sans text-white">
      <AnimatePresence mode="wait">
        {gameState === GameState.MENU && (
          <Menu 
            key="menu" 
            onStart={startGame} 
            highScore={highScore} 
          />
        )}
        
        {gameState === GameState.PLAYING && (
          <Game 
            key="game" 
            onGameOver={endGame} 
          />
        )}
        
        {gameState === GameState.GAMEOVER && (
          <GameOver 
            key="gameover" 
            score={lastScore} 
            highScore={highScore}
            onRestart={startGame}
            onMenu={returnToMenu}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
