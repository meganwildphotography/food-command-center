/* Food Command Center — engine (pure logic, no DOM). Works in browser + Node. */
(function (root) {
  'use strict';
  var VERSION = 1;
  var PEOPLE_ORDER = ['mark', 'kaden', 'winter', 'megan'];
  var QTY_STEPS = ['Lots', 'Some', 'Almost out', '1 left'];
  var STORES = ['ShopRite', 'Stop & Shop', 'Walmart'];

  /* ---------- helpers ---------- */
  function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function cap(s) { s = String(s || '').trim(); return s.charAt(0).toUpperCase() + s.slice(1); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function esc(re) { return re.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* ---------- ingredient keys ---------- */
  var ALIASES = [
    ['spice', ['crushed red pepper', 'lemon pepper', 'garlic salt', 'garlic powder', 'cinnamon', 'rosemary', 'italian seasoning', 'seasoning', 'adobo', 'sazon', 'paprika', 'cayenne', 'basil', 'thyme', 'oregano']],
    ['condiment', ['soy sauce', 'tabasco', 'worcestershire', 'hot sauce', 'dressing', 'bbq sauce', 'barbecue sauce', 'gravy']],
    ['chips', ['potato chip', 'chips', 'pringles', 'takis']],
    ['tacoshells', ['taco shell']],
    ['riceroni', ['rice-a-roni', 'rice a roni', 'riceroni', 'rice-o-roni']],
    ['soupmix', ['ring-o-noodle', 'ring o noodle', 'soup mix', 'soup']],
    ['locatelli', ['locatelli', 'pecorino', 'romano', 'parmesan', 'parm']],
    ['creamcheese', ['cream cheese']],
    ['cheesestick', ['string cheese', 'cheese stick']],
    ['mac', ['mac & cheese', 'mac and cheese', 'mac n cheese', 'mac-n-cheese', 'mac n\' cheese', 'kraft dinner']],
    ['pb', ['peanut butter']],
    ['icecream', ['ice cream', 'breyers']],
    ['nuggets', ['nugget', 'tenders', 'chicken strips']],
    ['pizza', ['pizza', 'pepperoni']],
    ['burger', ['burger', 'patties', 'patty']],
    ['groundbeef', ['ground beef', 'chopped meat', 'ground chuck', 'hamburger meat']],
    ['steak', ['steak', 'sirloin', 'ribeye', 'rib eye']],
    ['carnitas', ['carnitas']],
    ['porktenderloin', ['pork tenderloin', 'teriyaki pork', 'tenderloin', 'pork loin', 'pork chop', 'pork']],
    ['bacon', ['bacon']],
    ['hotdog', ['hot dog', 'hotdog', 'franks', 'sabrett']],
    ['chicken', ['chicken']],
    ['eggs', ['egg']],
    ['cheese', ['cheese', 'cheddar', 'mozzarella', 'american', 'provolone']],
    ['tortillas', ['tortilla', 'wrap']],
    ['bagels', ['bagel']],
    ['buns', ['bun', 'rolls', 'roll', 'hoagie']],
    ['bread', ['bread', 'toast']],
    ['fries', ['fries', 'french fry', 'tater tot', 'tots']],
    ['potatoes', ['potato']],
    ['corn', ['corn']],
    ['apples', ['apple']],
    ['sauce', ['sauce', 'marinara', 'prego', 'ragu', 'bertolli']],
    ['pasta', ['pasta', 'macaroni', 'elbow', 'ziti', 'penne', 'rigatoni', 'spaghetti', 'shells', 'noodle']],
    ['rice', ['rice']],
    ['ketchup', ['ketchup']],
    ['milk', ['milk']],
    ['butter', ['butter']],
    ['cereal', ['cereal', 'pebbles', 'cheerios', 'frosted flakes']],
    ['oliveoil', ['olive oil', 'oil']],
    ['salt', ['salt']],
    ['pepper', ['pepper']],
    ['deli', ['deli', 'turkey', 'ham', 'salami']],
    ['jerky', ['jerky']],
    ['yogurt', ['yogurt']],
    ['pie', ['pies', 'pie']]
  ];
  var ALIAS_RE = ALIASES.map(function (a) {
    return [a[0], a[1].map(function (w) { return new RegExp('(^|[^a-z])' + esc(w)); })];
  });
  function keyOf(name) {
    var s = String(name || '').toLowerCase().replace(/[’']/g, "'");
    if (/applesauce/.test(s)) return 'applesauce';
    if (/popcorn/.test(s)) return 'popcorn';
    for (var i = 0; i < ALIAS_RE.length; i++) {
      var res = ALIAS_RE[i][1];
      for (var j = 0; j < res.length; j++) if (res[j].test(s)) return ALIAS_RE[i][0];
    }
    return null;
  }
  var KEY_NAME = {
    riceroni: 'Rice-A-Roni', soupmix: 'Soup mix', locatelli: 'Locatelli Pecorino Romano', creamcheese: 'Cream cheese',
    cheesestick: 'Cheese sticks', mac: 'Mac & cheese', pb: 'Peanut butter', icecream: 'Ice cream', nuggets: 'Chicken nuggets',
    pizza: 'Frozen pizza', burger: 'Burgers', groundbeef: 'Ground beef', steak: 'Steak', carnitas: 'Carnitas pork',
    porktenderloin: 'Pork tenderloin', bacon: 'Bacon', hotdog: 'Hot dogs', chicken: 'Chicken', eggs: 'Eggs', cheese: 'Cheese',
    tortillas: 'Tortillas', bagels: 'Bagels', buns: 'Buns / rolls', bread: 'Bread', fries: 'Fries', potatoes: 'Potatoes',
    corn: 'Corn', apples: 'Apples', pasta: 'Macaroni / pasta', sauce: 'Pasta sauce', rice: 'Rice', ketchup: 'Ketchup',
    milk: 'Milk', butter: 'Butter', cereal: 'Cereal', oliveoil: 'Olive oil', salt: 'Salt', pepper: 'Pepper', deli: 'Deli meat',
    jerky: 'Beef jerky', yogurt: 'Yogurt', pie: 'Pie', spice: 'Spices', condiment: 'Condiments', chips: 'Chips', tacoshells: 'Taco shells', applesauce: 'Applesauce', popcorn: 'Popcorn'
  };
  var BASICS = ['salt', 'pepper', 'oliveoil', 'ketchup', 'butter'];

  /* ---------- departments ---------- */
  var DEPTS = [
    ['Pantry', ['mac & cheese', 'mac and cheese', 'mac n cheese', 'kraft']],
    ['Frozen', ['frozen', 'ice cream', 'breyers', 'nugget', 'fries', 'tater', 'bubba', 'pizza', 'waffle', 'ice pop', 'superpretzel', 'italian ices', 'rainbow cones']],
    ['Snacks & Cereal', ['cereal', 'pebbles', 'cheerios', 'chips', 'goldfish', 'pretzel', 'cookie', 'cheez', 'snack', 'popcorn', 'cracker', 'granola', 'candy', 'pie', 'pringles', 'takis', 'color cups']],
    ['Dairy & Eggs', ['cream cheese', 'locatelli', 'pecorino', 'romano', 'milk', 'egg', 'cheese', 'butter', 'yogurt', 'sour cream']],
    ['Meat', ['chicken', 'beef', 'steak', 'pork', 'bacon', 'burger', 'sausage', 'hot dog', 'franks', 'ham', 'turkey', 'carnitas', 'tenderloin', 'meatball', 'deli', 'sirloin', 'jerky', 'pepperoni']],
    ['Bakery', ['bread', 'bagel', 'bun', 'roll', 'tortilla', 'wrap', 'muffin']],
    ['Produce', ['apple', 'banana', 'potato', 'corn', 'grape', 'clementine', 'onion', 'lettuce', 'fruit', 'berries', 'strawberr', 'orange', 'lemon']],
    ['Drinks', ['water', 'juice', 'gatorade', 'soda', 'coffee', 'starbucks', 'tea', 'seltzer']],
    ['Pantry', ['pasta', 'macaroni', 'rice', 'sauce', 'soup', 'oil', 'salt', 'pepper', 'ketchup', 'seasoning', 'flour', 'sugar', 'peanut butter', 'noodle', 'mac', 'can', 'beans', 'ranch', 'mayo', 'mustard', 'cinnamon', 'garlic', 'rosemary', 'paprika', 'cayenne', 'basil', 'thyme', 'adobo', 'sazon', 'spice', 'worcestershire', 'tabasco', 'soy', 'dressing', 'gravy', 'taco shell']],
    ['Household', ['paper', 'towel', 'soap', 'detergent', 'foil', 'bags', 'tissue', 'wipes', 'trash']]
  ];
  function deptOf(name) {
    var s = String(name || '').toLowerCase();
    for (var i = 0; i < DEPTS.length; i++) for (var j = 0; j < DEPTS[i][1].length; j++) if (s.indexOf(DEPTS[i][1][j]) >= 0) return DEPTS[i][0];
    return 'Other';
  }
  function defaultLoc(name) {
    var d = deptOf(name);
    if (d === 'Frozen') return 'freezer';
    if (d === 'Meat' || d === 'Dairy & Eggs' || d === 'Produce') return 'fridge';
    return 'pantry';
  }

  /* ---------- seed ---------- */
  function inv(name, loc, qty, extra) {
    var o = { id: uid(), name: name, loc: loc, qty: qty, useSoon: false, added: ymd() };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  function shopItem(name, store, why) {
    return { id: uid(), name: name, store: store || 'Any store', dept: deptOf(name), qty: 1, checked: false, why: why || '', added: ymd() };
  }
  function pb(name, unit, normal, good, stockup, extra) {
    var o = { id: uid(), name: name, unit: unit, normal: normal, good: good, stockup: stockup, placeholder: true, store: '', lastSeen: null, note: '' };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  function seed() {
    return {
      version: VERSION,
      created: new Date().toISOString(),
      lastOpened: null,
      settings: { weeklyBudget: 200, stores: STORES.slice(), showHealthNote: true, markOffDays: [2, 3] },
      people: {
        megan: { id: 'megan', name: 'Megan', role: 'Mom', emoji: '👩', color: 'gold',
          loves: ['steak', 'potatoes', 'apples'], wontEat: ['vegetables', 'fruit (except apples)'],
          ideal: 'Steak + potato', healthNote: 'Gentle and optional: extra water is your kidneys’ best friend. That’s it. Your meals stay exactly as they are. 💛' },
        mark: { id: 'mark', name: 'Mark', role: 'Dad', emoji: '👨', color: 'orange',
          loves: ['protein', 'meat', 'sweets', 'pies', 'everything'], wontEat: [],
          job: 'Porter: needs portable, filling, reheatable work meals', offDays: 'Tuesday & Wednesday' },
        kaden: { id: 'kaden', name: 'Kaden', role: 'Son', emoji: '🧒', color: 'pink', age: 10,
          loves: ['chicken nuggets', 'chicken', 'burgers', 'bacon', 'all meat', 'pizza', 'fries', 'mac & cheese', 'macaroni', 'cream cheese', 'bagels', 'eggs', 'ketchup'],
          wontEat: ['vegetables (never plan them)', 'spaghetti (not a fan)', 'fruit (not reliable)'],
          rule: 'Protein + carb + ketchup/sauce' },
        winter: { id: 'winter', name: 'Winter', role: 'Daughter', emoji: '👧', color: 'pink', age: 8,
          loves: ['chicken nuggets', 'chicken', 'burgers', 'bacon', 'all meat', 'pizza', 'fries', 'mac & cheese', 'macaroni', 'cream cheese', 'bagels', 'eggs', 'ketchup', 'corn', 'apples', 'fruit'],
          wontEat: ['most vegetables (corn is her veggie)'], rule: 'Same as Kaden + corn + apples' }
      },
      inventory: [
        // Pantry: basics
        inv('Olive oil (Filippo Berio)', 'pantry', 'Some'),
        inv('Salt', 'pantry', 2, { note: '2 canisters, incl. iodized' }),
        inv('Pepper', 'pantry', 'Lots'),
        // Pantry: spices
        inv('Cinnamon', 'pantry', 4),
        inv('Garlic powder', 'pantry', 2),
        inv('Crushed red pepper', 'pantry', 2),
        inv('Rosemary', 'pantry', 2),
        inv('Lemon pepper', 'pantry', 2),
        inv('Italian seasoning', 'pantry', 2, { note: 'Casablanca jar + McCormick grinder' }),
        inv('Garlic salt', 'pantry', 2, { note: 'McCormick + Spice Classics' }),
        inv('Kingsford all-purpose seasoning', 'pantry', 1),
        inv('Goya Adobo without pepper (16.5 oz)', 'pantry', 1),
        inv('Goya Adobo (small, yellow lid)', 'pantry', 1),
        inv('Goya Sazonador Total', 'pantry', 1),
        inv('Sazon Goya packet', 'pantry', 1),
        inv('Paprika (Haddar)', 'pantry', 1),
        inv('Cayenne (Badia)', 'pantry', 1),
        inv('Basil (McCormick)', 'pantry', 1),
        inv('Thyme (Victoria)', 'pantry', 1),
        // Pantry: sauces & condiments
        inv('Soy sauce', 'pantry', 1),
        inv('Tabasco Green Pepper sauce', 'pantry', 1),
        inv('Worcestershire sauce', 'pantry', 1),
        inv('Wish-Bone Italian dressing (15 oz)', 'pantry', 1),
        inv("Campbell's Beef Gravy", 'pantry', 1),
        // Pantry: rice, pasta, baking
        inv('Boil-in-bag rice, store brand (box)', 'pantry', 2),
        inv('Success boil-in-bag rice (box)', 'pantry', 2),
        inv('Minute white rice', 'pantry', 1),
        inv('Long-grain rice (large bag)', 'pantry', 1),
        inv('Rice-A-Roni', 'pantry', 4, { note: '2 Chicken, 1 Pilaf, 1 Stir Fried' }),
        inv('Sugar 4 lb (Wegmans)', 'pantry', 1),
        inv('Shells pasta (bag)', 'pantry', 1),
        inv('Tube pasta (bag)', 'pantry', 1),
        inv('Elbow macaroni (bag)', 'pantry', 1),
        inv('Mac & cheese cup', 'pantry', 1),
        inv('Taco shells', 'pantry', 1),
        // Pantry: bread & snacks
        inv('Plain bagels (bag of 6)', 'pantry', 1),
        inv('Pringles', 'pantry', 2),
        inv('Takis', 'pantry', 1),
        inv('Potato chips (bag)', 'pantry', 2),
        inv('Joy Color Cups', 'pantry', 1),
        // Fridge
        inv('Family-size chicken breasts', 'fridge', 'Lots', { useSoon: true }),
        inv('Hatfield Carnitas dry-rubbed boneless pork roast', 'fridge', 1),
        inv('Hatfield Honey Garlic Teriyaki pork tenderloin', 'fridge', 1),
        inv("Nature's Promise grass-fed top sirloin steak 8 oz", 'fridge', 1, { useSoon: true, price: '$14.58/lb' }),
        inv('Prego Traditional sauce', 'fridge', 1),
        inv("Marie Callender's strawberry rhubarb pie", 'fridge', 2, { note: 'Mark loves pies 🥧' }),
        inv('Milk (gallon)', 'fridge', 1),
        // Freezer
        inv('Stop & Shop oven-baked pizza', 'freezer', 2),
        inv('Bubba Burger Smashed Original Beef Chuck (8 ct)', 'freezer', 8),
        inv('Breyers ice cream (tub)', 'freezer', 3),
        inv('Perdue chicken nuggets (12 oz)', 'freezer', 1),
        inv('SuperPretzel soft pretzel bites (box)', 'freezer', 1),
        inv("Marino's Italian ices (box)", 'freezer', 1),
        inv('Birds Eye vegetable bag (type unknown)', 'freezer', 1, { labelMe: true, note: 'Label me: what kind?' }),
        inv('Raw meat tray (type unknown)', 'freezer', 2, { labelMe: true, note: 'Label me: what meat is it?' }),
        inv('Rainbow cones', 'freezer', 1)
      ],
      shopping: [
        shopItem('Locatelli Grated Pecorino Romano', 'ShopRite', 'For Sunday Macaroni Day'),
        shopItem('Lipton Ring-O-Noodle soup mix (2 ct)', 'Stop & Shop'),
        shopItem('Fruity Pebbles with Marshmallows', 'Walmart')
      ],
      rejections: { megan: {}, mark: {}, kaden: {}, winter: {} },
      budget: { log: [] },
      pricebook: [
        pb('Chicken breast', 'per lb', 3.99, 2.99, 1.99),
        pb('Ground beef 80/20', 'per lb', 5.99, 4.49, 3.49),
        pb("Nature's Promise grass-fed top sirloin steak", 'per lb', 14.58, 11.99, 9.99,
          { placeholder: false, store: 'Stop & Shop', lastSeen: 14.58, note: 'Normal price recorded from your 8 oz pack ($14.58/lb). Good/Stock-up are placeholders.' }),
        pb('Bacon', '16 oz pack', 6.99, 4.99, 3.99),
        pb('Eggs', 'dozen', 4.49, 2.99, 1.99),
        pb('Milk', 'gallon', 4.29, 3.49, 2.99),
        pb('Shredded cheese', '8 oz bag', 3.99, 2.5, 1.99),
        pb('Macaroni / pasta', '1 lb box', 1.99, 1.25, 0.99),
        pb('Pasta sauce', 'jar', 3.49, 2.0, 1.49),
        pb('Locatelli Grated Pecorino Romano', '8 oz', 8.99, 6.99, 5.49),
        pb('Rice-A-Roni', 'box', 1.99, 1.25, 1.0),
        pb('Potatoes', '5 lb bag', 4.99, 3.49, 2.49),
        pb('Corn', 'bag or 4 ears', 2.99, 2.0, 1.25),
        pb('Apples', '3 lb bag', 4.99, 3.49, 2.99),
        pb('Chicken nuggets', 'bag', 8.99, 6.99, 4.99),
        pb('Bubba Burger (8 ct)', 'box', 12.99, 9.99, 7.99),
        pb('Frozen pizza', 'each', 6.99, 4.99, 3.33),
        pb('Breyers ice cream', '48 oz', 5.99, 3.99, 2.99)
      ],
      tonight: null,
      routinesAdded: {},
      lastMealId: null
    };
  }

  /* ---------- inventory queries ---------- */
  function isOut(it) { return it.qty === 0 || it.qty === '0' || it.qty === 'Out'; }
  function itemsWithKey(state, key, sources) {
    return state.inventory.filter(function (it) {
      if (isOut(it)) return false;
      if (sources && sources.length && sources.indexOf(it.loc) < 0) return false;
      return (it.key || keyOf(it.name)) === key;
    });
  }
  function haveFn(state, sources, extraKeys) {
    var extra = extraKeys || null;
    return function (key) {
      if (extra && extra.indexOf(key) >= 0) return true;
      if (BASICS.indexOf(key) >= 0 && key !== 'ketchup' && key !== 'butter') return true; // salt/pepper/oil assumed
      return itemsWithKey(state, key, extra ? null : sources).length > 0;
    };
  }
  function useSoonKeys(state) {
    var out = [];
    state.inventory.forEach(function (it) {
      var low = it.qty === '1 left' || it.qty === 'Almost out';
      if (it.useSoon || /leftover/i.test(it.name)) { var k = it.key || keyOf(it.name); if (k) out.push(k); }
      else if (low) { /* low items are not "use first", they're "buy soon" */ }
    });
    return out;
  }

  /* ---------- meals ---------- */
  function P(megan, mark, kaden, winter) { return { megan: megan, mark: mark, kaden: kaden, winter: winter }; }
  var MEALS = [
    { id: 'pizza-night', name: 'Freezer Pizza Night', emoji: '🍕', req: ['pizza'], time: 15, energy: 5, freezer: true, loved: ['kaden', 'winter', 'mark', 'megan'],
      plates: P('Pizza (plain, no veggie toppings)', 'Pizza + a big scoop of Breyers after', 'Pizza + ketchup or sauce for dipping', 'Pizza{corn}{apple}'),
      steps: ['Turn the oven on to the temp on the box.', 'Pizzas go straight from the freezer onto the rack or a sheet pan.', 'Set a timer for the box time, then go sit down. The oven does the work.', 'Slice, plate, done. Ice cream for whoever wants it.'] },
    { id: 'burger-night', name: 'Bubba Burger Night', emoji: '🍔', req: ['burger'], opt: ['buns', 'cheese', 'fries', 'potatoes'], time: 15, energy: 25, freezer: true, loved: ['mark', 'kaden', 'winter'],
      plates: P('Burger (bun optional){fries}', 'Double cheeseburger (he can eat 2)', 'Burger + bun + ketchup{fries}', 'Burger + bun + ketchup{corn}'),
      steps: ['Heat a skillet on medium-high. No oil needed.', 'Burgers go straight from frozen into the pan, 4–5 min per side.', 'Put cheese on for the last minute if anyone wants it.', 'Buns, ketchup, plates. Fries in the oven or air fryer if you have them.'] },
    { id: 'nuggets-fries', name: 'Nuggets Night', emoji: '🍗', req: ['nuggets'], opt: ['fries'], time: 20, energy: 5, freezer: true, loved: ['kaden', 'winter'],
      plates: P('Nuggets, or a steak/burger if you’d rather', 'Nuggets + a burger or leftovers for extra protein', 'Nuggets{fries} + ketchup', 'Nuggets{fries} + ketchup{corn}{apple}'),
      steps: ['Oven or air fryer to the temp on the bag.', 'Nuggets and fries on one sheet pan (fries go in first if they take longer).', 'Shake halfway through.', 'Ketchup cups, plates, done.'] },
    { id: 'chicken-night', name: 'Easy Baked Chicken Night', emoji: '🍗', req: ['chicken'], opt: ['potatoes', 'fries', 'rice', 'corn'], time: 30, energy: 50, loved: ['mark', 'kaden', 'winter'],
      plates: P('Chicken{fries} (or save the steak for you 🥩)', 'Big chicken portion{fries}', 'Chicken pieces{fries} + ketchup', 'Chicken{fries}{corn}{apple}'),
      steps: ['Oven to 425°F. Line a sheet pan with foil (easy cleanup).', 'Chicken on the pan: olive oil, salt, pepper. That’s it.', 'Bake 22–25 min. Potatoes or fries can share the oven.', 'Slice Kaden’s into strips with ketchup. Plate everyone separately.'] },
    { id: 'steak-potato', name: 'Steak & Potato Night', emoji: '🥩', req: ['steak', 'potatoes'], opt: ['chicken', 'burger'], time: 30, energy: 50, loved: ['megan', 'mark'],
      plates: P('Steak + potato. Your favorite 💛', 'Steak + potato, plus a burger or chicken on the side', 'A burger or steak bites{fries} + ketchup', 'Steak bites or a burger{corn}{apple}'),
      steps: ['Potatoes first: microwave 6–8 min, or bake if you have time.', 'Pat the steak dry, then salt and pepper it.', 'Hot pan with a little oil, 4–5 min per side. Rest it 5 min.', 'Cook a couple of Bubba burgers in the same pan for the kids and Mark.'] },
    { id: 'carnitas-night', name: 'Carnitas Night', emoji: '🌮', req: ['carnitas'], opt: ['tortillas', 'rice', 'cheese'], time: 60, energy: 25, loved: ['mark'],
      plates: P('Carnitas + potatoes or rice (tortilla optional)', 'Loaded plate: extra carnitas + rice + tortillas', 'Carnitas + rice or a tortilla + ketchup/sauce', 'Carnitas + rice{corn}'),
      steps: ['Oven to the temp on the Hatfield package. The roast is already seasoned.', 'Roast in a covered pan. Hands-off for about an hour.', 'Shred with two forks.', 'Everyone builds their own plate. Nothing gets mixed together.'] },
    { id: 'teriyaki-pork', name: 'Honey Garlic Teriyaki Pork', emoji: '🍖', req: ['porktenderloin'], opt: ['rice', 'riceroni'], time: 45, energy: 25, loved: ['mark'],
      plates: P('Pork slices + potato or rice', 'Big pork portion + rice (great work-meal leftovers)', 'Pork slices + rice + ketchup', 'Pork slices + rice{corn}'),
      steps: ['Oven to 400°F (check the package).', 'Tenderloin goes in a pan with its marinade. Roast 25–35 min.', 'Make rice or Rice-A-Roni while it cooks.', 'Rest 5 min, slice, and plate everyone separately.'] },
    { id: 'chicken-quesadillas', name: 'Chicken Quesadillas', emoji: '🫓', req: ['chicken', 'tortillas', 'cheese'], time: 20, energy: 25, leftover: true, loved: ['kaden', 'winter', 'mark'],
      plates: P('Chicken & cheese quesadilla (or just steak + potato tonight)', '2 quesadillas, extra chicken', 'Chicken & cheese quesadilla + ketchup to dip', 'Chicken & cheese quesadilla{corn}{apple}'),
      steps: ['Chop the cooked chicken (or quick-cook it in a pan, 10 min).', 'Tortilla, cheese, chicken, cheese, tortilla.', 'Pan on medium, 2–3 min per side until melty.', 'Cut into triangles. Ketchup or sauce on the side.'] },
    { id: 'chicken-rice', name: 'Chicken & Rice Plates', emoji: '🍚', req: ['chicken', ['rice', 'riceroni']], opt: ['cheese', 'corn'], time: 30, energy: 25, leftover: true, loved: ['kaden', 'winter', 'mark'],
      plates: P('Chicken + rice (plain, nothing mixed in)', 'Big chicken + rice, sauce on top', 'Chicken + rice + ketchup (kept separate)', 'Chicken + rice{corn}'),
      steps: ['Start the rice (or Rice-A-Roni).', 'Cook or reheat the chicken: pan, olive oil, salt, pepper.', 'Plate it as a “bowl” with everything in its own section. Nothing gets mixed together.', 'Sauces on the side: ketchup for Kaden.'] },
    { id: 'chicken-wraps', name: 'Chicken Wraps', emoji: '🌯', req: ['chicken', 'tortillas'], opt: ['cheese', 'bacon'], time: 20, energy: 25, leftover: true, loved: ['mark', 'kaden', 'winter'],
      plates: P('Chicken + cheese wrap (or chicken + potato)', '2 big wraps with chicken, cheese, bacon', 'Chicken + cheese wrap + ketchup', 'Chicken + cheese wrap{apple}'),
      steps: ['Warm the chicken (microwave 1–2 min, or pan).', 'Warm the tortillas 15 sec.', 'Chicken + cheese (+ bacon) and roll it up.', 'Cut in half. Sauces on the side.'] },
    { id: 'chicken-sandwiches', name: 'Chicken Sandwiches', emoji: '🥪', req: ['chicken', ['buns', 'bread']], opt: ['cheese', 'bacon'], time: 15, energy: 25, leftover: true, loved: ['mark', 'kaden', 'winter'],
      plates: P('Chicken sandwich (plain){fries}', 'Double-chicken sandwich + bacon', 'Chicken on a bun + ketchup{fries}', 'Chicken on a bun{corn}{apple}'),
      steps: ['Slice the chicken thin. Warm it in a pan with salt and pepper.', 'Toast buns or bread.', 'Chicken + cheese (+ bacon for Mark).', 'Ketchup or sauce on the side.'] },
    { id: 'tuesday-dinner', name: 'Mark’s Tuesday Dinner', emoji: '🔥', req: ['steak', 'riceroni', 'chicken', 'corn'], time: 45, energy: 5, routineDay: 2, loved: ['mark', 'megan', 'kaden', 'winter'],
      plates: P('Steak + Rice-A-Roni', 'Steak + chicken + Rice-A-Roni + corn', 'Chicken (or steak) + Rice-A-Roni + ketchup', 'Chicken + Rice-A-Roni + corn 🌽'),
      steps: ['Mark’s day off, so Mark’s cooking. You’re off duty. 💛', 'Rice-A-Roni on the stove first (about 20 min).', 'Steak and chicken in the pan or on the grill.', 'Heat the corn. Plate everyone separately.'] },
    { id: 'macaroni-day', name: 'Megan’s Macaroni Day', emoji: '🍝', req: ['pasta', 'sauce'], opt: ['locatelli'], time: 45, energy: 50, routineDay: 0, loved: ['megan', 'mark', 'kaden', 'winter'],
      plates: P('Macaroni + sauce + Locatelli', 'Big plate + extra Locatelli (+ any meat)', 'Macaroni (not spaghetti!) + sauce or butter + cheese', 'Macaroni + sauce + Locatelli{corn}'),
      steps: ['Big pot of salted water to a boil.', 'Warm the sauce in a pot.', 'Cook macaroni per box. Scoop out Kaden’s plain portion first if he wants butter + cheese.', 'Sauce, then Locatelli on top. Sunday tradition. ❤️'] },
    { id: 'mac-cheese', name: 'Mac & Cheese + Protein', emoji: '🧀', req: ['mac'], opt: ['nuggets', 'hotdog', 'bacon', 'chicken', 'burger'], time: 15, energy: 25, loved: ['kaden', 'winter'],
      plates: P('Mac & cheese, or steak + potato if you want', 'Mac + a burger or chicken on the side', 'Mac & cheese + nuggets/bacon + ketchup', 'Mac & cheese{corn}{apple}'),
      steps: ['Boil water and cook the mac per box.', 'Heat a protein: nuggets, bacon, or a burger.', 'Stir in the cheese packet.', 'Protein on the side, not mixed in.'] },
    { id: 'breakfast-dinner', name: 'Breakfast for Dinner', emoji: '🍳', req: ['eggs'], opt: ['bacon', 'bagels', 'creamcheese', 'potatoes'], time: 15, energy: 25, loved: ['kaden', 'winter', 'mark'],
      plates: P('Eggs + potatoes/hash browns', 'Eggs + bacon + bagel (big portion)', 'Scrambled eggs + bacon + bagel w/ cream cheese', 'Eggs + bacon + bagel{apple}'),
      steps: ['Bacon in the oven at 400°F, 15 min (no splatter).', 'Toast the bagels.', 'Scramble the eggs. Low and slow, 3 min.', 'Cream cheese on the bagels. Plates.'] },
    { id: 'bagel-night', name: 'Bagels & Cream Cheese Night', emoji: '🥯', req: ['bagels', 'creamcheese'], opt: ['eggs', 'bacon'], time: 5, energy: 5, loved: ['kaden', 'winter'],
      plates: P('Bagel + cream cheese (or toast + whatever you want)', 'Two bagels + eggs/bacon if there', 'Bagel + cream cheese', 'Bagel + cream cheese{apple}'),
      steps: ['Toast the bagels.', 'Cream cheese.', 'That’s dinner. Fed is fed. 💛'] },
    { id: 'hotdogs', name: 'Hot Dog Night', emoji: '🌭', req: ['hotdog'], opt: ['buns', 'fries'], time: 10, energy: 5, loved: ['kaden', 'winter', 'mark'],
      plates: P('Hot dog, or a burger/steak for you', '2–3 hot dogs', 'Hot dog + bun + ketchup{fries}', 'Hot dog + bun + ketchup{corn}'),
      steps: ['Pan or boil, 5–6 min.', 'Warm the buns.', 'Ketchup, plates, done.'] },
    { id: 'soup-grilled-cheese', name: 'Ring-O-Noodle Soup + Grilled Cheese', emoji: '🥣', req: ['soupmix'], opt: ['bread', 'cheese'], time: 15, energy: 25, loved: ['winter'],
      plates: P('Grilled cheese (skip the soup if you want)', 'Grilled cheese + a burger (he’s not a fan of every soup)', 'Grilled cheese or a bagel + ketchup', 'Soup + grilled cheese{apple}'),
      steps: ['Boil water and add the soup mix per box.', 'Butter the bread, cheese in the middle.', 'Pan on medium, 2–3 min per side.', 'Cut, dip, cozy.'] },
    { id: 'grilled-cheese', name: 'Grilled Cheese Night', emoji: '🧀', req: ['bread', 'cheese'], opt: ['bacon'], time: 10, energy: 5, loved: ['kaden', 'winter'],
      plates: P('Grilled cheese (or a burger)', 'Grilled cheese + bacon, times two', 'Grilled cheese + bacon + ketchup', 'Grilled cheese{apple}'),
      steps: ['Butter the outside of the bread.', 'Cheese (+ bacon) in the middle.', 'Medium pan, 2–3 min per side.'] }
  ];
  var MEAL_BY_ID = {}; MEALS.forEach(function (m) { MEAL_BY_ID[m.id] = m; });

  function reqKeys(meal) {
    var out = [];
    meal.req.forEach(function (r) { out.push(Array.isArray(r) ? r[0] : r); });
    return out;
  }
  function missingFor(meal, have) {
    var miss = [];
    meal.req.forEach(function (r) {
      if (Array.isArray(r)) { if (!r.some(have)) miss.push(r[0]); }
      else if (!have(r)) miss.push(r);
    });
    return miss;
  }
  function usesKeys(meal, have) {
    var keys = [];
    meal.req.forEach(function (r) {
      if (Array.isArray(r)) { var f = r.filter(have)[0]; keys.push(f || r[0]); } else keys.push(r);
    });
    (meal.opt || []).forEach(function (k) { if (have(k)) keys.push(k); });
    return keys;
  }

  /* ---------- preferences learning ---------- */
  function rejectCount(state, person, mealId) {
    var r = (state.rejections || {})[person] || {};
    return r[mealId] || 0;
  }
  function isRejected(state, person, mealId) { return rejectCount(state, person, mealId) >= 2; }
  function reject(state, person, mealId) {
    state.rejections = state.rejections || {};
    state.rejections[person] = state.rejections[person] || {};
    var n = (state.rejections[person][mealId] || 0) + 1;
    state.rejections[person][mealId] = n;
    return n;
  }
  function unreject(state, person, mealId) {
    if (state.rejections && state.rejections[person]) delete state.rejections[person][mealId];
  }
  function backupPlate(state, person, excludeId) {
    var have = haveFn(state);
    var opts = {
      kaden: [['nuggets', 'Nuggets + ketchup'], ['burger', 'A Bubba burger + bun + ketchup'], ['pizza', 'A slice of freezer pizza'], ['eggs', 'Scrambled eggs + bacon/bagel'], ['bagels', 'Bagel + cream cheese'], ['mac', 'Mac & cheese'], ['chicken', 'Plain chicken + ketchup']],
      winter: [['nuggets', 'Nuggets + ketchup'], ['burger', 'A Bubba burger + bun'], ['pizza', 'A slice of freezer pizza'], ['eggs', 'Eggs + bagel'], ['bagels', 'Bagel + cream cheese'], ['mac', 'Mac & cheese'], ['chicken', 'Plain chicken + corn']],
      megan: [['steak', 'Steak + potato 💛'], ['burger', 'A burger + potato'], ['chicken', 'Plain chicken + potato'], ['pizza', 'Pizza']],
      mark: [['burger', 'Double burger'], ['chicken', 'Extra chicken'], ['steak', 'Steak'], ['pizza', 'Pizza']]
    }[person] || [];
    var pick = null;
    for (var i = 0; i < opts.length; i++) {
      var mealOfKey = opts[i][0] + '';
      if (excludeId && MEAL_BY_ID[excludeId] && reqKeys(MEAL_BY_ID[excludeId])[0] === mealOfKey) continue;
      if (have(opts[i][0])) { pick = opts[i][1]; break; }
    }
    return pick || 'Their go-to protein + carb (+ ketchup)';
  }
  function fillTokens(str, have, person) {
    return String(str)
      .replace('{corn}', person !== 'kaden' && have('corn') ? ' + corn 🌽' : '')
      .replace('{apple}', (person === 'winter' || person === 'megan') && have('apples') ? ' + apple 🍎' : '')
      .replace('{fries}', have('fries') ? ' + fries' : have('potatoes') ? ' + potatoes' : have('rice') ? ' + rice' : have('riceroni') ? ' + Rice-A-Roni' : '');
  }
  function platesFor(state, meal, haveOverride) {
    var have = haveOverride || haveFn(state);
    var out = {};
    PEOPLE_ORDER.forEach(function (p) {
      if (isRejected(state, p, meal.id)) out[p] = { text: backupPlate(state, p, meal.id), backup: true };
      else out[p] = { text: fillTokens(meal.plates[p], have, p), backup: false, count: rejectCount(state, p, meal.id) };
    });
    return out;
  }

  /* ---------- scoring / recommend ---------- */
  function scoreMeal(state, meal, have, opts) {
    opts = opts || {};
    var s = 0, why = [];
    var soon = useSoonKeys(state);
    var used = usesKeys(meal, have);
    var soonHits = used.filter(function (k) { return soon.indexOf(k) >= 0; });
    if (soonHits.length) { s += 12 * soonHits.length; why.push('uses up ' + soonHits.map(function (k) { return KEY_NAME[k] || k; }).join(' + ')); }
    var likes = (meal.loved || []).filter(function (p) { return !isRejected(state, p, meal.id); }).length;
    s += likes * 3;
    var rej = PEOPLE_ORDER.filter(function (p) { return isRejected(state, p, meal.id); }).length;
    s -= rej * 9;
    s -= PEOPLE_ORDER.reduce(function (a, p) { return a + (rejectCount(state, p, meal.id) === 1 ? 1 : 0); }, 0);
    if (opts.date && meal.routineDay === opts.date.getDay()) { s += 40; why.push('it’s ' + DAYS[meal.routineDay] + '!'); }
    if (opts.date && meal.routineDay !== undefined && meal.routineDay !== opts.date.getDay()) s -= 8; // save routine meals for their day
    if (opts.energy !== undefined && opts.energy <= 25) s += (60 - meal.time) / 6 + (meal.energy <= 5 ? 4 : 0);
    if (opts.leftover && meal.leftover) s += 6;
    (meal.opt || []).forEach(function (k) { if (have(k)) s += 0.5; });
    if (likes >= 3) why.push('most of the family likes it');
    return { score: s, why: why };
  }

  function recommend(state, o) {
    o = o || {};
    var energy = o.energy === undefined ? 50 : o.energy;
    var time = o.time === undefined ? 30 : o.time;
    var sources = (o.sources && o.sources.length) ? o.sources : ['pantry', 'fridge', 'freezer'];
    var canBuy = sources.indexOf('buy') >= 0;
    var locs = sources.filter(function (s) { return s !== 'buy'; });
    var have = haveFn(state, locs.length ? locs : ['pantry', 'fridge', 'freezer']);
    var date = o.date || new Date();
    var exclude = o.exclude || [];
    function candidates(relaxTime, relaxEnergy) {
      return MEALS.filter(function (m) {
        if (exclude.indexOf(m.id) >= 0) return false;
        if (!relaxTime && m.time > time) return false;
        if (!relaxEnergy && m.energy > energy) return false;
        var miss = missingFor(m, have);
        if (miss.length === 0) return true;
        return canBuy && miss.length <= 2;
      }).map(function (m) {
        var sc = scoreMeal(state, m, have, { energy: energy, date: date });
        var miss = missingFor(m, have);
        return { meal: m, score: sc.score - miss.length * 6 - (relaxTime ? Math.max(0, m.time - time) : 0) - (relaxEnergy ? Math.max(0, m.energy - energy) / 5 : 0), why: sc.why, missing: miss };
      }).sort(function (a, b) { return b.score - a.score; });
    }
    var list = candidates(false, false), relaxed = false;
    if (!list.length) { list = candidates(true, false); relaxed = list.length ? 'time' : false; }
    if (!list.length) { list = candidates(true, true); relaxed = list.length ? 'both' : false; }
    if (!list.length) {
      return { meal: null, message: 'Nothing in the house fits right now, and that’s okay. Takeout or cereal counts as dinner tonight. Tap WHAT DO I NEED? and I’ll help you restock.', alternatives: 0 };
    }
    var top = list[0];
    state.lastMealId = top.meal.id;
    return {
      meal: top.meal, plates: platesFor(state, top.meal, have), steps: top.meal.steps.slice(0, 5),
      missing: top.missing, why: top.why, relaxed: relaxed, alternatives: list.length - 1,
      uses: usesKeys(top.meal, have).filter(function (k) { return BASICS.indexOf(k) < 0; })
    };
  }

  /* ---------- what can I make ---------- */
  function whatCanIMake(state, o) {
    o = o || {};
    var have = o.ingredients && o.ingredients.length ? haveFn(state, null, o.ingredients) : haveFn(state);
    var res = { now: [], missing: [], freezer: [] };
    var date = o.date || new Date();
    MEALS.forEach(function (m) {
      var miss = missingFor(m, have);
      var sc = scoreMeal(state, m, have, { date: date, energy: o.energy, leftover: o.leftover });
      if (o.time && m.time > o.time) sc.score -= 10;
      var reqUsed = [];
      m.req.forEach(function (r) { if (Array.isArray(r)) { var f = r.filter(have)[0]; reqUsed.push(f || r[0]); } else reqUsed.push(r); });
      var hits = o.ingredients && o.ingredients.length ? reqUsed.filter(function (k) { return o.ingredients.indexOf(k) >= 0; }).length : 0;
      if (o.ingredients && o.ingredients.length && hits === 0) return;
      var entry = { meal: m, missing: miss, score: sc.score + hits * 10, hits: hits, why: sc.why, plates: platesFor(state, m, have), time: m.time, energy: m.energy };
      if (miss.length === 0) res.now.push(entry);
      else if (miss.length <= 2) res.missing.push(entry);
      if (m.freezer && miss.length <= 1) res.freezer.push(entry);
    });
    ['now', 'missing', 'freezer'].forEach(function (k) { res[k].sort(function (a, b) { return (b.hits || 0) - (a.hits || 0) || a.missing.length - b.missing.length || b.score - a.score; }); });
    return res;
  }

  /* ---------- leftovers ---------- */
  var LEFTOVER_IDEAS = {
    chicken: ['chicken-wraps', 'chicken-quesadillas', 'chicken-rice', 'chicken-sandwiches'],
    steak: [{ id: 'lo-steak-eggs', name: 'Steak & Eggs', emoji: '🍳', req: ['steak', 'eggs'], plates: P('Steak + eggs (+ potato)', 'Steak + 3 eggs', 'Steak bites + eggs + ketchup', 'Steak bites + eggs'), steps: ['Slice the steak thin and warm it in a pan for 1 min.', 'Scramble the eggs.', 'Plate them separately.'] },
      { id: 'lo-steak-sand', name: 'Steak Sandwiches', emoji: '🥖', req: ['steak', ['buns', 'bread']], plates: P('Steak sandwich', 'Steak + cheese sandwich, big', 'Steak on a bun + ketchup', 'Steak on a bun'), steps: ['Slice thin and warm with cheese on top.', 'Toast the rolls.', 'Pile it in.'] }],
    porktenderloin: [{ id: 'lo-pork-rice', name: 'Pork & Rice Plates', emoji: '🍚', req: ['porktenderloin', ['rice', 'riceroni']], plates: P('Pork + rice', 'Pork + rice, double', 'Pork + rice + ketchup', 'Pork + rice{corn}'), steps: ['Reheat sliced pork 1–2 min.', 'Make or reheat the rice.', 'Plate separately.'] }],
    carnitas: [{ id: 'lo-carnitas-quesadilla', name: 'Carnitas Quesadillas', emoji: '🫓', req: ['carnitas', 'tortillas', 'cheese'], plates: P('Carnitas quesadilla', '2 carnitas quesadillas', 'Carnitas + cheese quesadilla + ketchup', 'Carnitas quesadilla{corn}'), steps: ['Tortilla, cheese, carnitas, cheese, tortilla.', '2–3 min per side.', 'Cut into triangles.'] }],
    burger: [{ id: 'lo-burger-mac', name: 'Cheeseburger Mac', emoji: '🧀', req: ['burger', ['mac', 'pasta']], plates: P('Mac + burger on the side', 'Big bowl, burger chopped on top', 'Mac + burger pieces on the side + ketchup', 'Mac + burger on the side{corn}'), steps: ['Cook the mac.', 'Chop and warm the burgers.', 'Keep them separate for the kids.'] }]
  };
  function leftoverIdeas(state, key) {
    key = key || 'chicken';
    var have = haveFn(state, null, [key].concat(state.inventory.filter(function (i) { return !isOut(i); }).map(function (i) { return i.key || keyOf(i.name); }).filter(Boolean)));
    var ideas = (LEFTOVER_IDEAS[key] || []).map(function (x) { return typeof x === 'string' ? MEAL_BY_ID[x] : x; });
    if (!ideas.length) ideas = [MEAL_BY_ID['chicken-wraps']];
    return ideas.map(function (m) {
      var miss = missingFor(m, have);
      return { meal: m, missing: miss, plates: platesFor(state, m, have), steps: m.steps.slice(0, 4) };
    });
  }

  /* ---------- Mark ---------- */
  var MARK_TEMPLATES = {
    A: { id: 'A', name: 'A · Chicken Week', emoji: '🍗', keys: ['chicken', 'rice'],
      prep: ['Bake about 3 lb of chicken breasts at once: 425°F, 25 min, olive oil, salt, pepper.', 'Make a big pot of rice (or 2 boxes of Rice-A-Roni).', 'Slice the chicken and portion it into containers with rice.', 'Sauce cups on the side (BBQ, teriyaki, ketchup).', 'Keep 4 days in the fridge, freeze the rest.'],
      meals: [{ name: 'Chicken & rice + a sauce cup', protein: 45, cost: 3.25 }, { name: 'Chicken & cheese quesadillas (2). They reheat great', protein: 42, cost: 3.0 }, { name: 'Chicken & Rice-A-Roni', protein: 44, cost: 3.4 }, { name: 'Big chicken + cheese wrap (2)', protein: 40, cost: 3.1 }, { name: 'Chicken + mac & cheese', protein: 43, cost: 3.3 }] },
    B: { id: 'B', name: 'B · Ground Beef Week', emoji: '🥩', keys: ['groundbeef', 'rice', 'tortillas', 'cheese'],
      prep: ['Brown 3 lb of ground beef with salt, pepper, and taco seasoning (15 min).', 'Make a pot of rice and boil a box of macaroni.', 'Roll 4 burritos (beef, rice, cheese) and wrap them in foil.', 'Portion the rest into containers.', 'Keep 4 days in the fridge. Burritos freeze great.'],
      meals: [{ name: 'Beef & rice “taco” container + cheese', protein: 36, cost: 3.5 }, { name: 'Beef & cheese burritos (2), foil-wrapped', protein: 38, cost: 3.6 }, { name: 'Cheeseburger mac', protein: 35, cost: 3.2 }, { name: 'Beef & potato hash', protein: 34, cost: 3.3 }, { name: 'Sloppy joes on rolls (2)', protein: 35, cost: 3.4 }] },
    C: { id: 'C', name: 'C · Freezer Week', emoji: '🧊', keys: ['carnitas', 'porktenderloin', 'burger'],
      prep: ['Roast the Hatfield carnitas (about 1 hr, hands-off) and shred it.', 'Roast the teriyaki tenderloin at the same time (25–35 min) and slice it.', 'Make a pot of rice.', 'Portion the pork + rice into containers. Wrap 2 Bubba burgers per bun in foil.', 'Freeze anything for day 4+ and thaw it the night before.'],
      meals: [{ name: 'Carnitas + rice + cheese', protein: 38, cost: 2.9 }, { name: 'Teriyaki pork + rice', protein: 36, cost: 2.8 }, { name: '2 Bubba burgers on buns (reheat 2 min)', protein: 40, cost: 3.2 }, { name: 'Carnitas burritos (2)', protein: 37, cost: 3.0 }, { name: 'Teriyaki pork sandwich + chips', protein: 34, cost: 2.9 }] }
  };
  function workDaysFrom(start, n, offDays) {
    offDays = offDays || [2, 3];
    var out = [], d = new Date(start.getTime()), guard = 0;
    while (out.length < n && guard++ < 21) { if (offDays.indexOf(d.getDay()) < 0) out.push(new Date(d.getTime())); d = addDays(d, 1); }
    return out;
  }
  function bestTemplate(state) {
    var have = haveFn(state);
    var best = 'A', bestScore = -1;
    ['A', 'B', 'C'].forEach(function (t) {
      var sc = MARK_TEMPLATES[t].keys.filter(have).length / MARK_TEMPLATES[t].keys.length;
      if (sc > bestScore) { bestScore = sc; best = t; }
    });
    return best;
  }
  function markWorkMeals(state, o) {
    o = o || {};
    var n = Math.max(1, Math.min(7, o.days || 1));
    var t = MARK_TEMPLATES[o.template || bestTemplate(state)];
    var start = o.start || new Date();
    var offDays = (state.settings && state.settings.markOffDays) || [2, 3];
    var days = workDaysFrom(start, n, offDays);
    var have = haveFn(state);
    var meals = days.map(function (d, i) {
      var m = t.meals[i % t.meals.length];
      var sweets = have('pie') ? ['Slice of pie (you have some!)', 'Cookies', 'Slice of pie', 'Brownie', 'Slice of pie'] : ['Pie slice', 'Cookies', 'Brownie', 'Ice cream sandwich', 'Candy bar'];
      return { day: DAYS[d.getDay()], date: ymd(d), name: m.name, protein: m.protein, cost: m.cost, sweet: sweets[i % 5] };
    });
    var total = meals.reduce(function (a, m) { return a + m.cost; }, 0);
    var avgP = Math.round(meals.reduce(function (a, m) { return a + m.protein; }, 0) / meals.length);
    return {
      template: t.id, templateName: t.name, emoji: t.emoji, meals: meals,
      prep: t.prep.slice(0, n <= 2 ? 3 : 5), proteinPerServing: avgP, totalCost: Math.round(total * 100) / 100,
      missing: t.keys.filter(function (k) { return !have(k); })
    };
  }
  function markToday(state, date) {
    date = date || new Date();
    var off = ((state.settings && state.settings.markOffDays) || [2, 3]).indexOf(date.getDay()) >= 0;
    if (off) {
      return { off: true, text: date.getDay() === 2 ? 'Day off! Tuesday dinner: he’s making Steak + Rice-A-Roni + Chicken + Corn 🔥' : 'Day off. Home plate: extra protein from tonight’s dinner + something sweet 🥧' };
    }
    var plan = markWorkMeals(state, { days: 1, start: date });
    return { off: false, text: 'Work day. Pack: ' + plan.meals[0].name + ' (~' + plan.meals[0].protein + 'g protein) + ' + plan.meals[0].sweet.toLowerCase(), plan: plan };
  }
  var PROTEIN_EST = { chicken: '≈45g per 6 oz breast', steak: '≈46g per 8 oz steak', burger: '≈20g per patty', carnitas: '≈30g per serving', porktenderloin: '≈30g per serving', groundbeef: '≈22g per 4 oz', eggs: '≈6g per egg', bacon: '≈3g per slice', hotdog: '≈6g each', deli: '≈10g per 2 oz', nuggets: '≈13g per 5 nuggets', jerky: '≈9g per oz', cheesestick: '≈7g each', yogurt: '≈12g per cup' };
  function markProteins(state) {
    var out = [];
    state.inventory.forEach(function (it) {
      if (isOut(it)) return;
      var k = it.key || keyOf(it.name);
      if (PROTEIN_EST[k]) out.push({ name: it.name, loc: it.loc, est: PROTEIN_EST[k] });
    });
    return out;
  }
  var GRAB_IDEAS = ['Beef jerky', 'Cheese sticks', 'Hard-boiled eggs', 'Protein bars', 'Deli meat roll-ups', 'Pie (a whole one, for slices)', 'Greek yogurt'];
  var MARK_EMERGENCY = [
    { name: '2 Bubba burgers in a skillet (10 min) or microwave a leftover patty (2 min)', keys: ['burger'] },
    { name: 'Bagel + cream cheese + 2 microwave eggs (90 sec in a mug)', keys: ['bagels', 'eggs'] },
    { name: 'Leftover meat + microwave rice cup', keys: ['rice'] },
    { name: 'Deli meat & cheese roll-ups + chips', keys: ['deli'] },
    { name: 'Two slices of reheated pizza + ice cream sandwich', keys: ['pizza'] },
    { name: 'PB sandwich + milk', keys: ['pb', 'bread'] }
  ];
  function markEmergency(state) {
    var have = haveFn(state);
    return MARK_EMERGENCY.map(function (e) { return { name: e.name, ready: e.keys.every(have) }; })
      .sort(function (a, b) { return (b.ready ? 1 : 0) - (a.ready ? 1 : 0); });
  }

  /* ---------- kids ---------- */
  function kidSuggestions(state, person, limit) {
    var have = haveFn(state);
    var list = MEALS.filter(function (m) {
      return (m.loved || []).indexOf(person) >= 0 && !isRejected(state, person, m.id) && missingFor(m, have).length <= 1 && m.routineDay === undefined;
    }).map(function (m) {
      return { meal: m, plate: fillTokens(m.plates[person], have, person), missing: missingFor(m, have), count: rejectCount(state, person, m.id) };
    }).sort(function (a, b) { return a.missing.length - b.missing.length || a.meal.time - b.meal.time; });
    return list.slice(0, limit || 5);
  }
  var LUNCH = {
    main: ['Bagel + cream cheese', 'Cold chicken pieces + ketchup cup', 'Ham & cheese roll-ups', 'Crackers + meat + cheese (DIY Lunchable)', 'Mac & cheese in a thermos', 'Nuggets in a thermos', 'Pizza slice'],
    fruit: { kaden: ['Skip today (totally fine)', 'Apple slices (no pressure)', 'Applesauce pouch'], winter: ['Apple slices 🍎', 'Applesauce pouch', 'Grapes', 'Clementine'] },
    snack: ['Goldfish', 'Pretzels', 'Cheez-Its', 'Cheese stick', 'Popcorn'],
    treat: ['Cookie', 'Fruit snacks', 'Mini chocolate', 'Rice Krispies Treat'],
    drink: ['Water bottle', 'Juice box', 'Milk box', 'Gatorade']
  };
  function lunchOptions(person, slot) {
    var v = LUNCH[slot];
    return Array.isArray(v) ? v : (v[person] || v.winter);
  }

  /* ---------- budget ---------- */
  function weekStart(now) { now = now || new Date(); var d = new Date(now.getFullYear(), now.getMonth(), now.getDate()); return addDays(d, -d.getDay()); }
  function budgetSummary(state, now) {
    var ws = ymd(weekStart(now));
    var spent = (state.budget.log || []).filter(function (e) { return e.date >= ws; }).reduce(function (a, e) { return a + Number(e.amount || 0); }, 0);
    var b = Number(state.settings.weeklyBudget || 0);
    return { weekStart: ws, budget: b, spent: Math.round(spent * 100) / 100, remaining: Math.round((b - spent) * 100) / 100 };
  }
  function logSpend(state, amount, note, now) {
    var a = Number(String(amount).replace(/[^0-9.\-]/g, ''));
    if (!isFinite(a) || a === 0) return null;
    var e = { id: uid(), amount: a, note: note || '', date: ymd(now || new Date()) };
    state.budget.log.push(e);
    return e;
  }

  /* ---------- price book ---------- */
  function verdict(item, price) {
    var p = Number(String(price).replace(/[^0-9.]/g, ''));
    if (!isFinite(p) || p <= 0) return null;
    var v;
    if (p <= item.stockup) v = { verdict: 'Stock up', color: 'gold', say: 'Great price. Grab extra and freeze it or put it in the pantry.' };
    else if (p <= item.good) v = { verdict: 'Good deal', color: 'green', say: 'Good price. Buy what you need this week.' };
    else v = { verdict: 'Wait', color: 'red', say: p > item.normal ? 'That’s above normal. Wait for a sale unless you need it now.' : 'Normal price. Buy only what you need now and wait for a sale to stock up.' };
    v.price = p; v.placeholder = !!item.placeholder;
    return v;
  }
  function findPrice(state, name) {
    var k = keyOf(name), n = String(name).toLowerCase();
    return state.pricebook.filter(function (p) { return p.name.toLowerCase() === n; })[0] ||
      state.pricebook.filter(function (p) { return p.name.toLowerCase().indexOf(n) >= 0 || n.indexOf(p.name.toLowerCase()) >= 0; })[0] ||
      (k ? state.pricebook.filter(function (p) { return keyOf(p.name) === k; })[0] : null) || null;
  }

  /* ---------- list operations ---------- */
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function singular(s) { return s.replace(/ies$/, 'y').replace(/(ches|shes|xes|oes)$/, function (m) { return m.slice(0, -2); }).replace(/s$/, ''); }
  function findIn(list, name) {
    var n = norm(name), ns = singular(n), k = keyOf(name);
    var exact = list.filter(function (i) { var x = norm(i.name); return x === n || singular(x) === ns; });
    if (exact.length) return exact;
    if (k) { var byKey = list.filter(function (i) { return (i.key || keyOf(i.name)) === k; }); if (byKey.length) return byKey; }
    return list.filter(function (i) { var x = norm(i.name); return ns.length > 2 && (x.indexOf(ns) >= 0 || (x.length > 2 && ns.indexOf(singular(x)) >= 0)); });
  }
  function addToShopping(state, name, o) {
    o = o || {};
    var existing = findIn(state.shopping.filter(function (s) { return !s.checked; }), name)[0];
    if (existing) { if (o.qty) existing.qty = o.qty; return { item: existing, existed: true }; }
    var pbItem = findPrice(state, name);
    var it = shopItem(cap(name), o.store || (pbItem && pbItem.store) || lastStoreFor(state, name) || 'Any store', o.why);
    if (o.qty) it.qty = o.qty;
    state.shopping.push(it);
    return { item: it, existed: false };
  }
  function lastStoreFor(state, name) {
    state.storeMemory = state.storeMemory || {};
    return state.storeMemory[keyOf(name) || norm(name)] || null;
  }
  function rememberStore(state, item) {
    state.storeMemory = state.storeMemory || {};
    if (item.store && item.store !== 'Any store') state.storeMemory[keyOf(item.name) || norm(item.name)] = item.store;
  }
  function addToInventory(state, name, o) {
    o = o || {};
    var existing = findIn(state.inventory, name)[0];
    if (existing && !o.forceNew) {
      if (typeof existing.qty === 'number') existing.qty += (o.qty || 1);
      else existing.qty = o.qty || 'Lots';
      if (o.useSoon) existing.useSoon = true;
      return { item: existing, existed: true };
    }
    var it = inv(cap(name), o.loc || defaultLoc(name), o.qty || 'Lots', { useSoon: !!o.useSoon });
    state.inventory.push(it);
    return { item: it, existed: false };
  }
  function usedLast(state, id) {
    var it = state.inventory.filter(function (i) { return i.id === id; })[0];
    if (!it) return null;
    state.inventory = state.inventory.filter(function (i) { return i.id !== id; });
    addToShopping(state, it.name, { why: 'Used the last one' });
    return it;
  }
  function boughtInv(state, id) {
    var it = state.inventory.filter(function (i) { return i.id === id; })[0];
    if (!it) return null;
    it.qty = typeof it.qty === 'number' ? it.qty + 1 : 'Lots';
    state.shopping = state.shopping.filter(function (s) { return s.checked || findIn([it], s.name).length === 0; });
    return it;
  }
  function checkOff(state, id, on) {
    var s = state.shopping.filter(function (x) { return x.id === id; })[0];
    if (!s) return null;
    s.checked = on === undefined ? !s.checked : !!on;
    if (s.checked) { rememberStore(state, s); addToInventory(state, s.name, { qty: s.qty > 1 ? s.qty : undefined }); }
    return s;
  }

  /* ---------- routines ---------- */
  var ROUTINES = [
    { id: 'tuesday', day: 2, name: 'Tuesday: Mark’s day-off dinner', items: [['steak', 'Steak'], ['riceroni', 'Rice-A-Roni'], ['chicken', 'Chicken'], ['corn', 'Corn']] },
    { id: 'sunday', day: 0, name: 'Sunday: Megan’s Macaroni Day', items: [['pasta', 'Macaroni / pasta'], ['locatelli', 'Locatelli Grated Pecorino Romano'], ['sauce', 'Pasta sauce']] }
  ];
  function routineCheck(state, routine) {
    var have = haveFn(state);
    var onList = state.shopping.filter(function (s) { return !s.checked; });
    return routine.items.map(function (x) {
      var listed = onList.some(function (s) { return keyOf(s.name) === x[0]; });
      return { key: x[0], name: x[1], have: have(x[0]), onList: listed };
    });
  }
  function routineWhy(r, key) { return key === 'corn' ? 'For Tuesday dinner + Winter 🌽' : 'For ' + (r.day === 0 ? 'Sunday Macaroni Day' : 'Tuesday dinner'); }
  function nextDate(now, dow) { var d = new Date(now.getFullYear(), now.getMonth(), now.getDate()); var diff = (dow - d.getDay() + 7) % 7; return addDays(d, diff); }
  function runRoutines(state, now, horizonDays) {
    now = now || new Date();
    var horizon = horizonDays === undefined ? 3 : horizonDays;
    var msgs = [];
    state.routinesAdded = state.routinesAdded || {};
    ROUTINES.forEach(function (r) {
      var d = nextDate(now, r.day);
      var daysAway = Math.round((d - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
      if (daysAway > horizon) return;
      var tag = r.id + ':' + ymd(d);
      if (state.routinesAdded[tag]) return;
      var added = [], listed = [];
      routineCheck(state, r).forEach(function (c) {
        if (!c.have && !c.onList) { addToShopping(state, c.name, { why: routineWhy(r, c.key) }); added.push(c.name); }
        else if (!c.have && c.onList) listed.push(c.name);
      });
      state.routinesAdded[tag] = true;
      var label = r.day === 0 ? 'Sunday Macaroni Day: ' : 'Tuesday dinner: ';
      if (added.length) msgs.push(label + 'I added ' + added.join(', ') + ' to shopping.' + (listed.length ? ' (' + listed.join(', ') + ' already on the list.)' : ''));
      else if (listed.length) msgs.push(label + 'everything else is in the house. Just need ' + listed.join(', ') + ' (already on the list 🛒).');
      else msgs.push(label + 'you’ve got everything. ✅');
    });
    return msgs;
  }

  /* ---------- quick-add parser ---------- */
  var NUM_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, a: 1, an: 1 };
  function splitItems(str) {
    var protect = ['mac and cheese', 'mac & cheese', 'mac n cheese', 'salt and pepper', 'peanut butter and jelly', 'stop & shop', 'stop and shop'];
    var s = ' ' + str + ' ', saved = [];
    protect.forEach(function (p, i) { var re = new RegExp(esc(p), 'gi'); s = s.replace(re, function (m) { saved.push(m); return '§' + (saved.length - 1) + '§'; }); });
    return s.split(/,|\band\b|&|\+|\bplus\b/i).map(function (x) {
      return x.replace(/§(\d+)§/g, function (m, i) { return saved[+i]; }).trim();
    }).map(function (x) { return x.replace(/^(some|the|a few|a couple( of)?|more)\s+/i, '').replace(/[.!?]+$/, '').trim(); }).filter(Boolean);
  }
  function qtyOf(item) {
    var m = item.match(/^(\d+|one|two|three|four|five|six|seven|an?)\s+(.+)$/i);
    if (m && !/^an?$/i.test(m[1])) return { qty: isNaN(+m[1]) ? NUM_WORDS[m[1].toLowerCase()] : +m[1], name: m[2] };
    if (m) return { qty: null, name: m[2] };
    m = item.match(/^(.+?)\s*x\s*(\d+)$/i);
    if (m) return { qty: +m[2], name: m[1] };
    return { qty: null, name: item };
  }
  function parse(state, text, now) {
    now = now || new Date();
    var raw = String(text || '').trim();
    var t = raw.toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ').replace(/[.!]+$/, '').trim();
    var msgs = [], action = null, m;
    if (!t) return { messages: ['Type or say something like “we’re out of eggs” 💬'], action: null };

    // what can I make (with optional ingredient list)
    if (/what (can|could|should) (i|we) (make|cook|have)|what'?s for dinner|ideas for dinner/.test(t)) {
      var before = t.split(/,?\s*(what (can|could|should) (i|we)|what'?s for dinner|ideas for)/)[0];
      before = before.replace(/^(i|we) (have|got)\s*/, '').replace(/^(with|using)\s*/, '').replace(/^(there'?s)\s*/, '');
      var keys = splitItems(before).map(keyOf).filter(Boolean);
      action = { type: 'make', ingredients: keys };
      msgs.push(keys.length ? 'Here’s what you can make with ' + keys.map(function (k) { return KEY_NAME[k]; }).join(', ') + ' 👇' : 'Here’s what you can make from what you have 👇');
      return { messages: msgs, action: action };
    }
    // leftovers
    if ((m = t.match(/leftover[s]?\s+(of\s+)?([a-z \-]+)/)) || (m = t.match(/([a-z]+)\s+leftovers?/))) {
      var what = (m[2] || m[1]).replace(/^(the|some)\s+/, '').trim();
      var lk = keyOf(what) || 'chicken';
      addToInventory(state, 'Leftover ' + what, { loc: 'fridge', useSoon: true, forceNew: true, qty: 'Some' });
      msgs.push('Saved “Leftover ' + what + '” in the fridge as use-first 🟨. Here are reuse ideas.');
      return { messages: msgs, action: { type: 'leftover', key: lk } };
    }
    // Mark works
    if ((m = t.match(/mark (works|is working|has work|working)\s*(tomorrow|today|(\d+|one|two|three|four|five|six|seven) days?)?/))) {
      var n = 1, start = now;
      if (m[2] === 'tomorrow') start = addDays(now, 1);
      else if (m[3]) n = isNaN(+m[3]) ? NUM_WORDS[m[3]] : +m[3];
      var plan = markWorkMeals(state, { days: n, start: start });
      msgs.push(n === 1 ? 'Mark’s work meal for ' + plan.meals[0].day + ': ' + plan.meals[0].name + ' 💪' : 'Planned ' + n + ' work meals for Mark 💪');
      return { messages: msgs, action: { type: 'mark', plan: plan, days: n, start: ymd(start) } };
    }
    // X won't eat (that|food)
    if ((m = t.match(/^(kaden|winter|mark|megan|i)\s+(won'?t|wont|doesn'?t|didn'?t|will not|refuses to)\s+eat\s+(.+)$/))) {
      var person = m[1] === 'i' ? 'megan' : m[1];
      var food = m[3].trim();
      var mealIds = [];
      if (/^(that|it|this)$/.test(food)) { if (state.lastMealId) mealIds = [state.lastMealId]; }
      else { var fk = keyOf(food); mealIds = MEALS.filter(function (x) { return reqKeys(x).indexOf(fk) >= 0 || norm(x.name).indexOf(norm(food)) >= 0; }).map(function (x) { return x.id; }); }
      if (!mealIds.length) return { messages: ['Got it. I’m not sure which meal you mean, so tap “Won’t eat that” on the meal card.'], action: null };
      var counts = mealIds.map(function (id) { return reject(state, person, id); });
      var cnt = Math.max.apply(null, counts);
      msgs.push(cnt >= 2 ? 'Noted. That’s a pattern, so I’ll stop suggesting it for ' + cap(person) + '. 👍' : 'Noted once for ' + cap(person) + '. If it happens again, I’ll stop suggesting it.');
      return { messages: msgs, action: { type: 'reject', person: person, mealIds: mealIds, count: cnt } };
    }
    // bought everything (except ...)
    if ((m = t.match(/^(i |we )?(bought|got|picked up|grabbed) (everything|it all|all of it)(\s+(except|but|besides|minus)\s+(.+))?$/))) {
      var except = m[6] ? splitItems(m[6]) : [];
      var open = state.shopping.filter(function (s) { return !s.checked; });
      var skip = [];
      except.forEach(function (e) { findIn(open, e).forEach(function (s) { skip.push(s.id); }); });
      var got = 0;
      open.forEach(function (s) { if (skip.indexOf(s.id) < 0) { checkOff(state, s.id, true); got++; } });
      msgs.push('Nice! Moved ' + got + ' item' + (got === 1 ? '' : 's') + ' into the house. ' + (skip.length ? 'Still on the list: ' + open.filter(function (s) { return skip.indexOf(s.id) >= 0; }).map(function (s) { return s.name; }).join(', ') + '.' : ''));
      return { messages: msgs, action: { type: 'bought-all', count: got, skipped: skip.length } };
    }
    // out of
    if ((m = t.match(/^(we'?re|we are|i'?m|i am)?\s*(all out of|out of|ran out of|run out of|no more|used (up )?(all )?(the last( one)?( of)?)?|finished( the)?)\s+(.+)$/))) {
      splitItems(m[m.length - 1]).forEach(function (raw) {
        var name = qtyOf(raw).name;
        var found = findIn(state.inventory, name);
        found.forEach(function (it) { state.inventory = state.inventory.filter(function (i) { return i.id !== it.id; }); });
        var r = addToShopping(state, found[0] ? found[0].name : name, { why: 'Ran out' });
        msgs.push((found.length ? 'Took ' + found.map(function (f) { return f.name; }).join(', ') + ' out of the house. ' : '') + (r.existed ? r.item.name + ' was already on the list. 🛒' : 'Added ' + r.item.name + ' to shopping. 🛒'));
      });
      return { messages: msgs, action: { type: 'out' } };
    }
    // low on
    if ((m = t.match(/^(we'?re |we are |i'?m )?(low on|almost out of|running low on|running out of)\s+(.+)$/))) {
      splitItems(m[3]).forEach(function (name) {
        var f = findIn(state.inventory, name)[0];
        if (f) f.qty = 'Almost out';
        var r = addToShopping(state, f ? f.name : name, { why: 'Running low' });
        msgs.push((f ? f.name + ' marked “Almost out”. ' : '') + (r.existed ? 'It’s already on the list.' : 'Added to shopping so you don’t run out.'));
      });
      return { messages: msgs, action: { type: 'low' } };
    }
    // remove
    if ((m = t.match(/^(remove|delete|take off|take|cross off|scratch|get rid of|toss|throw out)\s+(.+?)(\s+(off|from)\s+(the\s+)?(list|shopping( list)?|inventory|pantry|fridge|freezer))?$/))) {
      var target = m[6] || '';
      splitItems(m[2]).forEach(function (name) {
        var sh = target.match(/pantry|fridge|freezer|inventory/) ? [] : findIn(state.shopping, name);
        if (sh.length) { state.shopping = state.shopping.filter(function (s) { return sh.indexOf(s) < 0; }); msgs.push('Removed ' + sh.map(function (s) { return s.name; }).join(', ') + ' from shopping.'); return; }
        var iv = findIn(state.inventory, name);
        if (iv.length) { state.inventory = state.inventory.filter(function (s) { return iv.indexOf(s) < 0; }); msgs.push('Removed ' + iv.map(function (s) { return s.name; }).join(', ') + ' from the house list.'); return; }
        msgs.push('I couldn’t find “' + name + '”. All good, nothing changed.');
      });
      return { messages: msgs, action: { type: 'remove' } };
    }
    // bought X
    if ((m = t.match(/^(i |we )?(bought|got|picked up|grabbed|have new)\s+(.+)$/))) {
      splitItems(m[3]).forEach(function (raw) {
        var q = qtyOf(raw);
        var sh = findIn(state.shopping.filter(function (s) { return !s.checked; }), q.name);
        if (sh.length) { sh.forEach(function (s) { checkOff(state, s.id, true); }); msgs.push('Checked off ' + sh.map(function (s) { return s.name; }).join(', ') + ' and put it in the house ✅'); }
        else { var r = addToInventory(state, q.name, { qty: q.qty || undefined }); msgs.push('Added ' + r.item.name + ' to the ' + r.item.loc + ' ✅'); }
      });
      return { messages: msgs, action: { type: 'bought' } };
    }
    // add to pantry/fridge/freezer or we have X
    if ((m = t.match(/^(add|put)\s+(.+?)\s+(to|in|into)\s+(the\s+)?(pantry|fridge|freezer)$/)) || (m = t.match(/^(we have|we've got|we got|i have|there'?s|have)\s+(.+?)(\s+in the\s+(pantry|fridge|freezer))?$/))) {
      var loc = m[5] || m[4] || null;
      if (loc && !/pantry|fridge|freezer/.test(loc)) loc = null;
      splitItems(m[2]).forEach(function (raw) {
        var q = qtyOf(raw);
        var r = addToInventory(state, q.name, { loc: loc || undefined, qty: q.qty || undefined });
        msgs.push((r.existed ? 'Updated ' : 'Added ') + r.item.name + ' (' + r.item.loc + ') 🟢');
      });
      return { messages: msgs, action: { type: 'have' } };
    }
    // add to shopping
    if ((m = t.match(/^(please\s+)?(add|need|we need|i need|buy|get|grab|pick up|put)\s+(.+?)(\s+(to|on)\s+(the\s+)?(list|shopping( list)?|grocery list))?(\s+(at|from)\s+(shoprite|stop & shop|stop and shop|walmart))?$/))) {
      var store = m[12] ? (/shoprite/.test(m[12]) ? 'ShopRite' : /walmart/.test(m[12]) ? 'Walmart' : 'Stop & Shop') : undefined;
      splitItems(m[3]).forEach(function (raw) {
        var q = qtyOf(raw);
        var r = addToShopping(state, q.name, { qty: q.qty || undefined, store: store });
        msgs.push(r.existed ? r.item.name + ' is already on the list 👍' : 'Added ' + r.item.name + ' to shopping 🛒');
      });
      return { messages: msgs, action: { type: 'add' } };
    }
    // fallback: treat as shopping add
    splitItems(t).forEach(function (raw) {
      var q = qtyOf(raw);
      var r = addToShopping(state, q.name, { qty: q.qty || undefined });
      msgs.push((r.existed ? r.item.name + ' is already on the list' : 'Added “' + r.item.name + '” to shopping') + ' (tap Undo if you meant something else)');
    });
    return { messages: msgs, action: { type: 'add', guessed: true } };
  }

  /* ---------- attention (welcome back) ---------- */
  function daysSince(iso, now) { if (!iso) return 0; return Math.floor(((now || new Date()) - new Date(iso)) / 86400000); }
  function attention(state, now) {
    var out = [];
    var soon = state.inventory.filter(function (i) { return i.useSoon && !isOut(i); });
    if (soon.length) out.push({ color: 'yellow', text: 'Use first: ' + soon.map(function (i) { return i.name; }).slice(0, 3).join(', ') });
    var low = state.inventory.filter(function (i) { return i.qty === '1 left' || i.qty === 'Almost out'; });
    if (low.length) out.push({ color: 'red', text: 'Running low: ' + low.map(function (i) { return i.name; }).slice(0, 3).join(', ') });
    var lab = state.inventory.filter(function (i) { return i.labelMe; });
    if (lab.length) out.push({ color: 'icy', text: 'Label me: ' + lab.map(function (i) { return i.name; }).join(', ') });
    var open = state.shopping.filter(function (s) { return !s.checked; }).length;
    if (open) out.push({ color: 'blue', text: open + ' thing' + (open === 1 ? '' : 's') + ' on the shopping list' });
    var b = budgetSummary(state, now);
    out.push({ color: 'green', text: '$' + b.remaining.toFixed(0) + ' left in this week’s food budget' });
    return out;
  }

  var api = {
    VERSION: VERSION, PEOPLE_ORDER: PEOPLE_ORDER, QTY_STEPS: QTY_STEPS, STORES: STORES, DAYS: DAYS, MEALS: MEALS, MEAL_BY_ID: MEAL_BY_ID,
    KEY_NAME: KEY_NAME, MARK_TEMPLATES: MARK_TEMPLATES, ROUTINES: ROUTINES, GRAB_IDEAS: GRAB_IDEAS, LUNCH: LUNCH,
    uid: uid, clone: clone, cap: cap, ymd: ymd, addDays: addDays, keyOf: keyOf, deptOf: deptOf, defaultLoc: defaultLoc, seed: seed,
    haveFn: haveFn, itemsWithKey: itemsWithKey, missingFor: missingFor, platesFor: platesFor, recommend: recommend,
    whatCanIMake: whatCanIMake, leftoverIdeas: leftoverIdeas, reject: reject, unreject: unreject, rejectCount: rejectCount,
    isRejected: isRejected, markWorkMeals: markWorkMeals, markToday: markToday, markProteins: markProteins, markEmergency: markEmergency,
    bestTemplate: bestTemplate, kidSuggestions: kidSuggestions, lunchOptions: lunchOptions, budgetSummary: budgetSummary,
    logSpend: logSpend, weekStart: weekStart, verdict: verdict, findPrice: findPrice, findIn: findIn, addToShopping: addToShopping,
    addToInventory: addToInventory, usedLast: usedLast, boughtInv: boughtInv, checkOff: checkOff, rememberStore: rememberStore,
    routineCheck: routineCheck, routineWhy: routineWhy, runRoutines: runRoutines, nextDate: nextDate, parse: parse, splitItems: splitItems,
    attention: attention, daysSince: daysSince, useSoonKeys: useSoonKeys, isOut: isOut
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FCC = api;
})(typeof window !== 'undefined' ? window : this);
