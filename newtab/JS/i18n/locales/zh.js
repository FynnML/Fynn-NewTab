export const zh = {
  app: {
    name: "Fynn New Tab",
    githubLabel: "在 GitHub 上查看 Fynn New Tab",
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
      settings: "设置",
    },
  },

  wallpapers: {
    title: "壁纸",
    upload: "上传壁纸",

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
      fileTooLarge:
        "文件大小超过 {maxSize}MB 限制，请选择较小的文件。",
      uploadFailed: "无法保存壁纸。",
    },

    dialogs: {
      invalidFileTypeTitle: "文件类型无效",
      fileTooLargeTitle: "文件过大",
      deleteConfirmation: "确定要删除这张壁纸吗？",
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
    ],

    morning: [
      "早上好。",
      "新的一天开始了。",
      "准备好迎接新的一天了吗？",
      "希望今天一切顺利。",
      "今天打算做些什么呢？",
    ],

    noon: [
      "中午好。",
      "该吃午饭了吗？",
      "午饭吃得怎么样？",
      "一上午已经过去了。",
      "休息一会儿，给自己充充电吧。",
    ],

    afternoon: [
      "下午好。",
      "今天过得怎么样？",
      "今天还顺利吗？",
      "还在努力吗？",
      "累了就休息一会儿吧。",
    ],

    evening: [
      "晚上好。",
      "今天过得还好吗？",
      "该放松一下了。",
      "今晚好好放松一下吧。",
      "今天也辛苦啦。",
    ],

    late: [
      "时间不早了。",
      "差不多该休息了？",
      "别熬太晚。",
      "今晚好好休息。",
      "晚安，好梦。",
    ],
  },
};