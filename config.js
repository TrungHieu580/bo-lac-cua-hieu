// =====================================================================
//  Bộ Lạc Của Hiếu — CẤU HÌNH CÂN BẰNG GAME
//  Mọi chi phí, thời gian làm việc và sản lượng nằm ở đây để dễ chỉnh.
//  Đơn vị thời gian: "giờ trong game". 1 giờ game = SECONDS_PER_HOUR giây thật (tốc độ x1).
// =====================================================================
window.CFG = {
  TILE: 24,               // kích thước ô (px) — phóng theo bội số nguyên
  MAP_W: 48,
  MAP_H: 36,
  SECONDS_PER_HOUR: 7.5,  // 1 giờ game = 7.5 giây thật ở tốc độ x1 (~2 phút / ngày)
  SPEEDS: [1, 2, 4],

  DAY_START: 6,           // 6:00 bắt đầu làm việc
  EVENING: 18,            // 18:00 mọi người về bên bếp lửa
  MEAL: 19,               // 19:00 ăn tối (mỗi người 1 khẩu phần)
  CHAT: 20,               // 20:00 chia sẻ chuyện trong ngày
  DAY_END: 21,            // 21:00 đi ngủ → nhật ký cuối ngày

  GOAL: { day: 10, huts: 2, fields: 1, foodDays: 2, healthy: 4 },

  WALK_TILES_PER_HOUR: 22,
  BUILD_RADIUS: 12,       // công trình phải nằm trong bán kính này quanh bếp lửa (ô), tăng dần theo dân số

  START: { food: 12, wood: 5, stone: 0, seeds: 0 },
  STORAGE_CAP: [40, 100, 180, 300], // sức chứa mỗi loại theo cấp kho (cấp 1 → 4)
  SEED_CAP: 30,

  GATHER: {
    berry: { label: 'Hái quả',  res: 'food',  hours: 0.7, perTrip: 2, stock: 4, seeds: 2, regrowDays: 4, skill: 'gather' },
    wood:  { label: 'Đốn gỗ',   res: 'wood',  hours: 1.2, perTrip: 2, stock: 6, skill: 'build' },
    stone: { label: 'Nhặt đá',  res: 'stone', hours: 1.5, perTrip: 2, stock: 8, skill: 'build' },
    fish:  { label: 'Câu cá',   res: 'food',  hours: 1.0, perTrip: 3, stock: 9, skill: 'gather', regen: 4 },
  },

  FARM: {
    clearHours: 6,        // giờ công để dọn một ruộng (2×2 ô)
    sowHours: 1,
    seedCost: 3,
    growDays: 4,          // điểm sinh trưởng cần có (nắng +1/đêm, mưa +1.5/đêm)
    rainGrowth: 1.5,
    sunGrowth: 1,
    harvestHours: 2,
    yield: 10,            // thức ăn mỗi lần thu hoạch
    carry: 4,             // mỗi người mang tối đa bao nhiêu mỗi chuyến
  },

  HUT: { wood: 10, stone: 5, hours: 12, sleepers: 3 },
  STORAGE_UPGRADE: { wood: 8, stone: 6, hours: 6 },
  STORAGE_UPGRADES: [{ wood: 8, stone: 6, hours: 6 }, { wood: 16, stone: 12, hours: 10 }, { wood: 28, stone: 20, hours: 14 }], // chi phí lên cấp 2, 3, 4

  HUNT: {
    minMembers: 2,
    hours: 2.5,           // thời gian săn tại bãi
    baseChance: 0.25,
    perSkill: 0.10,       // + mỗi điểm kỹ năng săn trung bình
    perExtra: 0.05,       // + mỗi người thêm sau người thứ 2
    rainPenalty: 0.15,
    closePairBonus: 0.05,
    meatBase: 2, meatPerMember: 2, meatPerSkill: 1,
    injuryBase: 0.30, injuryPerSkill: 0.05, injuryRain: 0.10,
    injuryDamage: [15, 30],
    animalsStart: 4, animalsMax: 6, animalsRegen: 1,
  },

  ENERGY: { workDrain: 7, walkDrain: 4, idleRegen: 5, restRegen: 14, tiredAt: 15, resumeAt: 60,
            sleepHut: 80, sleepOutside: 45, sleepRain: 30 },
  HEALTH: { hungry: -20, fed: 5, night: 3, healthyAt: 50, sickAt: 20 },
  MORALE: { hungry: -15, fed: 2, fire: 3, rainNight: -5, huntFail: -10, huntWin: 6, built: 5 },
  BOND:   { perHourTogether: 2, closeAt: 60, closeSpeed: 1.15, chat: 4 },
  WEATHER:{ rainChance: 0.35, rainWorkFactor: 0.75 },

  // Sáu thành viên khởi đầu (hư cấu)
  MEMBERS: [
    { name: 'Hiếu',  main: 'build',  skills: { hunt: 2, gather: 2, build: 5, farm: 3 }, hair: '#2a1810', tunic: '#9c5b2e', band: '#f2c94c', skin: '#d9a273' },
    { name: 'Đá',    main: 'hunt',   skills: { hunt: 5, gather: 1, build: 3, farm: 1 }, hair: '#1b1b1b', tunic: '#6e4a2a', band: '#e05a3a', skin: '#c88b5c' },
    { name: 'Gió',   main: 'hunt',   skills: { hunt: 4, gather: 2, build: 2, farm: 2 }, hair: '#5a3a1e', tunic: '#7d6a3c', band: '#4fb0e0', skin: '#e0ae80' },
    { name: 'Mây',   main: 'gather', skills: { hunt: 1, gather: 5, build: 2, farm: 3 }, hair: '#3a2416', tunic: '#a8743c', band: '#e86fb0', skin: '#e6b48a' },
    { name: 'Nụ',    main: 'gather', skills: { hunt: 2, gather: 4, build: 1, farm: 3 }, hair: '#7a4a24', tunic: '#8c5a3a', band: '#9be067', skin: '#d8a070' },
    { name: 'Sương', main: 'farm',   skills: { hunt: 1, gather: 3, build: 2, farm: 5 }, hair: '#e8e0d0', tunic: '#5f6e3a', band: '#f0f0f0', skin: '#dcaa7c' },
  ],
  START_BONDS: [ ['Đá', 'Gió', 62], ['Mây', 'Nụ', 55], ['Hiếu', 'Sương', 50] ], // các cặp khác: 25–45

  // ---- Tự động & phát triển ----
  AUTO: { interval: 0.25, defaultOn: true },     // bộ lập kế hoạch chạy mỗi 0.25 giờ game
  POP: { childDays: 4, newcomerChance: 0.35, birthChance: 0.3, birthGapDays: 3, minFoodDays: 3, minMorale: 55, bondForBirth: 70, max: 40 },
  REGROW: { saplingChance: 0.3, saplingDays: 3, boulderChance: 0.45, boulderMaxExtra: 4 },
  NEW_PLOT_RADIUS: 16,
  FAMILY: { coupleBond: 60, pregnancyDays: 3, pregnancyChance: 0.4, birthGapDays: 4, pregnantWork: 0.7 },
  FISH: { unlock: 8, spots: 5 },
  FESTIVAL: { unlock: 10, everyDays: 7, morale: 12, bond: 5 },
  HEALER: { heal: 12 },
  WORKSHOP: { buildBonus: 1.2 },
  SEXES: { 'Hiếu': 'm', 'Đá': 'm', 'Gió': 'm', 'Mây': 'f', 'Nụ': 'f', 'Sương': 'f' },
  BUILDINGS: {
    hut:       { name: 'Lều cỏ',         w: 2, h: 2, wood: 10, stone: 5,  hours: 12, unlock: 0 },
    rack:      { name: 'Giàn phơi thịt', w: 2, h: 2, wood: 6,  stone: 2,  hours: 6,  unlock: 7,  max: 2, foodCap: 30, meatBonus: 0.25 },
    granary:   { name: 'Kho lương',      w: 2, h: 2, wood: 12, stone: 6,  hours: 10, unlock: 9,  max: 2, foodCap: 60 },
    longhouse: { name: 'Nhà dài',        w: 3, h: 2, wood: 18, stone: 10, hours: 16, unlock: 10, beds: 6 },
    healer:    { name: 'Lều thảo dược',  w: 2, h: 2, wood: 10, stone: 6,  hours: 10, unlock: 12, max: 1 },
    workshop:  { name: 'Xưởng chế tác',  w: 2, h: 2, wood: 14, stone: 10, hours: 12, unlock: 14, max: 1 },
  },
  NAMES: ['Sông', 'Núi', 'Lá', 'Hoa', 'Trăng', 'Sao', 'Cỏ', 'Suối', 'Rêu', 'Mưa', 'Bão', 'Lửa', 'Ong', 'Sóc', 'Cò', 'Én', 'Tre', 'Mận',
    'Đào', 'Lúa', 'Mầm', 'Khói', 'Thác', 'Hạt', 'Gấu', 'Nai', 'Bông', 'Cát', 'Rừng', 'Đồi', 'Nắng', 'Hồ', 'Sen', 'Cúc', 'Vàng', 'Mai'],

  SKILL_NAMES: { hunt: 'Săn bắt', gather: 'Hái lượm', build: 'Xây dựng', farm: 'Canh tác' },
};
