// Advanced: トークン自動更新対応（将来実装）
// src/lib/ads/token-manager.ts

interface TokenCache {
  token: string;
  expiresAt: number;
  placement_key: string;
  simple_ad_id: string;
}

class AdTokenManager {
  private cache = new Map<string, TokenCache>();
  private refreshPromises = new Map<string, Promise<string>>();

  async getValidToken(placement_key: string): Promise<string | null> {
    const cached = this.cache.get(placement_key);
    const now = Math.floor(Date.now() / 1000);
    
    // 期限まで60秒以上残っていれば使用
    if (cached && cached.expiresAt > now + 60) {
      return cached.token;
    }
    
    // 既に更新中であれば待機
    const existing = this.refreshPromises.get(placement_key);
    if (existing) {
      return await existing;
    }
    
    // 新しいトークンを取得
    const refreshPromise = this.refreshToken(placement_key);
    this.refreshPromises.set(placement_key, refreshPromise);
    
    try {
      const newToken = await refreshPromise;
      return newToken;
    } finally {
      this.refreshPromises.delete(placement_key);
    }
  }
  
  private async refreshToken(placement_key: string): Promise<string> {
    try {
      const response = await fetch('/functions/v1/ad-serve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placement_key })
      });
      
      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.token && data.ad?.id) {
        // JWTペイロードから期限を取得
        const payload = JSON.parse(atob(data.token.split('.')[1]));
        
        this.cache.set(placement_key, {
          token: data.token,
          expiresAt: payload.exp,
          placement_key,
          simple_ad_id: data.ad.id
        });
        
        return data.token;
      }
      
      throw new Error('Invalid token response');
    } catch (error) {
      console.error('Token refresh failed:', error);
      return '';
    }
  }
}

export const tokenManager = new AdTokenManager();
