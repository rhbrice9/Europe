import { useState, useEffect, useCallback, useRef } from "react";
import { storage, isWriteUnlocked, isPasswordCorrect, setSessionPassword } from "../lib/supabase";

const STORAGE_KEY = "europe-trip-2026-v2";
const BUDGET_KEY  = "europe-trip-2026-budget-v1";
const NOTES_KEY   = "europe-trip-2026-notes-v1";

const TRAVELER_COLORS = {
  Carmen:"#e05c8a", Jason:"#5c8ae0", Hannah:"#5ce09a",
  Abby:"#e0b85c", Chris:"#b85ce0", Riley:"#5ce0d4", Rachel:"#e07a5c"
};
const TRAVELERS = Object.keys(TRAVELER_COLORS);

const COUPLES = [
  { id:"carmen-jason", label:"Carmen & Jason", members:["Carmen","Jason"], color:"#e05c8a", emoji:"💑" },
  { id:"abby-chris",   label:"Abby & Chris",   members:["Abby","Chris"],   color:"#b85ce0", emoji:"💑" },
  { id:"riley-rachel", label:"Riley & Rachel", members:["Riley","Rachel"], color:"#5ce0d4", emoji:"💑" },
  { id:"hannah",       label:"Hannah",         members:["Hannah"],         color:"#5ce09a", emoji:"🙋" },
];
const coupleOf    = n => COUPLES.find(c => c.members.includes(n));
const coupleLabel = n => coupleOf(n)?.label || n;

const EXPENSE_CATEGORIES = [
  { value:"food",      label:"🍽️ Food & Drink" },
  { value:"transport", label:"🚄 Transport" },
  { value:"lodging",   label:"🏨 Lodging" },
  { value:"activity",  label:"🎟️ Activities" },
  { value:"shopping",  label:"🛍️ Shopping" },
  { value:"other",     label:"💸 Other" },
];
const EXPENSE_CITIES = ["All","Dublin","London","Paris","Brussels"];
const DEFAULT_FX    = { USD:1.0, EUR:1.08, GBP:1.27 };

const ITEM_TYPES = [
  { value:"must",   label:"⭐ Must-Do",      bg:"rgba(255,215,0,0.1)",    border:"rgba(255,215,0,0.3)",    accent:"#ffd700" },
  { value:"nice",   label:"✅ Nice-to-Have", bg:"rgba(100,220,100,0.08)", border:"rgba(100,220,100,0.2)",  accent:"#64dc64" },
  { value:"note",   label:"⚠️ Note/Alert",  bg:"rgba(255,160,50,0.08)",  border:"rgba(255,160,50,0.2)",   accent:"#ffa032" },
  { value:"bullet", label:"• Activity",     bg:"rgba(255,255,255,0.04)", border:"rgba(255,255,255,0.08)", accent:"transparent" },
];

const ICONS = ["✈️","🏨","🌿","☕","🍺","😴","📚","🏰","🎵","⭐","🏟️","⚔️","🌊","🏔️","🍽️","🛍️","👥","🚄","🖼️","🎨","🍷","🥖","⚠️","✨","🛶","🏛️","🧇","⚛️","🗺️","🍫","👶","🌆","💎","👑","🇪🇺","🎩","🥗","🦕","🌳","⛪","🥙","🏈","🎽"];

const FLIGHT_DATA = {
  outbound:[
    { travelers:["Carmen","Jason","Hannah","Abby","Chris"], route:"CLT → DUB", date:"Aug 26, 2026", time:"21:15", note:"Overnight — arrives Dublin morning Aug 27", from:[35.214,-80.943], to:[53.421,-6.270] },
    { travelers:["Riley","Rachel"], route:"CLT → LHR", date:"Aug 30, 2026", time:"20:15", note:"Overnight — arrives London Aug 31 morning", from:[35.214,-80.943], to:[51.477,-0.461] },
    { travelers:["Carmen","Jason","Hannah","Abby","Chris"], route:"DUB → LHR", date:"Aug 31, 2026", time:"TBD", note:"Dublin to London — time TBD. Full group reunites in London tonight.", from:[53.421,-6.270], to:[51.477,-0.461] },
  ],
  return:[
    { travelers:["Hannah","Abby","Chris"], route:"LHR → CLT", date:"Sep 2, 2026", time:"15:00", note:"Depart Heathrow by 12:00", from:[51.477,-0.461], to:[35.214,-80.943] },
    { travelers:["Carmen","Jason"], route:"CDG → CLT", date:"Sep 5, 2026", time:"11:00", note:"Depart Brussels/Paris area early — be at CDG by 08:30", from:[49.009,2.548], to:[35.214,-80.943] },
    { travelers:["Riley","Rachel"], route:"CDG → CLT", date:"Sep 10, 2026", time:"11:00", note:"Depart Brussels by 07:00 — RER B to CDG", from:[49.009,2.548], to:[35.214,-80.943] },
  ]
};

const TRAIN_ROUTES = [
  { label:"London → Paris (Eurostar)", from:[51.5313,-0.1233], to:[48.8809,2.3553], color:"#5c8ae0" },
  { label:"Paris → Brussels (Thalys)",  from:[48.8809,2.3553], to:[50.8357,4.3360], color:"#e05c8a" },
  { label:"Brussels → Paris CDG",       from:[50.8357,4.3360], to:[49.009,2.548],   color:"#e0b85c" },
];

const DEFAULT_CITIES = [
  {
    id:"dublin", name:"Dublin", emoji:"🍀", dates:"August 27 – 31, 2026",
    color:"#2d8a4e", border:"rgba(93,218,138,0.3)", who:"Carmen · Jason · Hannah · Abby · Chris",
    days:[
      { id:"d1", date:"Thu, Aug 27", title:"Arrival Day", who:"Carmen · Jason · Hannah · Abby · Chris", items:[
        {id:"i1", type:"note",   icon:"✈️", text:"CLT → DUB departed Aug 26 @ 21:15. Overnight flight — arrives Dublin this morning."},
        {id:"i1t",type:"bullet", icon:"🚌", text:"Dublin Airport → City Centre. Options: Airlink Express Bus 747 (~30 min, €7) or taxi (~25 min, €25–35).", lat:53.4213, lng:-6.2701},
        {id:"i2", type:"bullet", icon:"🏨", text:"Check in to hotel — drop bags, freshen up, get oriented"},
        {id:"i3", type:"bullet", icon:"🌿", text:"Easy afternoon stroll through St. Stephen's Green", lat:53.3382, lng:-6.2591},
        {id:"i4", type:"bullet", icon:"☕", text:"Grafton Street — light lunch or coffee", lat:53.3418, lng:-6.2591},
        {id:"i5", type:"bullet", icon:"🍺", text:"Evening: Traditional Irish dinner — The Brazen Head", lat:53.3448, lng:-6.2764},
      ]},
      { id:"d2", date:"Fri, Aug 28", title:"Dublin Highlights", who:"All 5", items:[
        {id:"i7", type:"bullet", icon:"📚", text:"Morning: Trinity College Dublin & Book of Kells", lat:53.3459, lng:-6.2544},
        {id:"i8", type:"bullet", icon:"🍺", text:"Afternoon: Guinness Storehouse", lat:53.3419, lng:-6.2868},
        {id:"i9", type:"bullet", icon:"🏰", text:"Dublin Castle & Chester Beatty Library", lat:53.3433, lng:-6.2672},
        {id:"i10",type:"bullet", icon:"🎵", text:"Evening: Temple Bar — The Palace Bar or O'Donoghue's", lat:53.3454, lng:-6.2638},
      ]},
      { id:"d3", date:"Sat, Aug 29", title:"🏈 Aer Lingus College Football Classic", who:"All 5", items:[
        {id:"i11",type:"must",   icon:"⭐", text:"Aer Lingus College Football Classic — TCU vs. UNC Tar Heels at Aviva Stadium!", lat:53.3352, lng:-6.2284},
        {id:"i12",type:"bullet", icon:"🏟️",text:"Aviva Stadium, Lansdowne Road — DART to Lansdowne Road stop", lat:53.3352, lng:-6.2284},
        {id:"i14",type:"bullet", icon:"⚔️", text:"Morning (if schedule allows): Kilmainham Gaol", lat:53.3419, lng:-6.3100},
      ]},
      { id:"d4", date:"Sun, Aug 30", title:"Day Trip Options", who:"All 5 in Dublin | Riley & Rachel CLT → LHR @ 20:15", items:[
        {id:"i16",type:"bullet", icon:"🌊", text:"Option A: Day trip to Howth", lat:53.3898, lng:-6.0672},
        {id:"i17",type:"bullet", icon:"🏔️",text:"Option B: Cliffs of Moher", lat:52.9720, lng:-9.4264},
        {id:"i18",type:"bullet", icon:"🍽️",text:"Farewell Dublin dinner — Fade Street Social", lat:53.3415, lng:-6.2628},
      ]},
      { id:"d5", date:"Mon, Aug 31", title:"Dublin → London + Full Group Reunites", who:"Full group of 7 in London tonight", items:[
        {id:"i20",type:"bullet", icon:"🛍️",text:"Final Dublin stroll — Merrion Square", lat:53.3392, lng:-6.2508},
        {id:"i21",type:"bullet", icon:"✈️", text:"Midday: Dublin Airport → London Heathrow (DUB → LHR — time TBD)", lat:53.4213, lng:-6.2701},
      ]},
    ]
  },
  {
    id:"london", name:"London", emoji:"🇬🇧", dates:"August 31 – September 2, 2026",
    color:"#1a4f8a", border:"rgba(90,176,245,0.3)", who:"All 7 Travelers",
    trains:[{icon:"🚄",label:"London → Paris — Eurostar",detail:"London St Pancras International → Paris Gare du Nord · ~2h 20m · Book at eurostar.com — advance tickets from ~£39 pp."}],
    days:[
      { id:"d6", date:"Tue, Sep 1", title:"London Must-Haves", who:"All 7", items:[
        {id:"i25",type:"must",   icon:"⭐", text:"Tower of London — opens 09:00.", lat:51.5081, lng:-0.0759},
        {id:"i26",type:"bullet", icon:"🌉", text:"Tower Bridge", lat:51.5055, lng:-0.0754},
        {id:"i27",type:"must",   icon:"⭐", text:"Westminster Abbey", lat:51.4994, lng:-0.1273},
        {id:"i28",type:"nice",   icon:"✅", text:"Changing of the Guard — Buckingham Palace", lat:51.5014, lng:-0.1419},
        {id:"i29",type:"bullet", icon:"🍽️",text:"Evening: Dinner — Borough Market area or Dishoom", lat:51.5055, lng:-0.0910},
      ]},
      { id:"d7", date:"Wed, Sep 2", title:"V&A Museum + Group Split", who:"All 7 morning | Hannah · Abby · Chris → LHR 15:00", items:[
        {id:"i31",type:"must",   icon:"⭐", text:"Victoria & Albert Museum", lat:51.4966, lng:-0.1722},
        {id:"i32",type:"bullet", icon:"🦕", text:"Natural History Museum", lat:51.4967, lng:-0.1764},
        {id:"i35",type:"bullet", icon:"🌳", text:"Hyde Park / Portobello Road Market", lat:51.5073, lng:-0.1657},
        {id:"i36",type:"bullet", icon:"🚄", text:"Eurostar from St Pancras to Paris", lat:51.5313, lng:-0.1233},
      ]},
    ]
  },
  {
    id:"paris", name:"Paris", emoji:"🗼", dates:"September 2 – 5, 2026",
    color:"#8a1a4f", border:"rgba(240,122,170,0.3)", who:"Carmen · Jason · Riley · Rachel",
    trains:[{icon:"🚄",label:"Paris → Brussels — Thalys / Eurostar",detail:"Paris Gare du Nord → Brussels-Midi · ~1h 22m · Book at thalys.com — advance tickets from ~€29 pp."}],
    days:[
      { id:"d8", date:"Wed, Sep 2", title:"Arrival Evening", who:"Carmen · Jason · Riley · Rachel", items:[
        {id:"i37",type:"bullet", icon:"🚄", text:"Arrive Gare du Nord from London Eurostar", lat:48.8809, lng:2.3553},
        {id:"i38",type:"bullet", icon:"✨", text:"Eiffel Tower light show (free!)", lat:48.8584, lng:2.2945},
      ]},
      { id:"d9", date:"Thu, Sep 3", title:"Catacombs + Versailles", who:"Carmen · Jason · Riley · Rachel", items:[
        {id:"i40",type:"must",   icon:"⭐", text:"Catacombs of Paris — arrive 09:00", lat:48.8339, lng:2.3325},
        {id:"i41",type:"bullet", icon:"🥖", text:"Latin Quarter breakfast — Rue Mouffetard", lat:48.8431, lng:2.3505},
        {id:"i42",type:"must",   icon:"⭐", text:"Palace of Versailles", lat:48.8049, lng:2.1204},
        {id:"i43",type:"bullet", icon:"🍷", text:"Dinner in Montmartre", lat:48.8867, lng:2.3431},
      ]},
      { id:"d10", date:"Fri, Sep 4", title:"Louvre + Orsay + Eiffel Tower + Seine Cruise", who:"Carmen · Jason · Riley · Rachel", items:[
        {id:"i45",type:"bullet", icon:"🖼️",text:"Louvre Museum", lat:48.8606, lng:2.3376},
        {id:"i46",type:"bullet", icon:"🎨", text:"Musée d'Orsay", lat:48.8600, lng:2.3266},
        {id:"i47",type:"must",   icon:"⭐", text:"Eiffel Tower — golden hour", lat:48.8584, lng:2.2945},
        {id:"i48",type:"nice",   icon:"✅", text:"Seine River Cruise — Bateaux Parisiens", lat:48.8602, lng:2.2939},
      ]},
      { id:"d11", date:"Sat, Sep 5", title:"Last Paris Morning + Group Splits", who:"Carmen & Jason → CDG | Riley & Rachel → Brussels", items:[
        {id:"i50",type:"note",   icon:"✈️", text:"Carmen & Jason: CDG → CLT departs 11:00. RER B to CDG (~50 min).", lat:49.009,  lng:2.548},
        {id:"i51",type:"bullet", icon:"🥙", text:"Riley & Rachel: Le Marais district", lat:48.8570, lng:2.3540},
        {id:"i52",type:"bullet", icon:"🚄", text:"Riley & Rachel: Thalys to Brussels-Midi from Gare du Nord", lat:48.8809, lng:2.3553},
      ]},
    ]
  },
  {
    id:"brussels", name:"Brussels", emoji:"🍫", dates:"September 5 – 10, 2026",
    color:"#7a5a1a", border:"rgba(240,201,90,0.3)", who:"Riley · Rachel",
    trains:[{icon:"🚄",label:"Brussels → CDG (Sep 10 — Departure)",detail:"Brussels-Midi → Paris Gare du Nord (~1h 22m Thalys), then RER B to CDG Airport (~50 min). DEPART BRUSSELS BY 07:00 for CDG → CLT @ 11:00."}],
    days:[
      { id:"d12", date:"Sat, Sep 5", title:"Arrival in Brussels", who:"Riley · Rachel", items:[
        {id:"i53", type:"bullet", icon:"🚄", text:"Arrive Brussels-Midi from Paris", lat:50.8357, lng:4.3360},
        {id:"i53t",type:"bullet", icon:"🚇", text:"Brussels-Midi → Hotel. Options: Metro Line 2/6 (~10 min), tram, or taxi (~10–15 min to city centre).", lat:50.8357, lng:4.3360},
        {id:"i54", type:"bullet", icon:"🏛️",text:"Grand-Place", lat:50.8467, lng:4.3525},
        {id:"i55", type:"bullet", icon:"🍺", text:"Delirium Café", lat:50.8480, lng:4.3536},
      ]},
      { id:"d13", date:"Sun, Sep 6", title:"Brussels Classics", who:"Riley · Rachel", items:[
        {id:"i57",type:"bullet", icon:"⚛️", text:"Atomium", lat:50.8947, lng:4.3414},
        {id:"i58",type:"bullet", icon:"🗺️",text:"Mini-Europe park", lat:50.8944, lng:4.3381},
        {id:"i59",type:"bullet", icon:"🍫", text:"Chocolate — Neuhaus, Godiva, Pierre Marcolini", lat:50.8467, lng:4.3525},
        {id:"i60",type:"bullet", icon:"🍽️",text:"Dinner in Saint-Gilles neighbourhood", lat:50.8303, lng:4.3469},
      ]},
      { id:"d14", date:"Mon, Sep 7", title:"Day Trip: Bruges or Ghent", who:"Riley · Rachel", items:[
        {id:"i61",type:"bullet", icon:"🛶", text:"Option A — Bruges", lat:51.2093, lng:3.2247},
        {id:"i62",type:"bullet", icon:"🏰", text:"Option B — Ghent: Gravensteen Castle", lat:51.0574, lng:3.7196},
      ]},
      { id:"d15", date:"Tue, Sep 8", title:"EU Quarter & Museums", who:"Riley · Rachel", items:[
        {id:"i64",type:"bullet", icon:"🇪🇺",text:"European Parliament", lat:50.8384, lng:4.3650},
        {id:"i65",type:"bullet", icon:"🎩", text:"Magritte Museum", lat:50.8427, lng:4.3600},
        {id:"i66",type:"bullet", icon:"🖼️",text:"Royal Museums of Fine Arts", lat:50.8424, lng:4.3596},
      ]},
      { id:"d16", date:"Wed, Sep 9", title:"Leisure Day + Pack Up", who:"Riley · Rachel", items:[
        {id:"i68",type:"bullet", icon:"💎", text:"Sablon neighbourhood", lat:50.8426, lng:4.3566},
        {id:"i69",type:"bullet", icon:"🛍️",text:"Last-minute gifts around Grand-Place", lat:50.8467, lng:4.3525},
        {id:"i70",type:"bullet", icon:"🍽️",text:"Farewell dinner — moules-frites and Belgian beer", lat:50.8303, lng:4.3469},
      ]},
      { id:"d17", date:"Thu, Sep 10", title:"Departure Day — Brussels → CDG → CLT", who:"Riley · Rachel ✈️ Home", items:[
        {id:"i72",type:"must",   icon:"⭐", text:"DEPART BRUSSELS-MIDI BY 07:00 → Thalys to Paris → RER B to CDG", lat:50.8357, lng:4.3360},
        {id:"i73",type:"bullet", icon:"✈️", text:"CDG → CLT departs 11:00.", lat:49.009, lng:2.548},
      ]},
    ]
  }
];

const uid = () => Math.random().toString(36).slice(2, 9);

const T = {
  bg:"#07090f", bgCard:"rgba(255,255,255,0.035)", bgCardHov:"rgba(255,255,255,0.06)",
  border:"rgba(255,255,255,0.08)", borderHov:"rgba(255,255,255,0.18)",
  text:"#f0f0f4", textMid:"#9a9aaa", textDim:"#4a4a5a",
  accent:"#7c3aed", accent2:"#2563eb", radius:14, radiusSm:9,
  font:"'DM Sans', system-ui, sans-serif",
};

const toUSD = (amount, currency, fx) => amount * (fx[currency] || 1);

function gcPoints([lat1,lng1],[lat2,lng2],n=40){
  const pts=[];const R=d=>d*Math.PI/180;const D=r=>r*180/Math.PI;
  const φ1=R(lat1),λ1=R(lng1),φ2=R(lat2),λ2=R(lng2);
  for(let i=0;i<=n;i++){
    const f=i/n;
    const d=Math.acos(Math.min(1,Math.sin(φ1)*Math.sin(φ2)+Math.cos(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1)));
    if(d===0){pts.push([lat1,lng1]);continue;}
    const A=Math.sin((1-f)*d)/Math.sin(d),B=Math.sin(f*d)/Math.sin(d);
    const x=A*Math.cos(φ1)*Math.cos(λ1)+B*Math.cos(φ2)*Math.cos(λ2);
    const y=A*Math.cos(φ1)*Math.sin(λ1)+B*Math.cos(φ2)*Math.sin(λ2);
    const z=A*Math.sin(φ1)+B*Math.sin(φ2);
    pts.push([D(Math.atan2(z,Math.sqrt(x*x+y*y))),D(Math.atan2(y,x))]);
  }
  return pts;
}

function TripMap({ cities }) {
  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const [selectedDay, setSelectedDay]   = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);

  const allDays = cities.flatMap(c =>
    c.days.map(d => ({ ...d, cityName:c.name, cityColor:c.color, cityEmoji:c.emoji }))
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("leaflet-css")) { setLeafletReady(true); return; }
    const link = document.createElement("link");
    link.id = "leaflet-css"; link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => setLeafletReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!leafletReady || !mapRef.current) return;
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl:true, scrollWheelZoom:true });
    mapInstanceRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom:19
    }).addTo(map);

    const pins = [];
    const day  = selectedDay ? allDays.find(d => d.id === selectedDay) : null;

    if (day) {
      day.items.filter(i => i.lat && i.lng).forEach(item => {
        const ic = L.divIcon({ className:"", iconAnchor:[16,32], popupAnchor:[0,-32],
          html:`<div style="background:${day.cityColor};border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:28px;height:28px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4)"><span style="transform:rotate(45deg);font-size:14px">${item.icon}</span></div>`
        });
        L.marker([item.lat, item.lng], { icon:ic }).addTo(map)
          .bindPopup(`<div style="font-family:sans-serif;min-width:180px"><b>${item.icon} ${item.text.slice(0,60)}${item.text.length>60?"…":""}</b></div>`);
        pins.push([item.lat, item.lng]);
      });
      if (pins.length > 1) L.polyline(pins, { color:day.cityColor, weight:2, opacity:0.5, dashArray:"6,8" }).addTo(map);
    } else {
      cities.forEach(c => c.days.forEach(d => d.items.filter(i => i.lat && i.lng).forEach(item => {
        const ic = L.divIcon({ className:"", iconAnchor:[10,10],
          html:`<div style="background:${c.color};border:2px solid #fff;border-radius:50%;width:18px;height:18px;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`
        });
        L.marker([item.lat, item.lng], { icon:ic }).addTo(map)
          .bindPopup(`<b>${item.icon} ${item.text.slice(0,50)}${item.text.length>50?"…":""}</b>`);
        pins.push([item.lat, item.lng]);
      })));
      [...FLIGHT_DATA.outbound, ...FLIGHT_DATA.return].forEach(f => {
        const pts = gcPoints(f.from, f.to, 40);
        L.polyline(pts, { color:"#7c3aed", weight:1.5, opacity:0.6, dashArray:"4,6" }).addTo(map);
        const mid = pts[Math.floor(pts.length / 2)];
        L.marker(mid, { icon: L.divIcon({ className:"", iconAnchor:[10,10], html:`<div style="font-size:18px;filter:drop-shadow(0 0 4px rgba(124,58,237,0.8))">✈️</div>` }) })
          .addTo(map).bindPopup(`<b>✈️ ${f.route}</b><br/><small>${f.date} · ${f.time}</small>`);
      });
      TRAIN_ROUTES.forEach(t =>
        L.polyline([t.from, t.to], { color:t.color, weight:2.5, opacity:0.7 }).addTo(map)
          .bindPopup(`<b>🚄 ${t.label}</b>`)
      );
    }

    if (pins.length > 0) {
      try { map.fitBounds(L.latLngBounds(pins), { padding:[40,40], maxZoom:14 }); }
      catch(e) { map.setView(pins[0], 13); }
    } else { map.setView([51.0, 3.0], 5); }

    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, [leafletReady, selectedDay, cities]);

  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:T.textDim, textTransform:"uppercase", marginBottom:10 }}>Select Day</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button onClick={() => setSelectedDay(null)} style={{ padding:"7px 14px", borderRadius:T.radiusSm, border:"1px solid "+(selectedDay===null?T.accent:T.border), background:selectedDay===null?"rgba(124,58,237,0.2)":T.bgCard, color:selectedDay===null?"#fff":T.textMid, cursor:"pointer", fontSize:12, fontWeight:600 }}>🌍 Full Trip</button>
          {allDays.map(d => (
            <button key={d.id} onClick={() => setSelectedDay(d.id)} style={{ padding:"7px 14px", borderRadius:T.radiusSm, cursor:"pointer", fontSize:12, fontWeight:600, border:"1px solid "+(selectedDay===d.id?d.cityColor:T.border), background:selectedDay===d.id?d.cityColor+"33":T.bgCard, color:selectedDay===d.id?"#fff":T.textMid }}>{d.cityEmoji} {d.date}</button>
          ))}
        </div>
      </div>
      <div ref={mapRef} style={{ height:500, borderRadius:T.radius, overflow:"hidden", border:"1px solid "+T.border, background:"#1a2030" }}/>
      <div style={{ marginTop:12, display:"flex", gap:16, flexWrap:"wrap", fontSize:12, color:T.textDim }}>
        <span>📍 Location pin</span>
        <span style={{ color:"#7c3aed" }}>- - ✈️ Flight arc</span>
        <span>— 🚄 Train route</span>
      </div>
    </div>
  );
}

function Btn({ onClick, children, small, danger, disabled, primary }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: primary ? `linear-gradient(135deg,${T.accent},${T.accent2})` : danger ? "rgba(220,50,50,0.15)" : "rgba(255,255,255,0.07)",
      border: "1px solid " + (primary ? "transparent" : danger ? "rgba(220,50,50,0.3)" : T.border),
      color: disabled ? T.textDim : danger ? "#f87171" : primary ? "#fff" : "#ccc",
      borderRadius: small ? 6 : T.radiusSm, padding: small ? "3px 8px" : "9px 18px",
      fontSize: small ? 11 : 13, fontWeight:600, cursor: disabled ? "not-allowed" : "pointer",
    }}>{children}</button>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(6px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"#0f1420",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:28,width:"100%",maxWidth:wide?680:500,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.7)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22 }}>
          <div style={{ fontWeight:700,fontSize:17,color:T.text }}>{title}</div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.07)",border:"1px solid "+T.border,color:T.textMid,fontSize:16,cursor:"pointer",width:32,height:32,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize:11,color:T.textDim,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:1.2,fontWeight:700 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:T.radiusSm, padding:"11px 14px", color:T.text, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:T.font };

function ItemEditor({ item, onSave, onClose }) {
  const [type,setType] = useState(item?.type  || "bullet");
  const [icon,setIcon] = useState(item?.icon  || "📍");
  const [text,setText] = useState(item?.text  || "");
  return (
    <Modal title={item ? "Edit Item" : "Add Item"} onClose={onClose}>
      <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
        <Field label="Type">
          <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
            {ITEM_TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)} style={{ padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600, border:"1px solid "+(type===t.value?t.accent:"rgba(255,255,255,0.08)"), background:type===t.value?t.bg:"rgba(255,255,255,0.03)", color:type===t.value?"#fff":T.textMid }}>{t.label}</button>
            ))}
          </div>
        </Field>
        <Field label="Icon">
          <div style={{ display:"flex",gap:5,flexWrap:"wrap",maxHeight:110,overflowY:"auto",padding:4 }}>
            {ICONS.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)} style={{ width:36,height:36,borderRadius:8,cursor:"pointer",fontSize:18, border:"1px solid "+(icon===ic?"rgba(124,58,237,0.7)":T.border), background:icon===ic?"rgba(124,58,237,0.18)":T.bgCard }}>{ic}</button>
            ))}
          </div>
        </Field>
        <Field label="Text">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3} style={{ ...inputStyle, resize:"vertical" }}/>
        </Field>
        <div style={{ display:"flex",justifyContent:"flex-end",gap:8 }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn primary onClick={() => text.trim() && onSave({ type, icon, text:text.trim() })}>Save</Btn>
        </div>
      </div>
    </Modal>
  );
}

function DayEditor({ day, onSave, onClose }) {
  const [date, setDate]   = useState(day?.date  || "");
  const [title,setTitle]  = useState(day?.title || "");
  const [who,  setWho]    = useState(day?.who   || "");
  return (
    <Modal title={day ? "Edit Day" : "Add Day"} onClose={onClose}>
      <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
        <Field label="Date"><input  value={date}  onChange={e => setDate(e.target.value)}  placeholder="e.g. Thu, Aug 27" style={inputStyle}/></Field>
        <Field label="Title"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Day title"        style={inputStyle}/></Field>
        <Field label="Who"><input   value={who}   onChange={e => setWho(e.target.value)}   placeholder="e.g. All 7"       style={inputStyle}/></Field>
        <div style={{ display:"flex",justifyContent:"flex-end",gap:8 }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn primary onClick={() => (date && title.trim()) && onSave({ date, title:title.trim(), who:who.trim() })}>Save</Btn>
        </div>
      </div>
    </Modal>
  );
}

function ItemRow({ item, onEdit, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const t = ITEM_TYPES.find(x => x.value === item.type) || ITEM_TYPES[3];
  const [show, setShow] = useState(false);
  return (
    <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      style={{ display:"flex",alignItems:"flex-start",gap:8,padding:"10px 14px", background:show?T.bgCardHov:t.bg, border:"1px solid "+(show?"rgba(255,255,255,0.14)":t.border), borderLeft:"3px solid "+(t.accent==="transparent"?"rgba(255,255,255,0.1)":t.accent), borderRadius:T.radiusSm, transition:"all 0.15s" }}>
      <span style={{ fontSize:16,flexShrink:0,marginTop:2 }}>{item.icon}</span>
      <div style={{ flex:1,minWidth:0 }}><span style={{ fontSize:13.5,color:"#ddd",lineHeight:1.55 }}>{item.text}</span></div>
      <div style={{ display:"flex",gap:3,flexShrink:0,opacity:show?1:0,pointerEvents:show?"auto":"none",transition:"opacity 0.15s" }}>
        <Btn small onClick={e => { e.stopPropagation(); onMoveUp(); }}   disabled={isFirst}>↑</Btn>
        <Btn small onClick={e => { e.stopPropagation(); onMoveDown(); }} disabled={isLast}>↓</Btn>
        <Btn small onClick={e => { e.stopPropagation(); onEdit(); }}>✏️</Btn>
        <Btn small danger onClick={e => { e.stopPropagation(); onDelete(); }}>✕</Btn>
      </div>
    </div>
  );
}

function DayCard({ day, di, totalDays, expanded, onToggle, onMoveUp, onMoveDown, onEdit, onDelete, onAddItem, onEditItem, onDeleteItem, onMoveItemUp, onMoveItemDown }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ background:T.bgCard, border:"1px solid "+(show?T.borderHov:T.border), borderRadius:T.radius, marginBottom:8, overflow:"hidden", transition:"border-color 0.15s" }}>
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} style={{ display:"flex",alignItems:"center",padding:"14px 16px",gap:8 }}>
        <div style={{ display:"flex",gap:3,opacity:show?1:0,pointerEvents:show?"auto":"none",transition:"opacity 0.15s",flexShrink:0 }}>
          <Btn small onClick={onMoveUp}   disabled={di===0}>↑</Btn>
          <Btn small onClick={onMoveDown} disabled={di===totalDays-1}>↓</Btn>
        </div>
        <div onClick={onToggle} style={{ flex:1,cursor:"pointer" }}>
          <div style={{ fontSize:11,color:T.textDim,fontWeight:600 }}>{day.date}</div>
          <div style={{ fontSize:15,fontWeight:700,color:T.text,margin:"2px 0" }}>{day.title}</div>
          <div style={{ fontSize:11,color:T.textDim }}>👥 {day.who}</div>
        </div>
        <div style={{ display:"flex",gap:4,alignItems:"center",flexShrink:0 }}>
          <div style={{ display:"flex",gap:3,opacity:show?1:0,pointerEvents:show?"auto":"none",transition:"opacity 0.15s" }}>
            <Btn small onClick={onEdit}>✏️</Btn>
            <Btn small danger onClick={onDelete}>✕</Btn>
          </div>
          <button onClick={onToggle} style={{ background:"none",border:"none",color:T.textDim,fontSize:18,cursor:"pointer",transform:expanded?"rotate(180deg)":"none",transition:"transform 0.2s" }}>⌄</button>
        </div>
      </div>
      {expanded && (
        <div style={{ padding:"0 14px 14px",display:"flex",flexDirection:"column",gap:5 }}>
          {day.items.map((item, ii) => (
            <ItemRow key={item.id} item={item} isFirst={ii===0} isLast={ii===day.items.length-1}
              onEdit={() => onEditItem(item)} onDelete={() => onDeleteItem(item.id)}
              onMoveUp={() => onMoveItemUp(item.id)} onMoveDown={() => onMoveItemDown(item.id)}/>
          ))}
          <button onClick={onAddItem} style={{ marginTop:4,padding:"8px",borderRadius:T.radiusSm,border:"1px dashed rgba(255,255,255,0.12)",background:"transparent",color:T.textDim,fontSize:13,cursor:"pointer" }}>+ Add item</button>
        </div>
      )}
    </div>
  );
}

const DEFAULT_BUDGET = { expenses:[] };

function ExpenseEditor({ expense, onSave, onClose }) {
  const [desc,       setDesc]       = useState(expense?.desc      || "");
  const [amount,     setAmount]     = useState(expense?.amount    || "");
  const [currency,   setCurrency]   = useState(expense?.currency  || "USD");
  const [cat,        setCat]        = useState(expense?.cat       || "food");
  const [city,       setCity]       = useState(expense?.city      || "All");
  const [paidBy,     setPaidBy]     = useState(expense?.paidBy    || "Carmen");
  const [splitMode,  setSplitMode]  = useState(expense?.splitMode || "even");
  const [splitWith,  setSplitWith]  = useState(expense?.splitWith || TRAVELERS);
  const [customAmts, setCustomAmts] = useState(expense?.customAmts|| {});

  const toggleCouple = c => {
    const allIn = c.members.every(m => splitWith.includes(m));
    setSplitWith(prev => allIn ? prev.filter(m => !c.members.includes(m)) : [...new Set([...prev,...c.members])]);
  };
  const coupleChecked = c => c.members.every(m => splitWith.includes(m));
  const evenShare = c => {
    const mine = splitWith.filter(m => c.members.includes(m));
    return amount && splitWith.length > 0 ? (parseFloat(amount) / splitWith.length * mine.length).toFixed(2) : "0.00";
  };
  const save = () => {
    if (!desc.trim() || !amount) return;
    onSave({ id:expense?.id||uid(), desc:desc.trim(), amount:parseFloat(amount), currency, cat, city, paidBy, splitMode, splitWith, customAmts, date:expense?.date||new Date().toISOString() });
  };

  return (
    <Modal title={expense ? "Edit Expense" : "Add Expense"} onClose={onClose} wide>
      <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
        <Field label="Description"><input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Dinner at Le Jules Verne" style={inputStyle}/></Field>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12 }}>
          <Field label="Amount"><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" style={inputStyle}/></Field>
          <Field label="Currency">
            <select value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle}>
              {["USD","EUR","GBP"].map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="City">
            <select value={city} onChange={e => setCity(e.target.value)} style={inputStyle}>
              {EXPENSE_CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Category">
          <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
            {EXPENSE_CATEGORIES.map(c => (
              <button key={c.value} onClick={() => setCat(c.value)} style={{ padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600, border:"1px solid "+(cat===c.value?T.accent:T.border), background:cat===c.value?"rgba(124,58,237,0.2)":T.bgCard, color:cat===c.value?"#fff":T.textMid }}>{c.label}</button>
            ))}
          </div>
        </Field>
        <Field label="Paid by">
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            {COUPLES.map(c => { const active = coupleOf(paidBy)?.id === c.id; return (
              <button key={c.id} onClick={() => setPaidBy(c.members[0])} style={{ padding:"8px 16px",borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:600, border:"1px solid "+(active?c.color:T.border), background:active?c.color+"33":T.bgCard, color:active?"#fff":T.textMid }}>{c.emoji} {c.label}</button>
            ); })}
          </div>
        </Field>
        <Field label="Split with">
          <div style={{ display:"flex",gap:8,marginBottom:10 }}>
            {[["even","Split Evenly"],["custom","Custom"]].map(([v,l]) => (
              <button key={v} onClick={() => setSplitMode(v)} style={{ padding:"7px 16px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600, border:"1px solid "+(splitMode===v?T.accent:T.border), background:splitMode===v?"rgba(124,58,237,0.2)":T.bgCard, color:splitMode===v?"#fff":T.textMid }}>{l}</button>
            ))}
          </div>
          <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
            {COUPLES.map(c => { const checked = coupleChecked(c); return (
              <div key={c.id} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:6 }}>
                <button onClick={() => toggleCouple(c)} style={{ padding:"8px 16px",borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:600, border:"1px solid "+(checked?c.color:T.border), background:checked?c.color+"2a":T.bgCard, color:checked?"#fff":T.textDim }}>{c.emoji} {c.label}</button>
                {splitMode==="even"  && checked && amount && <div style={{ fontSize:11,color:c.color,fontWeight:600 }}>{currency} {evenShare(c)}</div>}
                {splitMode==="custom"&& checked && (
                  <input type="number" value={customAmts[c.id]||""} onChange={e => setCustomAmts(p => ({...p,[c.id]:e.target.value}))} placeholder="0.00"
                    style={{ width:72,background:"rgba(255,255,255,0.06)",border:"1px solid "+T.border,borderRadius:6,padding:"5px 8px",color:T.text,fontSize:12,outline:"none",textAlign:"center" }}/>
                )}
              </div>
            ); })}
          </div>
        </Field>
        <div style={{ display:"flex",justifyContent:"flex-end",gap:8 }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn primary onClick={save}>Save Expense</Btn>
        </div>
      </div>
    </Modal>
  );
}

function ExportModal({ budget, fx, onClose }) {
  const expenses = budget.expenses || [];
  const [copied, setCopied] = useState(false);

  const buildReport = () => {
    const lines = [];
    const totalUSD = expenses.reduce((s,e) => s + toUSD(e.amount, e.currency, fx), 0);
    lines.push("═══════════════════════════════════════════════════");
    lines.push("  EUROPE TRIP 2026 — BUDGET EXPORT");
    lines.push(`  Generated: ${new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}`);
    lines.push("═══════════════════════════════════════════════════");
    lines.push("");
    lines.push("SUMMARY");
    lines.push("───────────────────────────────────────────────────");
    lines.push(`Total Spent (USD):  $${totalUSD.toFixed(2)}`);
    lines.push(`Total Expenses:     ${expenses.length}`);
    lines.push(`FX Rates Used:      1 EUR = $${fx.EUR.toFixed(4)}  |  1 GBP = $${fx.GBP.toFixed(4)}`);
    lines.push("");
    lines.push("TOTALS BY GROUP");
    lines.push("───────────────────────────────────────────────────");
    COUPLES.forEach(c => {
      let paid = 0, owes = 0;
      expenses.forEach(exp => {
        const payer  = coupleOf(exp.paidBy);
        const amtUSD = toUSD(exp.amount, exp.currency, fx);
        if (exp.splitMode === "even" && exp.splitWith.length > 0) {
          const pp   = amtUSD / exp.splitWith.length;
          const mine = exp.splitWith.filter(n => coupleOf(n)?.id === c.id);
          owes += pp * mine.length;
          if (payer?.id === c.id) paid += amtUSD;
        } else if (exp.splitMode === "custom") {
          if (payer?.id === c.id) paid += amtUSD;
          c.members.forEach(m => { owes += toUSD(parseFloat(exp.customAmts?.[m]||0), exp.currency, fx); });
        }
      });
      const net = paid - owes;
      const status = net > 0.005 ? `Gets back $${net.toFixed(2)}` : net < -0.005 ? `Owes $${Math.abs(net).toFixed(2)}` : "Settled ✓";
      lines.push(`${(c.label+":").padEnd(22)} Paid $${paid.toFixed(2).padStart(8)}  |  Fair share $${owes.toFixed(2).padStart(8)}  |  ${status}`);
    });
    lines.push("");
    lines.push("EXPENSE DETAIL");
    lines.push("───────────────────────────────────────────────────");
    [...expenses].sort((a,b) => new Date(a.date)-new Date(b.date)).forEach((exp,i) => {
      const cat    = EXPENSE_CATEGORIES.find(c => c.value === exp.cat);
      const payer  = coupleOf(exp.paidBy);
      const amtUSD = toUSD(exp.amount, exp.currency, fx);
      lines.push(`${i+1}. ${exp.desc}`);
      lines.push(`   Amount:   ${exp.currency} ${exp.amount.toFixed(2)}${exp.currency!=="USD"?` (= $${amtUSD.toFixed(2)} USD)`:""}`);
      lines.push(`   Category: ${cat?.label||exp.cat}${exp.city&&exp.city!=="All"?"  |  City: "+exp.city:""}`);
      lines.push(`   Paid by:  ${payer?.label||exp.paidBy}`);
      if (exp.splitMode === "even" && exp.splitWith.length > 0) {
        const pp = amtUSD / exp.splitWith.length;
        const cs = {};
        exp.splitWith.forEach(n => { const c = coupleOf(n); if (c) cs[c.id] = (cs[c.id]||0) + pp; });
        const splitStr = Object.entries(cs).map(([cid,s]) => `${COUPLES.find(c=>c.id===cid).label} $${s.toFixed(2)}`).join("  |  ");
        lines.push(`   Split:    Evenly among ${exp.splitWith.length} people → ${splitStr}`);
      } else if (exp.splitMode === "custom") {
        const cs = {};
        Object.entries(exp.customAmts||{}).forEach(([n,v]) => { const c = coupleOf(n); if (c) cs[c.id] = (cs[c.id]||0) + toUSD(parseFloat(v)||0, exp.currency, fx); });
        const splitStr = Object.entries(cs).map(([cid,s]) => `${COUPLES.find(c=>c.id===cid).label} $${s.toFixed(2)}`).join("  |  ");
        lines.push(`   Split:    Custom → ${splitStr}`);
      }
      lines.push("");
    });
    lines.push("───────────────────────────────────────────────────");
    lines.push("  End of report");
    return lines.join("\n");
  };

  const report = buildReport();
  const copyToClipboard = () => {
    navigator.clipboard.writeText(report).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  const downloadTxt = () => {
    const blob = new Blob([report], { type:"text/plain" });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "europe-trip-2026-budget.txt"; a.click(); URL.revokeObjectURL(url);
  };
  const downloadCSV = () => {
    const rows = [["#","Description","Category","City","Currency","Amount","Amount (USD)","Paid By","Split Mode","Splits (USD)"]];
    [...budget.expenses].sort((a,b) => new Date(a.date)-new Date(b.date)).forEach((exp,i) => {
      const cat    = EXPENSE_CATEGORIES.find(c => c.value === exp.cat);
      const payer  = coupleOf(exp.paidBy);
      const amtUSD = toUSD(exp.amount, exp.currency, fx);
      let splits = "";
      if (exp.splitMode === "even" && exp.splitWith.length > 0) {
        const pp = amtUSD / exp.splitWith.length;
        const cs = {};
        exp.splitWith.forEach(n => { const c = coupleOf(n); if (c) cs[c.id] = (cs[c.id]||0) + pp; });
        splits = Object.entries(cs).map(([cid,s]) => `${COUPLES.find(c=>c.id===cid).label}: $${s.toFixed(2)}`).join("; ");
      } else if (exp.splitMode === "custom") {
        const cs = {};
        Object.entries(exp.customAmts||{}).forEach(([n,v]) => { const c = coupleOf(n); if (c) cs[c.id] = (cs[c.id]||0) + toUSD(parseFloat(v)||0, exp.currency, fx); });
        splits = Object.entries(cs).map(([cid,s]) => `${COUPLES.find(c=>c.id===cid).label}: $${s.toFixed(2)}`).join("; ");
      }
      rows.push([i+1, `"${exp.desc}"`, cat?.label||exp.cat, exp.city, exp.currency, exp.amount.toFixed(2), amtUSD.toFixed(2), payer?.label||exp.paidBy, exp.splitMode, `"${splits}"`]);
    });
    const csv  = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "europe-trip-2026-budget.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <Modal title="📤 Export Budget" onClose={onClose} wide>
      <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
        <div style={{ fontSize:13,color:T.textMid }}>Full breakdown of every expense — who paid, how it was split, and what each couple owes.</div>
        <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
          <button onClick={copyToClipboard} style={{ flex:1,padding:"12px 16px",borderRadius:T.radiusSm,border:"1px solid "+T.border,background:copied?"rgba(92,224,154,0.15)":"rgba(255,255,255,0.07)",color:copied?"#5ce09a":"#ccc",fontWeight:700,cursor:"pointer",fontSize:13,transition:"all 0.2s" }}>
            {copied ? "✓ Copied!" : "📋 Copy to Clipboard"}
          </button>
          <button onClick={downloadTxt} style={{ flex:1,padding:"12px 16px",borderRadius:T.radiusSm,border:"1px solid "+T.border,background:"rgba(255,255,255,0.07)",color:"#ccc",fontWeight:700,cursor:"pointer",fontSize:13 }}>
            ⬇️ Download .txt
          </button>
          <button onClick={downloadCSV} style={{ flex:1,padding:"12px 16px",borderRadius:T.radiusSm,border:"none",background:`linear-gradient(135deg,${T.accent},${T.accent2})`,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13 }}>
            📊 Download .csv
          </button>
        </div>
        <div style={{ background:"rgba(0,0,0,0.4)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:T.radiusSm,padding:16,maxHeight:380,overflowY:"auto" }}>
          <pre style={{ margin:0,fontSize:11,color:"#aaa",fontFamily:"monospace",lineHeight:1.7,whiteSpace:"pre-wrap",wordBreak:"break-word" }}>{report}</pre>
        </div>
      </div>
    </Modal>
  );
}

function BudgetTab({ budget, setBudget }) {
  const [modal,      setModal]      = useState(null);
  const [filterCity, setFilterCity] = useState("All");
  const [filterCat,  setFilterCat]  = useState("all");
  const [fx,         setFx]         = useState(DEFAULT_FX);
  const [editFx,     setEditFx]     = useState(false);
  const [fxDraft,    setFxDraft]    = useState({ EUR:String(DEFAULT_FX.EUR), GBP:String(DEFAULT_FX.GBP) });

  const expenses = budget.expenses || [];

  const saveExpense = exp => {
    setBudget(prev => {
      const idx = prev.expenses.findIndex(e => e.id === exp.id);
      return idx >= 0
        ? { ...prev, expenses: prev.expenses.map(e => e.id===exp.id ? exp : e) }
        : { ...prev, expenses: [...prev.expenses, exp] };
    });
    setModal(null);
  };
  const del = id => setBudget(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));

  const filtered  = expenses.filter(e => (filterCity==="All"||e.city===filterCity) && (filterCat==="all"||e.cat===filterCat));
  const totalUSD  = expenses.reduce((s,e) => s + toUSD(e.amount, e.currency, fx), 0);
  const byCity    = EXPENSE_CITIES.slice(1).map(c => ({ city:c, total:expenses.filter(e=>e.city===c).reduce((s,e)=>s+toUSD(e.amount,e.currency,fx),0) })).filter(x => x.total > 0);
  const byCat     = EXPENSE_CATEGORIES.map(c => ({ ...c, total:expenses.filter(e=>e.cat===c.value).reduce((s,e)=>s+toUSD(e.amount,e.currency,fx),0) })).filter(x => x.total > 0);

  const saveFx = () => {
    setFx({ USD:1, EUR:parseFloat(fxDraft.EUR)||DEFAULT_FX.EUR, GBP:parseFloat(fxDraft.GBP)||DEFAULT_FX.GBP });
    setEditFx(false);
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10 }}>
        <div>
          <div style={{ fontSize:22,fontWeight:800,color:T.text }}>💰 Group Budget</div>
          <div style={{ fontSize:13,color:T.textMid,marginTop:2 }}>Track shared expenses · all totals in USD</div>
        </div>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
          <button onClick={() => setEditFx(p => !p)} style={{ background:"rgba(255,255,255,0.06)",border:"1px solid "+T.border,borderRadius:T.radiusSm,padding:"9px 14px",color:T.textMid,cursor:"pointer",fontSize:12,fontWeight:600 }}>
            💱 FX {editFx?"▲":"▼"}
          </button>
          {expenses.length > 0 && (
            <button onClick={() => setModal({type:"export"})} style={{ background:"rgba(255,255,255,0.07)",border:"1px solid "+T.border,borderRadius:T.radiusSm,padding:"9px 16px",color:"#ccc",cursor:"pointer",fontSize:13,fontWeight:600 }}>
              📤 Export
            </button>
          )}
          <Btn primary onClick={() => setModal({type:"add"})}>+ Add Expense</Btn>
        </div>
      </div>

      {editFx && (
        <div style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(124,58,237,0.25)",borderRadius:T.radius,padding:"16px 20px" }}>
          <div style={{ fontSize:11,fontWeight:700,color:T.textDim,textTransform:"uppercase",letterSpacing:1.5,marginBottom:12 }}>Exchange Rates → USD</div>
          <div style={{ display:"flex",gap:14,flexWrap:"wrap",alignItems:"flex-end" }}>
            <div>
              <div style={{ fontSize:11,color:T.textDim,marginBottom:6 }}>1 USD</div>
              <div style={{ background:"rgba(255,255,255,0.04)",border:"1px solid "+T.border,borderRadius:T.radiusSm,padding:"10px 14px",color:T.textDim,fontSize:14,minWidth:110 }}>= 1.0000 (base)</div>
            </div>
            {["EUR","GBP"].map(cur => (
              <div key={cur}>
                <div style={{ fontSize:11,color:T.textDim,marginBottom:6 }}>1 {cur} = ? USD</div>
                <input type="number" step="0.001" value={fxDraft[cur]} onChange={e => setFxDraft(p => ({...p,[cur]:e.target.value}))} style={{ ...inputStyle, width:110 }}/>
              </div>
            ))}
            <Btn primary onClick={saveFx}>Apply</Btn>
          </div>
          <div style={{ marginTop:10,fontSize:11,color:T.textDim }}>Active: 1 EUR = ${fx.EUR.toFixed(4)} · 1 GBP = ${fx.GBP.toFixed(4)}</div>
        </div>
      )}

      {expenses.length > 0 && (
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12 }}>
          <div style={{ background:"rgba(124,58,237,0.12)",border:"1px solid rgba(124,58,237,0.25)",borderRadius:T.radius,padding:"16px 18px" }}>
            <div style={{ fontSize:10,color:T.textDim,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:6 }}>Total (USD)</div>
            <div style={{ fontSize:26,fontWeight:800,color:"#fff" }}>${totalUSD.toFixed(2)}</div>
            <div style={{ fontSize:12,color:T.textMid,marginTop:2 }}>{expenses.length} expense{expenses.length!==1?"s":""}</div>
          </div>
          {byCity.map(x => (
            <div key={x.city} style={{ background:T.bgCard,border:"1px solid "+T.border,borderRadius:T.radius,padding:"16px 18px" }}>
              <div style={{ fontSize:10,color:T.textDim,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:6 }}>{x.city}</div>
              <div style={{ fontSize:22,fontWeight:700,color:T.text }}>${x.total.toFixed(2)}</div>
              <div style={{ fontSize:11,color:T.textDim,marginTop:4 }}>{Math.round(x.total/totalUSD*100)}%</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
        {EXPENSE_CITIES.map(c => (
          <button key={c} onClick={() => setFilterCity(c)} style={{ padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600, border:"1px solid "+(filterCity===c?T.accent:T.border), background:filterCity===c?"rgba(124,58,237,0.2)":T.bgCard, color:filterCity===c?"#fff":T.textMid }}>{c}</button>
        ))}
        <div style={{ width:1,background:T.border,margin:"0 2px" }}/>
        <button onClick={() => setFilterCat("all")} style={{ padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600, border:"1px solid "+(filterCat==="all"?T.accent:T.border), background:filterCat==="all"?"rgba(124,58,237,0.2)":T.bgCard, color:filterCat==="all"?"#fff":T.textMid }}>All</button>
        {byCat.map(c => (
          <button key={c.value} onClick={() => setFilterCat(c.value)} style={{ padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600, border:"1px solid "+(filterCat===c.value?T.accent:T.border), background:filterCat===c.value?"rgba(124,58,237,0.2)":T.bgCard, color:filterCat===c.value?"#fff":T.textMid }}>{c.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign:"center",padding:"48px 24px",color:T.textDim }}>
          <div style={{ fontSize:36,marginBottom:12 }}>💸</div>
          <div style={{ fontSize:15,fontWeight:600,color:T.textMid,marginBottom:6 }}>No expenses yet</div>
          <div style={{ fontSize:13 }}>Add your first group expense to get started</div>
        </div>
      ) : (
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {filtered.sort((a,b) => new Date(b.date)-new Date(a.date)).map(exp => {
            const cat     = EXPENSE_CATEGORIES.find(c => c.value === exp.cat);
            const payer   = coupleOf(exp.paidBy);
            const amtUSD  = toUSD(exp.amount, exp.currency, fx);
            const splitLabels = [...new Set(exp.splitWith.map(coupleLabel))].join(", ");
            let shareChips = null;
            if (exp.splitMode === "even" && exp.splitWith.length > 0) {
              const pp = amtUSD / exp.splitWith.length;
              const cs = {};
              exp.splitWith.forEach(n => { const c = coupleOf(n); if (c) cs[c.id] = (cs[c.id]||0) + pp; });
              shareChips = (
                <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginTop:6 }}>
                  {Object.entries(cs).map(([cid,s]) => {
                    const couple = COUPLES.find(c => c.id === cid);
                    return <span key={cid} style={{ fontSize:11,background:couple.color+"1a",border:"1px solid "+couple.color+"44",borderRadius:20,padding:"2px 9px",color:couple.color,fontWeight:600 }}>{couple.label}: ${s.toFixed(2)}</span>;
                  })}
                </div>
              );
            }
            return (
              <div key={exp.id} style={{ background:T.bgCard,border:"1px solid "+T.border,borderRadius:T.radius,padding:"14px 18px" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap" }}>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:5 }}>
                      <span style={{ fontSize:15,fontWeight:700,color:T.text }}>{exp.desc}</span>
                      <span style={{ fontSize:11,background:"rgba(255,255,255,0.06)",border:"1px solid "+T.border,borderRadius:20,padding:"2px 8px",color:T.textMid }}>{cat?.label||exp.cat}</span>
                      {exp.city !== "All" && <span style={{ fontSize:11,background:"rgba(255,255,255,0.06)",border:"1px solid "+T.border,borderRadius:20,padding:"2px 8px",color:T.textMid }}>{exp.city}</span>}
                    </div>
                    <div style={{ fontSize:13,color:T.textMid }}>
                      Paid by <span style={{ color:payer?.color||"#fff",fontWeight:700 }}>{payer?.label||exp.paidBy}</span>
                      <span style={{ color:T.textDim }}> · </span>
                      Split {exp.splitMode==="even"?"evenly":"custom"}: {splitLabels}
                    </div>
                    {shareChips}
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:20,fontWeight:800,color:T.text }}>{exp.currency} {exp.amount.toFixed(2)}</div>
                      {exp.currency !== "USD" && <div style={{ fontSize:11,color:T.textDim }}>${amtUSD.toFixed(2)} USD</div>}
                    </div>
                    <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                      <Btn small onClick={() => setModal({type:"edit",expense:exp})}>✏️</Btn>
                      <Btn small danger onClick={() => del(exp.id)}>✕</Btn>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal?.type==="add"    && <ExpenseEditor onClose={() => setModal(null)} onSave={saveExpense}/>}
      {modal?.type==="edit"   && <ExpenseEditor expense={modal.expense} onClose={() => setModal(null)} onSave={saveExpense}/>}
      {modal?.type==="export" && <ExportModal budget={budget} fx={fx} onClose={() => setModal(null)}/>}
    </div>
  );
}

const DEFAULT_NOTES = { pins:[], messages:[] };

function NotesTab({ notes, setNotes }) {
  const [msgText,     setMsgText]     = useState("");
  const [sender,      setSender]      = useState("Carmen");
  const [pinText,     setPinText]     = useState("");
  const [pinEmoji,    setPinEmoji]    = useState("📌");
  const [showPinForm, setShowPinForm] = useState(false);
  const chatEndRef = useRef(null);
  const pinEmojis  = ["📌","📢","⚠️","✅","💡","🗓️","🔗","📋","🎉","❤️"];

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [notes.messages]);

  const addPin = () => {
    if (!pinText.trim()) return;
    setNotes(prev => ({ ...prev, pins:[{ id:uid(), text:pinText.trim(), emoji:pinEmoji, author:sender, date:new Date().toISOString() }, ...prev.pins] }));
    setPinText(""); setShowPinForm(false);
  };
  const delPin = id => setNotes(prev => ({ ...prev, pins: prev.pins.filter(p => p.id !== id) }));
  const sendMsg = () => {
    if (!msgText.trim()) return;
    setNotes(prev => ({ ...prev, messages:[...prev.messages, { id:uid(), text:msgText.trim(), sender, date:new Date().toISOString() }] }));
    setMsgText("");
  };
  const delMsg = id => setNotes(prev => ({ ...prev, messages: prev.messages.filter(m => m.id !== id) }));
  const fmt = iso => { const d = new Date(iso); return d.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" "+d.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}); };

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:24 }}>
      <div>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
          <div>
            <div style={{ fontSize:18,fontWeight:800,color:T.text }}>📌 Group Pinboard</div>
            <div style={{ fontSize:12,color:T.textMid,marginTop:1 }}>Important notes & reminders for everyone</div>
          </div>
          <Btn onClick={() => setShowPinForm(p => !p)}>{showPinForm ? "Cancel" : "+ Pin a Note"}</Btn>
        </div>
        {showPinForm && (
          <div style={{ background:"rgba(124,58,237,0.08)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:T.radius,padding:16,marginBottom:14 }}>
            <div style={{ display:"flex",gap:8,marginBottom:10,flexWrap:"wrap" }}>
              {pinEmojis.map(e => <button key={e} onClick={() => setPinEmoji(e)} style={{ width:34,height:34,borderRadius:8,cursor:"pointer",fontSize:18, border:"1px solid "+(pinEmoji===e?"rgba(124,58,237,0.7)":T.border), background:pinEmoji===e?"rgba(124,58,237,0.2)":T.bgCard }}>{e}</button>)}
            </div>
            <textarea value={pinText} onChange={e => setPinText(e.target.value)} placeholder="Write a note..." rows={3} style={{ ...inputStyle, resize:"vertical", marginBottom:10 }}/>
            <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
              <span style={{ fontSize:12,color:T.textDim }}>Posting as:</span>
              {TRAVELERS.map(t => <button key={t} onClick={() => setSender(t)} style={{ padding:"4px 10px",borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:600, border:"1px solid "+(sender===t?TRAVELER_COLORS[t]:T.border), background:sender===t?TRAVELER_COLORS[t]+"33":T.bgCard, color:sender===t?"#fff":T.textMid }}>{t}</button>)}
              <div style={{ flex:1 }}/>
              <Btn primary onClick={addPin}>📌 Pin It</Btn>
            </div>
          </div>
        )}
        {notes.pins.length === 0 && !showPinForm ? (
          <div style={{ textAlign:"center",padding:"28px",color:T.textDim,background:T.bgCard,border:"1px dashed "+T.border,borderRadius:T.radius }}>No pinned notes yet</div>
        ) : (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10 }}>
            {notes.pins.map(pin => (
              <div key={pin.id} style={{ background:"rgba(255,215,0,0.05)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:T.radius,padding:"14px 16px",position:"relative" }}>
                <button onClick={() => delPin(pin.id)} style={{ position:"absolute",top:8,right:8,background:"none",border:"none",color:T.textDim,cursor:"pointer",fontSize:14 }}>✕</button>
                <div style={{ fontSize:22,marginBottom:8 }}>{pin.emoji}</div>
                <div style={{ fontSize:13.5,color:T.text,lineHeight:1.55,marginBottom:8,paddingRight:20 }}>{pin.text}</div>
                <div style={{ fontSize:11,color:T.textDim,display:"flex",alignItems:"center",gap:6 }}>
                  <span style={{ width:7,height:7,borderRadius:"50%",background:TRAVELER_COLORS[pin.author],display:"inline-block" }}/>
                  {pin.author} · {fmt(pin.date)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height:1,background:T.border }}/>

      <div>
        <div style={{ fontSize:18,fontWeight:800,color:T.text,marginBottom:4 }}>💬 Group Chat</div>
        <div style={{ fontSize:12,color:T.textMid,marginBottom:14 }}>Chat with your travel crew</div>
        <div style={{ background:T.bgCard,border:"1px solid "+T.border,borderRadius:T.radius,padding:16,marginBottom:14,maxHeight:400,overflowY:"auto" }}>
          {notes.messages.length === 0 ? (
            <div style={{ textAlign:"center",padding:"32px",color:T.textDim }}>
              <div style={{ fontSize:28,marginBottom:8 }}>💬</div>
              <div>No messages yet — say hello!</div>
            </div>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {notes.messages.map((msg,i) => {
                const prev     = notes.messages[i-1];
                const showName = !prev || prev.sender !== msg.sender;
                return (
                  <div key={msg.id} style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                    {showName
                      ? <div style={{ width:30,height:30,borderRadius:"50%",background:TRAVELER_COLORS[msg.sender],flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#000" }}>{msg.sender[0]}</div>
                      : <div style={{ width:30,flexShrink:0 }}/>
                    }
                    <div style={{ flex:1 }}>
                      {showName && <div style={{ fontSize:11,fontWeight:700,color:TRAVELER_COLORS[msg.sender],marginBottom:3 }}>{msg.sender}</div>}
                      <div style={{ background:"rgba(255,255,255,0.06)",border:"1px solid "+T.border,borderRadius:"4px 12px 12px 12px",padding:"8px 12px",display:"inline-block",maxWidth:"90%" }}>
                        <span style={{ fontSize:13.5,color:T.text,lineHeight:1.5 }}>{msg.text}</span>
                      </div>
                      <div style={{ fontSize:10,color:T.textDim,marginTop:3 }}>{fmt(msg.date)}</div>
                    </div>
                    <button onClick={() => delMsg(msg.id)} style={{ background:"none",border:"none",color:T.textDim,cursor:"pointer",fontSize:12,padding:"4px",flexShrink:0,opacity:0.4 }}>✕</button>
                  </div>
                );
              })}
              <div ref={chatEndRef}/>
            </div>
          )}
        </div>
        <div style={{ background:T.bgCard,border:"1px solid "+T.border,borderRadius:T.radius,padding:14 }}>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:10,alignItems:"center" }}>
            <span style={{ fontSize:12,color:T.textDim }}>Sending as:</span>
            {TRAVELERS.map(t => <button key={t} onClick={() => setSender(t)} style={{ padding:"4px 10px",borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:600, border:"1px solid "+(sender===t?TRAVELER_COLORS[t]:T.border), background:sender===t?TRAVELER_COLORS[t]+"33":T.bgCard, color:sender===t?"#fff":T.textMid }}>{t}</button>)}
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <input value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key==="Enter" && !e.shiftKey && (sendMsg(), e.preventDefault())} placeholder={`Message as ${sender}…`} style={{ ...inputStyle, flex:1 }}/>
            <button onClick={sendMsg} disabled={!msgText.trim()} style={{ background:`linear-gradient(135deg,${T.accent},${T.accent2})`,border:"none",borderRadius:T.radiusSm,padding:"0 20px",color:"#fff",fontWeight:700,cursor:msgText.trim()?"pointer":"not-allowed",fontSize:13,opacity:msgText.trim()?1:0.5 }}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

function PasswordGate({ onUnlock }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const submit = () => {
    if (isPasswordCorrect(pw.trim())) {
      setSessionPassword(pw.trim());
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(6px)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"#0f1420",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:32,width:"100%",maxWidth:420,boxShadow:"0 24px 80px rgba(0,0,0,0.7)",textAlign:"center" }}>
        <div style={{ fontSize:40,marginBottom:12 }}>🔒</div>
        <div style={{ fontWeight:700,fontSize:18,color:"#f0f0f4",marginBottom:6,fontFamily:"'DM Sans',sans-serif" }}>Edit Access Required</div>
        <div style={{ fontSize:13,color:"rgba(255,255,255,0.5)",marginBottom:24,lineHeight:1.5 }}>
          Enter the group password to make changes.<br/>You can still view everything without it.
        </div>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="Group password…"
          autoFocus
          style={{ width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid "+(error?"#f87171":"rgba(255,255,255,0.1)"),borderRadius:10,padding:"12px 16px",color:"#f0f0f4",fontSize:15,outline:"none",boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif",marginBottom:12,transition:"border-color 0.2s" }}
        />
        {error && <div style={{ color:"#f87171",fontSize:12,marginBottom:12,fontWeight:600 }}>Incorrect password — try again</div>}
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={() => onUnlock()} style={{ flex:1,padding:"11px 0",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.6)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>View Only</button>
          <button onClick={submit} style={{ flex:1,padding:"11px 0",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c3aed,#6d28d9)",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Unlock Editing</button>
        </div>
      </div>
    </div>
  );
}

function RateLimitToast({ waitSec, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div style={{ position:"fixed",top:24,left:"50%",transform:"translateX(-50%)",zIndex:400,background:"#1e1030",border:"1px solid rgba(248,113,113,0.3)",borderRadius:12,padding:"12px 24px",color:"#f87171",fontSize:13,fontWeight:600,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",fontFamily:"'DM Sans',sans-serif" }}>
      ⏱️ Too many edits — please wait {waitSec}s before saving again
    </div>
  );
}

export default function App() {
  const [cities,       setCities]      = useState(DEFAULT_CITIES);
  const [budget,       setBudgetState] = useState(DEFAULT_BUDGET);
  const [notes,        setNotesState]  = useState(DEFAULT_NOTES);
  const [loading,      setLoading]     = useState(true);
  const [saving,       setSaving]      = useState(false);
  const [activeCity,   setActiveCity]  = useState("dublin");
  const [activeTab,    setActiveTab]   = useState("itinerary");
  const [expandedDays, setExpanded]    = useState({});
  const [modal,        setModal]       = useState(null);
  const [showPwGate,   setShowPwGate]  = useState(true);
  const [writeMode,    setWriteMode]   = useState(false);
  const [rlToast,      setRlToast]     = useState(null);

  // ── Load initial data from Supabase ────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [r1, r2, r3] = await Promise.all([
          storage.get(STORAGE_KEY),
          storage.get(BUDGET_KEY),
          storage.get(NOTES_KEY),
        ]);
        if (r1?.value) setCities(JSON.parse(r1.value));
        if (r2?.value) setBudgetState(JSON.parse(r2.value));
        if (r3?.value) setNotesState(JSON.parse(r3.value));
      } catch (e) {
        console.error("Load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Realtime subscriptions ──────────────────────────────────────────────────
  useEffect(() => {
    const unsubCities = storage.subscribe(STORAGE_KEY, (val) => {
      try { setCities(JSON.parse(val)); } catch(e) {}
    });
    const unsubBudget = storage.subscribe(BUDGET_KEY, (val) => {
      try { setBudgetState(JSON.parse(val)); } catch(e) {}
    });
    const unsubNotes = storage.subscribe(NOTES_KEY, (val) => {
      try { setNotesState(JSON.parse(val)); } catch(e) {}
    });
    return () => { unsubCities(); unsubBudget(); unsubNotes(); };
  }, []);

  // ── Persist helpers ─────────────────────────────────────────────────────────
  const handleWriteResult = useCallback((result) => {
    if (result?.error === 'RATE_LIMITED') {
      setRlToast(result.waitSec);
    } else if (result?.error === 'PASSWORD_REQUIRED') {
      setShowPwGate(true);
    }
  }, []);

  const saveCities = useCallback(async (data) => {
    if (!isWriteUnlocked()) { setShowPwGate(true); return; }
    setSaving(true);
    try {
      const result = await storage.set(STORAGE_KEY, JSON.stringify(data));
      handleWriteResult(result);
    } catch(e) {}
    setSaving(false);
  }, [handleWriteResult]);

  const setBudget = useCallback((updater) => {
    if (!isWriteUnlocked()) { setShowPwGate(true); return; }
    setBudgetState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      storage.set(BUDGET_KEY, JSON.stringify(next)).then(handleWriteResult).catch(() => {});
      return next;
    });
  }, [handleWriteResult]);

  const setNotes = useCallback((updater) => {
    if (!isWriteUnlocked()) { setShowPwGate(true); return; }
    setNotesState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      storage.set(NOTES_KEY, JSON.stringify(next)).then(handleWriteResult).catch(() => {});
      return next;
    });
  }, [handleWriteResult]);

  // ── Itinerary mutations ─────────────────────────────────────────────────────
  const update    = useCallback((next) => { setCities(next); saveCities(next); }, [saveCities]);
  const mutItems  = (cid,did,fn) => update(cities.map(c => c.id!==cid ? c : { ...c, days:c.days.map(d => d.id!==did ? d : { ...d, items:fn(d.items) }) }));
  const mutDays   = (cid,fn)     => update(cities.map(c => c.id!==cid ? c : { ...c, days:fn(c.days) }));
  const addItem   = (cid,did,data) => { mutItems(cid,did,it=>[...it,{id:uid(),...data}]); setModal(null); };
  const editItem  = (cid,did,id,data) => { mutItems(cid,did,it=>it.map(i=>i.id===id?{...i,...data}:i)); setModal(null); };
  const deleteItem  = (cid,did,id)    => mutItems(cid,did,it=>it.filter(i=>i.id!==id));
  const moveItem    = (cid,did,id,dir)=> mutItems(cid,did,it=>{ const a=[...it],i=a.findIndex(x=>x.id===id),j=i+dir; if(j<0||j>=a.length)return a; [a[i],a[j]]=[a[j],a[i]]; return a; });
  const addDay    = (cid,data)     => { mutDays(cid,ds=>[...ds,{id:uid(),items:[],...data}]); setModal(null); };
  const editDay   = (cid,did,data) => { mutDays(cid,ds=>ds.map(d=>d.id===did?{...d,...data}:d)); setModal(null); };
  const deleteDay = (cid,did)      => mutDays(cid,ds=>ds.filter(d=>d.id!==did));
  const moveDay   = (cid,did,dir)  => mutDays(cid,ds=>{ const a=[...ds],i=a.findIndex(x=>x.id===did),j=i+dir; if(j<0||j>=a.length)return a; [a[i],a[j]]=[a[j],a[i]]; return a; });

  const city      = cities.find(c => c.id === activeCity);
  const toggleDay = id => setExpanded(p => ({ ...p, [id]: p[id]===false ? true : false }));

  if (loading) return (
    <div style={{ minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:T.font }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:36,marginBottom:12 }}>✈️</div>
        <div style={{ color:T.textMid }}>Loading your adventure…</div>
      </div>
    </div>
  );

  const TABS = [
    ["itinerary","🗺️","Itinerary"],
    ["map",      "📍","Map"],
    ["flights",  "✈️","Flights"],
    ["trains",   "🚄","Trains"],
    ["budget",   "💰","Budget"],
    ["notes",    "💬","Notes"],
  ];

  return (
    <div style={{ minHeight:"100vh",background:T.bg,color:T.text,fontFamily:T.font }}>
      {/* Password gate */}
      {showPwGate && <PasswordGate onUnlock={() => { setShowPwGate(false); setWriteMode(isWriteUnlocked()); }} />}
      {/* Rate-limit toast */}
      {rlToast !== null && <RateLimitToast waitSec={rlToast} onDismiss={() => setRlToast(null)} />}
      {/* Hero */}
      <div style={{ background:"linear-gradient(160deg,#0a0f1e 0%,#130824 50%,#0a1a14 100%)",borderBottom:"1px solid rgba(255,255,255,0.07)",padding:"36px 24px 28px",position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",top:-60,right:-40,width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,58,237,0.12) 0%,transparent 70%)",pointerEvents:"none" }}/>
        <div style={{ maxWidth:960,margin:"0 auto",position:"relative" }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
            <div style={{ fontSize:10,fontWeight:800,letterSpacing:3,color:T.textDim,textTransform:"uppercase" }}>Europe Summer 2026</div>
            {saving && <div style={{ fontSize:11,color:T.accent,background:"rgba(124,58,237,0.12)",border:"1px solid rgba(124,58,237,0.25)",borderRadius:20,padding:"2px 10px" }}>Syncing…</div>}
            {!writeMode && <button onClick={() => setShowPwGate(true)} style={{ fontSize:11,color:"#fbbf24",background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.25)",borderRadius:20,padding:"2px 10px",cursor:"pointer",fontFamily:T.font,fontWeight:600 }}>🔒 View Only — tap to unlock editing</button>}
            {writeMode && <div style={{ fontSize:11,color:"#34d399",background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.25)",borderRadius:20,padding:"2px 10px" }}>🔓 Edit Mode</div>}
          </div>
          <h1 style={{ fontSize:"clamp(24px,4vw,42px)",fontWeight:900,margin:"0 0 6px",letterSpacing:"-0.5px",background:"linear-gradient(100deg,#fff 30%,rgba(200,180,255,0.8) 70%,rgba(100,180,255,0.7) 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
            The Grand European Adventure
          </h1>
          <div style={{ fontSize:13,color:T.textMid,marginBottom:18 }}>Aug 26 – Sep 10, 2026 · 7 Travelers · 4 Cities</div>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:16 }}>
            {cities.map(c => <div key={c.id} style={{ background:c.color+"20",border:"1px solid "+c.border,borderRadius:20,padding:"5px 14px",fontSize:13,fontWeight:600 }}>{c.emoji} {c.name}</div>)}
          </div>
          <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
            {TRAVELERS.map(t => (
              <div key={t} style={{ display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:"4px 12px" }}>
                <div style={{ width:8,height:8,borderRadius:"50%",background:TRAVELER_COLORS[t] }}/>
                <span style={{ fontSize:12,fontWeight:500 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ maxWidth:960,margin:"0 auto",padding:"14px 24px 0" }}>
        <div style={{ display:"flex",gap:2,background:"rgba(255,255,255,0.04)",border:"1px solid "+T.border,borderRadius:T.radius,padding:4,overflowX:"auto" }}>
          {TABS.map(([tab,emoji,label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex:"1 1 auto",padding:"9px 6px",borderRadius:T.radiusSm,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,whiteSpace:"nowrap",transition:"all 0.15s", background:activeTab===tab?"rgba(255,255,255,0.11)":"transparent", color:activeTab===tab?"#fff":T.textDim }}>{emoji} {label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:960,margin:"0 auto",padding:"18px 24px 80px" }}>

        {activeTab==="itinerary" && (
          <div>
            <div style={{ display:"flex",gap:8,marginBottom:18,flexWrap:"wrap" }}>
              {cities.map(c => (
                <button key={c.id} onClick={() => setActiveCity(c.id)} style={{ padding:"9px 18px",borderRadius:T.radiusSm,cursor:"pointer",fontSize:13,fontWeight:600,transition:"all 0.15s", border:"1px solid "+(activeCity===c.id?c.color:T.border), background:activeCity===c.id?c.color+"2a":T.bgCard, color:activeCity===c.id?"#fff":T.textMid }}>{c.emoji} {c.name}</button>
              ))}
            </div>
            {city && (
              <div style={{ background:"linear-gradient(135deg,"+city.color+"1a,"+city.color+"08)",border:"1px solid "+city.border,borderRadius:T.radius,padding:"16px 20px",marginBottom:16 }}>
                <div style={{ fontSize:20,fontWeight:800,marginBottom:3 }}>{city.emoji} {city.name}</div>
                <div style={{ fontSize:13,color:T.textMid }}>{city.dates} · 👥 {city.who}</div>
              </div>
            )}
            {city?.days.map((day,di) => (
              <DayCard key={day.id} day={day} di={di} totalDays={city.days.length}
                expanded={expandedDays[day.id] !== false}
                onToggle={() => toggleDay(day.id)}
                onMoveUp={() => moveDay(city.id, day.id, -1)}
                onMoveDown={() => moveDay(city.id, day.id, 1)}
                onEdit={() => setModal({ type:"editDay", cityId:city.id, day })}
                onDelete={() => deleteDay(city.id, day.id)}
                onAddItem={() => setModal({ type:"addItem", cityId:city.id, dayId:day.id })}
                onEditItem={item => setModal({ type:"editItem", cityId:city.id, dayId:day.id, item })}
                onDeleteItem={id => deleteItem(city.id, day.id, id)}
                onMoveItemUp={id => moveItem(city.id, day.id, id, -1)}
                onMoveItemDown={id => moveItem(city.id, day.id, id, 1)}
              />
            ))}
            <button onClick={() => setModal({ type:"addDay", cityId:city?.id })} style={{ width:"100%",padding:"12px",borderRadius:T.radius,border:"1px dashed rgba(255,255,255,0.12)",background:"transparent",color:T.textDim,fontSize:14,cursor:"pointer",marginTop:4 }}>
              + Add day to {city?.name}
            </button>
          </div>
        )}

        {activeTab==="map" && <TripMap cities={cities}/>}

        {activeTab==="flights" && (
          <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
            {["outbound","return"].map(dir => (
              <div key={dir}>
                <div style={{ fontSize:11,fontWeight:700,letterSpacing:2,color:T.textDim,textTransform:"uppercase",marginBottom:10 }}>{dir} Flights</div>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {FLIGHT_DATA[dir].map((f,i) => (
                    <div key={i} style={{ background:T.bgCard,border:"1px solid "+T.border,borderRadius:T.radius,padding:"16px 18px" }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8 }}>
                        <div>
                          <div style={{ fontSize:20,fontWeight:800,marginBottom:4 }}>{f.route}</div>
                          <div style={{ fontSize:13,color:T.textMid }}>{f.date} · {f.time}</div>
                          <div style={{ fontSize:12,color:T.textDim,marginTop:3 }}>{f.note}</div>
                        </div>
                        <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
                          {f.travelers.map(t => (
                            <span key={t} style={{ background:(TRAVELER_COLORS[t]||"#888")+"33",border:"1px solid "+(TRAVELER_COLORS[t]||"#888")+"55",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:600 }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ background:T.bgCard,border:"1px solid "+T.border,borderRadius:T.radius,padding:22 }}>
              <div style={{ fontSize:13,fontWeight:700,color:T.textMid,marginBottom:12 }}>✈️ Track a Flight on FlightAware</div>
              <div style={{ display:"flex",gap:10 }}>
                <input id="flt" placeholder="e.g. AA728" style={{ ...inputStyle, flex:1 }}
                  onKeyDown={e => e.key==="Enter" && window.open("https://www.flightaware.com/live/flight/"+e.target.value.trim().toUpperCase().replace(/\s/g,""), "_blank")}/>
                <button onClick={() => { const v=document.getElementById("flt").value.trim().toUpperCase().replace(/\s/g,""); if(v) window.open("https://www.flightaware.com/live/flight/"+v,"_blank"); }}
                  style={{ background:`linear-gradient(135deg,${T.accent},${T.accent2})`,border:"none",borderRadius:T.radiusSm,padding:"0 20px",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13 }}>Track ↗</button>
              </div>
            </div>
          </div>
        )}

        {activeTab==="trains" && (
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {cities.filter(c => c.trains).flatMap(c =>
              c.trains.map((t,i) => (
                <div key={c.id+i} style={{ background:c.color+"12",border:"1px solid "+c.border,borderRadius:T.radius,padding:"16px 20px" }}>
                  <div style={{ fontSize:16,fontWeight:700 }}>{t.icon} {t.label}</div>
                  <div style={{ fontSize:13,color:T.textMid,marginTop:6,lineHeight:1.6 }}>{t.detail}</div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab==="budget" && <BudgetTab budget={budget} setBudget={setBudget}/>}
        {activeTab==="notes"  && <NotesTab  notes={notes}   setNotes={setNotes}/>}
      </div>

      {/* Modals */}
      {modal?.type==="addItem"  && <ItemEditor onClose={() => setModal(null)} onSave={d => addItem(modal.cityId, modal.dayId, d)}/>}
      {modal?.type==="editItem" && <ItemEditor item={modal.item} onClose={() => setModal(null)} onSave={d => editItem(modal.cityId, modal.dayId, modal.item.id, d)}/>}
      {modal?.type==="addDay"   && <DayEditor  onClose={() => setModal(null)} onSave={d => addDay(modal.cityId, d)}/>}
      {modal?.type==="editDay"  && <DayEditor  day={modal.day} onClose={() => setModal(null)} onSave={d => editDay(modal.cityId, modal.day.id, d)}/>}
    </div>
  );
}
