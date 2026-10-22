// Generates a realistic fastener catalog (~70 SKUs) for the MVP.
// Deterministic — same output every run so seeding is idempotent.

const round = (n) => Math.round(n * 10000) / 10000;

const items = [];
const push = (o) => items.push(o);

// --- Hex cap screws / bolts (Grade 5 zinc, Grade 8 plain) -------------------
// diameter-thread x length, priced per each.
const hexBolts = [
  { size: '1/4-20', dia: '1/4', tpi: 20, len: '1', grade: 5, finish: 'Zinc', price: 0.12 },
  { size: '1/4-20', dia: '1/4', tpi: 20, len: '2', grade: 5, finish: 'Zinc', price: 0.18 },
  { size: '5/16-18', dia: '5/16', tpi: 18, len: '1', grade: 5, finish: 'Zinc', price: 0.16 },
  { size: '3/8-16', dia: '3/8', tpi: 16, len: '1', grade: 5, finish: 'Zinc', price: 0.22 },
  { size: '3/8-16', dia: '3/8', tpi: 16, len: '1-1/2', grade: 5, finish: 'Zinc', price: 0.27 },
  { size: '1/2-13', dia: '1/2', tpi: 13, len: '1-1/2', grade: 5, finish: 'Zinc', price: 0.41 },
  { size: '1/2-13', dia: '1/2', tpi: 13, len: '2', grade: 8, finish: 'Plain', price: 0.58 },
  { size: '1/2-13', dia: '1/2', tpi: 13, len: '3', grade: 8, finish: 'Plain', price: 0.79 },
  { size: '5/8-11', dia: '5/8', tpi: 11, len: '2', grade: 8, finish: 'Plain', price: 0.94 },
  { size: '3/4-10', dia: '3/4', tpi: 10, len: '2-1/2', grade: 8, finish: 'Plain', price: 1.65 },
];
for (const b of hexBolts) {
  const sku = `HXB-${b.dia.replace(/\//g, '')}-${b.tpi}-${b.len.replace(/[^0-9]/g, '')}-G${b.grade}`;
  push({
    sku,
    part_number: `H${b.dia.replace(/\//g, '')}${b.tpi}${b.len.replace(/[^0-9]/g, '')}G${b.grade}`,
    name: `Hex Cap Screw ${b.size} x ${b.len}" Grade ${b.grade} ${b.finish}`,
    description: `${b.finish} finish hex head cap screw, ${b.size} thread, ${b.len}" length, SAE Grade ${b.grade}.`,
    category: 'Hex Bolts',
    uom: 'box-100',
    unit_qty: 100,
    price_per_unit: round(b.price * 100),
    attributes: { diameter: b.dia, thread: `${b.dia}-${b.tpi}`, tpi: b.tpi, length_in: b.len, grade: b.grade, finish: b.finish, head: 'Hex' },
  });
}

// --- Socket head cap screws (alloy, black oxide) ----------------------------
const shcs = [
  { size: '#10-24', dia: '#10', tpi: 24, len: '1', price: 0.14 },
  { size: '1/4-20', dia: '1/4', tpi: 20, len: '1', price: 0.19 },
  { size: '1/4-20', dia: '1/4', tpi: 20, len: '1-1/2', price: 0.24 },
  { size: '3/8-16', dia: '3/8', tpi: 16, len: '1', price: 0.33 },
  { size: '1/2-13', dia: '1/2', tpi: 13, len: '2', price: 0.72 },
];
for (const s of shcs) {
  const key = s.dia.replace(/[#/]/g, '');
  const sku = `SHCS-${key}-${s.tpi}-${s.len.replace(/[^0-9]/g, '')}`;
  push({
    sku,
    part_number: `SC${key}${s.tpi}${s.len.replace(/[^0-9]/g, '')}`,
    name: `Socket Head Cap Screw ${s.size} x ${s.len}" Alloy Black Oxide`,
    description: `Alloy steel socket head cap screw, ${s.size}, ${s.len}" length, black oxide finish.`,
    category: 'Socket Screws',
    uom: 'box-100',
    unit_qty: 100,
    price_per_unit: round(s.price * 100),
    attributes: { diameter: s.dia, thread: `${s.dia}-${s.tpi}`, tpi: s.tpi, length_in: s.len, material: 'Alloy', finish: 'Black Oxide', head: 'Socket' },
  });
}

// --- Hex nuts ---------------------------------------------------------------
const hexNuts = [
  { size: '1/4-20', dia: '1/4', tpi: 20, grade: 2, finish: 'Zinc', price: 0.03 },
  { size: '5/16-18', dia: '5/16', tpi: 18, grade: 2, finish: 'Zinc', price: 0.04 },
  { size: '3/8-16', dia: '3/8', tpi: 16, grade: 2, finish: 'Zinc', price: 0.05 },
  { size: '1/2-13', dia: '1/2', tpi: 13, grade: 5, finish: 'Zinc', price: 0.09 },
  { size: '5/8-11', dia: '5/8', tpi: 11, grade: 8, finish: 'Plain', price: 0.18 },
  { size: '3/4-10', dia: '3/4', tpi: 10, grade: 8, finish: 'Plain', price: 0.31 },
];
for (const n of hexNuts) {
  const sku = `HXN-${n.dia.replace(/\//g, '')}-${n.tpi}-G${n.grade}`;
  push({
    sku,
    part_number: `N${n.dia.replace(/\//g, '')}${n.tpi}G${n.grade}`,
    name: `Finished Hex Nut ${n.size} Grade ${n.grade} ${n.finish}`,
    description: `${n.finish} finished hex nut, ${n.size} thread, Grade ${n.grade}.`,
    category: 'Nuts',
    uom: 'box-100',
    unit_qty: 100,
    price_per_unit: round(n.price * 100),
    attributes: { diameter: n.dia, thread: `${n.dia}-${n.tpi}`, tpi: n.tpi, grade: n.grade, finish: n.finish, type: 'Finished Hex' },
  });
}

// --- Nylon insert lock nuts -------------------------------------------------
for (const [size, dia, tpi, price] of [['1/4-20', '1/4', 20, 0.05], ['3/8-16', '3/8', 16, 0.08], ['1/2-13', '1/2', 13, 0.14]]) {
  const sku = `NYL-${dia.replace(/\//g, '')}-${tpi}`;
  push({
    sku,
    part_number: `NL${dia.replace(/\//g, '')}${tpi}`,
    name: `Nylon Insert Lock Nut ${size} Zinc`,
    description: `Nylon insert lock nut (Nyloc), ${size} thread, zinc plated.`,
    category: 'Nuts',
    uom: 'box-100',
    unit_qty: 100,
    price_per_unit: round(price * 100),
    attributes: { diameter: dia, thread: `${dia}-${tpi}`, tpi, finish: 'Zinc', type: 'Nylon Insert Lock' },
  });
}

// --- Flat washers -----------------------------------------------------------
const flatWashers = [
  { size: '1/4', price: 0.015 },
  { size: '5/16', price: 0.018 },
  { size: '3/8', price: 0.02 },
  { size: '1/2', price: 0.03 },
  { size: '5/8', price: 0.05 },
  { size: '3/4', price: 0.08 },
];
for (const w of flatWashers) {
  const sku = `FLW-${w.size.replace(/\//g, '')}`;
  push({
    sku,
    part_number: `FW${w.size.replace(/\//g, '')}`,
    name: `Flat Washer ${w.size}" SAE Zinc`,
    description: `SAE flat washer for ${w.size}" bolt, zinc plated steel.`,
    category: 'Washers',
    uom: 'box-100',
    unit_qty: 100,
    price_per_unit: round(w.price * 100),
    attributes: { bolt_size: w.size, type: 'SAE Flat', finish: 'Zinc' },
  });
}

// --- Split lock washers -----------------------------------------------------
for (const [size, price] of [['1/4', 0.012], ['3/8', 0.018], ['1/2', 0.028], ['5/8', 0.045]]) {
  const sku = `LKW-${size.replace(/\//g, '')}`;
  push({
    sku,
    part_number: `LW${size.replace(/\//g, '')}`,
    name: `Split Lock Washer ${size}" Zinc`,
    description: `Split (helical spring) lock washer for ${size}" bolt, zinc plated.`,
    category: 'Washers',
    uom: 'box-100',
    unit_qty: 100,
    price_per_unit: round(price * 100),
    attributes: { bolt_size: size, type: 'Split Lock', finish: 'Zinc' },
  });
}

// --- Machine screws (phillips pan head) -------------------------------------
const machScrews = [
  { size: '#6-32', dia: '#6', tpi: 32, len: '1/2', price: 0.03 },
  { size: '#8-32', dia: '#8', tpi: 32, len: '3/4', price: 0.04 },
  { size: '#10-24', dia: '#10', tpi: 24, len: '1', price: 0.05 },
  { size: '1/4-20', dia: '1/4', tpi: 20, len: '1', price: 0.08 },
];
for (const m of machScrews) {
  const key = m.dia.replace(/[#/]/g, '');
  const sku = `MSPH-${key}-${m.tpi}-${m.len.replace(/[^0-9]/g, '')}`;
  push({
    sku,
    part_number: `MS${key}${m.tpi}${m.len.replace(/[^0-9]/g, '')}`,
    name: `Machine Screw ${m.size} x ${m.len}" Phillips Pan Head Zinc`,
    description: `Phillips pan head machine screw, ${m.size}, ${m.len}" length, zinc plated.`,
    category: 'Machine Screws',
    uom: 'box-100',
    unit_qty: 100,
    price_per_unit: round(m.price * 100),
    attributes: { diameter: m.dia, thread: `${m.dia}-${m.tpi}`, tpi: m.tpi, length_in: m.len, head: 'Phillips Pan', finish: 'Zinc' },
  });
}

// --- Wood / deck screws -----------------------------------------------------
const woodScrews = [
  { size: '#8', len: '1-1/4', price: 0.04, coat: 'Yellow Zinc' },
  { size: '#8', len: '2', price: 0.06, coat: 'Yellow Zinc' },
  { size: '#10', len: '2-1/2', price: 0.08, coat: 'Ceramic Exterior' },
  { size: '#10', len: '3', price: 0.10, coat: 'Ceramic Exterior' },
];
for (const w of woodScrews) {
  const key = w.size.replace(/[#/]/g, '');
  const sku = `WDS-${key}-${w.len.replace(/[^0-9]/g, '')}`;
  push({
    sku,
    part_number: `WD${key}${w.len.replace(/[^0-9]/g, '')}`,
    name: `Deck Screw ${w.size} x ${w.len}" Star Drive ${w.coat}`,
    description: `${w.coat} deck/wood screw, ${w.size} x ${w.len}", star (T25) drive.`,
    category: 'Wood Screws',
    uom: 'box-100',
    unit_qty: 100,
    price_per_unit: round(w.price * 100),
    attributes: { gauge: w.size, length_in: w.len, drive: 'Star T25', coating: w.coat },
  });
}

// --- Self-tapping / sheet metal screws --------------------------------------
for (const [size, len, price] of [['#8', '1/2', 0.03], ['#10', '3/4', 0.04], ['#12', '1', 0.06]]) {
  const key = size.replace(/[#/]/g, '');
  const sku = `SMS-${key}-${len.replace(/[^0-9]/g, '')}`;
  push({
    sku,
    part_number: `SM${key}${len.replace(/[^0-9]/g, '')}`,
    name: `Sheet Metal Screw ${size} x ${len}" Hex Washer Head Zinc`,
    description: `Self-tapping sheet metal screw, ${size} x ${len}", hex washer head, zinc.`,
    category: 'Sheet Metal Screws',
    uom: 'box-100',
    unit_qty: 100,
    price_per_unit: round(price * 100),
    attributes: { gauge: size, length_in: len, head: 'Hex Washer', finish: 'Zinc' },
  });
}

// --- Concrete / wedge anchors -----------------------------------------------
const anchors = [
  { size: '3/8', len: '3', price: 0.62 },
  { size: '1/2', len: '4-1/4', price: 0.98 },
  { size: '5/8', len: '5', price: 1.75 },
];
for (const a of anchors) {
  const sku = `WDG-${a.size.replace(/\//g, '')}-${a.len.replace(/[^0-9]/g, '')}`;
  push({
    sku,
    part_number: `WA${a.size.replace(/\//g, '')}${a.len.replace(/[^0-9]/g, '')}`,
    name: `Wedge Anchor ${a.size}" x ${a.len}" Zinc`,
    description: `Concrete wedge anchor, ${a.size}" diameter x ${a.len}" length, zinc plated.`,
    category: 'Anchors',
    uom: 'box-50',
    unit_qty: 50,
    price_per_unit: round(a.price * 50),
    attributes: { diameter: a.size, length_in: a.len, type: 'Wedge', finish: 'Zinc' },
  });
}

// --- Threaded rod -----------------------------------------------------------
for (const [size, dia, tpi, price] of [['1/4-20', '1/4', 20, 1.10], ['3/8-16', '3/8', 16, 1.95], ['1/2-13', '1/2', 13, 3.40], ['5/8-11', '5/8', 11, 5.20]]) {
  const sku = `TRD-${dia.replace(/\//g, '')}-${tpi}`;
  push({
    sku,
    part_number: `TR${dia.replace(/\//g, '')}${tpi}`,
    name: `Threaded Rod ${size} x 36" Zinc`,
    description: `All-thread rod, ${size}, 3 ft length, zinc plated. Priced each.`,
    category: 'Threaded Rod',
    uom: 'each',
    unit_qty: 1,
    price_per_unit: round(price),
    attributes: { diameter: dia, thread: `${dia}-${tpi}`, tpi, length_in: '36', finish: 'Zinc' },
  });
}

// --- Structural bolts (A325) ------------------------------------------------
for (const [size, dia, tpi, len, price] of [['1/2-13', '1/2', 13, '1-1/2', 0.85], ['5/8-11', '5/8', 11, '2', 1.35], ['3/4-10', '3/4', 10, '2-1/2', 2.10]]) {
  const sku = `A325-${dia.replace(/\//g, '')}-${tpi}-${len.replace(/[^0-9]/g, '')}`;
  push({
    sku,
    part_number: `A325${dia.replace(/\//g, '')}${tpi}${len.replace(/[^0-9]/g, '')}`,
    name: `Structural Bolt A325 ${size} x ${len}" Hot Dip Galvanized`,
    description: `ASTM A325 structural hex bolt, ${size} x ${len}", hot dip galvanized.`,
    category: 'Structural Bolts',
    uom: 'box-50',
    unit_qty: 50,
    price_per_unit: round(price * 50),
    attributes: { diameter: dia, thread: `${dia}-${tpi}`, tpi, length_in: len, spec: 'ASTM A325', finish: 'HDG' },
  });
}

export const catalog = items;
export default items;
