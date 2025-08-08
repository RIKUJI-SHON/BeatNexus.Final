// 単一アクティブ動画制御ユーティリティ
// 仕様: docs/MP4パイプライン最適化_単一アクティブ動画_要件定義.md

export type VideoId = string;

class SingleActiveVideoManager {
  private activeId: VideoId | null = null;

  getActiveId() {
    return this.activeId;
  }

  activate(id: VideoId) {
    if (this.activeId === id) return;
    this.activeId = id;
    window.dispatchEvent(new CustomEvent('BNX_VIDEO_ACTIVATE', { detail: { id } }));
  }

  deactivate(id: VideoId) {
    if (this.activeId === id) {
      this.activeId = null;
      window.dispatchEvent(new CustomEvent('BNX_VIDEO_DEACTIVATE', { detail: { id } }));
    }
  }
}

export const singleActiveVideo = new SingleActiveVideoManager();
