# config：遊戲設定

**只有一列。** 整款遊戲的設定寫在這裡。

| 欄位 | 說明 |
|---|---|
| `id` | 這款遊戲的名字，**也是玩家存檔的名字** |
| `title` | 遊戲標題（也是封面上的字） |
| `description` | 一句話介紹（也會顯示在封面） |
| `backgroundImg` | 封面圖 |
| `duration` | 大約要玩多久 |
| `developer` / `creator` / `designer` | 誰做的 |
| `recordUrl` | 選填。玩家的紀錄要送到哪裡 |

其餘欄位（`version`、`type`、`releaseDate`、`languagesSupported`、
`contactInformation`）目前只是登記用，不影響遊戲。

::: danger id 空著的話，玩家的進度不會被記住
它是存檔的名字。空的話玩家一重整就從頭開始，**而畫面上完全看不出原因**。
:::

## 封面就是 config

`rundown` 第一列的 `model` 填 `GameStart`，封面的標題、說明、背景圖就從這裡讀。
不需要為了封面在 mission 表開一個假關卡。

## recordUrl

填了之後，玩家的行為紀錄會自動送進你自己的 Google 試算表。
見[收集玩家的遊戲紀錄](/publish/collect)。
