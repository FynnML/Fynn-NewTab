export const en = {
  app: {
    name: "Fynn New Tab",
    githubLabel: "Fynn New Tab on GitHub",
  },

  db: {
    errorTitle: "Storage Unavailable",
    errorMessage:
      "Wallpapers and Notes could not be loaded because the local database failed to open. Other features still work normally. Try reloading the page.",
  },

  common: {
    cancel: "Cancel",
    save: "Save",
    reset: "Reset",
    delete: "Delete",
    edit: "Edit",
    pin: "Pin",
    unpin: "Unpin",
    ok: "OK",
    confirm: "Confirm",
    notice: "Notice",
    error: "Error",
    custom: "Custom",
    upload: "Upload",
    import: "Import",
  },

  search: {
    placeholder: "Search the Web",
    search: "Search",
    chooseEngine: "Choose search engine",
    searchWith: "Search with {engine}",
    removeRecentSearch: 'Remove "{query}"',

    engines: {
      brave: "Brave",
      google: "Google",
      duckduckgo: "DuckDuckGo",
      custom: "Custom",
    },
  },

  dashboard: {
    open: "Open dashboard",
    close: "Close dashboard",

    tabs: {
      wallpapers: "Wallpapers",
      widgets: "Widgets",
      settings: "Settings",
    },
  },

  wallpapers: {
    title: "Wallpapers",
    upload: "Upload Wallpaper",

    delete: "Delete",
    mode: "Wallpaper mode",

    modes: {
      default: "Default",
      primary: "Primary",
      day: "Day",
      night: "Night",
    },

    empty: {
      title: "No custom wallpapers yet.",
      description: "Upload an MP4 or image to replace the default.",
    },

    errors: {
      invalidFileType: "Please select a valid image or video.",
      fileTooLarge:
        "File size exceeds {maxSize}MB limit. Please choose a smaller file.",
      uploadFailed: "Failed to save wallpaper.",
    },

    dialogs: {
      invalidFileTypeTitle: "Invalid File Type",
      fileTooLargeTitle: "File Too Large",
      deleteConfirmation: "Are you sure you want to delete this wallpaper?",
    },
  },

  widgets: {
    title: "Widgets",

    clock: "Clock",
    date: "Date",
    greeting: "Greeting",
    notes: "Notes",
    search: "Search",
  },

  settings: {
    title: "Settings",

    search: {
      title: "Search",
      defaultEngine: "Default search engine",
      defaultEngineDescription: "Used when you open a new tab",

      customEngineUrl: "Custom engine URL",
      customEngineUrlDescription: "Use %s where the query should go",
      customEngineUrlPlaceholder: "https://example.com/search?q=%s",
    },

    clock: {
      title: "Clock",
      timeFormat: "Time format",
      timeFormatDescription: "Choose how the clock is displayed",

      twelveHour: "12-hour",
      twentyFourHour: "24-hour",
    },

    appearance: {
      title: "Appearance",

      searchFocusEffect: "Search focus effect",
      searchFocusEffectDescription:
        "Dim and blur wallpaper when searching",

      overlayStrength: "Overlay strength",
      overlayStrengthDescription:
        "Darkens the wallpaper so text stays readable",

      overlayStrengthValue: "{value}%",
    },

    data: {
      title: "Data",

      export: "Export data",
      exportDescription: "Save your notes and settings as a JSON file",
      exportButton: "Export",

      import: "Import data",
      importDescription: "Restore notes and settings from a backup file",
      importButton: "Import",
    },

    reset: {
      title: "Reset",
      button: "Reset settings",
      confirmation: "Reset Fynn NewTab settings?",
    },

    language: {
      title: "Language",
      description: "Choose your preferred language",

      en: "English",
      vi: "Tiếng Việt",
      zh: "中文",
    },
  },

  notes: {
    title: "Notes",

    add: "Add note",
    edit: "Edit",
    delete: "Delete",

    pin: "Pin",
    unpin: "Unpin",

    empty: "No notes yet.",

    titlePlaceholder: "Note title",
    contentPlaceholder: "Write something...",

    count: {
      one: "{count} note",
      other: "{count} notes",
    },

    todo: "To-do",

    dialogs: {
      deleteConfirmation: "Delete this note?",
    },

    errors: {
      saveFailed: "Failed to save note.",
    },
  },

  backup: {
    errors: {
      invalidFile: "This file is not a valid Fynn New Tab backup.",
      readFailed: "Couldn't read your data. Please try again in a moment.",
    },

    dialogs: {
      importTitle: "Import data",
      importConfirmation:
        "This will overwrite your current settings and add the notes from this file. Continue?",
      importSuccessTitle: "Import complete",
      importSuccess: "Your data has been restored. The page will now reload.",
    },
  },

  dialogs: {
    confirm: "Confirm",
    notice: "Notice",
    error: "Error",

    cancel: "Cancel",
    confirmAction: "Delete",
    ok: "OK",
  },

  accessibility: {
    search: "Search",
    chooseSearchEngine: "Choose search engine",

    openDashboard: "Open dashboard",
    closeDashboard: "Close dashboard",

    addNote: "Add note",

    wallpaperMode: "Wallpaper mode",
  },

  greeting: {
    night: [
      "Still up?",
      "Burning the midnight oil?",
      "It’s the middle of the night.",
      "Sweet dreams.",
      "Sleep well and wake up refreshed.",
    ],

    morning: [
      "Good morning",
      "Rise and shine.",
      "Ready for a new day?",
      "Hope today treats you well.",
      "What will you create today?",
    ],

    noon: [
      "Good afternoon",
      "Time for a lunch break?",
      "Hope you enjoy your lunch.",
      "Halfway through the day.",
      "Take a moment to recharge.",
    ],

    afternoon: [
      "Good afternoon",
      "How’s your day going?",
      "Hope you’re having a good one.",
      "Still going strong?",
      "A short break wouldn’t hurt.",
    ],

    evening: [
      "Good evening",
      "How was your day?",
      "Time to unwind.",
      "Hope you’re having a lovely evening.",
      "You made it through the day.",
    ],

    late: [
      "Getting late.",
      "Time to call it a day?",
      "Don’t stay up too long.",
      "Rest well tonight.",
      "Sweet dreams.",
    ],
  },
};