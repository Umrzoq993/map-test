// src/data/orgTree.js
// Har bir tugun uchun: key, title, pos: [lat, lng], zoom (ixtiyoriy), children
const orgTreeData = [
  {
    key: "hq",
    title: "Markaziy Boshqarma (HQ)",
    pos: [41.3111, 69.2797], // Tashkent
    zoom: 13,
    children: [
      {
        key: "hq-it",
        title: "IT bo'limi",
        pos: [41.3275, 69.2817],
      },
      {
        key: "hq-ops",
        title: "Operatsiyalar bo'limi",
        pos: [41.3059, 69.269],
      },
    ],
  },
  {
    key: "regions",
    title: "Hududiy Filiallar",
    children: [
      {
        key: "rg-tashkent",
        title: "Toshkent filiali",
        pos: [41.2995, 69.2401],
        zoom: 13,
        children: [
          {
            key: "rg-tashkent-chilonzor",
            title: "Chilonzor bo'limi",
            pos: [41.2856, 69.2033],
          },
          {
            key: "rg-tashkent-yunusobod",
            title: "Yunusobod bo'limi",
            pos: [41.3634, 69.2862],
          },
        ],
      },
      {
        key: "rg-samarkand",
        title: "Samarqand filiali",
        pos: [39.6542, 66.9597],
        children: [
          {
            key: "rg-samarkand-registan",
            title: "Registon bo'limi",
            pos: [39.6541, 66.975],
          },
        ],
      },
      {
        key: "rg-bukhara",
        title: "Buxoro filiali",
        pos: [39.7747, 64.4286],
      },
      {
        key: "rg-fergana",
        title: "Farg‘ona filiali",
        pos: [40.389, 71.7843],
      },
      {
        key: "rg-andijan",
        title: "Andijon filiali",
        pos: [40.7821, 72.3442],
      },
      {
        key: "rg-namangan",
        title: "Namangan filiali",
        pos: [40.9983, 71.6726],
      },
      {
        key: "rg-nukus",
        title: "Nukus filiali",
        pos: [42.46, 59.615],
      },
    ],
  },
];

export default orgTreeData;
