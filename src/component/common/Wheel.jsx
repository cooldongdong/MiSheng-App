import PropTypes from 'prop-types';
import { useContext, useEffect, useState } from 'react';
import { GameContext } from '../../store/game-context';
import { Box, Fab, Paper, Slider } from '@mui/material';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import CloseFullscreenRoundedIcon from '@mui/icons-material/CloseFullscreenRounded';

const Wheel = ({
  prop,
  elevation = 10,
  borderRadius = '10px',
  zoomInFab = 'right',
  isFullScreen,
  showZoomButton,
  onToggle,
}) => {
  const { getImg } = useContext(GameContext);
  const [hasRotateImg2, setHasRotateImg2] = useState(null);
  const [angle, setAngle] = useState(180);
  const [angle2, setAngle2] = useState(180);
  const handleSliderChange = (event, newValue) => {
    setAngle(newValue);
  };

  const handleSlider2Change = (event, newValue) => {
    setAngle2(newValue);
  };

  useEffect(() => {
    if (!prop.rotateImg2) {
      return;
    }
    setHasRotateImg2(true);
  }, [prop.rotateImg2]);

  return (
    <>
      {/* 當圖片沒有放大時，顯示在 Paper 內 */}
      {!isFullScreen && (
        <Paper
          elevation={elevation}
          sx={{
            display: 'flex',
            borderRadius: { borderRadius },
            position: 'relative',
          }}
        >
          {showZoomButton && (
            <Box
              sx={{
                position: 'absolute',
                width: '100%',
                bottom: 10,
                display: 'flex',
                alignItems: 'center',
                zIndex: 1101,
              }}
            >
              {prop.title && (
                <Box
                  sx={{
                    backgroundColor: '#37474F',
                    borderRadius: '0px 20px 20px 0px',
                    fontSize: 14,
                    fontWeight: 'regular',
                    textAlign: 'center',
                    letterSpacing: 0.7,
                    color: '#fff',
                    p: '6px',
                    pr: '13px',
                  }}
                >
                  {prop.title}
                </Box>
              )}
              {zoomInFab === 'right' && (
                <Fab
                  size="small"
                  onClick={onToggle}
                  sx={{
                    backgroundColor: '#fff',
                    color: '#37474F',
                    right: 10,
                    ml: 'auto',
                  }}
                >
                  <OpenInFullRoundedIcon />
                </Fab>
              )}
              {zoomInFab === 'center' && (
                <Fab
                  size="medium"
                  onClick={onToggle}
                  sx={{
                    backgroundColor: '#fff',
                    color: '#37474F',
                    m: 'auto',
                    top: 10,
                    transform: 'translateY(50%)',
                  }}
                >
                  <OpenInFullRoundedIcon />
                </Fab>
              )}
            </Box>
          )}
          <img
            src={getImg(prop.img)}
            alt={prop.img}
            style={{
              width: '100%',
              objectFit: 'scale-down',
              borderRadius: 'inherit',
            }}
          />
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
              width: '100%',
              height: '100%',
              m: '0 !important',
              position: 'fixed',
              top: 0,
              left: 0,
              backgroundColor: 'rgba(200, 200, 200, 0.9)',
              zIndex: 1000,
            }}
          />
          {/* Fixed底層 */}
          <Box
            sx={{
              width: '100%',
              height: '100%',
              m: '0 !important',
              position: 'fixed',
              top: 0,
              left: 0,
              display: 'flex',
              alignItems: 'center',
              zIndex: 1100,
            }}
          >
            {/* 功能區 */}
            <Box
              sx={{
                width: '100%',
                maxWidth: '600px',
                height: '80dvh',
                maxHeight: '650px',
                margin: 'auto',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {/* 放大的圖片 */}
              <Box
                sx={{
                  width: '100%',
                  maxWidth: '600px',
                  height: 'auto',
                  position: 'relative',
                }}
              >
                {/* 可以旋轉的第二張圖片 */}
                {hasRotateImg2 && (
                  <img
                    src={getImg(prop.rotateImg2)}
                    alt={prop.rotateImg2}
                    style={{
                      width: '100%',
                      maxWidth: '600px',
                      maxHeight: '100%',
                      position: 'absolute',
                      transform: `rotate(${angle2}deg)`,
                      transition: 'transform 0.1s linear',
                      objectFit: 'scale-down',
                      filter: 'drop-shadow(0px 0px 4px rgba(0, 0, 0, 0.3))',
                    }}
                  />
                )}

                {/* 可以旋轉的那張圖片 */}
                <img
                  src={getImg(prop.rotateImg1)}
                  alt={prop.rotateImg1}
                  style={{
                    width: '100%',
                    maxWidth: '600px',
                    maxHeight: '100%',
                    position: 'absolute',
                    transform: `rotate(${angle}deg)`,
                    transition: 'transform 0.1s linear',
                    objectFit: 'scale-down',
                    filter: 'drop-shadow(0px 0px 4px rgba(0, 0, 0, 0.3))',
                  }}
                />

                {/* 不能旋轉的那張圖片 */}
                <img
                  src={getImg(prop.frontImg)}
                  alt={prop.frontImg}
                  style={{
                    width: '100%',
                    maxWidth: '600px',
                    maxHeight: '100%',
                    position: 'relative',
                    objectFit: 'scale-down',
                    filter: 'drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.5))',
                  }}
                />
              </Box>

              {hasRotateImg2 ? (
                // 有兩個滑桿
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: '600px',
                    position: 'absolute',
                  }}
                >
                  <Box
                    sx={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div
                      style={{
                        height: '100dvw',
                        maxHeight: '600px',
                        padding: '6% 1%',
                        backgroundColor: 'rgba(255, 255, 255, 0.5)',
                        backdropFilter: 'blur(5px)',
                        borderRadius: '0 10px 10px 0',
                        boxSizing: 'border-box',
                        boxShadow: '-2px 0px 6px rgba(0, 0, 0, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
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
                        height: '100dvw',
                        maxHeight: '600px',
                        padding: '6% 1%',
                        backgroundColor: 'rgba(255, 255, 255, 0.5)',
                        backdropFilter: 'blur(5px)',
                        borderRadius: '10px 0 0 10px ',
                        boxSizing: 'border-box',
                        boxShadow: '-2px 0px 6px rgba(0, 0, 0, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
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
                    width: '80%',
                    maxWidth: '480px',
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
                  flexShrink: '0',
                  backgroundColor: '#fff',
                  color: '#37474F',
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
