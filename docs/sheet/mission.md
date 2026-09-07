# mission：關卡與答案

一列就是一關。

| 欄位 | 說明 |
|---|---|
| `id` | **必填、不可重複**。四張表都靠它指到這一關 |
| `title` | 關卡名 |
| `subtitle` | 副標（三個字以內才會顯示） |
| `description` | 關卡說明，顯示在開場頁 |
| `answer` | 正確答案 |
| `similarAnswer` | 「很接近了」的答案，玩家打到會得到不同的回應 |
| `successText` | 答對時說什麼 |
| `giveUpText` | 放棄時說什麼 |
| `confirmGiveUpText` | 放棄前的確認 |
| `backgroundImg` | 這一關的背景圖 |
| `navigation` | 一條地圖連結。填了開場頁會出現「導航」按鈕 |

## 多個答案都算對

在**同一格裡換行**（`Ctrl`＋`Enter`，Mac 是 `Cmd`＋`Enter`）：

```
土地公
福德正神
福德爺
```

三個都算對。

## id 用看得懂的名字

`第三章`、`土地公廟` 都可以，不必是數字。
其他表的 `missionId` 填一樣的字就連得起來。
