import PropTypes from "prop-types";
import { useContext, useEffect, useState } from "react";
import { GameContext } from "../../store/game-context";
import { Box, Fab, Paper, Skeleton, Slider } from "@mui/material";
import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import CloseFullscreenRoundedIcon from "@mui/icons-material/CloseFullscreenRounded";
import SkeletonImage from "./SkeletonImage";
import {
  useImageRatio,
  useReduceMotion,
  stillSkeletonSx,
} from "../../hook/useImageRatio";

// 轉盤跟著 slider 轉，所以**不能給 transform 補間**。
//
// 原本兩個會轉的圖層都掛著 transition: transform 0.1s linear。slider 是連續的
// （0–360，每拖一像素就發一次 onChange），於是每一格都在重啟一次 0.1 秒的補間、
// 而且永遠在下一格到來前被打斷——圖片從頭到尾在追一個一直跑掉的目標，看起來就是
// 抽搐（Dong 2026-08-28 回報）。補間要處理的是「值一次跳很遠」，而這裡的值本來就
// 是連續的，本來就不需要。
//
// will-change 是給 drop-shadow 的：帶 filter 的圖層每轉一格都要重算濾鏡，
// 提升成獨立的合成層之後，旋轉交給合成器，濾鏡不必每格重來。
const Wheel = ({
  prop,
  elevation = 10,
  borderRadius = "10px",
  zoomInFab = "right",
  isFullScreen,
  showZoomButton,
  onToggle,
}) => {
  const { getImg } = useContext(GameContext);
  const [angle, setAngle] = useState(180);
  const [angle2, setAngle2] = useState(180);
  const handleSliderChange = (event, newValue) => {
    setAngle(newValue);
  };

  const handleSlider2Change = (event, newValue) => {
    setAngle2(newValue);
  };

  // 直接從 prop 推導，不要 state ＋ useEffect。原本是 useState(null) 加一支
  // 只寫 true、永遠不寫回 false 的 effect，所以這個值只能單向。在 /create 裡
  // 改試算表拿掉 rotateImg2 時元件不會重新掛載，第二根滑桿會留在畫面上，
  // 拖它也不會有任何東西轉。
  const hasRotateImg2 = Boolean(prop.rotateImg2);

  // 版面高度由這張看不見的「量尺」決定，跟填了哪幾個圖層無關。
  // 以前是靠 frontImg 撐——三層圖只有它是 relative（在文件流裡），另外兩張是
  // absolute ＋ maxHeight:100%。所以 frontImg 沒填時容器高度趨近 0，
  // 另外兩張的 maxHeight 也跟著變成 0，整個轉盤縮成一點點。
  // 那讓一個選填欄位實際上變成必填，而且得放一張尺寸剛好的透明圖才會正常——
  // 尺寸填錯不會報錯，只會默默歪掉。
  //
  // 順序＝「誰最可能是整個轉盤的外框」。backImg 排在旋轉層前面：它是不轉的
  // 底圖，通常畫的就是整個盤面，而會轉的那幾層常常只是中間一小片。
  const sizerSrc =
    prop.frontImg ||
    prop.backImg ||
    prop.rotateImg1 ||
    prop.rotateImg2 ||
    prop.img;

  // 放大的轉盤：**四層圖要一起出現，不能一層一層冒出來。**
  //
  // 每一層各自載入的話，玩家會看到轉盤自己拼起來——底圖先到、指針後到、
  // 外框最後到。而這幾層是要精準對齊的，半成品比空白更難看。
  // 所以全部載完才一起淡入，在那之前是一整塊骨架。
  //
  // 高度同樣要先佔好。原本完全靠那張看不見的量尺撐，而量尺沒載完前它的高度是 0
  // ——整個轉盤縮成一條線，載完瞬間彈開。改成先用記住的長寬比撐著（第一次是猜的），
  // 量尺載完之後兩者本來就會一致，所以不會再跳。
  const sizerResolved = getImg(sizerSrc);
  const {
    ratio,
    measured: sizerMeasured,
    onLoad: onSizerLoad,
    onError: onSizerError,
  } = useImageRatio(sizerResolved);
  const reduceMotion = useReduceMotion();

  const layerSrcs = [
    sizerResolved,
    getImg(prop.backImg),
    hasRotateImg2 ? getImg(prop.rotateImg2) : null,
    getImg(prop.rotateImg1),
    getImg(prop.frontImg),
  ].filter(Boolean);
  const layerKey = layerSrcs.join("|");

  const [loadedLayers, setLoadedLayers] = useState({});
  const [failedLayers, setFailedLayers] = useState({});
  // 換道具就重來一輪，否則新轉盤會沿用上一個的「全部載完」
  useEffect(() => {
    setLoadedLayers({});
    setFailedLayers({});
  }, [layerKey]);
  const markLoaded = (src) => () =>
    setLoadedLayers((prev) => (prev[src] ? prev : { ...prev, [src]: true }));
  // 載失敗的圖層要**整層藏起來**，不是讓它顯示破圖。
  // 這幾層是一張合成圖的一部分，畫不出來就該消失；瀏覽器預設會畫一個破圖圖示
  // 加上 alt 文字，而這裡的 alt 是原始網址，結果是一長串 https://... 橫在轉盤上。
  // （實測撞到：福德之路第三關的 rotateImg1 是壞的 Drive 連結。）
  const markFailed = (src) => () => {
    setFailedLayers((prev) => (prev[src] ? prev : { ...prev, [src]: true }));
    setLoadedLayers((prev) => (prev[src] ? prev : { ...prev, [src]: true }));
  };
  const allLoaded = layerSrcs.every((src) => loadedLayers[src]);
  const layerSx = (src) =>
    failedLayers[src] ? { display: "none" } : layerFade;

  // 某一層掛掉就不該卡住其他層——寧可少一層也不要永遠停在骨架
  const layerFade = {
    opacity: allLoaded ? 1 : 0,
    transition: reduceMotion ? "none" : "opacity 240ms ease",
  };

  return (
    <>
      {/* 當圖片沒有放大時，顯示在 Paper 內 */}
      {!isFullScreen && (
        <Paper
          elevation={elevation}
          sx={{
            display: "flex",
            borderRadius: { borderRadius },
            position: "relative",
          }}
        >
          {showZoomButton && (
            <Box
              sx={{
                position: "absolute",
                width: "100%",
                bottom: 10,
                display: "flex",
                alignItems: "center",
                zIndex: 1101,
              }}
            >
              {prop.title && (
                <Box
                  sx={{
                    backgroundColor: "#37474F",
                    borderRadius: "0px 20px 20px 0px",
                    fontSize: 14,
                    fontWeight: "regular",
                    textAlign: "center",
                    letterSpacing: 0.7,
                    color: "#fff",
                    p: "6px",
                    pr: "13px",
                  }}
                >
                  {prop.title}
                </Box>
              )}
              {zoomInFab === "right" && (
                <Fab
                  size="small"
                  onClick={onToggle}
                  sx={{
                    backgroundColor: "#fff",
                    color: "#37474F",
                    right: 10,
                    ml: "auto",
                  }}
                >
                  <OpenInFullRoundedIcon />
                </Fab>
              )}
              {zoomInFab === "center" && (
                <Fab
                  size="medium"
                  onClick={onToggle}
                  sx={{
                    backgroundColor: "#fff",
                    color: "#37474F",
                    m: "auto",
                    top: 10,
                    transform: "translateY(50%)",
                  }}
                >
                  <OpenInFullRoundedIcon />
                </Fab>
              )}
            </Box>
          )}
          {/* 縮圖跟 ZoomableImage 用同一個元件——兩邊分開寫的話行為遲早會分岔，
              2026-09-03 第一版就是只改了 ZoomableImage、漏掉這裡 */}
          <SkeletonImage src={getImg(prop.img)} alt={prop.img} />
        </Paper>
      )}

      {/* 當圖片放大時 */}
      {isFullScreen && (
        <>
          {/* 半透明背景 */}
          <Box
            sx={{
              // 100vw/100vh 會量到「視窗」，嵌在 /create 的欄位裡時會溢出去；
              // 100% 才是填滿定位基準（見 GameShell #main-container 的 transform）
              width: "100%",
              height: "100%",
              m: "0 !important",
              position: "fixed",
              top: 0,
              left: 0,
              backgroundColor: "rgba(200, 200, 200, 0.9)",
              zIndex: 1000,
            }}
          />
          {/* Fixed底層 */}
          <Box
            sx={{
              width: "100%",
              height: "100%",
              m: "0 !important",
              position: "fixed",
              top: 0,
              left: 0,
              display: "flex",
              alignItems: "center",
              zIndex: 1100,
            }}
          >
            {/* 功能區 */}
            <Box
              sx={{
                width: "100%",
                maxWidth: "600px",
                // 用 % 而不是 dvh：嵌在 /create 的欄位裡時，dvh 量的是整個視窗
                height: "80%",
                maxHeight: "650px",
                margin: "auto",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {/* 放大的圖片 */}
              <Box
                sx={{
                  width: "100%",
                  maxWidth: "600px",
                  height: "auto",
                  position: "relative",
                  // 全部載完之前先用長寬比把高度佔住；載完就交還給量尺
                  // **量尺自己載失敗時不能交還**——它的高度是 0，交還等於讓整個
                  // 轉盤先撐開再塌掉。實測撞到：福德之路第三關三個轉盤共用的
                  // rotateImg1 是壞的 Drive 連結，而它剛好就是量尺。
                  ...(allLoaded && sizerMeasured
                    ? null
                    : { aspectRatio: String(ratio) }),
                  ...stillSkeletonSx(reduceMotion),
                }}
              >
                {!allLoaded && (
                  <Skeleton
                    variant="rectangular"
                    sx={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                    }}
                  />
                )}

                {/* 看不見的量尺：只負責把容器撐到正確高度，不參與畫面 */}
                {sizerSrc && (
                  <img
                    src={sizerResolved}
                    alt=""
                    aria-hidden
                    onLoad={(e) => {
                      onSizerLoad(e);
                      markLoaded(sizerResolved)();
                    }}
                    onError={(e) => {
                      onSizerError(e);
                      markFailed(sizerResolved)();
                    }}
                    style={{
                      width: "100%",
                      maxWidth: "600px",
                      display: "block",
                      visibility: "hidden",
                      pointerEvents: "none",
                    }}
                  />
                )}

                {/* 不能旋轉的底圖，疊在所有旋轉層下面。
                    在它出現之前，想做「固定背景＋只轉前面」唯一的辦法是把背景
                    塞進 rotateImg2——但那會長出第二根滑桿，而那根滑桿沒有用途，
                    拖它只會把背景轉歪。所以缺的不是介面，是這一層 */}
                {prop.backImg && (
                  <img
                    src={getImg(prop.backImg)}
                    alt={prop.backImg}
                    onLoad={markLoaded(getImg(prop.backImg))}
                    onError={markFailed(getImg(prop.backImg))}
                    style={{
                      width: "100%",
                      maxWidth: "600px",
                      maxHeight: "100%",
                      position: "absolute",
                      top: 0,
                      left: 0,
                      objectFit: "scale-down",
                      ...layerSx(getImg(prop.backImg)),
                    }}
                  />
                )}

                {/* 可以旋轉的第二張圖片 */}
                {hasRotateImg2 && (
                  <img
                    src={getImg(prop.rotateImg2)}
                    alt={prop.rotateImg2}
                    onLoad={markLoaded(getImg(prop.rotateImg2))}
                    onError={markFailed(getImg(prop.rotateImg2))}
                    style={{
                      width: "100%",
                      maxWidth: "600px",
                      maxHeight: "100%",
                      // 三層都要明寫 top/left：absolute 沒給偏移時會落在「靜態位置」，
                      // 而量尺排在它們前面，會把靜態位置整個往下推
                      position: "absolute",
                      top: 0,
                      left: 0,
                      transform: `rotate(${angle2}deg)`,
                      willChange: "transform",
                      objectFit: "scale-down",
                      filter: "drop-shadow(0px 0px 4px rgba(0, 0, 0, 0.3))",
                      ...layerSx(getImg(prop.rotateImg2)),
                    }}
                  />
                )}

                {/* 可以旋轉的那張圖片 */}
                <img
                  src={getImg(prop.rotateImg1)}
                  alt={prop.rotateImg1}
                  onLoad={markLoaded(getImg(prop.rotateImg1))}
                  onError={markFailed(getImg(prop.rotateImg1))}
                  style={{
                    width: "100%",
                    maxWidth: "600px",
                    maxHeight: "100%",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    transform: `rotate(${angle}deg)`,
                    willChange: "transform",
                    objectFit: "scale-down",
                    filter: "drop-shadow(0px 0px 4px rgba(0, 0, 0, 0.3))",
                    ...layerSx(getImg(prop.rotateImg1)),
                  }}
                />

                {/* 不能旋轉的那張圖片。跟其他層一樣是 absolute——撐版面的是量尺，
                    誰在文件流裡不再取決於填了哪些欄位 */}
                {prop.frontImg && (
                  <img
                    src={getImg(prop.frontImg)}
                    alt={prop.frontImg}
                    onLoad={markLoaded(getImg(prop.frontImg))}
                    onError={markFailed(getImg(prop.frontImg))}
                    style={{
                      width: "100%",
                      maxWidth: "600px",
                      maxHeight: "100%",
                      position: "absolute",
                      top: 0,
                      left: 0,
                      objectFit: "scale-down",
                      filter: "drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.5))",
                      ...layerSx(getImg(prop.frontImg)),
                    }}
                  />
                )}
              </Box>

              {hasRotateImg2 ? (
                // 有兩個滑桿
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: "600px",
                    position: "absolute",
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        // 面板高度跟著裡面的滑桿走就好。原本是 100dvw（視窗寬），
                        // 在窄欄位裡會變成一根比轉盤還高的白柱子
                        height: "auto",
                        padding: "6% 1%",
                        backgroundColor: "rgba(255, 255, 255, 0.5)",
                        backdropFilter: "blur(5px)",
                        borderRadius: "0 10px 10px 0",
                        boxSizing: "border-box",
                        boxShadow: "-2px 0px 6px rgba(0, 0, 0, 0.3)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      <Slider
                        value={angle}
                        onChange={handleSliderChange}
                        aria-label="Degree"
                        aria-labelledby="continuous-slider"
                        color="danger"
                        min={0}
                        max={360}
                        orientation="vertical"
                        sx={{
                          height: 300,
                        }}
                      />
                      <div
                        style={{ marginTop: 8, fontSize: 14, fontWeight: 500 }}
                      >
                        {angle}°
                      </div>
                    </div>
                    <div
                      style={{
                        // 面板高度跟著裡面的滑桿走就好。原本是 100dvw（視窗寬），
                        // 在窄欄位裡會變成一根比轉盤還高的白柱子
                        height: "auto",
                        padding: "6% 1%",
                        backgroundColor: "rgba(255, 255, 255, 0.5)",
                        backdropFilter: "blur(5px)",
                        borderRadius: "10px 0 0 10px ",
                        boxSizing: "border-box",
                        boxShadow: "-2px 0px 6px rgba(0, 0, 0, 0.3)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      <Slider
                        value={angle2}
                        onChange={handleSlider2Change}
                        aria-label="Degree"
                        aria-labelledby="continuous-slider"
                        color="danger"
                        min={0}
                        max={360}
                        orientation="vertical"
                        sx={{
                          height: 300,
                        }}
                      />
                      <div
                        style={{ marginTop: 8, fontSize: 14, fontWeight: 500 }}
                      >
                        {angle2}°
                      </div>
                    </div>
                  </Box>
                </Box>
              ) : (
                // 僅有單一滑桿
                <Box
                  sx={{
                    width: "80%",
                    maxWidth: "480px",
                  }}
                >
                  <Slider
                    value={angle}
                    onChange={handleSliderChange}
                    aria-label="Degree"
                    aria-labelledby="continuous-slider"
                    color="danger"
                    min={0}
                    max={360}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}°`}
                  />
                </Box>
              )}

              {/* 縮小按鈕 */}
              <Fab
                onClick={onToggle}
                sx={{
                  flexShrink: "0",
                  backgroundColor: "#fff",
                  color: "#37474F",
                }}
              >
                <CloseFullscreenRoundedIcon />
              </Fab>
            </Box>
          </Box>
        </>
      )}
    </>
  );
};

Wheel.propTypes = {
  prop: PropTypes.object,
  elevation: PropTypes.number,
  borderRadius: PropTypes.string,
  zoomInFab: PropTypes.string,
  isFullScreen: PropTypes.bool.isRequired,
  showZoomButton: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default Wheel;
