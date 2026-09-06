// 分享的現場診斷。只在網址帶 ?diag=1 時出現（同 DiagOverlay 的慣例）。
//
// **為什麼需要它。** Android Chrome 上 navigator.share 丟
// `NotAllowedError: Permission denied`，而我對成因猜錯了三次：先猜是 iOS 的問題
// （其實是 app 內建瀏覽器）、再猜是 Chrome 對檔案型別有白名單（改送 text/plain
// 一樣失敗）、再猜是伺服器加了 Permissions-Policy（實際 curl 過去，一個標頭都沒有）。
//
// 猜不出來的原因很單純：**那個環境我進不去。** 我的瀏覽器連 navigator.share 都
// 沒有，而 Android 上開 devtools 對使用者也不現實。所以把探針做進頁面裡，讓那台
// 手機自己回答。
//
// 兩個關鍵的區辨：
//
//   ① `features()` 裡有沒有 `web-share`
//      沒有的話 `allowsFeature()` 回 false 是**沒有意義的**（它對不認得的名稱
//      也回 false）——我 2026-09-06 就是這樣誤判成「被政策擋掉」的。
//
//   ② 分享**純文字**行不行
//      文字可以、檔案不行 ⇒ 問題出在檔案，不是權限。
//      兩個都不行 ⇒ 整個 API 在這台裝置上就是關的，跟我們送什麼無關。
//
// 每一次 share() 都要自己的使用者手勢，所以兩個測試各自一顆鈕——不能在一次點擊
// 裡連續跑兩個，第二個一定會因為手勢過期而失敗，那會製造出假的證據。

export const shareEnvReport = () => {
  const fp = typeof document !== 'undefined' ? document.featurePolicy : null;
  const feats = fp?.features ? fp.features() : null;
  const known = feats ? feats.includes('web-share') : null;

  const canShare = (data) => {
    try {
      return navigator.canShare ? String(navigator.canShare(data)) : '沒有 canShare';
    } catch (e) {
      return `丟錯 ${e?.name}`;
    }
  };

  let fileProbe = '沒測';
  try {
    const f = new File(['{}'], 'probe.json', { type: 'application/json' });
    fileProbe = canShare({ files: [f] });
  } catch (e) {
    fileProbe = `造不出 File：${e?.name}`;
  }

  return [
    `share=${!!navigator.share} canShare=${!!navigator.canShare}`,
    `政策清單有 web-share：${known === null ? '讀不到 features()' : known}`,
    `allowsFeature(web-share)=${fp?.allowsFeature ? fp.allowsFeature('web-share') : '讀不到'}` +
      (known === false ? '（清單裡沒有，這個值無意義）' : ''),
    `canShare(text)=${canShare({ text: 'x' })} canShare(files)=${fileProbe}`,
    `安全環境=${window.isSecureContext} iframe=${window.self !== window.top}`,
    `UA=${navigator.userAgent.slice(0, 90)}`,
  ].join('\n');
};

// 回傳一句話描述結果。成功、取消、失敗三種都要分得出來——
// 取消跟失敗的差別正是這次一直搞錯的東西。
const attempt = async (label, data) => {
  try {
    await navigator.share(data);
    return `${label}：成功送出`;
  } catch (e) {
    if (e?.name === 'AbortError') return `${label}：使用者取消（代表 API 本身是通的）`;
    return `${label}：${e?.name} — ${String(e?.message || '').slice(0, 100)}`;
  }
};

export const probeShareText = () =>
  attempt('分享純文字', { text: 'misheng share probe' });

export const probeShareFile = () => {
  const f = new File(['misheng share probe'], 'probe.txt', { type: 'text/plain' });
  return attempt('分享 .txt 檔', { files: [f] });
};
