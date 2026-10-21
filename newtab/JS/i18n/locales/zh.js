export const zh = {
  app: {
    name: "Fynn New Tab",
    githubLabel: "在 GitHub 上查看 Fynn New Tab",
    initErrorTitle: "出现问题",
    initErrorMessage: "部分功能无法启动，请尝试重新加载新标签页。",
  },

  db: {
    errorTitle: "存储不可用",
    errorMessage:
      "由于本地数据库无法打开，壁纸和便签无法加载。其他功能仍可正常使用。请尝试重新加载页面。",
  },

  common: {
    cancel: "取消",
    save: "保存",
    reset: "重置",
    delete: "删除",
    edit: "编辑",
    pin: "置顶",
    unpin: "取消置顶",
    ok: "确定",
    confirm: "确认",
    notice: "提示",
    error: "错误",
    custom: "自定义",
    upload: "上传",
    import: "导入",
  },

  search: {
    placeholder: "搜索网页",
    search: "搜索",
    chooseEngine: "选择搜索引擎",
    searchWith: "使用 {engine} 搜索",
    removeRecentSearch: '移除“{query}”',
    recentTitle: "最近搜索",
    hints: {
      navigate: "选择",
      select: "搜索",
      close: "关闭",
    },

    engines: {
      brave: "Brave",
      google: "Google",
      duckduckgo: "DuckDuckGo",
      custom: "自定义",
    },
  },

  dashboard: {
    open: "打开仪表盘",
    close: "关闭仪表盘",

    tabs: {
      wallpapers: "壁纸",
      widgets: "小组件",
      theme: "主题",
      settings: "设置",
    },
  },

  theme: {
    title: "主题",
    mode: {
      title: "模式",
      dark: "深色",
      light: "浅色",
      auto: "自动（跟随系统）",
    },
    accent: {
      title: "强调色",
      presets: "预设颜色",
      hue: "色相",
      saturation: "饱和度",
      lightness: "亮度",
      names: [
      "蓝色",
      "紫色",
      "粉色",
      "红色",
      "橙色",
      "绿色",
      "青色",
      ],
    },
    header: {
      title: "页面顶部",
      clockSize: "时钟大小",
    },
    wallpaper: {
      title: "壁纸效果",
      blur: "模糊",
      brightness: "亮度",
      grayscale: "灰度",
    },
    reset: "重置主题",
  },

  wallpapers: {
    title: "壁纸",
    upload: "上传壁纸",
    active: "当前使用",

    delete: "删除",
    mode: "壁纸模式",

    modes: {
      default: "默认",
      primary: "主要",
      day: "日间",
      night: "夜间",
    },

    empty: {
      title: "暂无自定义壁纸。",
      description: "上传 MP4 或图片，以替换默认壁纸。",
    },

    errors: {
      invalidFileType: "请选择有效的图片或视频文件。",
      invalidFile: "此文件似乎已损坏或无法解码，请选择其他图片或视频。",
      fileTooLarge:
        "文件大小超过 {maxSize}MB 限制，请选择较小的文件。",
      uploadFailed: "无法保存壁纸。",
      loadFailed: "当前壁纸无法加载，已改用其他壁纸。",
    },

    dialogs: {
      invalidFileTypeTitle: "文件类型无效",
      invalidFileTitle: "壁纸文件无效",
      fileTooLargeTitle: "文件过大",
      deleteConfirmation: "确定要删除这张壁纸吗？",
      loadFailedTitle: "壁纸加载失败",
    },
  },

  widgets: {
    title: "小组件",

    clock: "时钟",
    date: "日期",
    greeting: "问候语",
    notes: "便签",
    search: "搜索",
  },

  settings: {
    title: "设置",

    search: {
      title: "搜索",
      defaultEngine: "默认搜索引擎",
      defaultEngineDescription: "打开新标签页时使用",

      customEngineUrl: "自定义搜索引擎网址",
      customEngineUrlDescription: "在搜索词所在位置使用 %s",
      customEngineUrlPlaceholder: "https://example.com/search?q=%s",
    },

    clock: {
      title: "时钟",
      timeFormat: "时间格式",
      timeFormatDescription: "选择时钟的显示方式",

      twelveHour: "12 小时制",
      twentyFourHour: "24 小时制",
    },

    appearance: {
      title: "外观",

      searchFocusEffect: "搜索时的聚焦效果",
      searchFocusEffectDescription: "搜索时调暗并模糊壁纸",

      overlayStrength: "遮罩强度",
      overlayStrengthDescription: "调暗壁纸，让文字更易阅读",

      overlayStrengthValue: "{value}%",
    },

    data: {
      title: "数据",

      export: "导出数据",
      exportDescription: "将便签和设置保存为 JSON 文件",
      exportButton: "导出",

      import: "导入数据",
      importDescription: "从备份文件恢复便签和设置",
      importButton: "导入",
    },

    reset: {
      title: "重置",
      button: "重置设置",
      confirmation: "确定要重置 Fynn New Tab 的所有设置吗？",
    },

    language: {
      title: "语言",
      description: "选择你偏好的语言",

      en: "English",
      vi: "Tiếng Việt",
      zh: "中文",
    },
  },

  notes: {
    title: "便签",

    add: "添加便签",
    edit: "编辑",
    delete: "删除",

    pin: "置顶",
    unpin: "取消置顶",

    empty: "暂无便签。",

    titlePlaceholder: "便签标题",
    contentPlaceholder: "写点什么...",

    count: {
      one: "{count} 条便签",
      other: "{count} 条便签",
    },

    todo: "待办事项",

    dialogs: {
      deleteConfirmation: "确定要删除这条便签吗？",
    },

    errors: {
      saveFailed: "无法保存便签。",
    },
  },

  backup: {
    errors: {
      invalidFile: "此文件不是有效的 Fynn New Tab 备份。",
      readFailed: "无法读取数据，请稍后重试。",
    },

    dialogs: {
      importTitle: "导入数据",
      importConfirmation: "此操作将覆盖当前设置，并添加此文件中的便签。是否继续？",
      importSuccessTitle: "导入完成",
      importSuccess: "数据已恢复，页面即将重新加载。",
    },
  },

  dialogs: {
    confirm: "确认",
    notice: "提示",
    error: "错误",

    cancel: "取消",
    confirmAction: "删除",
    ok: "确定",
  },

  accessibility: {
    search: "搜索",
    chooseSearchEngine: "选择搜索引擎",

    openDashboard: "打开仪表盘",
    closeDashboard: "关闭仪表盘",

    addNote: "添加便签",

    wallpaperMode: "壁纸模式",
  },

  greeting: {
    night: [
      "还没睡吗？",
      "又熬夜了吗？",
      "已经深夜了。",
      "晚安，好梦。",
      "好好睡一觉，醒来会更有精神。",
      "这么晚还没睡？别太累了。",
      "星星出来了，你也还醒着。",
      "检测到夜猫子模式。",
      "世界很安静，享受这份宁静吧。",
      "明天可以等，现在休息吧。",
      "睡前还有最后一个想法？",
      "月亮在陪着你呢。",
      "别忘了早点闭眼。",
      "深夜时分，灵感最亮。",
      "休息是必需的，不是奢侈。",
    ],

    morning: [
      "早上好。",
      "新的一天开始了。",
      "准备好迎接新的一天了吗？",
      "希望今天一切顺利。",
      "今天打算做些什么呢？",
      "太阳升起来了，该发光了。",
      "新的开始，准时到来。",
      "先来杯咖啡，然后去征服世界。",
      "新的一天，新的可能。",
      "醒来吧，去追逐光芒。",
      "今天有许多事等着你去完成。",
      "伸展，呼吸，开始。",
      "早晨属于新的想法。",
      "抓住这一天，别让它溜走。",
      "祝你有个平静而高效的早晨。",
    ],

    noon: [
      "中午好。",
      "该吃午饭了吗？",
      "午饭吃得怎么样？",
      "一上午已经过去了。",
      "休息一会儿，给自己充充电吧。",
      "午后的阳光，好心情。",
      "小憩一下，事半功倍。",
      "别忘了喝水。",
      "一天还长，但也没那么长了。",
      "状态不错？继续保持。",
      "心情好，午饭更香。",
      "离开屏幕休息一会儿吧。",
      "势头就是一切,你正在建立它。",
      "午间疲惫挡不住你。",
      "半天已过，还剩一半精彩。",
    ],

    afternoon: [
      "下午好。",
      "今天过得怎么样？",
      "今天还顺利吗？",
      "还在努力吗？",
      "累了就休息一会儿吧。",
      "黄金时刻不远了。",
      "你已经走到这里了，真棒。",
      "再坚持一下，就自由了。",
      "下午是用来强势收尾的。",
      "别让疲惫拖慢你的脚步。",
      "祝你有温暖的午后时光。",
      "快到了，保持节奏。",
      "快速伸展一下会很有效。",
      "第二波精力来了。",
      "夜晚的奖励在等着你。",
    ],

    evening: [
      "晚上好。",
      "今天过得还好吗？",
      "该放松一下了。",
      "今晚好好放松一下吧。",
      "今天也辛苦啦。",
      "夜晚是属于你自己的。",
      "结束一天，开始休息。",
      "夕阳说你做得很好。",
      "慢下来，品味这份宁静。",
      "晚饭时间到了？好好犒劳自己。",
      "充实的一天,这份功劳是你的。",
      "让夜晚带给你安宁。",
      "一天中最美好的部分现在开始。",
      "倒一杯热饮，放松一下吧。",
      "夜晚的光，平静的心。",
    ],

    late: [
      "时间不早了。",
      "差不多该休息了？",
      "别熬太晚。",
      "今晚好好休息。",
      "晚安，好梦。",
      "时间在轻轻流逝。",
      "最后检查一次，然后关灯吧。",
      "明天始于今晚的睡眠。",
      "连星星都开始隐去了。",
      "温暖的床在呼唤你。",
      "准备休息了？不错的选择。",
      "为明天留点精力。",
      "今天正式结束了,你值得这份休息。",
      "睡个好觉，做个好梦。",
      "夜晚是你的,但也快结束了。",
    ],
  },
};