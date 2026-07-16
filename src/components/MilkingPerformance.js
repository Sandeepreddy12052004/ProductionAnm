import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { api } from '../utils/api';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import FarmFilterSelector from './FarmFilterSelector';
import ModulePageHeader from './ModulePageHeader';
import SkeletonLoader from './SkeletonLoader';

export default function MilkingPerformance() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Raw data from APIs
  const [milkLogs, setMilkLogs] = useState([]);
  const [cattleList, setCattleList] = useState([]);
  const [shedsList, setShedsList] = useState([]);

  // Filter States
  const [selectedShed, setSelectedShed] = useState('ALL');
  const [selectedAnimalType, setSelectedAnimalType] = useState('ALL');
  const [selectedAnimal, setSelectedAnimal] = useState('ALL');
  const [metricType, setMetricType] = useState('SUM'); // 'SUM' or 'AVG'
  const [lowYieldThreshold, setLowYieldThreshold] = useState(15);
  const [datePreset, setDatePreset] = useState('10_DAYS');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Table search & pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Tooltip state for SVG charts
  const [hoveredPoint, setHoveredPoint] = useState(null); // { x, y, label, value, type }

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [milkRes, cattleRes, shedsRes] = await Promise.allSettled([
        api.milk.collections.getAll(),
        api.cattle.getAll(),
        api.sheds.getAll()
      ]);

      if (milkRes.status === 'fulfilled') {
        const rawLogs = Array.isArray(milkRes.value) ? milkRes.value : (milkRes.value?.data ?? []);
        setMilkLogs(rawLogs);
      }
      if (cattleRes.status === 'fulfilled') {
        const rawCattle = Array.isArray(cattleRes.value) ? cattleRes.value : (cattleRes.value?.data ?? []);
        setCattleList(rawCattle);
      }
      if (shedsRes.status === 'fulfilled') {
        const rawSheds = Array.isArray(shedsRes.value) ? shedsRes.value : (shedsRes.value?.data ?? []);
        setShedsList(rawSheds);
      }
    } catch (err) {
      console.error('Error fetching milking performance data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Build helper maps
  const cattleMap = useMemo(() => {
    const map = new Map();
    cattleList.forEach(c => {
      const idKey = String(c._id || c.id || '').toUpperCase();
      const tagKey = String(c.tag || c.tag_id || '').toUpperCase();
      if (idKey) map.set(idKey, c);
      if (tagKey) map.set(tagKey, c);
    });
    return map;
  }, [cattleList]);

  const uniqueMilkCattleTags = useMemo(() => {
    const tags = new Set();
    milkLogs.forEach(log => {
      const tag = String(log.tag_id || log.tagId || '').trim();
      if (tag) tags.add(tag);
    });
    return Array.from(tags).sort();
  }, [milkLogs]);

  // Date range calculation helper
  const getDateRange = () => {
    const today = new Date();
    const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    let start = new Date();
    
    if (datePreset === '7_DAYS') {
      start.setDate(today.getDate() - 6);
    } else if (datePreset === '10_DAYS') {
      start.setDate(today.getDate() - 9);
    } else if (datePreset === '30_DAYS') {
      start.setDate(today.getDate() - 29);
    } else if (datePreset === 'THIS_MONTH') {
      start.setDate(1);
    } else if (datePreset === 'CUSTOM') {
      const startStr = startDate || toDateStr(new Date());
      const endStr = endDate || toDateStr(new Date());
      return { startStr, endStr };
    }
    return { startStr: toDateStr(start), endStr: toDateStr(today) };
  };

  const toYYYYMMDD = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  };

  const { startStr, endStr } = getDateRange();

  // Apply filters to milk collections
  const filteredLogs = milkLogs.filter(log => {
    // 0. Farm Filter
    const activeFarmId = (() => {
      try {
        const pageKey = '__active_farm_id_' + window.location.pathname.replace(/\//g, '_') + '__';
        return localStorage.getItem(pageKey) || localStorage.getItem('__active_farm_id__') || 'ALL';
      } catch (e) {}
      return 'ALL';
    })();
    if (activeFarmId && activeFarmId !== 'ALL') {
      const logFarmId = log.farmId && typeof log.farmId === 'object'
        ? (log.farmId._id || log.farmId.id)
        : log.farmId;
      if (String(logFarmId) !== String(activeFarmId)) return false;
    }

    // 1. Date Filter
    const logDateStr = toYYYYMMDD(log.date);
    if (logDateStr < startStr || logDateStr > endStr) return false;

    // 2. Shed Filter
    if (selectedShed !== 'ALL') {
      const selectedShedObj = shedsList.find(s => String(s._id || s.id) === selectedShed);
      if (selectedShedObj) {
        const logShed = String(log.shedId || log.shed || '').trim().toUpperCase();
        const codeMatch = String(selectedShedObj.code || '').trim().toUpperCase();
        const nameMatch = String(selectedShedObj.name || '').trim().toUpperCase();
        const idMatch = String(selectedShedObj._id || selectedShedObj.id || '').trim().toUpperCase();

        if (logShed !== codeMatch && logShed !== nameMatch && logShed !== idMatch) {
          return false;
        }
      } else {
        return false;
      }
    }

    // 3. Animal Type Filter
    if (selectedAnimalType !== 'ALL') {
      const tag = String(log.tag_id || log.tagId || '').trim().toUpperCase();
      const animal = cattleMap.get(tag);
      const type = String(animal?.cattleType || animal?.animalType || 'COW').toUpperCase();
      if (type !== selectedAnimalType) return false;
    }

    // 4. Specific Animal Filter
    if (selectedAnimal !== 'ALL') {
      const logTag = String(log.tag_id || log.tagId || '').trim().toUpperCase();
      const targetTag = String(selectedAnimal).trim().toUpperCase();
      if (logTag !== targetTag) return false;
    }

    return true;
  });

  // Aggregations
  const totalYield = filteredLogs.reduce((sum, log) => sum + Number(log.quantity || 0), 0);
  const totalSelfConsumption = filteredLogs.reduce((sum, log) => sum + Number(log.selfConsumption || 0), 0);
  const totalDayTotal = filteredLogs.reduce((sum, log) => sum + Number(log.dayTotal || 0), 0);

  // Group by Date for trend analysis
  const sortedDates = useMemo(() => {
    const dates = [];
    if (!startStr || !endStr) return dates;
    const parts = startStr.split('-');
    const curr = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const endParts = endStr.split('-');
    const end = new Date(Number(endParts[0]), Number(endParts[1]) - 1, Number(endParts[2]));
    
    let safetyCounter = 0;
    while (curr <= end && safetyCounter < 366) {
      const dateStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
      dates.push(dateStr);
      curr.setDate(curr.getDate() + 1);
      safetyCounter++;
    }
    return dates;
  }, [startStr, endStr]);

  const dailyGroups = useMemo(() => {
    const groups = {};
    sortedDates.forEach(dateStr => {
      groups[dateStr] = { 
        morningSum: 0, morningCount: 0, 
        eveningSum: 0, eveningCount: 0, 
        selfSum: 0, 
        totalSum: 0, totalCount: 0,
        morning: 0, evening: 0, self: 0, total: 0, count: 0 
      };
    });

    filteredLogs.forEach(log => {
      const dateStr = toYYYYMMDD(log.date);
      if (!groups[dateStr]) {
        groups[dateStr] = { 
          morningSum: 0, morningCount: 0, 
          eveningSum: 0, eveningCount: 0, 
          selfSum: 0, 
          totalSum: 0, totalCount: 0,
          morning: 0, evening: 0, self: 0, total: 0, count: 0 
        };
      }
      if (log.session === 'MORNING') {
        groups[dateStr].morningSum += Number(log.quantity || 0);
        groups[dateStr].morningCount += 1;
      } else if (log.session === 'EVENING') {
        groups[dateStr].eveningSum += Number(log.quantity || 0);
        groups[dateStr].eveningCount += 1;
      }
      groups[dateStr].selfSum += Number(log.selfConsumption || 0);
      groups[dateStr].totalSum += Number(log.quantity || 0);
      groups[dateStr].totalCount += 1;
      groups[dateStr].count += 1;
    });

    Object.keys(groups).forEach(dateStr => {
      const g = groups[dateStr];
      if (metricType === 'AVG') {
        g.morning = g.morningCount > 0 ? (g.morningSum / g.morningCount) : 0;
        g.evening = g.eveningCount > 0 ? (g.eveningSum / g.eveningCount) : 0;
        g.self = g.totalCount > 0 ? (g.selfSum / g.totalCount) : 0;
        g.total = g.totalCount > 0 ? (g.totalSum / g.totalCount) : 0;
      } else {
        g.morning = g.morningSum;
        g.evening = g.eveningSum;
        g.self = g.selfSum;
        g.total = g.totalSum;
      }
    });

    return groups;
  }, [sortedDates, filteredLogs, metricType]);

  const activeDays = sortedDates.filter(d => dailyGroups[d]?.count > 0).length;
  const avgDailyYield = activeDays > 0 ? (totalYield / activeDays) : 0;

  // Find Peak day
  let peakDayStr = '-';
  let peakDayValue = 0;
  sortedDates.forEach(dateStr => {
    const info = dailyGroups[dateStr];
    if (info && info.total > peakDayValue) {
      peakDayValue = info.total;
      peakDayStr = dateStr;
    }
  });

  // Group by Shed for shed comparisons
  const shedGroups = useMemo(() => {
    const sums = {};
    const counts = {};
    filteredLogs.forEach(log => {
      const shedCode = String(log.shedId || log.shed || 'Shed ?').trim().toUpperCase();
      if (!sums[shedCode]) {
        sums[shedCode] = 0;
        counts[shedCode] = 0;
      }
      sums[shedCode] += Number(log.quantity || 0);
      counts[shedCode] += 1;
    });

    const resolved = {};
    Object.keys(sums).forEach(shedCode => {
      resolved[shedCode] = metricType === 'AVG'
        ? (sums[shedCode] / (counts[shedCode] || 1))
        : sums[shedCode];
    });
    return resolved;
  }, [filteredLogs, metricType]);

  // Find top yielding animals
  const animalYieldMap = useMemo(() => {
    const sums = {};
    const counts = {};
    filteredLogs.forEach(log => {
      const tag = String(log.tag_id || log.tagId || '').trim().toUpperCase();
      if (tag) {
        if (!sums[tag]) {
          sums[tag] = 0;
          counts[tag] = 0;
        }
        sums[tag] += Number(log.quantity || 0);
        counts[tag] += 1;
      }
    });

    const resolved = {};
    Object.keys(sums).forEach(tag => {
      resolved[tag] = metricType === 'AVG'
        ? (sums[tag] / (counts[tag] || 1))
        : sums[tag];
    });
    return resolved;
  }, [filteredLogs, metricType]);

  const topAnimals = useMemo(() => {
    return Object.entries(animalYieldMap)
      .map(([tag, yieldL]) => {
        const animal = cattleMap.get(tag);
        return {
          tag,
          yieldL,
          breed: animal?.breed || 'Unknown',
          shed: animal?.shedId || animal?.shed || '-',
          type: animal?.cattleType || animal?.animalType || 'Cow'
        };
      })
      .sort((a, b) => b.yieldL - a.yieldL)
      .slice(0, 5);
  }, [animalYieldMap, cattleMap]);

  const lowAnimals = useMemo(() => {
    return Object.entries(animalYieldMap)
      .map(([tag, yieldL]) => {
        const animal = cattleMap.get(tag);
        return {
          tag,
          yieldL,
          breed: animal?.breed || 'Unknown',
          shed: animal?.shedId || animal?.shed || '-',
          type: animal?.cattleType || animal?.animalType || 'Cow',
          gender: animal?.gender || 'Female'
        };
      })
      .filter(animal => {
        const isCalf = String(animal.type).toUpperCase().includes('CALF') || String(animal.tag).toUpperCase().includes('CALF');
        const isMale = String(animal.gender).toUpperCase() === 'MALE';
        const passesThreshold = lowYieldThreshold === '' || animal.yieldL <= Number(lowYieldThreshold);
        return !isCalf && !isMale && passesThreshold;
      })
      .sort((a, b) => a.yieldL - b.yieldL)
      .slice(0, 5);
  }, [animalYieldMap, cattleMap, lowYieldThreshold]);

  // Table Logs Search & Pagination
  const formatTableDate = (dateStr) => {
    if (!dateStr || !dateStr.includes('-')) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const detailedTableLogs = sortedDates
    .map(dateStr => {
      const info = dailyGroups[dateStr];
      return {
        date: dateStr,
        formattedDate: formatTableDate(dateStr),
        morning: info.morning,
        evening: info.evening,
        self: info.self,
        total: info.total
      };
    }).filter(row => {
      if (!searchQuery) return true;
      return row.formattedDate.includes(searchQuery) || String(row.total).includes(searchQuery);
    });

  // Sort logs table showing most recent dates first
  const sortedTableLogs = [...detailedTableLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.ceil(sortedTableLogs.length / itemsPerPage);
  const paginatedLogs = sortedTableLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Export Excel
  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Milking Performance');
    worksheet.columns = [
      { header: 'Date', key: 'formattedDate', width: 18 },
      { header: 'Morning (L)', key: 'morning', width: 15 },
      { header: 'Evening (L)', key: 'evening', width: 15 },
      { header: 'Self-Consumption (L)', key: 'self', width: 22 },
      { header: 'Day Total (L)', key: 'total', width: 18 }
    ];

    sortedTableLogs.forEach(log => {
      worksheet.addRow({
        formattedDate: log.formattedDate,
        morning: log.morning,
        evening: log.evening,
        self: log.self,
        total: log.total
      });
    });

    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '16223F' } };
      cell.font = { name: 'Segoe UI', bold: true, color: { argb: 'FFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    headerRow.height = 28;

    worksheet.eachRow((row, rNum) => {
      if (rNum > 1) {
        row.eachCell((cell) => {
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          if (rNum % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
          }
        });
        row.height = 20;
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Milking_Performance_${datePreset}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'A4' });
    const cols = ['Date', 'Morning (L)', 'Evening (L)', 'Self-Consumption (L)', 'Day Total (L)'];
    const rows = sortedTableLogs.map(log => [
      log.formattedDate,
      log.morning.toFixed(2),
      log.evening.toFixed(2),
      log.self.toFixed(2),
      log.total.toFixed(2)
    ]);

    const img = new Image();
    img.src = '/LOGO.png';
    img.onload = () => {
      doc.addImage(img, 'PNG', 20, 15, 36, 36);
      doc.setFontSize(14);
      doc.setTextColor(22, 34, 63);
      doc.setFont('helvetica', 'bold');
      doc.text('Milking Performance Report', 70, 30);

      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()} | Filter: ${datePreset}`, 70, 45);

      autoTable(doc, {
        head: [cols],
        body: rows,
        startY: 65,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 5, halign: 'center' },
        headStyles: { fillColor: [22, 34, 63], textColor: 255 }
      });
      doc.save(`Milking_Performance_${datePreset}.pdf`);
    };
  };

  // Custom SVG Trend Line Chart Coordinates Calculation
  const getTrendSvgPoints = (width, height, padding = 40) => {
    if (sortedDates.length === 0) return { linePath: '', areaPath: '', points: [] };
    const maxVal = Math.max(...sortedDates.map(d => dailyGroups[d].total), 10);
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    const points = sortedDates.map((dateStr, idx) => {
      const val = dailyGroups[dateStr].total;
      const x = padding + (idx / (sortedDates.length - 1 || 1)) * chartW;
      const y = padding + chartH - (val / maxVal) * chartH;
      const dObj = new Date(dateStr);
      const label = `${String(dObj.getDate()).padStart(2, '0')}/${String(dObj.getMonth() + 1).padStart(2, '0')}`;
      return { x, y, label, value: val, date: dateStr };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : '';

    return { linePath, areaPath, points, maxVal };
  };

  const trendSvgWidth = 720;
  const trendSvgHeight = 280;
  const trendPadding = 40;
  const { linePath, areaPath, points: trendPoints, maxVal: trendMaxVal } = getTrendSvgPoints(trendSvgWidth, trendSvgHeight, trendPadding);

  // UI styling references
  const cardClass = "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm transition hover:shadow-md";

  return (
    <div className="w-full text-black">
      <ModulePageHeader
        title="Milking Performance Analysis"
        description="Monitor average daily milk yields, session summaries, shed comparisons, and animal metrics."
      >
        <FarmFilterSelector layout="horizontal" size="sm" showAllOption={false} />
      </ModulePageHeader>

      {/* FILTER BAR CONTROLS */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-5 mb-8 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Preset Picker */}
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Date Preset</label>
            <select
              value={datePreset}
              onChange={(e) => {
                setDatePreset(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 px-3 pr-8 rounded-xl border border-slate-200 text-xs font-semibold text-[#16223F] bg-white outline-none cursor-pointer focus:border-[#D1867D] appearance-none"
            >
              <option value="10_DAYS">Last 10 Days</option>
              <option value="7_DAYS">Last 7 Days (1 Week)</option>
              <option value="30_DAYS">Last 30 Days</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Ranges */}
          {datePreset === 'CUSTOM' && (
            <>
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                  className="h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-[#16223F] bg-white outline-none focus:border-[#D1867D]"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                  className="h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-[#16223F] bg-white outline-none focus:border-[#D1867D]"
                />
              </div>
            </>
          )}

          {/* Shed Filter */}
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Shed Filter</label>
            <select
              value={selectedShed}
              onChange={(e) => { setSelectedShed(e.target.value); setCurrentPage(1); }}
              className="h-10 px-3 pr-8 rounded-xl border border-slate-200 text-xs font-semibold text-[#16223F] bg-white outline-none cursor-pointer focus:border-[#D1867D] appearance-none"
            >
              <option value="ALL">All Sheds</option>
              {shedsList.map(shed => (
                <option key={shed._id || shed.id} value={String(shed._id || shed.id)}>
                  Shed {shed.name || shed.code}
                </option>
              ))}
            </select>
          </div>

          {/* Animal Type Filter */}
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Animal Type</label>
            <select
              value={selectedAnimalType}
              onChange={(e) => { setSelectedAnimalType(e.target.value); setCurrentPage(1); }}
              className="h-10 px-3 pr-8 rounded-xl border border-slate-200 text-xs font-semibold text-[#16223F] bg-white outline-none cursor-pointer focus:border-[#D1867D] appearance-none"
            >
              <option value="ALL">All Types</option>
              <option value="COW">Cow</option>
              <option value="BUFFALO">Buffalo</option>
            </select>
          </div>

          {/* Low Yield Limit Filter */}
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Low Yield Limit (L)</label>
            <input
              type="number"
              min="0"
              value={lowYieldThreshold}
              onChange={(e) => { setLowYieldThreshold(e.target.value === '' ? '' : Number(e.target.value)); setCurrentPage(1); }}
              placeholder="e.g. 15"
              className="h-10 w-28 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-[#16223F] bg-white outline-none focus:border-[#D1867D]"
            />
          </div>

          {/* Animal Selector */}
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Specific Animal</label>
            <select
              value={selectedAnimal}
              onChange={(e) => { setSelectedAnimal(e.target.value); setCurrentPage(1); }}
              className="h-10 px-3 pr-8 rounded-xl border border-slate-200 text-xs font-semibold text-[#16223F] bg-white outline-none cursor-pointer focus:border-[#D1867D] appearance-none"
            >
              <option value="ALL">All Animals</option>
              {uniqueMilkCattleTags.map(tag => (
                <option key={tag} value={tag}>
                  Tag {tag}
                </option>
              ))}
            </select>
          </div>

          {/* Calculation Metric Selector */}
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Metric Mode</label>
            <select
              value={metricType}
              onChange={(e) => { setMetricType(e.target.value); setCurrentPage(1); }}
              className="h-10 px-3 pr-8 rounded-xl border border-slate-200 text-xs font-semibold text-[#16223F] bg-white outline-none cursor-pointer focus:border-[#D1867D] appearance-none"
            >
              <option value="SUM">Sum of Liters</option>
              <option value="AVG">Average of Liters</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Indicator */}
        <button
          onClick={() => {
            setSelectedShed('ALL');
            setSelectedAnimalType('ALL');
            setSelectedAnimal('ALL');
            setMetricType('SUM');
            setLowYieldThreshold(15);
            setDatePreset('10_DAYS');
            setStartDate('');
            setEndDate('');
            setCurrentPage(1);
          }}
          className="text-xs font-extrabold text-[#D1867D] hover:text-[#c4776f] transition cursor-pointer self-end mb-1"
        >
          Reset Filters
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <SkeletonLoader type="block" height="h-24" />
          <SkeletonLoader type="block" height="h-24" />
          <SkeletonLoader type="block" height="h-24" />
          <SkeletonLoader type="block" height="h-24" />
        </div>
      ) : (
        <>
          {/* KPI METRIC CARDS */}
          {(() => {
            const displayYield = metricType === 'SUM'
              ? totalYield
              : (filteredLogs.length > 0 ? (totalYield / filteredLogs.length) : 0);

            const displaySelfConsumption = metricType === 'SUM'
              ? totalSelfConsumption
              : (filteredLogs.length > 0 ? (totalSelfConsumption / filteredLogs.length) : 0);

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
                <div className={cardClass}>
                  <p className="text-[10px] uppercase text-slate-400 font-black tracking-wider">
                    {metricType === 'SUM' ? 'Total Yield' : 'Average Yield'}
                  </p>
                  <p className="text-3xl font-black text-[#16223F] mt-1.5">{displayYield.toFixed(1)} <span className="text-base font-bold">L</span></p>
                </div>

                <div className={cardClass}>
                  <p className="text-[10px] uppercase text-slate-400 font-black tracking-wider">Daily Average</p>
                  <p className="text-3xl font-black text-[#16223F] mt-1.5">{avgDailyYield.toFixed(1)} <span className="text-base font-bold">L/day</span></p>
                </div>

                <div className={cardClass}>
                  <p className="text-[10px] uppercase text-slate-400 font-black tracking-wider">
                    {metricType === 'SUM' ? 'Peak Production' : 'Peak Avg Yield'}
                  </p>
                  <p className="text-3xl font-black text-emerald-600 mt-1.5">{peakDayValue.toFixed(1)} <span className="text-base font-bold text-[#16223F]">L</span></p>
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">Date: {peakDayStr !== '-' ? formatTableDate(peakDayStr) : '-'}</p>
                </div>

                <div className={cardClass}>
                  <p className="text-[10px] uppercase text-slate-400 font-black tracking-wider">
                    {metricType === 'SUM' ? 'Self-Consumption' : 'Self-Consumption Avg'}
                  </p>
                  <p className="text-3xl font-black text-[#D1867D] mt-1.5">{displaySelfConsumption.toFixed(1)} <span className="text-base font-bold">L</span></p>
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                    {metricType === 'SUM' 
                      ? `Net Sale: ${(totalYield - totalSelfConsumption).toFixed(1)} L`
                      : `Net Sale Avg: ${(displayYield - displaySelfConsumption).toFixed(1)} L`
                    }
                  </p>
                </div>
              </div>
            );
          })()}

          {/* MAIN GRAPH/CHARTS SECTIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

            {/* SVG Trend Line Chart */}
            <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div>
                <h3 className="font-extrabold text-base text-[#16223F] mb-1">Production Trend</h3>
                <p className="text-xs text-slate-400 font-bold mb-4">Total daily collection (Liters) plotted over period</p>
              </div>

              {sortedDates.length === 0 ? (
                <div className="h-60 flex items-center justify-center text-sm font-semibold text-slate-400">
                  No data available for the selected filters.
                </div>
              ) : (
                <div className="relative w-full overflow-x-auto select-none">
                  <div className="relative min-w-[640px] w-full">
                    <svg viewBox={`0 0 ${trendSvgWidth} ${trendSvgHeight}`} className="w-full h-auto">
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#D1867D" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#D1867D" stopOpacity="0.00" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal gridlines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const y = trendPadding + (trendSvgHeight - trendPadding * 2) * ratio;
                        const labelVal = trendMaxVal - trendMaxVal * ratio;
                        return (
                          <g key={i}>
                            <line x1={trendPadding} y1={y} x2={trendSvgWidth - trendPadding} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                            <text x={trendPadding - 8} y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-bold">{labelVal.toFixed(0)}</text>
                          </g>
                        );
                      })}

                      {/* Render Area Filled Gradient */}
                      <path d={areaPath} fill="url(#areaGrad)" />

                      {/* Render Main Trend Line */}
                      <path d={linePath} fill="none" stroke="#D1867D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                      {/* Render circles & labels */}
                      {trendPoints.map((pt, i) => (
                        <g key={i}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={hoveredPoint?.date === pt.date ? "6" : "3.5"}
                            fill={hoveredPoint?.date === pt.date ? "#16223F" : "#D1867D"}
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            onMouseEnter={() => setHoveredPoint({ x: pt.x, y: pt.y, label: pt.label, value: pt.value, date: pt.date, type: 'trend' })}
                            onMouseLeave={() => setHoveredPoint(null)}
                            className="transition-all duration-200 cursor-pointer"
                          />
                           {/* Value text label above dot (only when hovered) */}
                          {hoveredPoint?.date === pt.date && (
                            <text
                              x={pt.x}
                              y={pt.y - 8}
                              textAnchor="middle"
                              className="text-[9px] fill-[#16223F] font-black"
                            >
                              {pt.value.toFixed(1)}L
                            </text>
                          )}
                          {/* Render X-Axis labels at lower boundary */}
                          {(sortedDates.length < 15 || i % Math.ceil(sortedDates.length / 10) === 0) && (
                            <text x={pt.x} y={trendSvgHeight - trendPadding + 15} textAnchor="middle" className="text-[9px] fill-slate-400 font-bold">
                              {pt.label}
                            </text>
                          )}
                        </g>
                      ))}
                    </svg>

                    {/* Dynamic Floating Tooltip */}
                    {hoveredPoint && hoveredPoint.type === 'trend' && (() => {
                      const isHigh = hoveredPoint.y < 65;
                      return (
                        <div
                          className="absolute bg-[#16223F] text-white p-2.5 rounded-xl shadow-lg border border-slate-700 pointer-events-none text-[10px] font-bold z-10 transition-all duration-150"
                          style={{
                            left: `${(hoveredPoint.x / trendSvgWidth) * 100}%`,
                            top: isHigh 
                              ? `${(hoveredPoint.y / trendSvgHeight) * 100 + 10}%`
                              : `${(hoveredPoint.y / trendSvgHeight) * 100 - 15}%`,
                            transform: isHigh ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'
                          }}
                        >
                          <p className="text-[#D1867D]">{formatTableDate(hoveredPoint.date)}</p>
                          <p className="mt-0.5 text-sm font-black">{hoveredPoint.value.toFixed(1)} Liters</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* SVG Session Distribution & Shed Performance Side-by-side */}
            <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-base text-[#16223F] mb-1">Shed Breakdown</h3>
                <p className="text-xs text-slate-400 font-bold mb-6">Total milk yield (Liters) compared across sheds</p>
              </div>

              {Object.keys(shedGroups).length === 0 ? (
                <div className="h-60 flex items-center justify-center text-sm font-semibold text-slate-400">
                  No shed data available.
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(shedGroups).map(([shed, yieldL]) => {
                    const percent = Math.min((yieldL / (totalYield || 1)) * 100, 100);
                    return (
                      <div key={shed} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-extrabold text-slate-700">
                          <span>Shed {shed}</span>
                          <span>{yieldL.toFixed(1)} L ({percent.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${percent}%` }}
                            className="h-full bg-gradient-to-r from-[#D1867D] to-[#e49b92] rounded-full transition-all duration-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-8 border-t border-slate-100 pt-5">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">
                  {metricType === 'SUM' ? 'Session Breakdown' : 'Session Averages'}
                </h4>
                {(() => {
                  const morningLogs = filteredLogs.filter(l => l.session === 'MORNING');
                  const morningVal = metricType === 'SUM'
                    ? morningLogs.reduce((sum, l) => sum + Number(l.quantity || 0), 0)
                    : (morningLogs.length > 0 ? morningLogs.reduce((sum, l) => sum + Number(l.quantity || 0), 0) / morningLogs.length : 0);

                  const eveningLogs = filteredLogs.filter(l => l.session === 'EVENING');
                  const eveningVal = metricType === 'SUM'
                    ? eveningLogs.reduce((sum, l) => sum + Number(l.quantity || 0), 0)
                    : (eveningLogs.length > 0 ? eveningLogs.reduce((sum, l) => sum + Number(l.quantity || 0), 0) / eveningLogs.length : 0);

                  return (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-2xl p-3 flex flex-col justify-between">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">
                          {metricType === 'SUM' ? 'Morning Session' : 'Morning Average'}
                        </span>
                        <span className="text-xl font-black text-[#16223F] mt-1">
                          {morningVal.toFixed(1)} L
                        </span>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-3 flex flex-col justify-between">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">
                          {metricType === 'SUM' ? 'Evening Session' : 'Evening Average'}
                        </span>
                        <span className="text-xl font-black text-[#16223F] mt-1">
                          {eveningVal.toFixed(1)} L
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

          </div>

          {/* TABLE SECTIONS: TOP PERFORMERS & DAILY LOGS */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">

            {/* Top Yielding Animals */}
            <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm flex flex-col justify-between h-full lg:col-span-1">
              <div>
                <h3 className="font-extrabold text-base text-[#16223F] mb-1">Top Performing Animals</h3>
                <p className="text-xs text-slate-400 font-bold mb-4">Highest milk yield producers in selected range</p>
              </div>

              {topAnimals.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm font-semibold text-slate-400 py-10">
                  No records.
                </div>
              ) : (
                <div className="flex-1 divide-y divide-slate-100">
                  {topAnimals.map((animal, i) => {
                    const emoji = String(animal.type).toUpperCase() === 'BUFFALO' ? '🐃' : '🐄';
                    return (
                      <div key={animal.tag} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{emoji}</span>
                          <div>
                            <p className="text-sm font-black text-[#16223F]">Tag {animal.tag}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Shed {animal.shed} | {animal.breed}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-600">{animal.yieldL.toFixed(1)} L</p>
                          <p className="text-[9px] text-slate-400 font-bold">Rank #{i + 1}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Low Yielding Animals */}
            <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm flex flex-col justify-between h-full lg:col-span-1">
              <div>
                <h3 className="font-extrabold text-base text-[#16223F] mb-1">Low Performing Animals</h3>
                <p className="text-xs text-slate-400 font-bold mb-4">Lowest milk yield producers in selected range</p>
              </div>

              {lowAnimals.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm font-semibold text-slate-400 py-10">
                  No records.
                </div>
              ) : (
                <div className="flex-1 divide-y divide-slate-100">
                  {lowAnimals.map((animal, i) => {
                    const emoji = String(animal.type).toUpperCase() === 'BUFFALO' ? '🐃' : '🐄';
                    return (
                      <div key={animal.tag} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{emoji}</span>
                          <div>
                            <p className="text-sm font-black text-[#16223F]">Tag {animal.tag}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Shed {animal.shed} | {animal.breed}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-rose-600">{animal.yieldL.toFixed(1)} L</p>
                          <p className="text-[9px] text-slate-400 font-bold">Rank #{i + 1}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Daily Production Logs Table */}
            <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm flex flex-col justify-between">

              {/* Header with Search & Exports */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <div>
                  <h3 className="font-extrabold text-base text-[#16223F] mb-1">Daily Logs Summary</h3>
                  <p className="text-xs text-slate-400 font-bold">Aggregated morning, evening, and consumption totals</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <button onClick={exportExcel} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition cursor-pointer">
                    Excel
                  </button>
                  <button onClick={exportPDF} className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition cursor-pointer">
                    PDF
                  </button>
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="h-8 border border-slate-200 rounded-lg px-3 text-xs outline-none focus:border-[#D1867D] bg-white font-semibold"
                  />
                </div>
              </div>

              {/* Main table */}
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 text-center">Date</th>
                      <th className="pb-3 text-center">{metricType === 'SUM' ? 'Morning Yield (L)' : 'Morning Avg (L)'}</th>
                      <th className="pb-3 text-center">{metricType === 'SUM' ? 'Evening Yield (L)' : 'Evening Avg (L)'}</th>
                      <th className="pb-3 text-center">{metricType === 'SUM' ? 'Self-Consumption (L)' : 'Self-Consumption Avg (L)'}</th>
                      <th className="pb-3 text-center">{metricType === 'SUM' ? 'Day Total (L)' : 'Day Avg (L)'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                    {paginatedLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-semibold">
                          No matching logs found
                        </td>
                      </tr>
                    ) : (
                      paginatedLogs.map((log) => (
                        <tr key={log.date} className="hover:bg-slate-50/50">
                          <td className="py-3 text-center text-[#16223F] font-black">{log.formattedDate}</td>
                          <td className="py-3 text-center">{log.morning.toFixed(1)}</td>
                          <td className="py-3 text-center">{log.evening.toFixed(1)}</td>
                          <td className="py-3 text-center text-slate-400">{log.self.toFixed(1)}</td>
                          <td className="py-3 text-center text-emerald-600 font-extrabold">{log.total.toFixed(1)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-extrabold hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer text-[#16223F]"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-extrabold hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer text-[#16223F]"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>
        </>
      )}
    </div>
  );
}
