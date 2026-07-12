/* =========================================================
   SHARED DATA LAYER — one localStorage-backed "DB" used by
   BOTH the storefront (product grid, checkout) and the admin
   panel (#adminView). Anything an admin adds/edits/removes
   shows up on the storefront immediately, and every checkout
   creates a real order the admin panel can see.
   Mirrors the shape of the real tRPC procedures so it's a
   drop-in swap later (products.list/create/update/delete,
   orders.list/create/updateStatus, stats.*).
========================================================= */
const DB_KEY = 'cocoAdminDB_v1';
const CATEGORY_LABELS = {dark:'داكنة',milk:'حليب',white:'بيضاء',truffles:'ترافل',caramel:'كراميل',gifts:'هدايا'};
const STATUS_LABELS = {PENDING:'قيد الانتظار',CONFIRMED:'مؤكد',PROCESSING:'قيد التجهيز',SHIPPED:'تم الشحن',DELIVERED:'تم التسليم',CANCELLED:'ملغي'};
const STATUS_FLOW = ['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED'];

function daysAgoISO(n,hour){ const d=new Date(); d.setDate(d.getDate()-n); d.setHours(hour||12,20,0,0); return d.toISOString(); }

function seedDB(){
  const products = [
    {id:'p1',name:'The Signature Box',nameAr:'صندوق التوقيع',desc:'16 قطعة مصنوعة يدويًا، متعة خالصة',price:400,category:'gifts',stock:24,icon:'📦',image:'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&q=85&fit=crop',bestseller:true,isNew:false,featured:true},
    {id:'p2',name:'Velvet Truffles',nameAr:'كرات الشوكولاتة المخملية',desc:'كراميل مملح و ganache داكن',price:200,category:'truffles',stock:40,icon:'🍫',image:'https://images.unsplash.com/photo-1548741487-18d363dc4469?w=600&q=85&fit=crop',bestseller:false,isNew:false,featured:false},
    {id:'p3',name:'Noir Intense Bar',nameAr:'لوح الداكنة المكثفة',desc:'72% كاكاو من الإكوادور',price:540,category:'dark',stock:8,icon:'🍫',image:'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=600&q=85&fit=crop',bestseller:false,isNew:true,featured:false},
    {id:'p4',name:'Grand Gift Set',nameAr:'طقم الهدايا الفاخر',desc:'تجربة الشوكولاتة المطلقة',price:600,category:'gifts',stock:15,icon:'🎁',image:'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=600&q=85&fit=crop',bestseller:false,isNew:false,featured:true},
    {id:'p5',name:'Milk Praline Bar',nameAr:'لوح شوكولاتة الحليب بالبرالين',desc:'حليب مخملي مع قطع البندق المحمص',price:280,category:'milk',stock:32,icon:'🍫',image:'https://images.unsplash.com/photo-1511381939415-e44015466834?w=600&q=85&fit=crop',bestseller:false,isNew:false,featured:false},
    {id:'p6',name:'White Rose Bites',nameAr:'قطع الشوكولاتة البيضاء بالورد',desc:'شوكولاتة بيضاء كريمية بلمسة ماء الورد',price:260,category:'white',stock:5,icon:'🤍',image:'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=600&q=85&fit=crop',bestseller:false,isNew:true,featured:false},
    {id:'p7',name:'Salted Caramel Bites',nameAr:'قطع الكراميل المملح المغطاة بالشوكولاتة',desc:'كراميل ذائب بلمسة ملح البحر',price:230,category:'caramel',stock:18,icon:'🍬',image:'https://images.unsplash.com/photo-1575377222312-dd1a63a51638?w=600&q=85&fit=crop',bestseller:false,isNew:false,featured:false},
  ];

  const seedOrders = [
    {customerName:'سارة محمود',phone:'01012345678',items:[{productId:'p1',qty:1},{productId:'p2',qty:2}],status:'DELIVERED',day:13},
    {customerName:'أحمد طارق',phone:'01098765432',items:[{productId:'p3',qty:1}],status:'DELIVERED',day:12},
    {customerName:'ليلى حسن',phone:'01155512345',items:[{productId:'p4',qty:1}],status:'DELIVERED',day:11},
    {customerName:'مصطفى كامل',phone:'01234567890',items:[{productId:'p5',qty:2},{productId:'p7',qty:1}],status:'DELIVERED',day:10},
    {customerName:'نور الدين',phone:'01512223344',items:[{productId:'p2',qty:3}],status:'SHIPPED',day:9},
    {customerName:'هبة سمير',phone:'01067891234',items:[{productId:'p6',qty:2}],status:'DELIVERED',day:8},
    {customerName:'كريم عادل',phone:'01198765123',items:[{productId:'p1',qty:1}],status:'CANCELLED',day:7},
    {customerName:'ياسمين فؤاد',phone:'01223344556',items:[{productId:'p3',qty:2},{productId:'p6',qty:1}],status:'DELIVERED',day:7},
    {customerName:'عمر شريف',phone:'01034567891',items:[{productId:'p4',qty:1},{productId:'p2',qty:1}],status:'SHIPPED',day:6},
    {customerName:'دينا وليد',phone:'01587654321',items:[{productId:'p7',qty:3}],status:'PROCESSING',day:5},
    {customerName:'محمود إبراهيم',phone:'01145678923',items:[{productId:'p1',qty:2}],status:'PROCESSING',day:4},
    {customerName:'رنا عبدالله',phone:'01276543210',items:[{productId:'p5',qty:1}],status:'CONFIRMED',day:3},
    {customerName:'طارق سعيد',phone:'01011223344',items:[{productId:'p2',qty:1},{productId:'p3',qty:1}],status:'CONFIRMED',day:2},
    {customerName:'سلمى ناصر',phone:'01599887766',items:[{productId:'p6',qty:1},{productId:'p7',qty:1}],status:'PENDING',day:1},
    {customerName:'يوسف مجدي',phone:'01123456789',items:[{productId:'p1',qty:1}],status:'PENDING',day:0},
    {customerName:'مريم عصام',phone:'01034512367',items:[{productId:'p4',qty:1},{productId:'p1',qty:1}],status:'PENDING',day:0},
  ];

  const orders = seedOrders.map((o,idx)=>{
    const items = o.items.map(it=>{
      const p = products.find(pp=>pp.id===it.productId);
      return {productId:it.productId,qty:it.qty,unitPrice:p.price};
    });
    const subtotal = items.reduce((s,i)=>s+i.unitPrice*i.qty,0);
    const deliveryFee = subtotal>0?40:0;
    return {
      id:'o'+(idx+1),
      orderNumber: 1000+idx+1,
      customerName:o.customerName,
      phone:o.phone,
      items,
      status:o.status,
      source: idx%4===0 ? 'WHATSAPP':'WEBSITE',
      subtotal, deliveryFee, total: subtotal+deliveryFee,
      createdAt: daysAgoISO(o.day, 10+(idx%9)),
      statusLog:[{status:'PENDING',at:daysAgoISO(o.day,10)}, ...(o.status!=='PENDING'?[{status:o.status,at:daysAgoISO(o.day,10+(idx%9))}]:[])]
    };
  });

  return {products, orders};
}

function loadDB(){
  let raw = localStorage.getItem(DB_KEY);
  if(!raw){
    const seeded = seedDB();
    localStorage.setItem(DB_KEY, JSON.stringify(seeded));
    return seeded;
  }
  return JSON.parse(raw);
}
function saveDB(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }

let DB = loadDB();

// ---- mock "tRPC" API (shared by storefront + admin) ----
const api = {
  products: {
    list({search='', category='all'}={}){
      const q = search.trim().toLowerCase();
      return DB.products.filter(p=>{
        const matchCat = category==='all' || p.category===category;
        const text = (p.name+' '+p.nameAr+' '+p.desc).toLowerCase();
        const matchQ = !q || text.includes(q);
        return matchCat && matchQ;
      });
    },
    create(data){
      const id = 'p'+Date.now();
      DB.products.push({id, ...data});
      saveDB(DB);
      return id;
    },
    update(id, data){
      const idx = DB.products.findIndex(p=>p.id===id);
      if(idx>-1){ DB.products[idx] = {...DB.products[idx], ...data}; saveDB(DB); }
    },
    delete(id){
      DB.products = DB.products.filter(p=>p.id!==id);
      saveDB(DB);
    },
  },
  orders: {
    list({status='all', search='', date=null}={}){
      const q = search.trim().toLowerCase();
      return DB.orders
        .filter(o=> (status==='all'||o.status===status) && (!q || (o.customerName+' '+o.phone).toLowerCase().includes(q)) && (!date || o.createdAt.slice(0,10)===date))
        .sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
    },
    getById(id){ return DB.orders.find(o=>o.id===id); },
    // Called from the storefront checkout — creates a REAL order the admin sees.
    create({customerName, phone, items, source='WEBSITE'}){
      const orderItems = items.map(it=>({productId:it.id, qty:it.qty, unitPrice:it.price}));
      const subtotal = orderItems.reduce((s,i)=>s+i.unitPrice*i.qty,0);
      const deliveryFee = subtotal>0?40:0;
      const id = 'o'+Date.now();
      const orderNumber = 1000 + DB.orders.length + 1;
      const now = new Date().toISOString();
      const order = {
        id, orderNumber, customerName, phone, items:orderItems, status:'PENDING', source,
        subtotal, deliveryFee, total: subtotal+deliveryFee, createdAt: now,
        statusLog:[{status:'PENDING', at:now}]
      };
      // decrement stock for real products
      orderItems.forEach(it=>{
        const p = DB.products.find(pp=>pp.id===it.productId);
        if(p) p.stock = Math.max(0, p.stock - it.qty);
      });
      DB.orders.push(order);
      saveDB(DB);
      return order;
    },
    updateStatus(id, status){
      const order = DB.orders.find(o=>o.id===id);
      if(!order) return;
      const wasCancelled = order.status==='CANCELLED';
      order.status = status;
      order.statusLog.push({status, at:new Date().toISOString()});
      if(status==='CANCELLED' && !wasCancelled){
        order.items.forEach(it=>{
          const p = DB.products.find(pp=>pp.id===it.productId);
          if(p) p.stock += it.qty;
        });
      }
      saveDB(DB);
    },
  },
  stats: {
    summary(){
      const active = DB.orders.filter(o=>o.status!=='CANCELLED');
      const totalRevenue = active.reduce((s,o)=>s+o.total,0);
      const totalOrders = active.length;
      const avgOrderValue = totalOrders? totalRevenue/totalOrders : 0;
      const pendingOrders = DB.orders.filter(o=>o.status==='PENDING').length;
      const lowStockCount = DB.products.filter(p=>p.stock<=10).length;
      const uniqueCustomers = new Set(DB.orders.map(o=>o.phone)).size;
      const websiteOrders = DB.orders.filter(o=>o.source==='WEBSITE').length;
      const whatsappOrders = DB.orders.filter(o=>o.source==='WHATSAPP').length;

      // ---- extra metrics for the richer KPI cards (additive, doesn't change existing fields) ----
      const completedOrders = DB.orders.filter(o=>o.status==='DELIVERED'||o.status==='COMPLETED').length;
      const totalProducts = DB.products.length;
      const totalUnitsSold = active.reduce((s,o)=>s+o.items.reduce((si,it)=>si+it.qty,0),0);

      const dayKey = (d)=>d.toISOString().slice(0,10);
      const today = new Date();
      const todayKey = dayKey(today);
      const y = new Date(today); y.setDate(y.getDate()-1);
      const yKey = dayKey(y);
      const ordersToday = DB.orders.filter(o=>o.createdAt.slice(0,10)===todayKey && o.status!=='CANCELLED');
      const ordersYesterday = DB.orders.filter(o=>o.createdAt.slice(0,10)===yKey && o.status!=='CANCELLED');
      const revenueToday = ordersToday.reduce((s,o)=>s+o.total,0);
      const revenueYesterday = ordersYesterday.reduce((s,o)=>s+o.total,0);
      const customersToday = new Set(ordersToday.map(o=>o.phone)).size;
      const customersYesterday = new Set(ordersYesterday.map(o=>o.phone)).size;
      const pct = (t,y)=> y>0 ? ((t-y)/y*100) : (t>0?100:0);

      return {
        totalRevenue, totalOrders, avgOrderValue, pendingOrders, lowStockCount, uniqueCustomers, websiteOrders, whatsappOrders,
        completedOrders, totalProducts, totalUnitsSold,
        deltaRevenue: pct(revenueToday, revenueYesterday),
        deltaOrders: pct(ordersToday.length, ordersYesterday.length),
        deltaCustomers: pct(customersToday, customersYesterday)
      };
    },
    revenueByDay(days=14){
      const revBuckets = {}; const orderBuckets = {};
      const today = new Date();
      for(let i=days-1;i>=0;i--){
        const d = new Date(today); d.setDate(d.getDate()-i);
        const key = d.toISOString().slice(0,10);
        revBuckets[key] = 0; orderBuckets[key] = 0;
      }
      DB.orders.filter(o=>o.status!=='CANCELLED').forEach(o=>{
        const key = o.createdAt.slice(0,10);
        if(key in revBuckets){ revBuckets[key]+=o.total; orderBuckets[key]+=1; }
      });
      return Object.keys(revBuckets).map(date=>({date, total:revBuckets[date], orders:orderBuckets[date]}));
    },
    revenueByCategory(){
      const byCat = {};
      DB.orders.filter(o=>o.status!=='CANCELLED').forEach(o=>{
        o.items.forEach(it=>{
          const p = DB.products.find(pp=>pp.id===it.productId);
          if(!p) return;
          byCat[p.category] = (byCat[p.category]||0) + it.unitPrice*it.qty;
        });
      });
      return Object.entries(byCat).map(([category,total])=>({category,total})).sort((a,b)=>b.total-a.total);
    },
    topProducts(limit=5){
      const unitsByProduct = {};
      DB.orders.filter(o=>o.status!=='CANCELLED').forEach(o=>{
        o.items.forEach(it=>{ unitsByProduct[it.productId] = (unitsByProduct[it.productId]||0)+it.qty; });
      });
      return Object.entries(unitsByProduct)
        .map(([productId,units])=>({product:DB.products.find(p=>p.id===productId), units}))
        .filter(x=>x.product)
        .sort((a,b)=>b.units-a.units)
        .slice(0,limit);
    },
    topCustomers(limit=5){
      const byPhone = {};
      DB.orders.filter(o=>o.status!=='CANCELLED').forEach(o=>{
        if(!byPhone[o.phone]) byPhone[o.phone] = {name:o.customerName, phone:o.phone, total:0, orders:0};
        byPhone[o.phone].total += o.total;
        byPhone[o.phone].orders += 1;
      });
      return Object.values(byPhone).sort((a,b)=>b.total-a.total).slice(0,limit);
    },
    recentActivity(limit=6){
      return [...DB.orders].sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)).slice(0,limit);
    }
  }
};

// ===== LANGUAGE TRANSLATIONS 
const translations = {
  ar: {
    navProducts: "المجموعة", navCollections: "الأصناف", navStory: "قصتنا", navBuild: "صمّم صندوقك", navGifts: "هدايا", navTestimonials: "آراء العملاء", navContact: "تواصل معنا",
    cartBtn: "السلة", drawerProducts: "المجموعة", drawerCollections: "الأصناف", drawerStory: "قصتنا", drawerBuild: "صمّم صندوقك", drawerGifts: "هدايا", drawerTestimonials: "آراء العملاء", drawerContact: "تواصل معنا",
    heroEyebrow: "Artisan Chocolatier — تأسست 2020", heroSub: "مصنوع للحظات الرغبة", heroSubAr: "مصنوع بعناية للحظات استثنائية", heroBtnExplore: "استكشف المجموعة", heroBtnBuild: "صمّم صندوقك",
    productsLabel: "المجموعة", productsTitle: "إبداعات مميزة", productsSub: "كل قطعة رحلة حسية.", productsSubAr: "كل قطعة رحلة حسية في عالم الشوكولاتة الفاخرة", productsViewAll: "عرض الكل",
    badgeBestseller: "الأكثر مبيعًا", badgeNew: "جديد", addToCart: "+ إضافة للسلة",
    prod1Desc: "16 قطعة مصنوعة يدويًا، متعة خالصة", prod2Desc: "كراميل مملح و ganache داكن", prod3Desc: "72% كاكاو من الإكوادور", prod4Desc: "تجربة الشوكولاتة المطلقة",
    prod5Desc: "حليب مخملي مع قطع البندق المحمص", prod6Desc: "شوكولاتة بيضاء كريمية بلمسة ماء الورد", prod7Desc: "كراميل ذائب بلمسة ملح البحر",
    prodSearchPlaceholder: "ابحث عن منتج...", prodEmptyMsg: "لا توجد منتجات مطابقة لبحثك",
    catAll: "الكل", catDark: "داكنة", catMilk: "حليب", catWhite: "بيضاء", catTruffles: "ترافل", catCaramel: "كراميل", catGifts: "هدايا",
    collectionsLabel: "استكشف", collectionsTitle: "عالم من النكهات", collectionsSub: "من الداكنة الحارة إلى البيضاء الرقيقة — اكتشف ما يناسب ذوقك",
    darkName: "شوكولاتة داكنة", darkSub: "من 60% إلى 85%", milkName: "شوكولاتة حليب", milkSub: "ناعمة ومخملية", whiteName: "شوكولاتة بيضاء", whiteSub: "كريمية الملمس",
    trufflesName: "كرات الترافل", trufflesSub: "مصنوعة يدويًا", caramelName: "كراميل مملح", caramelSub: "حلاوة وتوازن", giftsName: "طقم هدايا", giftsSub: "لكل المناسبات", discover: "اكتشف المجموعة ←",
    storyLabel: "قصتنا", storyTitle: "من الحبة إلى الرغبة", storyTag1: "المصدر", storyTitle1: "حيث يولد الكاكاو", storyText1: "في أعماق غابات الإكوادور وغانا، نختار فقط أجود حبوب الكاكاو Arriba Nacional — يتم اختيارها يدويًا في ذروة نضجها.", storyTextAr1: "في غابات الإكوادور وغانا، نختار أجود حبوب الكاكاو يدويًا في ذروة نضجها — لأن كل تفصيلة صغيرة تصنع الفارق الكبير.",
    storyTag2: "الصنعة", storyTitle2: "72 ساعة من الإتقان", storyText2: "يعمل حرفيونا المهرة على كل دفعة لمدة 72 ساعة — عملية تأملية تستخرج أرقى نوتات النكهة. لا اختصارات. لا تنازلات.", storyTextAr2: "يعمل حرفيونا المهرة لساعات طويلة على كل دفعة — يطوّعون النكهات الرقيقة بصبر وشغف لا مثيل له. لا اختصارات. لا تنازلات.",
    processLabel: "كيف نصنعها", processTitle: "رحلة الإتقان", processSub: "من حبة الكاكاو إلى قطعة الشوكولاتة الكاملة — كل خطوة فن",
    step1Title: "الحصاد", step1TitleAr: "الحصاد", step1Text: "نختار أجود حبوب الكاكاو يدويًا من الإكوادور وغانا في ذروة النضج.",
    step2Title: "التحميص", step2TitleAr: "التحميص", step2Text: "نُحمّص الحبوب بعناية لاستخلاص أعمق النكهات وأكثرها تعقيدًا.",
    step3Title: "العجن الطويل", step3TitleAr: "العجن الطويل", step3Text: "72 ساعة متواصلة من العجن الرقيق للحصول على ملمس مخملي لا مثيل له.",
    step4Title: "التشطيب", step4TitleAr: "التشطيب", step4Text: "كل قطعة تُصاغ يدويًا بعناية فائقة وتُعبأ في تغليف فاخر.",
    buildLabel: "تجربة مخصصة", buildTitle: "صمّم صندوقك المثالي", buildSub: "اختر الشوكولاتة والتغليف ورسالتك الشخصية",
    chooseChoc: "اختر الشوكولاتة", choosePack: "التغليف", giftMsgLabel: "رسالة هدية", giftPlaceholder: "اكتب رسالتك الشخصية هنا...",
    choc1: "داكنة 72%", choc2: "حليب مخملي", choc3: "بيضاء بالورد", choc4: "كراميل مملح", choc5: "بندق فاخر", choc6: "توت أحمر",
    pkg1: "أسود ليلي", pkg2: "كريمي عاجي", pkg3: "طبعة ذهبية", pkg4: "أحمر قرمزي",
    totalLabel: "المجموع", addToCartBtn: "إضافة للسلة",
    giftsLabel: "قدّم متعة الهدية", giftsTitle: "لكل مناسبة طعم خاص", giftsSub: "شوكولاتة تُهدى فتُحفر في الذاكرة",
    occasion1: "أعياد الميلاد", occasion1Sub: "اجعلها لا تُنسى", occasion2: "الأعراس", occasion2Sub: "حلاوة للاثنين", occasion3: "هدايا الشركات", occasion3Sub: "انطباع لا يُمحى", occasion3Badge: "عروض بالجملة", occasion4: "لحظات خاصة", occasion4Sub: "أي سبب للدلال",
    designGiftBtn: "صمّم هديتك الآن",
    perkWrap: "تغليف فاخر مجانًا", perkNote: "رسالة شخصية مع كل صندوق", perkDelivery: "توصيل سريع خلال 24 ساعة",
    occ3Arrow: "تواصل واتساب ←", occ4Arrow: "صمّم هديتك ←",
    cdDays: "يوم", cdHours: "ساعة", cdMins: "دقيقة", cdCta: "اطلب صندوقك الآن ←",
    gfTriggerTitle: "مش عارف تختار ايه؟", gfTriggerSub: "جاوب على 3 أسئلة ونرشحلك الهدية المثالية في ثوانٍ",
    testimonialsLabel: "آراء العملاء", testimonialsTitle: "يقول عنّا عملاؤنا",
    verifiedBuyer: "مُشتري موثّق", testSummarySub: "بناءً على 312 تقييمًا من عملاء حقيقيين",
    testQuote1: "كل كرة شوكولاتة تحفة فنية في الطعم والملمس.", testAr1: "كل كرة شوكولاتة تحفة فنية في الطعم والملمس — لم أتذوق شيئاً مثلها من قبل في مصر.", testName1: "سارة م. — الرياض", testMeta1: "اشترت صندوق التوقيع · منذ أسبوعين",
    testQuote2: "وصل صندوق الهدايا بتغليف رائع — فخامة خالصة.", testAr2: "وصل صندوق الهدايا بتغليف رائع — شعرت بالفخامة من أول نظرة. ونالت صديقتي إعجابًا كبيرًا.", testName2: "ليلى ح. — دبي", testMeta2: "اشترت طقم الهدايا الفاخر · منذ 5 أيام",
    testQuote3: "لوح الداكنة 72% رائع بكل بساطة.", testAr3: "لوح الشوكولاتة الداكنة 72% خيار رائع — عمق في النكهة وتوازن مثالي. أشتريه كل أسبوع!", testName3: "أحمد ط. — القاهرة", testMeta3: "اشترى لوح الداكنة المكثفة · منذ 3 أيام",
    testQuote4: "التوصيل اتأخر شوية، بس الطعم عوّض الانتظار.", testAr4: "تأخر التوصيل يوم عن الموعد المتوقع، لكن الطعم والتغليف عوّضا الانتظار تمامًا. هطلب تاني أكيد.", testName4: "مصطفى ك. — جدة", testMeta4: "اشترى قطع الكراميل المملح · منذ أسبوع",
    testQuote5: "صممت صندوقًا مخصصًا لعيد ميلاد والدتي — لحظة لا تُنسى.", testAr5: "صممت صندوقًا مخصصًا لعيد ميلاد والدتي — الرسالة الشخصية والتغليف الذهبي خلّوا اللحظة لا تُنسى.", testName5: "نور الدين ع. — الإسكندرية", testMeta5: "صمّم صندوقًا مخصصًا · منذ 4 أيام",
    testQuote6: "جودة ممتازة، بس تمنيت خيارات أكتر من شوكولاتة الحليب.", testAr6: "الجودة ممتازة عمومًا، بس تمنيت يكون فيه خيارات أكتر من شوكولاتة الحليب. هجرب باقي المجموعة قريبًا.", testName6: "هبة س. — الكويت", testMeta6: "اشترت لوح البرالين بالحليب · الشهر الماضي",
    faqLabel: "الأسئلة الشائعة", faqTitle: "أسئلة شائعة",
    faqQ1: "كيف يتم توصيل الشوكولاتة؟", faqA1: "نستخدم توصيلًا مبردًا خاصًا للحفاظ على جودة الشوكولاتة وقوامها خلال الشحن. نصل إلى جميع محافظات مصر خلال 24-48 ساعة من تأكيد الطلب.",
    faqQ2: "هل يمكنني تخصيص طلبي لمناسبة معينة؟", faqA2: "بالطبع! نقدم خدمة التخصيص الكامل من اختيار النكهات إلى تغليف الهدايا وإضافة رسالة شخصية. تواصل معنا عبر واتساب لأي طلبات خاصة.",
    faqQ3: "ما هي مدة صلاحية الشوكولاتة؟", faqA3: "تتراوح مدة الصلاحية بين 3-6 أشهر عند التخزين في مكان بارد وجاف (18-20 درجة مئوية). تُذكر مدة الصلاحية على كل عبوة.",
    faqQ4: "هل الشوكولاتة خالية من الغلوتين؟", faqA4: "معظم منتجاتنا خالية من الغلوتين بطبيعتها. يُرجى التواصل معنا للاطلاع على مكونات منتج بعينه إذا كنت تعاني من حساسية الغلوتين.",
    faqQ5: "هل تقدمون طلبات الجملة للشركات؟", faqA5: "نعم! نقدم حلولاً متكاملة لهدايا الشركات والفعاليات بأسعار خاصة وتغليف مميز يحمل شعار شركتكم. تواصلوا معنا لمعرفة التفاصيل.",
    contactLabel: "تواصل معنا", contactTitle: "تواصل معنا", contactSub: "نحن هنا للإجابة على كل أسئلتك وتلبية طلباتك الخاصة",
    whatsappLabel: "واتساب", emailLabel: "البريد الإلكتروني", igLabel: "إنستغرام", fbLabel: "فيسبوك", hoursTitle: "ساعات العمل", hoursText: "السبت – الخميس: 10 ص – 10 م\nالجمعة: 2 م – 10 م",
    formTitle: "أرسل لنا رسالة", formSub: "هل لديك طلب خاص أو استفسار عن مجموعاتنا؟ يسعدنا مساعدتك.",
    namePlaceholder: "اسمك الكريم", phonePlaceholder: "رقم الهاتف / واتساب", msgPlaceholder: "رسالتك...", sendBtn: "إرسال عبر واتساب",
    footerTagline: "كل قطعة شوكولاتة رسالة حب\nلمن يجرؤ على رغبة ما هو استثنائي.",
    footerCollection: "المجموعة", footerDark: "شوكولاتة داكنة", footerMilk: "شوكولاتة حليب", footerWhite: "شوكولاتة بيضاء", footerTruffles: "كرات الترافل", footerCaramel: "كراميل مملح", footerGifts: "طقم هدايا",
    footerExperience: "التجربة", footerBuild: "صمّم صندوقك", footerCorporate: "هدايا الشركات", footerStory: "قصتنا", footerContact: "تواصل معنا", footerFaq: "الأسئلة الشائعة",
    footerAbout: "عن كوكو", footerAboutStory: "قصتنا", footerAboutContact: "تواصل معنا",
    copyright: "© 2025 Coco Chocolate. جميع الحقوق محفوظة.",
    footerCredit: "مصنوع بشغف واحترافية.",
    cartTitle: "سلة التسوق", cartTotalLabel: "المجموع", checkoutBtn: "إتمام الطلب عبر واتساب", directContact: "التواصل المباشر",
    checkoutNamePlaceholder: "الاسم", checkoutPhonePlaceholder: "رقم الهاتف", adminEntryLink: "لوحة التحكم", backToStore: "العودة للمتجر"
  },
  en: {
    navProducts: "Collection", navCollections: "Varieties", navStory: "Our Story", navBuild: "Build Box", navGifts: "Gifts", navTestimonials: "Testimonials", navContact: "Contact",
    cartBtn: "Cart", drawerProducts: "Collection", drawerCollections: "Varieties", drawerStory: "Our Story", drawerBuild: "Build Box", drawerGifts: "Gifts", drawerTestimonials: "Testimonials", drawerContact: "Contact",
    heroEyebrow: "Artisan Chocolatier — Est. 2020", heroSub: "Crafted for Moments of Desire", heroSubAr: "Crafted with care for exceptional moments", heroBtnExplore: "Explore Collection", heroBtnBuild: "Build Your Box",
    productsLabel: "The Collection", productsTitle: "Signature <em>Creations</em>", productsSub: "Each piece is a sensory journey.", productsSubAr: "Each piece is a sensory journey into the world of luxury chocolate", productsViewAll: "View All",
    badgeBestseller: "Bestseller", badgeNew: "New", addToCart: "+ Add to Cart",
    prod1Desc: "16 handcrafted pieces, pure indulgence", prod2Desc: "Salted caramel & dark ganache", prod3Desc: "72% single-origin Ecuador", prod4Desc: "The ultimate chocolate experience",
    prod5Desc: "Velvety milk chocolate with roasted hazelnut pieces", prod6Desc: "Creamy white chocolate with a touch of rosewater", prod7Desc: "Molten caramel with a hint of sea salt",
    prodSearchPlaceholder: "Search for a product...", prodEmptyMsg: "No products match your search",
    catAll: "All", catDark: "Dark", catMilk: "Milk", catWhite: "White", catTruffles: "Truffles", catCaramel: "Caramel", catGifts: "Gifts",
    collectionsLabel: "Explore", collectionsTitle: "World of <em>Flavors</em>", collectionsSub: "From bold dark to delicate white — discover your perfect match",
    darkName: "Dark Chocolate", darkSub: "60% to 85% cacao", milkName: "Milk Chocolate", milkSub: "Smooth & velvety", whiteName: "White Chocolate", whiteSub: "Creamy texture",
    trufflesName: "Truffles", trufflesSub: "Handcrafted", caramelName: "Salted Caramel", caramelSub: "Sweet & balanced", giftsName: "Gift Sets", giftsSub: "For all occasions", discover: "Discover Collection →",
    storyLabel: "Our Story", storyTitle: "From Bean <em>to Desire</em>", storyTag1: "The Origin", storyTitle1: "Where Cacao is Born", storyText1: "Deep in the forests of Ecuador and Ghana, we source only the finest Arriba Nacional cacao beans — chosen by hand at peak ripeness.", storyTextAr1: "In the forests of Ecuador and Ghana, we select the finest cacao beans by hand at peak ripeness — because every small detail makes a big difference.",
    storyTag2: "The Craft", storyTitle2: "72 Hours of Mastery", storyText2: "Our master chocolatiers conch each batch for 72 hours — a meditative process that coaxes out the most delicate flavor notes. No shortcuts. No compromises.", storyTextAr2: "Our skilled artisans work for hours on each batch — patiently and passionately refining delicate flavors. No shortcuts. No compromises.",
    processLabel: "How We Make It", processTitle: "Journey of <em>Mastery</em>", processSub: "From cacao bean to finished chocolate — every step is art",
    step1Title: "Sourcing", step1TitleAr: "Harvest", step1Text: "We hand-select the finest cacao beans from Ecuador and Ghana at peak ripeness.",
    step2Title: "Roasting", step2TitleAr: "Roasting", step2Text: "We carefully roast the beans to extract the deepest and most complex flavors.",
    step3Title: "Conching", step3TitleAr: "Conching", step3Text: "72 continuous hours of gentle conching to achieve an unmatched velvety texture.",
    step4Title: "Finishing", step4TitleAr: "Finishing", step4Text: "Each piece is meticulously handcrafted and packed in luxury packaging.",
    buildLabel: "Bespoke Experience", buildTitle: "Build Your <em>Perfect Box</em>", buildSub: "Choose chocolate, packaging, and your personal message",
    chooseChoc: "Choose Chocolate", choosePack: "Packaging", giftMsgLabel: "Gift Message", giftPlaceholder: "Write your personal message here...",
    choc1: "Dark 72%", choc2: "Velvet Milk", choc3: "Rose White", choc4: "Salted Caramel", choc5: "Premium Hazelnut", choc6: "Red Berry",
    pkg1: "Night Black", pkg2: "Ivory Cream", pkg3: "Gold Print", pkg4: "Crimson Red",
    totalLabel: "Total", addToCartBtn: "Add to Cart",
    giftsLabel: "Give the Gift of Pleasure", giftsTitle: "A Special <em>Taste</em> for Every Occasion", giftsSub: "Chocolate that is given and remembered",
    occasion1: "Birthdays", occasion1Sub: "Make it unforgettable", occasion2: "Weddings", occasion2Sub: "Sweetness for two", occasion3: "Corporate Gifts", occasion3Sub: "An unforgettable impression", occasion3Badge: "Bulk Deals", occasion4: "Special Moments", occasion4Sub: "Any reason to indulge",
    designGiftBtn: "Design Your Gift Now",
    perkWrap: "Free luxury gift wrap", perkNote: "Personal note with every box", perkDelivery: "Fast delivery within 24 hours",
    occ3Arrow: "Chat on WhatsApp →", occ4Arrow: "Design your gift →",
    cdDays: "Days", cdHours: "Hours", cdMins: "Mins", cdCta: "Order Your Box Now →",
    gfTriggerTitle: "Not sure what to pick?", gfTriggerSub: "Answer 3 quick questions and we'll recommend the perfect gift in seconds",
    testimonialsLabel: "Testimonials", testimonialsTitle: "What Our <em>Customers</em> Say",
    verifiedBuyer: "Verified Buyer", testSummarySub: "Based on 312 ratings from real customers",
    testQuote1: "Every truffle is a masterpiece of flavour and texture.", testAr1: "Every truffle is a masterpiece of flavour and texture — I've never tasted anything like it in Egypt.", testName1: "Sara M. — Riyadh", testMeta1: "Bought The Signature Box · 2 weeks ago",
    testQuote2: "The gift box arrived beautifully packaged — pure luxury.", testAr2: "The gift box arrived beautifully packaged — I felt the luxury from the first glance. My friend was very impressed.", testName2: "Layla H. — Dubai", testMeta2: "Bought the Grand Gift Set · 5 days ago",
    testQuote3: "The dark bar with 72% cacao is simply divine.", testAr3: "The 72% dark chocolate bar is an excellent choice — deep flavor and perfect balance. I buy it every week!", testName3: "Ahmed T. — Cairo", testMeta3: "Bought Noir Intense Bar · 3 days ago",
    testQuote4: "Delivery took a bit longer than expected, but the taste made up for it.", testAr4: "Delivery was a day late, but the taste and packaging fully made up for the wait. Definitely ordering again.", testName4: "Moustafa K. — Jeddah", testMeta4: "Bought Salted Caramel Bites · 1 week ago",
    testQuote5: "I built a custom box for my mother's birthday — she cried, in a good way.", testAr5: "I designed a custom box for my mother's birthday — the personal note and gold packaging made it unforgettable.", testName5: "Nour El-Din A. — Alexandria", testMeta5: "Designed a custom box · 4 days ago",
    testQuote6: "Great quality overall, I just wish there were more milk chocolate options.", testAr6: "Quality is excellent overall, though I wish there were more milk chocolate options. Trying the rest of the collection soon.", testName6: "Heba S. — Kuwait", testMeta6: "Bought Milk Praline Bar · last month",
    faqLabel: "FAQ", faqTitle: "Frequently Asked <em>Questions</em>",
    faqQ1: "How is chocolate delivered?", faqA1: "We use special refrigerated shipping to maintain chocolate quality and texture. We deliver to all Egyptian governorates within 24-48 hours after order confirmation.",
    faqQ2: "Can I customize my order for a specific occasion?", faqA2: "Absolutely! We offer full customization from flavor selection to gift wrapping and personalized messages. Contact us via WhatsApp for any special requests.",
    faqQ3: "What is the shelf life of the chocolate?", faqA3: "Shelf life ranges from 3-6 months when stored in a cool, dry place (18-20°C). The expiry date is mentioned on each package.",
    faqQ4: "Is the chocolate gluten-free?", faqA4: "Most of our products are naturally gluten-free. Please contact us to check the ingredients of a specific product if you have gluten sensitivity.",
    faqQ5: "Do you offer wholesale orders for companies?", faqA5: "Yes! We provide complete solutions for corporate gifts and events with special prices and customized packaging featuring your company logo. Contact us for details.",
    contactLabel: "Get In Touch", contactTitle: "Contact <em>Us</em>", contactSub: "We're here to answer your questions and fulfill your special requests",
    whatsappLabel: "WhatsApp", emailLabel: "Email", igLabel: "Instagram", fbLabel: "Facebook", hoursTitle: "Business Hours", hoursText: "Sat – Thu: 10 AM – 10 PM\nFri: 2 PM – 10 PM",
    formTitle: "Send us a message", formSub: "Do you have a special request or question about our collections? We're happy to help.",
    namePlaceholder: "Your name", phonePlaceholder: "Phone / WhatsApp", msgPlaceholder: "Your message...", sendBtn: "Send via WhatsApp",
    footerTagline: "Each piece of chocolate is a love letter\nto those who dare to desire the exceptional.",
    footerCollection: "Collection", footerDark: "Dark Chocolate", footerMilk: "Milk Chocolate", footerWhite: "White Chocolate", footerTruffles: "Truffles", footerCaramel: "Salted Caramel", footerGifts: "Gift Sets",
    footerExperience: "Experience", footerBuild: "Build Your Box", footerCorporate: "Corporate Gifts", footerStory: "Our Story", footerContact: "Contact", footerFaq: "FAQ",
    footerAbout: "About Coco", footerAboutStory: "Our Story", footerAboutContact: "Contact",
    copyright: "© 2025 Coco Chocolate. All rights reserved.",
    footerCredit: "Crafted with passion & professionalism.",
    cartTitle: "Shopping Cart", cartTotalLabel: "Total", checkoutBtn: "Checkout via WhatsApp", directContact: "Direct Contact",
    checkoutNamePlaceholder: "Your name", checkoutPhonePlaceholder: "Phone number", adminEntryLink: "Admin Panel", backToStore: "Back to Store"
  }
};

let currentLang = 'ar';

function toggleLanguage() {
  currentLang = currentLang === 'ar' ? 'en' : 'ar';
  applyLanguage();
  document.getElementById('langToggleText').innerText = currentLang === 'ar' ? 'English' : 'العربية';
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = currentLang;
}

function applyLanguage() {
  const t = translations[currentLang];
  document.querySelectorAll('[data-key]').forEach(el => {
    const key = el.getAttribute('data-key');
    if (t[key] !== undefined) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        if (el.hasAttribute('data-key-placeholder')) {
          el.placeholder = t[key];
        } else {
          el.value = t[key];
        }
      } else {
        el.innerHTML = t[key];
      }
    }
  });
  document.querySelectorAll('[data-key-placeholder]').forEach(el => {
    const key = el.getAttribute('data-key-placeholder');
    if (t[key] !== undefined) el.placeholder = t[key];
  });
  renderCart();
  if (typeof renderStoreProducts === 'function') renderStoreProducts();
  if (typeof updateOccasionCountdown === 'function') updateOccasionCountdown();
}

window.addEventListener('load',()=>{
  setTimeout(()=>{
    const l=document.getElementById('loader');
    if(l) l.classList.add('done');
    document.body.style.overflow='';
  },2400);
  applyLanguage();
});
document.body.style.overflow='hidden';

// PARTICLES
(function(){
  const c=document.getElementById('hero-particles');
  if(!c) return;
  for(let i=0;i<30;i++){
    const p=document.createElement('div');
    p.className='hero-particle';
    const s=1+Math.random()*2.5;
    p.style.cssText=`left:${Math.random()*100}%;width:${s}px;height:${s}px;animation-delay:${Math.random()*9}s;animation-duration:${8+Math.random()*8}s;`;
    c.appendChild(p);
  }
})();

// REVEAL
const io=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting) e.target.classList.add('vis')});
},{threshold:0.08});
document.querySelectorAll('.reveal,.rev-l,.rev-r').forEach(el=>io.observe(el));

// STORE PRODUCT GRID — rendered from the shared DB so admin edits appear live
function renderStoreProducts(){
  const grid=document.getElementById('productsGrid');
  if(!grid) return;
  const items = api.products.list();
  const t = translations[currentLang];
  if(!items.length){
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;padding:3rem 1rem;color:var(--text-dim)">${currentLang==='ar'?'لا توجد منتجات متاحة حاليًا':'No products available right now'}</p>`;
    return;
  }
  grid.innerHTML = items.map((p,i)=>{
    const soldOut = p.stock<=0;
    const badge = p.bestseller ? `<div class="prod-badge">${t.badgeBestseller||'Bestseller'}</div>` : (p.isNew ? `<div class="prod-badge">${t.badgeNew||'New'}</div>` : '');
    const visual = p.image ? `<img src="${p.image}" alt="${p.name}" loading="lazy">` : `<div style="font-size:3rem;display:flex;align-items:center;justify-content:center;height:100%">${p.icon||'🍫'}</div>`;
    const addLabel = soldOut ? (currentLang==='ar'?'غير متوفر':'Sold out') : (t.addToCart||'+ Add to Cart');
    const starCount = Math.max(3, 5 - (p.stock<=10 && p.stock>0 ? 1 : 0));
    const stars = '★'.repeat(starCount) + (starCount<5?`<span style="opacity:.3">${'★'.repeat(5-starCount)}</span>`:'');
    return `<div class="prod-card reveal vis" style="transition-delay:${(i%4)*0.1}s" data-category="${p.category}" data-id="${p.id}">
      <div class="prod-visual">
        ${visual}
        ${badge}
        <button class="quick-add" ${soldOut?'style="opacity:.55;cursor:not-allowed"':''} onclick="${soldOut?'':`addToCart('${p.id}', event)`}">${addLabel}</button>
      </div>
      <div class="prod-info">
        <p class="prod-name">${p.name}</p>
        <p class="prod-name-ar">${p.nameAr}</p>
        <p class="prod-desc-text">${p.desc||''}</p>
        <div class="prod-foot"><span class="prod-price">${p.price.toLocaleString()} ج.م</span><span class="prod-stars">${stars}</span></div>
      </div>
    </div>`;
  }).join('');
  filterProducts();
}

// GIFTS SECTION — OCCASION CARD ACTIONS
function goToOccasion(occ){
  if(occ==='corporate'){
    const msg='مرحبًا، أرغب في الاستفسار عن هدايا الشركات والطلبات بالجملة 🎁';
    window.open(`https://wa.me/201557582459?text=${encodeURIComponent(msg)}`,'_blank');
    return;
  }
  if(occ==='special'){
    scroll2('build');
    return;
  }
  const chip=document.querySelector('.cat-chip[data-cat="gifts"]');
  if(chip) setCategory(chip,'gifts');
  scroll2('products');
}

// GIFT FINDER — 3-question wizard that recommends a ready box
const GF_RECIPIENTS=[
  {id:'partner',icon:'fa-heart',ar:'شريك/ة الحياة',en:'My partner'},
  {id:'parent',icon:'fa-people-roof',ar:'أمي أو أبويا',en:'My parent'},
  {id:'friend',icon:'fa-user-group',ar:'صديق/ة',en:'A friend'},
  {id:'colleague',icon:'fa-briefcase',ar:'زميل عمل / عميل',en:'A colleague or client'}
];
const GF_OCCASIONS=[
  {id:'birthday',icon:'fa-cake-candles',ar:'عيد ميلاد',en:'Birthday'},
  {id:'romantic',icon:'fa-ring',ar:'مناسبة رومانسية (خطوبة، زواج، فلانتين)',en:'A romantic occasion'},
  {id:'corporate',icon:'fa-building',ar:'مناسبة عمل',en:'A work occasion'},
  {id:'none',icon:'fa-gift',ar:'من غير مناسبة، بس حابب أدلّع حد',en:'No occasion, just because'}
];
const GF_BUDGETS=[
  {id:'low',ar:'أقل من 300 ج.م',en:'Under 300 EGP',range:[0,299]},
  {id:'mid',ar:'300 – 500 ج.م',en:'300 – 500 EGP',range:[300,500]},
  {id:'high',ar:'500 ج.م فأكثر',en:'500 EGP & up',range:[500,Infinity]}
];
let gfState={step:1,recipient:null,occasion:null,budget:null,picks:[],pickIndex:0};

function openGiftFinder(){
  gfState={step:1,recipient:null,occasion:null,budget:null,picks:[],pickIndex:0};
  renderGiftFinder();
  document.getElementById('gfOverlay').classList.add('show');
  document.body.style.overflow='hidden';
}
function closeGiftFinder(){
  document.getElementById('gfOverlay').classList.remove('show');
  document.body.style.overflow='';
}
function gfProgressHTML(activeStep){
  let html='<div class="gf-progress">';
  for(let i=1;i<=3;i++){ html+=`<span class="${i<=activeStep?'done':''}"></span>`; }
  return html+'</div>';
}
function gfSelectRecipient(id){ gfState.recipient=id; gfState.step=2; renderGiftFinder(); }
function gfSelectOccasion(id){ gfState.occasion=id; gfState.step=3; renderGiftFinder(); }
function gfBack(){
  if(gfState.step===2){ gfState.step=1; renderGiftFinder(); }
  else if(gfState.step===3){ gfState.step=2; renderGiftFinder(); }
}
function gfSelectBudget(id){
  gfState.budget=id;
  gfState.step='loading';
  renderGiftFinder();
  setTimeout(()=>{
    gfState.picks=gfComputeRecommendation();
    gfState.pickIndex=0;
    gfState.step='result';
    renderGiftFinder();
  },900);
}
function gfComputeRecommendation(){
  const recipientPrefs={partner:['gifts','truffles'],parent:['gifts','caramel'],friend:['truffles','caramel','milk'],colleague:['gifts']};
  const occasionPrefs={birthday:['gifts','truffles'],romantic:['gifts','truffles'],corporate:['gifts'],none:['truffles','caramel','milk','dark','white']};
  const budget=GF_BUDGETS.find(b=>b.id===gfState.budget);
  const [lo,hi]=budget.range;
  const wantedCats=new Set([...(recipientPrefs[gfState.recipient]||[]),...(occasionPrefs[gfState.occasion]||[])]);
  let candidates=DB.products.filter(p=>p.stock>0 && wantedCats.has(p.category) && p.price>=lo && p.price<=hi);
  if(!candidates.length) candidates=DB.products.filter(p=>p.stock>0 && wantedCats.has(p.category));
  if(!candidates.length) candidates=DB.products.filter(p=>p.stock>0);
  const mid=hi===Infinity?lo+200:(lo+hi)/2;
  candidates.sort((a,b)=>{
    const aScore=(a.bestseller?-60:0)+Math.abs(a.price-mid);
    const bScore=(b.bestseller?-60:0)+Math.abs(b.price-mid);
    return aScore-bScore;
  });
  return candidates.slice(0,2);
}
function gfSwapAlt(){ gfState.pickIndex=gfState.pickIndex===0?1:0; renderGiftFinder(); }
function renderGiftFinder(){
  const el=document.getElementById('gfContent');
  if(!el) return;
  const L=currentLang;
  if(gfState.step===1){
    el.innerHTML=`
      ${gfProgressHTML(1)}
      <p class="gf-step-label">${L==='ar'?'سؤال 1 من 3':'Question 1 of 3'}</p>
      <p class="gf-step-title">${L==='ar'?'الهدية دي لمين؟':'Who is this gift for?'}</p>
      <div class="gf-options">
        ${GF_RECIPIENTS.map(r=>`<div class="gf-option" onclick="gfSelectRecipient('${r.id}')"><i class="fa-solid ${r.icon}"></i><span>${L==='ar'?r.ar:r.en}</span></div>`).join('')}
      </div>`;
  } else if(gfState.step===2){
    el.innerHTML=`
      ${gfProgressHTML(2)}
      <span class="gf-back" onclick="gfBack()"><i class="fa-solid fa-arrow-right"></i> ${L==='ar'?'رجوع':'Back'}</span>
      <p class="gf-step-label">${L==='ar'?'سؤال 2 من 3':'Question 2 of 3'}</p>
      <p class="gf-step-title">${L==='ar'?'إيه المناسبة؟':"What's the occasion?"}</p>
      <div class="gf-options">
        ${GF_OCCASIONS.map(o=>`<div class="gf-option" onclick="gfSelectOccasion('${o.id}')"><i class="fa-solid ${o.icon}"></i><span>${L==='ar'?o.ar:o.en}</span></div>`).join('')}
      </div>`;
  } else if(gfState.step===3){
    el.innerHTML=`
      ${gfProgressHTML(3)}
      <span class="gf-back" onclick="gfBack()"><i class="fa-solid fa-arrow-right"></i> ${L==='ar'?'رجوع':'Back'}</span>
      <p class="gf-step-label">${L==='ar'?'سؤال 3 من 3':'Question 3 of 3'}</p>
      <p class="gf-step-title">${L==='ar'?'الميزانية تقريبًا؟':"What's your budget?"}</p>
      <div class="gf-options">
        ${GF_BUDGETS.map(b=>`<div class="gf-option" onclick="gfSelectBudget('${b.id}')"><i class="fa-solid fa-sack-dollar"></i><span>${L==='ar'?b.ar:b.en}</span></div>`).join('')}
      </div>`;
  } else if(gfState.step==='loading'){
    el.innerHTML=`
      <div class="gf-loading">
        <i class="fa-solid fa-mortar-pestle"></i>
        <p>${L==='ar'?'بنجهزلك أفضل ترشيح...':'Finding your perfect match...'}</p>
      </div>`;
  } else if(gfState.step==='result'){
    renderGiftFinderResult(el,L);
  }
}
function renderGiftFinderResult(el,L){
  const picks=gfState.picks;
  if(!picks.length){
    el.innerHTML=`
      <div class="gf-result">
        <p class="gf-step-title">${L==='ar'?'لسه بنجهز مجموعتنا لموسم جديد':'Our collection is being restocked'}</p>
        <button class="btn-gold" onclick="closeGiftFinder();scroll2('build')" style="width:100%">${L==='ar'?'صمّم صندوقك بنفسك':'Design your own box'}</button>
        <span class="gf-restart" onclick="openGiftFinder()">${L==='ar'?'جرّب تاني':'Try again'}</span>
      </div>`;
    return;
  }
  const main=picks[gfState.pickIndex] || picks[0];
  const alt=picks.length>1 ? picks[gfState.pickIndex===0?1:0] : null;
  el.innerHTML=`
    <div class="gf-result">
      <p class="gf-step-label">${L==='ar'?'الترشيح المثالي ليك':'Your perfect match'}</p>
      <div class="gf-result-img"><img src="${main.image}" alt=""></div>
      <p class="gf-result-name">${L==='ar'?main.nameAr:main.name}</p>
      <p class="gf-result-desc">${main.desc}</p>
      <p class="gf-result-price">${fmt(main.price)} ${L==='ar'?'ج.م':'EGP'}</p>
      <div class="gf-result-actions">
        <button class="btn-gold" onclick="addToCart('${main.id}');closeGiftFinder()">${L==='ar'?'أضف للسلة':'Add to Cart'}</button>
        ${alt?`<button class="btn-outline" onclick="gfSwapAlt()">${L==='ar'?`جرّب "${alt.nameAr}" بدل كده`:`Try "${alt.name}" instead`}</button>`:''}
      </div>
      <span class="gf-restart" onclick="openGiftFinder()">${L==='ar'?'ابدأ من جديد':'Start over'}</span>
    </div>`;
}

// OCCASION COUNTDOWN — auto-shows before major gifting occasions
const OCCASION_COUNTDOWN_LIST=[
  {month:2,day:14,ar:'عيد الحب',en:"Valentine's Day"},
  {month:3,day:21,ar:'عيد الأم',en:"Mother's Day"},
  {month:12,day:25,ar:'عيد الميلاد المجيد',en:'Christmas'},
  {month:1,day:1,ar:'رأس السنة',en:'New Year'}
];
const OCCASION_COUNTDOWN_WINDOW_DAYS=30;
function updateOccasionCountdown(){
  const banner=document.getElementById('occCountdown');
  if(!banner) return;
  const now=new Date();
  let next=null;
  OCCASION_COUNTDOWN_LIST.forEach(o=>{
    let target=new Date(now.getFullYear(),o.month-1,o.day,0,0,0);
    if(target<=now) target=new Date(now.getFullYear()+1,o.month-1,o.day,0,0,0);
    const diff=target-now;
    if(!next||diff<next.diff) next={...o,diff};
  });
  const daysLeft=Math.floor(next.diff/86400000);
  if(daysLeft>OCCASION_COUNTDOWN_WINDOW_DAYS){ banner.classList.remove('show'); return; }
  banner.classList.add('show');
  const d=Math.floor(next.diff/86400000);
  const h=Math.floor((next.diff/3600000)%24);
  const m=Math.floor((next.diff/60000)%60);
  const dEl=document.getElementById('occCdDays'), hEl=document.getElementById('occCdHours'), mEl=document.getElementById('occCdMins');
  if(dEl) dEl.textContent=String(d).padStart(2,'0');
  if(hEl) hEl.textContent=String(h).padStart(2,'0');
  if(mEl) mEl.textContent=String(m).padStart(2,'0');
  const label=document.getElementById('occCountdownLabel');
  if(label){
    const name=currentLang==='ar'?next.ar:next.en;
    label.textContent=(currentLang==='ar'?'متبقي على ':'Countdown to ')+name;
  }
}
setInterval(updateOccasionCountdown,60000);

// PRODUCT SEARCH & CATEGORY FILTER
let activeCategory='all';
function setCategory(btn,cat){
  activeCategory=cat;
  document.querySelectorAll('.cat-chip').forEach(c=>c.classList.remove('active'));
  btn.classList.add('active');
  filterProducts();
}
function filterProducts(){
  const q=(document.getElementById('prodSearch')?.value||'').trim().toLowerCase();
  const cards=document.querySelectorAll('#productsGrid .prod-card');
  let visibleCount=0;
  cards.forEach(card=>{
    const cat=card.dataset.category||'';
    const nameEl=card.querySelector('.prod-name');
    const nameArEl=card.querySelector('.prod-name-ar');
    const descEl=card.querySelector('.prod-desc-text');
    const text=[nameEl?.innerText,nameArEl?.innerText,descEl?.innerText].filter(Boolean).join(' ').toLowerCase();
    const matchCat=activeCategory==='all'||cat===activeCategory;
    const matchQ=!q||text.includes(q);
    const show=matchCat&&matchQ;
    if(show){
      card.classList.remove('filtered-out');
      card.style.display='';
      visibleCount++;
    } else {
      card.classList.add('filtered-out');
      setTimeout(()=>{ if(card.classList.contains('filtered-out')) card.style.display='none'; },380);
    }
  });
  const empty=document.getElementById('prodEmpty');
  if(empty) empty.style.display = visibleCount===0 ? 'block' : 'none';
}

// SMOOTH SCROLL PARALLAX ON PRODUCT VISUALS
(function(){
  let ticking=false;
  const visuals=()=>document.querySelectorAll('#productsGrid .prod-visual img');
  function updateParallax(){
    const vh=window.innerHeight;
    visuals().forEach(img=>{
      const rect=img.parentElement.getBoundingClientRect();
      const center=rect.top+rect.height/2;
      const offset=((center-vh/2)/vh)*22;
      img.style.setProperty('--py',`${offset.toFixed(1)}px`);
    });
    ticking=false;
  }
  window.addEventListener('scroll',()=>{
    if(!ticking){ requestAnimationFrame(updateParallax); ticking=true; }
  },{passive:true});
  window.addEventListener('load',updateParallax);
})();

// SCROLL
window.addEventListener('scroll',()=>{
  const pct=window.scrollY/(document.body.scrollHeight-window.innerHeight)*100;
  const sp=document.getElementById('sp');
  if(sp) sp.style.width=Math.min(pct,100)+'%';
  document.getElementById('nav')?.classList.toggle('scrolled',window.scrollY>60);
},{passive:true});

function scroll2(id){document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});}

// DRAWER
function openDrawer(){
  document.getElementById('drawer')?.classList.add('open');
  document.getElementById('drawer-overlay')?.classList.add('show');
  document.body.style.overflow='hidden';
}
function closeDrawer(){
  document.getElementById('drawer')?.classList.remove('open');
  document.getElementById('drawer-overlay')?.classList.remove('show');
  document.body.style.overflow='';
}

// FAQ
function toggleFaq(btn){
  const item=btn.closest('.faq-item');
  const wasOpen=item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i=>i.classList.remove('open'));
  if(!wasOpen) item.classList.add('open');
}

// CART SYSTEM
let cart=JSON.parse(localStorage.getItem('coco_cart')||'[]');
function saveCart(){localStorage.setItem('coco_cart',JSON.stringify(cart))}

function addToCart(productId, evt){
  const p = DB.products.find(x=>x.id===productId);
  if(!p) return;
  if(p.stock<=0){ showToast(currentLang==='ar'?'هذا المنتج غير متوفر حاليًا':'This product is out of stock','error'); return; }
  const ex=cart.find(i=>i.id===productId);
  if(ex){ ex.qty++; }
  else{ cart.push({id:p.id,name:p.name,nameAr:p.nameAr,price:p.price,icon:p.icon||'🍫',image:p.image||'',qty:1}); }
  saveCart(); renderCart();
  showToast(`${p.icon||'🍫'} ${currentLang === 'ar' ? `أُضيف "${p.nameAr}" إلى السلة` : `"${p.name}" added to cart`}`);
  if(evt && evt.currentTarget){
    const startEl = evt.currentTarget.closest('.prod-visual') || evt.currentTarget;
    flyToCart(startEl, p.image, p.icon||'🍫');
  }
}

function flyToCart(startEl, imageSrc, icon){
  const cartBtn = document.getElementById('cart-open-btn');
  if(!startEl || !cartBtn || typeof startEl.getBoundingClientRect!=='function') return;
  const startRect = startEl.getBoundingClientRect();
  const endRect = cartBtn.getBoundingClientRect();
  const flyer = document.createElement('div');
  flyer.className = 'fly-to-cart';
  flyer.innerHTML = imageSrc ? `<img src="${imageSrc}" alt="">` : `<span>${icon}</span>`;
  const size = 54;
  flyer.style.left = (startRect.left + startRect.width/2 - size/2) + 'px';
  flyer.style.top = (startRect.top + startRect.height/2 - size/2) + 'px';
  document.body.appendChild(flyer);
  const dx = (endRect.left + endRect.width/2) - (startRect.left + startRect.width/2);
  const dy = (endRect.top + endRect.height/2) - (startRect.top + startRect.height/2);
  const anim = flyer.animate([
    {transform:'translate(0,0) scale(1) rotate(0deg)', opacity:1, offset:0},
    {transform:`translate(${dx*0.45}px, ${dy*0.55 - 70}px) scale(0.85) rotate(8deg)`, opacity:1, offset:0.55},
    {transform:`translate(${dx}px, ${dy}px) scale(0.12) rotate(20deg)`, opacity:0.3, offset:1}
  ], {duration:750, easing:'cubic-bezier(.35,0,.25,1)'});
  anim.onfinish = ()=>{
    flyer.remove();
    cartBtn.classList.add('cart-bump');
    setTimeout(()=>cartBtn.classList.remove('cart-bump'), 420);
  };
}

function addCustomItemToCart(name,nameAr,price,icon='🍫'){
  const id='custom-'+Date.now();
  cart.push({id,name,nameAr,price,icon,image:'',qty:1});
  saveCart(); renderCart();
  showToast(`${icon} ${currentLang === 'ar' ? `أُضيف "${nameAr}" إلى السلة` : `"${name}" added to cart`}`);
}

function addCustomBox(){
  const priceText = document.getElementById('box-price').textContent;
  const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 1600;
  const sel=[...document.querySelectorAll('.choc-btn.sel')].map(b=>b.querySelector('span').textContent).join(' + ');
  const pkg=document.querySelector('.pkg-btn.sel')?.textContent||(currentLang === 'ar' ? 'أسود ليلي' : 'Night Black');
  const label= currentLang === 'ar' ? `صندوق مخصص (${sel}) — ${pkg}` : `Custom Box (${sel}) — ${pkg}`;
  addCustomItemToCart('Custom Box',label,price,'🎁');
}

function removeFromCart(id){
  cart=cart.filter(i=>i.id!==id);
  saveCart(); renderCart();
}

function changeQty(id,delta){
  const item=cart.find(i=>i.id===id);
  if(!item) return;
  item.qty+=delta;
  if(item.qty<1) return removeFromCart(id);
  saveCart(); renderCart();
}

function renderCart(){
  const wrap=document.getElementById('cart-items');
  const foot=document.getElementById('cart-foot');
  const badge=document.getElementById('cart-count-badge');
  const hcount=document.getElementById('cart-head-count');
  const total=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const count=cart.reduce((s,i)=>s+i.qty,0);
  if(badge){badge.textContent=count;badge.classList.toggle('show',count>0)}
  if(hcount) hcount.textContent=count+' '+(currentLang === 'ar' ? 'منتج' : 'item(s)');
  if(document.getElementById('cart-total')) document.getElementById('cart-total').textContent=total.toLocaleString()+' ج.م';
  if(!wrap) return;
  if(cart.length===0){
    const emptyMsg = currentLang === 'ar' ? 'سلتك فارغة' : 'Your cart is empty';
    const shopMsg = currentLang === 'ar' ? 'ابدأ التسوق الآن' : 'Start shopping now';
    const exploreBtnText = currentLang === 'ar' ? 'استكشف المنتجات' : 'Explore Products';
    wrap.innerHTML=`<div class="cart-empty">
      <div class="cart-empty-icon"><i class="fa-solid fa-bag-shopping"></i></div>
      <p class="cart-empty-text">${emptyMsg}<br><small style="opacity:0.6">${shopMsg}</small></p>
      <button class="cart-explore-btn" onclick="closeCart(); scroll2('products');">${exploreBtnText}</button>
    </div>`;
    if(foot) foot.style.display='none';
  } else {
    if(foot) foot.style.display='block';
    wrap.innerHTML=cart.map(item=>`
      <div class="cart-item">
        <div class="cart-item-img">${item.image?`<img src="${item.image}" alt="${item.name}">`:item.icon}</div>
        <div class="cart-item-info">
          <p class="cart-item-name">${item.name}</p>
          <p class="cart-item-name-ar">${item.nameAr}</p>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="changeQty('${item.id}',-1)">−</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty('${item.id}',1)">+</button>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.5rem">
          <span class="cart-item-price">${(item.price * item.qty).toLocaleString()} ج.م</span>
          <button class="cart-remove" onclick="removeFromCart('${item.id}')" title="${currentLang === 'ar' ? 'حذف' : 'Remove'}">✕</button>
        </div>
      </div>
    `).join('');
  }
}
renderCart();

function openCart(){
  document.getElementById('cart-sidebar')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('show');
  document.body.style.overflow='hidden';
}
function closeCart(){
  document.getElementById('cart-sidebar')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('show');
  document.body.style.overflow='';
}

// CHECKOUT — creates a real order in the shared DB (visible instantly in the
// admin panel's "الطلبات" tab), then hands off to WhatsApp for confirmation.
function checkout(){
  if(cart.length===0) return;
  const name = document.getElementById('checkoutName')?.value.trim() || '';
  const phone = document.getElementById('checkoutPhone')?.value.trim() || '';
  if(!name || !phone){
    showToast(currentLang==='ar' ? 'يرجى إدخال الاسم ورقم الهاتف لإتمام الطلب' : 'Please enter your name and phone to check out', 'error');
    return;
  }
  const order = api.orders.create({customerName:name, phone, items:cart, source:'WEBSITE'});
  const lines=cart.map(i=>`• ${i.nameAr} × ${i.qty} = ${(i.price*i.qty).toLocaleString()} ج.م`);
  const msg=encodeURIComponent(
    `🍫 طلب جديد من موقع Coco Chocolate\n` +
    `👤 ${name} — 📞 ${phone}\n` +
    `🔖 رقم الطلب: #${order.orderNumber}\n` +
    `━━━━━━━━━━━━━━━\n` +
    lines.join('\n') +
    `\n━━━━━━━━━━━━━━━\n` +
    `💰 المجموع (شامل التوصيل ${order.deliveryFee} ج.م): ${order.total.toLocaleString()} ج.م\n\n` +
    `أرجو التواصل لتأكيد الطلب وتفاصيل التوصيل. شكرًا!`
  );
  window.open(`https://wa.me/201557582459?text=${msg}`,'_blank');
  cart=[]; saveCart(); renderCart();
  document.getElementById('checkoutName').value='';
  document.getElementById('checkoutPhone').value='';
  renderStoreProducts();
  showToast(currentLang==='ar' ? `تم تسجيل طلبك رقم #${order.orderNumber} بنجاح` : `Order #${order.orderNumber} placed successfully`);
}

// CONTACT FORM
function sendContactWA(){
  const name=document.getElementById('cf-name')?.value.trim()||'';
  const phone=document.getElementById('cf-phone')?.value.trim()||'';
  const msg=document.getElementById('cf-msg')?.value.trim()||'';
  if(!name && !msg){ showToast(currentLang === 'ar' ? 'يرجى ملء الاسم والرسالة' : 'Please fill in name and message','error'); return; }
  const text=encodeURIComponent(
    `Hello, I am ${name || (currentLang === 'ar' ? 'عميل جديد' : 'a new client')}\n` +
    (phone ? `📞 ${phone}\n` : '') +
    `\n💬 ${msg || (currentLang === 'ar' ? 'أود الاستفسار عن منتجاتكم' : 'I would like to inquire about your products')}`
  );
  window.open(`https://wa.me/201557582459?text=${text}`,'_blank');
}

// TOAST
function showToast(msg,type='success'){
  const wrap=document.getElementById('toast-wrap');
  if(!wrap) return;
  const t=document.createElement('div');
  t.className='toast';
  const icon=type==='error'?'<i class="fa-solid fa-circle-xmark" style="color:#e55;font-size:1.1rem"></i>':'<i class="fa-solid fa-circle-check" style="color:var(--gold);font-size:1.1rem"></i>';
  t.innerHTML=`${icon}<span class="toast-msg">${msg}</span>`;
  wrap.appendChild(t);
  setTimeout(()=>{t.classList.add('removing');setTimeout(()=>t.remove(),350)},3200);
}

// BUILD BOX
function selChoc(btn){
  const wasSel = btn.classList.contains('sel');
  const selCount = document.querySelectorAll('.choc-btn.sel').length;
  if(wasSel && selCount<=1){
    showToast(currentLang==='ar'?'اختر نوع واحد على الأقل من الشوكولاتة':'Pick at least one chocolate type','error');
    return;
  }
  btn.classList.toggle('sel');
  const n=document.querySelectorAll('.choc-btn.sel').length;
  const el=document.getElementById('box-price');
  if(el){
    const basePrice = 1600;
    const extraPerChoc = 400;
    const total = basePrice + (Math.max(n,1) * extraPerChoc);
    el.textContent = total.toLocaleString() + ' ج.م';
  }
  updateBoxPreview();
}
function selPkg(btn){
  document.querySelectorAll('.pkg-btn').forEach(b=>b.classList.remove('sel'));
  btn.classList.add('sel');
  updateBoxPreview();
}

function updateBoxPreview(){
  const chocBtns = [...document.querySelectorAll('.choc-btn.sel')];
  const colors = chocBtns.map(b=>b.dataset.color).filter(Boolean);
  const names = chocBtns.map(b=>b.querySelector('span')?.textContent.trim()).filter(Boolean);
  const pkgBtn = document.querySelector('.pkg-btn.sel');
  const pkgColor = pkgBtn?.dataset.color || '#2C1810';
  const pkgTrim = pkgBtn?.dataset.trim || '#C9A84C';

  const exterior = document.getElementById('box-exterior');
  if(exterior){ exterior.style.fill = pkgColor; exterior.style.stroke = pkgTrim; }

  for(let i=0;i<9;i++){
    const cell = document.getElementById('box-cell-'+i);
    if(!cell) continue;
    const color = colors.length ? colors[i % colors.length] : '#4A2C1A';
    cell.style.fill = color;
  }

  const caption = document.getElementById('box-live-caption');
  if(caption){
    const pkgName = pkgBtn?.textContent.trim() || '';
    caption.textContent = (names.join(' + ') || 'اختر الشوكولاتة') + ' — ' + pkgName;
  }

  const noteTag = document.getElementById('box-note-tag');
  if(noteTag){
    const hasNote = (document.getElementById('gift-msg')?.value || '').trim().length>0;
    noteTag.style.opacity = hasNote ? '1' : '0';
  }
}

// realistic tilt: the preview box gently follows the cursor, like turning a real box in your hands
(function initBoxTilt(){
  const frame = document.getElementById('preview-frame');
  const svg = document.getElementById('box-preview');
  if(!frame || !svg) return;
  frame.addEventListener('mousemove', e=>{
    const r = frame.getBoundingClientRect();
    const px = (e.clientX - r.left)/r.width - 0.5;
    const py = (e.clientY - r.top)/r.height - 0.5;
    svg.style.transform = `perspective(700px) rotateY(${px*14}deg) rotateX(${-py*14}deg) scale(1.02)`;
  });
  frame.addEventListener('mouseleave', ()=>{ svg.style.transform = 'perspective(700px) rotateY(0) rotateX(0) scale(1)'; });
})();
document.addEventListener('DOMContentLoaded', updateBoxPreview);
if(document.readyState!=='loading') updateBoxPreview();

/* =========================================================
   ADMIN PANEL — rendering & interactions
   Reuses the shared `api` object above, so every change here
   (add a product, ship an order...) is instantly reflected on
   the storefront's #productsGrid and cart.
========================================================= */
let adminView = 'dashboard';
let productFilter = {search:'', category:'all'};
let orderFilter = {search:'', status:'all', date:null};
let orderSort = {key:'createdAt', dir:'desc'};
let productSort = {key:null, dir:'asc'};
let chartRangeDays = 14;
let chartMetric = 'revenue';

// Change this to set your own admin password. It's checked client-side only —
// enough to keep casual visitors out, but not a substitute for real auth if
// this ever moves to a real backend.
const ADMIN_PIN = '1234';

function fmt(n){ return Math.round(n).toLocaleString('ar-EG'); }

// ---- router between the storefront and the admin panel ----
function showAdmin(){
  document.getElementById('storeView').classList.add('hide');
  document.getElementById('adminEntryLink').style.display='none';
  document.body.style.overflow='auto';
  window.scrollTo(0,0);
  location.hash = 'admin';
  if(sessionStorage.getItem('cocoAdminUnlocked')==='true'){
    document.getElementById('adminView').classList.add('show');
    adminRender();
  } else {
    document.getElementById('adminLockOverlay').classList.add('show');
    setTimeout(()=>document.getElementById('adminPinInput')?.focus(), 250);
  }
}
function showStore(){
  document.getElementById('adminView').classList.remove('show');
  document.getElementById('adminLockOverlay').classList.remove('show');
  document.getElementById('storeView').classList.remove('hide');
  document.getElementById('adminEntryLink').style.display='';
  document.getElementById('adminPinInput').value='';
  document.getElementById('adminPinError').textContent='';
  history.replaceState(null,'',location.pathname+location.search);
}
function checkAdminPin(){
  const input = document.getElementById('adminPinInput');
  if(input.value === ADMIN_PIN){
    sessionStorage.setItem('cocoAdminUnlocked','true');
    document.getElementById('adminLockOverlay').classList.remove('show');
    document.getElementById('adminView').classList.add('show');
    document.getElementById('adminPinError').textContent='';
    input.value='';
    adminRender();
  } else {
    document.getElementById('adminPinError').textContent='رقم سري غير صحيح، حاول مرة أخرى';
    input.value='';
    input.focus();
    const box=document.querySelector('#adminLockOverlay .lock-box');
    box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
  }
}
function lockAdmin(){
  sessionStorage.removeItem('cocoAdminUnlocked');
  document.getElementById('adminView').classList.remove('show');
  showAdmin();
}
window.addEventListener('hashchange',()=>{ if(location.hash==='#admin') showAdmin(); else showStore(); });

function adminNavigate(view){
  adminView = view;
  document.querySelectorAll('#adminView .nav-item').forEach(el=>el.classList.toggle('active', el.dataset.view===view));
  adminRender();
}

function adminRender(){
  const main = document.getElementById('adminMainContent');
  if(adminView==='dashboard') main.innerHTML = renderAdminDashboard();
  else if(adminView==='products') main.innerHTML = renderAdminProducts();
  else if(adminView==='orders') main.innerHTML = renderAdminOrders();
  else if(adminView==='customers') main.innerHTML = renderAdminCustomers();
  if(adminView==='dashboard'){ drawRevenueChart(); animateKpiCounters(); }
  renderStoreProducts(); // keep the storefront grid in sync with any admin edit
}

function kpiCard({icon, label, value, suffix='', note='', delta=null, onclick=null, title='', warn=false}){
  const clickable = onclick ? 'clickable' : '';
  const clickAttr = onclick ? `onclick="${onclick}"` : '';
  const titleAttr = title ? `title="${title}"` : '';
  const deltaHtml = (delta===null || !isFinite(delta)) ? '' : `
    <p class="kpi-delta ${delta>=0?'up':'down'}"><i class="fa-solid ${delta>=0?'fa-arrow-trend-up':'fa-arrow-trend-down'}"></i>${Math.abs(delta).toFixed(1)}% ${delta>=0?'مقارنة بالأمس':'مقارنة بالأمس'}</p>`;
  return `
    <div class="kpi-card ${clickable} ${warn?'kpi-warn':''}" ${clickAttr} ${titleAttr}>
      <i class="fa-solid ${icon}"></i>
      <p class="kpi-label">${label}</p>
      <p class="kpi-value" data-count="${value}" data-suffix="${suffix}">0${suffix}</p>
      ${note?`<p class="kpi-note">${note}</p>`:''}
      ${deltaHtml}
    </div>`;
}

function animateKpiCounters(){
  document.querySelectorAll('#adminMainContent .kpi-value[data-count]').forEach(el=>{
    const target = parseFloat(el.getAttribute('data-count'))||0;
    const suffix = el.getAttribute('data-suffix')||'';
    const isInt = Number.isInteger(target);
    const duration = 700, start = performance.now();
    function step(now){
      const p = Math.min(1, (now-start)/duration);
      const eased = 1 - Math.pow(1-p, 3);
      const current = target*eased;
      el.textContent = (isInt ? Math.round(current).toString() : fmt(current)) + suffix;
      if(p<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

function renderAdminDashboard(){
  const s = api.stats.summary();
  const top = api.stats.topProducts(5);
  const byCat = api.stats.revenueByCategory();
  const activity = api.stats.recentActivity(6);
  const maxUnits = Math.max(...top.map(t=>t.units), 1);
  const maxCat = Math.max(...byCat.map(c=>c.total), 1);

  return `
  <div class="page-head">
    <div>
      <p class="page-title">الإحصاءات</p>
      <p class="page-sub">نظرة عامة على المبيعات والطلبات والمخزون</p>
    </div>
  </div>
  <div class="kpi-grid">
    ${kpiCard({icon:'fa-sack-dollar', label:'إجمالي الإيرادات', value:s.totalRevenue, suffix:' ج.م', note:`${s.totalOrders} طلب فعّال`, delta:s.deltaRevenue})}
    ${kpiCard({icon:'fa-receipt', label:'إجمالي الطلبات', value:s.totalOrders, note:`${s.websiteOrders} من الموقع، ${s.whatsappOrders} واتساب`, delta:s.deltaOrders, onclick:"adminNavigate('orders')", title:'عرض كل الطلبات'})}
    ${kpiCard({icon:'fa-users', label:'العملاء', value:s.uniqueCustomers, note:'عملاء فريدون', delta:s.deltaCustomers, onclick:"adminNavigate('customers')", title:'عرض العملاء'})}
    ${kpiCard({icon:'fa-box-open', label:'المنتجات', value:s.totalProducts, note:'إجمالي المنتجات المتاحة', onclick:"adminNavigate('products')", title:'عرض المنتجات'})}
    ${kpiCard({icon:'fa-triangle-exclamation', label:'مخزون منخفض', value:s.lowStockCount, note:'10 قطع أو أقل — اضغط للعرض', onclick:"goToLowStock()", title:'عرض المنتجات منخفضة المخزون', warn:s.lowStockCount>0})}
    ${kpiCard({icon:'fa-hourglass-half', label:'طلبات قيد الانتظار', value:s.pendingOrders, note:s.pendingOrders>0?'اضغط للمراجعة':'لا يوجد جديد', onclick:"goToFilteredOrders('PENDING')", title:'عرض الطلبات قيد الانتظار', warn:s.pendingOrders>0})}
    ${kpiCard({icon:'fa-circle-check', label:'طلبات مكتملة', value:s.completedOrders, note:'تم التوصيل بنجاح', onclick:"goToFilteredOrders('DELIVERED')", title:'عرض الطلبات المكتملة'})}
    ${kpiCard({icon:'fa-scale-balanced', label:'متوسط قيمة الطلب', value:s.avgOrderValue, suffix:' ج.م', note:`${s.totalUnitsSold} قطعة مباعة إجمالًا`})}
  </div>
  <div class="two-col">
    <div class="panel">
      <div class="panel-head" style="flex-wrap:wrap;gap:.6rem">
        <div><p class="panel-title">${chartMetric==='revenue'?'الإيرادات':'عدد الطلبات'}</p><p class="panel-sub">آخر ${chartRangeDays} يومًا — اضغط على أي عمود لعرض طلبات ذلك اليوم</p></div>
        <div style="display:flex;flex-direction:column;gap:.5rem;align-items:flex-end">
          <div class="range-chips">
            <button class="chip ${chartMetric==='revenue'?'active':''}" onclick="setChartMetric('revenue')">الإيرادات</button>
            <button class="chip ${chartMetric==='orders'?'active':''}" onclick="setChartMetric('orders')">الطلبات</button>
          </div>
          <div class="range-chips">
            <button class="chip ${chartRangeDays===7?'active':''}" onclick="setChartRange(7)">7 أيام</button>
            <button class="chip ${chartRangeDays===14?'active':''}" onclick="setChartRange(14)">14 يوم</button>
            <button class="chip ${chartRangeDays===30?'active':''}" onclick="setChartRange(30)">30 يوم</button>
          </div>
        </div>
      </div>
      <div class="chart-wrap" style="position:relative"><svg id="revenueChart" width="100%" height="100%" viewBox="0 0 640 220" preserveAspectRatio="none"></svg><div class="chart-tooltip" id="chartTooltip"></div></div>
    </div>
    <div class="panel">
      <div class="panel-head"><p class="panel-title">الأكثر مبيعًا</p></div>
      ${top.length? top.map((t,i)=>`
        <div class="top-prod-row clickable" onclick="openProductModal('${t.product.id}')" title="فتح المنتج">
          <span class="top-prod-rank">${i+1}</span>
          <div class="top-prod-info">
            <p class="top-prod-name">${t.product.nameAr}</p>
            <div class="top-prod-bar-bg"><div class="top-prod-bar-fill" style="width:${(t.units/maxUnits*100).toFixed(0)}%"></div></div>
          </div>
          <span class="top-prod-units">${t.units} قطعة</span>
        </div>
      `).join('') : `<div class="empty-state"><i class="fa-solid fa-chart-simple"></i><p>لا توجد بيانات مبيعات بعد</p></div>`}
    </div>
  </div>
  <div class="two-col">
    <div class="panel">
      <div class="panel-head"><p class="panel-title">أحدث النشاط</p><p class="panel-sub" style="margin-right:auto"></p></div>
      ${activity.length? activity.map(o=>`
        <div class="activity-row clickable" style="cursor:pointer" onclick="adminNavigate('orders');setTimeout(()=>openOrderModal('${o.id}'),0)">
          <div class="activity-icon"><i class="fa-solid ${o.source==='WEBSITE'?'fa-globe':'fa-brands fa-whatsapp'}"></i></div>
          <div style="flex:1">
            <p class="activity-text">طلب جديد <b>#${o.orderNumber}</b> من <b>${o.customerName}</b> بقيمة ${fmt(o.total)} ج.م</p>
            <p class="activity-time">${new Date(o.createdAt).toLocaleString('ar-EG')} · <span class="status-badge status-${o.status}" style="padding:.1rem .5rem"><span class="status-dot"></span>${STATUS_LABELS[o.status]}</span></p>
          </div>
        </div>
      `).join('') : `<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>لا يوجد نشاط بعد</p></div>`}
    </div>
    <div class="panel">
      <div class="panel-head"><p class="panel-title">الإيرادات حسب الفئة</p></div>
      ${byCat.length? byCat.map(c=>`
        <div class="top-prod-row clickable" onclick="onProductCategory('${c.category}');adminNavigate('products')" title="عرض منتجات هذه الفئة">
          <span class="top-prod-rank" style="background:transparent;border:1px solid var(--border-gold)"><i class="fa-solid fa-tag" style="font-size:.6rem"></i></span>
          <div class="top-prod-info">
            <p class="top-prod-name">${CATEGORY_LABELS[c.category]||c.category}</p>
            <div class="top-prod-bar-bg"><div class="top-prod-bar-fill" style="width:${(c.total/maxCat*100).toFixed(0)}%"></div></div>
          </div>
          <span class="top-prod-units">${fmt(c.total)} ج.م</span>
        </div>
      `).join('') : `<div class="empty-state"><i class="fa-solid fa-chart-pie"></i><p>لا توجد بيانات بعد</p></div>`}
    </div>
  </div>`;
}

function goToFilteredOrders(status){
  orderFilter = {search:'', status, date:null};
  adminView='orders';
  document.querySelectorAll('#adminView .nav-item[data-view]').forEach(el=>el.classList.toggle('active', el.dataset.view==='orders'));
  adminRender();
}
function goToOrdersByDate(date){
  orderFilter = {search:'', status:'all', date};
  adminView='orders';
  document.querySelectorAll('#adminView .nav-item[data-view]').forEach(el=>el.classList.toggle('active', el.dataset.view==='orders'));
  adminRender();
}
function clearOrderDateFilter(){
  orderFilter = {...orderFilter, date:null};
  adminRender();
}
function goToLowStock(){
  productFilter = {search:'', category:'all'};
  productSort = {key:'stock', dir:'asc'};
  adminView='products';
  document.querySelectorAll('#adminView .nav-item[data-view]').forEach(el=>el.classList.toggle('active', el.dataset.view==='products'));
  adminRender();
}
function setChartRange(days){ chartRangeDays = days; adminRender(); }
function setChartMetric(metric){ chartMetric = metric; adminRender(); }

function drawRevenueChart(){
  const svg = document.getElementById('revenueChart');
  const tooltip = document.getElementById('chartTooltip');
  if(!svg) return;
  const data = api.stats.revenueByDay(chartRangeDays);
  const values = data.map(d => chartMetric==='revenue' ? d.total : d.orders);
  const max = Math.max(...values, 1);
  const avg = values.reduce((s,v)=>s+v,0) / (values.length || 1);
  const w = 640, h = 220, padB = 26, padT = 10;
  const barW = (w / data.length) * 0.6;
  const gap = (w / data.length) * 0.4;
  const labelEvery = data.length > 20 ? 4 : data.length > 10 ? 2 : 1;
  const money = chartMetric === 'revenue';

  const avgY = h - padB - (avg/max) * (h - padB - padT);

  let svgContent = `<line x1="0" y1="${avgY.toFixed(1)}" x2="${w}" y2="${avgY.toFixed(1)}" stroke="var(--gold)" stroke-width="1" stroke-dasharray="4 4" opacity=".45"/>`;
  svgContent += `<text x="${w-4}" y="${(avgY-6).toFixed(1)}" text-anchor="end" class="bar-tooltip" fill="var(--gold)">المتوسط</text>`;

  data.forEach((d,i)=>{
    const val = money ? d.total : d.orders;
    const barH = (val/max) * (h - padB - padT);
    const x = i*(barW+gap) + gap/2;
    const y = h - padB - barH;
    const dateLabel = d.date.slice(5).replace('-','/');
    svgContent += `<rect class="rev-bar" data-idx="${i}" x="${x.toFixed(1)}" y="${(h-padB).toFixed(1)}" width="${barW.toFixed(1)}" height="0" rx="3" fill="#C9A84C" opacity="${val>0?0.85:0.15}" style="cursor:pointer;transition:height .5s cubic-bezier(.25,.46,.45,.94),y .5s cubic-bezier(.25,.46,.45,.94),opacity .2s,fill .2s" onmouseenter="onBarHover(event,${i})" onmousemove="onBarMove(event)" onmouseleave="onBarLeave(${i})" onclick="goToOrdersByDate('${d.date}')"></rect>`;
    if(i%labelEvery===0) svgContent += `<text x="${(x+barW/2).toFixed(1)}" y="${h-8}" text-anchor="middle" class="bar-tooltip">${dateLabel}</text>`;
  });
  svgContent += `<line x1="0" y1="${h-padB}" x2="${w}" y2="${h-padB}" stroke="rgba(201,168,76,0.15)" stroke-width="1"/>`;
  svg.innerHTML = svgContent;
  if(tooltip) tooltip.style.opacity = 0;

  window._chartData = data;
  window._chartMeta = {max, h, padB, padT};

  // grow-in animation: set real height on next frame so the CSS transition plays
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      data.forEach((d,i)=>{
        const val = money ? d.total : d.orders;
        const barH = (val/max) * (h - padB - padT);
        const y = h - padB - barH;
        const rect = svg.querySelector(`.rev-bar[data-idx="${i}"]`);
        if(rect){ rect.setAttribute('y', y.toFixed(1)); rect.setAttribute('height', barH.toFixed(1)); }
      });
    });
  });
}

function onBarHover(evt, i){
  const d = window._chartData?.[i];
  if(!d) return;
  evt.target.setAttribute('fill', '#E8D5A3');
  evt.target.setAttribute('opacity', '1');
  const tooltip = document.getElementById('chartTooltip');
  if(!tooltip) return;
  const dateLabel = new Date(d.date).toLocaleDateString('ar-EG',{weekday:'long', day:'numeric', month:'long'});
  tooltip.innerHTML = `<p class="ct-date">${dateLabel}</p><p class="ct-row"><i class="fa-solid fa-sack-dollar"></i> ${fmt(d.total)} ج.م</p><p class="ct-row"><i class="fa-solid fa-receipt"></i> ${d.orders} طلب</p><p class="ct-hint">اضغط لعرض طلبات هذا اليوم</p>`;
  tooltip.style.opacity = 1;
  onBarMove(evt);
}
function onBarMove(evt){
  const tooltip = document.getElementById('chartTooltip');
  const wrap = document.querySelector('#adminView .chart-wrap');
  if(!tooltip || !wrap) return;
  const wrapRect = wrap.getBoundingClientRect();
  let left = evt.clientX - wrapRect.left + 14;
  let top = evt.clientY - wrapRect.top - 10;
  const tw = tooltip.offsetWidth || 150;
  if(left + tw > wrapRect.width) left = evt.clientX - wrapRect.left - tw - 14;
  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
}
function onBarLeave(i){
  const svg = document.getElementById('revenueChart');
  const rect = svg?.querySelector(`.rev-bar[data-idx="${i}"]`);
  const d = window._chartData?.[i];
  if(rect && d){
    const val = chartMetric==='revenue' ? d.total : d.orders;
    rect.setAttribute('fill', '#C9A84C');
    rect.setAttribute('opacity', val>0?'0.85':'0.15');
  }
  const tooltip = document.getElementById('chartTooltip');
  if(tooltip) tooltip.style.opacity = 0;
}

function renderAdminProducts(){
  let items = api.products.list(productFilter);
  const cats = ['all','dark','milk','white','truffles','caramel','gifts'];
  if(productSort.key){
    items = [...items].sort((a,b)=>{
      const va=a[productSort.key], vb=b[productSort.key];
      const cmp = typeof va==='string' ? va.localeCompare(vb) : va-vb;
      return productSort.dir==='asc'?cmp:-cmp;
    });
  }
  const arrow = key => productSort.key===key ? `<i class="fa-solid fa-arrow-${productSort.dir==='asc'?'up':'down'}"></i>` : `<i class="fa-solid fa-arrow-down-arrow-up"></i>`;
  return `
  <div class="page-head">
    <div>
      <p class="page-title">المنتجات</p>
      <p class="page-sub">${items.length} منتج${productFilter.category!=='all'||productFilter.search? ' (مُصفّى)':''} — تظهر مباشرة في المتجر</p>
    </div>
    <button class="btn btn-gold" onclick="openProductModal()"><i class="fa-solid fa-plus"></i> إضافة منتج</button>
  </div>
  <div class="panel">
    <div class="filters-row">
      <div class="search-box">
        <input id="productSearchInput" placeholder="ابحث بالاسم أو الوصف..." value="${productFilter.search}" oninput="onProductSearch(this.value)">
        <i class="fa-solid fa-magnifying-glass"></i>
      </div>
      <div class="chip-select">
        ${cats.map(c=>`<button class="chip ${productFilter.category===c?'active':''}" onclick="onProductCategory('${c}')">${c==='all'?'الكل':CATEGORY_LABELS[c]}</button>`).join('')}
      </div>
    </div>
    ${items.length ? `
    <table>
      <thead><tr>
        <th class="sortable ${productSort.key==='name'?'active':''}" onclick="sortProducts('name')">المنتج ${arrow('name')}</th>
        <th>الفئة</th>
        <th class="sortable ${productSort.key==='price'?'active':''}" onclick="sortProducts('price')">السعر ${arrow('price')}</th>
        <th class="sortable ${productSort.key==='stock'?'active':''}" onclick="sortProducts('stock')">المخزون ${arrow('stock')}</th>
        <th></th>
      </tr></thead>
      <tbody>
        ${items.map(p=>`
          <tr>
            <td class="cell-main"><div class="cell-prod">
              <div class="cell-prod-thumb">${p.image?`<img src="${p.image}" alt="">`:p.icon||'🍫'}</div>
              <div><p class="cell-prod-name">${p.name} ${p.bestseller?'<i class="fa-solid fa-star" style="color:var(--gold);font-size:.65rem"></i>':''}${p.isNew?'<span class="badge badge-cat" style="margin-right:.3rem">جديد</span>':''}</p><p class="cell-prod-name-ar">${p.nameAr}</p></div>
            </div></td>
            <td data-label="الفئة"><span class="badge badge-cat">${CATEGORY_LABELS[p.category]}</span></td>
            <td data-label="السعر">${fmt(p.price)} ج.م</td>
            <td data-label="المخزون" class="${p.stock===0?'stock-out':p.stock<=10?'stock-low':'stock-ok'}">${p.stock} قطعة</td>
            <td class="cell-actions"><div class="row-actions">
              <button class="icon-btn" onclick="openProductModal('${p.id}')" title="تعديل"><i class="fa-solid fa-pen"></i></button>
              <button class="icon-btn danger" onclick="deleteProduct('${p.id}')" title="حذف"><i class="fa-solid fa-trash"></i></button>
            </div></td>
          </tr>
        `).join('')}
      </tbody>
    </table>` : `<div class="empty-state"><i class="fa-solid fa-box-open"></i><p>لا توجد منتجات مطابقة</p><button class="btn btn-gold" onclick="openProductModal()"><i class="fa-solid fa-plus"></i> إضافة منتج جديد</button></div>`}
  </div>`;
}

function sortProducts(key){
  if(productSort.key===key) productSort.dir = productSort.dir==='asc'?'desc':'asc';
  else productSort = {key, dir:'asc'};
  adminRender();
}
function onProductSearch(v){ productFilter.search = v; renderProductsTableOnly(); }
function onProductCategory(c){ productFilter.category = c; adminRender(); }
function renderProductsTableOnly(){
  const main = document.getElementById('adminMainContent');
  main.innerHTML = renderAdminProducts();
  const input = document.getElementById('productSearchInput');
  if(input){ input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
}

function updateProductImagePreview(src){
  const img = document.getElementById('pf-image-preview-img');
  const icon = document.querySelector('#pf-image-preview i');
  const clearBtn = document.getElementById('pf-image-clear-btn');
  if(src){
    img.src = src; img.style.display='block';
    if(icon) icon.style.display='none';
    if(clearBtn) clearBtn.style.display='inline-flex';
  } else {
    img.style.display='none'; img.src='';
    if(icon) icon.style.display='block';
    if(clearBtn) clearBtn.style.display='none';
  }
}
function onProductImageUrlInput(value){
  updateProductImagePreview(value.trim());
}
function onProductImageFile(file){
  if(!file) return;
  if(!file.type.startsWith('image/')){
    showToast('يرجى اختيار ملف صورة صالح', 'error');
    return;
  }
  const MAX_MB = 5;
  if(file.size > MAX_MB*1024*1024){
    showToast(`حجم الصورة كبير جدًا — الحد الأقصى ${MAX_MB} ميجابايت`, 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = e=>{
    document.getElementById('pf-image').value = e.target.result;
    updateProductImagePreview(e.target.result);
  };
  reader.onerror = ()=> showToast('تعذّرت قراءة الصورة، حاول مرة أخرى', 'error');
  reader.readAsDataURL(file);
}
function clearProductImage(){
  document.getElementById('pf-image').value = '';
  document.getElementById('pf-image-file').value = '';
  updateProductImagePreview('');
}

function openProductModal(id){
  const p = id ? DB.products.find(x=>x.id===id) : null;
  document.getElementById('productModalTitle').textContent = p ? 'تعديل منتج' : 'إضافة منتج';
  document.getElementById('pf-id').value = p?.id || '';
  document.getElementById('pf-name').value = p?.name || '';
  document.getElementById('pf-nameAr').value = p?.nameAr || '';
  document.getElementById('pf-desc').value = p?.desc || '';
  document.getElementById('pf-price').value = p?.price || '';
  document.getElementById('pf-category').value = p?.category || 'dark';
  document.getElementById('pf-stock').value = p?.stock ?? '';
  document.getElementById('pf-icon').value = p?.icon || '';
  document.getElementById('pf-image').value = p?.image || '';
  updateProductImagePreview(p?.image || '');
  document.getElementById('pf-bestseller').checked = !!p?.bestseller;
  document.getElementById('pf-new').checked = !!p?.isNew;
  document.getElementById('pf-featured').checked = !!p?.featured;
  openAdminModal('productModalOverlay');
}

function saveProduct(){
  const id = document.getElementById('pf-id').value;
  const name = document.getElementById('pf-name').value.trim();
  const nameAr = document.getElementById('pf-nameAr').value.trim();
  const price = parseFloat(document.getElementById('pf-price').value);
  if(!name || !nameAr || !price){
    showToast('يرجى ملء الاسم والسعر على الأقل', 'error');
    return;
  }
  const data = {
    name, nameAr,
    desc: document.getElementById('pf-desc').value.trim(),
    price,
    category: document.getElementById('pf-category').value,
    stock: parseInt(document.getElementById('pf-stock').value) || 0,
    icon: document.getElementById('pf-icon').value.trim() || '🍫',
    image: document.getElementById('pf-image').value.trim(),
    bestseller: document.getElementById('pf-bestseller').checked,
    isNew: document.getElementById('pf-new').checked,
    featured: document.getElementById('pf-featured').checked,
  };
  if(id){ api.products.update(id, data); showToast('تم تحديث المنتج بنجاح — ظهر التحديث في المتجر'); }
  else { api.products.create(data); showToast('تمت إضافة المنتج بنجاح — ظهر في المتجر الآن'); }
  closeAdminModal('productModalOverlay');
  adminRender();
}

function deleteProduct(id){
  const p = DB.products.find(x=>x.id===id);
  if(!confirm(`هل تريد حذف "${p?.nameAr}"؟`)) return;
  api.products.delete(id);
  showToast('تم حذف المنتج');
  adminRender();
}

function renderAdminOrders(){
  let items = api.orders.list(orderFilter);
  const statuses = ['all', ...STATUS_FLOW];
  if(orderSort.key==='total') items = [...items].sort((a,b)=> orderSort.dir==='asc'? a.total-b.total : b.total-a.total);
  else if(orderSort.key==='createdAt') items = [...items].sort((a,b)=> orderSort.dir==='asc'? new Date(a.createdAt)-new Date(b.createdAt) : new Date(b.createdAt)-new Date(a.createdAt));
  const arrow = key => orderSort.key===key ? `<i class="fa-solid fa-arrow-${orderSort.dir==='asc'?'up':'down'}"></i>` : `<i class="fa-solid fa-arrow-down-arrow-up"></i>`;
  return `
  <div class="page-head">
    <div>
      <p class="page-title">الطلبات</p>
      <p class="page-sub">${items.length} طلب${orderFilter.status!=='all'||orderFilter.search||orderFilter.date? ' (مُصفّى)':''} — تشمل طلبات الموقع والواتساب${orderFilter.date? ` · بتاريخ ${new Date(orderFilter.date).toLocaleDateString('ar-EG',{day:'numeric',month:'long'})} <button class="chip" style="margin-right:.5rem" onclick="clearOrderDateFilter()"><i class="fa-solid fa-xmark"></i> مسح التصفية</button>`:''}</p>
    </div>
  </div>
  <div class="panel">
    <div class="filters-row">
      <div class="search-box">
        <input id="orderSearchInput" placeholder="ابحث بالاسم أو الهاتف..." value="${orderFilter.search}" oninput="onOrderSearch(this.value)">
        <i class="fa-solid fa-magnifying-glass"></i>
      </div>
      <div class="chip-select">
        ${statuses.map(s=>`<button class="chip ${orderFilter.status===s?'active':''}" onclick="onOrderStatus('${s}')">${s==='all'?'الكل':STATUS_LABELS[s]}</button>`).join('')}
      </div>
    </div>
    ${items.length ? `
    <table>
      <thead><tr>
        <th>الطلب / العميل</th><th>المصدر</th><th>المنتجات</th>
        <th class="sortable ${orderSort.key==='total'?'active':''}" onclick="sortOrders('total')">الإجمالي ${arrow('total')}</th>
        <th>الحالة</th>
        <th class="sortable ${orderSort.key==='createdAt'?'active':''}" onclick="sortOrders('createdAt')">التاريخ ${arrow('createdAt')}</th>
      </tr></thead>
      <tbody>
        ${items.map(o=>`
          <tr class="clickable" onclick="openOrderModal('${o.id}')">
            <td class="cell-main">#${o.orderNumber}<br><span style="color:var(--text-dim);font-weight:400;font-size:.78rem">${o.customerName} — ${o.phone}</span></td>
            <td data-label="المصدر">${o.source==='WEBSITE'?'<i class="fa-solid fa-globe" style="color:var(--gold)"></i> الموقع':'<i class="fa-brands fa-whatsapp" style="color:#25D366"></i> واتساب'}</td>
            <td data-label="المنتجات">${o.items.reduce((s,i)=>s+i.qty,0)} قطعة</td>
            <td data-label="الإجمالي">${fmt(o.total)} ج.م</td>
            <td data-label="الحالة" onclick="event.stopPropagation()">
              <select class="row-status-select status-${o.status}" onchange="quickUpdateStatus('${o.id}', this.value)">
                ${STATUS_FLOW.map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${STATUS_LABELS[s]}</option>`).join('')}
              </select>
            </td>
            <td data-label="التاريخ" style="color:var(--text-dim);font-size:.75rem">${new Date(o.createdAt).toLocaleDateString('ar-EG')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>` : `<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>لا توجد طلبات مطابقة</p></div>`}
  </div>`;
}

function sortOrders(key){
  if(orderSort.key===key) orderSort.dir = orderSort.dir==='asc'?'desc':'asc';
  else orderSort = {key, dir:'desc'};
  adminRender();
}
function quickUpdateStatus(id, status){
  api.orders.updateStatus(id, status);
  showToast('تم تحديث حالة الطلب #' + DB.orders.find(o=>o.id===id)?.orderNumber);
  adminRender();
}

function onOrderSearch(v){ orderFilter.search=v; renderOrdersTableOnly(); }
function onOrderStatus(s){ orderFilter.status=s; adminRender(); }
function renderOrdersTableOnly(){
  const main = document.getElementById('adminMainContent');
  main.innerHTML = renderAdminOrders();
  const input = document.getElementById('orderSearchInput');
  if(input){ input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
}

function openOrderModal(id){
  const o = api.orders.getById(id);
  if(!o) return;
  const body = document.getElementById('orderModalBody');
  body.innerHTML = `
    <div class="modal-head">
      <p class="modal-title">طلب #${o.orderNumber}</p>
      <button class="modal-close" onclick="closeAdminModal('orderModalOverlay')"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="order-detail-head">
      <div><p style="color:var(--text-dim);font-size:.68rem;text-transform:uppercase;margin-bottom:.2rem">العميل</p><p style="font-weight:600">${o.customerName}</p><p style="font-size:.75rem;color:var(--text-muted)">${o.phone}</p></div>
      <div><p style="color:var(--text-dim);font-size:.68rem;text-transform:uppercase;margin-bottom:.2rem">المصدر</p><p style="font-weight:600">${o.source==='WHATSAPP'?'واتساب':'الموقع'}</p></div>
      <div><p style="color:var(--text-dim);font-size:.68rem;text-transform:uppercase;margin-bottom:.2rem">التاريخ</p><p style="font-weight:600">${new Date(o.createdAt).toLocaleDateString('ar-EG')}</p></div>
    </div>
    ${o.items.map(it=>{
      const p = DB.products.find(pp=>pp.id===it.productId);
      return `<div class="order-detail-item"><span>${p?p.nameAr:'منتج محذوف'} × ${it.qty}</span><span>${fmt(it.unitPrice*it.qty)} ج.م</span></div>`;
    }).join('')}
    <div class="order-detail-item" style="border-bottom:none;font-weight:700;color:var(--gold);padding-top:1rem">
      <span>الإجمالي (شامل التوصيل ${fmt(o.deliveryFee)} ج.م)</span><span>${fmt(o.total)} ج.م</span>
    </div>
    <div class="form-field" style="margin-top:1.25rem">
      <label>تحديث حالة الطلب</label>
      <select id="orderStatusSelect">
        ${STATUS_FLOW.map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${STATUS_LABELS[s]}</option>`).join('')}
      </select>
    </div>
    <div class="timeline">
      ${o.statusLog.map(l=>`<div class="timeline-item"><i class="fa-solid fa-circle-check"></i><span>${STATUS_LABELS[l.status]} — ${new Date(l.at).toLocaleString('ar-EG')}</span></div>`).join('')}
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" onclick="closeAdminModal('orderModalOverlay')">إغلاق</button>
      <button class="btn btn-gold" onclick="saveOrderStatus('${o.id}')"><i class="fa-solid fa-check"></i> حفظ الحالة</button>
    </div>
  `;
  openAdminModal('orderModalOverlay');
}

function saveOrderStatus(id){
  const status = document.getElementById('orderStatusSelect').value;
  api.orders.updateStatus(id, status);
  showToast('تم تحديث حالة الطلب');
  closeAdminModal('orderModalOverlay');
  adminRender();
}

function renderAdminCustomers(){
  const top = api.stats.topCustomers(50);
  return `
  <div class="page-head">
    <div>
      <p class="page-title">العملاء</p>
      <p class="page-sub">${top.length} عميل مرتّبين حسب إجمالي الإنفاق</p>
    </div>
  </div>
  <div class="panel">
    ${top.length? `
    <table>
      <thead><tr><th>العميل</th><th>الهاتف</th><th>عدد الطلبات</th><th>إجمالي الإنفاق</th></tr></thead>
      <tbody>
        ${top.map(c=>`
          <tr>
            <td class="cell-main"><div class="cust-row" style="border:none;padding:0"><div class="cust-avatar">${c.name.trim().charAt(0)}</div><span class="cust-name">${c.name}</span></div></td>
            <td data-label="الهاتف" style="color:var(--text-dim)">${c.phone}</td>
            <td data-label="عدد الطلبات">${c.orders}</td>
            <td data-label="إجمالي الإنفاق" style="color:var(--gold);font-weight:700">${fmt(c.total)} ج.م</td>
          </tr>
        `).join('')}
      </tbody>
    </table>` : `<div class="empty-state"><i class="fa-solid fa-user-slash"></i><p>لا يوجد عملاء بعد</p></div>`}
  </div>`;
}

/* ===== ADMIN MODAL / TOAST HELPERS ===== */
function openAdminModal(id){ document.getElementById(id).classList.add('show'); document.body.style.overflow='hidden'; }
function closeAdminModal(id){ document.getElementById(id).classList.remove('show'); document.body.style.overflow=''; }
document.querySelectorAll('#adminView .modal-overlay').forEach(ov=>{
  ov.addEventListener('click', e=>{ if(e.target===ov) closeAdminModal(ov.id); });
});

// ---- boot: render the storefront grid, then honor #admin deep-links ----
renderStoreProducts();
if(location.hash==='#admin') showAdmin();
