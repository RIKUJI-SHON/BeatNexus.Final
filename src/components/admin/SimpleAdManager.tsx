import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// シンプルな広告管理画面コンポーネント
const SimpleAdManager = () => {
  const [advertisers, setAdvertisers] = useState([]);
  const [ads, setAds] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 新規広告フォーム用state
  const [newAd, setNewAd] = useState({
    advertiser_id: '',
    title: '',
    description: '',
    image_url: '',
    click_url: '',
    contract_start_date: '',
    contract_end_date: '',
    is_active: true
  });

  // 配置設定用state
  const [newAssignment, setNewAssignment] = useState({
    placement_id: '',
    simple_ad_id: '',
    priority: 100,
    is_pinned: false
  });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // データ取得
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 広告主一覧取得
      const { data: advertisersData } = await supabase
        .from('advertisers')
        .select('*')
        .order('name');
      
      // 広告一覧取得
      const { data: adsData } = await supabase
        .from('simple_ads')
        .select(`
          *,
          advertisers!inner(name)
        `)
        .order('created_at', { ascending: false });
      
      // 配置場所一覧取得
      const { data: placementsData } = await supabase
        .from('ad_placements')
        .select('*')
        .eq('is_active', true)
        .order('key');
      
      // 配置設定一覧取得
      const { data: assignmentsData } = await supabase
        .from('ad_placement_assignments')
        .select(`
          *,
          ad_placements!inner(key, description),
          simple_ads!inner(title, advertisers!inner(name))
        `)
        .order('priority');

      setAdvertisers(advertisersData || []);
      setAds(adsData || []);
      setPlacements(placementsData || []);
      setAssignments(assignmentsData || []);
      
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 新規広告追加
  const handleCreateAd = async (e) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('simple_ads')
        .insert([newAd]);
      
      if (error) throw error;
      
      alert('広告を作成しました');
      setNewAd({
        advertiser_id: '',
        title: '',
        description: '',
        image_url: '',
        click_url: '',
        contract_start_date: '',
        contract_end_date: '',
        is_active: true
      });
      fetchData();
    } catch (error) {
      alert('エラー: ' + error.message);
    }
  };

  // 配置設定追加
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('ad_placement_assignments')
        .insert([newAssignment]);
      
      if (error) throw error;
      
      alert('配置設定を追加しました');
      setNewAssignment({
        placement_id: '',
        simple_ad_id: '',
        priority: 100,
        is_pinned: false
      });
      fetchData();
    } catch (error) {
      alert('エラー: ' + error.message);
    }
  };

  // 配置設定削除
  const handleDeleteAssignment = async (assignmentId) => {
    if (!confirm('この配置設定を削除しますか？')) return;
    
    try {
      const { error } = await supabase
        .from('ad_placement_assignments')
        .delete()
        .eq('id', assignmentId);
      
      if (error) throw error;
      
      alert('配置設定を削除しました');
      fetchData();
    } catch (error) {
      alert('エラー: ' + error.message);
    }
  };

  if (loading) {
    return <div className="p-8">読み込み中...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">シンプル広告管理システム</h1>

      {/* 新規広告作成フォーム */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">新規広告作成</h2>
        <form onSubmit={handleCreateAd} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">広告主</label>
            <select
              value={newAd.advertiser_id}
              onChange={(e) => setNewAd({...newAd, advertiser_id: e.target.value})}
              className="w-full border rounded-md px-3 py-2"
              required
            >
              <option value="">選択してください</option>
              {advertisers.map(advertiser => (
                <option key={advertiser.id} value={advertiser.id}>
                  {advertiser.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">広告タイトル</label>
            <input
              type="text"
              value={newAd.title}
              onChange={(e) => setNewAd({...newAd, title: e.target.value})}
              className="w-full border rounded-md px-3 py-2"
              required
            />
          </div>
          
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">説明文</label>
            <textarea
              value={newAd.description}
              onChange={(e) => setNewAd({...newAd, description: e.target.value})}
              className="w-full border rounded-md px-3 py-2"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">画像URL</label>
            <input
              type="url"
              value={newAd.image_url}
              onChange={(e) => setNewAd({...newAd, image_url: e.target.value})}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">クリック先URL</label>
            <input
              type="url"
              value={newAd.click_url}
              onChange={(e) => setNewAd({...newAd, click_url: e.target.value})}
              className="w-full border rounded-md px-3 py-2"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">契約開始日</label>
            <input
              type="date"
              value={newAd.contract_start_date}
              onChange={(e) => setNewAd({...newAd, contract_start_date: e.target.value})}
              className="w-full border rounded-md px-3 py-2"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">契約終了日</label>
            <input
              type="date"
              value={newAd.contract_end_date}
              onChange={(e) => setNewAd({...newAd, contract_end_date: e.target.value})}
              className="w-full border rounded-md px-3 py-2"
              required
            />
          </div>
          
          <div className="col-span-2">
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              広告を作成
            </button>
          </div>
        </form>
      </div>

      {/* 広告一覧 */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">登録済み広告一覧</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-2 text-left">広告主</th>
                <th className="border p-2 text-left">タイトル</th>
                <th className="border p-2 text-left">契約期間</th>
                <th className="border p-2 text-left">ステータス</th>
              </tr>
            </thead>
            <tbody>
              {ads.map(ad => (
                <tr key={ad.id}>
                  <td className="border p-2">{ad.advertisers?.name}</td>
                  <td className="border p-2">{ad.title}</td>
                  <td className="border p-2">
                    {ad.contract_start_date} ～ {ad.contract_end_date}
                  </td>
                  <td className="border p-2">
                    <span className={`px-2 py-1 rounded text-sm ${
                      ad.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {ad.is_active ? 'アクティブ' : '無効'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 配置設定フォーム */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">配置設定追加</h2>
        <form onSubmit={handleCreateAssignment} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">配置場所</label>
            <select
              value={newAssignment.placement_id}
              onChange={(e) => setNewAssignment({...newAssignment, placement_id: e.target.value})}
              className="w-full border rounded-md px-3 py-2"
              required
            >
              <option value="">選択してください</option>
              {placements.map(placement => (
                <option key={placement.id} value={placement.id}>
                  {placement.key} - {placement.description}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">広告</label>
            <select
              value={newAssignment.simple_ad_id}
              onChange={(e) => setNewAssignment({...newAssignment, simple_ad_id: e.target.value})}
              className="w-full border rounded-md px-3 py-2"
              required
            >
              <option value="">選択してください</option>
              {ads.filter(ad => ad.is_active).map(ad => (
                <option key={ad.id} value={ad.id}>
                  {ad.advertisers?.name} - {ad.title}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">優先度</label>
            <input
              type="number"
              value={newAssignment.priority}
              onChange={(e) => setNewAssignment({...newAssignment, priority: parseInt(e.target.value)})}
              className="w-full border rounded-md px-3 py-2"
              min="1"
              max="999"
            />
          </div>
          
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={newAssignment.is_pinned}
                onChange={(e) => setNewAssignment({...newAssignment, is_pinned: e.target.checked})}
                className="mr-2"
              />
              固定表示
            </label>
          </div>
          
          <div className="col-span-2">
            <button
              type="submit"
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
            >
              配置設定を追加
            </button>
          </div>
        </form>
      </div>

      {/* 現在の配置設定一覧 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">現在の配置設定</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-2 text-left">配置場所</th>
                <th className="border p-2 text-left">広告</th>
                <th className="border p-2 text-left">優先度</th>
                <th className="border p-2 text-left">固定</th>
                <th className="border p-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(assignment => (
                <tr key={assignment.id}>
                  <td className="border p-2">
                    {assignment.ad_placements?.key}
                    <br />
                    <small className="text-gray-500">{assignment.ad_placements?.description}</small>
                  </td>
                  <td className="border p-2">
                    {assignment.simple_ads?.advertisers?.name} - {assignment.simple_ads?.title}
                  </td>
                  <td className="border p-2">{assignment.priority}</td>
                  <td className="border p-2">
                    {assignment.is_pinned ? '✅ 固定' : ''}
                  </td>
                  <td className="border p-2">
                    <button
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SimpleAdManager;
