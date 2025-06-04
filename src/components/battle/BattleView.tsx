import React, { useState, useEffect } from 'react';
import { Share2, ThumbsUp, ArrowLeft, Clock, MessageCircle, Crown, Play, UserX, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useBattleStore } from '../../store/battleStore';
import { useAuthStore } from '../../store/authStore';
import { Battle } from '../../types';
import { useTranslation } from 'react-i18next';

interface BattleViewProps {
  battle: Battle;
}

export const BattleView: React.FC<BattleViewProps> = ({ battle }) => {
  const { t } = useTranslation();
  const [hasVoted, setHasVoted] = useState<'A' | 'B' | null>(null);
  const [votesA, setVotesA] = useState(battle.votes_a);
  const [votesB, setVotesB] = useState(battle.votes_b);
  const [comment, setComment] = useState('');
  const [isVoting, setIsVoting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isLoadingVoteStatus, setIsLoadingVoteStatus] = useState(true);
  
  const { voteBattle, cancelVote, getUserVote } = useBattleStore();
  const { user } = useAuthStore();

  const isUserParticipant = user ? (battle.contestant_a_id === user.id || battle.contestant_b_id === user.id) : false;
  
  // Load user's current vote status when component mounts
  useEffect(() => {
    const loadVoteStatus = async () => {
      setIsLoadingVoteStatus(true);
      try {
        const voteStatus = await getUserVote(battle.id);
        console.log('🔍 Current vote status:', voteStatus);
        if (voteStatus.hasVoted) {
          setHasVoted(voteStatus.vote);
        } else {
          setHasVoted(null);
        }
      } catch (error) {
        console.error('❌ Failed to load vote status:', error);
      } finally {
        setIsLoadingVoteStatus(false);
      }
    };
    
    loadVoteStatus();
  }, [battle.id, getUserVote]);
  
  // Calculate time remaining
  const getTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    
    if (diffTime <= 0) {
      return t('battleView.votingEnded');
    }
    
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}${t('battleView.timeUnits.days')} ${diffHours}${t('battleView.timeUnits.hours')}`;
    } else if (diffHours > 0) {
      return `${diffHours}${t('battleView.timeUnits.hours')} ${diffMinutes}${t('battleView.timeUnits.minutes')}`;
    } else {
      return `${diffMinutes}${t('battleView.timeUnits.minutes')}`;
    }
  };
  
  // Calculate vote percentages
  const totalVotes = votesA + votesB;
  const percentageA = totalVotes > 0 ? (votesA / totalVotes) * 100 : 50;
  
  // Determine who's leading
  const isALeading = votesA > votesB;
  const isBLeading = votesB > votesA;
  
  // Handle voting - now connects to battleStore
  const handleVote = async (contestant: 'A' | 'B') => {
    if (hasVoted || isVoting || isCancelling || isUserParticipant) return;
    
    console.log('🗳️ Vote button clicked:', { contestant, battleId: battle.id });
    
    setIsVoting(true);
    try {
      await voteBattle(battle.id, contestant);
      
      // Only update local state if vote was successful
      // The battleStore will handle the actual state management
    setHasVoted(contestant);
    if (contestant === 'A') {
        setVotesA((prev: number) => prev + 1);
    } else {
        setVotesB((prev: number) => prev + 1);
    }
    } catch (error) {
      console.error('❌ Vote failed in component:', error);
      // Don't update local state if vote failed
    } finally {
      setIsVoting(false);
    }
  };

  // Handle vote cancellation
  const handleCancelVote = async () => {
    if (!hasVoted || isCancelling || isVoting || isUserParticipant) return;
    
    console.log('🗑️ Cancel vote button clicked:', { currentVote: hasVoted, battleId: battle.id });
    
    const previousVote = hasVoted; // Store before starting cancellation
    setIsCancelling(true);
    
    try {
      await cancelVote(battle.id);
      
      // Only update local state if cancellation was successful
      // Check if the cancelVote function actually succeeded by checking the response
      console.log('✅ Vote cancellation completed, updating local state');
      setHasVoted(null);
      
      if (previousVote === 'A') {
        setVotesA((prev: number) => Math.max(0, prev - 1));
      } else if (previousVote === 'B') {
        setVotesB((prev: number) => Math.max(0, prev - 1));
      }
      
      // 🔄 Force reload vote status from database to ensure consistency
      console.log('🔄 Reloading vote status to ensure consistency...');
      try {
        const voteStatus = await getUserVote(battle.id);
        console.log('📊 Post-cancellation vote status:', voteStatus);
        
        if (voteStatus.hasVoted !== false) {
          console.log('⚠️ Vote still exists in database, correcting local state');
          setHasVoted(voteStatus.vote);
          // Also correct vote counts by refetching from store
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } catch (reloadError) {
        console.error('❌ Failed to reload vote status:', reloadError);
      }
      
    } catch (error) {
      console.error('❌ Vote cancellation failed in component, NOT updating local state:', error);
      // Keep the previous vote state - don't change anything
      // The user should see their vote is still there
    } finally {
      setIsCancelling(false);
    }
  };

  const getDefaultAvatarUrl = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

  // Mock comments data
  const mockComments = [
    {
      id: '1',
      username: 'BeatMaster',
      avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=100',
      content: 'Amazing patterns! The bass is so clean 🔥',
      timestamp: '2 hours ago'
    },
    {
      id: '2',
      username: 'RhythmQueen',
      avatar: 'https://images.pexels.com/photos/773371/pexels-photo-773371.jpeg?auto=compress&cs=tinysrgb&w=100',
      content: 'That throat bass transition was insane!',
      timestamp: '1 hour ago'
    },
    {
      id: '3',
      username: 'BassDropper',
      avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100',
      content: 'Both killed it but that second drop was something else',
      timestamp: '30 minutes ago'
    }
  ];
  
  return (
    <div className="min-h-screen bg-gray-950 py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white">{t('battleView.title')}</h1>
          <div className="text-indigo-400 text-sm mt-1">{t('battleView.subtitle')}</div>
          <div className="text-gray-400 text-xs mt-2">
            {t('battleView.votingEndsIn')}: <span className="font-semibold text-gray-200">{getTimeRemaining(battle.end_voting_at)}</span>
          </div>
        </div>

        {/* Battle Players Section */}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24">
            {/* Player A Card */}
            <Card className="bg-gray-900 rounded-lg shadow-lg overflow-hidden">
              <div className="p-4 bg-black/20">
                <div className="flex items-center space-x-4">
                  <Link to={`/profile/${battle.contestant_a_id}`} className="group">
                    <img
                      src={battle.contestant_a?.avatar_url || getDefaultAvatarUrl(battle.contestant_a_id)}
                      alt={battle.contestant_a?.username || 'Contestant A'}
                      className="w-16 h-16 rounded-full object-cover border-2 group-hover:border-cyan-500/50 transition-colors border-blue-400"
                    />
                  </Link>
                  <div>
                    <Link to={`/profile/${battle.contestant_a_id}`} className="group">
                      <div className="font-semibold text-white text-lg group-hover:text-cyan-400 transition-colors">{battle.contestant_a?.username || 'Unknown'}</div>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="aspect-video bg-black relative group">
                {!battle.video_url_a && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="h-16 w-16 text-gray-600" />
                  </div>
                )}
                {battle.video_url_a && (
                <video
                    src={battle.video_url_a}
                  className="w-full h-full object-contain"
                  controls
                />
                )}
              </div>

              <div className="p-4">
                {isLoadingVoteStatus ? (
                  <Button variant="primary" size="lg" className="w-full bg-gray-600" disabled={true} isLoading={true}>
                    {t('battleView.loading')}
                  </Button>
                ) : isUserParticipant ? (
                  <Button variant="secondary" size="lg" className="w-full cursor-not-allowed" disabled={true} leftIcon={<UserX className="h-5 w-5"/>}>
                    {t('battleView.participatingInBattle')}
                  </Button>
                ) : hasVoted === 'A' ? (
                  <div className="space-y-3">
                    <Button variant="primary" size="lg" className="w-full bg-green-600 hover:bg-green-700" leftIcon={<ThumbsUp className="h-5 w-5" />} disabled={true}>
                      {t('battleView.votedFor')} {battle.contestant_a?.username || 'Contestant A'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs px-3 py-1" 
                      onClick={handleCancelVote} 
                      disabled={isCancelling || isVoting} 
                      isLoading={isCancelling}
                      leftIcon={<X className="h-3 w-3" />}
                    >
                      {isCancelling ? t('battleView.cancellingVote') : t('battleView.cancelVote')}
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="primary" 
                    size="lg" 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    onClick={() => handleVote('A')} 
                    disabled={isVoting || isCancelling || !!hasVoted} 
                    isLoading={isVoting} 
                    leftIcon={<ThumbsUp className="h-5 w-5"/>}
                  >
                    {t('battleView.voteFor')} {battle.contestant_a?.username || 'Contestant A'}
                  </Button>
                )}
              </div>
            </Card>

            {/* VS Badge */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:block">
              <div className="relative w-32 h-32">
                {/* Outer glow ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 opacity-20 blur-xl animate-pulse" />
                
                {/* Main VS circle */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(96,165,250,0.3)]">
                  <div className="text-5xl font-bold text-white text-shadow-glow">VS</div>
                </div>
                
                {/* Inner highlight */}
                <div className="absolute inset-4 rounded-full bg-gradient-to-t from-transparent to-white/10" />
              </div>
            </div>

            {/* Player B Card */}
            <Card className="bg-gray-900 rounded-lg shadow-lg overflow-hidden">
              <div className="p-4 bg-black/20">
                <div className="flex items-center space-x-4">
                  <Link to={`/profile/${battle.contestant_b_id}`} className="group">
                    <img
                      src={battle.contestant_b?.avatar_url || getDefaultAvatarUrl(battle.contestant_b_id)}
                      alt={battle.contestant_b?.username || 'Contestant B'}
                      className="w-16 h-16 rounded-full object-cover border-2 group-hover:border-cyan-500/50 transition-colors border-pink-400"
                    />
                  </Link>
                  <div>
                    <Link to={`/profile/${battle.contestant_b_id}`} className="group">
                      <div className="font-semibold text-white text-lg group-hover:text-cyan-400 transition-colors">{battle.contestant_b?.username || 'Unknown'}</div>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="aspect-video bg-black relative group">
                {!battle.video_url_b && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="h-16 w-16 text-gray-600" />
                  </div>
                )}
                {battle.video_url_b && (
                <video
                    src={battle.video_url_b}
                  className="w-full h-full object-contain"
                  controls
                />
                )}
              </div>

              <div className="p-4">
                {isLoadingVoteStatus ? (
                  <Button variant="primary" size="lg" className="w-full bg-gray-600" disabled={true} isLoading={true}>
                    {t('battleView.loading')}
                  </Button>
                ) : isUserParticipant ? (
                  <Button variant="secondary" size="lg" className="w-full cursor-not-allowed" disabled={true} leftIcon={<UserX className="h-5 w-5"/>}>
                    {t('battleView.participatingInBattle')}
                  </Button>
                ) : hasVoted === 'B' ? (
                  <div className="space-y-3">
                    <Button variant="primary" size="lg" className="w-full bg-green-600 hover:bg-green-700" leftIcon={<ThumbsUp className="h-5 w-5" />} disabled={true}>
                      {t('battleView.votedFor')} {battle.contestant_b?.username || 'Contestant B'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs px-3 py-1" 
                      onClick={handleCancelVote} 
                      disabled={isCancelling || isVoting} 
                      isLoading={isCancelling}
                      leftIcon={<X className="h-3 w-3" />}
                    >
                      {isCancelling ? t('battleView.cancellingVote') : t('battleView.cancelVote')}
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="primary" 
                    size="lg" 
                    className="w-full bg-pink-600 hover:bg-pink-700" 
                    onClick={() => handleVote('B')} 
                    disabled={isVoting || isCancelling || !!hasVoted} 
                    isLoading={isVoting} 
                    leftIcon={<ThumbsUp className="h-5 w-5"/>}
                  >
                    {t('battleView.voteFor')} {battle.contestant_b?.username || 'Contestant B'}
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Vote Statistics Section */}
        <Card className="mt-12 bg-gray-900 p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-3 text-sm">
            <div className="text-gray-300">
              {t('battleView.totalVotes')}: <span className="font-bold text-white">{totalVotes}</span>
            </div>
            <div className="flex items-center text-indigo-400 hover:text-indigo-300 cursor-pointer">
              <MessageCircle className="h-4 w-4 mr-1.5" />
              {t('battleView.comments')}: <span className="font-bold ml-1">{mockComments.length}</span>
            </div>
          </div>

          <div className="relative h-3 bg-gray-700 rounded-lg overflow-hidden mb-2">
            <div className="absolute inset-0 flex">
              <div 
                className="h-full transition-all duration-300 relative overflow-hidden"
                style={{ 
                  width: `${percentageA}%`,
                  background: isALeading ? 
                    'linear-gradient(90deg, #3B82F6, #1E40AF)' : 
                    'linear-gradient(90deg, #3B82F688, #1E40AF88)'
                }}
              >
                {isALeading && (
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                      animation: 'shine 2s infinite'
                    }}
                  />
                )}
              </div>
              <div 
                className="h-full transition-all duration-300 relative overflow-hidden"
                style={{ 
                  width: `${100 - percentageA}%`,
                  background: isBLeading ? 
                    'linear-gradient(90deg, #EC4899, #BE185D)' : 
                    'linear-gradient(90deg, #EC489988, #BE185D88)'
                }}
              >
                {isBLeading && (
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                      animation: 'shine 2s infinite'
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <div className={`font-semibold ${
              isALeading ? 'text-yellow-300 font-extrabold' : 'text-blue-400'
            }`}>
              {votesA} {t('battleView.votes')}
              {isALeading && (
                <span className="text-yellow-400 font-bold ml-1">
                  <Crown className="h-4 w-4 inline" /> {t('battleView.leading')}
                </span>
              )}
            </div>
            <div className={`font-semibold ${
              isBLeading ? 'text-yellow-300 font-extrabold' : 'text-pink-400'
            }`}>
              {votesB} {t('battleView.votes')}
              {isBLeading && (
                <span className="text-yellow-400 font-bold ml-1">
                  <Crown className="h-4 w-4 inline" /> {t('battleView.leading')}
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Comments Section */}
        <Card className="mt-8 bg-gray-900 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-4">{t('battleView.comments')}</h2>
          
          <div className="space-y-4 mb-6">
            {mockComments.map(comment => (
              <div key={comment.id} className="flex items-start space-x-3">
                <img
                  src={comment.avatar}
                  alt={comment.username}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <div className="flex items-baseline">
                    <span className="font-semibold text-indigo-300 text-sm">
                      {comment.username}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {comment.timestamp}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mt-0.5">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-700">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('battleView.addComment')}
              className="w-full p-2 rounded-md bg-gray-700 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
            />
            <div className="mt-2 flex justify-end">
              <Button
                variant="primary"
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {t('battleView.postComment')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};