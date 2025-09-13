import { Product, User, Order } from '../types';

// 模擬水煙商品資料
export const mockProducts: Product[] = [
  // DarkSide 系列水煙草 (100g裝，760元)
  {
    id: '1',
    name: 'DarkSide Bergamonstr',
    description: '佛手柑風味，清新柑橘香氣，德國頂級水煙草品牌，100g包裝',
    price: 760,
    image: '/images/keyvisual_DS-BERGAMONSTR_logo.jpg',
    stock: 25,
    category: '水煙草'
  },
  {
    id: '2',
    name: 'DarkSide Cosmo Flower',
    description: '宇宙花朵風味，神秘花香調和，複合口感層次豐富，100g包裝',
    price: 760,
    image: '/images/keyvisual_DS-COSMO-FLOWER_logo.jpg',
    stock: 30,
    category: '水煙草'
  },
  {
    id: '3',
    name: 'DarkSide Dark Passion',
    description: '黑色激情風味，濃郁果香，經典DarkSide招牌口味，100g包裝',
    price: 760,
    image: '/images/keyvisual_DS-DARK-PASSION_logo.jpg',
    stock: 20,
    category: '水煙草'
  },
  {
    id: '4',
    name: 'DarkSide Dark Supra',
    description: '暗黑至尊風味，經典混合口味，適合老手的濃烈體驗，100g包裝',
    price: 760,
    image: '/images/keyvisual_DS-DARKSUPRA_logo.jpg',
    stock: 35,
    category: '水煙草'
  },
  {
    id: '5',
    name: 'DarkSide Lemon Blast',
    description: '檸檬爆炸風味，強烈檸檬香氣，清新酸甜口感，100g包裝',
    price: 760,
    image: '/images/keyvisual_DS-LEMONBLAST.jpg',
    stock: 40,
    category: '水煙草'
  },
  {
    id: '6',
    name: 'DarkSide Needls',
    description: '針葉風味，清新松針香氣，獨特森林系口味，100g包裝',
    price: 760,
    image: '/images/keyvisual_DS-NEEDLS.jpg',
    stock: 22,
    category: '水煙草'
  },
  {
    id: '7',
    name: 'DarkSide Pomelow',
    description: '柚子風味，酸甜柚子香氣，清爽怡人，100g包裝',
    price: 760,
    image: '/images/keyvisual_DS-POMELOW_logo.jpg',
    stock: 28,
    category: '水煙草'
  },
  {
    id: '8',
    name: 'DarkSide Red Alert',
    description: '紅色警報風味，濃烈漿果味，強勁口感體驗，100g包裝',
    price: 760,
    image: '/images/keyvisual_DS-RED-ALERT.jpg',
    stock: 15,
    category: '水煙草'
  },
  {
    id: '9',
    name: 'DarkSide Supernova',
    description: '超新星風味，複合水果香氣，多層次口感享受，100g包裝',
    price: 760,
    image: '/images/keyvisual_DS-SUPERNOVA.jpg',
    stock: 33,
    category: '水煙草'
  },
  {
    id: '10',
    name: 'DarkSide Virgin Peach',
    description: '處女桃風味，清甜蜜桃香氣，溫和順滑口感，100g包裝',
    price: 760,
    image: '/images/keyvisual_DS-VIRGIN-PEACH_no-logo_2.0.jpg',
    stock: 38,
    category: '水煙草'
  },
  // Kalee 系列水煙草 (入門款)
  {
    id: '11',
    name: 'Kalee Grapefruit',
    description: '葡萄柚風味，入門友好的水煙草，酸甜清香，100g包裝',
    price: 580,
    image: '/images/KaleeGrapefruit_desktop_FINAL.jpg',
    stock: 45,
    category: '水煙草'
  },
  // 配件類別
  {
    id: '12',
    name: '椰殼碳',
    description: '天然椰殼製作，燃燒時間長，無異味，一箱10盒裝',
    price: 2000,
    image: '/images/placeholder.svg',
    stock: 8,
    category: '配件'
  },
  {
    id: '13',
    name: 'MOD 矽膠水煙管',
    description: '食品級矽膠材質，易清潔且耐用，多色可選',
    price: 650,
    image: '/images/placeholder.svg',
    stock: 12,
    category: '配件'
  }
];

// 模擬使用者資料
export const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@hookah-store.com',
    username: 'admin',
    createdAt: '2024-01-01T00:00:00Z',
    isAdmin: true
  }
];

// 模擬訂單資料
export const mockOrders: Order[] = [];