export const vi = {
  app: {
    name: "Fynn New Tab",
    githubLabel: "Fynn New Tab trên GitHub",
  },

  db: {
    errorTitle: "Bộ nhớ không khả dụng",
    errorMessage:
      "Không thể tải Hình nền và Ghi chú vì cơ sở dữ liệu cục bộ không mở được. Các tính năng khác vẫn hoạt động bình thường. Hãy thử tải lại trang.",
  },

  common: {
    cancel: "Hủy",
    save: "Lưu",
    reset: "Đặt lại",
    delete: "Xóa",
    edit: "Chỉnh sửa",
    pin: "Ghim",
    unpin: "Bỏ ghim",
    ok: "OK",
    confirm: "Xác nhận",
    notice: "Thông báo",
    error: "Lỗi",
    custom: "Tùy chỉnh",
    upload: "Tải lên",
    import: "Nhập",
  },

  search: {
    placeholder: "Tìm kiếm trên Web",
    search: "Tìm kiếm",
    chooseEngine: "Chọn công cụ tìm kiếm",
    searchWith: "Tìm kiếm bằng {engine}",
    removeRecentSearch: 'Xóa "{query}"',

    engines: {
      brave: "Brave",
      google: "Google",
      duckduckgo: "DuckDuckGo",
      custom: "Tùy chỉnh",
    },
  },

  dashboard: {
    open: "Mở bảng điều khiển",
    close: "Đóng bảng điều khiển",

    tabs: {
      wallpapers: "Hình nền",
      widgets: "Tiện ích",
      settings: "Cài đặt",
    },
  },

  wallpapers: {
    title: "Hình nền",
    upload: "Tải lên hình nền",

    delete: "Xóa",
    mode: "Chế độ hình nền",

    modes: {
      default: "Mặc định",
      primary: "Chính",
      day: "Ban ngày",
      night: "Ban đêm",
    },

    empty: {
      title: "Chưa có hình nền tùy chỉnh.",
      description:
        "Tải lên tệp MP4 hoặc hình ảnh để thay thế hình nền mặc định.",
    },

    errors: {
      invalidFileType: "Vui lòng chọn một hình ảnh hoặc video hợp lệ.",
      fileTooLarge:
        "Tệp vượt quá giới hạn {maxSize}MB. Vui lòng chọn tệp nhỏ hơn.",
      uploadFailed: "Không thể lưu hình nền.",
    },

    dialogs: {
      invalidFileTypeTitle: "Định dạng tệp không hợp lệ",
      fileTooLargeTitle: "Tệp quá lớn",
      deleteConfirmation: "Bạn có chắc chắn muốn xóa hình nền này không?",
    },
  },

  widgets: {
    title: "Tiện ích",

    clock: "Đồng hồ",
    date: "Ngày",
    greeting: "Lời chào",
    notes: "Ghi chú",
    search: "Tìm kiếm",
  },

  settings: {
    title: "Cài đặt",

    search: {
      title: "Tìm kiếm",
      defaultEngine: "Công cụ tìm kiếm mặc định",
      defaultEngineDescription: "Sử dụng khi bạn mở thẻ mới",

      customEngineUrl: "URL tìm kiếm tùy chỉnh",
      customEngineUrlDescription:
        "Dùng %s tại vị trí cần chèn từ khóa tìm kiếm",
      customEngineUrlPlaceholder: "https://example.com/search?q=%s",
    },

    clock: {
      title: "Đồng hồ",
      timeFormat: "Định dạng thời gian",
      timeFormatDescription: "Chọn cách hiển thị đồng hồ",

      twelveHour: "12 giờ",
      twentyFourHour: "24 giờ",
    },

    appearance: {
      title: "Giao diện",

      searchFocusEffect: "Hiệu ứng khi tìm kiếm",
      searchFocusEffectDescription: "Làm tối và mờ hình nền khi nhập từ khóa",

      overlayStrength: "Mức độ tối của lớp phủ",
      overlayStrengthDescription: "Làm tối hình nền để văn bản dễ đọc hơn",

      overlayStrengthValue: "{value}%",
    },

    data: {
      title: "Dữ liệu",

      export: "Xuất dữ liệu",
      exportDescription: "Lưu ghi chú và cài đặt của bạn thành một file JSON",
      exportButton: "Xuất",

      import: "Nhập dữ liệu",
      importDescription: "Khôi phục ghi chú và cài đặt từ một file sao lưu",
      importButton: "Nhập",
    },

    reset: {
      title: "Đặt lại",
      button: "Đặt lại cài đặt",
      confirmation:
        "Bạn có chắc muốn đặt lại tất cả cài đặt của Fynn NewTab không?",
    },

    language: {
      title: "Ngôn ngữ",
      description: "Chọn ngôn ngữ hiển thị",

      en: "English",
      vi: "Tiếng Việt",
      zh: "中文",
    },
  },

  notes: {
    title: "Ghi chú",

    add: "Thêm ghi chú",
    edit: "Sửa",
    delete: "Xóa",

    pin: "Ghim",
    unpin: "Bỏ ghim",

    empty: "Chưa có ghi chú nào.",

    titlePlaceholder: "Tiêu đề ghi chú",
    contentPlaceholder: "Viết gì đó...",

    count: {
      one: "{count} ghi chú",
      other: "{count} ghi chú",
    },

    todo: "Cần làm",

    dialogs: {
      deleteConfirmation: "Xóa ghi chú này?",
    },

    errors: {
      saveFailed: "Không thể lưu ghi chú.",
    },
  },

  backup: {
    errors: {
      invalidFile: "File này không phải bản sao lưu hợp lệ của Fynn New Tab.",
      readFailed: "Không thể đọc dữ liệu. Vui lòng thử lại sau ít phút.",
    },

    dialogs: {
      importTitle: "Nhập dữ liệu",
      importConfirmation:
        "Thao tác này sẽ ghi đè cài đặt hiện tại và thêm các ghi chú từ file này. Tiếp tục?",
      importSuccessTitle: "Nhập dữ liệu thành công",
      importSuccess: "Dữ liệu của bạn đã được khôi phục. Trang sẽ tải lại.",
    },
  },

  dialogs: {
    confirm: "Xác nhận",
    notice: "Thông báo",
    error: "Lỗi",

    cancel: "Hủy",
    confirmAction: "Xóa",
    ok: "OK",
  },

  accessibility: {
    search: "Tìm kiếm",
    chooseSearchEngine: "Chọn công cụ tìm kiếm",

    openDashboard: "Mở bảng điều khiển",
    closeDashboard: "Đóng bảng điều khiển",

    addNote: "Thêm ghi chú",

    wallpaperMode: "Chế độ hình nền",
  },

  greeting: {
    night: [
      "Chưa ngủ à?",
      "Khuya rồi mà vẫn còn bận sao?",
      "Nửa đêm rồi đấy.",
      "Ngủ ngon nhé.",
      "Ngủ một giấc thật ngon và thức dậy thật sảng khoái nhé.",
    ],

    morning: [
      "Chào buổi sáng.",
      "Sẵn sàng cho một ngày mới chưa?",
      "Chúc bạn một ngày thật suôn sẻ.",
      "Hôm nay chắc sẽ có nhiều điều thú vị đấy.",
      "Hôm nay bạn định làm gì?",
    ],

    noon: [
      "Đến giờ nghỉ trưa rồi.",
      "Trưa nay ăn gì ngon không?",
      "Một nửa ngày đã trôi qua rồi. Nghỉ ngơi một chút nhé.",
      "Đừng quên nạp năng lượng nhé.",
      "Nghỉ một lát cho lại sức nào.",
    ],

    afternoon: [
      "Buổi chiều của bạn thế nào rồi?",
      "Hôm nay vẫn ổn chứ?",
      "Vẫn còn bận nhiều việc à?",
      "Mệt rồi thì nghỉ một chút cũng được.",
      "Cố thêm một chút nữa thôi, sắp hết ngày rồi.",
    ],

    evening: [
      "Hôm nay của bạn thế nào?",
      "Đến lúc thư giãn rồi.",
      "Thả lỏng một chút nhé.",
      "Một ngày nữa đã trôi qua rồi.",
      "Tối nay nghỉ ngơi thật thoải mái nhé.",
    ],

    late: [
      "Khuya lắm rồi đấy.",
      "Đến lúc đi ngủ rồi.",
      "Đừng thức quá khuya nhé.",
      "Ngủ ngon nhé.",
      "Chúc bạn một giấc ngủ thật ngon.",
    ],
  },
};
