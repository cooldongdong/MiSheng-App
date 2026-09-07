import { useState, useEffect, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Fade,
  IconButton,
  Snackbar,
  Drawer,
  useMediaQuery,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ViewSidebarRoundedIcon from '@mui/icons-material/ViewSidebarRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import GameShell from '../player/component/GameShell';
import { loadGameFromSheet, parseSpreadsheetId } from './sheetLoader';
import { validateGame } from '../shared/validator/validateGame';
import { checkSheetImages } from './checkSheetImages';
import { readLocalGameFolder, buildLocalImageMap } from './localFiles';
import ValidationReport from './ValidationReport';
import SourcePicker from './SourcePicker';
import LoadingScreen from './LoadingScreen';
import ExportPackButton from './ExportPackButton';
import { readRecentSheets, rememberSheet, forgetSheet } from './recentSheets';
import {
  readSheetFromHash,
  readPlayFromHash,
  buildPlayLink,
  writeSheetToHash,
  clearSheetHash,
} from './sheetHash';
import SourcePanel from './SourcePanel';
import FlowPanel from './FlowPanel';
import ColorSchemeToggle from '../shared/ColorSchemeToggle';
import BrandBadge from '../shared/BrandBadge';
import QrCode from '../shared/QrCode';
import QrCodeRoundedIcon from '@mui/icons-material/QrCodeRounded';

// 開始畫面與檢查結果沒有右上角那組面板按鈕，外觀開關得自己帶定位。
// 放在同一個座標（top 6 / right 10），三個畫面之間切換時開關才不會跳位置。
const FloatingSchemeToggle = () => (
  <Box sx={{ position: 'fixed', top: 6, right: 10, zIndex: 2000 }}>
    <ColorSchemeToggle />
  </Box>
);

// 即時轉化（/create）：資料進來 → 驗證 → 當場試玩
//
// 三個畫面狀態：
//   idle/loading —— 只有一個動作：把遊戲資料夾丟進來（SourcePicker）
//   checked      —— 檢查結果 ＋ 開始試玩
//   playing      —— 左：資料來源與驗證報告／中：遊戲／右：流程圖
//
// 定位是「免費的一次性私人預覽」：重整就消失、不留存檔、不產生可分享網址
// 網址帶不帶 #sheet=、那一份是不是自己書籤過的——這件事必須在**第一次 render 之前**
// 就知道。原本放在 useEffect 裡判斷，而 effect 是畫完之後才跑，所以重整時一定會先
// 閃一格開始畫面才跳載入畫面。
// 三欄擺不下的寬度。1024 是常見的平板／桌機分界，也高於實際需要的 984。
// 這份試算表上一次載入時叫什麼名字。查不到就空字串——沒有名字不是錯誤。
const titleOfSheet = (input) => {
  const id = parseSpreadsheetId(input);
  if (!id) return '';
  return readRecentSheets().find((it) => it.id === id)?.title || '';
};

const NARROW = 1024;
const isNarrowViewport = () => {
  try {
    return window.innerWidth < NARROW;
  } catch {
    return false;
  }
};

const readHashIntent = () => {
  const id = parseSpreadsheetId(readSheetFromHash());
  const play = readPlayFromHash();
  if (!id) return { autoload: '', pending: '', play: false };
  // 在最近使用清單裡＝自己的書籤，直接載入；不認得＝別人傳來的，先問一聲。
  // 試玩連結也照這條規則走——「連結即動作」的顧慮不會因為它自稱是遊戲就消失，
  // 而惡意連結一樣寫得出 mode=play。
  return readRecentSheets().some((it) => it.id === id)
    ? { autoload: id, pending: '', play }
    : { autoload: '', pending: id, play };
};

const CreateApp = () => {
  // useState 的 lazy initializer：只在掛載時算一次
  const [hashIntent] = useState(readHashIntent);
  // 這一次是「被分享試玩」還是「自己在做」——由進來的網址決定，整個 session 不變
  const playMode = hashIntent.play;
  const [status, setStatus] = useState(hashIntent.autoload ? 'loading' : 'idle'); // idle | loading | checked | playing
  const [error, setError] = useState('');
  const [issues, setIssues] = useState([]);
  const [gameData, setGameData] = useState(null);
  const [imgMap, setImgMap] = useState(null);
  const [source, setSource] = useState('');
  // 圖片來源與資料來源是兩層：試算表出資料、本機資料夾出圖，可以只換其中一邊
  const [imgSource, setImgSource] = useState('');
  const [sheetUrl, setSheetUrl] = useState(''); // 記住來源，才能就地重新讀取
  const [rundownRows, setRundownRows] = useState([]);
  // 解析後的 7 張表。試玩本身用不到（GameController 吃的是原始 CSV 字串），
  // 但有兩個地方要它：①匯出遊戲包要靠它找出圖片欄位、改寫那幾格；
  // ②補上圖片資料夾之後要重跑檢查（判準從「是不是網址」變成「檔名找不找得到」）。
  // ②本來用 ref 存（理由是「它不進畫面」），①之後這句不再成立——匯出按鈕
  // 要在 render 時讀它，所以收成一份 state，不要兩個地方各存一份同樣的東西。
  const [tables, setTables] = useState(null);
  // 試玩中重新讀取：不動 status，畫面留在三欄，只有左欄轉圈
  // （status 一旦變成 'loading' 就會掉到開始畫面那個分支，整棵遊戲樹跟著卸載）
  const [reloading, setReloading] = useState(false);
  const [dataVersion, setDataVersion] = useState(0); // 換過幾份資料，給 GameController 判斷要不要重解析
  const [notice, setNotice] = useState('');
  const [recent, setRecent] = useState(readRecentSheets);
  // 網址帶了 #sheet= 但來源不是自己書籤過的，先問一聲再載入
  const [pendingSheet, setPendingSheet] = useState(hashIntent.pending);
  const [loadingLabel, setLoadingLabel] = useState(
    hashIntent.autoload ? ' Google 試算表' : ''
  );
  // 載入遮罩：off｜on（不透明）｜fading（淡出中）
  // 骨架上要寫的遊戲名。來自 recentSheets——上一次成功載入時存下來的，
  // 所以 Cmd+R 自動重讀時當場就有，不用等任何一支請求回來。
  // 查不到就留空（別人分享來的連結、第一次貼的試算表），骨架自己撐著。
  const [loadingTitle, setLoadingTitle] = useState(() =>
    hashIntent.autoload ? titleOfSheet(hashIntent.autoload) : ''
  );
  const [veil, setVeil] = useState(hashIntent.autoload ? 'on' : 'off');
  const veilRef = useRef('off');
  veilRef.current = veil;

  // 三欄要塞得下：左 268 ＋ 分隔線 8 ＋ 遊戲 420 ＋ 分隔線 8 ＋ 流程圖至少 280 ≈ 984。
  // 低於這個寬度預設兩欄都收起來，讓遊戲吃滿，使用者仍可自己打開。
  //
  // 只在掛載時判斷一次，**刻意不監聽 resize**：加了之後，使用者手動打開側欄
  // 再轉個螢幕方向就會被自動關掉，那比爆版更煩。
  const [showSource, setShowSource] = useState(() => !isNarrowViewport()); // 左側面板
  const [showFlow, setShowFlow] = useState(() => !isNarrowViewport()); // 右側流程圖
  // 試玩連結的 QR。預設收著——它只在「手邊有另一支手機」的時候有用，
  // 而那不是每一次都成立，常駐會讓左欄一直被一塊圖佔掉。
  const [showQr, setShowQr] = useState(false);

  // 這個要跟著視窗變（轉螢幕方向就該換版面），與 showSource/showFlow 的
  // 「只在掛載時判斷一次」不同——那兩個是使用者的意圖，這個是版面能力。
  const narrow = useMediaQuery(`(max-width:${NARROW - 1}px)`);

  // 窄螢幕上兩個抽屜都會蓋住畫面，同時開就什麼都看不到了——開一個就關另一個。
  // 寬螢幕是並排的欄位，互不遮擋，維持可以同時開。
  // 從寬變窄的那一刻，把兩個側欄都關掉。
  // 這跟「初始值只判斷一次、不監聽 resize」不衝突——那條擋的是「使用者主動打開之後
  // 又被自動關掉」；這裡處理的是**版面能力真的變了**：窄螢幕上側欄會變成蓋住畫面的
  // 抽屜，而原本兩個都開著的話會一次蓋兩層，等於什麼都看不到。
  useEffect(() => {
    if (!narrow) return;
    setShowSource(false);
    setShowFlow(false);
  }, [narrow]);

  const toggleSource = () => {
    const next = !showSource;
    setShowSource(next);
    if (next && narrow) setShowFlow(false);
  };
  const toggleFlow = () => {
    const next = !showFlow;
    setShowFlow(next);
    if (next && narrow) setShowSource(false);
  };

  const revokeImgs = useRef(null);

  // 表單頁要能捲；試玩時是固定一屏的版面，要鎖住捲動
  useEffect(() => {
    document.body.style.overflow = status === 'playing' ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [status]);

  useEffect(() => () => revokeImgs.current?.(), []);

  // 遮罩的生命週期跟 status 綁在一起，但**不是**同步消失：
  // status 一變成 playing，三欄／遊戲／流程圖會在同一格裡全部掛上來，
  // 那一格是半畫好的。所以先讓遮罩多撐一段，等底下安定了再淡出。
  useEffect(() => {
    if (status === 'loading') {
      setVeil('on');
      return undefined;
    }
    if (veilRef.current !== 'on') return undefined;
    const hold = setTimeout(() => setVeil('fading'), 140);
    const done = setTimeout(() => setVeil('off'), 140 + 280);
    return () => {
      clearTimeout(hold);
      clearTimeout(done);
    };
  }, [status]);

  // 判斷已經在 readHashIntent 做完（初始 state），這裡只負責發動抓取。
  //
  // 那個「自己的書籤才自動載入」的分界線是有意義的：自動載入等於「連結即動作」
  // ——任何人給你一個網址，你的瀏覽器就替他去抓一份試算表。
  // 對自己的書籤那是便利，對陌生連結那是被代勞。
  useEffect(() => {
    if (hashIntent.autoload) handleSheet(hashIntent.autoload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keepPlaying：在左側面板就地換資料時，不要退回檢查畫面
  const runChecks = (tables, csvFiles, map, keepPlaying) => {
    const found = [...validateGame(tables), ...checkSheetImages(tables, map)];
    setRundownRows(tables.rundown?.rows || []);
    setTables(tables);
    setIssues(found);
    setGameData(csvFiles);
    setDataVersion((v) => v + 1);

    // 資料沒問題就直接進三欄，檢查頁只在真的過不了的時候擋人。
    // **只有 error 擋，warn 放行**——demo 就有 11 個提醒、樹林那份也有，
    // 如果 warn 也擋，幾乎每次都會被擋住，等於沒改。
    // 提醒不會因此消失：左欄有 chip 與報告，而且報告在有 error 時會自己展開。
    const blocked = found.some((it) => it.level === 'error');

    // 被分享來試玩的人不該看到檢查頁——那是工具的畫面，而且會把答案攤開。
    // 真的過不了就只講一句話，細節留給作者自己開 /create 看。
    if (playMode) {
      if (blocked) {
        setGameData(null);
        setError('這份遊戲目前還不能玩，請通知作者。');
        setStatus('idle');
      } else {
        setStatus('playing');
      }
      return;
    }

    setStatus(keepPlaying || !blocked ? 'playing' : 'checked');
  };

  // 試玩中換資料只在左欄轉圈；還沒開始試玩才走 status='loading' 的整頁載入畫面
  const beginLoad = (keepPlaying, label = '') => {
    setError('');
    if (keepPlaying) setReloading(true);
    else {
      setLoadingLabel(label);
      setStatus('loading');
    }
  };

  // 讀取失敗時：試玩中就留在原地、錯誤顯示在左欄——手上這份還能玩的遊戲不該被一起丟掉
  const failLoad = (keepPlaying, err, fallbackMsg) => {
    setError(err.message || fallbackMsg);
    if (!keepPlaying) setStatus('idle');
  };

  const handleSheet = async (url) => {
    const keepPlaying = status === 'playing';

    // 連不像試算表網址的東西，**連讀取畫面都不要進**（Dong 2026-08-28 回報）。
    //
    // 這件事本來就不必等網路才知道答案——parseSpreadsheetId 是同步的純字串判斷。
    // 但原本的順序是先 beginLoad 再丟進 loadGameFromSheet，於是貼一個明顯不是試算表
    // 的連結，畫面照樣整個換成「正在讀取試算表」、遮罩蓋上、再淡出退回來。
    // 使用者看到的是「它去試了、然後不知道發生什麼事」，而正確的回饋是
    // 「這串東西我一眼就知道不對」——後者要當場、在原地、不換頁。
    if (!parseSpreadsheetId(url)) {
      setError('這不像 Google 試算表的連結，請貼上試算表網址');
      return;
    }

    setLoadingTitle(titleOfSheet(url));
    beginLoad(keepPlaying, ' Google 試算表');
    try {
      const { csvFiles, tables, spreadsheetId } = await loadGameFromSheet(url);
      // 不動 imgMap：試算表只負責資料，圖片那一層維持現狀。
      // 以前這裡會清掉，於是「試算表 ＋ 本機圖片」永遠湊不起來，
      // 而且每重讀一次試算表就得重選一次資料夾。
      setSheetUrl(url);
      setSource('Google 試算表');
      // 只在讀成功後才記——記下讀不到的連結只會讓清單變成一排地雷。
      // 用遊戲名稱當標籤（gviz 拿不到試算表檔名，見 recentSheets.js）
      // 被分享來試玩的人不記、也不改寫他的網址：那份試算表不是他的東西，
      // 塞進他的「最近使用」只是把別人的檔案掛在他的工具列上
      if (!playMode) {
        setRecent(rememberSheet(spreadsheetId, tables.config?.rows?.[0]?.title));
        // 網址列隨時反映當下這一份，使用者要分享直接複製就好
        writeSheetToHash(spreadsheetId);
      }
      runChecks(tables, csvFiles, imgMap, keepPlaying);
    } catch (err) {
      failLoad(keepPlaying, err, '匯入失敗');
    } finally {
      setReloading(false);
    }
  };

  const handleFolder = async (files) => {
    if (!files?.length) return;
    const keepPlaying = status === 'playing';
    setLoadingTitle('');
    beginLoad(keepPlaying, '本機資料夾');
    try {
      const {
        csvFiles,
        tables,
        ignored,
        imgMap: map,
        revokeImgs: revoke,
        imgCount,
        folderName,
      } = await readLocalGameFolder(files);

      revokeImgs.current?.();
      revokeImgs.current = revoke;
      setImgMap(map);
      setSheetUrl('');
      setSource(
        `${folderName}：${Object.keys(csvFiles).length} 張表 ＋ ${imgCount} 張圖`
      );
      setImgSource(imgCount ? `${folderName}：${imgCount} 張圖` : '');
      // 本機資料夾沒有網址可指，留著上一份的 hash 會讓複製出去的連結指向別的遊戲
      setSheetUrl('');
      clearSheetHash();
      if (ignored.length) {
        setError(
          `這些 CSV 的檔名認不出是哪一張表，已略過：${ignored.join('、')}`
        );
      }
      runChecks(tables, csvFiles, map, keepPlaying);
    } catch (err) {
      failLoad(keepPlaying, err, '讀取失敗');
    } finally {
      setReloading(false);
    }
  };

  // 只補圖片，完全不看資料夾裡的 CSV——同時吃兩個資料來源的話，
  // 之後出事會查不出是哪一份在生效
  const handleImageFolder = (files) => {
    if (!files?.length) return;
    const { map, revoke, count } = buildLocalImageMap(files);
    if (!count) {
      revoke();
      setError('這個資料夾裡沒有圖片檔，圖片來源沒有換。');
      return;
    }
    revokeImgs.current?.();
    revokeImgs.current = revoke;
    setImgMap(map);

    const folderName =
      Array.from(files)[0]?.webkitRelativePath?.split('/')[0] || '資料夾';
    setImgSource(`${folderName}：${count} 張圖`);
    setError('');

    // 判準變了就要重報：本來「不是網址」會被念，現在檔名對得上就算數
    // （這個 handler 每次 render 都重建，閉包裡的 tables 就是最新那份）
    if (tables) {
      setIssues([...validateGame(tables), ...checkSheetImages(tables, map)]);
    }
  };

  const reset = () => {
    setStatus('idle');
    setGameData(null);
    setTables(null);
    setIssues([]);
    setError('');
    // 換一份＝重來，圖片那層也要放掉。留著的話舊的 blob 不但漏在記憶體裡，
    // 下一份遊戲還會默默對到上一份的圖（跟「重新讀取同一份」刻意保留是兩回事）
    revokeImgs.current?.();
    revokeImgs.current = null;
    setImgMap(null);
    setImgSource('');
    setSheetUrl('');
    setSource('');
    setPendingSheet('');
    clearSheetHash();
  };

  // 匯出遊戲包只對試算表來源有意義：全本機那條路的 CSV 和圖片本來就都在
  // 使用者的資料夾裡，再打包一次只是把他已經有的東西還給他。
  // （試算表 ＋ 本機圖片資料夾的組合算在這裡面——資料在雲端，值得帶走。）
  const canExport = !!sheetUrl && !!tables;

  const hasError = issues.some((it) => it.level === 'error');

  // 「複製試玩連結」：把同一份試算表包成一條只會進遊戲的網址。
  // 只有走試算表這條路才有——本機資料夾的資料在對方電腦上不存在，給不了連結。
  const shareId = parseSpreadsheetId(sheetUrl);
  const playLinkEl = shareId ? (
    <Button
      fullWidth
      size="small"
      variant="outlined"
      startIcon={<LinkRoundedIcon />}
      onClick={async () => {
        const link = buildPlayLink(shareId);
        try {
          await navigator.clipboard.writeText(link);
          setNotice('試玩連結已複製');
        } catch {
          // 沒有剪貼簿權限（http 或使用者拒絕）就把網址attach在提示裡讓他自己選取
          setNotice(`試玩連結：${link}`);
        }
      }}
    >
      複製試玩連結
    </Button>
  ) : null;

  // 桌機做遊戲、手機驗收。這件事以前得手抄網址，或起一台綁 0.0.0.0 的 dev server。
  //
  // 連結內容就是 buildPlayLink()，所以它帶的是 window.location.origin——
  // **從 localhost 掃出來的 QR，手機是打不開的**（那是這台電腦的 localhost）。
  // 要在開發時真的用它測，得走 misheng-lan 那個綁 0.0.0.0 的設定。
  const qrEl = shareId ? (
    <>
      <Button
        fullWidth
        size="small"
        variant="text"
        startIcon={<QrCodeRoundedIcon />}
        onClick={() => setShowQr((v) => !v)}
        sx={{ textTransform: 'none' }}
      >
        {showQr ? '收起 QR' : '顯示 QR（用手機掃）'}
      </Button>
      {showQr && (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <QrCode value={buildPlayLink(shareId)} />
        </Box>
      )}
    </>
  ) : null;

  // ---- 試玩中：三欄 ----
  // 三個畫面分支都要蓋同一塊遮罩——它跨越的正是分支切換的那一刻
  const veilEl =
    veil === 'off' ? null : (
      <LoadingScreen
        label={loadingLabel}
        title={loadingTitle}
        fadingOut={veil === 'fading'}
      />
    );

  // 被分享來試玩的：只給遊戲本身。沒有流程圖、沒有驗證報告、沒有匯出鈕，
  // 也沒有 devTools（於是數字鍵、自動作答、鍵盤提示列一併不存在）。
  if (playMode && status === 'playing' && gameData) {
    return (
      <>
        <GameShell
          gameData={gameData}
          previewMode
          imgMap={imgMap}
          dataVersion={dataVersion}
          // 深色開關要給——這一頁對收到連結的人來說就是「遊戲」，而 /demo 的遊戲
          // 一直都有這顆。/create 自己那顆長在工具的殼上，而試玩模式沒有那個殼。
          // （重啟鈕不會跟著出現：它需要 gameId，而試算表這條路沒有遊戲資料夾。）
          headerActions={<ColorSchemeToggle />}
          brand={<BrandBadge qrUrl={window.location.href} />}
        />
        {veilEl}
      </>
    );
  }

  if (status === 'playing' && gameData) {
    // 窄螢幕上三欄擺不下（375px 的手機扣掉 268 的左欄只剩 100px 給遊戲），
    // 所以同樣的兩個開關改成叫出抽屜，而不是擠出兩個欄位。
    // 用的是同一組 showSource / showFlow state——換的是呈現方式，不是行為。
    // flowOn＝「流程圖現在有沒有在顯示」，不管它是並排的欄位還是抽屜。
    // icon 的顏色要看這個——綁 beside 的話，視窗一變窄 beside 就成 false，
    // 但抽屜其實還開著，按鈕會無故退回未啟用的灰色。
    const flowOn = showFlow && rundownRows.length > 0;
    const beside = !narrow && flowOn;
    const sourceDrawer = narrow && showSource;
    const flowDrawer = narrow && flowOn;

    // 欄位與抽屜共用同一份面板——兩種版面只是容器不同，內容不該有兩套
    const sourcePanelEl = (
      <SourcePanel
        source={source}
        imgSource={imgSource}
        issues={issues}
        onPickFolder={handleFolder}
        onPickImageFolder={handleImageFolder}
        onReset={reset}
        onReload={() => handleSheet(sheetUrl)}
        canReload={!!sheetUrl}
        reloading={reloading}
        error={error}
        recordUrl={String(tables?.config?.rows?.[0]?.recordUrl || '').trim()}
        exportSlot={
          <Stack spacing={1}>
            {playLinkEl}
            {qrEl}
            {/* 這句話每一次都成立，所以它不該住在六秒後就消失的通知裡。
                常駐在按鈕底下，才擋得住「以為它是保密的」。
                位置在 QR 底下而不是複製鈕底下——**QR 更容易被貼到牆上**，
                而貼上去的人正是最需要先讀到這句的人。 */}
            {playLinkEl && (
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                收到的人只會看到遊戲。但試算表本身仍是公開的，別當成保密。
              </Typography>
            )}
            {canExport ? (
              <ExportPackButton tables={tables} imgMap={imgMap} fullWidth size="small" />
            ) : null}
          </Stack>
        }
      />
    );

    return (
      <>
        <GameShell
          gameData={gameData}
          previewMode
          imgMap={imgMap}
          dataVersion={dataVersion}
          devTools
          onPositionLost={() =>
            setNotice(
              '你剛才停的那一列在新資料裡找不到了（內容被改掉或刪掉），已回到這一關的開頭。'
            )
          }
          leftPanel={
            // 收起時整欄不渲染，否則會留一條空白佔著畫面。
            //
            // 這裡刻意**不加進場動畫**。原本包了 <Slide timeout={260}>，但欄寬與
            // 分隔線是 flex 的同步 reflow——一個是動畫、一個是瞬間，兩者永遠對不齊：
            // 實測切開後 60ms，兩條分隔線都已就位，面板還停在 translateX(-268px)。
            // 看起來就是「資料比拖曳線晚進畫面」。
            //
            // 另一條路是讓欄寬也跟著動畫走，但那會跟拖曳分隔線的即時性打架
            // ——拖的時候你不會想要任何過渡。所以是拿掉動畫，不是補動畫。
            showSource && !narrow ? (
              <Box sx={{ height: '100%' }}>{sourcePanelEl}</Box>
            ) : null
          }
          sideFlex={narrow ? '0 0 auto' : beside ? 1 : undefined}
          resizable={!narrow && beside}
          sidePanel={
            // 窄螢幕時流程圖從右邊滑出，跟它那顆 icon 指的方向一致——
            // icon 畫的是右面板，東西卻從底下冒出來，指示和結果就對不上。
            // 而且流程圖是縱向的，高而窄的容器本來就比矮而寬的適合它。
            //
            // 但這個 Drawer 必須放在 sidePanel 這個插槽裡，不能掛在外面：
            // FlowPanel 要從 GameContext 拿 currentId／setCurrentId 才能點方塊跳關，
            // 而那個 provider 在 GameShell 內。Drawer 自己會 portal 到 body，
            // 所以它 render 在 provider 裡、畫面上卻逃得出這個欄位。
            narrow ? (
              <Drawer
                anchor="right"
                open={flowDrawer}
                onClose={() => setShowFlow(false)}
                PaperProps={{ sx: { width: 'min(420px, 92vw)' } }}
              >
                <FlowPanel key="narrow" rundownRows={rundownRows} />
              </Drawer>
            ) : beside ? (
              // key 隨版面模式改變：畫布的平移／縮放是為舊容器尺寸算的，
              // 容器一變（大綱那 232px 收掉、寬度大改）那個位移就不再對得上，
              // 內容會跑到視野外。換 key 讓它重掛、重新取景。
              // 代價是重畫 1272 個節點，但跨越斷點是很少發生的事。
              <FlowPanel key="wide" rundownRows={rundownRows} />
            ) : null
          }
        />

        {/* 固定右上角：兩側面板的開關，位置不隨面板收合而變 */}
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            position: 'fixed',
            top: 6,
            right: 10,
            zIndex: 2000,
            bgcolor: 'background.overlay',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            px: 0.5,
          }}
        >
          {/* 左右兩顆用同一顆 icon 鏡射，成對讀起來才是「左面板／右面板」。
              MUI 這一版沒有 Material Symbols 的 left_panel_*（那是另一套圖庫），
              而 ViewSidebar 的細格本來就在右邊，所以左邊那顆 scaleX(-1) 翻過來。
              原本左邊放的是 MiSheng logo 加 invert 濾鏡——那不是 icon，
              沒有人會從一個品牌標誌看出「這會開關左邊的面板」 */}
          <Tooltip title={showSource ? '收起資料來源' : '顯示資料來源'}>
            <IconButton size="small" onClick={toggleSource}>
              <ViewSidebarRoundedIcon
                fontSize="small"
                color={showSource ? 'secondary' : 'inherit'}
                sx={{ transform: 'scaleX(-1)' }}
              />
            </IconButton>
          </Tooltip>
          <Tooltip title={flowOn ? '收起流程圖' : '顯示流程圖'}>
            <IconButton size="small" onClick={toggleFlow}>
              <ViewSidebarRoundedIcon
                fontSize="small"
                color={flowOn ? 'secondary' : 'inherit'}
              />
            </IconButton>
          </Tooltip>
          <ColorSchemeToggle />
        </Stack>

        {/* 重讀後被迫回到開頭時說一聲——不講的話會像遊戲自己跳掉了 */}
        <Snackbar
          open={!!notice}
          autoHideDuration={6000}
          onClose={() => setNotice('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          {/* 全 app 只有這一顆曾經是 severity="info" ＋ variant="filled"，於是它吃到
              MUI 預設的亮藍——正是 theme.js 當初特地換掉的那個色（「去掉亮藍紫的
              AI 味」）。theme 沒有定義 palette.info，所以它不會被收編，只能在這裡指定。
              改用 primary：淺色是藍灰墨配白字、深色翻成近白配深字，兩邊都跟其他畫面
              同一種語言。ⓘ 圖示也拿掉——那個符號讓一句「複製好了」看起來像系統警告。 */}
          <Alert
            icon={false}
            variant="filled"
            onClose={() => setNotice('')}
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '& .MuiAlert-action': { color: 'inherit' },
            }}
          >
            {notice}
          </Alert>
        </Snackbar>
        {/* 窄螢幕：資料來源從左邊滑出。寬度留一點讓人看得到底下還有遊戲，
            知道自己只是「疊了一層」而不是換頁 */}
        <Drawer
          anchor="left"
          open={sourceDrawer}
          onClose={() => setShowSource(false)}
          PaperProps={{ sx: { width: 'min(340px, 88vw)' } }}
        >
          {sourcePanelEl}
        </Drawer>

        {veilEl}
      </>
    );
  }

  // ---- 檢查結果 ----
  if (status === 'checked') {
    return (
      <>
        {veilEl}
        <FloatingSchemeToggle />
        <Fade in>
        <Box
          sx={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 2,
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 560 }}>
            <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: 1 }}>
              檢查結果
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              {source}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 2.5, mt: 1.5 }}>
              <Chip
                size="small"
                color={hasError ? 'error' : 'success'}
                variant={hasError ? 'filled' : 'outlined'}
                label={hasError ? '需要修正' : '可以生成'}
              />
              <Chip size="small" variant="outlined" label={`${rundownRows.length} 列流程`} />
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button
                fullWidth
                size="large"
                variant="contained"
                startIcon={<PlayArrowRoundedIcon />}
                disabled={hasError}
                onClick={() => setStatus('playing')}
              >
                {hasError ? '請先修正錯誤' : '開始試玩'}
              </Button>
              <Button size="large" variant="text" onClick={reset}>
                換一份
              </Button>
            </Stack>

            {canExport && (
              <Box sx={{ mt: 1.5 }}>
                <ExportPackButton tables={tables} imgMap={imgMap} fullWidth />
              </Box>
            )}

            <Box sx={{ mt: 3, maxHeight: '46vh', overflow: 'auto' }}>
              <ValidationReport issues={issues} />
            </Box>
          </Box>
        </Box>
        </Fade>
      </>
    );
  }

  // ---- 開始畫面 ----
  return (
    <>
      {veilEl}
      <FloatingSchemeToggle />
      <SourcePicker
      loading={status === 'loading'}
      onFolder={handleFolder}
      onSheet={handleSheet}
      error={error}
      recent={recent}
      onForget={(id) => setRecent(forgetSheet(id))}
      pendingSheet={pendingSheet}
      playMode={playMode}
      onAcceptPending={() => {
        const id = pendingSheet;
        setPendingSheet('');
        handleSheet(id);
      }}
        onDismissPending={() => {
          setPendingSheet('');
          clearSheetHash();
        }}
      />
    </>
  );
};

export default CreateApp;
