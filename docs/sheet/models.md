# 七種頁面（model）

`rundown` 的 `model` 欄決定這一頁長什麼樣。

| `model` | 是什麼 | 一定要有 |
|---|---|---|
| `Talk` | 對白。最常用的一種 | `text` |
| `Img` | 一張圖 | `url` |
| `Quiz` | 選擇題 | 見下面 |
| `MissionAnswerInput` | 讓玩家打答案 | `missionId` |
| `CustomValueInput` | 讓玩家打一段字（例如取名字） | `customKey` |
| `MissionStart` | 一關的開場（關卡名、背景圖、導航） | `missionId` |
| `GameStart` | 遊戲封面 | `missionId` **要留空** |

## GameStart：封面

通常就是整份 rundown 的**第一列**。

它的內容取自 [config](/sheet/config)（`title`／`description`／`backgroundImg`），
不需要也不可以填 `missionId`——**封面不是一關**。

::: tip 舊的做法還能用
以前的做法是「開一個 id = 0 的假關卡當封面，再從關卡清單藏起來」。
既有的試算表照舊能跑，不用改。
:::

## MissionStart：一關的開場

顯示關卡名、說明、背景圖，還有一顆「開始遊戲」。

`missionId` 一定要指到一個真的關卡——指不到會整頁全黑。

::: tip 提示的倒數從這裡開始算
玩家**離開這一頁往前走**的那一刻才開始計時（見 [hint 的 timer](/sheet/hint)），
不是進到這一頁就開始。停在這裡讀說明、看導航不會被算進去。
:::

## Quiz：選擇題

題目一列，每個選項各一列：

| id | nextId | model | parentId | title | text |
|---|---|---|---|---|---|
| `q1` | | Quiz | | | 你要走左邊還是右邊？ |
| | `left` | | `q1` | 走左邊 | |
| | `right` | | `q1` | 走右邊 | |

- 選項用 **`parentId` 指回題目**
- 選項上的 **`nextId` 決定選了會去哪**
- 選項的文字寫在 **`title`**
- **選項自己不需要 id**

## MissionAnswerInput：作答

玩家打的字要跟那一關的 `answer` 一模一樣才算對。

`missionId` 要指到那一關——而且那一關的 `answer` 不能是空的，
否則玩家不用輸入就能通關。

## CustomValueInput：讓玩家打一段字

用 `customKey` 給它一個名字，之後在任何一頁寫 <code v-pre>{{那個名字}}</code> 就會代入。
見 [rundown 的變數](/sheet/rundown#變數-把玩家打的字叫回來)。
