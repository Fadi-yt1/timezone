import * as T from '../.test-build/time.mjs';
let pass=0, fail=0;
const eq=(name,got,want)=>{ const ok = got===want; ok?pass++:fail++; console.log((ok?'  ok  ':'FAIL  ')+name+'  got='+got+(ok?'':'  want='+want)); };
const near=(name,got,want,tol)=>{ const ok=Math.abs(got-want)<=tol; ok?pass++:fail++; console.log((ok?'  ok  ':'FAIL  ')+name+'  got='+Number(got).toFixed(3)+(ok?'':'  want~'+want)); };

// --- offsets, standard and DST ---
const jan = Date.UTC(2026,0,15,12), jul = Date.UTC(2026,6,15,12);
eq('NY January = -300 (EST)', T.offsetMinutes('America/New_York', jan), -300);
eq('NY July     = -240 (EDT)', T.offsetMinutes('America/New_York', jul), -240);
eq('Kolkata     = +330 always', T.offsetMinutes('Asia/Kolkata', jul), 330);
eq('Kathmandu   = +345', T.offsetMinutes('Asia/Kathmandu', jul), 345);
eq('Chatham Jan = +825 (DST)', T.offsetMinutes('Pacific/Chatham', jan), 825);
eq('Kiritimati  = +840', T.offsetMinutes('Pacific/Kiritimati', jul), 840);
eq('Sydney Jan  = +660 (AEDT)', T.offsetMinutes('Australia/Sydney', jan), 660);
eq('UTC         = 0', T.offsetMinutes('UTC', jul), 0);

// --- offset formatting ---
eq('format +330', T.formatOffset(330), '+05:30');
eq('format -300', T.formatOffset(-300), '-05:00');
eq('format 0', T.formatOffset(0), '+00:00');
eq('label 0', T.formatUtcLabel(0), 'UTC');
eq('label 330', T.formatUtcLabel(330), 'UTC+5:30');
eq('label -480', T.formatUtcLabel(-480), 'UTC-8');

// --- round-trip wall clock -> instant -> wall clock ---
const inst = T.fromZonedTime('America/New_York', 2026, 3, 15, 9, 30, 0);
const back = T.zonedParts('America/New_York', inst);
eq('roundtrip NY hour', back.hour, 9);
eq('roundtrip NY minute', back.minute, 30);
eq('roundtrip NY day', back.day, 15);
const t2 = T.fromZonedTime('Asia/Kolkata', 2026, 7, 4, 18, 45, 0);
const b2 = T.zonedParts('Asia/Kolkata', t2);
eq('roundtrip Kolkata hour', b2.hour, 18);
eq('roundtrip Kolkata minute', b2.minute, 45);
// 14:30 UTC on 2026-07-04 is 20:00 IST
eq('Kolkata absolute', new Date(T.fromZonedTime('Asia/Kolkata',2026,7,4,20,0,0)).toISOString(), '2026-07-04T14:30:00.000Z');

// --- DST transitions: US spring forward 2026-03-08 02:00 local ---
const tr = T.nextTransition('America/New_York', Date.UTC(2026,0,1));
eq('NY next transition ISO', new Date(tr.at).toISOString(), '2026-03-08T07:00:00.000Z');
eq('NY transition forward', tr.forward, true);
eq('NY transition -300 -> -240', tr.before+'->'+tr.after, '-300->-240');
// EU last Sunday of March 2026 = Mar 29, 01:00 UTC
const eu = T.nextTransition('Europe/London', Date.UTC(2026,0,1));
eq('London next transition ISO', new Date(eu.at).toISOString(), '2026-03-29T01:00:00.000Z');
eq('London 2026 has 2 transitions', T.transitionsInYear('Europe/London',2026).length, 2);
eq('Kolkata has none', T.nextTransition('Asia/Kolkata', Date.UTC(2026,0,1)), null);

// --- DST state ---
const ny = T.dstState('America/New_York', jul);
eq('NY July inDst', ny.inDst, true);
eq('NY observes', ny.observesDst, true);
eq('NY std offset', ny.standardOffset, -300);
eq('Kolkata observes', T.dstState('Asia/Kolkata', jul).observesDst, false);

// --- sun times: London summer solstice 2026-06-21, sunrise ~03:43 UTC, sunset ~20:21 UTC ---
const s = T.sunTimes(51.5074, -0.1278, Date.UTC(2026,5,21,12));
const hUTC = ms => new Date(ms).getUTCHours() + new Date(ms).getUTCMinutes()/60;
near('London solstice sunrise (UTC h)', hUTC(s.sunrise), 3.72, 0.15);
near('London solstice sunset (UTC h)', hUTC(s.sunset), 20.35, 0.15);
// Polar day: Longyearbyen in June has no sunset
const arctic = T.sunTimes(78.22, 15.63, Date.UTC(2026,5,21,12));
eq('Svalbard midnight sun', arctic.sunrise, null);

// --- subsolar point ---
const sol = T.subsolarPoint(Date.UTC(2026,5,21,12,0,0));
near('solstice subsolar lat ~ +23.44', sol.lat, 23.44, 0.2);
near('solstice subsolar lon ~ 0 at 12:00 UTC', sol.lon, -0.4, 1.5);
const sol2 = T.subsolarPoint(Date.UTC(2026,2,20,0,0,0));
near('equinox subsolar lat ~ 0', sol2.lat, 0, 0.6);
near('midnight UTC subsolar lon ~ 180', Math.abs(sol2.lon), 180, 2);

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
