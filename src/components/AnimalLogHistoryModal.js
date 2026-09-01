import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Activity,
  Home,
  Dna,
  Stethoscope,
  Syringe,
  ShoppingBag,
  Clock,
  Plus,
  Printer,
  ChevronRight,
  Sparkles,
  Layers,
  Calendar,
  AlertCircle,
  Tag,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  fetchAnimalLogsByTag,
  buildAnimalLifecycleTimeline,
  formatDateDDMMYYYY
} from '../utils/animalLogsHelper';
import SkeletonLoader from './SkeletonLoader';

const TABS = [
  { id: 'timeline', label: 'Lifecycle Timeline', icon: Clock, color: 'text-indigo-600' },
  { id: 'shed', label: 'Shed Movements', icon: Home, color: 'text-sky-600' },
  { id: 'breeding', label: 'Breeding & Insemination', icon: Dna, color: 'text-purple-600' },
  { id: 'treatment', label: 'Treatments & Health', icon: Stethoscope, color: 'text-rose-600' },
  { id: 'vaccine', label: 'Vaccination History', icon: Syringe, color: 'text-teal-600' },
  { id: 'financial', label: 'Purchase & Sale', icon: ShoppingBag, color: 'text-amber-600' }
];

export default function AnimalLogHistoryModal({
  animalTag,
  initialAnimalProfile = null,
  isOpen,
  onClose,
  onQuickAddLog = null // Callback to open log form with prefilled tag
}) {
  const [activeTab, setActiveTab] = useState('timeline');
  const [isLoading, setIsLoading] = useState(true);
  const [animalData, setAnimalData] = useState({
    profile: initialAnimalProfile,
    shedLogs: [],
    crossingLogs: [],
    treatmentLogs: [],
    vaccinationLogs: [],
    purchaseLogs: [],
    saleLogs: []
  });
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [showQuickAddMenu, setShowQuickAddMenu] = useState(false);

  useEffect(() => {
    if (!isOpen || !animalTag) return;

    let isMounted = true;
    setIsLoading(true);

    fetchAnimalLogsByTag(animalTag)
      .then((data) => {
        if (!isMounted) return;
        const resolvedProfile = data.profile || initialAnimalProfile || { tag: animalTag };
        const combined = { ...data, profile: resolvedProfile };
        setAnimalData(combined);
        const timeline = buildAnimalLifecycleTimeline(resolvedProfile, combined);
        setTimelineEvents(timeline);
      })
      .catch((err) => {
        console.error('[AnimalLogHistoryModal] Error fetching animal history:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, animalTag, initialAnimalProfile]);

  const profile = animalData.profile || initialAnimalProfile || { tag: animalTag };
  const rawStatus = String(profile?.status || 'ACTIVE').toUpperCase();

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SOLD':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'DEAD':
      case 'DECEASED':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'PREGNANT':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'SICK':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  // Export Complete Animal Dossier to PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const primaryTag = profile.tag || profile.tagId || animalTag;

      // Header Banner
      doc.setFillColor(22, 34, 63); // #16223F
      doc.rect(0, 0, 210, 26, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`ANIMAL LIFECYCLE & LOG DOSSIER`, 14, 12);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Agasthya Nutro Milk • Generated on: ${new Date().toLocaleString()}`, 14, 19);

      // Animal Info Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 32, 182, 30, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 32, 182, 30, 3, 3, 'S');

      doc.setTextColor(22, 34, 63);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`TAG ID: ${primaryTag}`, 20, 40);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Animal Type: ${profile.cattleType || profile.animalType || 'Cow'}`, 20, 47);
      doc.text(`Breed: ${profile.breed || '-'}`, 20, 54);

      doc.text(`Current Shed: Shed ${profile.shed || profile.shedId || '-'}`, 80, 47);
      doc.text(`Status: ${rawStatus}`, 80, 54);

      doc.text(`DOB / Age: ${profile.dob ? formatDateDDMMYYYY(profile.dob) : (profile.age || '-')}`, 140, 47);
      doc.text(`Calvings: ${profile.calvings || 0}`, 140, 54);

      let currentY = 70;

      // 1. Lifecycle Events Table
      if (timelineEvents.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 34, 63);
        doc.text('Lifecycle Activity Timeline', 14, currentY);

        autoTable(doc, {
          startY: currentY + 3,
          head: [['Date', 'Event Type', 'Summary', 'Details / Status']],
          body: timelineEvents.map(e => [
            e.dateStr || '-',
            e.type,
            e.title,
            e.details || e.status || '-'
          ]),
          headStyles: { fillColor: [22, 34, 63], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          styles: { fontSize: 8, cellPadding: 2 },
          theme: 'grid'
        });

        currentY = (doc).lastAutoTable.finalY + 10;
      }

      // 2. Health & Treatment History
      if (animalData.treatmentLogs.length > 0 && currentY < 240) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 34, 63);
        doc.text('Medical & Treatment History', 14, currentY);

        autoTable(doc, {
          startY: currentY + 3,
          head: [['Date', 'Diagnosis / Symptom', 'Medicine & Dose', 'Treated By', 'Status']],
          body: animalData.treatmentLogs.map(t => [
            formatDateDDMMYYYY(t.treatmentDate || t.entryDate || t.date),
            t.diagnosis || t.symptoms || '-',
            `${t.medicine || '-'} ${t.dose ? '(' + t.dose + ')' : ''}`,
            t.treatedBy || t.doctorName || '-',
            t.status || 'Treated'
          ]),
          headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          styles: { fontSize: 8, cellPadding: 2 },
          theme: 'grid'
        });

        currentY = (doc).lastAutoTable.finalY + 10;
      }

      // Save PDF
      doc.save(`Animal_Dossier_${primaryTag}_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl h-[92vh] max-h-[850px] flex flex-col border border-gray-100 overflow-hidden relative"
      >
        {/* ── TOP HEADER SECTION ───────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#16223F] via-[#1c2c54] to-[#25386b] text-white p-6 relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl shadow-inner">
                {profile.cattleType?.toUpperCase().includes('BUFFALO') ? '🐃' : '🐄'}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    Tag ID: <span className="font-mono text-[#FFC145]">{profile.tag || profile.tagId || animalTag}</span>
                  </h2>
                  <span className={`px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm ${getStatusBadge(rawStatus)}`}>
                    {rawStatus}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>Breed: <strong className="text-white">{profile.breed || 'Unknown'}</strong></span>
                  <span>Type: <strong className="text-white">{profile.cattleType || profile.animalType || 'Cow'}</strong></span>
                  <span>Current Shed: <strong className="text-[#FFC145]">Shed {profile.shed || profile.shedId || '-'}</strong></span>
                  <span>Farm: <strong className="text-white">{profile.farmName || profile.farmId?.name || 'Main Farm'}</strong></span>
                </p>
              </div>
            </div>

            {/* Quick Header Actions */}
            <div className="flex items-center gap-2 self-start">
              {/* Quick Add Log Dropdown */}
              {onQuickAddLog && (
                <div className="relative">
                  <button
                    onClick={() => setShowQuickAddMenu(!showQuickAddMenu)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D1867D] hover:bg-[#c3746b] text-white text-xs font-bold shadow-md transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Record Log</span>
                  </button>

                  {showQuickAddMenu && (
                    <div
                      className="absolute right-0 top-11 bg-white text-slate-800 rounded-xl shadow-xl border border-gray-100 py-1.5 w-48 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                      onClick={() => setShowQuickAddMenu(false)}
                    >
                      <button
                        onClick={() => onQuickAddLog('health', { tag: profile.tag || animalTag })}
                        className="w-full text-left px-4 py-2 hover:bg-rose-50 text-xs font-bold text-slate-700 flex items-center gap-2"
                      >
                        🩺 Record Treatment
                      </button>
                      <button
                        onClick={() => onQuickAddLog('vaccine', { tag: profile.tag || animalTag })}
                        className="w-full text-left px-4 py-2 hover:bg-teal-50 text-xs font-bold text-slate-700 flex items-center gap-2"
                      >
                        💉 Record Vaccine
                      </button>
                      <button
                        onClick={() => onQuickAddLog('shed', { tag: profile.tag || animalTag, oldShed: profile.shed || profile.shedId })}
                        className="w-full text-left px-4 py-2 hover:bg-sky-50 text-xs font-bold text-slate-700 flex items-center gap-2"
                      >
                        🏠 Record Shed Move
                      </button>
                      <button
                        onClick={() => onQuickAddLog('crossing', { femaleTag: profile.tag || animalTag })}
                        className="w-full text-left px-4 py-2 hover:bg-purple-50 text-xs font-bold text-slate-700 flex items-center gap-2"
                      >
                        🧬 Record Breeding / AI
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Export PDF Button */}
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all"
                title="Download Animal Dossier PDF"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Export Dossier</span>
              </button>

              {/* Close Modal */}
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg font-bold border border-white/20 transition-all ml-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Metric Summary Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-5 pt-4 border-t border-white/10 text-center">
            <div className="bg-white/5 rounded-xl p-2 border border-white/10">
              <span className="block text-[10px] uppercase tracking-wider text-slate-300 font-bold">Total Logs</span>
              <span className="text-lg font-black text-white">{timelineEvents.length}</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/10">
              <span className="block text-[10px] uppercase tracking-wider text-sky-200 font-bold">Shed Shifts</span>
              <span className="text-lg font-black text-sky-300">{animalData.shedLogs.length}</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/10">
              <span className="block text-[10px] uppercase tracking-wider text-purple-200 font-bold">AI / Breedings</span>
              <span className="text-lg font-black text-purple-300">{animalData.crossingLogs.length}</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/10">
              <span className="block text-[10px] uppercase tracking-wider text-rose-200 font-bold">Treatments</span>
              <span className="text-lg font-black text-rose-300">{animalData.treatmentLogs.length}</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/10">
              <span className="block text-[10px] uppercase tracking-wider text-teal-200 font-bold">Vaccinations</span>
              <span className="text-lg font-black text-teal-300">{animalData.vaccinationLogs.length}</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/10">
              <span className="block text-[10px] uppercase tracking-wider text-amber-200 font-bold">Calvings Born</span>
              <span className="text-lg font-black text-amber-300">{profile.calvings || 0}</span>
            </div>
          </div>
        </div>

        {/* ── TAB SELECTOR ─────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-slate-50 border-b border-slate-200 px-4 py-2 overflow-x-auto custom-scrollbar flex items-center gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            let count = null;
            if (tab.id === 'shed') count = animalData.shedLogs.length;
            if (tab.id === 'breeding') count = animalData.crossingLogs.length;
            if (tab.id === 'treatment') count = animalData.treatmentLogs.length;
            if (tab.id === 'vaccine') count = animalData.vaccinationLogs.length;
            if (tab.id === 'financial') count = animalData.purchaseLogs.length + animalData.saleLogs.length;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200
                  ${isActive
                    ? 'bg-white text-[#16223F] shadow-sm border border-slate-200 font-black'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? tab.color : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {count !== null && (
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${isActive ? 'bg-[#16223F] text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── MAIN CONTENT AREA ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#FAFBFD] custom-scrollbar">
          {isLoading ? (
            <div className="py-12 space-y-4">
              <SkeletonLoader type="table" columns={4} />
            </div>
          ) : (
            <>
              {/* 🕒 TAB 1: ALL-IN-ONE CHRONOLOGICAL LIFECYCLE TIMELINE */}
              {activeTab === 'timeline' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-[#16223F] flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        Comprehensive Lifecycle History
                      </h3>
                      <p className="text-xs text-slate-500">
                        Unified chronological feed of all movements, medical events, breeding records, and transactions for Tag [{animalTag}].
                      </p>
                    </div>
                    <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">
                      {timelineEvents.length} Recorded Events
                    </span>
                  </div>

                  {timelineEvents.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                      <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-slate-700">No Historical Logs Found</h4>
                      <p className="text-xs text-slate-400 mt-1">There are no operational logs recorded yet for animal [{animalTag}].</p>
                    </div>
                  ) : (
                    <div className="relative pl-6 sm:pl-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 space-y-6">
                      {timelineEvents.map((event, idx) => (
                        <div key={event.id || idx} className="relative group">
                          {/* Timeline Icon Node */}
                          <div className="absolute -left-6 sm:-left-8 top-1 w-7 h-7 rounded-full bg-white border-2 border-slate-300 group-hover:border-[#16223F] shadow-sm flex items-center justify-center text-xs transition-colors">
                            {event.icon}
                          </div>

                          {/* Event Card */}
                          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group-hover:border-slate-300">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-500 font-mono flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  {event.dateStr}
                                </span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider ${event.badgeColor}`}>
                                  {event.type}
                                </span>
                              </div>
                              {event.status && (
                                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                  Status: {event.status}
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-extrabold text-[#16223F] mb-1">
                              {event.title}
                            </h4>

                            {event.subtitle && (
                              <p className="text-xs text-slate-600 font-medium mb-1">
                                {event.subtitle}
                              </p>
                            )}

                            {event.details && (
                              <div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-2.5 mt-2 border border-slate-100 font-sans leading-relaxed">
                                {event.details}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 🏠 TAB 2: SHED SHIFTING LOGS */}
              {activeTab === 'shed' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-[#16223F] flex items-center gap-2">
                      <Home className="w-5 h-5 text-sky-600" />
                      Shed Movement Records
                    </h3>
                    <span className="text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
                      {animalData.shedLogs.length} Shifts Recorded
                    </span>
                  </div>

                  {animalData.shedLogs.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                      <Home className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-xs text-slate-500 font-bold">No shed shifting records found for this animal.</p>
                      <p className="text-[11px] text-slate-400 mt-1">Current Shed: <strong>Shed {profile.shed || profile.shedId || '-'}</strong></p>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[#16223F] text-[10px] font-black uppercase tracking-wider">
                          <tr>
                            <th className="p-3.5">Shifting Date</th>
                            <th className="p-3.5">Old Shed</th>
                            <th className="p-3.5">New Shed</th>
                            <th className="p-3.5">Reason</th>
                            <th className="p-3.5">Recorded Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                          {animalData.shedLogs.map((s, idx) => (
                            <tr key={s._id || s.id || idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3.5 font-bold font-mono text-[#16223F]">
                                {formatDateDDMMYYYY(s.shiftingDate || s.entryDate || s.date)}
                              </td>
                              <td className="p-3.5">
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                                  Shed {s.oldShed || '-'}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-black">
                                  ➔ Shed {s.newShed || '-'}
                                </span>
                              </td>
                              <td className="p-3.5 text-slate-600">{s.reason || '-'}</td>
                              <td className="p-3.5 text-slate-400 text-[11px]">
                                {s.lineNo ? `Line: ${s.lineNo}` : ''} {s.position ? `Pos: ${s.position}` : ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 🧬 TAB 3: BREEDING & INSEMINATION LOGS */}
              {activeTab === 'breeding' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-[#16223F] flex items-center gap-2">
                      <Dna className="w-5 h-5 text-purple-600" />
                      Artificial Insemination & Calving History
                    </h3>
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                      {animalData.crossingLogs.length} Crossing Records
                    </span>
                  </div>

                  {animalData.crossingLogs.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                      <Dna className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-xs text-slate-500 font-bold">No breeding or insemination logs found for this animal.</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[#16223F] text-[10px] font-black uppercase tracking-wider">
                          <tr>
                            <th className="p-3.5">AI / Crossing Date</th>
                            <th className="p-3.5">Semen / Bull Straw</th>
                            <th className="p-3.5">Pregnancy Status</th>
                            <th className="p-3.5">PD Check Date</th>
                            <th className="p-3.5">Expected Calving</th>
                            <th className="p-3.5">Calf Born</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                          {animalData.crossingLogs.map((c, idx) => {
                            const pStatus = String(c.pregnancyStatus || c['pregnancy status'] || 'Pending').toUpperCase();
                            let badge = 'bg-amber-50 text-amber-700 border-amber-200';
                            if (pStatus === 'POSITIVE') badge = 'bg-purple-50 text-purple-700 border-purple-200 font-bold';
                            if (pStatus === 'NEGATIVE') badge = 'bg-rose-50 text-rose-700 border-rose-200';

                            return (
                              <tr key={c._id || c.id || idx} className="hover:bg-purple-50/20 transition-colors">
                                <td className="p-3.5 font-bold font-mono text-[#16223F]">
                                  {formatDateDDMMYYYY(c.crossingDate || c.entryDate || c.date)}
                                </td>
                                <td className="p-3.5 font-bold text-slate-800">
                                  {c.semenType || c.bullTag || 'Standard Straw'}
                                </td>
                                <td className="p-3.5">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] border font-bold ${badge}`}>
                                    {pStatus}
                                  </span>
                                </td>
                                <td className="p-3.5">{formatDateDDMMYYYY(c.pregnancyCheckDate)}</td>
                                <td className="p-3.5">{formatDateDDMMYYYY(c.expectedCalvingDate)}</td>
                                <td className="p-3.5">
                                  {c.calfTag ? (
                                    <span className="font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                                      {c.calfTag} ({c.calfGender || 'Calf'})
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 🩺 TAB 4: TREATMENT & MEDICAL HEALTH */}
              {activeTab === 'treatment' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-[#16223F] flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-rose-600" />
                      Medical & Clinical Treatment History
                    </h3>
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                      {animalData.treatmentLogs.length} Clinical Visits
                    </span>
                  </div>

                  {animalData.treatmentLogs.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                      <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-xs text-slate-500 font-bold">No treatment or illness records logged for this animal.</p>
                      <p className="text-[11px] text-emerald-600 font-bold mt-1">✓ Animal has a clean health record.</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[#16223F] text-[10px] font-black uppercase tracking-wider">
                          <tr>
                            <th className="p-3.5">Treatment Date</th>
                            <th className="p-3.5">Diagnosis / Illness</th>
                            <th className="p-3.5">Symptoms</th>
                            <th className="p-3.5">Medicine & Dose</th>
                            <th className="p-3.5">Attending Doctor</th>
                            <th className="p-3.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                          {animalData.treatmentLogs.map((t, idx) => (
                            <tr key={t._id || t.id || idx} className="hover:bg-rose-50/20 transition-colors">
                              <td className="p-3.5 font-bold font-mono text-[#16223F]">
                                {formatDateDDMMYYYY(t.treatmentDate || t.entryDate || t.date)}
                              </td>
                              <td className="p-3.5 font-bold text-rose-900">
                                {t.diagnosis || t.symptoms || '-'}
                              </td>
                              <td className="p-3.5 text-slate-600">{t.symptoms || '-'}</td>
                              <td className="p-3.5">
                                <span className="font-bold text-slate-800">{t.medicine || '-'}</span>
                                {t.dose && <span className="text-slate-400 ml-1">({t.dose})</span>}
                              </td>
                              <td className="p-3.5 text-slate-600">{t.treatedBy || t.doctorName || '-'}</td>
                              <td className="p-3.5">
                                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">
                                  {t.status || 'Treated'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 💉 TAB 5: VACCINATION HISTORY */}
              {activeTab === 'vaccine' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-[#16223F] flex items-center gap-2">
                      <Syringe className="w-5 h-5 text-teal-600" />
                      Preventive Vaccination History
                    </h3>
                    <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
                      {animalData.vaccinationLogs.length} Doses Given
                    </span>
                  </div>

                  {animalData.vaccinationLogs.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                      <Syringe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-xs text-slate-500 font-bold">No vaccination records found for this animal.</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[#16223F] text-[10px] font-black uppercase tracking-wider">
                          <tr>
                            <th className="p-3.5">Date Administered</th>
                            <th className="p-3.5">Vaccine Name</th>
                            <th className="p-3.5">Batch Number</th>
                            <th className="p-3.5">Mfg / Expiry Date</th>
                            <th className="p-3.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                          {animalData.vaccinationLogs.map((v, idx) => (
                            <tr key={v._id || v.id || idx} className="hover:bg-teal-50/20 transition-colors">
                              <td className="p-3.5 font-bold font-mono text-[#16223F]">
                                {formatDateDDMMYYYY(v.date || v.vaccinationDate || v.entryDate)}
                              </td>
                              <td className="p-3.5 font-black text-teal-900">
                                {v.vaccinationName || v.vaccineName || '-'}
                              </td>
                              <td className="p-3.5 font-mono text-slate-600">{v.batchNo || '-'}</td>
                              <td className="p-3.5 text-slate-500 text-[11px]">
                                {v.expiryDate ? `Exp: ${formatDateDDMMYYYY(v.expiryDate)}` : '-'}
                              </td>
                              <td className="p-3.5">
                                <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-teal-200">
                                  {v.treatmentOrStatus || 'Completed'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 💰 TAB 6: FINANCIAL, PURCHASE & SALE */}
              {activeTab === 'financial' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-black text-[#16223F] flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-amber-600" />
                      Acquisition & Disposition Records
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Purchase Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <span>📥</span> Purchase & Onboarding Details
                      </h4>
                      {animalData.purchaseLogs.length === 0 ? (
                        <p className="text-xs text-slate-400">No external purchase record found. Born in farm or imported via bulk register.</p>
                      ) : (
                        animalData.purchaseLogs.map((p, idx) => (
                          <div key={p._id || idx} className="space-y-2 text-xs text-slate-700">
                            <div className="flex justify-between border-b pb-1.5">
                              <span className="text-slate-400">Purchase Date:</span>
                              <span className="font-bold">{formatDateDDMMYYYY(p.purchaseDate || p.entryDate)}</span>
                            </div>
                            <div className="flex justify-between border-b pb-1.5">
                              <span className="text-slate-400">Purchased From:</span>
                              <span className="font-bold">{p.purchaseFrom || '-'}</span>
                            </div>
                            <div className="flex justify-between border-b pb-1.5">
                              <span className="text-slate-400">Cost:</span>
                              <span className="font-black text-emerald-600">₹{p.cost || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Initial Weight:</span>
                              <span className="font-bold">{p.weight || '-'} kg</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Sale Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <span>📤</span> Sale / Disposition Details
                      </h4>
                      {animalData.saleLogs.length === 0 ? (
                        <p className="text-xs text-slate-400">Animal is currently active in farm (not sold).</p>
                      ) : (
                        animalData.saleLogs.map((s, idx) => (
                          <div key={s._id || idx} className="space-y-2 text-xs text-slate-700">
                            <div className="flex justify-between border-b pb-1.5">
                              <span className="text-slate-400">Sale Date:</span>
                              <span className="font-bold">{formatDateDDMMYYYY(s.saleDate || s.entryDate)}</span>
                            </div>
                            <div className="flex justify-between border-b pb-1.5">
                              <span className="text-slate-400">Sold To:</span>
                              <span className="font-bold">{s.soldTo || '-'}</span>
                            </div>
                            <div className="flex justify-between border-b pb-1.5">
                              <span className="text-slate-400">Sale Price:</span>
                              <span className="font-black text-amber-600">₹{s.salePrice || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Reason:</span>
                              <span className="font-bold">{s.reason || '-'}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
