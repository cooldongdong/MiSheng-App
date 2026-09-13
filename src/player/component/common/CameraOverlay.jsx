import PropTypes from 'prop-types';
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box, Button, Fab, Slider, Typography } from '@mui/material';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import OpacityRoundedIcon from '@mui/icons-material/OpacityRounded';
import CameraswitchRoundedIcon from '@mui/icons-material/CameraswitchRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import { GameContext } from '../../store/game-context';
import ZoomableImage from './ZoomableImage';
import { useCameraStream, CAMERA_STATUS } from '../../hook/useCameraStream';
import { useOverlayGestures, IDENTITY } from '../../hook/useOverlayGestures';
import { policySnapshot } from '../../game/telemetry';
import { canvasImgCandidates } from '../../game/imgUrl';
import { diagEnabled, setDiagTab, removeDiagTab } from '../../../shared/diagBus';

// 相機的底層狀態，送進 DiagDock 當一個分頁（`?diag=1`）。
//
// **為什麼需要它。** 給玩家看的那四句人話（BLOCKED_MESSAGE）分不出
// 「Android Chrome 不行、Firefox 可以」差在哪——三種 reason 都可能對應到 Chrome
// 的不同行為，真正分得出來的是 `error.name` 與「瀏覽器到底列不列得出相機」。
//
// **它不再自己畫浮層。** 第一版是一塊獨立的面板，於是跟版面量測、跟既有的
// DiagOverlay 疊在一起互相遮擋（Dong 2026-09-13）。現在只負責產生文字，
// 位置、收合、分頁切換統一由 DiagDock 決定。

// prop.type = 'Camera'：數位透明片。
// 打開後鏡頭，把 prop.img 半透明疊在即時畫面上，玩家把手機舉到現實物件上對位。
// 實體透明片疊實體卡片本來就比手機好用——這個道具唯一不可替代的場合，是疊在
// 「帶不走的現場物件」上（匾額、壁畫、地磚）。所以它一定要能對得準：
// 拖曳、縮放、旋轉、還有凍結。

// 凍結的是「現實」不是疊圖：手舉著會抖，正確順序是先把現實定住，再慢慢對圖。
// 所以凍結期間疊圖照樣能動，也就不需要另外做一顆疊圖鎖定鈕。

// 取景框：4:5，輸出固定 1080×1350（Dong 2026-09-13 拍板）。
//
// **為什麼需要一個框。** 控制列是疊在相機畫面上的，所以玩家其實隔著一層 UI 在構圖
// ——被擋住的那一塊照樣會被拍進去，拍完才發現「下面竟然還有畫面」。框畫出「拍到的
// 就是這裡」，框外壓暗，控制列疊在壓暗區上，於是所見即所得。
//
// **為什麼輸出尺寸要釘死。** 原本是「螢幕 CSS 尺寸 × devicePixelRatio」，會隨手機
// 變動——那讓「外框套圖要做多大」沒有答案。釘死之後不管誰的手機，拍出來都是
// 1080×1350，創作者的套圖只要做一份。
const CAPTURE_RATIO = 5 / 4; // 高 ÷ 寬
const OUT_W = 1080;
const OUT_H = 1350;
const FRAME_TOP = 56; // 讓開標題那一列

const BLOCKED_MESSAGE = {
  insecure: '這個頁面不是用安全連線（HTTPS）開啟的，瀏覽器不會給相機。',
  denied:
    '沒有拿到相機權限。如果你是從 LINE、Instagram 這類 App 的內建瀏覽器點進來的，請改用 Safari 或 Chrome 開啟這個連結。',
  notfound: '這台裝置上找不到相機。',
  busy: '相機正被其他程式使用中，關掉之後再試一次。',
  other: '相機打不開。',
};

// 載一份「畫得進 canvas」的疊圖。
//
// **為什麼不能直接用畫面上那個 `<img>`。** `<img>` 顯示跨來源圖片不需要 CORS
// （所以畫面一直是好的），但**把它畫進 canvas 會污染 canvas**，接著 `toBlob()`
// 就丟 SecurityError。症狀是「按下去完全沒反應」——2026-09-13 加上合成之後，
// 拍照就是這樣壞掉的，而在只畫相機畫面的那一版沒事（MediaStream 是同源的）。
//
// 這跟 2026-08-25「Drive 的圖 `<img>` 能用、fetch 不能用」是同一個坑：
// **同一條網址，不同的取用方式適用不同的規則。**
//
// 拿不到就回 null，由呼叫端決定怎麼辦——不能讓整張照片因為疊圖而拍不成。
const tryLoad = (url) =>
  new Promise((resolve) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = url;
  });

// 依序試每一個候選網址，第一個載得起來的就用。
// Drive 的圖會先試 lh3（有 ACAO），失敗才退回原本那條；
// 本機資料夾的 blob: 與匯出包裡的同源檔案只有一個候選，一次就成。
const loadForCanvas = async (src) => {
  for (const url of canvasImgCandidates(src)) {
    const im = await tryLoad(url);
    if (im) return im;
  }
  return null;
};

const CameraStage = ({ src, title, onClose, mode }) => {
  // mode: 'camera'＝合照（取景框、前鏡頭、套圖貼齊框）
  //       'overlay'＝對位透明片（後鏡頭、半透明、可自由變換、可凍結）
  //
  // **一個判斷驅動六件事**，而不是六個各自的旗標——它們本來就是同一個決定的
  // 六個面向（2026-09-14 拆 type 時盤點出來的）：
  //   鏡頭前後／要不要鏡像／有沒有取景框／疊圖貼齊框或置中／初始透明度／能不能凍結
  const isPhoto = mode === 'camera';
  const [frozen, setFrozen] = useState(false);

  // 前後鏡頭。**合照要能切換，不能鎖死前鏡頭**（Dong 2026-09-14）——
  // 我原本跟票上都假設「合照＝自拍」，但合照也可能是拍同伴、拍風景配套框，
  // 那時要的是後鏡頭。預設前鏡頭（自拍是最常見的那一種），一顆鈕就能換。
  //
  // 對位透明片沒有這個選擇：它對的是現實裡的匾額與碑文，永遠是後鏡頭。
  const [facing, setFacing] = useState('environment');
  // 前鏡頭的預覽要鏡像（不然舉手的方向是反的，人會覺得怪），
  // 後鏡頭不要。**輸出也要跟著鏡像**，否則玩家對好的位置在照片裡會左右顛倒。
  const mirrored = isPhoto && facing === 'user';

  // 這一頁蓋滿畫面，底部導覽列要收起來（同放大的圖，見 game-provider 的 overlayCount）
  const { openOverlay, closeOverlay } = useContext(GameContext);
  useEffect(() => {
    openOverlay?.();
    return () => closeOverlay?.();
  }, [openOverlay, closeOverlay]);

  // **預設不透明。** 這個道具現在的主要用途是「對著取景框的套圖拍合照」，
  // 而套圖要能看清楚才對得準——半透明是**對位**用途（疊在匾額上要看得到底下的
  // 現實）才需要的預設。滑桿仍然在，想調隨時可以調。
  // 第三步把拍照／對位分成兩種模式之後，這個初始值會跟著模式走。
  const [opacity, setOpacity] = useState(mode === 'camera' ? 1 : 0.5);
  const canvasRef = useRef(null);
  // 疊圖的 DOM 節點：合成時要它的 naturalWidth/Height 才算得出實際顯示尺寸
  const overlayImgRef = useRef(null);
  // 控制列：取景框要讓開它，所以得量它真正多高（內容會變，寫死的數字遲早會錯）
  const controlsRef = useRef(null);


  // 凍結＝把當下那一格畫進 canvas，然後把相機整個關掉（不是暫停）。
  // 對位可能一對就是一分鐘，沒必要讓相機燈亮著。解凍時重開，權限已經給過了不會再問。
  const { videoRef, status, reason, detail } = useCameraStream(
    !frozen,
    isPhoto ? facing : 'environment'
  );
  const { containerRef, transform, reset, onPointerDown } = useOverlayGestures();

  const blocked = status === CAMERA_STATUS.BLOCKED;

  // 疊圖被動過沒有。**沒動過就不顯示「回正」鈕**——它跟切換鏡頭鈕長得像、又都在
  // 同一排，玩家很容易按錯（Dong 2026-09-14）。而還沒動過的東西本來就沒有什麼好
  // 回正的，所以這顆鈕在那個當下**只有害處沒有用處**。
  // 一動就出現，用完就消失，等於用「它在不在」告訴玩家「你動過了」。
  const moved =
    transform.x !== IDENTITY.x ||
    transform.y !== IDENTITY.y ||
    transform.scale !== IDENTITY.scale ||
    transform.rotation !== IDENTITY.rotation;

  // 取景框的矩形（CSS 像素，相對於舞台左上角）。
  //
  // **只算這一次，畫面與拍照共用同一個矩形。** 兩邊各算一次的話，它們會是
  // 「剛好一樣」而不是「同一個東西」，而那種一致性遲早會分岔——
  // 分岔的症狀是「拍出來跟框裡不一樣」，而且沒有人會想到去比對兩段算式。
  const [frame, setFrame] = useState(null);
  useLayoutEffect(() => {
    const compute = () => {
      // 對位模式沒有取景框：裁掉一塊反而礙事，那一頁要的是盡可能大的現實畫面。
      if (!isPhoto) {
        setFrame(null);
        return;
      }
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const ctrlH = controlsRef.current?.getBoundingClientRect().height ?? 160;
      const availH = Math.max(0, r.height - FRAME_TOP - ctrlH - 16);
      const availW = r.width;
      let w = availW;
      let h = w * CAPTURE_RATIO;
      if (h > availH) {
        h = availH;
        w = h / CAPTURE_RATIO;
      }
      setFrame({
        left: (availW - w) / 2,
        top: FRAME_TOP + (availH - h) / 2,
        width: w,
        height: h,
      });
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('orientationchange', compute);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('orientationchange', compute);
    };
  }, [containerRef, blocked, opacity, isPhoto]);

  // 診斷：瀏覽器列不列得出相機。**這一格是決定性的**——
  // 列得出來卻 getUserMedia 失敗 ＝ 權限／政策層；列不出來 ＝ 更底層的東西
  // （裝置被佔用、或這個瀏覽器根本沒拿到相機清單的權限）。
  const diag = diagEnabled();
  const [devices, setDevices] = useState('查詢中…');
  useEffect(() => {
    if (!diag) return;
    if (!navigator.mediaDevices?.enumerateDevices) {
      setDevices('沒有 enumerateDevices');
      return;
    }
    navigator.mediaDevices
      .enumerateDevices()
      .then((list) => {
        const cams = list.filter((d) => d.kind === 'videoinput');
        // label 要拿到權限才會有值——空 label 本身就是「還沒授權」的訊號
        setDevices(
          `videoinput=${cams.length}｜有名字的=${cams.filter((c) => c.label).length}`
        );
      })
      .catch((e) => setDevices(`enumerateDevices 失敗：${e?.name}`));
  }, [diag, status]);

  // 把讀數送進 DiagDock。**卸載時要收回**——關掉相機道具之後那個分頁還留著的話，
  // 上面會是一組已經過期的數字，而過期的讀數比沒有讀數更會誤導人。
  useEffect(() => {
    if (!diag) return undefined;
    setDiagTab('camera', {
      title: '相機',
      order: 20,
      // badge 直接寫在收合的標籤上：多數時候看那一眼就夠，不必展開
      badge: blocked ? `相機 ${reason || 'blocked'}` : `相機 ${status}`,
      text: [
        `status=${status}｜reason=${reason || '(無)'}`,
        `detail=${detail || '(無)'}`,
        devices,
        `policy: ${policySnapshot() || '(查不到 featurePolicy)'}`,
        `UA: ${navigator.userAgent.slice(0, 110)}`,
      ].join('\n'),
    });
    return () => removeDiagTab('camera');
  }, [diag, status, reason, detail, devices, blocked]);

  const freeze = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
    }
    setFrozen(true);
  };

  // ---- 拍照（COO-169）----
  //
  // 分兩步做的：**先只送凍結幀、驗「存得進相簿嗎」，通過之後才做合成**。
  // 理由是整條路上只有「存檔」那一段是別人的規則說了算（iOS 內建瀏覽器對 blob:
  // 的下載能力、Chromium 分享的檔案型別白名單），其餘都是我們自己畫圖、完全可控——
  // 先把合成做完才發現存不了，那份工就白做了。
  // 2026-09-13 在 iOS 上驗過：分享、下載、長按存相簿三條都通。
  //
  // **為什麼是「拍照」與「儲存」兩次點擊，不是一顆鈕做完。**
  // `navigator.share()` 必須在使用者手勢的有效期內呼叫，而 `canvas.toBlob()` 是
  // 非同步的——同一顆鈕裡 await 完再送，就押在「toBlob 跑得夠快」上面。拆成兩段
  // 之後，分享發生在它自己的那一次點擊裡，這個風險整個消失。
  // 順帶也比較好用：拍完先看一眼，不喜歡可以重拍。
  const [shot, setShot] = useState(null); // { url, blob }
  const [saveNote, setSaveNote] = useState('');

  // 合成：相機的當下這一格 ＋ 疊圖（含它現在的位移／旋轉／縮放／透明度）。
  //
  // ── 座標系：照「螢幕所見」輸出，不照相機原生解析度 ──────────────
  // 票（COO-169）把主要工作量估在「CSS transform 換算成 ctx.setTransform」，
  // 但真正會「差一點點又看得出來」的是**兩個座標系的落差**：
  //
  //   canvas 內部尺寸 ＝ video.videoWidth × videoHeight（例如 1280×720）
  //   canvas CSS 尺寸 ＝ 螢幕（例如 390×844），而且是 object-fit: cover
  //   疊圖的 x/y     ＝ CSS 像素，相對於螢幕中心（useOverlayGestures 收 clientX）
  //
  // 也就是說**玩家看到的是 cover 裁切後的畫面，而 video 那一格是完整的**。直接把
  // 疊圖座標畫上去，位置與大小都會偏，而且螢幕越長、相機越寬偏得越多。
  //
  // 解法不是去算那個映射，是**換一個輸出座標系**：輸出尺寸＝螢幕 CSS 尺寸 × dpr，
  // 先照 cover 規則把相機畫面畫進去，再用螢幕座標直接畫疊圖。兩邊座標系一致，
  // 不用任何換算，所見即所得。畫質是螢幕的 2–3 倍，社群分享綽綽有餘。
  const capture = async () => {
    const container = containerRef.current;
    const video = videoRef.current;
    const frozenCanvas = canvasRef.current;
    if (!container) {
      setSaveNote('拍照失敗：找不到畫面容器。');
      return;
    }

    const rect = container.getBoundingClientRect();
    const cssW = rect.width;
    const cssH = rect.height;
    if (!cssW || !cssH) {
      setSaveNote('拍照失敗：量不到畫面尺寸。');
      return;
    }

    // **拍的就是畫面上那個框**，同一個矩形，不另外算一次。
    const frameRect = frame;
    if (!frameRect?.width) {
      setSaveNote('拍照失敗：還沒算出取景範圍。');
      return;
    }

    // 凍結中相機是關掉的，video 沒有畫面——那一格在 canvas 裡。
    const source = frozen ? frozenCanvas : video;
    const srcW = frozen ? frozenCanvas?.width : video?.videoWidth;
    const srcH = frozen ? frozenCanvas?.height : video?.videoHeight;
    // **早退也要出聲。** 這一條會在相機還沒真的吐出畫面時成立（Android 上
    // 從授權到 live 可能要好幾秒），而靜默 return 的症狀就是「按了沒反應」——
    // 使用者無從分辨是還沒好、還是壞了。
    if (!source || !srcW || !srcH) {
      setSaveNote('相機還沒送出畫面（可能還在啟動）。等畫面出現之後再按一次。');
      return;
    }

    // 輸出固定 1080×1350，不隨手機變——套圖才有一個確定的尺寸可以做。
    // 畫面上的取景框只是預覽，框內的內容會被縮放到這個尺寸。
    const out = document.createElement('canvas');
    out.width = OUT_W;
    out.height = OUT_H;
    const ctx = out.getContext('2d');

    // 座標系換算：之後一律用**畫面上的 CSS 像素**下筆，跟預覽同一套。
    //   scale  ＝ 把取景框的寬度放大到 1080
    //   translate ＝ 把取景框的左上角挪到畫布原點（等於裁掉框外）
    // 兩行做完，底下畫 video 與疊圖的程式碼一個字都不用改——
    // 它們照樣以「整個舞台」為基準，只是最後只有框內那一塊落在畫布上。
    const k = OUT_W / frameRect.width;
    ctx.scale(k, k);
    ctx.translate(-frameRect.left, -frameRect.top);

    // ① 相機畫面：照 object-fit: cover 的規則（取較大的縮放比、置中裁切），
    //    這樣畫出來的才是玩家剛剛看到的那一塊，而不是完整的相機幀。
    const coverScale = Math.max(cssW / srcW, cssH / srcH);
    const dw = srcW * coverScale;
    const dh = srcH * coverScale;
    // **鏡像只套在相機畫面上，不套疊圖。**
    // 兩邊都鏡像的話套圖上的字會反；都不鏡像的話，玩家對著鏡像預覽擺好的位置
    // 在照片裡會左右顛倒——所見即所得要求預覽與輸出用同一套規則。
    ctx.save();
    if (mirrored) {
      ctx.translate(cssW, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(source, (cssW - dw) / 2, (cssH - dh) / 2, dw, dh);
    ctx.restore();

    // ② 疊圖。CSS 那一串是
    //      left:50% top:50% width:80%
    //      transform: translate(-50%,-50%) translate(x,y) rotate(deg) scale(s)
    //    等效於「元素中心落在畫面中心＋(x,y)，並繞自己的中心旋轉與縮放」。
    //    translate 不受 transform-origin 影響，rotate/scale 繞 origin（預設元素中心），
    //    所以在 canvas 上就是 translate → rotate → scale → 以中心為原點畫。
    // **用帶 CORS 的副本，不是畫面上那個 `<img>`**（見 loadForCanvas 的說明）。
    // 拿不到就只輸出相機畫面，並在下面說清楚為什麼——
    // 「少了疊圖」如果不出聲，使用者只會覺得功能怪怪的。
    const img = (await loadForCanvas(src)) || null;
    const overlaySkipped = !!src && !img;
    if (img?.naturalWidth) {
      // **基準要跟畫面上那個 `<img>` 一模一樣**，否則拍出來會位移。
      // 有框時以框為準（見疊圖那段的說明），沒框時才是舊的「容器 80% 置中」。
      const baseW = frameRect ? frameRect.width : cssW * 0.8;
      const originX = frameRect ? frameRect.left + frameRect.width / 2 : cssW / 2;
      const originY = frameRect ? frameRect.top + frameRect.height / 2 : cssH / 2;
      // 圖只設了 width、沒設 height，所以框就是圖的原始比例
      //（objectFit: scale-down 在這種情況下不起作用）
      const boxW = baseW;
      const boxH = boxW * (img.naturalHeight / img.naturalWidth);
      ctx.save();
      ctx.translate(originX + transform.x, originY + transform.y);
      ctx.rotate((transform.rotation * Math.PI) / 180);
      ctx.scale(transform.scale, transform.scale);
      ctx.globalAlpha = opacity; // 透明度也是玩家調出來的，要一起帶走
      ctx.drawImage(img, -boxW / 2, -boxH / 2, boxW, boxH);
      ctx.restore();
    }

    // **一定要 try/catch。** 畫布一旦被跨來源的圖污染，toBlob 就丟 SecurityError；
    // 不接的話錯誤只會進 console，而使用者看到的是「按了沒反應」。
    try {
      out.toBlob(
        (blob) => {
          if (!blob) {
            setSaveNote('拍照失敗：瀏覽器沒有產生出圖片檔。');
            return;
          }
          setShot({ url: URL.createObjectURL(blob), blob });
          setSaveNote(
            overlaySkipped
              ? '注意：這張只有相機畫面——疊圖的每一個來源都不允許跨網站取用（CORS），沒辦法合成進照片。'
              : ''
          );
        },
        'image/jpeg',
        0.92
      );
    } catch (err) {
      setSaveNote(`拍照失敗（${err?.name || '不明'}）：${err?.message || ''}`);
    }
  };

  // 收掉 blob 網址。不收的話每拍一張就漏一份記憶體，而這個道具可能被玩很久。
  const closeShot = () => {
    if (shot?.url) URL.revokeObjectURL(shot.url);
    setShot(null);
    setSaveNote('');
  };
  useEffect(() => () => { if (shot?.url) URL.revokeObjectURL(shot.url); }, [shot]);

  // 存到相簿。三條路由好到保底，跟匯出紀錄那邊同一套判斷（telemetry.js 檔頭）：
  //   1. 分享 —— 手機原生分享單裡就有「儲存影像」，接上玩家本來就認得的動作
  //   2. 下載 —— 桌機的正解
  //   3. 長按圖片 —— 保底，任何瀏覽器都會，所以那句說明一直都在
  //
  // **照片比紀錄檔好走**：COO-190 那輪之所以難，是 Chromium 的分享白名單不收
  // `.json`；`.jpg` 是白名單裡最沒爭議的型別。
  //
  // **這一步刻意不接 `isShareBroken()` 那個「失敗一次就永久藏起按鈕」的標記。**
  // 那是給玩家用的保護，但現在要做的正是反覆重測——2026-09-06 已經踩過一次
  // 「你把我的按鈕收起來，我要怎麼繼續測試」。等功能定案再接上。
  const saveShot = async () => {
    if (!shot) return;
    const file = new File([shot.blob], 'misheng-photo.jpg', { type: 'image/jpeg' });
    // canShare() 會說謊（Android Chrome 上它回 true，送出時才丟 NotAllowedError），
    // 所以這裡只用它擋掉「完全沒有分享能力」的環境，真正的答案是送出去才知道。
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        setSaveNote('已送出到分享選單。');
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return; // 玩家自己取消，不是失敗
        setSaveNote(`分享失敗（${err?.name || '不明'}）：改用下載，或長按上面那張圖。`);
        return;
      }
    }
    setSaveNote('這個瀏覽器沒有分享檔案的能力：改用下載，或長按上面那張圖。');
  };

  const downloadShot = () => {
    if (!shot) return;
    const a = document.createElement('a');
    a.href = shot.url;
    a.download = 'misheng-photo.jpg';
    a.click();
    setSaveNote('已觸發下載。如果什麼都沒發生，請長按上面那張圖存到相簿。');
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        m: '0 !important', // ContentList 的 Stack spacing 會給每個子元素一個 margin-top
        zIndex: 1200,
        overflow: 'hidden',
        backgroundColor: '#1b2126',
      }}
    >
      {/* 相機畫面（底層）。凍結時換成 canvas 的那一格 */}
      {!blocked && (
        <>
          <video
            ref={videoRef}
            playsInline // iOS 少了它會把影片搶去全螢幕播放
            muted
            autoPlay
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              // 前鏡頭鏡像，讓畫面跟照鏡子一樣（舉右手，畫面裡也是右邊）
              transform: mirrored ? 'scaleX(-1)' : undefined,
              visibility: frozen ? 'hidden' : 'visible',
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              // 解凍後相機要重開一下下，這段期間繼續顯示凍結的那一格，才不會閃黑
              visibility: frozen || status !== CAMERA_STATUS.LIVE ? 'visible' : 'hidden',
            }}
          />
        </>
      )}

      {/* 疊圖層：手勢都掛在這裡。控制列是它的兄弟不是子孫，按鈕才不會被手勢吃掉 */}
      <Box
        ref={containerRef}
        onPointerDown={blocked ? undefined : onPointerDown}
        sx={{
          position: 'absolute',
          inset: 0,
          touchAction: 'none', // 不關掉瀏覽器的捲動／縮放，兩指就永遠輪不到我們
          userSelect: 'none',
        }}
      >
        {src && (
          <img
            ref={overlayImgRef}
            src={src}
            alt={title || '透明片'}
            draggable={false}
            style={{
              position: 'absolute',
              // **有取景框時，疊圖的基準就是那個框，不是整個畫面。**
              //
              // 這樣一張照著輸出尺寸（1080×1350）做的套圖，在 x/y/scale 都是初始值
              // 的時候會**完全對齊框**——而且是由構造保證的，不是靠算出一組剛好
              // 相等的數字。玩家之後的拖曳／縮放仍然照常疊在上面。
              //
              // 沒有框的時候（純對位用的透明片）維持原本的 80% 置中。
              left: frame && !blocked ? frame.left + frame.width / 2 : '50%',
              top: frame && !blocked ? frame.top + frame.height / 2 : '50%',
              width: blocked ? '86%' : frame ? frame.width : '80%',
              maxHeight: blocked ? '70%' : undefined,
              objectFit: 'scale-down',
              opacity: blocked ? 1 : opacity,
              pointerEvents: 'none',
              transform: blocked
                ? 'translate(-50%, -50%)'
                : `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) rotate(${transform.rotation}deg) scale(${transform.scale})`,
            }}
          />
        )}
      </Box>

      {/* 取景框。**框外壓暗用一圈超大的 box-shadow**，不用四塊 overlay
          ——四塊要各自算位置，而它們算錯的時候會在框邊留下一條縫。
          `pointerEvents: none` 讓對位手勢照常穿透。
          刻意不設 z-index：DOM 順序已經對了（蓋住相機與疊圖，而排在它後面的
          標題、說明、控制列自然浮在上面）。 */}
      {!blocked && frame && (
        <Box
          sx={{
            position: 'absolute',
            left: frame.left,
            top: frame.top,
            width: frame.width,
            height: frame.height,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
            outline: '2px solid rgba(255, 255, 255, 0.92)',
            outlineOffset: '-1px',
            borderRadius: '2px',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 標題 */}
      {title && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 0,
            backgroundColor: '#37474F',
            borderRadius: '0px 20px 20px 0px',
            fontSize: 14,
            letterSpacing: 0.7,
            color: '#fff',
            p: '6px',
            pr: '13px',
          }}
        >
          {title}
        </Box>
      )}

      {/* 拍照失敗時的說明。**不能只寫在預覽層裡**——預覽層要有照片才會出現，
          而失敗的情況正好是沒有照片的那一種（Dong 2026-09-13：「按相機 icon
          沒有反應」）。一個只在成功時才看得到的錯誤訊息，等於沒有寫。 */}
      {!shot && saveNote && (
        <Box
          sx={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: 200,
            p: 1.25,
            borderRadius: '8px',
            backgroundColor: 'rgba(0,0,0,.85)',
            color: '#fff',
            fontSize: 13,
            lineHeight: 1.6,
            zIndex: 15,
          }}
        >
          {saveNote}
        </Box>
      )}

      {/* 拿不到相機時：退化成純看圖，並說清楚為什麼、還能怎麼辦。
          這一關不能因為相機失敗就走不下去——出事的當下沒有人在現場能救玩家 */}
      {blocked && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 96,
            left: 16,
            right: 16,
            p: 2,
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            color: '#37474F',
          }}
        >
          <Typography sx={{ fontSize: 14, lineHeight: 1.6 }}>
            {BLOCKED_MESSAGE[reason] || BLOCKED_MESSAGE.other}
          </Typography>
          <Typography sx={{ fontSize: 14, lineHeight: 1.6, mt: 1, fontWeight: 'bold' }}>
            先看這張圖也可以繼續解謎。
          </Typography>
        </Box>
      )}

      {/* 控制列 */}
      <Box
        ref={controlsRef}
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          pb: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          backgroundColor: 'rgba(27, 33, 38, 0.55)',
          backdropFilter: 'blur(6px)',
        }}
      >
        {/* 手機上兩指就會轉，不必說；桌機沒有第二根手指，不講就沒人找得到 Shift。
            用 pointer: fine 判斷輸入裝置，比抓 UA 可靠 */}
        {!blocked && (
          <Typography
            sx={{
              display: 'none',
              '@media (pointer: fine)': { display: 'block' },
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: 12,
              textAlign: 'center',
              letterSpacing: 0.5,
            }}
          >
            拖曳移動 · 滾輪縮放 · Shift ＋ 拖曳旋轉
          </Typography>
        )}

        {/* 透明度只有對位模式需要——半透明是為了看到底下的匾額。
            合照的套圖本來就該是實的，留一根調不到重點的滑桿只是佔位置
            （Dong 2026-09-14）。 */}
        {!blocked && !isPhoto && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1 }}>
            <OpacityRoundedIcon sx={{ color: '#fff' }} />
            <Slider
              value={opacity}
              onChange={(event, value) => setOpacity(value)}
              min={0.05}
              max={1}
              step={0.01}
              aria-label="透明度"
              sx={{ color: '#fff' }}
            />
          </Box>
        )}

        {/* 按鈕列。**兩種模式共用同一個版面**，差別只在中間那顆是什麼。
            左＝輔助、中＝這一頁最常按的動作、右＝離開。

            **為什麼中間那顆要大。** 一排等大的圓鈕等於沒有主從，玩家得逐顆辨認
            才知道哪顆是主要動作——那是他九成時間要按的那一顆
            （2026-09-07 導覽列那次的同一個判斷：版面要先講主從）。
            合照的主要動作是「拍」，對位的主要動作是「凍結」（先把現實定住再對圖）。

            grid 的 `1fr auto 1fr` 讓中間落在**幾何正中央**，不受左右鈕數不同影響
            ——flex 置中做不到這件事，少一顆鈕整排就偏了。 */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {!blocked && isPhoto && (
              <Fab
                size="small"
                onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
                aria-label="切換前後鏡頭"
                sx={{ backgroundColor: 'rgba(255,255,255,.92)', color: '#37474F' }}
              >
                <CameraswitchRoundedIcon fontSize="small" />
              </Fab>
            )}
            {!blocked && moved && (
              <Fab
                size="small"
                onClick={reset}
                aria-label="把圖回正"
                sx={{ backgroundColor: 'rgba(255,255,255,.92)', color: '#37474F' }}
              >
                <RestartAltRoundedIcon fontSize="small" />
              </Fab>
            )}
          </Box>

          {/* 中間：這一頁的主要動作。外圈光暈是相機快門鍵的慣例，
              在深色畫面上把它推到最前面。 */}
          {!blocked ? (
            <Fab
              size="large"
              onClick={isPhoto ? capture : frozen ? () => setFrozen(false) : freeze}
              aria-label={isPhoto ? '拍照' : frozen ? '解凍畫面' : '凍結畫面'}
              sx={{
                backgroundColor: '#fff',
                color: '#37474F',
                boxShadow: '0 0 0 4px rgba(255,255,255,.34)',
              }}
            >
              {isPhoto ? (
                <PhotoCameraRoundedIcon />
              ) : frozen ? (
                <PlayArrowRoundedIcon />
              ) : (
                <PauseRoundedIcon />
              )}
            </Fab>
          ) : (
            <Box />
          )}

          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
            <Fab
              size="small"
              onClick={onClose}
              aria-label="關閉"
              sx={{ backgroundColor: 'rgba(255,255,255,.92)', color: '#37474F' }}
            >
              <CloseRoundedIcon fontSize="small" />
            </Fab>
          </Box>
        </Box>
      </Box>

      {/* 拍照結果。**蓋在最上面、而且擋住底下的手勢**——這一刻玩家要做的是
          「存起來或重拍」，不是繼續對位。
          三條存檔路一次攤開，因為第一步要驗的就是「這支手機走得通哪一條」。 */}
      {shot && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            backgroundColor: 'rgba(15, 19, 22, 0.94)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            p: 2,
          }}
        >
          {/* 這張圖不設 touch-action／user-select，長按才叫得出「儲存影像」——
              那是保底的那一條路，不能被我們自己的手勢設定擋掉。 */}
          <Box
            component="img"
            src={shot.url}
            alt="拍下來的照片"
            sx={{ maxWidth: '100%', maxHeight: '58%', borderRadius: '12px' }}
          />

          <Typography
            sx={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center' }}
          >
            長按上面那張圖也可以存到相簿。
          </Typography>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<IosShareRoundedIcon />}
              onClick={saveShot}
              sx={{ backgroundColor: '#fff', color: '#37474F' }}
            >
              儲存到相簿
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadRoundedIcon />}
              onClick={downloadShot}
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)' }}
            >
              下載
            </Button>
            <Button onClick={closeShot} sx={{ color: 'rgba(255,255,255,0.8)' }}>
              重拍
            </Button>
          </Box>

          {saveNote && (
            <Typography
              sx={{
                color: '#fff',
                fontSize: 13,
                textAlign: 'center',
                backgroundColor: 'rgba(255,255,255,0.14)',
                borderRadius: '8px',
                px: 1.5,
                py: 1,
                maxWidth: 420,
              }}
            >
              {saveNote}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

CameraStage.propTypes = {
  src: PropTypes.string,
  title: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(['camera', 'overlay']).isRequired,
};

const CameraOverlay = ({ prop, isFullScreen, showZoomButton, onToggle, mode = 'overlay' }) => {
  const { getImg } = useContext(GameContext);
  const src = getImg(prop.img) || '';

  // 卡片態沿用 ZoomableImage，只把放大鈕換成相機。
  // 相機是點下去才開的——一頁可能好幾個道具，不能一進道具頁就把相機全部打開。
  if (!isFullScreen) {
    return (
      <ZoomableImage
        src={src}
        alt={prop.img}
        title={prop.title}
        isFullScreen={false}
        showZoomButton={showZoomButton}
        onToggle={onToggle}
        // 卡片上那顆鈕要講「按下去會發生什麼」。對位是把圖**疊**到現實上，
        // 用相機圖示會讓人以為要拍照（Dong 2026-09-14）——疊層的圖示才對得上。
        openIcon={mode === 'camera' ? <PhotoCameraRoundedIcon /> : <LayersRoundedIcon />}
      />
    );
  }

  return <CameraStage src={src} title={prop.title} onClose={onToggle} mode={mode} />;
};

CameraOverlay.propTypes = {
  mode: PropTypes.oneOf(['camera', 'overlay']),
  prop: PropTypes.object.isRequired,
  isFullScreen: PropTypes.bool.isRequired,
  showZoomButton: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default CameraOverlay;
