import React, { useState } from 'react';
import { Calculator, Star, Trophy } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RatingChangeDisplay } from '../components/battle/RatingChangeDisplay';

const RatingTestPage: React.FC = () => {
  const [player1Rating, setPlayer1Rating] = useState(1200);
  const [player2Rating, setPlayer2Rating] = useState(1200);
  const [winner, setWinner] = useState<1 | 2>(1);
  const [results, setResults] = useState<any>(null);

  // Simple ELO calculation for testing (client-side)
  const calculateELO = (winnerRating: number, loserRating: number, kFactor: number = 32) => {
    const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));
    
    const newWinnerRating = Math.max(800, Math.round(winnerRating + kFactor * (1 - expectedWinner)));
    const newLoserRating = Math.max(800, Math.round(loserRating + kFactor * (0 - expectedLoser)));
    
    return {
      winnerRating: newWinnerRating,
      loserRating: newLoserRating,
      winnerChange: newWinnerRating - winnerRating,
      loserChange: newLoserRating - loserRating
    };
  };

  const handleCalculate = () => {
    const calc = calculateELO(
      winner === 1 ? player1Rating : player2Rating,
      winner === 1 ? player2Rating : player1Rating
    );
    
    setResults({
      player1: {
        oldRating: player1Rating,
        newRating: winner === 1 ? calc.winnerRating : calc.loserRating,
        isWinner: winner === 1
      },
      player2: {
        oldRating: player2Rating,
        newRating: winner === 2 ? calc.winnerRating : calc.loserRating,
        isWinner: winner === 2
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 py-10">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <Calculator className="h-8 w-8 text-cyan-500" />
            Eloレート計算テスト
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            BeatNexusのEloレーティングシステムをテストできます。プレイヤーのレートと勝者を設定して計算してみましょう。
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Input Section */}
          <Card className="bg-gray-900 border border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              バトル設定
            </h2>
            
            <div className="space-y-6">
              {/* Player 1 */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  プレイヤー1のレート
                </label>
                <input
                  type="number"
                  value={player1Rating}
                  onChange={(e) => setPlayer1Rating(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                  min="800"
                  max="3000"
                />
              </div>

              {/* Player 2 */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  プレイヤー2のレート
                </label>
                <input
                  type="number"
                  value={player2Rating}
                  onChange={(e) => setPlayer2Rating(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                  min="800"
                  max="3000"
                />
              </div>

              {/* Winner Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  勝者
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setWinner(1)}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      winner === 1
                        ? 'bg-green-500/20 border-green-500 text-green-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    プレイヤー1
                  </button>
                  <button
                    onClick={() => setWinner(2)}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      winner === 2
                        ? 'bg-green-500/20 border-green-500 text-green-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    プレイヤー2
                  </button>
                </div>
              </div>

              <Button 
                onClick={handleCalculate}
                className="w-full bg-cyan-500 hover:bg-cyan-600"
              >
                <Calculator className="h-4 w-4 mr-2" />
                レート計算
              </Button>
            </div>
          </Card>

          {/* Results Section */}
          <Card className="bg-gray-900 border border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              計算結果
            </h2>
            
            {results ? (
              <div className="space-y-4">
                <RatingChangeDisplay
                  playerName="プレイヤー1"
                  oldRating={results.player1.oldRating}
                  newRating={results.player1.newRating}
                  isWinner={results.player1.isWinner}
                />
                
                <RatingChangeDisplay
                  playerName="プレイヤー2"
                  oldRating={results.player2.oldRating}
                  newRating={results.player2.newRating}
                  isWinner={results.player2.isWinner}
                />

                <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">計算詳細</h3>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>• K-Factor: 32（標準値）</p>
                    <p>• 最低レート: 800</p>
                    <p>• レート差が大きいほど、格上が勝った時の上昇幅は小さくなります</p>
                    <p>• 格下が勝った時は大幅にレートが上昇します</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                  <Star className="h-8 w-8 text-gray-600" />
                </div>
                <p className="text-gray-400">
                  左側でバトル設定を行い、「レート計算」ボタンを押してください
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Example Scenarios */}
        <Card className="bg-gray-900 border border-gray-800 p-6 mt-8">
          <h2 className="text-xl font-semibold text-white mb-6">
            サンプルシナリオ
          </h2>
          
          <div className="grid gap-4 md:grid-cols-3">
            <button
              onClick={() => {
                setPlayer1Rating(1200);
                setPlayer2Rating(1200);
                setWinner(1);
                handleCalculate();
              }}
              className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-left"
            >
              <div className="text-white font-medium mb-1">同レート対戦</div>
              <div className="text-gray-400 text-sm">1200 vs 1200</div>
            </button>
            
            <button
              onClick={() => {
                setPlayer1Rating(1400);
                setPlayer2Rating(1000);
                setWinner(2);
                handleCalculate();
              }}
              className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-left"
            >
              <div className="text-white font-medium mb-1">番狂わせ</div>
              <div className="text-gray-400 text-sm">1400 vs 1000（格下勝利）</div>
            </button>
            
            <button
              onClick={() => {
                setPlayer1Rating(1600);
                setPlayer2Rating(1200);
                setWinner(1);
                handleCalculate();
              }}
              className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-left"
            >
              <div className="text-white font-medium mb-1">格上勝利</div>
              <div className="text-gray-400 text-sm">1600 vs 1200（予想通り）</div>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RatingTestPage; 