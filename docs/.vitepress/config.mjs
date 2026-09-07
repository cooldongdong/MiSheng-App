import { defineConfig } from 'vitepress';

// 謎生的文件站。
//
// **為什麼是 VitePress 而不是繼續自己寫。** 原本用一支 130 行的 vite plugin 把
// docs/*.md 轉成頁面，在兩三頁的時候那樣剛好。但文件一長，缺的就不是「能不能
// 渲染」，是**導覽**——讀文件的人不是從頭讀到尾，是卡在某一格才來翻，他要知道
// 自己在哪、旁邊還有什麼（Dong 2026-09-07：「現在這樣內容有點太多了，
// 我覺得不會有人一次看得完」）。側欄、上一頁下一頁、手機導覽都是那個需求的形狀。
//
// **不用拆 repo。** 這裡是同一個 repo 的一個子目錄，build 出來直接放進主站的
// /docs/ 底下（見 outDir）。代價是 `npm run dev` 要另外開一個 docs 的 server。
//
// **網址一律 ASCII。** 中文檔名會變成 /docs/%E4%B8%8A%E7%B7%9A/… 這種東西，
// 貼進聊天軟體沒有人看得出那是什麼。標題用中文寫在 frontmatter 與側欄。
export default defineConfig({
  title: '謎生文件',
  description: '把一份試算表變成手機就能玩的實境解謎',
  lang: 'zh-Hant',

  // 文件掛在主站的 /docs/ 底下，不是自己的網域
  base: '/docs/',
  // 產物寫進 public/docs，讓主站的 vite build 把它一起帶進 dist
  //（跟 player.zip 同一個模式：build 產物，不進 git）
  outDir: '../public/docs',

  cleanUrls: true,
  lastUpdated: false,
  // 死連結要在 build 時就吵，不要等到有人點下去才發現
  // ——這份文件才剛因為 GitHub 停權踩過一次
  ignoreDeadLinks: false,

  head: [
    ['meta', { name: 'theme-color', content: '#fff', media: '(prefers-color-scheme: light)' }],
    ['meta', { name: 'theme-color', content: '#0e0f11', media: '(prefers-color-scheme: dark)' }],
  ],

  themeConfig: {
    nav: [
      { text: '回謎生', link: 'https://misheng.app/' },
      { text: '即時轉化', link: 'https://misheng.app/create' },
      { text: '玩玩看 demo', link: 'https://misheng.app/demo' },
    ],

    // 側欄就是這份文件的骨架：**每一頁短到可以一次讀完，靠側欄知道自己在哪。**
    sidebar: [
      {
        text: '開始',
        items: [
          { text: '七張表在做什麼', link: '/start/tables' },
          { text: '五分鐘做出第一款遊戲', link: '/start/quickstart' },
        ],
      },
      {
        text: '填試算表',
        items: [
          { text: 'rundown：遊戲的每一頁', link: '/sheet/rundown' },
          { text: '七種頁面（model）', link: '/sheet/models' },
          { text: 'mission：關卡與答案', link: '/sheet/mission' },
          { text: 'character：角色', link: '/sheet/character' },
          { text: 'hint：提示', link: '/sheet/hint' },
          { text: 'prop：道具', link: '/sheet/prop' },
          { text: 'story：劇情圖', link: '/sheet/story' },
          { text: 'config：遊戲設定', link: '/sheet/config' },
          { text: '圖片怎麼填', link: '/sheet/images' },
        ],
      },
      {
        text: '上線',
        items: [
          { text: '自己部署遊戲', link: '/publish/deploy' },
          { text: '收集玩家的遊戲紀錄', link: '/publish/collect' },
        ],
      },
      { text: '卡住了', link: '/troubleshooting' },
    ],

    // 中文斷詞很陽春（搜「提示」找得到，搜長句常常落空），但有總比沒有好
    search: { provider: 'local' },

    outline: { level: [2, 3], label: '這一頁' },
    docFooter: { prev: '上一頁', next: '下一頁' },
    darkModeSwitchLabel: '外觀',
    returnToTopLabel: '回到頂端',
    sidebarMenuLabel: '目錄',
    // 原始碼連結先不放：GitHub 帳號 2026-09 起停權，那條連結是死的
  },
});
