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
  BEDTIME: 20.5,          // 20:30 mọi người rời bếp lửa, về lều của mình để ngủ
  DAY_END: 21,            // từ 21:00, khi mọi người đã ngủ yên → nhật ký cuối ngày
  NIGHT_MAX: 22.5,        // muộn nhất 22:30 thì kết thúc ngày dù còn người chưa vào lều

  GOAL: { day: 10, huts: 2, fields: 1, foodDays: 2, healthy: 4 },

  WALK_TILES_PER_HOUR: 22,
  BUILD_RADIUS: 12,       // công trình phải nằm trong bán kính này quanh bếp lửa (ô), tăng dần theo dân số

  START: { food: 12, wood: 5, stone: 0, seeds: 0 },
  STORAGE_CAP: [40, 100, 180, 300], // sức chứa mỗi loại theo cấp kho (cấp 1 → 4)
  SEED_CAP: 40,

  GATHER: {
    berry: { label: 'Hái quả',  res: 'food',  hours: 0.7, perTrip: 2, stock: 4, seeds: 2, regrowDays: 4, skill: 'gather' },
    wood:  { label: 'Đốn gỗ',   res: 'wood',  hours: 1.2, perTrip: 3, stock: 9, skill: 'build' },
    stone: { label: 'Nhặt đá',  res: 'stone', hours: 1.2, perTrip: 3, stock: 12, skill: 'build' },
    ore:    { label: 'Đào quặng', res: 'ore', hours: 1.4, perTrip: 2, stock: 24, regen: 6, skill: 'build' },
    quarry: { label: 'Khai thác đá', res: 'stone', hours: 1.4, perTrip: 4, stock: 40, skill: 'build', regen: 16 },
    fish:  { label: 'Câu cá',   res: 'food',  hours: 1.0, perTrip: 3, stock: 9, skill: 'gather', regen: 4 },
  },

  FARM: {
    clearHours: 6,        // giờ công để dọn một ruộng (2×2 ô)
    sowHours: 1,
    seedCost: 3,
    seedReturn: 4,        // mỗi lần thu hoạch giữ lại 4 hạt giống cho vụ sau
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
    { name: 'Hiếu',  main: 'build',  skills: { hunt: 2, gather: 2, build: 5, farm: 3, guard: 2 }, hair: '#2a1810', tunic: '#9c5b2e', band: '#f2c94c', skin: '#d9a273' },
    { name: 'Đá',    main: 'hunt',   skills: { hunt: 5, gather: 1, build: 3, farm: 1, guard: 4 }, hair: '#1b1b1b', tunic: '#6e4a2a', band: '#e05a3a', skin: '#c88b5c' },
    { name: 'Gió',   main: 'hunt',   skills: { hunt: 4, gather: 2, build: 2, farm: 2, guard: 3 }, hair: '#5a3a1e', tunic: '#7d6a3c', band: '#4fb0e0', skin: '#e0ae80' },
    { name: 'Mây',   main: 'gather', skills: { hunt: 1, gather: 5, build: 2, farm: 3, guard: 1 }, hair: '#3a2416', tunic: '#a8743c', band: '#e86fb0', skin: '#e6b48a' },
    { name: 'Nụ',    main: 'gather', skills: { hunt: 2, gather: 4, build: 1, farm: 3, guard: 2 }, hair: '#7a4a24', tunic: '#8c5a3a', band: '#9be067', skin: '#d8a070' },
    { name: 'Sương', main: 'farm',   skills: { hunt: 1, gather: 3, build: 2, farm: 5, guard: 1 }, hair: '#e8e0d0', tunic: '#5f6e3a', band: '#f0f0f0', skin: '#dcaa7c' },
  ],
  START_BONDS: [ ['Đá', 'Gió', 62], ['Mây', 'Nụ', 55], ['Hiếu', 'Sương', 50] ], // các cặp khác: 25–45

  // ---- Tự động & phát triển ----
  AUTO: { interval: 0.25, defaultOn: true },     // bộ lập kế hoạch chạy mỗi 0.25 giờ game
  POP: { childDays: 4, newcomerChance: 0.5, smallBonus: 0.2, coupleChance: 0.35, birthChance: 0.3, birthGapDays: 3, minFoodDays: 3, minMorale: 55, bondForBirth: 70, max: 200 },
  REGROW: { saplingChance: 0.3, saplingDays: 3, boulderChance: 0.75, boulderMaxExtra: 10 },
  NEW_PLOT_RADIUS: 16,
  FAMILY: { coupleBond: 50, pregnancyDays: 3, pregnancyChance: 0.55, birthGapDays: 3, pregnantWork: 0.7 }, // chỉ có thể mang thai khi vợ chồng ngủ chung một lều riêng
  FISH: { unlock: 8, spots: 5 },
  FESTIVAL: { unlock: 10, everyDays: 7, morale: 12, bond: 5 },
  HEALER: { heal: 12 },
  WORKSHOP: { buildBonus: 1.2 },
  SEXES: { 'Hiếu': 'm', 'Đá': 'm', 'Gió': 'm', 'Mây': 'f', 'Nụ': 'f', 'Sương': 'f' },
  BUILDINGS: {
    hut:       { name: 'Lều cỏ',         w: 2, h: 2, wood: 10, stone: 5,  hours: 12, unlock: 0 },
    rack:      { name: 'Giàn phơi thịt', w: 2, h: 2, wood: 6,  stone: 2,  hours: 6,  unlock: 7,  max: 2, foodCap: 30, meatBonus: 0.25 },
    granary:   { name: 'Kho lương',      w: 2, h: 2, wood: 12, stone: 6,  hours: 10, unlock: 9,  max: 8, foodCap: 60 },
    longhouse: { name: 'Nhà dài',        w: 3, h: 2, wood: 18, stone: 10, hours: 16, unlock: 10, beds: 6 },
    healer:    { name: 'Lều thảo dược',  w: 2, h: 2, wood: 10, stone: 6,  hours: 10, unlock: 12, max: 1 },
    workshop:  { name: 'Xưởng chế tác',  w: 2, h: 2, wood: 14, stone: 10, hours: 12, unlock: 14, max: 1 },
    watchtower: { name: 'Chòi canh',     w: 2, h: 2, wood: 8,  stone: 4,  hours: 8,  unlock: 8,  max: 2 },
    sickhouse: { name: 'Nhà chữa bệnh',  w: 3, h: 2, wood: 12, stone: 8,  hours: 10, unlock: 6,  max: 2 },
    kitchen:   { name: 'Nhà bếp',        w: 2, h: 2, wood: 12, stone: 10, hours: 10, unlock: 7,  max: 1 },
    pen:       { name: 'Chuồng thú',     w: 3, h: 3, wood: 20, stone: 4,  hours: 12, unlock: 9,  max: 3 },
    // Công trình đồ sộ: mở theo cấp bộ lạc, tốn nhiều vật liệu và nhiều ngày công
    temple:    { name: 'Đền tổ tiên',        w: 4, h: 3, wood: 80,  stone: 120, hours: 40, unlock: 0, tribe: 3, max: 1, grand: true },
    stonering: { name: 'Vòng đá thiêng',     w: 4, h: 4, wood: 40,  stone: 200, hours: 55, unlock: 0, tribe: 4, max: 1, grand: true },
    paintwall: { name: 'Vách đá vẽ tranh', w: 3, h: 2, wood: 4,  stone: 15, hours: 8,  unlock: 8, max: 1 },
    well:      { name: 'Giếng nước',       w: 2, h: 2, wood: 4,  stone: 12, hours: 6,  unlock: 10 },
    scholar:   { name: 'Nhà hiền triết',   w: 3, h: 2, wood: 16, stone: 18, hours: 14, unlock: 12, max: 2 },
    school:    { name: 'Trường dạy nghề',  w: 3, h: 2, wood: 18, stone: 14, hours: 14, unlock: 14, max: 1 },
    barracks:  { name: 'Doanh trại',       w: 4, h: 3, wood: 26, stone: 22, hours: 20, unlock: 16, max: 2 },
    smelter:   { name: 'Lò luyện',         w: 2, h: 2, wood: 10, stone: 24, hours: 12, unlock: 0, max: 1, invent: 'smelting' },
    gate:      { name: 'Cổng làng',      w: 3, h: 2, wood: 30, stone: 24, hours: 14, unlock: 0, tribe: 4, max: 1 },
    clanhouse: { name: 'Nhà sàn lớn',   w: 4, h: 3, wood: 40, stone: 24, hours: 22, unlock: 0, tribe: 6, max: 14, beds: 16, rooms: 4 },
    greathall: { name: 'Đại sảnh tù trưởng', w: 5, h: 3, wood: 200, stone: 150, hours: 70, unlock: 0, tribe: 5, max: 1, grand: true, beds: 12 },
  },

  // Cấp lửa trại = cấp bộ lạc
  TRIBE: {
    levels: [
      { name: 'Bếp lửa',          pop: 0,  cap: 14 },
      { name: 'Lửa trại',         pop: 6,  cap: 22, wood: 15, stone: 10, hours: 10 },
      { name: 'Đống lửa lớn',     pop: 12, cap: 30, wood: 30, stone: 24, hours: 14 },
      { name: 'Lửa thiêng',       pop: 18, cap: 40, wood: 45, stone: 40, hours: 18 },
      { name: 'Ngọn lửa tổ tiên', pop: 30, cap: 50, wood: 60, stone: 60, hours: 22 },
      { name: 'Hỏa đàn liên minh', pop: 42, cap: 70, wood: 100, stone: 110, hours: 28 },
      { name: 'Đuốc thiêng vương quyền', pop: 60, cap: 100, wood: 150, stone: 170, hours: 34 },
      { name: 'Ngọn lửa vĩnh cửu', pop: 88, cap: 140, wood: 210, stone: 240, hours: 40 },
    ],
    radiusPerLevel: 2,     // bán kính xây dựng +2 ô mỗi cấp
    moralePerLevel: 1,     // mỗi đêm tinh thần +1 mỗi cấp trên 1
    fireSafePerLevel: 0.3, // thú dữ sợ lửa xa hơn
    prophetLevel: 2, shamanLevel: 3, quarryLevel: 2,
    chiefWork: 0.03,       // tù trưởng khỏe mạnh: cả làng làm nhanh hơn 3% mỗi cấp bộ lạc
  },
  ROLES: { chiefName: 'Hiếu', healRate: 30, healHours: 0.6, rainChance: 0.5, prophetMorale: 3, shamanHunt: 0.05, warnedBonus: 1.2 },
  QUARRY: { spots: 3 },
  KITCHEN: { needHours: 2, maxHours: 3, save: 0.25, health: 3, morale: 3 }, // bếp nấu đủ 2 giờ/ngày: bữa tối tiết kiệm 25% thức ăn, +3 sức khỏe, +3 tinh thần
  PEN: { start: 2, cap: 6, breed: 0.35, escape: 0.25, milkPer: 2, meat: 6, capture: 0.3, herdHours: 1 },
  GRAND: { templeMorale: 5, templeNewcomer: 0.15, ringGrow: 0.3, ringMorale: 3, hallWork: 0.05 },
  // ---- Saga: giữ lửa, mùa, voi ma mút, thám hiểm, thú nuôi, phát minh, bộ lạc lân cận, tranh hang ----
  FIRE: { burn: 2.2, night: 24, rainMult: 1.4, winterMult: 1.6, stokeAt: 55, stokeWood: 3, stokeFuel: 30, stormChance: 0.3, storm: 35, kindleHours: 2, kindleWood: 2, kindleChance: 0.45 },
  SEASONS: { len: 3, names: ['Xuân', 'Hạ', 'Thu', 'Đông'], cold: 6, furCap: 60 },
  MAMMOTH: { chance: 0.3, minDay: 5, minHunters: 5, hours: 2, meat: 40, furs: 6, base: 0.3, perHunter: 0.06, spear: 0.03, injury: 0.4, dmg: [12, 30] },
  EXPEDITION: { days: 2, min: 2, max: 3, autoEvery: 7, autoPop: 12, risk: 0.25 },
  PETS: { pupChance: 0.35, growDays: 4, maxDogs: 4, dogFight: 1.4, dogHunt: 0.08, horseChance: 0.25, horseLevel: 2, tameHours: 3, tameChance: 0.5, horseHunt: 0.08, maxHorses: 3 },
  INVENT: { perAdults: 5 },
  NEIGHBOR: { name: 'Bộ lạc Đá Đỏ', start: 40, meetDay: 6, visitChance: 0.3, raidBelow: 25, giftFood: 20, giftRel: 12, tradeRel: 5, allyAt: 75 },
  // ---- Văn minh: cấp công trình, hạ tầng, nghiên cứu, luyện chế, ngành nghề, luật lệ, quân đội ----
  CIV: {
    tier2: { pop: 12, level: 2 }, tier3: { pop: 22, level: 4, invent: 'masonry' },
    wellServes: 12, roadSpeed: 1.3, paveStone: 1,
    studyIdeas: 0.3, smeltHours: 1.5, skillMax: 7,
    soldiersPer: 7, barracksCap: [0, 6, 10, 16], drillXp: 1,
    lawSlots: [1, 1, 2, 2, 3, 3, 4, 4],
    // Thịnh vượng: ở cấp bộ lạc 5, giới hạn dân số được cộng thêm
    prosper: { hall: 10, living: 10, on: 0.85, off: 0.7 },
    // Đoàn buôn: thừa thức ăn/gỗ/đá (≥ 85% kho) thì mang bớt đi đổi lấy thứ làng đang thiếu
    caravan: { pop: 12, surplus: 0.85, keep: 0.7, foodMax: 160, resMax: 70,
      value: { food: 1, wood: 1.2, stone: 1.2, seeds: 3, ore: 4, bronze: 14, furs: 6, idea: 12 }, giftRel: 3 },
    // Đại tiệc mùa màng: kho thức ăn ≥ 92% thì mở tiệc (tốn 15% kho), cách nhau ít nhất 3 ngày
    feast: { at: 0.92, share: 0.15, every: 3, morale: 6, health: 4 },
  },
  // Quân đội lớn, kẻ thù Sói Xám, tường thành, chinh phạt lớn (army.js)
  ARMY: {
    per: [7, 7, 7, 7, 6, 5, 4, 4],   // bao nhiêu dân thì có 1 chiến binh, theo cấp bộ lạc
    maxShare: 0.35,                   // chiến binh tối đa 35% dân số
    barracksPer: 28, barracksMax: 6,  // cứ 28 dân thêm 1 doanh trại, tối đa 6
    ranks: [
      { name: 'Lính mới',   mult: 1 },
      { name: 'Chiến binh', mult: 1.25, guard: 4 },
      { name: 'Tinh binh',  mult: 1.6,  guard: 6, battles: 3 },
      { name: 'Tướng quân', mult: 2.2,  guard: 7, battles: 5 },
    ],
    generalPer: 15, generalBonus: 0.08, // cứ 15 chiến binh có 1 tướng; mỗi tướng đi cùng: cả đoàn mạnh thêm 8% (tối đa 3 tướng)
    foe: { name: 'Bộ lạc Sói Xám', startDay: 14, startPop: 28, every: [4, 7], base: 3, perDay: 0.15, perPop: 0.09, max: 45, tribute: { food: 15, stone: 8, ore: 4 } },
    wall: {
      levels: [
        { name: 'Chưa có tường' },
        { name: 'Hàng rào gỗ',  wood: 60, stone: 10,  hours: 18, hp: 160, tribe: 4, spike: 2 },
        { name: 'Tường đất đá', wood: 60, stone: 110, hours: 28, hp: 320, tribe: 6, spike: 4, invent: 'masonry' },
        { name: 'Thành đá',     wood: 40, stone: 220, hours: 38, hp: 560, tribe: 7, spike: 7 },
      ],
      repair: 0.25,    // mỗi đêm tự sửa 25% độ bền (tốn gỗ/đá)
    },
    conquest: { valley: 10, wolves: 15, plains: 15 }, // giới hạn dân số cộng thêm khi chinh phục
  },
  CARE: { healRate: 10, patients: 4, goAt: 45, shamanBonus: 8 }, // Nhà chữa bệnh: người sức khỏe dưới 45 vào nằm chữa, hồi 10/giờ (+8 khi có vu sư chăm)
  GATHER_RATIO: 1.3,       // tỉ lệ gỗ : đá mà làng cố giữ khi đi khai thác

  // Dụng cụ săn bắn: giáo đá — chế ở bếp lửa (hoặc xưởng chế tác, nhanh hơn)
  TOOLS: {
    spear: { wood: 2, stone: 1, hours: 1.5 },
    cap: 10,               // sức chứa giáo (+4 mỗi cấp kho)
    workshopSpeed: 1.6,
    huntChance: 0.05,      // mỗi người cầm giáo khi đi săn: +5% tỉ lệ thành công
    huntMeat: 0.1,         // +10% thịt
    huntInjury: 0.04,      // −4% nguy cơ bị thương
    breakHunt: 0.15,       // khả năng gãy giáo sau mỗi chuyến săn
    breakFight: 0.1,       // khả năng gãy giáo sau mỗi trận đánh thú dữ
  },
  // Thú dữ tấn công làng & người canh gác
  DEFENSE: {
    startDay: 3, chance: 0.3, perDay: 0.02, maxChance: 0.65, hourFrom: 8, hourTo: 15.5,
    guardsAt: [[7, 1], [14, 2], [24, 3]], // dân số → số người canh gác làng tự cử
    militiaSkill: 3,       // người có kỹ năng Bảo vệ từ mức này sẽ ra giúp khi thiếu người gác
    baseDmg: 1.5, perSkill: 1.2, spearMult: 1.7, towerBonus: 1.25, towerRange: 9,
    atkEvery: 0.4,         // thú cắn mỗi 0,4 giờ
    fireSafe: 2.6,         // thú (trừ gấu) không dám lại gần bếp lửa trong bán kính này (ô)
    fleeRadius: 5, towerFleeRadius: 8, giveUp: 3.5, skillUpChance: 0.35,
  },
  BEASTS: {
    wolf:  { name: 'Sói', hp: 10, dmg: 7,  speed: 25, meat: 4,  minDay: 3,  weight: 5, target: 'people' },
    bear:  { name: 'Gấu', hp: 24, dmg: 11, speed: 15, meat: 10, minDay: 7,  weight: 3, target: 'food', steal: 5, bold: true },
    tiger: { name: 'Hổ',  hp: 26, dmg: 15, speed: 23, meat: 8,  minDay: 12, weight: 2, target: 'people' },
    wolfwar: { name: 'Chiến binh Sói Xám', hp: 22, dmg: 11, speed: 20, meat: 0, minDay: 9999, weight: 0, target: 'food', steal: 10, bold: true, raid: true },
    raider: { name: 'Kẻ đột kích', hp: 14, dmg: 8, speed: 21, meat: 0, minDay: 9999, weight: 0, target: 'food', steal: 8, bold: true, raid: true },
  },
  NAMES: ['Sông', 'Núi', 'Lá', 'Hoa', 'Trăng', 'Sao', 'Cỏ', 'Suối', 'Rêu', 'Mưa', 'Bão', 'Lửa', 'Ong', 'Sóc', 'Cò', 'Én', 'Tre', 'Mận',
    'Đào', 'Lúa', 'Mầm', 'Khói', 'Thác', 'Hạt', 'Gấu', 'Nai', 'Bông', 'Cát', 'Rừng', 'Đồi', 'Nắng', 'Hồ', 'Sen', 'Cúc', 'Vàng', 'Mai'],

  SKILL_NAMES: { hunt: 'Săn bắt', gather: 'Hái lượm', build: 'Xây dựng', farm: 'Canh tác', guard: 'Bảo vệ' },
};
