# 七張表在做什麼

一份遊戲是七張表。你不需要一次搞懂它們——**先把 rundown 填出來，遊戲就會動**，
其他六張都是在替 rundown 補東西。

| 表 | 它管什麼 | 沒填會怎樣 |
|---|---|---|
| [**rundown**](/sheet/rundown) | 遊戲從頭到尾的每一頁 | 沒有遊戲 |
| [**mission**](/sheet/mission) | 有哪些關卡、答案是什麼 | 沒有關卡可解 |
| [**character**](/sheet/character) | 誰在說話、長什麼樣 | 對白沒有頭像與立繪 |
| [**config**](/sheet/config) | 這款遊戲叫什麼、封面 | 無法生成 |
| [**hint**](/sheet/hint) | 每一關的提示 | 玩家卡住只能問你 |
| [**prop**](/sheet/prop) | 道具（圖片、轉盤、相機） | 沒有道具頁 |
| [**story**](/sheet/story) | 劇情圖 | 沒有故事頁 |

**rundown 是主角**，其他表都是被它指到才會出現。

## 表與表之間怎麼連起來

這是整份資料唯一需要記住的規則：

> **一列需不需要名字，看有沒有別的欄位指向它；名字放在哪一欄，看那個指標指的是什麼。**

```
rundown.nextId    ─┐
rundown.parentId  ─┴→ rundown.id       （流程要跳到哪一列）

rundown.missionId ─┐
hint.missionId    ─┤
prop.missionId    ─┼→ mission.id       （這一列屬於哪一關）
story.missionId   ─┘

rundown.speaker   ─┐
hint.speaker      ─┴→ character.name   （誰在說話）
```

從這張圖可以直接推出「哪一欄非填不可」：

- **`mission.id` 必填**——四張表都靠它找到關卡
- **character 靠 `name` 不靠 `id`**——所以 `name` 不能空、不能重複
- **`rundown.id` 只有「被 `nextId`／`parentId` 指到」的那幾列才要填**，其餘留空
- **hint／prop／story 的 `id` 完全不用填**——沒有任何人指向它們

## id 可以是任何文字

`第三章`、`土地公廟`、`ending-A` 都可以，而且比 `47` 好記得多。
唯一的要求是**同一張表裡不重複**。
