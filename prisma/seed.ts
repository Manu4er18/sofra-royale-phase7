/**
 * SOFRA ROYALE — database seed
 *
 * Realistic development data: Dubai & Turkish dishes with real names,
 * ingredients, allergens, options and add-ons; admin + demo customer;
 * coupons; delivery zones; taxes; tables; CMS settings; FAQs.
 *
 * Run:  npm run db:seed   (also runs automatically on `prisma migrate reset`)
 *
 * Idempotent: upserts by unique keys, safe to run repeatedly.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const img = (id: string) =>
  `https://images.unsplash.com/${id}?q=80&w=1600&auto=format&fit=crop`;

async function upsertUser(input: {
  email: string;
  name: string;
  password: string;
  role: "CUSTOMER" | "SUPER_ADMIN";
}) {
  const hashedPassword = await hash(input.password, 12);
  const user = await db.user.upsert({
    where: { email: input.email },
    update: { role: input.role },
    create: {
      email: input.email,
      name: input.name,
      hashedPassword,
      role: input.role,
      emailVerified: new Date(),
      profile: { create: {} },
      loyaltyAccount: { create: { balance: 0 } },
    },
  });
  return user;
}

// ---------------------------------------------------------------------------
// Static reference data
// ---------------------------------------------------------------------------

const ALLERGENS = [
  { code: "A", name: "Glutenhaltiges Getreide" },
  { code: "C", name: "Eier" },
  { code: "G", name: "Milch / Laktose" },
  { code: "H", name: "Schalenfrüchte (Nüsse)" },
  { code: "K", name: "Sesam" },
  { code: "F", name: "Soja" },
  { code: "I", name: "Sellerie" },
  { code: "J", name: "Senf" },
];

const INGREDIENTS = [
  "Basmatireis",
  "Safran",
  "Lammfleisch",
  "Hähnchenbrust",
  "Rinderhackfleisch",
  "Zwiebeln",
  "Knoblauch",
  "Tomaten",
  "Paprika",
  "Petersilie",
  "Joghurt",
  "Butter",
  "Fladenbrot",
  "Bulgur",
  "Kichererbsen",
  "Tahini",
  "Pistazien",
  "Walnüsse",
  "Datteln",
  "Honig",
  "Kadayif-Teig",
  "Käse (Künefe)",
  "Auberginen",
  "Granatapfelsirup",
  "Minze",
  "Sumach",
  "Pul Biber",
  "Kreuzkümmel",
  "Kardamom",
  "Rosenwasser",
  "Schwarzer Tee",
  "Mokkabohnen",
  "Zitrone",
  "Gurken",
  "Rote Linsen",
];

type ProductSeed = {
  slug: string;
  name: string;
  nameEn: string;
  cuisine: "dubai" | "turkish";
  category: string;
  short: string;
  shortEn: string;
  description: string;
  basePrice: number;
  discountPrice?: number;
  calories: number;
  prepTime: number;
  portion: string;
  spice: "NONE" | "MILD" | "MEDIUM" | "HOT";
  flags?: Partial<{
    featured: boolean;
    popular: boolean;
    isNew: boolean;
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
    chef: boolean;
    daily: boolean;
  }>;
  image: string;
  imageAlt: string;
  ingredients: Array<{ name: string; removable?: boolean }>;
  allergens: string[];
  variations?: Array<{ name: string; price: number; isDefault?: boolean }>;
  optionGroups?: Array<{
    name: string;
    min: number;
    max: number;
    required?: boolean;
    options: Array<{ name: string; delta: number; isDefault?: boolean }>;
  }>;
  addons?: Array<{ name: string; price: number }>;
};

const PRODUCTS: ProductSeed[] = [
  // ------------------------------ Dubai ------------------------------
  {
    slug: "chicken-machboos",
    name: "Machboos Dajaj",
    nameEn: "Chicken Machboos",
    cuisine: "dubai",
    category: "hauptgerichte",
    short: "Emiratisches Nationalgericht: Safranreis mit geschmortem Hähnchen.",
    shortEn: "Emirati national dish: saffron rice with braised chicken.",
    description:
      "Langsam geschmortes Hähnchen auf duftendem Basmatireis mit Safran, Loomi (getrockneter Limette), Kardamom und Zimt. Serviert mit frischem Tomaten-Daqus und gerösteten Nüssen — das Herzstück jeder emiratischen Tafel.",
    basePrice: 1890,
    calories: 780,
    prepTime: 25,
    portion: "450 g",
    spice: "MILD",
    flags: { featured: true, popular: true },
    image: img("photo-1633945274405-b6c8069047b0"),
    imageAlt: "Machboos Dajaj — Safranreis mit geschmortem Hähnchen und Nüssen",
    ingredients: [
      { name: "Hähnchenbrust" },
      { name: "Basmatireis" },
      { name: "Safran" },
      { name: "Zwiebeln", removable: true },
      { name: "Kardamom" },
    ],
    allergens: ["H"],
    variations: [
      { name: "Normale Portion", price: 1890, isDefault: true },
      { name: "Große Portion", price: 2390 },
    ],
    optionGroups: [
      {
        name: "Schärfegrad",
        min: 1,
        max: 1,
        required: true,
        options: [
          { name: "Mild", delta: 0, isDefault: true },
          { name: "Mittel", delta: 0 },
          { name: "Scharf", delta: 0 },
        ],
      },
    ],
    addons: [
      { name: "Extra Hähnchen", price: 450 },
      { name: "Daqus-Sauce extra", price: 150 },
    ],
  },
  {
    slug: "lamb-ouzi",
    name: "Lamm Ouzi",
    nameEn: "Lamb Ouzi",
    cuisine: "dubai",
    category: "hauptgerichte",
    short:
      "Butterzartes Lamm über Gewürzreis mit Erbsen, Karotten und Mandeln.",
    shortEn:
      "Slow-roasted lamb over spiced rice with peas, carrots and almonds.",
    description:
      "Über Stunden geschmortes Lammfleisch, das vom Knochen fällt, gebettet auf Ouzi-Reis mit Erbsen, Karotten, Rosinen und gerösteten Mandeln. Mit Joghurt-Gurken-Dip serviert — der Festtagsklassiker der Golfküche.",
    basePrice: 2690,
    calories: 920,
    prepTime: 30,
    portion: "500 g",
    spice: "MILD",
    flags: { featured: true, chef: true },
    image: img("photo-1544025162-d76694265947"),
    imageAlt: "Lamm Ouzi — zartes Lammfleisch auf Gewürzreis mit Mandeln",
    ingredients: [
      { name: "Lammfleisch" },
      { name: "Basmatireis" },
      { name: "Zwiebeln", removable: true },
      { name: "Joghurt", removable: true },
    ],
    allergens: ["G", "H"],
    addons: [
      { name: "Extra Lammfleisch (100 g)", price: 650 },
      { name: "Joghurt-Dip extra", price: 180 },
    ],
  },
  {
    slug: "luqaimat",
    name: "Luqaimat",
    nameEn: "Luqaimat",
    cuisine: "dubai",
    category: "desserts",
    short: "Goldene Hefebällchen mit Dattelsirup und Sesam.",
    shortEn: "Golden dumplings drizzled with date syrup and sesame.",
    description:
      "Außen knusprig, innen fluffig: frittierte Hefebällchen, großzügig mit warmem Dattelsirup übergossen und mit geröstetem Sesam bestreut. Das beliebteste Dessert der Emirate — perfekt zu arabischem Kaffee.",
    basePrice: 790,
    calories: 430,
    prepTime: 15,
    portion: "8 Stück",
    spice: "NONE",
    flags: { popular: true, vegetarian: true },
    image: img("photo-1514517220017-8ce97a34a7b6"),
    imageAlt: "Luqaimat — goldene Teigbällchen mit Dattelsirup und Sesam",
    ingredients: [{ name: "Datteln" }, { name: "Honig" }],
    allergens: ["A", "K"],
    addons: [{ name: "Extra Dattelsirup", price: 120 }],
  },
  {
    slug: "hummus-royale",
    name: "Hummus Royale",
    nameEn: "Royal Hummus",
    cuisine: "dubai",
    category: "vorspeisen",
    short: "Samtiger Hummus mit Pinienkernen, Olivenöl und warmem Brot.",
    shortEn: "Silky hummus with pine nuts, olive oil and warm flatbread.",
    description:
      "Cremig aufgeschlagener Hummus aus Kichererbsen und Tahini, gekrönt mit gerösteten Pinienkernen, Sumach und bestem Olivenöl. Dazu ofenwarmes Fladenbrot.",
    basePrice: 890,
    calories: 380,
    prepTime: 10,
    portion: "300 g",
    spice: "NONE",
    flags: { vegetarian: true, vegan: true, popular: true },
    image: img("photo-1547058881-aa0edd92aab3"),
    imageAlt: "Hummus mit Pinienkernen, Olivenöl und Fladenbrot",
    ingredients: [
      { name: "Kichererbsen" },
      { name: "Tahini" },
      { name: "Knoblauch", removable: true },
      { name: "Zitrone" },
    ],
    allergens: ["K"],
    addons: [
      { name: "Extra Fladenbrot", price: 200 },
      { name: "Gegrilltes Gemüse", price: 350 },
    ],
  },
  {
    slug: "karak-chai",
    name: "Karak Chai",
    nameEn: "Karak Chai",
    cuisine: "dubai",
    category: "kaffee-tee",
    short: "Kräftiger Gewürztee mit Kardamom und cremiger Milch.",
    shortEn: "Strong spiced tea with cardamom and creamy milk.",
    description:
      "Der Kult-Tee Dubais: kräftiger schwarzer Tee, langsam mit Kardamom, Safran und Kondensmilch eingekocht. Süß, würzig, unwiderstehlich.",
    basePrice: 390,
    calories: 120,
    prepTime: 8,
    portion: "250 ml",
    spice: "NONE",
    flags: { vegetarian: true, isNew: true },
    image: img("photo-1571934811356-5cc061b6821f"),
    imageAlt: "Karak Chai in traditionellem Glas mit Gewürzen",
    ingredients: [
      { name: "Schwarzer Tee" },
      { name: "Kardamom" },
      { name: "Safran" },
    ],
    allergens: ["G"],
  },
  // ------------------------------ Turkish ------------------------------
  {
    slug: "adana-kebap",
    name: "Adana Kebap",
    nameEn: "Adana Kebab",
    cuisine: "turkish",
    category: "grill",
    short:
      "Pikanter Hackfleischspieß vom Holzkohlegrill mit Bulgur und Sumach-Zwiebeln.",
    shortEn:
      "Spicy minced-meat skewer from the charcoal grill with bulgur and sumac onions.",
    description:
      "Von Hand gehacktes Lamm- und Rindfleisch, mit Pul Biber gewürzt und über Holzkohle gegrillt. Serviert mit Bulgurpilav, gegrillten Tomaten, Sumach-Zwiebeln und Lavash-Brot — das Original aus Adana.",
    basePrice: 1990,
    calories: 850,
    prepTime: 20,
    portion: "400 g",
    spice: "HOT",
    flags: { featured: true, popular: true, chef: true },
    image: img("photo-1561651823-34feb02250e4"),
    imageAlt: "Adana Kebap mit Bulgur, gegrillten Tomaten und Lavash",
    ingredients: [
      { name: "Rinderhackfleisch" },
      { name: "Lammfleisch" },
      { name: "Pul Biber" },
      { name: "Zwiebeln", removable: true },
      { name: "Fladenbrot", removable: true },
    ],
    allergens: ["A"],
    variations: [
      { name: "Ein Spieß", price: 1990, isDefault: true },
      { name: "Doppelspieß", price: 2790 },
    ],
    optionGroups: [
      {
        name: "Schärfegrad",
        min: 1,
        max: 1,
        required: true,
        options: [
          { name: "Original (scharf)", delta: 0, isDefault: true },
          { name: "Extra scharf", delta: 0 },
          { name: "Mild gewürzt", delta: 0 },
        ],
      },
      {
        name: "Beilage",
        min: 1,
        max: 1,
        required: true,
        options: [
          { name: "Bulgurpilav", delta: 0, isDefault: true },
          { name: "Reis", delta: 0 },
          { name: "Pommes frites", delta: 100 },
        ],
      },
    ],
    addons: [
      { name: "Ayran (0,3 l)", price: 290 },
      { name: "Ezme-Salat", price: 350 },
      { name: "Gegrillte Paprika", price: 250 },
    ],
  },
  {
    slug: "iskender-kebap",
    name: "İskender Kebap",
    nameEn: "Iskender Kebab",
    cuisine: "turkish",
    category: "grill",
    short:
      "Dönerscheiben auf Brotwürfeln mit Tomatensauce, Joghurt und brauner Butter.",
    shortEn:
      "Sliced döner over bread cubes with tomato sauce, yoghurt and brown butter.",
    description:
      "Hauchdünn geschnittenes Kalbfleisch auf gerösteten Pide-Würfeln, übergossen mit Tomatensauce und zischender Salbeibutter, dazu cremiger Joghurt. Ein Klassiker aus Bursa, der süchtig macht.",
    basePrice: 2190,
    calories: 890,
    prepTime: 20,
    portion: "420 g",
    spice: "MILD",
    flags: { featured: true, popular: true },
    image: img("photo-1599487488170-d11ec9c172f0"),
    imageAlt: "İskender Kebap mit Joghurt, Tomatensauce und brauner Butter",
    ingredients: [
      { name: "Rinderhackfleisch" },
      { name: "Fladenbrot" },
      { name: "Joghurt", removable: true },
      { name: "Butter" },
      { name: "Tomaten" },
    ],
    allergens: ["A", "G"],
    addons: [{ name: "Extra Fleisch (80 g)", price: 490 }],
  },
  {
    slug: "manti",
    name: "Mantı",
    nameEn: "Manti Dumplings",
    cuisine: "turkish",
    category: "hauptgerichte",
    short: "Handgemachte Teigtaschen mit Knoblauchjoghurt und Paprikabutter.",
    shortEn: "Handmade dumplings with garlic yoghurt and paprika butter.",
    description:
      "Winzige, von Hand gefüllte Teigtaschen mit gewürztem Rinderhack, serviert unter Knoblauchjoghurt, heißer Paprikabutter, Minze und Sumach — nach dem Rezept unserer Großmutter aus Kayseri.",
    basePrice: 1690,
    calories: 720,
    prepTime: 25,
    portion: "350 g",
    spice: "MILD",
    flags: { isNew: true, chef: true },
    image: img("photo-1534422298391-e4f8c172dddb"),
    imageAlt: "Mantı — türkische Teigtaschen mit Joghurt und Paprikabutter",
    ingredients: [
      { name: "Rinderhackfleisch" },
      { name: "Joghurt" },
      { name: "Knoblauch", removable: true },
      { name: "Minze" },
      { name: "Butter" },
    ],
    allergens: ["A", "C", "G"],
  },
  {
    slug: "lahmacun",
    name: "Lahmacun",
    nameEn: "Lahmacun",
    cuisine: "turkish",
    category: "vorspeisen",
    short:
      "Hauchdünner Teigfladen mit würzigem Hackfleisch, Zitrone und Petersilie.",
    shortEn: "Paper-thin flatbread with spiced minced meat, lemon and parsley.",
    description:
      "Knusprig aus dem Steinofen: hauchdünner Teig mit fein gewürztem Hackfleisch, Tomaten und Paprika. Mit Petersilie, Sumach-Zwiebeln und einem Spritzer Zitrone einfach aufrollen und genießen.",
    basePrice: 750,
    discountPrice: 590,
    calories: 320,
    prepTime: 12,
    portion: "1 Stück",
    spice: "MEDIUM",
    flags: { popular: true, daily: true },
    image: img("photo-1530469912745-a215c6b256ea"),
    imageAlt: "Lahmacun mit Petersilie, Zwiebeln und Zitrone",
    ingredients: [
      { name: "Rinderhackfleisch" },
      { name: "Tomaten" },
      { name: "Paprika" },
      { name: "Petersilie", removable: true },
      { name: "Zwiebeln", removable: true },
    ],
    allergens: ["A"],
    addons: [{ name: "Ayran (0,3 l)", price: 290 }],
  },
  {
    slug: "mercimek-corbasi",
    name: "Mercimek Çorbası",
    nameEn: "Red Lentil Soup",
    cuisine: "turkish",
    category: "vorspeisen",
    short: "Cremige rote Linsensuppe mit Minzbutter und Zitrone.",
    shortEn: "Creamy red lentil soup with mint butter and lemon.",
    description:
      "Samtige Suppe aus roten Linsen, Karotten und orientalischen Gewürzen, verfeinert mit Minzbutter. Dazu Zitrone und ofenwarmes Brot — Soulfood auf Türkisch.",
    basePrice: 650,
    calories: 280,
    prepTime: 10,
    portion: "400 ml",
    spice: "NONE",
    flags: { vegetarian: true, glutenFree: true },
    image: img("photo-1547592166-23ac45744acd"),
    imageAlt: "Rote Linsensuppe mit Minze und Zitrone",
    ingredients: [
      { name: "Rote Linsen" },
      { name: "Zwiebeln" },
      { name: "Butter", removable: true },
      { name: "Minze" },
      { name: "Zitrone" },
    ],
    allergens: ["G", "I"],
  },
  {
    slug: "kunefe",
    name: "Künefe",
    nameEn: "Kunefe",
    cuisine: "turkish",
    category: "desserts",
    short: "Warmes Engelshaar-Dessert mit geschmolzenem Käse und Pistazien.",
    shortEn: "Warm shredded-pastry dessert with melted cheese and pistachios.",
    description:
      "Knuspriger Kadayif-Teig, gefüllt mit mildem Schmelzkäse, in Sirup getränkt und mit Antep-Pistazien bestreut. Frisch aus der Kupferpfanne, noch heiß serviert — dazu passt türkischer Mokka.",
    basePrice: 990,
    calories: 540,
    prepTime: 18,
    portion: "1 Pfanne",
    spice: "NONE",
    flags: { featured: true, vegetarian: true, popular: true },
    image: img("photo-1519676867240-f03562e64548"),
    imageAlt: "Künefe mit Pistazien in der Kupferpfanne",
    ingredients: [
      { name: "Kadayif-Teig" },
      { name: "Käse (Künefe)" },
      { name: "Pistazien" },
      { name: "Honig" },
    ],
    allergens: ["A", "G", "H"],
    addons: [{ name: "Kugel Vanilleeis", price: 250 }],
  },
  {
    slug: "turkish-mokka",
    name: "Türkischer Mokka",
    nameEn: "Turkish Coffee",
    cuisine: "turkish",
    category: "kaffee-tee",
    short: "Im Kupferkännchen aufgebrühter Mokka mit Lokum.",
    shortEn: "Coffee brewed in a copper cezve, served with Turkish delight.",
    description:
      "Fein gemahlene Mokkabohnen, langsam im Kupferkännchen (Cezve) aufgebrüht und mit einem Stück Rosen-Lokum serviert. UNESCO-Weltkulturerbe in der Tasse.",
    basePrice: 420,
    calories: 60,
    prepTime: 8,
    portion: "80 ml",
    spice: "NONE",
    flags: { vegetarian: true, vegan: true, glutenFree: true },
    image: img("photo-1541167760496-1628856ab772"),
    imageAlt: "Türkischer Mokka im Kupferkännchen mit Lokum",
    ingredients: [{ name: "Mokkabohnen" }, { name: "Rosenwasser" }],
    allergens: [],
    optionGroups: [
      {
        name: "Süße",
        min: 1,
        max: 1,
        required: true,
        options: [
          { name: "Ohne Zucker (sade)", delta: 0 },
          { name: "Mittelsüß (orta)", delta: 0, isDefault: true },
          { name: "Süß (şekerli)", delta: 0 },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱 Seeding Sofra Royale …");

  // --- Users -----------------------------------------------------------
  const admin = await upsertUser({
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@sofra-royale.example",
    name: "Sofra Admin",
    password: process.env.SEED_ADMIN_PASSWORD ?? "Admin!Sofra2026",
    role: "SUPER_ADMIN",
  });
  const demo = await upsertUser({
    email: process.env.SEED_CUSTOMER_EMAIL ?? "demo@sofra-royale.example",
    name: "Deniz Yılmaz",
    password: process.env.SEED_CUSTOMER_PASSWORD ?? "Demo!Sofra2026",
    role: "CUSTOMER",
  });
  console.log(`  👤 users: ${admin.email}, ${demo.email}`);

  // --- RBAC ------------------------------------------------------------
  const permissionKeys = [
    "orders:read",
    "orders:write",
    "orders:refund",
    "menu:read",
    "menu:write",
    "customers:read",
    "customers:write",
    "reservations:read",
    "reservations:write",
    "chat:read",
    "chat:write",
    "content:write",
    "settings:write",
    "analytics:read",
    "staff:manage",
  ];
  for (const key of permissionKeys) {
    await db.permission.upsert({ where: { key }, update: {}, create: { key } });
  }
  const allPermissions = await db.permission.findMany();
  const kitchenPerms = allPermissions.filter((p) =>
    ["orders:read", "orders:write", "menu:read"].includes(p.key),
  );
  await db.role.upsert({
    where: { name: "Kitchen Staff" },
    update: {},
    create: {
      name: "Kitchen Staff",
      description: "Bestellungen einsehen und Status aktualisieren",
      isSystem: true,
      permissions: {
        create: kitchenPerms.map((p) => ({ permissionId: p.id })),
      },
    },
  });
  await db.role.upsert({
    where: { name: "Restaurant Manager" },
    update: {},
    create: {
      name: "Restaurant Manager",
      description: "Voller operativer Zugriff ohne Systemeinstellungen",
      isSystem: true,
      permissions: {
        create: allPermissions
          .filter((p) => p.key !== "settings:write" && p.key !== "staff:manage")
          .map((p) => ({ permissionId: p.id })),
      },
    },
  });
  console.log("  🔐 roles & permissions");

  // --- Allergens & ingredients ------------------------------------------
  for (const a of ALLERGENS) {
    await db.allergen.upsert({
      where: { code: a.code },
      update: { name: a.name },
      create: a,
    });
  }
  for (const name of INGREDIENTS) {
    await db.ingredient.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(
    `  🥘 ${ALLERGENS.length} allergens, ${INGREDIENTS.length} ingredients`,
  );

  // --- Cuisines & categories --------------------------------------------
  const cuisines = [
    {
      slug: "dubai",
      name: "Dubai Cuisine",
      description:
        "Die Aromen der Golfregion: Safran, Datteln, Kardamom und langsam geschmortes Fleisch.",
      translations: [
        { locale: "en" as const, name: "Dubai Cuisine" },
        { locale: "tr" as const, name: "Dubai Mutfağı" },
        { locale: "ar" as const, name: "المطبخ الإماراتي" },
      ],
    },
    {
      slug: "turkish",
      name: "Türkische Küche",
      description:
        "Anatolische Grillkunst, handgemachte Teigtaschen und legendäre Süßspeisen.",
      translations: [
        { locale: "en" as const, name: "Turkish Cuisine" },
        { locale: "tr" as const, name: "Türk Mutfağı" },
        { locale: "ar" as const, name: "المطبخ التركي" },
      ],
    },
  ];
  const cuisineMap = new Map<string, string>();
  for (const [i, c] of cuisines.entries()) {
    const row = await db.cuisine.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, sortOrder: i },
      create: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        sortOrder: i,
      },
    });
    cuisineMap.set(c.slug, row.id);
    for (const t of c.translations) {
      await db.cuisineTranslation.upsert({
        where: { cuisineId_locale: { cuisineId: row.id, locale: t.locale } },
        update: { name: t.name },
        create: { cuisineId: row.id, locale: t.locale, name: t.name },
      });
    }
  }

  const categories = [
    { slug: "vorspeisen", name: "Vorspeisen & Meze", en: "Starters & Meze" },
    { slug: "grill", name: "Vom Holzkohlegrill", en: "Charcoal Grill" },
    { slug: "hauptgerichte", name: "Hauptgerichte", en: "Main Dishes" },
    { slug: "desserts", name: "Desserts", en: "Desserts" },
    { slug: "kaffee-tee", name: "Kaffee & Tee", en: "Coffee & Tea" },
    { slug: "getraenke", name: "Getränke", en: "Drinks" },
  ];
  const categoryMap = new Map<string, string>();
  for (const [i, c] of categories.entries()) {
    const row = await db.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: i },
      create: { slug: c.slug, name: c.name, sortOrder: i },
    });
    categoryMap.set(c.slug, row.id);
    await db.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: row.id, locale: "en" } },
      update: { name: c.en },
      create: { categoryId: row.id, locale: "en", name: c.en },
    });
  }
  console.log(
    `  📂 ${cuisines.length} cuisines, ${categories.length} categories`,
  );

  // --- Products -----------------------------------------------------------
  for (const p of PRODUCTS) {
    const categoryId = categoryMap.get(p.category);
    const cuisineId = cuisineMap.get(p.cuisine);
    if (!categoryId || !cuisineId) {
      throw new Error(`Missing category/cuisine for ${p.slug}`);
    }

    // Idempotency: rebuild child collections on re-seed.
    const existing = await db.product.findUnique({ where: { slug: p.slug } });
    if (existing) {
      await db.product.delete({ where: { id: existing.id } });
    }

    const data: Prisma.ProductCreateInput = {
      slug: p.slug,
      name: p.name,
      shortDescription: p.short,
      description: p.description,
      category: { connect: { id: categoryId } },
      cuisine: { connect: { id: cuisineId } },
      basePrice: p.basePrice,
      discountPrice: p.discountPrice ?? null,
      calories: p.calories,
      preparationTime: p.prepTime,
      portionSize: p.portion,
      spiceLevel: p.spice,
      status: "PUBLISHED",
      isAvailable: true,
      isFeatured: p.flags?.featured ?? false,
      isPopular: p.flags?.popular ?? false,
      isNew: p.flags?.isNew ?? false,
      isVegetarian: p.flags?.vegetarian ?? false,
      isVegan: p.flags?.vegan ?? false,
      isGlutenFree: p.flags?.glutenFree ?? false,
      isHalal: true,
      isChefRecommendation: p.flags?.chef ?? false,
      isDailySpecial: p.flags?.daily ?? false,
      metaTitle: `${p.name} bestellen | Sofra Royale`,
      metaDescription: p.short,
      images: {
        create: [
          { url: p.image, altText: p.imageAlt, isFeatured: true, sortOrder: 0 },
        ],
      },
      translations: {
        create: [
          {
            locale: "en",
            name: p.nameEn,
            shortDescription: p.shortEn,
            description: p.shortEn,
          },
        ],
      },
      ingredients: {
        create: p.ingredients.map((ing) => ({
          isRemovable: ing.removable ?? false,
          ingredient: { connect: { name: ing.name } },
        })),
      },
      allergens: {
        create: p.allergens.map((code) => ({
          allergen: { connect: { code } },
        })),
      },
      variations: p.variations
        ? {
            create: p.variations.map((v, i) => ({
              name: v.name,
              price: v.price,
              isDefault: v.isDefault ?? false,
              sortOrder: i,
            })),
          }
        : undefined,
      optionGroups: p.optionGroups
        ? {
            create: p.optionGroups.map((g, gi) => ({
              name: g.name,
              minSelect: g.min,
              maxSelect: g.max,
              isRequired: g.required ?? false,
              sortOrder: gi,
              options: {
                create: g.options.map((o, oi) => ({
                  name: o.name,
                  priceDelta: o.delta,
                  isDefault: o.isDefault ?? false,
                  sortOrder: oi,
                })),
              },
            })),
          }
        : undefined,
      addons: p.addons
        ? {
            create: p.addons.map((a, i) => ({
              name: a.name,
              price: a.price,
              sortOrder: i,
            })),
          }
        : undefined,
    };

    await db.product.create({ data });
  }
  console.log(
    `  🍽️  ${PRODUCTS.length} products (with images, options, add-ons)`,
  );

  // --- Related products ---------------------------------------------------
  const bySlug = async (slug: string) =>
    (await db.product.findUniqueOrThrow({ where: { slug } })).id;
  const relations: Array<[string, string]> = [
    ["adana-kebap", "mercimek-corbasi"],
    ["adana-kebap", "kunefe"],
    ["iskender-kebap", "kunefe"],
    ["chicken-machboos", "hummus-royale"],
    ["lamb-ouzi", "luqaimat"],
    ["kunefe", "turkish-mokka"],
    ["luqaimat", "karak-chai"],
  ];
  for (const [from, to] of relations) {
    const [productId, relatedId] = await Promise.all([
      bySlug(from),
      bySlug(to),
    ]);
    await db.productRelation.upsert({
      where: { productId_relatedId: { productId, relatedId } },
      update: {},
      create: { productId, relatedId },
    });
  }

  // --- Coupons -------------------------------------------------------------
  const coupons: Prisma.CouponCreateInput[] = [
    {
      code: "WILLKOMMEN10",
      description: "10 % Rabatt auf die erste Bestellung",
      type: "PERCENTAGE",
      value: 10,
      minOrderAmount: 2000,
      maxDiscountAmount: 1000,
      isFirstOrderOnly: true,
      usageLimitPerUser: 1,
      isActive: true,
    },
    {
      code: "SOFRA5",
      description: "5 € Rabatt ab 30 € Bestellwert",
      type: "FIXED_AMOUNT",
      value: 500,
      minOrderAmount: 3000,
      usageLimit: 500,
      usageLimitPerUser: 2,
      isActive: true,
    },
    {
      code: "GRATISLIEFERUNG",
      description: "Kostenlose Lieferung ab 25 €",
      type: "FREE_DELIVERY",
      value: 0,
      minOrderAmount: 2500,
      isActive: true,
    },
  ];
  for (const c of coupons) {
    await db.coupon.upsert({ where: { code: c.code }, update: {}, create: c });
  }
  console.log(`  🎟️  ${coupons.length} coupons`);

  // --- Delivery zones & taxes ----------------------------------------------
  const zones = [
    {
      name: "Düsseldorf Zentrum",
      postalCodes: ["40210", "40211", "40212", "40213", "40215"],
      deliveryFee: 250,
      minOrderAmount: 1500,
      freeDeliveryThreshold: 4000,
      estimatedMinutes: 35,
    },
    {
      name: "Düsseldorf Nord",
      postalCodes: ["40468", "40470", "40474", "40476", "40477", "40479"],
      deliveryFee: 350,
      minOrderAmount: 2000,
      freeDeliveryThreshold: 5000,
      estimatedMinutes: 45,
    },
    {
      name: "Düsseldorf Süd",
      postalCodes: ["40589", "40591", "40593", "40597", "40599"],
      deliveryFee: 390,
      minOrderAmount: 2500,
      freeDeliveryThreshold: 5500,
      estimatedMinutes: 55,
    },
  ];
  for (const z of zones) {
    const existing = await db.deliveryZone.findFirst({
      where: { name: z.name },
    });
    if (existing) {
      await db.deliveryZone.update({ where: { id: existing.id }, data: z });
    } else {
      await db.deliveryZone.create({ data: z });
    }
  }

  const taxes = [
    {
      name: "USt. Speisen (Lieferung/Abholung)",
      rate: 7.0,
      appliesTo: "FOOD_DELIVERY",
    },
    { name: "USt. Getränke", rate: 19.0, appliesTo: "DRINKS" },
    { name: "USt. Verzehr im Restaurant", rate: 19.0, appliesTo: "DINE_IN" },
  ];
  for (const t of taxes) {
    await db.tax.upsert({
      where: { name_appliesTo: { name: t.name, appliesTo: t.appliesTo } },
      update: { rate: t.rate },
      create: t,
    });
  }
  console.log(`  🚚 ${zones.length} delivery zones, ${taxes.length} tax rates`);

  // --- Tables ---------------------------------------------------------------
  const tables = [
    { name: "Tisch 1", capacity: 2, area: "INDOOR" as const },
    { name: "Tisch 2", capacity: 2, area: "INDOOR" as const },
    { name: "Tisch 3", capacity: 4, area: "INDOOR" as const },
    { name: "Tisch 4", capacity: 4, area: "INDOOR" as const },
    { name: "Tisch 5", capacity: 6, area: "INDOOR" as const },
    { name: "Sofra-Lounge", capacity: 8, area: "INDOOR" as const },
    { name: "Terrasse 1", capacity: 4, area: "OUTDOOR" as const },
    { name: "Terrasse 2", capacity: 4, area: "OUTDOOR" as const },
  ];
  for (const t of tables) {
    await db.restaurantTable.upsert({
      where: { name: t.name },
      update: { capacity: t.capacity, area: t.area },
      create: t,
    });
  }

  // --- Demo customer extras ---------------------------------------------------
  await db.address.deleteMany({ where: { userId: demo.id } });
  await db.address.create({
    data: {
      userId: demo.id,
      type: "HOME",
      label: "Zuhause",
      recipientName: "Deniz Yılmaz",
      phone: "+49 172 5550123",
      street: "Ackerstraße",
      houseNumber: "18",
      postalCode: "40211",
      city: "Düsseldorf",
      isDefault: true,
    },
  });
  const favSlugs = ["adana-kebap", "kunefe"];
  for (const slug of favSlugs) {
    const productId = await bySlug(slug);
    await db.favorite.upsert({
      where: { userId_productId: { userId: demo.id, productId } },
      update: {},
      create: { userId: demo.id, productId },
    });
  }

  // --- Reviews (pre-approved demo content) -------------------------------------
  const reviewData = [
    {
      slug: "adana-kebap",
      rating: 5,
      title: "Wie in Adana!",
      body: "Perfekt gewürzt, rauchig vom Holzkohlegrill — besser bekommt man es in Düsseldorf nicht.",
    },
    {
      slug: "kunefe",
      rating: 5,
      title: "Das beste Künefe der Stadt",
      body: "Heiß serviert, der Käse zieht Fäden, die Pistazien sind großzügig. Absolute Empfehlung!",
    },
    {
      slug: "chicken-machboos",
      rating: 4,
      title: "Toller Safranreis",
      body: "Sehr aromatisch und zart. Beim nächsten Mal probiere ich die große Portion.",
    },
  ];
  for (const r of reviewData) {
    const productId = await bySlug(r.slug);
    const existing = await db.review.findFirst({
      where: { productId, userId: demo.id },
    });
    if (!existing) {
      await db.review.create({
        data: {
          productId,
          userId: demo.id,
          rating: r.rating,
          title: r.title,
          body: r.body,
          status: "APPROVED",
        },
      });
    }
    const agg = await db.review.aggregate({
      where: { productId, status: "APPROVED" },
      _avg: { rating: true },
      _count: true,
    });
    await db.product.update({
      where: { id: productId },
      data: {
        averageRating: agg._avg.rating ?? 0,
        reviewCount: agg._count,
      },
    });
  }
  console.log("  ⭐ demo reviews with recomputed aggregates");

  // --- CMS settings, pages, FAQs ------------------------------------------------
  const settings: Array<{ key: string; value: Prisma.InputJsonValue }> = [
    {
      key: "restaurant.contact",
      value: {
        address: "Königsallee 42, 40212 Düsseldorf",
        phone: "+49 211 555 012 34",
        email: "kontakt@sofra-royale.example",
      },
    },
    {
      key: "restaurant.openingHours",
      value: {
        mon: ["11:30", "22:30"],
        tue: ["11:30", "22:30"],
        wed: ["11:30", "22:30"],
        thu: ["11:30", "22:30"],
        fri: ["11:30", "23:30"],
        sat: ["11:30", "23:30"],
        sun: ["12:00", "22:00"],
      },
    },
    {
      key: "homepage.hero",
      value: {
        title: "Wo Dubai auf den Bosporus trifft",
        subtitle:
          "Premium-Gerichte aus der Golfregion und Anatolien — 100 % halal, frisch zubereitet, elegant serviert.",
        imageUrl: img("photo-1544025162-d76694265947"),
      },
    },
    {
      key: "loyalty.rules",
      value: {
        pointsPerEuro: 1,
        redeemRate: 100,
        minRedeem: 200,
        expiryMonths: 12,
      },
    },
    {
      key: "checkout.fees",
      value: { serviceFeePercent: 0, tipPresets: [0, 5, 10, 15] },
    },
  ];
  for (const s of settings) {
    await db.siteSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }

  const faqs = [
    {
      question: "Sind alle Gerichte halal?",
      answer:
        "Ja — sämtliche Fleischprodukte stammen von halal-zertifizierten Lieferanten, und wir verwenden keinen Alkohol in der Küche.",
      category: "Allgemein",
    },
    {
      question: "Liefern Sie in meinen Stadtteil?",
      answer:
        "Wir liefern aktuell in weite Teile Düsseldorfs. Geben Sie Ihre Postleitzahl im Checkout ein — dort sehen Sie Liefergebühr und Mindestbestellwert für Ihre Zone.",
      category: "Lieferung",
    },
    {
      question: "Kann ich einen Tisch reservieren?",
      answer:
        "Ja, innen wie auf der Terrasse. Die Online-Reservierung finden Sie demnächst direkt hier auf der Website; telefonisch sind wir jederzeit erreichbar.",
      category: "Reservierung",
    },
  ];
  for (const [i, f] of faqs.entries()) {
    const existing = await db.faq.findFirst({
      where: { question: f.question },
    });
    if (!existing) {
      await db.faq.create({ data: { ...f, sortOrder: i } });
    }
  }
  console.log("  📝 site settings, FAQs");

  console.log("✅ Seed complete.");
  console.log("   Admin login:  ", admin.email);
  console.log("   Demo customer:", demo.email);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
