export const vi = {
  app: {
    name: "Fynn New Tab",
    githubLabel: "Fynn New Tab trên GitHub",
    initErrorTitle: "Có lỗi xảy ra",
    initErrorMessage:
      "Một số tính năng không khởi động được. Hãy thử tải lại trang.",
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
    recentTitle: "Tìm kiếm gần đây",
    hints: {
      navigate: "di chuyển",
      select: "tìm kiếm",
      close: "đóng",
    },

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
      theme: "Giao diện",
      settings: "Cài đặt",
    },
  },

  theme: {
    title: "Giao diện",
    mode: {
      title: "Giao diện bảng điều khiển",
      description:
        "Áp dụng cho bảng điều khiển và hộp thoại. Màn hình chính vẫn giữ phong cách điện ảnh với hình nền.",
      dark: "Tối",
      light: "Sáng",
      auto: "Tự động (theo hệ thống)",
    },
    accent: {
      title: "Màu nhấn",
      presets: "Màu có sẵn",
      hue: "Sắc độ",
      saturation: "Độ bão hòa",
      lightness: "Độ sáng",
      names: [
      "Xanh dương",
      "Tím",
      "Hồng",
      "Đỏ",
      "Cam",
      "Xanh lá",
      "Xanh ngọc",
      ],
    },
    header: {
      title: "Phần đầu trang",
      clockSize: "Cỡ đồng hồ",
    },
    wallpaper: {
      title: "Hiển thị hình nền",
      blur: "Làm mờ",
      brightness: "Độ sáng",
      grayscale: "Thang xám",
      overlay: "Mức tối lớp phủ",
    },
    reset: "Đặt lại giao diện",
  },

  wallpapers: {
    title: "Hình nền",
    upload: "Tải lên hình nền",
    active: "Đang dùng",

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
      invalidFile:
        "Tệp này có vẻ bị hỏng hoặc không thể giải mã. Vui lòng chọn hình ảnh hoặc video khác.",
      fileTooLarge:
        "Tệp vượt quá giới hạn {maxSize}MB. Vui lòng chọn tệp nhỏ hơn.",
      uploadFailed: "Không thể lưu hình nền.",
      loadFailed:
        "Không thể tải hình nền hiện tại, nên một hình nền khác đang được hiển thị.",
    },

    dialogs: {
      invalidFileTypeTitle: "Định dạng tệp không hợp lệ",
      invalidFileTitle: "Tệp hình nền không hợp lệ",
      fileTooLargeTitle: "Tệp quá lớn",
      deleteConfirmation: "Bạn có chắc chắn muốn xóa hình nền này không?",
      loadFailedTitle: "Không tải được hình nền",
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

      searchFocusEffect: "Hiệu ứng khi tìm kiếm",
      searchFocusEffectDescription: "Làm tối và mờ hình nền khi nhập từ khóa",
    },

    clock: {
      title: "Đồng hồ",
      timeFormat: "Định dạng thời gian",
      timeFormatDescription: "Chọn cách hiển thị đồng hồ",

      twelveHour: "12 giờ",
      twentyFourHour: "24 giờ",
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
      "Vẫn còn thức à?",
      "Cày đêm hả bạn?",
      "Đã nửa đêm rồi đó.",
      "Ngủ ngon nha, mơ đẹp!",
      "Ngủ ngon rồi mai thức dậy tràn đầy năng lượng nha.",
      "Thức muộn thế? Đừng quá sức đó bạn.",
      "Sao bầu trời có sao, mà bạn cũng còn thức thế này?",
      "Phát hiện bạn là cú đêm chính hiệu!",
      "Mọi thứ yên tĩnh lắm, tận hưởng khoảnh khắc bình yên này đi.",
      "Ngày mai tính cũng được, nghỉ ngơi thôi nào.",
      "Còn nghĩ gì nữa trước khi đi ngủ vậy?",
      "Mặt trăng đang bên cạnh bạn đó.",
      "Đừng quên nhắm mắt sớm nha.",
      "Thức khuya hay ra ý tưởng hay ghê!",
      "Nghỉ ngơi là chuyện cần làm chứ không phải xa xỉ đâu.",
    ],

    morning: [
      "Chào buổi sáng!",
      "Thức dậy đi nào bạn ơi.",
      "Sẵn sàng cho ngày mới chưa?",
      "Chúc hôm nay mọi thứ đều ổn nha.",
      "Hôm nay bạn sẽ tạo ra điều gì hay ho nào?",
      "Mặt trời lên rồi, tỏa sáng thôi nào!",
      "Bắt đầu ngày mới suôn sẻ đúng giờ luôn!",
      "Uống cà phê trước, rồi chinh phục thế giới sau.",
      "Ngày mới, nhiều cơ hội mới lắm đây!",
      "Thức dậy rồi đuổi theo ánh sáng thôi nào.",
      "Hôm nay còn bao điều hay đang chờ bạn đó.",
      "Vươn vai, thở sâu, bắt đầu thôi!",
      "Buổi sáng là lúc ra ý tưởng hay nhất đó.",
      "Nắm bắt ngày trước khi nó trôi qua lẹ lắm đó.",
      "Chúc bạn một buổi sáng bình yên mà năng suất cao nha!",
    ],

    noon: [
      "Chào buổi chiều!",
      "Đến giờ nghỉ trưa chưa bạn ơi?",
      "Chúc bạn ăn ngon miệng nha!",
      "Đi được nửa chặng đường ngày rồi đó.",
      "Dừng chốc lát nạp năng lượng đi.",
      "Nắng trưa đẹp, tâm trạng cũng vui theo.",
      "Nghỉ chút xíu là có sức liền đó.",
      "Đừng quên uống nước nha!",
      "Ngày còn dài đó, nhưng không nhiều thời gian lắm đâu.",
      "Tập trung ghê nhỉ? Cứ giữ đà này tiếp nha!",
      "Ăn trưa vui vẻ thì mới ngon miệng đúng không.",
      "Rời màn hình một chút đi bạn.",
      "Động lực quan trọng lắm, bạn đang làm rất tốt đó!",
      "Buồn ngủ giữa trưa không có cửa thắng bạn đâu.",
      "Nửa ngày qua rồi, nửa còn lại còn hay hơn nữa!",
    ],

    afternoon: [
      "Chào buổi chiều!",
      "Ngày hôm nay của bạn thế nào rồi?",
      "Chúc bạn có một ngày thật vui nha.",
      "Vẫn khỏe mạnh chiến đấu hả?",
      "Nghỉ ngơi chút cũng không sao đâu.",
      "Sắp đến giờ vàng rồi đó bạn!",
      "Đến được đây rồi - quá đỉnh!",
      "Cố chút nữa thôi rồi được nghỉ liền!",
      "Chiều là lúc làm cho ngày trọn vẹn đó.",
      "Đừng để cơn buồn ngủ làm chậm bước bạn nha.",
      "Chúc bạn buổi chiều ấm áp và thật vui!",
      "Sắp xong rồi đó, giữ tốc độ nha!",
      "Vươn vai một chút thấy khỏe ngay đó.",
      "Năng lượng mới sắp đến rồi nha",
      "Phần thưởng cho buổi tối đang chờ bạn đó.",
    ],

    evening: [
      "Chào buổi tối!",
      "Ngày hôm nay của bạn ra sao rồi?",
      "Đến lúc thư giãn thôi nào.",
      "Chúc bạn có một buổi tối thật tuyệt nha.",
      "Bạn đã hoàn thành trọn vẹn một ngày rồi đó!",
      "Buổi tối là thời gian dành cho chính bạn đó.",
      "Xong việc rồi, nghỉ ngơi thôi nào.",
      "Hoàng hôn nói bạn đã làm rất tốt.",
      "Chậm lại, tận hưởng khoảnh khắc bình yên này.",
      "Đến giờ ăn tối rồi? Thưởng thức bữa ăn nha!",
      "Ngày sống ý nghĩa lắm, xứng đáng được khen đó.",
      "Chúc đêm mang lại bình yên cho bạn.",
      "Phần tuyệt vời nhất của ngày mới bắt đầu thôi!",
      "Pha đồ uống ấm rồi thư giãn thôi nào.",
      "Ánh sáng buổi tối, bình yên trong đêm.",
    ],

    late: [
      "Muộn rồi đó bạn.",
      "Đến lúc kết thúc ngày chưa?",
      "Đừng thức quá khuya nha.",
      "Ngủ ngon tối nay nha.",
      "Ngủ ngon, mơ đẹp!",
      "Thời gian trôi nhẹ nhàng thôi đó.",
      "Kiểm tra lần cuối rồi tắt đèn ngủ thôi.",
      "Ngủ ngon tối nay thì ngày mai mới tỉnh táo đó.",
      "Ngay cả sao cũng sắp ngủ rồi đó.",
      "Giường ấm đang chờ bạn đó.",
      "Chuẩn bị nghỉ ngơi à? Lựa chọn quá đúng!",
      "Giữ sức cho ngày mai nữa đó.",
      "Chính thức kết thúc ngày rồi, bạn xứng đáng được nghỉ ngơi.",
      "Ngủ ngon, mơ thật đẹp nha.",
      "Đêm vẫn thuộc về bạn, nhưng không còn lâu lắm đâu.",
    ],
  },
};