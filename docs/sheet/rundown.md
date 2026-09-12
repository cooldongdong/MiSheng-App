# rundown：遊戲的每一頁

一列就是玩家會看到的一頁。玩家往下滑，就是往下一列走。

**這是七張表裡唯一非有不可的**——其他表都是被 rundown 指到才會出現。

## 最重要的三欄

| 欄位 | 說明 |
|---|---|
| `model` | 這一頁長什麼樣（見[八種頁面](/sheet/models)） |
| `text` | 這一頁的文字 |
| `speaker` | 誰說的（要對得上 [character](/sheet/character) 表的 `name`） |

## 流程預設照著列的順序走

所以多數時候 `id`、`nextId` 都可以**留空**。只有要跳到別的地方時才填：

| id | nextId | model | text |
|---|---|---|---|
| | | Talk | 你醒了。 |
| | | Talk | 這裡是哪裡？ |
| | `ending` | Talk | 你決定直接離開。 |
| | | Talk | （這一列不會被走到） |
| `ending` | | Talk | 你回到了地面。 |

只有被 `nextId` 指到的 `ending` 需要名字，其餘都不用。

## 其他欄位

| 欄位 | 說明 |
|---|---|
| `title` | 這一頁的標題；Quiz 選項則是選項文字 |
| `missionId` | 這一頁屬於哪一關。**留空代表「沿用上一關」**——關卡中間的對白都是留空的 |
| `parentId` | 只有 Quiz 的選項會用（指回題目那一列） |
| `backgroundImg` | 這一頁的背景圖。**`Article` 不讀它**——文章裡的圖寫在 `text` 裡（見 [Article](/sheet/models#article-長文補充)） |
| `url` | `Img` 的圖片網址；Quiz 選項填了它就變成外部連結 |
| `textAnimation` | 對白要不要一個字一個字出現 |
| `customKey` | `CustomValueInput` 用它當名字 |

::: warning missionId 留空不是「沒有關卡」
它的意思是「跟上一頁同一關」。真正表示「不在任何一關」的是封面那一列，
而那由 `model` 是 `GameStart` 決定。
:::

## 變數：把玩家打的字叫回來

`CustomValueInput` 收到的字，之後在任何一頁的 `text` 裡寫 <code v-pre>{{那個 customKey}}</code>
就會被代進去。

| model | customKey | text |
|---|---|---|
| CustomValueInput | `名字` | 你要叫什麼名字？ |
| Talk | | 原來你叫 <span v-pre>{{名字}}</span> 啊。 |
