import React, { useState, useEffect } from 'react';
import { useRouter } from "next/router";
import LogForm from './LogForm';
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";
import SkeletonLoader from './SkeletonLoader';

const parseDateString = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  const valStr = String(dateVal).trim();
  if (valStr.includes("/")) {
    const parts = valStr.split("/");
    if (parts.length === 3) {
      const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      if (!isNaN(d.getTime())) return d;
    }
  }
  const parsed = new Date(valStr);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
};

const formatDateToDDMMYYYY = (dateVal) => {
  const d = parseDateString(dateVal);
  if (!d) return "-";
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// Helper for string similarity (Sorensen-Dice Coefficient)
const getSimilarityScore = (str1, str2) => {
  if (!str1 || !str2) return 0;
  const s1 = String(str1).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const s2 = String(str2).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;

  const getBigrams = (str) => {
    const bigrams = new Set();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const bigrams1 = getBigrams(s1);
  const bigrams2 = getBigrams(s2);
  
  let intersection = 0;
  for (const val of bigrams1) {
    if (bigrams2.has(val)) intersection++;
  }

  const totalBigrams = bigrams1.size + bigrams2.size;
  return totalBigrams > 0 ? (2 * intersection) / totalBigrams : 0;
};

// AI Smart Matcher for resolving typos dynamically against allowed lists
const findSmartMatch = (inputVal, allowedMapOrSet, farmCode = '') => {
  if (!inputVal) return null;
  const cleanInput = String(inputVal).trim().toUpperCase();

  const hasMethod = (val) => allowedMapOrSet.has(val);
  const getMethod = (val) => allowedMapOrSet.get ? allowedMapOrSet.get(val) : val;

  if (hasMethod(cleanInput)) return getMethod(cleanInput); // Exact match in original case!

  const optionsIterable = allowedMapOrSet.keys ? allowedMapOrSet.keys() : allowedMapOrSet;

  // 1. Handle raw number matching (e.g. "1" matches "TKP-SHED 1")
  if (/^\d+$/.test(cleanInput)) {
    let matches = [];
    for (const option of optionsIterable) {
      const cleanOption = String(option).trim().toUpperCase();
      const regex = new RegExp(`(?:SHED|\\b|\\-|_)0*${cleanInput}$`);
      if (regex.test(cleanOption)) {
        matches.push(option);
      }
    }
    if (matches.length > 0) {
      let matchedKey = matches[0];
      if (farmCode) {
        const farmMatch = matches.find(m => String(m).toUpperCase().includes(farmCode.toUpperCase()));
        if (farmMatch) matchedKey = farmMatch;
      }
      return getMethod(matchedKey);
    }
  }

  const cleanNoSpaces = cleanInput.replace(/[^A-Z0-9]/g, '');
  if (!cleanNoSpaces) return null;

  let bestMatchKey = null;
  let highestScore = 0;

  for (const option of optionsIterable) {
    const cleanOption = String(option).trim().toUpperCase();
    const optionNoSpaces = cleanOption.replace(/[^A-Z0-9]/g, '');

    // Check normalized exact match
    if (cleanNoSpaces === optionNoSpaces) {
      return getMethod(option);
    }

    // Substring matching
    if (cleanNoSpaces.includes(optionNoSpaces) || optionNoSpaces.includes(cleanNoSpaces)) {
      let score = Math.min(cleanNoSpaces.length, optionNoSpaces.length) / Math.max(cleanNoSpaces.length, optionNoSpaces.length);
      if (farmCode && cleanOption.includes(farmCode.toUpperCase())) {
        score += 0.1;
      }
      if (score > highestScore) {
        highestScore = score;
        bestMatchKey = option;
      }
    }

    // Sorensen-Dice similarity
    let similarity = getSimilarityScore(cleanNoSpaces, optionNoSpaces);
    if (farmCode && cleanOption.includes(farmCode.toUpperCase())) {
      similarity += 0.1;
    }
    if (similarity > highestScore) {
      highestScore = similarity;
      bestMatchKey = option;
    }
  }

  // Use the match if confidence is above 65%
  if (highestScore > 0.65) {
    return getMethod(bestMatchKey);
  }
  return null;
};

// Resolve raw shed inputs (e.g., "Tkp-shed 1" or "1") to the standard shed code (number string e.g. "1")
const resolveShedNumber = (inputVal, shedsList = [], farmCode = '') => {
  if (!inputVal) return null;
  const cleanInput = String(inputVal).trim().toUpperCase();

  // 1. If it's a raw number (e.g. "1"), see if there's a shed with that code
  if (/^\d+$/.test(cleanInput)) {
    const matches = (shedsList || []).filter(s => String(s.code || '').trim() === cleanInput);
    if (matches.length > 0) {
      if (farmCode) {
        const farmMatch = matches.find(s => {
          const sName = String(s.name || '').toUpperCase();
          const sFarmId = String(s.farmId?.code || s.farmId || '').toUpperCase();
          return sName.includes(farmCode.toUpperCase()) || sFarmId.includes(farmCode.toUpperCase());
        });
        if (farmMatch) return String(farmMatch.code || '');
      }
      return String(matches[0].code || '');
    }
  }

  // 2. If it's a string like "Tkp-shed 1", extract the number part at the end
  const numMatch = cleanInput.match(/(?:SHED|SHED\s+|SHED-|SHED_|-|\b)0*(\d+)$/i) || cleanInput.match(/0*(\d+)$/);
  const extractedNumber = numMatch ? numMatch[1] : '';

  // Smart match over all sheds
  let bestMatch = null;
  let highestScore = 0;

  const cleanNoSpacesInput = cleanInput.replace(/[^A-Z0-9]/g, '');

  for (const s of (shedsList || [])) {
    const sName = String(s.name || '').trim().toUpperCase();
    const sCode = String(s.code || '').trim().toUpperCase();
    
    const sNameClean = sName.replace(/[^A-Z0-9]/g, '');
    const sCodeClean = sCode.replace(/[^A-Z0-9]/g, '');

    if (cleanNoSpacesInput === sCodeClean || cleanNoSpacesInput === sNameClean) {
      return sCode;
    }

    if (extractedNumber && extractedNumber === sCode) {
      if (farmCode) {
        const matchesFarm = sName.includes(farmCode.toUpperCase()) || String(s.farmId?.code || s.farmId || '').toUpperCase().includes(farmCode.toUpperCase());
        if (matchesFarm) {
          return sCode;
        }
      } else {
        let score = 0.8;
        if (score > highestScore) {
          highestScore = score;
          bestMatch = sCode;
        }
      }
    }

    let similarity = getSimilarityScore(cleanInput, sName);
    if (farmCode && (sName.includes(farmCode.toUpperCase()) || String(s.farmId?.code || s.farmId || '').toUpperCase().includes(farmCode.toUpperCase()))) {
      similarity += 0.1;
    }
    if (similarity > highestScore) {
      highestScore = similarity;
      bestMatch = sCode;
    }
  }

  if (highestScore > 0.65) {
    return bestMatch;
  }

  if (extractedNumber) {
    return extractedNumber;
  }

  return null;
};

// Helper to extract raw text value from Excel cell (handling strings, formatted richText objects, formulas, etc.)
const getCellStringValue = (cellValue) => {
  if (cellValue === undefined || cellValue === null) return '';
  if (typeof cellValue === 'object') {
    if (cellValue.richText) {
      return cellValue.richText.map(t => t.text).join('').trim();
    } else if (cellValue.text) {
      return String(cellValue.text).trim();
    } else if (cellValue.result !== undefined && cellValue.result !== null) {
      return String(cellValue.result).trim();
    }
    return '';
  }
  return String(cellValue).trim();
};

// Map familiar/alias Excel column headers to standard schema keys
const getStandardHeaderKey = (headerValue) => {
  const rawStr = getCellStringValue(headerValue);
  if (!rawStr) return '';
  const clean = rawStr.toLowerCase().replace(/[^a-z0-9?]/g, '');
  
  const aliases = {
    tag: ['tag', 'tagid', 'tag_id', 'tagno', 'tagnumber', 'animaltag', 'animaltagid', 'tagnum', 'tag id', 'tag number', 'animal tag'],
    shed: ['shed', 'shedno', 'shednumber', 'shedid', 'shed number', 'shed no', 'shed id'],
    cattle: ['cattle', 'cattletype', 'animaltype', 'type', 'animal', 'cattle type', 'animal type'],
    breed: ['breed', 'breedtype', 'breed type'],
    gender: ['gender', 'sex'],
    'date of birth': ['dateofbirth', 'dob', 'birthdate', 'birth date', 'date of birth'],
    'sire id': ['sireid', 'fatherid', 'siresid', 'sire id', 'father id'],
    'sire breed': ['sirebreed', 'fatherbreed', 'sire breed', 'father breed'],
    'dame id': ['dameid', 'motherid', 'damesid', 'dame id', 'mother id'],
    'dame breed': ['damebreed', 'motherbreed', 'dame breed', 'mother breed'],
    'farm born?': ['farmborn', 'farmborn?', 'farm born', 'farm born?'],
    calving: ['calving', 'calvings', 'noofcalving', 'noofcalvings', 'calvingcount', 'calving count', 'no of calvings'],
    remarks: ['remarks', 'remark', 'note', 'notes', 'reason', 'reasonforsale', 'reason for sale'],
    age: ['age', 'animalage', 'animal age'],
    buyerName: ['buyer', 'buyername', 'buyer name', 'purchaser', 'purchasername', 'purchaser name'],
    buyerPhone: ['contact', 'phone', 'buyerphone', 'buyercontact', 'buyer phone', 'buyer contact', 'contactnumber', 'contact number'],
    salePrice: ['price', 'saleprice', 'amount', 'sale price', 'sale amount'],
    date: ['saledate', 'date', 'sale date']
  };

  for (const [standardKey, list] of Object.entries(aliases)) {
    const cleanList = list.map(item => item.replace(/[^a-z0-9?]/g, ''));
    if (cleanList.includes(clean)) {
      return standardKey;
    }
  }
  return clean; // Fallback to raw normalized if no alias matched
};

const AnimalDetailspg = ({ moduleConfig }) => {

const router = useRouter();

const [showForm, setShowForm] = useState(false);
const [logs, setLogs] = useState([]);
const [pendingPurchases, setPendingPurchases] = useState([]);
const [pendingCalves, setPendingCalves] = useState([]);
const [pendingImports, setPendingImports] = useState([]);
const [rawShedsList, setRawShedsList] = useState([]);
const [allowedSheds, setAllowedSheds] = useState(new Set());
const [allowedBreeds, setAllowedBreeds] = useState(new Set());
const [allowedAnimals, setAllowedAnimals] = useState(new Set());
const [selectedEntry, setSelectedEntry] = useState(null);
const [viewMode, setViewMode] = useState(false);
const [isEditing, setIsEditing] = useState(false);
const [isLoading, setIsLoading] = useState(false);

const [filters, setFilters] = useState([
  { field: "entryDate", value: "" }
]);
const [showFilters, setShowFilters] = useState(false);
const [currentPage, setCurrentPage] = useState(1);
const [livestockSubTab, setLivestockSubTab] = useState('ACTIVE');
const [crossingSubTab, setCrossingSubTab] = useState('PENDING');
const itemsPerPage = 10;

// MODULE ROUTING (PILL TABS)
const modules = [
  { id: 'livestock', name: 'Live Stock', icon: '🐄', path: '/animals' }
];

const [dynamicShedOptions, setDynamicShedOptions] = useState(null);
const [farmsList, setFarmsList] = useState([]);

useEffect(() => {
  let isMounted = true;
  Promise.all([
    api.sheds.getAll(),
    api.breeds.getAll(),
    api.animals.getAll()
  ]).then(([sheds, breeds, animals]) => {
    if (isMounted) {
      setRawShedsList(sheds || []);
      const shedSet = new Set();
      (sheds || []).forEach(s => {
        if (s.name) shedSet.add(String(s.name).trim().toUpperCase());
        if (s.code) shedSet.add(String(s.code).trim().toUpperCase());
      });
      setAllowedSheds(shedSet);
      const breedMap = new Map();
      (breeds || []).forEach(b => {
        const name = String(b.name || '').trim();
        if (name) breedMap.set(name.toUpperCase(), name);
      });
      setAllowedBreeds(breedMap);
      
      const animalMap = new Map();
      const animalNames = (animals || []).map(a => String(a.name || a.code || '').trim()).filter(Boolean);
      if (animalNames.length === 0) {
        ['Cow', 'Buffalo', 'Buffalo Calf', 'Cow Calf', 'Calf'].forEach(name => {
          animalMap.set(name.toUpperCase(), name);
        });
      } else {
        animalNames.forEach(name => {
          animalMap.set(name.toUpperCase(), name);
        });
      }
      setAllowedAnimals(animalMap);
      fetchLogs();
    }
  }).catch(console.error);
  return () => { isMounted = false; };
}, [logs.length]);

useEffect(() => {
  let isMounted = true;
  api.farms.getAll().then(res => {
    if (isMounted && Array.isArray(res)) {
      setFarmsList(res);
    }
  }).catch(console.error);
  return () => { isMounted = false; };
}, []);

useEffect(() => {
  const hasShedField = (moduleConfig?.fields || []).some(f => ['shed', 'oldShed', 'newShed', 'shedId'].includes(f.name));
  if (hasShedField) {
    api.sheds.getAll().then(sheds => {
      setDynamicShedOptions(sheds.map(s => s.name));
    }).catch(console.error);
  }
}, [moduleConfig?.id]);

const current = moduleConfig || { id: 'unknown', name: 'Unknown', fields: [] };
const currentFields = current.fields.map(f => {
  if (['shed', 'oldShed', 'newShed', 'shedId'].includes(f.name) && dynamicShedOptions) {
    return { ...f, options: dynamicShedOptions.length > 0 ? dynamicShedOptions : ['-'] };
  }
  return f;
});

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const workbook = new ExcelJS.Workbook();
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const buffer = event.target.result;
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
          swalError("Error", "No worksheet found in the Excel file.");
          return;
        }

        const rows = [];
        
        // Find header row dynamically (look for the row containing the "tag" column)
        let headerRowNumber = 1;
        let foundHeader = false;
        
        for (let r = 1; r <= Math.min(worksheet.rowCount || 0, 10); r++) {
          const row = worksheet.getRow(r);
          const cellCount = Math.max(worksheet.columnCount || 0, row.cellCount || 0, 50);
          for (let c = 1; c <= cellCount; c++) {
            const val = getCellStringValue(row.getCell(c).value);
            const standardHeader = getStandardHeaderKey(val);
            if (standardHeader === 'tag') {
              headerRowNumber = r;
              foundHeader = true;
              break;
            }
          }
          if (foundHeader) break;
        }

        const headerRow = worksheet.getRow(headerRowNumber);
        const headers = [];
        const maxCols = Math.max(worksheet.columnCount || 0, headerRow.cellCount || 0, 50);

        for (let colNumber = 1; colNumber <= maxCols; colNumber++) {
          const cellValue = headerRow.getCell(colNumber).value;
          headers[colNumber] = getStandardHeaderKey(cellValue);
        }

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber <= headerRowNumber) return; // skip header and any preceding banner/empty rows
          const rowData = {};
          let hasAnyData = false;
          for (let colNumber = 1; colNumber <= maxCols; colNumber++) {
            const header = headers[colNumber];
            if (header) {
              const cellValue = row.getCell(colNumber).value;
              const val = getCellStringValue(cellValue);
              if (val !== '') {
                rowData[header] = val;
                hasAnyData = true;
              }
            }
          }
          if (hasAnyData) {
            rows.push(rowData);
          }
        });

        const uniqueParsed = [];
        const seenTags = new Set();
        for (const row of rows) {
          const tag = String(row['tag'] || '').trim();
          if (tag && !seenTags.has(tag)) {
            seenTags.add(tag);
            uniqueParsed.push(row);
          }
        }

        if (uniqueParsed.length === 0) {
          swalError("No valid rows", "Could not find any rows with a 'tag' column.");
          return;
        }

        const confirmImport = await swalConfirm(
          "Import Logs",
          `Found ${uniqueParsed.length} unique records to import. Proceed?`
        );
        if (!confirmImport) return;

        setIsLoading(true);
        let successCount = 0;
        let errorCount = 0;
        const errorDetails = [];

        if (current.id === 'sale') {
          // --- SALE LOG IMPORT PIPELINE ---
          const cattleList = await api.cattle.getAll();
          const activeCattle = Array.isArray(cattleList) ? cattleList : (cattleList?.data ?? []);

          for (const row of uniqueParsed) {
            try {
              const rawTag = String(row['tag'] || '').trim();
              const rawBuyer = String(row['buyerName'] || '').trim();
              const rawPhone = String(row['buyerPhone'] || '').trim();
              const rawPrice = Number(row['salePrice'] || 0);
              const rawRemarks = String(row['remarks'] || '').trim();
              
              let rawDate = null;
              if (row['date']) {
                const parsedDate = parseDateString(row['date']);
                if (parsedDate && !isNaN(parsedDate.getTime())) {
                  rawDate = parsedDate;
                }
              }
              const finalDate = rawDate || new Date();

              const payload = {
                tag: rawTag,
                tagId: rawTag,
                buyerName: rawBuyer || 'Unknown Buyer',
                buyerPhone: rawPhone || '0000000000',
                salePrice: rawPrice,
                remarks: rawRemarks || 'Excel Import Sale Log',
                date: finalDate
              };

              // 1. Write the entry in Sale Log
              await api.sale.create(payload);

              // 2. Find matching active animal and update status to SOLD and save saleDate
              const matchedAnimal = activeCattle.find(a => 
                String(a.tag || a.tagId || a.tag_id || '').trim().toUpperCase() === rawTag.toUpperCase()
              );
              if (matchedAnimal) {
                const animalId = matchedAnimal.id || matchedAnimal._id;
                await api.cattle.update(animalId, {
                  tagId: matchedAnimal.tag || matchedAnimal.tagId,
                  status: 'SOLD',
                  soldDate: finalDate,
                  isPendingDetails: false
                });
              }

              successCount++;
            } catch (err) {
              console.error(`Error importing sale log for ${row['tag']}:`, err);
              errorCount++;
            }
          }
        } else {
          // --- LIVE STOCK IMPORT PIPELINE ---
          const [suffixRulesRes, cattleListRes] = await Promise.all([
            api.tags.getAllSuffixes().catch(() => []),
            api.cattle.getAll().catch(() => [])
          ]);
          const suffixRules = Array.isArray(suffixRulesRes) ? suffixRulesRes : (suffixRulesRes?.data ?? []);
          const activeCattle = Array.isArray(cattleListRes) ? cattleListRes : (cattleListRes?.data ?? []);

          for (const row of uniqueParsed) {
            try {
              const rawTag = String(row['tag'] || '').trim();
              const rawShed = String(row['shed'] || '-').trim();
              
              let rawCattle = String(row['cattle'] || '').trim().toUpperCase();
              if (rawCattle === 'B.CALF') {
                rawCattle = 'BUFFALO';
              } else if (rawCattle === 'CATTLE') {
                rawCattle = 'COW';
              }

              const rawGender = String(row['gender'] || '').trim();
              const rawBreed = String(row['breed'] || '').trim();
              
              let rawDOB = null;
              if (row['date of birth'] || row['dob']) {
                const parsedD = parseDateString(row['date of birth'] || row['dob']);
                if (parsedD && !isNaN(parsedD.getTime())) {
                  rawDOB = parsedD;
                }
              }

              const rawSireId = String(row['sire id'] || '').trim();
              const rawSireBreed = String(row['sire breed'] || '').trim();
              const rawDameId = String(row['dame id'] || '').trim();
              const rawDameBreed = String(row['dame breed'] || '').trim();
              const rawFarmBorn = String(row['farm born?'] || row['farm born'] || 'No').trim();
              
              const rawCalvings = Number(row['calving'] || row['calvings']) || 0;
              const rawRemarks = String(row['remarks'] || '').trim();
              const rawAge = String(row['age'] || '').trim();

              if (!rawDOB) {
                const tagDob = extractDOBFromTag(rawTag);
                if (tagDob && !isNaN(tagDob.getTime())) {
                  rawDOB = tagDob;
                } else if (rawAge) {
                  const computed = calculateDOBFromAge(rawAge);
                  if (computed && !isNaN(computed.getTime())) {
                    rawDOB = computed;
                  }
                }
              }

              // AI Smart Matcher checks & auto-corrections
              const activeFarmCode = moduleConfig?.farmCode || router.query.code || '';
              const matchedShed = resolveShedNumber(rawShed, rawShedsList, activeFarmCode);
              const matchedBreed = findSmartMatch(rawBreed, allowedBreeds);
              
              // 1. Resolve Calf Type first if tag contains "calf"
              const resolvedCalf = resolveCalfType(rawTag, rawCattle, rawBreed, rawSireBreed, rawDameBreed, rawDameId, activeCattle, suffixRules);

              // 2. Dynamic auto-detect animal type from suffix rules based on tag suffix
              let suffixType = null;
              const cleanTag = rawTag.toUpperCase();
              for (const r of suffixRules) {
                const suff = String(r.suffix).toUpperCase();
                if (cleanTag.endsWith(suff)) {
                  suffixType = r.animalType;
                  break;
                }
              }
              const typeToMatch = resolvedCalf || suffixType || rawCattle;
              const matchedCattle = findSmartMatch(typeToMatch, allowedAnimals);

              const finalShed = matchedShed || rawShed;
              const finalBreed = matchedBreed || rawBreed;
              const finalCattle = matchedCattle || typeToMatch || 'COW';

              const finalStatus = resolveStatusFromInfo(rawTag, rawRemarks, row['status'] || 'ACTIVE');
              const isDeadOrSold = finalStatus === 'DECEASED' || finalStatus === 'SOLD';

              const isShedValid = matchedShed !== null;
              const isBreedValid = matchedBreed !== null;
              const isAnimalValid = matchedCattle !== null;
              const isDOBValid = rawDOB !== null && rawDOB !== undefined && !isNaN(rawDOB.getTime());
              const isInvalid = !isDeadOrSold && (!isShedValid || !isBreedValid || !isAnimalValid || !isDOBValid);

              const payload = {
                tag: rawTag,
                tagId: rawTag,
                code: `CTL-${Date.now()}-${Math.floor(Math.random()*100000)}`,
                farmId: moduleConfig?.farmCode || router.query.code || null,
                shed: finalShed,
                shedId: finalShed,
                cattleType: finalCattle,
                animalType: finalCattle,
                gender: rawGender,
                breed: finalBreed,
                dateOfBirth: rawDOB,
                sireId: rawSireId === '-' ? '' : rawSireId,
                sireBreed: rawSireBreed === '-' ? '' : rawSireBreed,
                dameId: rawDameId === '-' ? '' : rawDameId,
                dameBreed: rawDameBreed === '-' ? '' : rawDameBreed,
                farmBorn: rawFarmBorn,
                calvings: rawCalvings,
                remarks: rawRemarks,
                age: rawAge,
                status: finalStatus,
                isPendingDetails: isInvalid,
                onboardingType: isInvalid ? 'IMPORT' : undefined
              };

              // If it's classified as Deceased / Dead during Excel import, register it
              await api.cattle.create(payload);

              // Auto-create Sale Log if status resolved to SOLD
              if (finalStatus === 'SOLD') {
                try {
                  const priceMatch = rawRemarks.match(/(\d+)\s*(?:RS|RUPEES|INR|PRICE|AMT|AMOUNT)/i) || rawRemarks.match(/(?:RS|RUPEES|INR|PRICE|AMT|AMOUNT)\.?\s*(\d+)/i);
                  const salePrice = priceMatch ? Number(priceMatch[1]) : 0;
                  
                  await api.sale.create({
                    tag: rawTag,
                    tagId: rawTag,
                    buyerName: 'Auto Classified from Remarks',
                    buyerPhone: '0000000000',
                    salePrice: salePrice,
                    remarks: rawRemarks || 'Excel Import Auto Sale Log',
                    date: new Date()
                  });
                } catch (saleErr) {
                  console.error("Failed to auto-create Sale Log during Excel import:", saleErr);
                }
              }

              successCount++;
            } catch (err) {
              console.error(`Error importing tag ${row['tag']}:`, err);
              errorDetails.push(`Tag ${row['tag'] || 'unknown'}: ${err.message || err || 'Unknown error'}`);
              errorCount++;
            }
          }
        }

        swalSuccess(
          "Import Complete",
          `Successfully imported ${successCount} records. Errors: ${errorCount}.`
        );
        fetchLogs();
      } catch (err) {
        console.error("Failed to parse Excel file:", err);
        swalError("Error", "Failed to parse the Excel file.");
      } finally {
        setIsLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

const storageKey = `global_${current.id}_logs`;

const fetchLogs = async () => {

  setIsLoading(true);
  try {
    let data = [];
    if (current.id === 'livestock') {
      data = await api.cattle.getAll();
    } else if (current.id === 'crossing') {
      data = await api.crossing.getAll();
    } else if (current.id === 'shed') {
      data = await api.shed.getAll();
    } else if (current.id === 'purchase') {
      data = await api.purchase.getAll();
    } else if (current.id === 'sale') {
      data = await api.sale.getAll();
    } else if (current.id === 'health') {
      data = await api.health.treatments.getAll();
    } else if (current.id === 'vaccine') {
      data = await api.health.vaccinations.getAll();
    } else {
      const savedData = localStorage.getItem(storageKey);
      data = savedData ? JSON.parse(savedData) : [];
    }

    // Unwrap various response shapes defensively:
    // 1. Plain array (normal API success)
    // 2. { data: [...] } envelope
    // 3. { firewallBlocked: true, data: [] } — silently blocked
    let rawList;
    if (Array.isArray(data)) {
      rawList = data;
    } else if (data && Array.isArray(data.data)) {
      rawList = data.data;
    } else {
      rawList = [];
    }

    const normalizedData = rawList.map(log => {
      const dateValue = log.createdAt || log.entryDate || log.date || log.shiftingDate || log.purchaseDate || log.crossingDate;
      const formattedDate = dateValue ? formatDateToDDMMYYYY(dateValue) : "";
      
      let initialDob = log.dateOfBirth || log.dob || "";
      if (initialDob === '-' || initialDob === 'null') initialDob = "";

      return {
        ...log,
        dateOfBirth: initialDob,
        dob: initialDob,
        calvings: log.calvings !== undefined && log.calvings !== null && log.calvings !== "" && log.calvings !== "-" ? Number(log.calvings) : 0,
        purchaseFrom: log.purchaseFrom || log.sellerName || '',
        purchasePrice: log.purchasePrice || log.price || 0,
        sellerName: log.sellerName || log.purchaseFrom || '',
        price: log.price || log.purchasePrice || 0,
        tag: log.tag || log.tag_id || log.tagId || '',
        tagId: log.tagId || log.tag_id || log.tag || '',
        entryDate: formattedDate || log.entryDate || '-'
      };
    });

    // ── Enrich health/vaccine records with animalType + shed from livestock ──
    // Existing records may not have animalType/shedId stored — look them up
    // by tagId against the livestock registry so columns always show data.
    if (current.id === 'health' || current.id === 'vaccine') {
      let livestockMap = {};
      try {
        const cached = sessionStorage.getItem('__livestock_tag_cache__');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.list)) {
            parsed.list.forEach(a => {
              const key = String(a.tag_id || a.tag || '').trim().toUpperCase();
              if (key) livestockMap[key] = a;
            });
          }
        }
      } catch (_) {}

      // Cache miss — fetch from API
      if (Object.keys(livestockMap).length === 0) {
        try {
          const lsData = await api.cattle.getAll();
          const lsList = Array.isArray(lsData) ? lsData : (lsData?.data ?? []);
          lsList.forEach(a => {
            const key = String(a.tag_id || a.tag || '').trim().toUpperCase();
            if (key) livestockMap[key] = a;
          });
        } catch (_) {}
      }

      const enriched = normalizedData.map(log => {
        const tagKey = String(log.tagId || log.tag_id || log.tag || '').trim().toUpperCase();
        const animal = tagKey ? livestockMap[tagKey] : null;
        return {
          ...log,
          animalType: log.animalType || log.animalId || (animal ? (animal.animalType || animal.cattleType || '') : ''),
          shedId:     log.shedId || log.shed || (animal ? (animal.shed || animal.shedId || '') : ''),
        };
      });
      setLogs(enriched);
      setPendingPurchases([]);
      setPendingCalves([]);
      setPendingImports([]);
      return;
    }

    if (current.id === 'livestock') {
      normalizedData.forEach(log => {
        const tagVal = log.tag || log.tagId || '';
        const remarksVal = log.remarks || '';
        const resolvedStatus = resolveStatusFromInfo(tagVal, remarksVal, log.status);
        
        let statusChanged = false;
        if (resolvedStatus !== log.status) {
          log.status = resolvedStatus;
          statusChanged = true;
        }

        let dobChanged = false;
        if (!log.dateOfBirth || log.dateOfBirth === '-' || String(log.dateOfBirth).trim() === '') {
          const extracted = extractDOBFromTag(tagVal);
          if (extracted) {
            log.dateOfBirth = extracted.toISOString().split('T')[0];
            log.dob = log.dateOfBirth;
            dobChanged = true;
          } else if (log.age) {
            const computed = calculateDOBFromAge(log.age);
            if (computed) {
              log.dateOfBirth = computed.toISOString().split('T')[0];
              log.dob = log.dateOfBirth;
              dobChanged = true;
            }
          }
        }

        const wasPending = log.isPendingDetails === true || String(log.isPendingDetails) === 'true';
        if (wasPending) {
          if (resolvedStatus === 'DECEASED' || resolvedStatus === 'SOLD') {
            log.isPendingDetails = false;
            api.cattle.update(log._id || log.id, { 
              status: resolvedStatus, 
              isPendingDetails: false,
              ...(dobChanged ? { dateOfBirth: log.dateOfBirth } : {})
            }).catch(console.error);

            if (resolvedStatus === 'SOLD') {
              api.sale.getAll().then(async (sales) => {
                const salesList = Array.isArray(sales) ? sales : (sales?.data ?? []);
                const alreadyHasSale = salesList.some(s => 
                  String(s.tag || s.tagId || '').trim().toUpperCase() === tagVal.trim().toUpperCase()
                );
                if (!alreadyHasSale) {
                  const priceMatch = remarksVal.match(/(\d+)\s*(?:RS|RUPEES|INR|PRICE|AMT|AMOUNT)/i) || remarksVal.match(/(?:RS|RUPEES|INR|PRICE|AMT|AMOUNT)\.?\s*(\d+)/i);
                  const salePrice = priceMatch ? Number(priceMatch[1]) : 0;
                  await api.sale.create({
                    tag: tagVal,
                    tagId: tagVal,
                    buyerName: 'Auto Classified from Remarks',
                    buyerPhone: '0000000000',
                    salePrice: salePrice,
                    remarks: remarksVal || 'Auto resolved from import remarks keyword',
                    date: new Date()
                  });
                }
              }).catch(console.error);
            }
          } else {
            const isShedOk = log.shed && allowedSheds.has(String(log.shed).toUpperCase());
            const isBreedOk = log.breed && allowedBreeds.has(String(log.breed).toUpperCase());
            const isAnimalOk = log.cattleType && allowedAnimals.has(String(log.cattleType).toUpperCase());
            const isDOBOk = log.dateOfBirth && log.dateOfBirth !== '-' && String(log.dateOfBirth).trim() !== '';

            if (isShedOk && isBreedOk && isAnimalOk && isDOBOk) {
              log.isPendingDetails = false;
              api.cattle.update(log._id || log.id, { 
                isPendingDetails: false,
                ...(dobChanged ? { dateOfBirth: log.dateOfBirth } : {})
              }).catch(console.error);
            }
          }
        } else if (statusChanged) {
          api.cattle.update(log._id || log.id, { 
            status: resolvedStatus,
            ...(dobChanged ? { dateOfBirth: log.dateOfBirth } : {})
          }).catch(console.error);
        }
      });

      const isPending = (log) => {
        return log.isPendingDetails === true || String(log.isPendingDetails) === 'true';
      };

      const pending = normalizedData.filter(isPending);
      const active  = normalizedData.filter(log => !isPending(log));
      
      const imports = pending.filter(log => log.onboardingType === 'IMPORT');
      const calves = pending.filter(log => (log.onboardingType === 'CALVING' || (log.dameId && String(log.dameId).trim() !== '')) && log.onboardingType !== 'IMPORT');
      const purchases = pending.filter(log => !calves.includes(log) && !imports.includes(log));
      
      setPendingPurchases(purchases);
      setPendingCalves(calves);
      setPendingImports(imports);
      setLogs(active);
    } else {
      setLogs(normalizedData);
      setPendingPurchases([]);
      setPendingCalves([]);
      setPendingImports([]);
    }
  } catch (e) {
    console.error(`Error loading logs for ${current.id}:`, e);
    setLogs([]);
  } finally {
    setIsLoading(false);
  }
};


useEffect(() => {
  if (!moduleConfig) return;
  fetchLogs();
  setFilters([{ field: "entryDate", value: "" }]);
  setCurrentPage(1);
}, [moduleConfig, current.id]);

useEffect(() => {
  const modalOpen =
    showForm ||
    selectedEntry ||
    viewMode ||
    showFilters;

  const footer = document.getElementById("main-footer");

  if (footer) {
    footer.style.display = modalOpen ? "none" : "block";
  }

  return () => {
    if (footer) {
      footer.style.display = "block";
    }
  };
}, [showForm, selectedEntry, viewMode, showFilters]);


if (!moduleConfig) {
  return (
    <div className="p-20 text-center bg-white min-h-screen">
      <h1 className="text-2xl font-bold text-red-600">Configuration Error</h1>
      <p className="text-gray-500">The moduleConfig prop is missing in the page file.</p>
    </div>
  );
}

 
  const activeCount = logs.filter(log => {
    const statusUpper = String(log.status || '').toUpperCase();
    return statusUpper !== 'SOLD' && statusUpper !== 'DECEASED' && statusUpper !== 'DEAD';
  }).length;
  const soldCount = logs.filter(log => String(log.status || '').toUpperCase() === 'SOLD').length;
  const deceasedCount = logs.filter(log => {
    const statusUpper = String(log.status || '').toUpperCase();
    return statusUpper === 'DECEASED' || statusUpper === 'DEAD';
  }).length;

  const crossingPendingCount = logs.filter(log => {
    const pregStatus = String(log.pregnancyStatus || log['pregnancy status'] || '').toUpperCase();
    return pregStatus === 'PENDING' || pregStatus === '' || !pregStatus;
  }).length;
  const crossingPositiveCount = logs.filter(log => {
    const pregStatus = String(log.pregnancyStatus || log['pregnancy status'] || '').toUpperCase();
    return pregStatus === 'POSITIVE';
  }).length;
  const crossingNegativeCount = logs.filter(log => {
    const pregStatus = String(log.pregnancyStatus || log['pregnancy status'] || '').toUpperCase();
    return pregStatus === 'NEGATIVE';
  }).length;

  const filteredLogs = logs.filter(log => {
    if (current.id === 'livestock') {
      const statusUpper = String(log.status || '').toUpperCase();
      if (livestockSubTab === 'ACTIVE') {
        if (statusUpper === 'SOLD' || statusUpper === 'DECEASED' || statusUpper === 'DEAD') return false;
      } else if (livestockSubTab === 'SOLD') {
        if (statusUpper !== 'SOLD') return false;
      } else if (livestockSubTab === 'DECEASED') {
        if (statusUpper !== 'DECEASED' && statusUpper !== 'DEAD') return false;
      } else if (livestockSubTab === 'WARNINGS') {
        return false;
      }
    }
    if (current.id === 'crossing') {
      const pregStatus = String(log.pregnancyStatus || log['pregnancy status'] || '').toUpperCase();
      if (crossingSubTab === 'PENDING') {
        if (pregStatus !== 'PENDING' && pregStatus !== '') return false;
      } else if (crossingSubTab === 'POSITIVE') {
        if (pregStatus !== 'POSITIVE') return false;
      } else if (crossingSubTab === 'NEGATIVE') {
        if (pregStatus !== 'NEGATIVE') return false;
      }
    }
    // Group active filters by field name
    const groupedFilters = {};
    for (const f of filters) {
      const fieldConfig = currentFields.find(field => field.name === f.field);
      const isDate = fieldConfig?.type === "date" || f.field === "entryDate" || f.field.toLowerCase().includes("date") || f.field.toLowerCase() === "dob";
      const isRange = fieldConfig?.type === "number";
      const hasValue = isDate || isRange ? (f.from || f.to) : (f.value && (Array.isArray(f.value) ? f.value.length > 0 : String(f.value).trim() !== ""));
      if (!hasValue) continue;

      if (!groupedFilters[f.field]) {
        groupedFilters[f.field] = [];
      }
      groupedFilters[f.field].push(f);
    }

    let isMatched = true;
    for (const fieldName in groupedFilters) {
      const fieldFilters = groupedFilters[fieldName];
      let matchAnyForField = false;

      for (const f of fieldFilters) {
        let currentMatch = true;
        const fieldConfig = currentFields.find(field => field.name === f.field);

        // 📅 DATE RANGE FILTER
        if (fieldConfig?.type === "date" || f.field === "entryDate" || f.field.toLowerCase().includes("date") || f.field.toLowerCase() === "dob") {
          const logDate = log[f.field] || (f.field === 'entryDate' ? log.date : null);
          if (!logDate) {
            currentMatch = false;
          } else {
            const current = parseDateString(logDate);
            if (!current || isNaN(current.getTime())) {
              currentMatch = false;
            } else {
              current.setHours(0, 0, 0, 0);

              if (f.from) {
                const fromDate = parseDateString(f.from);
                if (fromDate) {
                  fromDate.setHours(0, 0, 0, 0);
                  if (current < fromDate) currentMatch = false;
                }
              }

              if (f.to) {
                const toDate = parseDateString(f.to);
                if (toDate) {
                  toDate.setHours(0, 0, 0, 0);
                  if (current > toDate) currentMatch = false;
                }
              }
            }
          }
        }
        // 🔢 RANGE FILTER FOR NUMBER FIELDS
        else if (fieldConfig?.type === "number") {
          const valStr = String(log[f.field] || "").trim();
          const valNum = parseFloat(valStr.replace(/[^0-9.]/g, ''));
          if (isNaN(valNum)) {
            currentMatch = false;
          } else {
            if (f.from) {
              const fromNum = parseFloat(f.from);
              if (!isNaN(fromNum) && valNum < fromNum) currentMatch = false;
            }
            if (f.to) {
              const toNum = parseFloat(f.to);
              if (!isNaN(toNum) && valNum > toNum) currentMatch = false;
            }
          }
        }
        // 🔁 MULTI-SELECT CHECKBOX MATCH
        else if (fieldConfig?.type === "select") {
          const selectedValues = Array.isArray(f.value) ? f.value : (f.value ? [f.value] : []);
          if (selectedValues.length > 0) {
            const recordVal = String(log[f.field] || "").toLowerCase();
            const optionMatched = selectedValues.some(v => String(v).toLowerCase() === recordVal || recordVal.includes(String(v).toLowerCase()));
            if (!optionMatched) currentMatch = false;
          }
        }
        else {
          // 🔁 NORMAL FILTER
          if (f.value) {
            currentMatch = String(log[f.field] || "")
              .toLowerCase()
              .includes(f.value.toLowerCase());
          }
        }

        if (currentMatch) {
          matchAnyForField = true;
          break; // Matches at least one filter for this field
        }
      }

      if (!matchAnyForField) {
        isMatched = false;
        break; // Fails this field, so fail the whole check
      }
    }
    return isMatched;
  });

  const totalItems = filteredLogs.length;

const startIndex = (currentPage - 1) * itemsPerPage;
const endIndex = startIndex + itemsPerPage;

const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
const activeFilterCount = filters.filter(
  f => (f.value && f.value.trim() !== "") || f.from || f.to
).length;


  const saveToStorage = (updatedLogs) => {
    setLogs(updatedLogs);
    localStorage.setItem(`global_${current.id}_logs`, JSON.stringify(updatedLogs));
  };


  const calculateAge = (dob) => {
  if (!dob) return "";

  const birth = parseDateString(dob);
  if (!birth || isNaN(birth.getTime())) return "";
  const today = new Date();
  if (birth > today) {
      return "Invalid Date";
  
    }

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();

  // Adjust days
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }

  // Adjust months
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  let ageText = `${years} Y`;

  if (months > 0) ageText += ` ${months} M`;
  if (days > 0) ageText += ` ${days} D`;

  return ageText;
};

const calculateDOBFromAge = (ageStr) => {
  if (!ageStr) return null;
  const cleanAge = String(ageStr).trim().toUpperCase();
  if (!cleanAge) return null;

  let years = 0;
  let months = 0;
  let days = 0;

  // Matches patterns like "0 Y, 1 M, 5 D" or "0Y 1M 5D" or "0 Yrs 1 Mos"
  const yearsMatch = cleanAge.match(/(\d+)\s*(?:Y|YRS|YEAR|YEARS)/);
  const monthsMatch = cleanAge.match(/(\d+)\s*(?:M|MOS|MONTH|MONTHS)/);
  const daysMatch = cleanAge.match(/(\d+)\s*(?:D|DAYS)/);

  if (yearsMatch) {
    years = parseInt(yearsMatch[1], 10);
  }
  if (monthsMatch) {
    months = parseInt(monthsMatch[1], 10);
  }
  if (daysMatch) {
    days = parseInt(daysMatch[1], 10);
  }

  // Fallback: If it's a simple decimal number (e.g., "1.5")
  if (!yearsMatch && !monthsMatch && !daysMatch && /^\d+(?:\.\d+)?$/.test(cleanAge)) {
    const val = parseFloat(cleanAge);
    years = Math.floor(val);
    months = Math.round((val - years) * 12);
  }

  if (years === 0 && months === 0 && days === 0) {
    return null;
  }

  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setMonth(d.getMonth() - months);
  d.setDate(d.getDate() - days);
  
  return d;
};

const extractDOBFromTag = (tag) => {
  if (!tag) return null;
  const cleanTag = String(tag).trim();
  const match = cleanTag.match(/(\d{8})$/);
  if (match) {
    const dateStr = match[1];
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1;
    const day = parseInt(dateStr.substring(6, 8), 10);
    
    if (year >= 1900 && year <= new Date().getFullYear() && month >= 0 && month < 12 && day > 0 && day <= 31) {
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
};

const resolveCalfType = (tag, cattle, breed, sireBreed, dameBreed, motherTag, activeCattle = [], suffixRules = []) => {
  const tagUpper = String(tag || '').toUpperCase();
  const cattleUpper = String(cattle || '').toUpperCase();
  const breedUpper = String(breed || '').toUpperCase();
  const sireBreedUpper = String(sireBreed || '').toUpperCase();
  const dameBreedUpper = String(dameBreed || '').toUpperCase();
  const cleanMotherTag = String(motherTag || '').trim().toUpperCase();

  const isCalf = tagUpper.includes('CALF') || cattleUpper.includes('CALF') || tagUpper.includes('B.CALF') || tagUpper.includes('C.CALF') || cattleUpper.includes('B.CALF') || cattleUpper.includes('C.CALF');
  if (!isCalf) return null;

  if (tagUpper.includes('B.CALF') || cattleUpper.includes('B.CALF') || cattleUpper === 'B. CALF') {
    return 'Buffalo Calf';
  }
  if (tagUpper.includes('C.CALF') || cattleUpper.includes('C.CALF') || cattleUpper === 'C. CALF') {
    return 'Cow Calf';
  }

  const buffaloBreeds = ['MURRAH', 'BHURI', 'JAFFARABADI', 'NILI', 'MEHSANA', 'SURTI', 'BUFFALO', 'DESI BUFFALO', 'DESI-BUFFALO'];
  const cowBreeds = ['HF', 'JERSEY', 'GIR', 'SAHIWAL', 'KANKREJ', 'COW', 'DESI COW', 'DESI-COW'];

  // 1. Try mother lookup
  if (cleanMotherTag && activeCattle.length > 0) {
    const motherAnimal = activeCattle.find(a => 
      String(a.tag || a.tagId || a.tag_id || '').trim().toUpperCase() === cleanMotherTag
    );
    if (motherAnimal) {
      const mType = String(motherAnimal.cattleType || motherAnimal.animalType || '').toUpperCase();
      const mBreed = String(motherAnimal.breed || '').toUpperCase();
      if (mType.includes('BUFFALO') || buffaloBreeds.some(b => mBreed.includes(b))) {
        return 'Buffalo Calf';
      } else if (mType.includes('COW') || cowBreeds.some(c => mBreed.includes(c))) {
        return 'Cow Calf';
      }
    }
  }

  // 2. Try breed check of the calf itself
  if (buffaloBreeds.some(b => breedUpper.includes(b) || sireBreedUpper.includes(b) || dameBreedUpper.includes(b))) {
    return 'Buffalo Calf';
  }
  if (cowBreeds.some(c => breedUpper.includes(c) || sireBreedUpper.includes(c) || dameBreedUpper.includes(c))) {
    return 'Cow Calf';
  }

  // 3. Try suffix rules matching
  if (suffixRules && suffixRules.length > 0) {
    for (const r of suffixRules) {
      const suff = String(r.suffix).toUpperCase();
      if (tagUpper.endsWith(suff)) {
        const matchedType = String(r.animalType).toUpperCase();
        if (matchedType.includes('BUFFALO')) {
          return 'Buffalo Calf';
        } else if (matchedType.includes('COW')) {
          return 'Cow Calf';
        }
      }
    }
  }

  // 4. Try cattle column match
  if (cattleUpper.includes('BUFFALO')) {
    return 'Buffalo Calf';
  }
  if (cattleUpper.includes('COW')) {
    return 'Cow Calf';
  }

  return null;
};

const resolveStatusFromInfo = (tagId, remarks, currentStatus = 'ACTIVE') => {
  const cleanTag = String(tagId || '').toUpperCase();
  const cleanRemarks = String(remarks || '').toUpperCase();

  const deadKeywords = [
    'DEAD', 'DECEASED', 'DIED', 'EXPIRED', 'DEATH', 'MORTALITY', 
    'PASSED AWAY', 'PASSED-AWAY', 'KILLED', 'SLAUGHTERED', 
    'SACRIFICED', 'EXPIRY', 'CASUALTY'
  ];
  const soldKeywords = [
    'SOLD', 'SALE', 'DISPOSED', 'MARKETED', 'AUCTIONED', 
    'VEND', 'PURCHASED BY'
  ];

  const hasDeadKeyword = deadKeywords.some(keyword => cleanTag.includes(keyword) || cleanRemarks.includes(keyword));
  if (hasDeadKeyword) {
    return 'DECEASED';
  }

  const hasSoldKeyword = soldKeywords.some(keyword => cleanTag.includes(keyword) || cleanRemarks.includes(keyword));
  if (hasSoldKeyword) {
    return 'SOLD';
  }
  
  const allowedStatuses = ['ACTIVE', 'PREGNANT', 'EMPTY', 'PENDING', 'SOLD', 'DECEASED'];
  const cleanCurrent = String(currentStatus).toUpperCase().trim();
  if (allowedStatuses.includes(cleanCurrent)) {
    return cleanCurrent;
  }

  return 'ACTIVE';
};


// Legacy syncToLivestock removed to prevent unnecessary localStorage operations


const handleSave = async (data) => {
  setIsLoading(true);
  try {
    if (['livestock', 'crossing', 'shed', 'purchase', 'sale', 'health', 'vaccine'].includes(current.id)) {
      const entryId = selectedEntry?.id || selectedEntry?._id;
      if (isEditing) {
        if (current.id === 'livestock') {
          const payload = { ...data, tagId: data.tag || data.tagId };
          payload.status = resolveStatusFromInfo(payload.tag || payload.tagId || '', payload.remarks || '', payload.status || selectedEntry?.status || 'ACTIVE');
          if (selectedEntry?.isPendingDetails === true || String(selectedEntry?.isPendingDetails) === 'true') {
            payload.isPendingDetails = false;
          }
          await api.cattle.update(entryId, payload);
          swalSuccess("Success", "Cattle details updated successfully!");
        } else if (current.id === 'crossing') {
          await api.crossing.update(entryId, data);
          swalSuccess("Success", "Crossing log updated successfully!");
          if (data.calfTag && String(data.calfTag).trim() !== '' && (!selectedEntry?.calfTag || selectedEntry.calfTag !== data.calfTag)) {
            setTimeout(async () => {
              const go = await swalConfirm(
                "🍼 Complete Calf Profile?",
                `A pending record for newborn Calf Tag [${data.calfTag}] has been added to Live Stock. Would you like to complete its profile now?`
              );
              if (go) {
                router.push('/animals');
              }
            }, 1000);
          }
        } else if (current.id === 'shed') {
          const payload = {
            ...data,
            shed: data.newShed && data.newShed !== '-' ? data.newShed : undefined,
            shedId: data.newShed && data.newShed !== '-' ? data.newShed : undefined,
          };
          await api.shed.update(entryId, payload);

          // Update corresponding animal's shed & farm in live stock
          const tagToSearch = String(data.tag || '').trim().toUpperCase();
          if (tagToSearch) {
            try {
              const [cattleList, shedsList] = await Promise.all([
                api.cattle.getAll(),
                api.sheds.getAll()
              ]);
              const rawList = Array.isArray(cattleList) ? cattleList : (cattleList?.data ?? []);
              const rawSheds = Array.isArray(shedsList) ? shedsList : (shedsList?.data ?? []);
              
              const animal = rawList.find(a => String(a.tag || a.tagId || a.tag_id || '').trim().toUpperCase() === tagToSearch);
              if (animal) {
                const newShedName = String(data.newShed || '').trim().toUpperCase();
                const matchingShedObj = rawSheds.find(s => 
                  String(s.name || '').trim().toUpperCase() === newShedName ||
                  String(s.code || '').trim().toUpperCase() === newShedName
                );
                
                let updatedFarmId = animal.farmId;
                if (matchingShedObj) {
                  const sFarmId = matchingShedObj.farmId?._id || matchingShedObj.farmId?.id || matchingShedObj.farmId;
                  if (sFarmId) {
                    updatedFarmId = sFarmId;
                  }
                }

                const animalId = animal.id || animal._id;
                const resolvedShed = data.newShed && data.newShed !== '-' ? data.newShed : '-';
                const updatedAnimal = {
                  ...animal,
                  tagId: animal.tag || animal.tagId,
                  shed: resolvedShed,
                  shedId: resolvedShed,
                  farmId: updatedFarmId,
                };
                await api.cattle.update(animalId, updatedAnimal);
              }
            } catch (err) {
              console.error("Failed to sync shed log to livestock:", err);
            }
          }

          swalSuccess("Success", "Shed log updated successfully!");
        } else if (current.id === 'purchase') {
          await api.purchase.update(entryId, data);
          swalSuccess("Success", "Purchase log updated successfully!");
        } else if (current.id === 'sale') {
          await api.sale.update(entryId, data);
          swalSuccess("Success", "Sale log updated successfully!");
        // } else if (current.id === 'health') {
        //   await api.health.treatments.update(entryId, data);
        //   swalSuccess("Success", "Treatment log updated successfully!");
        // }
        } else if (current.id === 'health') {

  const payload = {
    ...data,
    diagnosis: data.diagnosis?.trim() || "-"
  };

  await api.health.treatments.update(entryId, payload);
  swalSuccess("Success", "Treatment log updated successfully!");
}
        
        else if (current.id === 'vaccine') {
          const payload = { ...data };
          if (!payload.date) {
            payload.date = selectedEntry?.date || new Date().toISOString();
          }
          await api.health.vaccinations.update(entryId, payload);
          swalSuccess("Success", "Vaccination log updated successfully!");
        }
      } else {
        if (current.id === 'livestock') {
          // Prevent MongoDB duplicate key error on farmId_1_code_1 by ensuring uniqueness
          // Ensure required backend fields always have valid values
          const resolvedShed = data.shed && data.shed !== '' && data.shed !== '-' ? data.shed : (data.shedId || '-');
          const resolvedType = data.cattleType || data.animalType || 'COW';
          const payload = { 
            ...data,
            tagId: data.tag || data.tagId,
            code: data.code || `CTL-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            farmId: data.farmId || (moduleConfig.farmCode) || (router.query.code) || null,
            shed: resolvedShed,
            shedId: resolvedShed,
            cattleType: resolvedType,
            animalType: resolvedType,
          };
          payload.status = resolveStatusFromInfo(payload.tag || payload.tagId || '', payload.remarks || '', payload.status || 'ACTIVE');
          await api.cattle.create(payload);
          swalSuccess("Success", "Cattle registered successfully!");
        } else if (current.id === 'crossing') {
          await api.crossing.create(data);
          swalSuccess("Success", "Crossing log created successfully!");
          if (data.calfTag && String(data.calfTag).trim() !== '') {
            setTimeout(async () => {
              const go = await swalConfirm(
                "🍼 Complete Calf Profile?",
                `A pending record for newborn Calf Tag [${data.calfTag}] has been added to Live Stock. Would you like to complete its profile now?`
              );
              if (go) {
                router.push('/animals');
              }
            }, 1000);
          }
        } else if (current.id === 'shed') {
          const payload = {
            ...data,
            shed: data.newShed && data.newShed !== '-' ? data.newShed : undefined,
            shedId: data.newShed && data.newShed !== '-' ? data.newShed : undefined,
          };
          await api.shed.create(payload);

          // Update corresponding animal's shed & farm in live stock
          const tagToSearch = String(data.tag || '').trim().toUpperCase();
          if (tagToSearch) {
            try {
              const [cattleList, shedsList] = await Promise.all([
                api.cattle.getAll(),
                api.sheds.getAll()
              ]);
              const rawList = Array.isArray(cattleList) ? cattleList : (cattleList?.data ?? []);
              const rawSheds = Array.isArray(shedsList) ? shedsList : (shedsList?.data ?? []);
              
              const animal = rawList.find(a => String(a.tag || a.tagId || a.tag_id || '').trim().toUpperCase() === tagToSearch);
              if (animal) {
                const newShedName = String(data.newShed || '').trim().toUpperCase();
                const matchingShedObj = rawSheds.find(s => 
                  String(s.name || '').trim().toUpperCase() === newShedName ||
                  String(s.code || '').trim().toUpperCase() === newShedName
                );
                
                let updatedFarmId = animal.farmId;
                if (matchingShedObj) {
                  const sFarmId = matchingShedObj.farmId?._id || matchingShedObj.farmId?.id || matchingShedObj.farmId;
                  if (sFarmId) {
                    updatedFarmId = sFarmId;
                  }
                }

                const animalId = animal.id || animal._id;
                const resolvedShed = data.newShed && data.newShed !== '-' ? data.newShed : '-';
                const updatedAnimal = {
                  ...animal,
                  tagId: animal.tag || animal.tagId,
                  shed: resolvedShed,
                  shedId: resolvedShed,
                  farmId: updatedFarmId,
                };
                await api.cattle.update(animalId, updatedAnimal);
              }
            } catch (err) {
              console.error("Failed to sync shed log to livestock:", err);
            }
          }

          swalSuccess("Success", "Shed log created successfully!");
        } else if (current.id === 'purchase') {
          await api.purchase.create(data);
          swalSuccess("Success", "Purchase log created successfully!");
          const cleanTag = String(data.tag || '').trim().toUpperCase();
          setTimeout(async () => {
            const go = await swalConfirm(
              "🛍️ Complete Purchase Profile?",
              `A pending record for Tag [${cleanTag}] has been added to Live Stock. Would you like to complete its profile now?`
            );
            if (go) {
              router.push('/animals');
            }
          }, 1000);
        } else if (current.id === 'sale') {
          await api.sale.create(data);
          swalSuccess("Success", "Sale log created successfully!");
        // } else if (current.id === 'health') {
        //   await api.health.treatments.create(data);
        //   swalSuccess("Success", "Treatment log created successfully!");
        // } 
        } else if (current.id === 'health') {

  const payload = {
    ...data,
    diagnosis: data.diagnosis?.trim() || "-"
  };

  await api.health.treatments.create(payload);
  swalSuccess("Success", "Treatment log created successfully!");
}
        else if (current.id === 'vaccine') {
          const payload = { ...data };
          if (!payload.date) {
            payload.date = new Date().toISOString();
          }
          await api.health.vaccinations.create(payload);
          swalSuccess("Success", "Vaccination log created successfully!");
        }
      }
      try {
        sessionStorage.removeItem('__livestock_tag_cache__');
      } catch (err) {
        console.error("Non-blocking cache bust error:", err);
      }
      await fetchLogs();
    } else {
      // Local Storage Fallback for auxiliary logs
      if (isEditing) {
        const updated = logs.map(log => {
          if (log.id === selectedEntry.id) {
            return { ...log, ...data };
          }
          return log;
        });
        saveToStorage(updated);
        swalSuccess("Success", "Record updated successfully!");
      } else {
        const now = new Date();
        const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        const newLogs = [{
          ...data,
          id: new Date().getTime(),
          entryDate: formattedDate
        }, ...logs];
        saveToStorage(newLogs);
        swalSuccess("Success", "Record created successfully!");
      }
    }
    closeAllModals();
  } catch (error) {
    console.error("Save error:", error);
    swalError("Backend Error", (typeof error === 'string' ? error : error.message) || "Failed to save data. Please check backend schema.");
  } finally {
    setIsLoading(false);
  }
};






  /* ---------- EXPORT EXCEL ---------- */
  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(current.name);

    worksheet.columns = [
      { header: "Date", key: "entryDate", width: 15 },
      ...currentFields.map(field => ({
        header: field.label,
        key: field.name,
        width: 20
      }))
    ];

    filteredLogs.forEach(log => {
      worksheet.addRow({
        entryDate: log.entryDate,
        ...currentFields.reduce((acc, field) => {
          acc[field.name] = log[field.name];
          return acc;
        }, {})
      });
    });

    // Style the header row (row 1)
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "16223F" } // Brand Navy
      };
      cell.font = {
        name: "Segoe UI",
        bold: true,
        color: { argb: "FFFFFF" },
        size: 11
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "16223F" } },
        left: { style: "thin", color: { argb: "1E293B" } },
        bottom: { style: "medium", color: { argb: "1E293B" } },
        right: { style: "thin", color: { argb: "1E293B" } }
      };
    });
    headerRow.height = 28;

    // Style body rows and auto-adjust widths
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          cell.font = { name: "Segoe UI", size: 10 };
          cell.alignment = { vertical: "middle", horizontal: "left" };
          cell.border = {
            top: { style: "thin", color: { argb: "E2E8F0" } },
            left: { style: "thin", color: { argb: "E2E8F0" } },
            bottom: { style: "thin", color: { argb: "E2E8F0" } },
            right: { style: "thin", color: { argb: "E2E8F0" } }
          };
          if (rowNumber % 2 === 0) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "F8FAFC" } // Zebra striping
            };
          }
        });
        row.height = 20;
      }
    });

    // Auto-fit column widths based on maximum text length
    worksheet.columns.forEach((column) => {
      let maxLen = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const val = cell.value ? String(cell.value) : "";
        if (val.length > maxLen) {
          maxLen = val.length;
        }
      });
      column.width = Math.max(maxLen + 4, 15);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AnimalDetails_${current.name}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  /* ---------- EXPORT PDF ---------- */
  const exportPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "A4"
    });

    const columns = ["Date", ...currentFields.map(f => f.label)];
    const rows = filteredLogs.map(log => [
      log.entryDate,
      ...currentFields.map(f => log[f.name])
    ]);

    const img = new Image();
    img.src = "/LOGO.png";
    img.onload = () => {
      // Landscape A4 size is 842pt x 595pt
      // Place beautiful brand logo at top-left
      doc.addImage(img, "PNG", 20, 10, 40, 40);

      // Corporate title next to logo
      doc.setFontSize(16);
      doc.setTextColor(22, 34, 63); // Brand Navy
      doc.setFont("helvetica", "bold");
      doc.text(`Animal Details - ${current.name}`, 75, 26);

      doc.setFontSize(9);
      doc.setTextColor(209, 134, 125); // Brand Rose
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 75, 40);

      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 60,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 6,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: {
          fillColor: [22, 34, 63],
          textColor: 255,
          fontSize: 9,
          halign: "center",
        },
        bodyStyles: {
          halign: "left",
        },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 80 },
        },
        tableWidth: "auto",
        margin: { left: 20, right: 20 },
      });

      doc.save(`AnimalDetails_${current.name}.pdf`);
    };

    img.onerror = () => {
      // Fallback if logo fails to load (draw text at original position)
      doc.setFontSize(16);
      doc.setTextColor(22, 34, 63);
      doc.setFont("helvetica", "bold");
      doc.text(`Animal Details - ${current.name}`, 20, 25);

      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 38);

      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 50,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 6,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: {
          fillColor: [22, 34, 63],
          textColor: 255,
          fontSize: 9,
          halign: "center",
        },
        bodyStyles: {
          halign: "left",
        },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 80 },
        },
        tableWidth: "auto",
        margin: { left: 20, right: 20 },
      });

      doc.save(`AnimalDetails_${current.name}.pdf`);
    };
  };

  const handleDelete = async () => {
    const confirmed = await swalConfirm("Delete Record?", "Permanent delete this record?");
    if (confirmed) {
      setIsLoading(true);
      try {
        const entryId = selectedEntry.id || selectedEntry._id;
        if (['livestock', 'crossing', 'shed', 'purchase', 'sale', 'health', 'vaccine'].includes(current.id)) {
          if (current.id === 'livestock') {
            await api.cattle.delete(entryId);
            swalSuccess("Deleted", "Cattle deleted successfully!");
          } else if (current.id === 'crossing') {
            await api.crossing.delete(entryId);
            swalSuccess("Deleted", "Crossing log deleted successfully!");
          } else if (current.id === 'shed') {
            await api.shed.delete(entryId);
            swalSuccess("Deleted", "Shed log deleted successfully!");
          } else if (current.id === 'purchase') {
            await api.purchase.delete(entryId);
            swalSuccess("Deleted", "Purchase log deleted successfully!");
          } else if (current.id === 'sale') {
            await api.sale.delete(entryId);
            swalSuccess("Deleted", "Sale log deleted successfully!");
          } else if (current.id === 'health') {
            await api.health.treatments.delete(entryId);
            swalSuccess("Deleted", "Treatment log deleted successfully!");
          } else if (current.id === 'vaccine') {
            await api.health.vaccinations.delete(entryId);
            swalSuccess("Deleted", "Vaccination log deleted successfully!");
          }
          try {
            sessionStorage.removeItem('__livestock_tag_cache__');
          } catch (err) {
            console.error("Non-blocking cache bust error:", err);
          }
          await fetchLogs();
        } else {
          const filtered = logs.filter(log => log.id !== selectedEntry.id);
          saveToStorage(filtered);
          swalSuccess("Deleted", "Record deleted successfully!");
        }
        closeAllModals();
      } catch (error) {
        console.error("Delete error:", error);
        swalError("Error", "Failed to delete record.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const clearAllFilters = () => {
  setFilters([{ field: "entryDate", value: "" }]);
  setCurrentPage(1); // reset pagination too
};

  const closeAllModals = () => {
    setShowForm(false);
    setSelectedEntry(null);
    setIsEditing(false);
  };




const getLiveAge = (dob, storedAge, endDate, type) => {
  if (!dob) return storedAge || "-";

  const birth = parseDateString(dob);
  if (!birth || isNaN(birth.getTime())) return storedAge || "-";
  const today = endDate ? parseDateString(endDate) : new Date();

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  const age = `${years} Y ${months} M ${days} D`;

  //  OPTIONAL (better UX)
  if (endDate) {
    if (type === "sold") return `${age} (Sold)`;
    if (type === "dead") return `${age} (Dead)`;
    if (type === "calved") return `${age} (Calved)`;
  }

  return age;
};





const getShedFromLivestock = (tagValue) => {
  try {
    const cached = sessionStorage.getItem('__livestock_tag_cache__');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.list)) {
        const cleanTag = String(tagValue).trim().toUpperCase();
        const found = parsed.list.find(item => {
          const itemTag = String(item.tag_id || item.tag || '').trim().toUpperCase();
          return itemTag === cleanTag;
        });
        if (found) {
          return found.shed || found.shedId || "";
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
  return "";
};


  return (
    <div className="w-full h-full flex flex-col text-black bg-white px-0 md:px-0">
      <div className="flex-none">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 md:mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#16223F] opacity-80">Animal Details</h1>
            <p className="text-black opacity-60 italic">Module: {current.name}</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {(current.id === 'livestock' || current.id === 'sale') && (
              <>
                <input
                  type="file"
                  id="excel-upload-input"
                  accept=".xlsx, .xls"
                  onChange={handleImportExcel}
                  className="hidden"
                />
                <button 
                  onClick={() => document.getElementById('excel-upload-input').click()} 
                  className="px-4 py-2 bg-[#16223F] text-white rounded-lg font-bold shadow-md hover:bg-[#16223F]/90 transition-all flex items-center gap-2 text-sm"
                >
                  📥 Import Excel
                </button>
              </>
            )}

            {/* EXCEL BUTTON */}
            <button 
              onClick={exportExcel} 
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2 text-sm"
            >
              📊 Excel
            </button>

            {/* PDF BUTTON */}
            <button 
              onClick={exportPDF} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold shadow-md hover:bg-red-700 transition-all flex items-center gap-2 text-sm"
            >
              📄 PDF
            </button>

            
            <button
    onClick={() => setShowFilters(!showFilters)}
    className={`relative px-4 py-2 rounded-lg font-bold border transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-md 
      ${showFilters 
        ? 'bg-[#D1867D]/10 border-[#D1867D]/20 text-[#16223F] hover:bg-[#D1867D]/20' 
        : 'bg-white border-gray-300 hover:bg-gray-50'}
    `}
  >
    {showFilters ? '✕ Hide Filter' : '🔍 Filters '}

    {/*  FILTER COUNT BADGE */}
    {activeFilterCount > 0 && (
      <span className="
        absolute -top-2 -right-2
        bg-red-600 text-white
        text-[10px] font-bold
        px-1.5 py-0.5
        rounded-full
        min-w-[18px]
        text-center
      ">
        {activeFilterCount}
      </span>
    )}
  </button>
            <button 
              onClick={() => { setIsEditing(false); setShowForm(true); }} 
              className="hidden md:block bg-[#16223F] text-white px-5 py-2 rounded-lg font-bold shadow-lg hover:bg-[#16223F]/90 transition-all text-sm"
            >
              + Add Entry
            </button>
          </div>
        </header>


        {/* Filter Bar */}
        
        {showFilters && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">

    <div className="
      bg-white 
      w-full 
      max-w-md 
      rounded-2xl 
      shadow-2xl 
      max-h-[85vh] 
      overflow-y-auto
      p-4
    ">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-black">Filters</h3>

        <button
          onClick={() => setShowFilters(false)}
          className="text-gray-500 text-xl font-bold"
        >
          ✕
        </button>
      </div>

      {/* FILTER LIST */}
      <div className="space-y-3">

        {filters.map((f, index) => (
          <div key={index} className="flex flex-col gap-2">

            {/* FIELD */}
            <select
              className="px-2 py-1.5 border rounded-lg text-sm"
              value={f.field}
              onChange={(e) => {
                const updated = [...filters];
                updated[index].field = e.target.value;
                updated[index].value = "";
                updated[index].from = "";
                updated[index].to = "";
                setFilters(updated);
              }}
            >
              <option value="entryDate">Date</option>
              {currentFields.map(field => (
                <option key={field.name} value={field.name}>
                  {field.label}
                </option>
              ))}
            </select>

            {/* VALUE */}
            {(() => {
              const fieldConfig = currentFields.find(field => field.name === f.field);

              // 📅 DATE RANGE FIELD
              if (f.field.toLowerCase().includes("date")) {
                return (
                  <div className="flex gap-2">

                    {/* FROM */}
                    <input
                      type="date"
                      className="px-2 py-1.5 border rounded-lg text-sm w-full"
                      value={
                        f.from
                          ? f.from.split("/").reverse().join("-")
                          : ""
                      }
                      onChange={(e) => {
                        const date = e.target.value;

                        const formatted = date
                          ? `${date.split("-")[2]}/${date.split("-")[1]}/${date.split("-")[0]}`
                          : "";

                        const updated = [...filters];
                        updated[index].from = formatted;
                        setFilters(updated);
                      }}
                    />

                    {/* TO */}
                    <input
                      type="date"
                      className="px-2 py-1.5 border rounded-lg text-sm w-full"
                      value={
                        f.to
                          ? f.to.split("/").reverse().join("-")
                          : ""
                      }
                      onChange={(e) => {
                        const date = e.target.value;

                        const formatted = date
                          ? `${date.split("-")[2]}/${date.split("-")[1]}/${date.split("-")[0]}`
                          : "";

                        const updated = [...filters];
                        updated[index].to = formatted;
                        setFilters(updated);
                      }}
                    />

                  </div>
                );
              }

              // 🔢 NUMBER FIELD
              if (fieldConfig?.type === "number") {
                return (
                  <input
                    type="number"
                    placeholder="Enter number..."
                    className="px-2 py-1.5 border rounded-lg text-sm"
                    value={f.value}
                    onChange={(e) => {
                      const updated = [...filters];
                      updated[index].value = e.target.value;
                      setFilters(updated);
                    }}
                  />
                );
              }

              // 📋 SELECT FIELD
              if (fieldConfig?.type === "select") {
                return (
                  <select
                    className="px-2 py-1.5 border rounded-lg text-sm"
                    value={f.value}
                    onChange={(e) => {
                      const updated = [...filters];
                      updated[index].value = e.target.value;
                      setFilters(updated);
                    }}
                  >
                    <option value="">Select...</option>
                    {fieldConfig.options.map(opt => {
                      const val = typeof opt === 'object' && opt !== null ? opt.value : opt;
                      const label = typeof opt === 'object' && opt !== null ? opt.label : opt;
                      return (
                        <option key={String(val)} value={val}>{label}</option>
                      );
                    })}
                  </select>
                );
              }

              // ✏️ DEFAULT TEXT
              return (
                <input
                  type="text"
                  placeholder="Enter value..."
                  className="px-2 py-1.5 border rounded-lg text-sm"
                  value={f.value}
                  onChange={(e) => {
                    const updated = [...filters];
                    updated[index].value = e.target.value;
                    setFilters(updated);
                  }}
                />
              );
            })()}

            {/* REMOVE */}
            <button
              onClick={() => {
                const updated = filters.filter((_, i) => i !== index);
                setFilters(updated.length ? updated : [{ field: "entryDate", value: "", from: "", to: "" }]);
              }}
              className="text-red-600 text-xs font-bold self-end"
            >
              Remove
            </button>

          </div>
        ))}

      </div>

      {/* ACTIONS */}
      <div className="flex justify-between mt-6 gap-2">

        <button
          onClick={() => setFilters([...filters, { field: "entryDate", value: "", from: "", to: "" }])}
          className="flex-1 bg-[#D1867D]/10 text-[#16223F] py-2 rounded-lg font-bold text-sm hover:bg-[#D1867D]/20"
        >
          + Add Filter
        </button>

        <button
          onClick={clearAllFilters}
          className="flex-1 bg-red-100 text-red-600 py-2 rounded-lg font-bold text-sm"
        >
          Clear
        </button>

      </div>

      {/* APPLY BUTTON */}
      <button
        onClick={() => setShowFilters(false)}
        className="mt-4 w-full bg-[#16223F] hover:bg-[#16223F]/90 text-white py-2 rounded-lg font-bold"
      >
        Apply Filters
      </button>

    </div>

  </div>
)}
      </div>

      {/* Newly Purchased Animals Action Deck */}
      {current.id === 'livestock' && pendingPurchases && pendingPurchases.length > 0 && (
        <div className="mb-6 p-5 bg-gradient-to-br from-[#16223F]/5 via-white to-[#D1867D]/5 border border-dashed border-[#D1867D]/40 rounded-2xl shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📥</span>
              <h2 className="text-lg font-bold text-[#16223F]">Newly Purchased Animals ({pendingPurchases.length})</h2>
              <span className="bg-[#D1867D] text-white text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full animate-pulse">
                Pending Profile Completion
              </span>
            </div>
          </div>
          <p className="text-xs text-black opacity-60 mb-4 leading-relaxed">
            These animals have been recently recorded under **Purchase Logs** and have entered the farm. Click **Complete Profile** on any card below to input their breed, age, gender, and parenting details to officially register them into the active registry.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingPurchases.map(animal => (
              <div 
                key={animal._id || animal.id} 
                className="bg-white border border-gray-100 hover:border-[#D1867D]/30 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-mono text-xs font-black text-[#16223F] bg-gray-100 px-2 py-1 rounded-md">
                      TAG ID: {animal.tag || animal.tag_id}
                    </span>
                    <span className="text-[10px] font-semibold text-black opacity-40">
                      {animal.purchaseDate ? formatDateToDDMMYYYY(animal.purchaseDate) : '-'}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-black opacity-70 mb-4">
                    {/* <div className="flex justify-between">
                      <span className="opacity-60">Farm Assigned:</span>
                      <span className="font-bold text-[#16223F]">
                        {(() => {
                          if (!animal.farmId) return '-';
                          const fm = farmsList.find(f => f._id === animal.farmId || f.id === animal.farmId || f.code === animal.farmId);
                          return fm ? (fm.name || fm.code) : animal.farmId;
                        })()}
                      </span>
                    </div> */}


<div className="flex justify-between">
  <span className="opacity-60">Farm Assigned:</span>
  <span className="font-bold text-[#16223F]">
    {(() => {
      // Get the identifier text of the chosen shed
      const shedTarget = String(animal.shed || animal.shedId || "").toUpperCase();
      
      if (!shedTarget || shedTarget === "-") {
        // Fallback to basic farm layout matching if no shed is chosen yet
        if (!animal.farmId) return '-';
        const fm = farmsList.find(f => f._id === animal.farmId || f.id === animal.farmId || f.code === animal.farmId);
        return fm ? (fm.name || fm.code) : animal.farmId;
      }

      // Check key phrasing in your shed names to reverse-engineer the location assignment
      if (shedTarget.includes("TDR") || shedTarget.includes("Tandur")) {
        return "Tandur";
      }
      
      if (shedTarget.includes("TKP") || shedTarget.includes("Talakondapally")) {
        return "Talakondapally";
      }

      // Final automated backup layout matching 
      const fm = farmsList.find(f => f._id === animal.farmId || f.id === animal.farmId || f.code === animal.farmId);
      return fm ? (fm.name || fm.code) : animal.farmId;
    })()}
  </span>
</div>


                    <div className="flex justify-between">
                      <span className="opacity-60">Seller:</span>
                      <span className="font-semibold text-gray-800 truncate max-w-[120px]">{animal.purchaseFrom || '-'}</span>
                    </div>
                    {animal.purchasePrice > 0 && (
                      <div className="flex justify-between">
                        <span className="opacity-60">Price:</span>
                        <span className="font-bold text-emerald-600">₹{Number(animal.purchasePrice).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedEntry(animal);
                    setIsEditing(true);
                    setShowForm(true);
                  }}
                  className="w-full bg-[#16223F] hover:bg-[#D1867D] text-white font-bold text-xs py-2 rounded-lg transition-all duration-200 ease-in-out shadow-sm hover:shadow"
                >
                  Complete Profile
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Newly Born Calves Action Deck */}
      {current.id === 'livestock' && pendingCalves && pendingCalves.length > 0 && (
        <div className="mb-6 p-5 bg-gradient-to-br from-[#16223F]/5 via-white to-[#D1867D]/5 border border-dashed border-emerald-500/40 rounded-2xl shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🍼</span>
              <h2 className="text-lg font-bold text-[#16223F]">Newly Born Calves ({pendingCalves.length})</h2>
              <span className="bg-emerald-600 text-white text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full animate-pulse">
                Pending Birth Registry
              </span>
            </div>
          </div>
          <p className="text-xs text-black opacity-60 mb-4 leading-relaxed">
            These calves have been recently recorded via **Crossing Log Calving Events**. Click **Register Calf** on any card below to input their gender, breed, current shed assignment, and officially register them into the active .
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingCalves.map(animal => (
              <div 
                key={animal._id || animal.id} 
                className="bg-white border border-gray-100 hover:border-emerald-500/30 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-mono text-xs font-black text-[#16223F] bg-gray-100 px-2 py-1 rounded-md">
                      TAG ID: {animal.tag || animal.tag_id}
                    </span>
                    <span className="text-[10px] font-semibold text-black opacity-40">
                      {animal.dateOfBirth ? formatDateToDDMMYYYY(animal.dateOfBirth) : '-'}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-black opacity-70 mb-4">
                    {/* <div className="flex justify-between">
                      <span className="opacity-60">Farm Assigned:</span>
                      <span className="font-bold text-[#16223F]">
                        {(() => {
                          if (!animal.farmId) return '-';
                          const fm = farmsList.find(f => f._id === animal.farmId || f.id === animal.farmId || f.code === animal.farmId);
                          return fm ? (fm.name || fm.code) : animal.farmId;
                        })()}
                      </span>
                    </div> */}

                    <div className="flex justify-between">
  <span className="opacity-60">Farm Assigned:</span>
  <span className="font-bold text-[#16223F]">
    {(() => {
      // Get the identifier text of the chosen shed
      const shedTarget = String(animal.shed || animal.shedId || "").toUpperCase();
      
      if (!shedTarget || shedTarget === "-") {
        // Fallback to basic farm layout matching if no shed is chosen yet
        if (!animal.farmId) return '-';
        const fm = farmsList.find(f => f._id === animal.farmId || f.id === animal.farmId || f.code === animal.farmId);
        return fm ? (fm.name || fm.code) : animal.farmId;
      }

      // Check key phrasing in your shed names to reverse-engineer the location assignment
      if (shedTarget.includes("TDR") || shedTarget.includes("Tandur")) {
        return "Tandur";
      }
      
      if (shedTarget.includes("TKP") || shedTarget.includes("Talakondapally")) {
        return "Talakondapally";
      }

      // Final automated backup layout matching 
      const fm = farmsList.find(f => f._id === animal.farmId || f.id === animal.farmId || f.code === animal.farmId);
      return fm ? (fm.name || fm.code) : animal.farmId;
    })()}
  </span>
</div>


                    <div className="flex justify-between">
                      <span className="opacity-60">Dame ID (Mother):</span>
                      <span className="font-semibold text-gray-800 truncate max-w-[120px]">{animal.dameId || '-'}</span>
                    </div>
                    {animal.sireId && (
                      <div className="flex justify-between">
                        <span className="opacity-60">Sire ID (Father):</span>
                        <span className="font-semibold text-gray-800 truncate max-w-[120px]">{animal.sireId}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedEntry(animal);
                    setIsEditing(true);
                    setShowForm(true);
                  }}
                  className="w-full bg-[#16223F] hover:bg-emerald-600 text-white font-bold text-xs py-2 rounded-lg transition-all duration-200 ease-in-out shadow-sm hover:shadow"
                >
                  Register Calf
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tabs for Livestock */}
      {current.id === 'livestock' && (
        <div className="flex flex-wrap gap-2 mb-4 p-1.5 bg-gray-50 border border-gray-200/80 rounded-2xl max-w-2xl shadow-sm">
          <button
            onClick={() => {
              setLivestockSubTab('ACTIVE');
              setCurrentPage(1);
            }}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
              livestockSubTab === 'ACTIVE'
                ? 'bg-[#16223F] text-white shadow-md shadow-[#16223F]/10 scale-[1.02]'
                : 'text-[#16223F] opacity-70 hover:opacity-100 hover:bg-white hover:shadow-sm'
            }`}
          >
            Active  <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${livestockSubTab === 'ACTIVE' ? 'bg-white/20 text-white' : 'bg-[#16223F]/10 text-[#16223F]'}`}>{activeCount}</span>
          </button>
          
          <button
            onClick={() => {
              setLivestockSubTab('SOLD');
              setCurrentPage(1);
            }}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
              livestockSubTab === 'SOLD'
                ? 'bg-[#16223F] text-white shadow-md shadow-[#16223F]/10 scale-[1.02]'
                : 'text-[#16223F] opacity-70 hover:opacity-100 hover:bg-white hover:shadow-sm'
            }`}
          >
            Sold <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${livestockSubTab === 'SOLD' ? 'bg-white/20 text-white' : 'bg-[#16223F]/10 text-[#16223F]'}`}>{soldCount}</span>
          </button>

          <button
            onClick={() => {
              setLivestockSubTab('DECEASED');
              setCurrentPage(1);
            }}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
              livestockSubTab === 'DECEASED'
                ? 'bg-[#16223F] text-white shadow-md shadow-[#16223F]/10 scale-[1.02]'
                : 'text-[#16223F] opacity-70 hover:opacity-100 hover:bg-white hover:shadow-sm'
            }`}
          >
            Deceased <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${livestockSubTab === 'DECEASED' ? 'bg-white/20 text-white' : 'bg-[#16223F]/10 text-[#16223F]'}`}>{deceasedCount}</span>
          </button>

          <button
            onClick={() => {
              setLivestockSubTab('WARNINGS');
              setCurrentPage(1);
            }}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
              livestockSubTab === 'WARNINGS'
                ? 'bg-[#D1867D] text-white shadow-md shadow-[#D1867D]/10 scale-[1.02]'
                : 'text-red-600 opacity-70 hover:opacity-100 hover:bg-white hover:shadow-sm'
            }`}
          >
            ⚠️ Warnings <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${livestockSubTab === 'WARNINGS' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'}`}>{pendingImports.length}</span>
          </button>
        </div>
      )}

      {/* Sub-tabs for Crossing Log */}
      {current.id === 'crossing' && (
        <div className="flex flex-wrap gap-2 mb-4 p-1.5 bg-gray-50 border border-gray-200/80 rounded-2xl max-w-xl shadow-sm">
          <button
            onClick={() => {
              setCrossingSubTab('PENDING');
              setCurrentPage(1);
            }}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
              crossingSubTab === 'PENDING'
                ? 'bg-[#16223F] text-white shadow-md shadow-[#16223F]/10 scale-[1.02]'
                : 'text-[#16223F] opacity-70 hover:opacity-100 hover:bg-white hover:shadow-sm'
            }`}
          >
            ⏳ Pending <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${crossingSubTab === 'PENDING' ? 'bg-white/20 text-white' : 'bg-[#16223F]/10 text-[#16223F]'}`}>{crossingPendingCount}</span>
          </button>
          
          <button
            onClick={() => {
              setCrossingSubTab('POSITIVE');
              setCurrentPage(1);
            }}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
              crossingSubTab === 'POSITIVE'
                ? 'bg-[#16223F] text-white shadow-md shadow-[#16223F]/10 scale-[1.02]'
                : 'text-[#16223F] opacity-70 hover:opacity-100 hover:bg-white hover:shadow-sm'
            }`}
          >
            ✅ Positive <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${crossingSubTab === 'POSITIVE' ? 'bg-white/20 text-white' : 'bg-[#16223F]/10 text-[#16223F]'}`}>{crossingPositiveCount}</span>
          </button>

          <button
            onClick={() => {
              setCrossingSubTab('NEGATIVE');
              setCurrentPage(1);
            }}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
              crossingSubTab === 'NEGATIVE'
                ? 'bg-[#16223F] text-white shadow-md shadow-[#16223F]/10 scale-[1.02]'
                : 'text-[#16223F] opacity-70 hover:opacity-100 hover:bg-white hover:shadow-sm'
            }`}
          >
            ❌ Negative <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${crossingSubTab === 'NEGATIVE' ? 'bg-white/20 text-white' : 'bg-[#16223F]/10 text-[#16223F]'}`}>{crossingNegativeCount}</span>
          </button>
        </div>
      )}

      {/* Table Section or Warning Page */}
      {livestockSubTab === 'WARNINGS' && current.id === 'livestock' ? (
        <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm p-6 relative min-h-[400px]">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#16223F] flex items-center gap-2">
                <span className="text-red-500">⚠️</span> Unresolved Import Validation Warnings
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                The following records were imported from Excel but contain invalid or unregistered configuration values. Click <strong>Complete Profile</strong> to validate and resolve them.
              </p>
            </div>
            <span className="bg-red-100 text-red-600 px-3 py-1.5 rounded-full text-xs font-black">
              Requires Review: {pendingImports.length}
            </span>
          </div>

          {pendingImports.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-4xl">🎉</span>
              <h3 className="text-lg font-bold text-gray-700 mt-4">All Imports Validated!</h3>
              <p className="text-sm text-gray-400 mt-1">No pending import warnings found in active logs.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingImports.map(animal => {
                const isShedOk = animal.shed && allowedSheds.has(String(animal.shed).toUpperCase());
                const isBreedOk = animal.breed && allowedBreeds.has(String(animal.breed).toUpperCase());
                const isAnimalOk = animal.cattleType && allowedAnimals.has(String(animal.cattleType).toUpperCase());
                const isDOBOk = animal.dateOfBirth && animal.dateOfBirth !== '-' && String(animal.dateOfBirth).trim() !== '';

                return (
                  <div 
                    key={animal._id || animal.id} 
                    className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-mono text-sm font-black text-[#16223F] bg-gray-150 px-2.5 py-1 rounded-md">
                          TAG: {animal.tag || animal.tagId}
                        </span>
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Invalid Properties
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="flex justify-between items-center pb-1.5 border-b border-gray-50">
                          <span className="opacity-60">Shed Number:</span>
                          <span className={`font-semibold ${isShedOk ? 'text-gray-800' : 'text-red-500 font-bold'}`}>
                            {animal.shed || '-'} {!isShedOk && '⚠️'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pb-1.5 border-b border-gray-50">
                          <span className="opacity-60">Breed:</span>
                          <span className={`font-semibold ${isBreedOk ? 'text-gray-800' : 'text-red-500 font-bold'}`}>
                            {animal.breed || '-'} {!isBreedOk && '⚠️'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pb-1.5 border-b border-gray-50">
                          <span className="opacity-60">Animal Type:</span>
                          <span className={`font-semibold ${isAnimalOk ? 'text-gray-800' : 'text-red-500 font-bold'}`}>
                            {animal.cattleType || '-'} {!isAnimalOk && '⚠️'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="opacity-60">Date of Birth:</span>
                          <span className={`font-semibold ${isDOBOk ? 'text-gray-800' : 'text-red-500 font-bold'}`}>
                            {animal.dateOfBirth ? formatDateToDDMMYYYY(animal.dateOfBirth) : '-'} {!isDOBOk && '⚠️'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <button
                        onClick={() => {
                          setSelectedEntry(animal);
                          setIsEditing(true);
                          setShowForm(true);
                        }}
                        className="w-full bg-[#16223F] hover:bg-[#D1867D] text-white font-bold text-xs py-2.5 rounded-lg transition-all duration-200 shadow-sm"
                      >
                        Complete Profile
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-auto bg-white border border-gray-200 rounded-xl shadow-sm relative">
            <table className="w-full text-left min-w-[600px] relative">
              <thead className="sticky top-0 z-10 bg-gray-50 text-[#16223F] uppercase text-[10px] font-black tracking-widest shadow-sm">
                <tr>
                  <th className="p-4 border-b">Date</th>
                  {currentFields.map(f => <th key={f.name} className="p-4 border-b">{f.label}</th>)}
                  <th className="p-4 border-b w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <SkeletonLoader type="table" columns={currentFields.length + 2} />
                ) : paginatedLogs.length > 0 ? (
                  paginatedLogs.map(log => (
                    <tr 
                      key={log.id}
                      className={`
                        cursor-pointer group transition-colors
                        hover:bg-[#D1867D]/5
                        ${["DEAD", "DECEASED"].includes(String(log.status).toUpperCase()) ? "bg-red-50" : ""}
                        ${String(log.status).toUpperCase() === "SOLD" ? "bg-[#FFC145]/5" : ""}
                      `}
                      onClick={() => setSelectedEntry(log)}
                    >
                      <td className="p-4 text-sm text-black font-sans whitespace-nowrap">
                        {log.entryDate}
                      </td>

                      {currentFields.map(f => {
                        if (f.name === "age") {
                          const isInactive = ["SOLD", "DECEASED", "DEAD"].includes(String(log.status).toUpperCase());
                          return (
                            <td key={f.name} className="p-4 font-semibold text-black whitespace-nowrap">
                              {getLiveAge(
                                log.dob,
                                log.age,
                                isInactive ? log.soldDate || log.deadDate || log.updatedAt : null,
                                String(log.status).toUpperCase() === "SOLD"
                                  ? "sold"
                                  : ["DEAD", "DECEASED"].includes(String(log.status).toUpperCase())
                                  ? "dead"
                                  : null
                              )}
                            </td>
                          );
                        }

                        if (f.name === "Pregnant age" || f.name === "pregnantAge") {
                          const isPreg = (log.pregnancyStatus || log["pregnancy status"]) === "Positive";
                          if (!isPreg) {
                            return (
                              <td key={f.name} className="p-4 font-semibold text-black whitespace-nowrap">
                                -
                              </td>
                            );
                          }
                          return (
                            <td key={f.name} className="p-4 font-semibold text-black whitespace-nowrap">
                              {getLiveAge(
                                log.crossingDate || log["crossingDate"],
                                log.pregnantAge || log["Pregnant age"],
                                log.actualCalvingDate || log["actual calving date"],
                                "calved"
                              )}
                            </td>
                          );
                        }

                        if (f.name === "status") {
                          const statusUpper = String(log.status).toUpperCase();
                          let badgeStyle = "bg-emerald-50 text-emerald-700 border border-emerald-100/50";
                          if (statusUpper === "SOLD") {
                            badgeStyle = "bg-[#FFC145]/10 text-[#16223F] border border-[#FFC145]/20";
                          } else if (["DEAD", "DECEASED"].includes(statusUpper)) {
                            badgeStyle = "bg-red-50 text-red-700 border border-red-100/50";
                          } else if (statusUpper === "PREGNANT") {
                            badgeStyle = "bg-violet-50 text-violet-700 border border-violet-100/50";
                          } else if (statusUpper === "EMPTY") {
                            badgeStyle = "bg-slate-100 text-slate-700 border border-slate-200/50";
                          } else if (statusUpper === "PENDING") {
                            badgeStyle = "bg-amber-50 text-amber-700 border border-amber-100/50";
                          }
                          return (
                            <td key={f.name} className="p-4 font-semibold whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${badgeStyle}`}>
                                {log.status}
                              </span>
                            </td>
                          );
                        }

                        if (f.name === "farmId") {
                          const rawFarmId = log.farmId;
                          let displayVal = "Unknown";
                          if (rawFarmId) {
                            if (typeof rawFarmId === 'object') {
                              displayVal = rawFarmId.name || rawFarmId.code || "Unknown";
                            } else {
                              const foundFarm = farmsList.find(farm => (farm._id || farm.id) === rawFarmId || farm.code === rawFarmId);
                              displayVal = foundFarm ? foundFarm.name : rawFarmId;
                            }
                          }
                          return (
                            <td key={f.name} className="p-4 font-semibold text-[#16223F] whitespace-nowrap">
                              {displayVal}
                            </td>
                          );
                        }

                        if (f.type === "date" || f.name.toLowerCase().includes("date") || f.name === "dob" || f.name === "dateOfBirth") {
                          const rawDate = log[f.name];
                          const dateDisplay = rawDate ? formatDateToDDMMYYYY(rawDate) : "-";
                          return (
                            <td key={f.name} className="p-4 font-semibold text-black whitespace-nowrap">
                              {dateDisplay}
                            </td>
                          );
                        }

                        return (
                          <td key={f.name} className="p-4 font-semibold text-black whitespace-nowrap">
                            {log[f.name]}
                          </td>
                        );
                      })}

                      <td className="p-4 text-gray-400 group-hover:text-[#D1867D] text-xl font-bold text-center transition-colors whitespace-nowrap">
                        ⋮
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={currentFields.length + 2}
                      className="p-12 text-center text-black text-sm font-medium opacity-50"
                    >
                      No records found for {current.name}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-black opacity-60">
              Showing {totalItems === 0 ? 0 : startIndex + 1}–
              {Math.min(endIndex, totalItems)} of {totalItems} records
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-1 border rounded-lg bg-white hover:bg-gray-100 transition"
              >
                Prev
              </button>

              <span className="px-3 py-1 font-semibold text-sm">
                Page {currentPage}
              </span>

              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={endIndex >= totalItems}
                className="px-4 py-1 border rounded-lg bg-white hover:bg-gray-100 transition"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}


      {/* Action Popover */}
      {selectedEntry && !showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-[320px] transform transition-all">
            <h3 className="font-bold text-lg mb-4 text-center text-black">Manage Record</h3>
            <div className="space-y-2">

  {/* ✅ NEW VIEW BUTTON */}
  <button 
    onClick={() => {
      setViewMode(true);
    }}
    className="w-full flex items-center justify-center gap-2 bg-gray-400 text-white py-3 rounded-xl font-semibold hover:bg-gray-500 transition-all"
  >
    👁️ View Details
  </button>

  <button 
    onClick={() => { setIsEditing(true); setShowForm(true); }} 
    className="w-full flex items-center justify-center gap-2 bg-[#D1867D] text-white py-3 rounded-xl font-semibold hover:bg-[#D1867D]/90 shadow-lg shadow-[#D1867D]/10 transition-all"
  >
    ✏️ Edit Entry
  </button>

  <button 
    onClick={handleDelete} 
    className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-xl font-semibold hover:bg-red-100 transition-all"
  >
    🗑️ Delete Entry
  </button>

  <button 
    onClick={() => setSelectedEntry(null)} 
    className="w-full text-black opacity-50 py-2 hover:opacity-100 transition-colors"
  >
    Close Menu
  </button>

</div>
{selectedEntry && viewMode && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    
    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto relative">
      
      {/* CLOSE CROSS ICON */}
      <button 
        onClick={() => setViewMode(false)}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors text-xl font-bold p-1 focus:outline-none"
      >
        ✕
      </button>

      <h3 className="text-lg font-bold mb-4 text-center text-black">
        Animal Details
      </h3>

      {/* DATA DISPLAY */}
     
      <div className="mt-4 border-t pt-4 space-y-3 text-sm text-black">

  {/* DATE */}
  <div className="flex justify-between border-b pb-2">
    <span className="font-semibold text-gray-500">Date</span>
    <span className="text-right">{selectedEntry.entryDate}</span>
  </div>

  {/* FIELDS */}
  {currentFields.map(field => {
    let displayVal = selectedEntry[field.name] || "-";
    if (field.name === "farmId") {
      const rawFarmId = selectedEntry.farmId;
      if (rawFarmId) {
        if (typeof rawFarmId === 'object') {
          displayVal = rawFarmId.name || rawFarmId.code || "Unknown";
        } else {
          const foundFarm = farmsList.find(farm => (farm._id || farm.id) === rawFarmId || farm.code === rawFarmId);
          displayVal = foundFarm ? foundFarm.name : rawFarmId;
        }
      }
    } else if (field.name === "age") {
      const isInactive = ["SOLD", "DECEASED", "DEAD"].includes(String(selectedEntry.status).toUpperCase());
      displayVal = getLiveAge(
        selectedEntry.dob || selectedEntry.dateOfBirth,
        selectedEntry.age,
        isInactive ? selectedEntry.soldDate || selectedEntry.deadDate || selectedEntry.updatedAt : null,
        String(selectedEntry.status).toUpperCase() === "SOLD"
          ? "sold"
          : ["DEAD", "DECEASED"].includes(String(selectedEntry.status).toUpperCase())
          ? "dead"
          : null
      );
    } else if (field.type === "date" || field.name.toLowerCase().includes("date") || field.name === "dob" || field.name === "dateOfBirth") {
      const rawDate = selectedEntry[field.name];
      displayVal = rawDate ? formatDateToDDMMYYYY(rawDate) : "-";
    }
    return (
      <div key={field.name} className="flex justify-between border-b pb-2">
        <span className="font-semibold text-gray-500">
          {field.label}
        </span>
        <span className="text-right font-medium text-[#16223F]">
          {displayVal}
        </span>
      </div>
    );
  })}

</div>

      {/* CLOSE BUTTON */}
      <button
        onClick={() => setViewMode(false)}
        className="mt-6 w-full bg-gray-300 py-2 rounded-lg font-semibold"
      >
        Close
      </button>

    </div>
  </div>
)}
          </div>
        </div>
      )}

      
      {showForm && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-200 p-4">

    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      
      <LogForm 
        title={
          selectedEntry?.isPendingDetails
            ? selectedEntry.onboardingType === 'CALVING'
              ? "🍼 Register Newborn Calf Profile"
              : "📥 Complete Purchased Animal Profile"
            : isEditing
            ? `Update ${current.name}`
            : `New ${current.name}`
        } 
        fields={currentFields} 
        initialData={(() => {
          if (!isEditing || !selectedEntry) return {};
          let base = { ...selectedEntry };
          if (base.isPendingDetails && base.onboardingType === 'CALVING') {
            base.farmBorn = base.farmBorn || 'Yes';
            if (!base.cattleType || base.cattleType === 'PENDING') {
              // Automatically resolve animal type (buffalo calf vs cow calf) based on mother (dameId)
              const motherTag = String(base.dameId || '').trim().toUpperCase();
              let mother = null;
              if (motherTag) {
                mother = logs.find(a => String(a.tag || a.tagId || a.tag_id || '').trim().toUpperCase() === motherTag);
              }
              
              if (mother) {
                const motherType = String(mother.cattleType || mother.animalType || '').toUpperCase();
                if (motherType.includes('BUFFALO')) {
                  base.cattleType = 'Buffalo Calf';
                } else if (motherType.includes('COW')) {
                  base.cattleType = 'Cow Calf';
                } else {
                  base.cattleType = String(base.animalType).toUpperCase().includes('BUFFALO') ? 'Buffalo Calf' : 'Cow Calf';
                }
              } else {
                base.cattleType = String(base.animalType).toUpperCase().includes('BUFFALO') ? 'Buffalo Calf' : 'Cow Calf';
              }
            }
          }
          return base;
        })()} 
        existingRecords={logs}
        onSubmit={handleSave} 
        onClose={closeAllModals} 
      />

    </div>

  </div>
)}
{/* MOBILE FLOATING ADD BUTTON */}
{/* MOBILE FLOATING ADD BUTTON */}
{!showForm &&
 !selectedEntry &&
 !viewMode &&
 !showFilters && (
  <div className="md:hidden fixed bottom-20 right-6 z-[100]">

    <button
      onClick={() => {
        setIsEditing(false);
        setShowForm(true);
      }}
      className="
        w-14 h-14
        bg-[#D1867D] text-white
        rounded-full
        shadow-[0_10px_25px_rgba(209,134,125,0.4)]
        flex items-center justify-center
        text-3xl font-bold
        hover:bg-[#D1867D]/95 hover:-translate-y-1
        active:scale-95
        transition-all duration-200
      "
    >
      +
    </button>

  </div>
)}
    </div>
  );
};

export default AnimalDetailspg;