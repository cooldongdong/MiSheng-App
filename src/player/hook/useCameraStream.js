// useCameraStream.js
// 相機串流的生命週期：要權限、接上 <video>、離開就關掉。
//
// 這個 hook 的重點不是「打開相機」，是「打不開的時候不要讓玩家卡死」——
// 玩家多半是從 LINE／IG 的內建瀏覽器點進來的，iOS 的 in-app 瀏覽器常常拿不到相機，
// 而那個當下沒有人在現場能救他。所以每一種失敗都必須落到一個明確的 status，
// 由畫面退化成「純看圖」，而不是停在轉圈或白畫面。

import { useCallback, useEffect, useRef, useState } from 'react';

export const CAMERA_STATUS = {
  IDLE: 'idle',
  STARTING: 'starting',
  LIVE: 'live',
  BLOCKED: 'blocked', // 拿不到相機，畫面要退化成純看圖
};

// 失敗原因分類——決定要對玩家說哪一句話。說錯話比不說更糟：
// 叫一個「桌機沒相機」的人去改用 Safari 是白忙一場。
const classify = (error) => {
  const name = error?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'notfound';
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'busy';
  return 'other';
};

// 開發用假相機：CI／預覽環境沒有實體相機，沒有它就完全驗不了這個功能。
// ?fakeCamera=1 給一條會動的假畫面（動的東西才驗得出「凍結」真的凍住了），
// ?fakeCamera=denied / notfound / insecure 用來走三條降級路徑。
// 只在 dev 開，正式站不留這個後門。
// 常數而非函式內判斷：build 時 DEV 被換成 false，整個 if (FAKE_ENABLED) 區塊
// 連同底下的 makeFakeStream 會被搖掉，正式站的 bundle 裡不會留下這段
const FAKE_ENABLED = import.meta.env.DEV;

const fakeCameraMode = () => {
  try {
    return new URLSearchParams(window.location.search).get('fakeCamera');
  } catch {
    return null;
  }
};

const makeFakeStream = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d');
  let raf = 0;

  const start = Date.now();
  const draw = () => {
    const t = (Date.now() - start) / 1000;
    ctx.fillStyle = '#2b3a42';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 格線：疊圖對位對不對，看格線最準
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= canvas.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // 假的「現場物件」：一塊匾額
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(120, 480, 480, 320);
    ctx.fillStyle = '#fff8e1';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('假相機', 360, 620);
    ctx.font = '40px sans-serif';
    ctx.fillText('fakeCamera=1', 360, 690);

    // 秒針：畫面有沒有活著、凍結有沒有真的凍住，看這個
    ctx.fillStyle = '#ffca28';
    ctx.beginPath();
    ctx.arc(360 + Math.cos(t * 2) * 200, 1050 + Math.sin(t * 2) * 100, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '36px monospace';
    ctx.fillText(`${t.toFixed(1)}s`, 360, 200);

    raf = requestAnimationFrame(draw);
  };
  draw();

  const stream = canvas.captureStream(30);
  // 收掉 rAF——不然關了相機畫面還在背景一直畫
  const stop = () => cancelAnimationFrame(raf);
  stream.getTracks().forEach((track) => {
    const original = track.stop.bind(track);
    track.stop = () => {
      stop();
      original();
    };
  });
  return stream;
};

const openStream = async () => {
  if (FAKE_ENABLED) {
    const fake = fakeCameraMode();
    if (fake === 'denied') throw Object.assign(new Error('fake'), { name: 'NotAllowedError' });
    if (fake === 'notfound') throw Object.assign(new Error('fake'), { name: 'NotFoundError' });
    if (fake === 'insecure') return null; // 當作 mediaDevices 不存在
    if (fake) return makeFakeStream();
  }
  // 非 HTTPS（含用區網 IP 拿手機測）時 mediaDevices 根本不存在，不是「被拒絕」
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) return null;
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' } }, // 對位要用後鏡頭
    audio: false,
  });
};

export const useCameraStream = (active) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState(CAMERA_STATUS.IDLE);
  const [reason, setReason] = useState(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!active) {
      stop();
      setStatus(CAMERA_STATUS.IDLE);
      return undefined;
    }

    let cancelled = false;

    const start = async () => {
      setStatus(CAMERA_STATUS.STARTING);
      setReason(null);
      try {
        const stream = await openStream();
        if (cancelled) {
          stream?.getTracks().forEach((track) => track.stop());
          return;
        }
        if (!stream) {
          setReason('insecure');
          setStatus(CAMERA_STATUS.BLOCKED);
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // iOS 上 play() 被中斷會 reject，那不是錯誤，不能因此判定相機失敗
          await videoRef.current.play().catch(() => {});
        }
        setStatus(CAMERA_STATUS.LIVE);
      } catch (error) {
        if (cancelled) return;
        setReason(classify(error));
        setStatus(CAMERA_STATUS.BLOCKED);
      }
    };

    start();

    // 切走就放掉相機：省電，而且相機燈一直亮會讓玩家覺得被偷拍。
    // 回來再重開——權限這一輪已經給過，不會再跳一次對話框。
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else if (!streamRef.current) {
        start();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [active, stop]);

  return { videoRef, status, reason };
};
