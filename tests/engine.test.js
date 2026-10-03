// Run: node tests/engine.test.js
const assert = require('assert');
const F = require('../engine.js');
const NOW = new Date(2026, 9, 3, 15, 0); // Sat Oct 3 2026, 3 PM local
let pass = 0, fail = 0; const results = [];
function t(name, fn) { try { const info = fn(); pass++; results.push(['PASS', name, info || '']); } catch (e) { fail++; results.push(['FAIL', name, e.message]); } }
const fresh = () => { const s = F.seed(); return s; };

t('1) "I have chicken, rice, cheese and tortillas, what can I make?" → practical options per person', () => {
  const s = fresh();
  const r = F.parse(s, 'I have chicken, rice, cheese and tortillas, what can I make?', NOW);
  assert.strictEqual(r.action.type, 'make');
  assert.deepStrictEqual(r.action.ingredients.sort(), ['cheese', 'chicken', 'rice', 'tortillas']);
  const w = F.whatCanIMake(s, { ingredients: r.action.ingredients, date: NOW });
  const ids = w.now.map(e => e.meal.id);
  ['chicken-quesadillas', 'chicken-rice', 'chicken-wraps'].forEach(id => assert.ok(ids.includes(id), id + ' missing'));
  const q = w.now.find(e => e.meal.id === 'chicken-quesadillas');
  ['mark', 'kaden', 'winter', 'megan'].forEach(p => assert.ok(q.plates[p].text.length > 3));
  assert.ok(!/corn|veg/i.test(q.plates.kaden.text), 'no veg for Kaden');
  return 'Can make now: ' + w.now.map(e => e.meal.name).join(', ') + ' | Quesadillas → Kaden: "' + q.plates.kaden.text + '", Megan: "' + q.plates.megan.text + '"';
});

t('2) "Mark works tomorrow" → a work meal', () => {
  const s = fresh();
  const r = F.parse(s, 'Mark works tomorrow', NOW);
  assert.strictEqual(r.action.type, 'mark');
  assert.strictEqual(r.action.plan.meals.length, 1);
  const m = r.action.plan.meals[0];
  assert.strictEqual(m.day, 'Sunday');
  assert.ok(m.protein >= 30 && m.cost > 0);
  return r.messages[0] + ' (' + m.protein + 'g protein, ~$' + m.cost.toFixed(2) + ', template ' + r.action.plan.templateName + ')';
});

t('2b) "Mark works 5 days" skips Tue/Wed, has prep list, protein, cost', () => {
  const s = fresh();
  const p = F.markWorkMeals(s, { days: 5, start: NOW, template: 'A' });
  assert.strictEqual(p.meals.length, 5);
  assert.ok(p.meals.every(m => m.day !== 'Tuesday' && m.day !== 'Wednesday'));
  assert.ok(p.prep.length >= 3 && p.proteinPerServing > 0 && p.totalCost > 0);
  ['A', 'B', 'C'].forEach(k => assert.ok(F.MARK_TEMPLATES[k]));
  return p.meals.map(m => m.day.slice(0, 3)).join(',') + ' · ~' + p.proteinPerServing + 'g/serving · ~$' + p.totalCost;
});

t('3) "We\'re out of eggs" → inventory updated + eggs on shopping', () => {
  const s = fresh();
  F.parse(s, 'we have eggs', NOW);
  assert.ok(s.inventory.some(i => /egg/i.test(i.name)), 'eggs added first');
  const r = F.parse(s, "We're out of eggs", NOW);
  assert.ok(!s.inventory.some(i => /egg/i.test(i.name)), 'eggs removed from inventory');
  assert.ok(s.shopping.some(i => /egg/i.test(i.name) && !i.checked), 'eggs on shopping');
  return r.messages.join(' ');
});

t('3b) Quick-add phrases: "add milk", "bought everything except bananas", "remove chicken"', () => {
  const s = fresh();
  F.parse(s, 'add milk', NOW);
  assert.ok(s.shopping.some(i => i.name === 'Milk'));
  F.parse(s, 'add bananas', NOW);
  const before = s.shopping.filter(i => !i.checked).length;
  const r = F.parse(s, 'bought everything except bananas', NOW);
  const open = s.shopping.filter(i => !i.checked);
  assert.strictEqual(open.length, 1); assert.strictEqual(open[0].name, 'Bananas');
  assert.ok(s.inventory.some(i => /milk/i.test(i.name) && i.qty === 2), 'milk restocked (merged into existing gallon)');
  const r2 = F.parse(s, 'remove chicken', NOW);
  assert.ok(!s.inventory.some(i => /chicken breast/i.test(i.name)));
  return before + ' open → 1 left (Bananas). ' + r.messages[0] + ' | ' + r2.messages[0];
});

t('3c) Used the last one → shopping; bought it → off shopping', () => {
  const s = fresh();
  const pizza = s.inventory.find(i => /pizza/i.test(i.name));
  F.usedLast(s, pizza.id);
  assert.ok(!s.inventory.includes(pizza) && s.shopping.some(x => /pizza/i.test(x.name)));
  const sh = s.shopping.find(x => /pizza/i.test(x.name));
  F.checkOff(s, sh.id, true);
  assert.ok(s.inventory.some(i => /pizza/i.test(i.name)));
  return 'ok';
});

t('4) "Kaden won\'t eat that" tapped twice → stops suggesting it for Kaden only', () => {
  const s = fresh();
  const target = F.kidSuggestions(s, 'kaden')[0].meal.id;
  assert.ok(F.kidSuggestions(s, 'winter').some(x => x.meal.id === target));
  F.reject(s, 'kaden', target);
  assert.ok(F.kidSuggestions(s, 'kaden').some(x => x.meal.id === target), 'still shown after one tap');
  F.reject(s, 'kaden', target);
  assert.ok(!F.kidSuggestions(s, 'kaden').some(x => x.meal.id === target), 'hidden after 2 taps');
  assert.ok(F.kidSuggestions(s, 'winter').some(x => x.meal.id === target), 'Winter unaffected');
  const plates = F.platesFor(s, F.MEAL_BY_ID[target]);
  assert.ok(plates.kaden.backup && !plates.winter.backup);
  // parser path too
  const s2 = fresh(); s2.lastMealId = 'pizza-night';
  F.parse(s2, "Kaden won't eat that", NOW); const r = F.parse(s2, "Kaden won't eat that", NOW);
  assert.ok(F.isRejected(s2, 'kaden', 'pizza-night'));
  return target + ' hidden for Kaden after 2 taps; Kaden now gets backup plate "' + plates.kaden.text + '". Parser: ' + r.messages[0];
});

t('5) "Leftover chicken" → reuse ideas (wraps, quesadillas, bowls, sandwiches)', () => {
  const s = fresh();
  const r = F.parse(s, 'We have leftover chicken', NOW);
  assert.strictEqual(r.action.type, 'leftover'); assert.strictEqual(r.action.key, 'chicken');
  assert.ok(s.inventory.some(i => /leftover chicken/i.test(i.name) && i.useSoon));
  const ideas = F.leftoverIdeas(s, 'chicken').map(i => i.meal.name);
  ['Wraps', 'Quesadillas', 'Rice', 'Sandwiches'].forEach(w => assert.ok(ideas.some(n => n.includes(w)), w));
  return ideas.join(', ');
});

t('6) "Exhausted, dinner in 15 min" → ONE meal (freezer pizza / Bubba burgers)', () => {
  const s = fresh();
  const r = F.recommend(s, { energy: 5, time: 15, date: NOW });
  assert.ok(r.meal && ['pizza-night', 'burger-night'].includes(r.meal.id), 'got ' + (r.meal && r.meal.id));
  assert.ok(r.steps.length >= 3 && r.steps.length <= 5);
  const r25 = F.recommend(s, { energy: 25, time: 15, date: NOW });
  const alt = F.recommend(s, { energy: 25, time: 15, date: NOW, exclude: [r25.meal.id] });
  return '5% / 15 min → ' + r.meal.name + ' (' + r.steps.length + ' steps). 25%/15 → ' + r25.meal.name + '; "something else" → ' + (alt.meal ? alt.meal.name : 'none');
});

t('7) Stock-up verdict uses the price book', () => {
  const s = fresh();
  const chicken = F.findPrice(s, 'chicken breast');
  assert.strictEqual(F.verdict(chicken, 1.89).verdict, 'Stock up');
  assert.strictEqual(F.verdict(chicken, 2.79).verdict, 'Good deal');
  assert.strictEqual(F.verdict(chicken, 3.99).verdict, 'Wait');
  const steak = F.findPrice(s, 'sirloin steak');
  assert.strictEqual(steak.normal, 14.58); assert.strictEqual(steak.placeholder, false);
  assert.strictEqual(F.verdict(steak, 14.58).verdict, 'Wait');
  assert.ok(s.pricebook.length >= 15 && s.pricebook.filter(p => p.placeholder).length >= 15);
  return 'Chicken $1.89 → Stock up, $2.79 → Good deal, $3.99 → Wait; steak recorded $14.58/lb → Wait';
});

t('Routines: Sunday macaroni + Tuesday dinner add missing items once', () => {
  const s = fresh();
  const m = F.runRoutines(s, NOW);
  const names = s.shopping.map(x => x.name);
  assert.ok(names.includes('Corn'), 'Corn added');
  ['Macaroni / pasta', 'Pasta sauce', 'Rice-A-Roni'].forEach(n => assert.ok(!names.includes(n), n + ' should NOT be added (in stock)'));
  assert.ok(/Winter/.test(s.shopping.find(x => x.name === 'Corn').why));
  assert.strictEqual(names.filter(n => /locatelli/i.test(n)).length, 1, 'Locatelli not duplicated');
  const again = F.runRoutines(s, NOW); assert.strictEqual(again.length, 0);
  return m.join(' | ');
});

t('Seed data: family + inventory + shopping exactly as specified', () => {
  const s = fresh();
  assert.deepStrictEqual(Object.keys(s.people).sort(), ['kaden', 'mark', 'megan', 'winter']);
  assert.strictEqual(s.inventory.length, 56);
  assert.strictEqual(s.inventory.filter(i => /olive oil/i.test(i.name)).length, 1);
  assert.strictEqual(s.inventory.filter(i => /bubba/i.test(i.name)).length, 1);
  assert.strictEqual(s.inventory.find(i => /breyers/i.test(i.name)).qty, 3);
  assert.strictEqual(s.inventory.find(i => /^salt$/i.test(i.name)).qty, 2);
  assert.strictEqual(s.inventory.filter(i => i.labelMe).length, 2);
  assert.strictEqual(s.shopping.length, 3);
  assert.strictEqual(s.settings.weeklyBudget, 200);
  return 'ok';
});

t('Budget: log spend, remaining', () => {
  const s = fresh();
  F.logSpend(s, '42.50', 'ShopRite', NOW);
  const b = F.budgetSummary(s, NOW);
  assert.strictEqual(b.spent, 42.5); assert.strictEqual(b.remaining, 157.5);
  return 'spent $42.50 → $157.50 left';
});

t('Condiments/chips/taco shells do not fake pasta sauce, potatoes, or pasta', () => {
  assert.strictEqual(F.keyOf('Soy sauce'), 'condiment'); assert.strictEqual(F.keyOf("Campbell's Beef Gravy"), 'condiment');
  assert.strictEqual(F.keyOf('Potato chips (bag)'), 'chips'); assert.strictEqual(F.keyOf('Taco shells'), 'tacoshells');
  assert.strictEqual(F.keyOf('Prego Traditional sauce'), 'sauce'); assert.strictEqual(F.keyOf('Elbow macaroni (bag)'), 'pasta');
  return 'ok';
});

t('No veg ever planned for Kaden; Megan plates never include veg', () => {
  const s = fresh(); s.inventory.push({ id: 'c', name: 'Corn', loc: 'freezer', qty: 'Lots' }, { id: 'a', name: 'Apples', loc: 'fridge', qty: 'Lots' });
  F.MEALS.forEach(m => { const p = F.platesFor(s, m); assert.ok(!/corn|veg|broccoli|salad/i.test(p.kaden.text), m.id); assert.ok(!/corn|broccoli|salad/i.test(p.megan.text), m.id); });
  return 'checked ' + F.MEALS.length + ' meals';
});

results.forEach(r => console.log(r[0] + '  ' + r[1] + (r[2] ? '\n      → ' + r[2] : '')));
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
