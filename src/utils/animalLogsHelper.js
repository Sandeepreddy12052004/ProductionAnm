import { api } from './api';

// Date parsing and formatting helpers
export const parseDateSafe = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  const valStr = String(dateVal).trim();
  if (valStr.includes('/')) {
    const parts = valStr.split('/');
    if (parts.length === 3) {
      const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      if (!isNaN(d.getTime())) return d;
    }
  }
  const parsed = new Date(valStr);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
};

export const formatDateDDMMYYYY = (dateVal) => {
  const d = parseDateSafe(dateVal);
  if (!d) return '-';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export const normalizeTag = (tag) => {
  if (!tag) return '';
  return String(tag).trim().toUpperCase();
};

/**
 * Fetch and aggregate all log modules for a specific animal tag
 * @param {string} animalTag
 * @returns {Promise<{ profile: any, shedLogs: any[], crossingLogs: any[], treatmentLogs: any[], vaccinationLogs: any[], purchaseLogs: any[], saleLogs: any[] }>}
 */
export async function fetchAnimalLogsByTag(animalTag) {
  const targetTag = normalizeTag(animalTag);
  if (!targetTag) {
    return {
      profile: null,
      shedLogs: [],
      crossingLogs: [],
      treatmentLogs: [],
      vaccinationLogs: [],
      purchaseLogs: [],
      saleLogs: []
    };
  }

  try {
    const [
      cattleRes,
      shedRes,
      crossingRes,
      treatmentRes,
      vaccinationRes,
      purchaseRes,
      saleRes
    ] = await Promise.allSettled([
      api.cattle.getAll(),
      api.shed.getAll(),
      api.crossing.getAll(),
      api.health.treatments.getAll(),
      api.health.vaccinations.getAll(),
      api.purchase.getAll(),
      api.sale.getAll()
    ]);

    const extractArray = (result) => {
      if (result.status !== 'fulfilled' || !result.value) return [];
      const data = result.value;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.data)) return data.data;
      return [];
    };

    const cattleList = extractArray(cattleRes);
    const shedList = extractArray(shedRes);
    const crossingList = extractArray(crossingRes);
    const treatmentList = extractArray(treatmentRes);
    const vaccinationList = extractArray(vaccinationRes);
    const purchaseList = extractArray(purchaseRes);
    const saleList = extractArray(saleRes);

    // 1. Locate animal master profile
    const profile = cattleList.find(c => {
      const cTag = normalizeTag(c.tag || c.tagId || c.tag_id || c.code);
      return cTag === targetTag;
    }) || null;

    // 2. Filter matching logs for this animal
    const shedLogs = shedList.filter(l => normalizeTag(l.tag || l.tagId || l.tag_id) === targetTag);
    const crossingLogs = crossingList.filter(l => {
      const fTag = normalizeTag(l.femaleTag || l.tag || l.tagId || l.damTag);
      const bTag = normalizeTag(l.bullTag || l.sireTag);
      const cTag = normalizeTag(l.calfTag);
      return fTag === targetTag || bTag === targetTag || cTag === targetTag;
    });
    const treatmentLogs = treatmentList.filter(l => normalizeTag(l.tag || l.tagId || l.tag_id) === targetTag);
    const vaccinationLogs = vaccinationList.filter(l => normalizeTag(l.tag || l.tagId || l.tag_id) === targetTag);
    const purchaseLogs = purchaseList.filter(l => normalizeTag(l.tag || l.tagId || l.tag_id) === targetTag);
    const saleLogs = saleList.filter(l => normalizeTag(l.tag || l.tagId || l.tag_id) === targetTag);

    return {
      profile,
      shedLogs,
      crossingLogs,
      treatmentLogs,
      vaccinationLogs,
      purchaseLogs,
      saleLogs
    };
  } catch (error) {
    console.error(`[fetchAnimalLogsByTag] Error fetching logs for tag ${targetTag}:`, error);
    return {
      profile: null,
      shedLogs: [],
      crossingLogs: [],
      treatmentLogs: [],
      vaccinationLogs: [],
      purchaseLogs: [],
      saleLogs: []
    };
  }
}

/**
 * Build a chronological lifecycle timeline from heterogeneous log objects
 * @param {any} profile
 * @param {any} logsData
 * @returns {Array<{ id: string, type: string, date: Date | null, dateStr: string, title: string, subtitle: string, details: string, status?: string, badgeColor: string, icon: string, raw: any }>}
 */
export function buildAnimalLifecycleTimeline(profile, logsData) {
  const events = [];

  // 1. Birth Event (if available)
  if (profile && (profile.dob || profile.dateOfBirth)) {
    const birthDate = parseDateSafe(profile.dob || profile.dateOfBirth);
    events.push({
      id: `birth_${profile._id || profile.id || 'birth'}`,
      type: 'BIRTH',
      date: birthDate,
      dateStr: formatDateDDMMYYYY(profile.dob || profile.dateOfBirth),
      title: 'Animal Birth Registered',
      subtitle: `Breed: ${profile.breed || 'Unknown'} • Type: ${profile.cattleType || profile.animalType || 'Cow'}`,
      details: profile.damTag || profile.sireTag ? `Dam: ${profile.damTag || '-'} | Sire: ${profile.sireTag || '-'}` : 'Birth record',
      status: 'BORN',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: '👶',
      raw: profile
    });
  }

  // 2. Purchase Event
  (logsData.purchaseLogs || []).forEach((p, idx) => {
    const pDate = parseDateSafe(p.purchaseDate || p.entryDate || p.date || p.createdAt);
    events.push({
      id: `purchase_${p._id || p.id || idx}`,
      type: 'PURCHASE',
      date: pDate,
      dateStr: formatDateDDMMYYYY(p.purchaseDate || p.entryDate || p.date || p.createdAt),
      title: 'Purchased / Onboarded',
      subtitle: p.purchaseFrom ? `Source: ${p.purchaseFrom}` : 'Purchased into Farm',
      details: p.cost ? `Cost: ₹${p.cost} • Weight: ${p.weight || '-'} kg • Initial Shed: ${p.shed || '-'}` : (p.remarks || 'Purchase log entry'),
      status: 'PURCHASED',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: '📥',
      raw: p
    });
  });

  // 3. Shed Shifting Events
  (logsData.shedLogs || []).forEach((s, idx) => {
    const sDate = parseDateSafe(s.shiftingDate || s.entryDate || s.date || s.createdAt);
    events.push({
      id: `shed_${s._id || s.id || idx}`,
      type: 'SHED_MOVE',
      date: sDate,
      dateStr: formatDateDDMMYYYY(s.shiftingDate || s.entryDate || s.date || s.createdAt),
      title: `Moved from Shed ${s.oldShed || '-'} ➔ Shed ${s.newShed || '-'}`,
      subtitle: s.reason ? `Reason: ${s.reason}` : 'Shed reassignment',
      details: s.lineNo ? `Line: ${s.lineNo} • Position: ${s.position || '-'}` : 'Internal transfer',
      status: 'SHIFTED',
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
      icon: '🏠',
      raw: s
    });
  });

  // 4. Breeding & Insemination Events
  (logsData.crossingLogs || []).forEach((c, idx) => {
    const cDate = parseDateSafe(c.crossingDate || c.entryDate || c.date || c.createdAt);
    const pregStatus = String(c.pregnancyStatus || c['pregnancy status'] || 'Pending').toUpperCase();
    
    let statusBadge = 'bg-amber-50 text-amber-700 border-amber-200';
    if (pregStatus === 'POSITIVE') statusBadge = 'bg-purple-50 text-purple-700 border-purple-200';
    if (pregStatus === 'NEGATIVE') statusBadge = 'bg-rose-50 text-rose-700 border-rose-200';

    let title = 'Artificial Insemination / Crossing';
    if (c.calfTag) {
      title = `Calving Completed ➔ Calf Tag [${c.calfTag}]`;
    } else if (pregStatus === 'POSITIVE') {
      title = 'Pregnancy Confirmed (Positive)';
    }

    events.push({
      id: `crossing_${c._id || c.id || idx}`,
      type: 'BREEDING',
      date: cDate,
      dateStr: formatDateDDMMYYYY(c.crossingDate || c.entryDate || c.date || c.createdAt),
      title,
      subtitle: `Semen Straw: ${c.semenType || c.bullTag || 'Standard'} • Method: ${c.crossingType || 'A.I.'}`,
      details: [
        c.pregnancyCheckDate ? `PD Check: ${formatDateDDMMYYYY(c.pregnancyCheckDate)}` : null,
        c.expectedCalvingDate ? `Expected Calving: ${formatDateDDMMYYYY(c.expectedCalvingDate)}` : null,
        c.calfTag ? `Calf Born: ${c.calfTag} (${c.calfGender || 'Calf'})` : null
      ].filter(Boolean).join(' • ') || `Status: ${pregStatus}`,
      status: pregStatus,
      badgeColor: statusBadge,
      icon: '🧬',
      raw: c
    });
  });

  // 5. Treatment & Health Events
  (logsData.treatmentLogs || []).forEach((t, idx) => {
    const tDate = parseDateSafe(t.treatmentDate || t.entryDate || t.date || t.createdAt);
    events.push({
      id: `treatment_${t._id || t.id || idx}`,
      type: 'TREATMENT',
      date: tDate,
      dateStr: formatDateDDMMYYYY(t.treatmentDate || t.entryDate || t.date || t.createdAt),
      title: `Treatment: ${t.diagnosis || t.symptoms || 'Medical Checkup'}`,
      subtitle: t.symptoms ? `Symptoms: ${t.symptoms}` : 'Health intervention',
      details: [
        t.medicine ? `Medicine: ${t.medicine}` : null,
        t.dose ? `Dose: ${t.dose}` : null,
        t.treatedBy || t.doctorName ? `Doctor: ${t.treatedBy || t.doctorName}` : null,
        t.cost ? `Cost: ₹${t.cost}` : null
      ].filter(Boolean).join(' • ') || (t.remarks || 'Treatment administered'),
      status: t.status || 'TREATED',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: '🩺',
      raw: t
    });
  });

  // 6. Vaccination Events
  (logsData.vaccinationLogs || []).forEach((v, idx) => {
    const vDate = parseDateSafe(v.date || v.vaccinationDate || v.entryDate || v.createdAt);
    events.push({
      id: `vaccine_${v._id || v.id || idx}`,
      type: 'VACCINATION',
      date: vDate,
      dateStr: formatDateDDMMYYYY(v.date || v.vaccinationDate || v.entryDate || v.createdAt),
      title: `Vaccinated: ${v.vaccinationName || v.vaccineName || 'Routine Vaccine'}`,
      subtitle: v.batchNo ? `Batch No: ${v.batchNo}` : 'Preventive Care',
      details: [
        v.expiryDate ? `Exp: ${formatDateDDMMYYYY(v.expiryDate)}` : null,
        v.treatmentOrStatus ? `Status: ${v.treatmentOrStatus}` : null,
        v.remarks ? `Note: ${v.remarks}` : null
      ].filter(Boolean).join(' • ') || 'Vaccine administered',
      status: v.treatmentOrStatus || 'COMPLETED',
      badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
      icon: '💉',
      raw: v
    });
  });

  // 7. Sale Event
  (logsData.saleLogs || []).forEach((s, idx) => {
    const sDate = parseDateSafe(s.saleDate || s.entryDate || s.date || s.createdAt);
    events.push({
      id: `sale_${s._id || s.id || idx}`,
      type: 'SALE',
      date: sDate,
      dateStr: formatDateDDMMYYYY(s.saleDate || s.entryDate || s.date || s.createdAt),
      title: 'Animal Sold',
      subtitle: s.soldTo ? `Buyer: ${s.soldTo}` : 'Sold & Dispatched',
      details: [
        s.salePrice ? `Price: ₹${s.salePrice}` : null,
        s.reason ? `Reason: ${s.reason}` : null
      ].filter(Boolean).join(' • ') || 'Animal sold out of farm',
      status: 'SOLD',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
      icon: '📤',
      raw: s
    });
  });

  // Sort chronological descending (latest event first)
  events.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.getTime() - a.date.getTime();
  });

  return events;
}

/**
 * Group flat logs array into structured Animal buckets
 * @param {any[]} logs
 * @param {any[]} cattleList
 * @returns {Array<{ tag: string, animal: any, logs: any[], count: number, latestDate: string }>}
 */
export function groupLogsByAnimal(logs = [], cattleList = []) {
  if (!Array.isArray(logs) || logs.length === 0) return [];

  const map = new Map();

  logs.forEach(log => {
    const tag = normalizeTag(log.tag || log.tagId || log.tag_id || log.femaleTag || 'UNKNOWN');
    if (!map.has(tag)) {
      // Find animal profile metadata
      const animal = cattleList.find(c => normalizeTag(c.tag || c.tagId || c.tag_id || c.code) === tag) || null;
      map.set(tag, {
        tag,
        animal,
        logs: [],
        count: 0,
        latestDate: null
      });
    }

    const entry = map.get(tag);
    entry.logs.push(log);
    entry.count++;

    // Track latest date
    const logDate = parseDateSafe(log.entryDate || log.date || log.shiftingDate || log.treatmentDate || log.crossingDate || log.purchaseDate || log.saleDate || log.createdAt);
    if (logDate) {
      if (!entry.latestDate || logDate > entry.latestDate) {
        entry.latestDate = logDate;
      }
    }
  });

  // Convert to array and sort by log count descending or latest activity
  return Array.from(map.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (a.latestDate && b.latestDate) return b.latestDate.getTime() - a.latestDate.getTime();
    return a.tag.localeCompare(b.tag);
  });
}
