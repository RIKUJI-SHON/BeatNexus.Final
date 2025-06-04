import React from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useNotificationStore } from '../store/notificationStore';
import { useTranslation } from 'react-i18next';
import { Bell, Swords, CheckCircle, Clock, Info, Trophy, Award, Handshake } from 'lucide-react';
import { supabase } from '../lib/supabase';

const NotificationTestPage: React.FC = () => {
  const { t } = useTranslation();
  const { addNotification, clearAllNotifications, notifications, unreadCount, createNotification, fetchNotifications } = useNotificationStore();

  const handleAddBattleNotification = () => {
    console.log('🔔 Manually adding battle match notification');
    addNotification({
      title: t('notifications.battleMatched.title'),
      message: t('notifications.battleMatched.message'),
      type: 'battle_matched',
      relatedBattleId: 'test-battle-123',
    });
    console.log('✅ Manual battle notification added');
  };

  const handleAddBattleNotificationDB = async () => {
    console.log('🔔 Adding battle match notification to database');
    try {
      await createNotification({
        title: t('notifications.battleMatched.title'),
        message: t('notifications.battleMatched.message'),
        type: 'battle_matched',
        relatedBattleId: 'test-battle-db-123',
      });
      console.log('✅ Database battle notification added');
    } catch (error) {
      console.error('❌ Failed to add database notification:', error);
    }
  };

  const handleAddRealBattleNotification = async () => {
    console.log('🔔 Adding battle match notification with real battle ID');
    try {
      // 実際のバトルIDを取得してテスト
      const { data: battles } = await supabase
        .from('active_battles')
        .select('id')
        .eq('status', 'ACTIVE')
        .limit(1);
      
      const battleId = battles && battles.length > 0 ? battles[0].id : 'no-active-battle';
      
      await createNotification({
        title: t('notifications.battleMatched.title'),
        message: `${t('notifications.battleMatched.message')} (実際のバトルID: ${battleId})`,
        type: 'battle_matched',
        relatedBattleId: battleId,
      });
      console.log('✅ Real battle notification added with ID:', battleId);
    } catch (error) {
      console.error('❌ Failed to add real battle notification:', error);
    }
  };

  const handleTestRealtimeConnection = () => {
    console.log('🔍 Testing realtime connection status...');
    
    // Supabaseのリアルタイム接続状況をチェック
    const channels = supabase.getChannels();
    console.log('📡 Active channels:', channels.length);
    
    channels.forEach((channel, index) => {
      console.log(`📺 Channel ${index + 1}:`, {
        topic: channel.topic,
        state: channel.state,
      });
    });
    
    // 新しいテストチャンネルを作成して接続をテスト
    const testChannel = supabase
      .channel('test-connection')
      .subscribe((status) => {
        console.log('🧪 Test channel status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime connection is working');
          // テスト完了後にチャンネルを削除
          setTimeout(() => {
            supabase.removeChannel(testChannel);
            console.log('🧹 Test channel removed');
          }, 2000);
        }
      });
  };

  const handleRefreshNotifications = async () => {
    console.log('🔄 Refreshing notifications from database');
    try {
      await fetchNotifications();
      console.log('✅ Notifications refreshed from database');
    } catch (error) {
      console.error('❌ Failed to refresh notifications:', error);
    }
  };

  const handleAddSuccessNotification = () => {
    addNotification({
      title: 'テスト成功',
      message: 'これは成功通知のテストです。',
      type: 'success',
    });
  };

  const handleAddWarningNotification = () => {
    addNotification({
      title: '警告メッセージ',
      message: 'これは警告通知のテストです。注意が必要です。',
      type: 'warning',
    });
  };

  const handleAddInfoNotification = () => {
    addNotification({
      title: 'テスト情報',
      message: 'これは情報通知のテストです。',
      type: 'info',
    });
  };

  const handleAddWinNotification = () => {
    addNotification({
      title: t('notifications.battleCompleted.title'),
      message: t('notifications.battleCompleted.winMessage'),
      type: 'battle_win',
      relatedBattleId: 'test-battle-win-123',
    });
  };

  const handleAddLoseNotification = () => {
    addNotification({
      title: t('notifications.battleCompleted.title'),
      message: t('notifications.battleCompleted.loseMessage'),
      type: 'battle_lose',
      relatedBattleId: 'test-battle-lose-123',
    });
  };

  const handleAddDrawNotification = () => {
    addNotification({
      title: t('notifications.battleCompleted.title'),
      message: t('notifications.battleCompleted.drawMessage'),
      type: 'battle_draw',
      relatedBattleId: 'test-battle-draw-123',
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 py-10">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">通知システムテスト</h1>
          <p className="text-gray-400 mb-8">
            開発者向け: 各種通知の動作をテストできます。
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* テスト用ボタン */}
            <Card className="bg-gray-900 border border-gray-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Bell className="h-5 w-5" />
                通知テスト
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={handleAddBattleNotification}
                    className="bg-purple-600 hover:bg-purple-700"
                    leftIcon={<Swords />}
                  >
                    バトルマッチング通知
                  </Button>
                  
                  <Button
                    onClick={handleAddBattleNotificationDB}
                    className="bg-purple-600 hover:bg-purple-700"
                    leftIcon={<Swords />}
                  >
                    バトルマッチング通知（DB）
                  </Button>
                  
                  <Button
                    onClick={handleAddRealBattleNotification}
                    className="bg-purple-600 hover:bg-purple-700"
                    leftIcon={<Swords />}
                  >
                    実際のバトルID通知
                  </Button>
                  
                  <Button
                    onClick={handleTestRealtimeConnection}
                    className="bg-indigo-600 hover:bg-indigo-700"
                    leftIcon={<Bell />}
                  >
                    リアルタイム接続テスト
                  </Button>
                  
                  <Button
                    onClick={handleRefreshNotifications}
                    className="bg-gray-600 hover:bg-gray-700"
                    leftIcon={<Bell />}
                  >
                    通知をDB取得
                  </Button>
                  
                  <Button
                    onClick={handleAddSuccessNotification}
                    className="bg-green-600 hover:bg-green-700"
                    leftIcon={<CheckCircle />}
                  >
                    成功通知
                  </Button>
                  
                  <Button
                    onClick={handleAddWarningNotification}
                    className="bg-yellow-600 hover:bg-yellow-700"
                    leftIcon={<Clock />}
                  >
                    警告通知
                  </Button>
                  
                  <Button
                    onClick={handleAddInfoNotification}
                    className="bg-blue-600 hover:bg-blue-700"
                    leftIcon={<Info />}
                  >
                    情報通知
                  </Button>

                  <Button
                    onClick={handleAddWinNotification}
                    className="bg-yellow-500 hover:bg-yellow-600"
                    leftIcon={<Trophy />}
                  >
                    勝利通知
                  </Button>

                  <Button
                    onClick={handleAddLoseNotification}
                    className="bg-red-600 hover:bg-red-700"
                    leftIcon={<Award />}
                  >
                    敗北通知
                  </Button>

                  <Button
                    onClick={handleAddDrawNotification}
                    className="bg-blue-500 hover:bg-blue-600"
                    leftIcon={<Handshake />}
                  >
                    引き分け通知
                  </Button>
                </div>
                
                <Button
                  variant="outline"
                  onClick={clearAllNotifications}
                  className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  すべての通知を削除
                </Button>
              </div>
            </Card>

            {/* 通知状況 */}
            <Card className="bg-gray-900 border border-gray-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">通知状況</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">総通知数:</span>
                  <span className="text-white font-semibold">{notifications.length}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">未読通知数:</span>
                  <span className="text-cyan-400 font-semibold">{unreadCount}</span>
                </div>
              </div>

              {notifications.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">最新の通知:</h3>
                  <div className="space-y-2">
                    {notifications.slice(0, 3).map((notification) => (
                      <div 
                        key={notification.id}
                        className={`p-3 rounded-lg border ${
                          !notification.isRead 
                            ? 'bg-gray-800/50 border-cyan-500/30' 
                            : 'bg-gray-800/30 border-gray-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {notification.createdAt.toLocaleString()}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="mt-8">
            <Card className="bg-gray-900 border border-gray-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">使用方法</h2>
              <div className="space-y-3 text-gray-300 text-sm">
                <p>1. 上のボタンを使用して各種通知をテストできます。</p>
                <p>2. ヘッダーのベルアイコンに通知数が表示されるのを確認してください。</p>
                <p>3. ベルアイコンをクリックして通知ドロップダウンを開いてください。</p>
                <p>4. 通知をクリックすると既読になり、バトル通知の場合はバトルページに移動します。</p>
                <p>5. "×"ボタンで通知を削除できます。</p>
              </div>
            </Card>
          </div>

          <Button
            onClick={clearAllNotifications}
            variant="outline"
            className="border-red-500 text-red-400 hover:bg-red-500/10"
          >
            すべての通知をクリア
          </Button>

          {/* デバッグ情報 */}
          <Card className="bg-gray-900 border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">📊 デバッグ情報</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">総通知数:</span>
                <span className="text-white">{notifications.length}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">未読数:</span>
                <span className="text-cyan-400">{unreadCount}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">マッチング通知数:</span>
                <span className="text-purple-400">
                  {notifications.filter(n => n.type === 'battle_matched').length}
                </span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">バトル結果通知数:</span>
                <span className="text-yellow-400">
                  {notifications.filter(n => ['battle_win', 'battle_lose', 'battle_draw'].includes(n.type)).length}
                </span>
              </div>
              
              <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-800/50 rounded">
                <p className="font-semibold text-gray-300 mb-2">🔍 マッチング通知が来ない場合の診断手順:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>「リアルタイム接続テスト」ボタンでSupabaseリアルタイム接続を確認</li>
                  <li>ブラウザのコンソール（F12）で以下のログを確認:
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li>「⚔️ Active battles update received」- バトル作成イベント</li>
                      <li>「🆕 New battle created」- 新しいバトルの検出</li>
                      <li>「🎯 User participates in this battle: true」- ユーザー参加確認</li>
                      <li>「✅ Match notification sent successfully」- 通知送信成功</li>
                    </ul>
                  </li>
                  <li>「実際のバトルID通知」ボタンで手動テスト</li>
                  <li>投稿後に別のブラウザタブでバトル一覧を確認</li>
                  <li>active_battlesテーブルにplayer1_user_id/player2_user_idが正しく設定されているか確認</li>
                </ol>
              </div>
              
              <div className="text-xs text-gray-500 mt-4 p-3 bg-blue-900/20 rounded border border-blue-500/30">
                <p className="font-semibold text-blue-300 mb-2">💡 リアルタイム通知の仕組み:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>投稿 → Edge Function → find_match_and_create_battle → active_battlesにINSERT</li>
                  <li>active_battlesのINSERTイベントをリアルタイム監視</li>
                  <li>player1_user_id/player2_user_idで現在のユーザーの参加をチェック</li>
                  <li>参加している場合、マッチング通知を作成・表示</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* 通知リスト */}
          {notifications.length > 0 && (
            <Card className="bg-gray-900 border border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">📋 現在の通知一覧</h3>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`p-3 rounded-lg border ${
                      notification.isRead 
                        ? 'border-gray-700 bg-gray-800/50' 
                        : 'border-cyan-500/30 bg-cyan-500/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {notification.title}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {notification.message}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          タイプ: {notification.type} | {notification.isRead ? '既読' : '未読'}
                        </div>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-1"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationTestPage; 