// アセットファイルの静的インポート
import icon192 from '../assets/bn_icon_192.png';
import icon512 from '../assets/bn_icon_512.png';
import vsImage from '../assets/images/VS.png';

export const getAssetUrls = () => {
  return {
    icon192,
    icon512, 
    vsImage
  };
};

// PWA manifest用の動的manifest生成
export const generateManifest = () => {
  const assets = getAssetUrls();
  
  return {
    name: "BeatNexus - Beatbox Battle Community",
    short_name: "BeatNexus",
    description: "ビートボクシング愛好者向けの競技プラットフォーム。動画投稿、自動マッチング、コミュニティ投票でバトルを楽しもう！",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#06b6d4",
    orientation: "portrait-primary",
    scope: "/",
    lang: "ja",
    categories: ["entertainment", "music", "social"],
    icons: [
      {
        src: assets.icon192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: assets.icon192,
        sizes: "192x192", 
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: assets.icon512,
        sizes: "512x512",
        type: "image/png", 
        purpose: "any"
      },
      {
        src: assets.icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}; 