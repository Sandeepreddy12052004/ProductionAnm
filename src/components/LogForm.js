  import React, { useState } from 'react';
  import LivestockTagInput from './LivestockTagInput';
  import { swalError } from '../utils/swal';
  import Swal from 'sweetalert2';

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

  const LogForm = ({ title, fields, onSubmit, onClose, onDelete, initialData = {}, existingRecords = [] }) => {
    const [checkedRows, setCheckedRows] = useState({});
    const [medicinesList, setMedicinesList] = useState([]);
    const [vaccinesList, setVaccinesList] = useState([]);
    const [feedItemsList, setFeedItemsList] = useState([]);
    const [selectedRow, setSelectedRow] = useState(() => {
      if (initialData?.animalId && String(initialData.animalId).startsWith("Row ")) {
        return String(initialData.animalId).replace("Row ", "");
      }
      return "";
    });
    const [livestockList, setLivestockList] = useState([]);

    const isFieldRequired = (field) => {
      if (field.optional) return false;
      if (field.name === "breedType") {
        return !!formData["actualCalvingDate"];
      }
      if (["pregnancyConfirmedDate", "estimatedCalvingDate"].includes(field.name)) {
        return formData["pregnancyStatus"] === "Positive";
      }
      if (["calfTag", "heatMonitoring1stNotification"].includes(field.name)) {
        return !!formData["actualCalvingDate"];
      }
      if (field.name === "purchaseDate") {
        return title?.toLowerCase().includes("feed") ? !!Number(formData.bought) : formData.farmBorn === "No";
      }
      if (["sireId", "dameId", "sireBreed", "dameBreed", "calvings"].includes(field.name)) {
        return formData.farmBorn === "Yes";
      }
      if (field.name === "password" && (initialData?.id || initialData?._id || title?.toLowerCase().includes("update") || title?.toLowerCase().includes("edit"))) {
        return false;
      }
      if (field.name === "age") return false;
      if (["actualCalvingDate", "remarks", "heatMonitoring2ndNotification", "sireId", "dameId", "sireBreed", "dameBreed", "calvings"].includes(field.name)) {
        return false;
      }
      return true;
    };

    const autofetchParentsForCalf = (tagValue, currentBornVal) => {
      const cleanTag = String(tagValue).trim().toUpperCase();
      const isFarmBorn = currentBornVal === "Yes";
      if (cleanTag && isFarmBorn) {
        import('../utils/api').then(({ api }) => {
          api.crossing.getAll().then(res => {
            const list = Array.isArray(res) ? res : (res?.data ?? []);
            const matchingLog = list.find(log => String(log.calfTag || '').trim().toUpperCase() === cleanTag);
            if (matchingLog) {
              const motherTag = String(matchingLog.tag_id || matchingLog.tag || '').trim().toUpperCase();
              const fatherTag = String(matchingLog.maleTag || '').trim().toUpperCase();
              
              const motherAnimal = livestockList.find(a => String(a.tag_id || a.tag || '').trim().toUpperCase() === motherTag);
              const fatherAnimal = livestockList.find(a => String(a.tag_id || a.tag || '').trim().toUpperCase() === fatherTag);
              
              setFormData(prev => ({
                ...prev,
                dameId: motherTag,
                sireId: fatherTag,
                dameBreed: motherAnimal ? (motherAnimal.breed || '') : '',
                sireBreed: fatherAnimal ? (fatherAnimal.breed || '') : '',
                calvings: 0
              }));
            }
          }).catch(console.error);
        });
      }
    };

    const getShedObject = (shedValue) => {
      if (!shedValue) return null;
      const cleanValue = String(shedValue).trim().toUpperCase();
      return allShedsList.find(s => 
        String(s.name || '').trim().toUpperCase() === cleanValue || 
        String(s.code || '').trim().toUpperCase() === cleanValue
      );
    };

    const getAnimalsInShed = (shedValue) => {
      const cleanShed = String(shedValue).trim().toUpperCase();
      return livestockList.filter(item => {
        const itemShed = String(item.shed || item.shedId || '').trim().toUpperCase();
        return itemShed === cleanShed;
      });
    };

    const formatInitialData = (data, fields) => {
      const formatted = { ...data };
      fields.forEach(field => {
        if (field.type === 'date' && formatted[field.name]) {
          const rawVal = formatted[field.name];
          if (typeof rawVal === 'string' && rawVal.includes("/")) {
            const parts = rawVal.split("/");
            if (parts.length === 3) {
              formatted[field.name] = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              return;
            }
          }
          try {
            const d = parseDateString(rawVal);
            if (d && !isNaN(d.getTime())) {
              formatted[field.name] = d.toISOString().split('T')[0];
            }
          } catch (e) {
            console.error(e);
          }
        }
      });
      return formatted;
    };

    const [formData, setFormData] = useState(() => formatInitialData(initialData, fields));
    const [tagError, setTagError] = useState("");
    const [dobError, setDobError] = useState("");
    const [userIdError, setUserIdError] = useState("");
    
    // States for custom searchable role select & permissions summary
    const [roleList, setRoleList] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [allShedsList, setAllShedsList] = useState([]);

    const checkTagExistsInLivestock = (tagValue) => {
      try {
        const cached = sessionStorage.getItem('__livestock_tag_cache__');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.list)) {
            const cleanTag = String(tagValue).trim().toUpperCase();
            return parsed.list.some(item => {
              const itemTag = String(item.tag_id || item.tag || '').trim().toUpperCase();
              return itemTag === cleanTag;
            });
          }
        }
      } catch (err) {
        console.error(err);
      }
      return false;
    };

    React.useEffect(() => {
      const needsLivestock = (fields || []).some(f => f.name === 'tag' || f.name === 'tagId' || f.name === 'animalId');
      if (needsLivestock) {
        const cached = sessionStorage.getItem('__livestock_tag_cache__');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && Array.isArray(parsed.list)) {
              setLivestockList(parsed.list);
            }
          } catch (e) {}
        }
        import('../utils/api').then(({ api }) => {
          api.cattle.getAll().then(res => {
            const raw = Array.isArray(res) ? res : (res?.data ?? []);
            sessionStorage.setItem('__livestock_tag_cache__', JSON.stringify({ list: raw, ts: Date.now() }));
            setLivestockList(raw);
          }).catch(err => {
            console.error("Failed to prefetch livestock in LogForm:", err);
          });
        });
      }
    }, [fields]);

    React.useEffect(() => {
      const selectedShed = formData.shedId || formData.shed || "";
      if (selectedShed && livestockList.length > 0) {
        const shedObj = getShedObject(selectedShed);
        const numRows = shedObj ? (shedObj.lines || 0) : 0;
        let rows = [];
        if (numRows > 0) {
          rows = Array.from({ length: numRows }, (_, i) => i + 1);
        } else {
          const animals = getAnimalsInShed(selectedShed);
          rows = Array.from(new Set(animals.map(a => a.lineNo || 0)));
        }
        setCheckedRows(prev => {
          const updated = { ...prev };
          let changed = false;
          rows.forEach(r => {
            if (updated[r] === undefined) {
              updated[r] = false;
              changed = true;
            }
          });
          return changed ? updated : prev;
        });
      }
    }, [livestockList, allShedsList, formData.shedId, formData.shed]);

    React.useEffect(() => {
      const hasShedField = (fields || []).some(f => ['shed', 'oldShed', 'newShed', 'shedId'].includes(f.name));
      if (hasShedField) {
        import('../utils/api').then(({ api }) => {
          api.sheds.getAll().then(res => {
            if (Array.isArray(res)) {
              setAllShedsList(res);
            }
          }).catch(err => {
            console.error("Failed to load sheds in LogForm:", err);
          });
        });
      }
    }, [fields]);

    React.useEffect(() => {
      const hasRoleField = (fields || []).some(f => f.name === 'role');
      if (hasRoleField && title?.includes('User')) {
        import('../utils/api').then(({ api }) => {
          api.roles.getAll().then(roles => {
            setRoleList(roles || []);
          }).catch(err => {
            console.error("Failed to load roles for select:", err);
          });
        });
      }
    }, [fields, title]);

    React.useEffect(() => {
      const needsMedicines = (fields || []).some(f => f.name === 'medicineName' || f.name === 'treatment');
      if (needsMedicines) {
        import('../utils/api').then(({ api }) => {
          api.medicines.getAll().then(res => {
            const raw = Array.isArray(res) ? res : (res?.data ?? []);
            setMedicinesList(raw);
          }).catch(err => console.error("Failed to load medicines in LogForm:", err));
        });
      }
    }, [fields]);

    React.useEffect(() => {
      const needsVaccines = (fields || []).some(f => f.name === 'vaccinationName');
      if (needsVaccines) {
        import('../utils/api').then(({ api }) => {
          api.health.vaccines.getAll().then(res => {
            const raw = Array.isArray(res) ? res : (res?.data ?? []);
            setVaccinesList(raw);
          }).catch(err => console.error("Failed to load vaccines in LogForm:", err));
        });
      }
    }, [fields]);

    React.useEffect(() => {
      const needsFeeds = (fields || []).some(f => f.name === 'feedType');
      if (needsFeeds) {
        import('../utils/api').then(({ api }) => {
          api.feedItems.getAll().then(res => {
            const raw = Array.isArray(res) ? res : (res?.data ?? []);
            const names = raw.filter(item => item.status !== false).map(item => item.name).filter(Boolean);
            setFeedItemsList(names);
          }).catch(err => console.error("Failed to load feed items in LogForm:", err));
        });
      }
    }, [fields]);


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

  const getAnimalTypeFromLivestock = (tagValue) => {
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
            return found.animalType || found.cattleType || "";
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
    return "";
  };


    const handleChange = (e) => {
    const { name, value, type } = e.target;

    if (name === "tag" || name === "tagId" || name === "tag_id") {
      const cleanTag = String(value).trim().toUpperCase();
      if (cleanTag) {
        import('../utils/api').then(({ api }) => {
          api.tags.getAllSuffixes().then(rules => {
            const ruleList = Array.isArray(rules) ? rules : (rules?.data ?? []);
            for (const r of ruleList) {
              const suff = String(r.suffix).toUpperCase();
              if (cleanTag.endsWith(suff)) {
                const matchedType = r.animalType;
                const animalTypeField = fields.find(f => f.name === 'cattleType' || f.name === 'animalType');
                if (animalTypeField && animalTypeField.options) {
                  const resolved = animalTypeField.options.find(opt => 
                    opt.toLowerCase() === matchedType.toLowerCase() || 
                    opt.toLowerCase().includes(matchedType.toLowerCase())
                  );
                  if (resolved) {
                    setFormData(prev => ({
                      ...prev,
                      [animalTypeField.name]: resolved
                    }));
                  }
                }
              }
            }
          }).catch(console.error);
        });
        if (formData.farmBorn === "Yes") {
          autofetchParentsForCalf(value, "Yes");
        }
      }
    }

    if (name === "farmBorn" && value === "Yes") {
      autofetchParentsForCalf(formData.tag || formData.tagId || formData.tag_id || "", "Yes");
    }

    setFormData(prev => {
      const updated = { ...prev, [name]: value };


      if (name === "farmId") {
        updated["shed"] = ""; // Clear selected shed when farm changes
      }

      if (name === "shedId" || name === "shed") {
        updated["animalId"] = ""; // Clear selected animal when shed changes
        updated["lineNo"] = ""; // Clear selected row line No when shed changes
        setSelectedRow(""); // Clear selected row state
        const shedObj = getShedObject(value);
        const numRows = shedObj ? (shedObj.lines || 0) : 0;
        let rows = [];
        if (numRows > 0) {
          rows = Array.from({ length: numRows }, (_, i) => i + 1);
        } else {
          const animals = getAnimalsInShed(value);
          rows = Array.from(new Set(animals.map(a => a.lineNo || 0)));
        }
        const initialChecked = {};
        rows.forEach(r => {
          initialChecked[r] = false;
        });
        setCheckedRows(initialChecked);
      }

      if (name === "crossingType") {
        if (value === "Artificial") {
          updated["maleTag"] = "";
        } else if (value === "Natural") {
          updated["batchNumber"] = "";
        }
      }


      if (name === "crossingDate") {
        if (value) {
          const baseDate = parseDateString(value);
          if (baseDate) {
            // --- PD Date (3 Months) ---
            const pdDate = new Date(baseDate);
            pdDate.setMonth(pdDate.getMonth() + 3);
            updated["pdDate"] = pdDate.toISOString().split('T')[0];

            // --- Estimated Calving Date (10 Months) ---
            const estCalving = new Date(baseDate);
            estCalving.setMonth(estCalving.getMonth() + 10);
            updated["estimatedCalvingDate"] = estCalving.toISOString().split('T')[0];
          }
        } else {
          updated["pdDate"] = "";
          updated["estimatedCalvingDate"] = "";
        }
      }

      if (name === "dateOfBirth") {
        if (value) {
          const dob = parseDateString(value);
          if (dob) {
            const today = new Date();
          
          let years = today.getFullYear() - dob.getFullYear();
          let months = today.getMonth() - dob.getMonth();
          
          if (months < 0 || (months === 0 && today.getDate() < dob.getDate())) {
              years--;
              months += 12;
          }
          if (today.getDate() < dob.getDate()) {
              months--;
              if (months < 0) {
                 months += 12;
              }
          }
          
          if (years > 0) {
              updated.age = `${years} Yrs ${months} Mos`;
          } else if (months > 0) {
              updated.age = `${months} Mos`;
          } else {
              updated.age = `0 Mos`;
          }
          }
        } else {
          updated.age = "";
        }
      }


      if (type === 'number' && (name === 'attemptNo' || name === 'shed')) {
        updated[name] = value.replace(/[^0-9]/g, '');
      }

      if (name === "actualCalvingDate" && value) {
        const calvingDate = parseDateString(value);
        if (calvingDate) {
          // Add 45 days
          calvingDate.setDate(calvingDate.getDate() + 45);
          
          const heatDateFormatted = calvingDate.toISOString().split('T')[0];
          updated["heatMonitoring1stNotification"] = heatDateFormatted;
        }
      }


      if (name === "pregnancyStatus" && value === "Positive") {
    //  ADD THIS: Auto-calculate Est. Calving if CrossingDate exists
    if (updated["crossingDate"]) {
      const baseDate = parseDateString(updated["crossingDate"]);
      if (baseDate) {
        const estCalving = new Date(baseDate);
        estCalving.setMonth(estCalving.getMonth() + 10);
        updated["estimatedCalvingDate"] = estCalving.toISOString().split('T')[0];
      }
    }
  }

    if (name === "pregnancyStatus" && value === "Negative") {
      updated["pregnancyConfirmedDate"] = "";
      updated["estimatedCalvingDate"] = "";
      updated["actualCalvingDate"] = "";
      updated["calvingStatus"] = "";
      updated["calfTag"] = "";
      updated["breedType"] = "";
      updated["heatMonitoring2ndNotification"] = ""; 

      const pdDateValue = updated["pdDate"];
      if (pdDateValue) {
          const hDate = parseDateString(pdDateValue);
          if (hDate) {
            hDate.setDate(hDate.getDate() + 21);
            updated["heatMonitoring1stNotification"] = hDate.toISOString().split('T')[0];
          }
      }
  }


      if (name === "pregnancyStatus" && value == "Pending") {
    updated["pregnancyConfirmedDate"] = "";
    updated["estimatedCalvingDate"] = "";
    updated["actualCalvingDate"] = "";
    updated["calvingStatus"] = "";
    updated["calfTag"] = "";
    updated["breedType"] = "";
    updated["heatMonitoring1stNotification"] = "";
    updated["heatMonitoring2ndNotification"] = "";
  }


      if (name === "farmBorn" && value === "Yes") {
        updated.purchaseDate = "";
      }

      if (name === "oldStock" || name === "bought" || name === "usage" || name === "used") {
        const oldVal = Number(name === "oldStock" ? value : (updated.oldStock || 0));
        const boughtVal = Number(name === "bought" ? value : (updated.bought || 0));
        const usageField = fields.some(f => f.name === 'usage') ? 'usage' : (fields.some(f => f.name === 'used') ? 'used' : null);
        const usageVal = Number(usageField ? (name === usageField ? value : (updated[usageField] || 0)) : 0);
        
        const remaining = oldVal + boughtVal - usageVal;
        const remField = fields.some(f => f.name === 'remainingStock') ? 'remainingStock' : (fields.some(f => f.name === 'presentStock') ? 'presentStock' : null);
        if (remField) {
          updated[remField] = isNaN(remaining) ? 0 : remaining;
        }
      }

      if (name === "bought" && !Number(value)) {
        updated.purchaseDate = "";
      }

      if (name === "feedType" && value) {
        const prev = (existingRecords || []).find(r => 
          r && 
          String(r.feedType || '').trim().toLowerCase() === String(value).trim().toLowerCase()
        );
        updated["oldStock"] = prev ? (prev.remainingStock ?? 0) : 0;
        
        const oldVal = Number(updated.oldStock || 0);
        const boughtVal = Number(updated.bought || 0);
        const usageVal = Number(updated.usage || 0);
        updated["remainingStock"] = oldVal + boughtVal - usageVal;
      }

      if (name === "medicineName" && value) {
        const prev = (existingRecords || []).find(r => 
          r && 
          String(r.medicineName || '').trim().toLowerCase() === String(value).trim().toLowerCase()
        );
        updated["oldStock"] = prev ? (prev.presentStock ?? prev.remainingStock ?? 0) : 0;

        const medObj = medicinesList.find(m => String(m.name).toLowerCase() === String(value).toLowerCase());
        if (medObj && medObj.type) {
          updated["type"] = medObj.type;
        }

        const oldVal = Number(updated.oldStock || 0);
        const boughtVal = Number(updated.bought || 0);
        const usedVal = Number(updated.used || 0);
        updated["presentStock"] = oldVal + boughtVal - usedVal;

        const prevRecord = (existingRecords || []).find(r => 
          r && 
          String(r.medicineName || '').trim().toLowerCase() === String(value).trim().toLowerCase() && 
          r.expiryDate
        );
        if (prevRecord && !updated.expiryDate) {
          try {
            const parsed = parseDateString(prevRecord.expiryDate);
            if (parsed && !isNaN(parsed.getTime())) {
              updated.expiryDate = parsed.toISOString().split('T')[0];
            }
          } catch (e) {
            console.error("Failed to parse previous expiryDate:", e);
          }
        }
      }

      if (name === "vaccinationName" && value) {
        const matches = vaccinesList.filter(v => v.vaccinationName === value);
        if (matches.length >= 1) {
          const match = matches[0];
          updated["batchNo"] = match.batchNo || "";
          if (match.manufactureDate) {
            updated["manufactureDate"] = new Date(match.manufactureDate).toISOString().split('T')[0];
          }
          if (match.expiryDate) {
            updated["expiryDate"] = new Date(match.expiryDate).toISOString().split('T')[0];
          }
        } else {
          updated["batchNo"] = "";
          updated["manufactureDate"] = "";
          updated["expiryDate"] = "";
        }
      }

      if (name === "batchNo" && value) {
        const matches = vaccinesList.filter(v => 
          (!formData.vaccinationName || v.vaccinationName === formData.vaccinationName) &&
          v.batchNo === value
        );
        if (matches.length >= 1) {
          const match = matches[0];
          if (!formData.vaccinationName) {
            updated["vaccinationName"] = match.vaccinationName || "";
          }
          if (match.manufactureDate) {
            updated["manufactureDate"] = new Date(match.manufactureDate).toISOString().split('T')[0];
          }
          if (match.expiryDate) {
            updated["expiryDate"] = new Date(match.expiryDate).toISOString().split('T')[0];
          }
        }
      }


    // NEW: AUTO-CALCULATE PREGNANT AGE (Y M D Format)
      if ((name === "pregnancyStatus" && value === "Positive") || (name === "crossingDate" && updated["pregnancyStatus"] === "Positive")) {
        const cDateVal = name === "crossingDate" ? value : updated["crossingDate"];
        
        if (cDateVal) {
          const start = parseDateString(cDateVal);
          const today = new Date();
          
          if (start && start <= today) {
            let years = today.getFullYear() - start.getFullYear();
            let months = today.getMonth() - start.getMonth();
            let days = today.getDate() - start.getDate();

            if (days < 0) {
              months -= 1;
              const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
              days += prevMonth.getDate();
            }
            if (months < 0) {
              years -= 1;
              months += 12;
            }

            let pAgeText = `${years} Y`;
            if (months > 0) pAgeText += ` ${months} M`;
            if (days > 0) pAgeText += ` ${days} D`;
            
            updated["pregnantAge"] = pAgeText;
          } else {
            updated["pregnantAge"] = "Invalid Date";
          }
        }
      }

      // NEW: Clear Pregnant Age if status is no longer Positive
      if (name === "pregnancyStatus" && value !== "Positive") {
        updated["pregnantAge"] = "";
      }


  // AUTO CALCULATE AGE WHEN DOB
  if (name === "dob") {
    if (value) {
      const birth = parseDateString(value);
      const today = new Date();

      if (birth && birth > today) {
        updated.age = "Invalid Date";
        setDobError("Future date not allowed");
        return updated;
      } else {
        setDobError("");
      }

      if (birth) {
        const years = today.getFullYear() - birth.getFullYear();
      const months = today.getMonth() - birth.getMonth();
      const days = today.getDate() - birth.getDate();

      let finalYears = years;
      let finalMonths = months;
      let finalDays = days;

      // Adjust negative days
      if (finalDays < 0) {
        finalMonths -= 1;
        const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        finalDays += prevMonth.getDate();
      }

      // Adjust negative months
      if (finalMonths < 0) {
        finalYears -= 1;
        finalMonths += 12;
      }

      let ageText = `${finalYears} Y`;

      if (finalMonths > 0) {
        ageText += ` ${finalMonths} M`;
      }

      if (finalDays > 0) {
        ageText += ` ${finalDays} D`;
      }

      updated.age = ageText;
      }
    } else {
      updated.age = "";
    }
  }

      return updated;
    });
  };


  const noFutureDates = [
    "dob",
    "dateOfBirth",
    "crossingDate",
    "pregnancyConfirmedDate",
    "actualCalvingDate",
    "saleDate",
    "date",
    "purchaseDate",
    "shiftingDate"
  ];

    return (
      // <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
      //   <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">

        <div className="fixed inset-0 bg-[#16223F]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-7 rounded-3xl shadow-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto border border-slate-100 relative">

            {/* CLOSE ICON */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-all font-bold z-10"
              type="button"
            >
              ✕
            </button>

          <h2 className="text-xl font-extrabold mb-5 text-[#16223F] tracking-tight flex-shrink-0 pr-10">{title}</h2>
          <form 
            onSubmit={(e) => { 
              e.preventDefault(); 
              if (tagError || dobError || userIdError) return;

              const isFeeding = fields.some(f => f.name === 'animalId' && f.label?.includes("Animal"));
              if (isFeeding) {
                if (!selectedRow) {
                  swalError("Validation Error", "Please select a row.");
                  return;
                }
                const finalData = {
                  ...formData,
                  animalId: `Row ${selectedRow}`,
                  tag_id: `Row ${selectedRow}`
                };
                onSubmit(finalData);
              } else {
                onSubmit(formData); 
              }
            }} 
            className="space-y-4 overflow-y-auto pr-2 custom-scrollbar"
          >
            {fields.map((originalField) => {
              const field = { ...originalField };
              if (field.name === 'medicineName') {
                field.type = 'select';
                field.options = medicinesList.map(m => m.name);
              }
              if (field.name === 'treatment' && (title?.toLowerCase().includes('treatment') || title?.toLowerCase().includes('health'))) {
                field.type = 'select';
                field.options = medicinesList.map(m => m.name);
              }
              if (field.name === 'feedType') {
                field.type = 'select';
                field.options = feedItemsList;
              }
              if (field.name === 'vaccinationName') {
                field.type = 'select';
                field.options = Array.from(new Set(vaccinesList.map(v => v.vaccinationName).filter(Boolean)));
              }
              if (field.name === 'batchNo') {
                field.type = 'select';
                const filtered = formData.vaccinationName 
                  ? vaccinesList.filter(v => v.vaccinationName === formData.vaccinationName) 
                  : vaccinesList;
                field.options = Array.from(new Set(filtered.map(v => v.batchNo).filter(Boolean)));
              }
              if (field.name === 'manufactureDate') {
                field.type = 'select';
                const filtered = formData.vaccinationName 
                  ? vaccinesList.filter(v => v.vaccinationName === formData.vaccinationName) 
                  : vaccinesList;
                field.options = Array.from(new Set(filtered.map(v => v.manufactureDate ? new Date(v.manufactureDate).toISOString().split('T')[0] : '').filter(Boolean)));
              }
              if (field.name === 'expiryDate' && fields.some(f => f.name === 'vaccinationName')) {
                field.type = 'select';
                const filtered = formData.vaccinationName 
                  ? vaccinesList.filter(v => v.vaccinationName === formData.vaccinationName) 
                  : vaccinesList;
                field.options = Array.from(new Set(filtered.map(v => v.expiryDate ? new Date(v.expiryDate).toISOString().split('T')[0] : '').filter(Boolean)));
              }
              // Dynamic conditional fields for Crossing Log (Natural vs Artificial)
              const cType = formData.crossingType || 'Natural';
              if (field.name === 'maleTag' && cType === 'Artificial') return null;
              if (field.name === 'batchNumber' && cType === 'Natural') return null;

              if (field.name === 'password' && (initialData?.id || initialData?._id)) {
                return (
                  <div key={field.name}>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-0.5">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        const { value: newPassword } = await Swal.fire({
                          title: 'Reset Password',
                          input: 'password',
                          inputLabel: 'Enter new password for this user',
                          inputPlaceholder: 'Minimum 6 characters',
                          showCancelButton: true,
                          confirmButtonText: 'Update Password',
                          confirmButtonColor: '#16223F',
                          cancelButtonColor: '#e11d48',
                          inputAttributes: {
                            minlength: '6',
                            autocapitalize: 'off',
                            autocorrect: 'off'
                          },
                          inputValidator: (value) => {
                            if (!value) {
                              return 'You need to write something!';
                            }
                            if (value.length < 6) {
                              return 'Password must be at least 6 characters!';
                            }
                          }
                        });

                        if (newPassword) {
                          setFormData(prev => ({ ...prev, password: newPassword }));
                          Swal.fire({
                            icon: 'success',
                            title: 'Password Set',
                            text: 'The password has been set in the form. Please click "Save" to submit the changes.',
                            confirmButtonColor: '#16223F'
                          });
                        }
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-[#16223F] font-bold py-2.5 px-4 rounded-xl border border-slate-200 text-xs transition-all w-full flex items-center justify-center gap-2"
                    >
                      🔑 Reset User Password
                    </button>
                    {formData.password && (
                      <p className="text-emerald-600 text-xs font-bold mt-1.5 ml-0.5">✓ New password staged (will save on submit)</p>
                    )}
                  </div>
                );
              }

              return (
                <div key={field.name}>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-0.5">
                  {(field.name === 'animalId' && field.label?.includes("Animal") && !initialData?.id && !initialData?._id) ? "Rows" : field.label}
                </label>
                {field.type === "select" ? (
                  ["symptoms", "diagnosis", "treatment"].includes(field.name) && (title?.toLowerCase().includes("treatment") || title?.toLowerCase().includes("health") || title?.toLowerCase().includes("symptom")) ? (
                    (() => {
                      const currentVal = formData[field.name] || "";
                      const selectedItems = currentVal ? currentVal.split(", ").map(s => s.trim()).filter(Boolean) : [];
                      
                      const handleAddItem = (itemToAdd) => {
                        const trimmed = String(itemToAdd).trim();
                        if (trimmed && !selectedItems.includes(trimmed)) {
                          const newItems = [...selectedItems, trimmed];
                          setFormData(prev => ({
                            ...prev,
                            [field.name]: newItems.join(", ")
                          }));
                        }
                      };

                      const handleRemoveItem = (itemToRemove) => {
                        const newItems = selectedItems.filter(item => item !== itemToRemove);
                        setFormData(prev => ({
                          ...prev,
                          [field.name]: newItems.join(", ")
                        }));
                      };

                      let optionsToRender = [...(field.options || [])];

                      return (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-slate-50 border border-slate-200/60 rounded-xl">
                            {selectedItems.length === 0 ? (
                              <span className="text-xs text-slate-400 font-medium p-1">No {field.label.toLowerCase()} added yet.</span>
                            ) : (
                              selectedItems.map(item => (
                                <span key={item} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#16223F] text-white animate-fadeIn">
                                  {item}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(item)}
                                    className="hover:text-red-400 font-bold focus:outline-none ml-1 text-[10px]"
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <select
                              className="flex-1 h-11 border border-slate-200 rounded-xl px-3 bg-white text-black text-xs font-semibold outline-none focus:border-[#D1867D]"
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAddItem(e.target.value);
                                  e.target.value = "";
                                }
                              }}
                            >
                              <option value="">Select {field.label}...</option>
                              {optionsToRender.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>

                            <input
                              type="text"
                              placeholder="Or type new..."
                              id={`custom-input-${field.name}`}
                              className="w-1/3 h-11 border border-slate-200 rounded-xl px-3 text-xs bg-white text-black outline-none focus:border-[#D1867D]"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddItem(e.target.value);
                                  e.target.value = "";
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById(`custom-input-${field.name}`);
                                if (input && input.value) {
                                  handleAddItem(input.value);
                                  input.value = "";
                                }
                              }}
                              className="px-3 bg-[#D1867D] hover:bg-[#c0756c] text-white text-xs font-bold rounded-xl h-11 transition-colors"
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  ) : field.name === "role" && title?.includes("User") ? (
                    <div className="flex flex-col gap-2">
                      <div className="relative">
                        <div
                          onClick={() => setDropdownOpen(!dropdownOpen)}
                          className="mt-1 flex justify-between items-center w-full border border-slate-200 rounded-xl p-2.5 bg-white text-black focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200 cursor-pointer"
                        >
                          <span className="font-semibold text-sm text-[#071437]">
                            {formData.role ? (roleList.find(r => r.name === formData.role)?.name || formData.role) : `Select System Profile`}
                          </span>
                          <span className="text-xs text-slate-400">▼</span>
                        </div>

                        {dropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3.5 flex flex-col gap-2.5 max-h-[220px] overflow-y-auto custom-scrollbar">
                            <input
                              type="text"
                              placeholder="Search roles..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-[#071437] font-semibold text-[#071437]"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex flex-col gap-1.5">
                              {roleList
                                .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map(role => (
                                  <div
                                    key={role._id || role.id}
                                    onClick={() => {
                                      setFormData(prev => ({ ...prev, role: role.name }));
                                      setDropdownOpen(false);
                                      setSearchQuery("");
                                    }}
                                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all duration-250 ${
                                      formData.role === role.name 
                                        ? 'bg-[#071437] text-white shadow-sm' 
                                        : 'bg-slate-50 text-[#071437] hover:bg-slate-100 hover:translate-x-0.5'
                                    }`}
                                  >
                                    {role.name}
                                    <span className="block text-[10px] opacity-70 font-semibold mt-0.5">{role.description || 'No description provided.'}</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Read-Only Access Feedback Summary badges */}
                      {formData.role && (
                        <div className="mt-2 bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-2">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Access Permissions Summary</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(() => {
                              const selectedRoleObj = roleList.find(r => r.name === formData.role);
                              if (!selectedRoleObj) return <span className="text-xs text-slate-400 font-semibold">Standard database access.</span>;
                              
                              const perms = selectedRoleObj.permissions || [];
                              if (perms.includes('ALL')) {
                                return (
                                  <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                                    🌟 Full Master Control (Super Admin)
                                  </span>
                                );
                              }

                              const matchedModules = [];
                              const mappings = {
                                'USER_MANAGEMENT': '👥 User Management',
                                'DEPARTMENT': '🏢 Department',
                                'FARM_MANAGEMENT': '🏠 Farm Management',
                                'SHED_MANAGEMENT': '⚙️ Shed Management',
                                'CATTLE_MANAGEMENT': '🐄 Cattle Management',
                                'LIVESTOCK': '🐄 Live Stock',
                                'SHED_LOG': '📝 Shed Log',
                                'CROSSING_LOG': '🧬 Crossing Log',
                                'PURCHASE_LOG': '📥 Purchase Log',
                                'SALE_LOG': '📤 Sale Log',
                                'HEALTH': '🩺 Health Log'
                              };

                              Object.entries(mappings).forEach(([prefix, label]) => {
                                const hasAccess = perms.some(p => p.startsWith(prefix));
                                if (hasAccess) {
                                  matchedModules.push(label);
                                }
                              });

                              if (matchedModules.length === 0) {
                                return <span className="text-xs text-slate-400 font-semibold">No active permissions.</span>;
                              }

                              return matchedModules.map(label => (
                                <span key={label} className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200">
                                  {label}
                                </span>
                              ));
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    (() => {
                       if (field.name === 'animalId' && field.label?.includes("Animal")) {
                        const selectedShed = formData.shedId || formData.shed;
                        if (!selectedShed) {
                          return (
                            <div className="mt-1 text-xs text-slate-400 font-bold border border-slate-200 rounded-xl p-3 bg-slate-50">
                              Please select a shed first to view animal options.
                            </div>
                          );
                        }
                        const shedObj = getShedObject(selectedShed);
                        const numRows = shedObj ? (shedObj.lines || 0) : 0;
                        let sortedRowNums = [];
                        if (numRows > 0) {
                          sortedRowNums = Array.from({ length: numRows }, (_, i) => i + 1);
                        } else {
                          const animalsInShed = getAnimalsInShed(selectedShed);
                          sortedRowNums = Array.from(new Set(animalsInShed.map(a => a.lineNo || 0))).sort((a, b) => a - b);
                        }

                        if (sortedRowNums.length === 0) {
                          return (
                            <div className="mt-1 text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl p-3 bg-slate-50/50">
                              No rows defined or found in shed {selectedShed}.
                            </div>
                          );
                        }

                        return (
                          <select
                            name="selectedRow"
                            value={selectedRow}
                            onChange={(e) => setSelectedRow(e.target.value)}
                            required
                            className="mt-1 block w-full border border-slate-200 rounded-xl p-2.5 bg-white text-[#16223F] outline-none transition-all duration-200 focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 text-sm font-semibold"
                          >
                            <option value="">Select Row</option>
                            {sortedRowNums.map(rowNum => (
                              <option key={rowNum} value={rowNum}>
                                Row {rowNum}
                              </option>
                            ))}
                          </select>
                        );
                      }

                      if (field.name === 'lineNo') {
                        const selectedShed = formData.shedId || formData.shed;
                        if (!selectedShed) {
                          return (
                            <div className="mt-1 text-xs text-slate-400 font-bold border border-slate-200 rounded-xl p-3 bg-slate-50">
                              Please select a shed first to view row options.
                            </div>
                          );
                        }
                        const shedObj = getShedObject(selectedShed);
                        const numRows = shedObj ? (shedObj.lines || 0) : 0;
                        let rowOptions = [];
                        if (numRows > 0) {
                          rowOptions = Array.from({ length: numRows }, (_, i) => i + 1);
                        } else {
                          const animals = getAnimalsInShed(selectedShed);
                          rowOptions = Array.from(new Set(animals.map(a => a.lineNo || 0))).filter(r => r > 0).sort((a, b) => a - b);
                          if (rowOptions.length === 0) {
                            rowOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // fallback
                          }
                        }

                        return (
                          <select
                            name="lineNo"
                            value={formData.lineNo || ""}
                            required={!field.optional}
                            disabled={field.disabled}
                            className="mt-1 block w-full border border-slate-200 rounded-xl p-2.5 bg-white text-[#16223F] outline-none transition-all duration-200 focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 text-sm font-semibold"
                            onChange={handleChange}
                          >
                            <option value="">Select Row / Line</option>
                            {rowOptions.map(r => (
                              <option key={r} value={r}>Row {r}</option>
                            ))}
                          </select>
                        );
                      }

                      let selectOptions = field.options || [];
                      if (['shed', 'oldShed', 'newShed', 'shedId'].includes(field.name) && allShedsList.length > 0) {
                        if (field.name === 'shed' || field.name === 'shedId') {
                          const selectedFarmId = formData.farmId && typeof formData.farmId === 'object'
                            ? (formData.farmId._id || formData.farmId.id)
                            : formData.farmId;
                          if (selectedFarmId) {
                            const matchingSheds = allShedsList.filter(s => {
                              const sFarmId = s.farmId?._id || s.farmId?.id || s.farmId;
                              return String(sFarmId) === String(selectedFarmId);
                            });
                            selectOptions = matchingSheds.map(s => s.name || s.code);
                            if (!selectOptions.includes('-')) {
                              selectOptions.push('-');
                            }
                          } else {
                            selectOptions = allShedsList.map(s => s.name || s.code);
                            if (!selectOptions.includes('-')) {
                              selectOptions.push('-');
                            }
                          }
                        } else {
                          // Show all sheds across all farms for oldShed / newShed
                          selectOptions = allShedsList.map(s => s.name || s.code);
                          if (!selectOptions.includes('-')) {
                            selectOptions.push('-');
                          }
                        }
                      }

                      let optionsToRender = [...selectOptions];
                      const curVal = formData[field.name];
                      if (curVal && curVal !== '-' && String(curVal).toUpperCase() !== 'PENDING') {
                        const hasVal = optionsToRender.some(opt => {
                          const isObj = typeof opt === 'object' && opt !== null;
                          const val = isObj ? opt.value : opt;
                          return String(val) === String(curVal);
                        });
                        if (!hasVal) {
                          optionsToRender.push(curVal);
                        }
                      }

                      return (
                        <select
                          name={field.name}
                          value={
                            ((field.name === "shed" || field.name === "shedId") && formData[field.name] === "-") ||
                            ((field.name === "cattleType" || field.name === "animalType") && String(formData[field.name]).toUpperCase() === "PENDING")
                              ? ""
                              : (formData[field.name] || "")
                          }
                          required={isFieldRequired(field)}
                          disabled={field.name === "oldShed" || field.disabled}
                          className={`mt-1 block w-full border rounded-xl p-2.5 outline-none transition-all duration-200 focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 ${
                            field.name === 'oldShed' || field.disabled
                              ? 'bg-slate-50 border-slate-100 cursor-not-allowed text-slate-400 font-semibold'
                              : 'bg-white text-black border-slate-200'
                          }`}
                          onChange={handleChange}
                        >
                          <option value="">Select {field.label}</option>
                          {optionsToRender.map((opt) => {
                            const isObj = typeof opt === 'object' && opt !== null;
                            const val = isObj ? opt.value : opt;
                            const label = isObj ? opt.label : opt;
                            return (
                              <option key={val} value={val}>
                                {label}
                              </option>
                            );
                          })}
                        </select>
                      );
                    })()
                  )
) : (field.name === 'tag' || field.name === 'tagId' || field.name === 'animalId' || field.name === 'maleTag') && !title?.toLowerCase().includes('live stock') && !title?.toLowerCase().includes('purchase') ? (
  <LivestockTagInput
    name={field.name}
    value={formData[field.name] || ''}
    required={!field.optional && (field.name !== 'maleTag' || (formData.crossingType || 'Natural') === 'Natural')}
    disabled={false}
    placeholder={`Type or scan ${field.label}...`}
    validationMode="must_exist"
    filterFn={
      title?.toLowerCase().includes('crossing')
        ? (field.name === 'maleTag' ? (animal) => animal.gender === 'male' : (animal) => animal.gender === 'female')
        : null
    }
    onChange={(fieldName, tagValue, animalRecord) => {
      setFormData(prev => {
        const updated = { ...prev, [fieldName]: tagValue };
        if (fieldName === 'tagId' || fieldName === 'tag' || fieldName === 'animalId') {
          if (animalRecord) {
            const shedVal = animalRecord.shed || animalRecord.shedId || "";
            if (shedVal) {
              if (fields.some(f => f.name === 'shedId')) updated.shedId = shedVal;
              if (fields.some(f => f.name === 'shed')) updated.shed = shedVal;
              if (fields.some(f => f.name === 'oldShed')) updated.oldShed = shedVal;
            }
            const typeVal = animalRecord.animalType || animalRecord.cattleType || "";
            if (typeVal) {
              if (fields.some(f => f.name === 'animalType')) updated.animalType = typeVal;
              if (fields.some(f => f.name === 'animalId')) updated.animalId = typeVal;
            }
            if (animalRecord.farmId) {
              updated.farmId = typeof animalRecord.farmId === 'object'
                ? (animalRecord.farmId._id || animalRecord.farmId.id || animalRecord.farmId)
                : animalRecord.farmId;
            }
          } else {
            const cachedShed = getShedFromLivestock(tagValue);
            if (cachedShed) {
              if (fields.some(f => f.name === 'shedId')) updated.shedId = cachedShed;
              if (fields.some(f => f.name === 'shed')) updated.shed = cachedShed;
              if (fields.some(f => f.name === 'oldShed')) updated.oldShed = cachedShed;
            }
            const cachedType = getAnimalTypeFromLivestock(tagValue);
            if (cachedType) {
              if (fields.some(f => f.name === 'animalType')) updated.animalType = cachedType;
              if (fields.some(f => f.name === 'animalId')) updated.animalId = cachedType;
            }
          }
        }
        return updated;
      });
    }}
    onValidation={(isValid, message) => {
      setTagError(isValid ? '' : message);
    }}
  />
) : (
  <>      <input
    type={field.type || "text"}
    name={field.name}


    // max={field.name === "dob" ? new Date().toISOString().split("T")[0] : undefined}
    max={
    field.type === "date" && noFutureDates.includes(field.name)
      ? new Date().toISOString().split("T")[0]
      : undefined
  }

  value={
      /*  Show "-" for Pregnant Age if not Positive */
      field.name === "pregnantAge" && formData["pregnancyStatus"] !== "Positive"
        ? "-"
        : (["pregnancyConfirmedDate", "estimatedCalvingDate", "actualCalvingDate", "calvingStatus", "calfTag", "heatMonitoring2ndNotification"].includes(field.name) && formData["pregnancyStatus"] !== "Positive") ||
          (field.name === "heatMonitoring1stNotification" && !["Positive", "Negative"].includes(formData["pregnancyStatus"])) ||
          (field.name === "purchaseDate" && formData.farmBorn === "Yes")
        ? "-" 
        : formData[field.name] || ""
    }
    /*  Required Logic */
  

     required={isFieldRequired(field)}


    /*  Updated Disabled Logic: 1st Notification remains enabled if status is Negative */
  disabled={
      field.disabled === true ||
      (field.name === "purchaseDate" && title?.toLowerCase().includes("feed") && !Number(formData.bought)) ||
      (field.name === "pregnantAge" && formData["pregnancyStatus"] !== "Positive") ||
      (["pregnancyConfirmedDate", "estimatedCalvingDate", "actualCalvingDate", "calvingStatus", "calfTag", "heatMonitoring2ndNotification"].includes(field.name) && formData["pregnancyStatus"] !== "Positive") ||
      (field.name === "heatMonitoring1stNotification" && !["Positive", "Negative"].includes(formData["pregnancyStatus"])) ||
      (field.name === "purchaseDate" && formData.farmBorn === "Yes") ||
      field.name === "age" || 
      field.name === "pregnantAge"
    }

    /*  Added Whole Number protection */
    min={field.type === "number" ? "0" : undefined}
    step={field.type === "number" ? "1" : undefined}
    
    readOnly={field.name === "age" || field.name === "pregnantAge"}
    
    className={`mt-1 block w-full border rounded-xl p-2.5 focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200 ${
      field.disabled === true ||
      field.name === "age" || 
      field.name === "pregnantAge" || 
      (field.name === "purchaseDate" && formData.farmBorn === "Yes") ||
      (field.name === "purchaseDate" && title?.toLowerCase().includes("feed") && !Number(formData.bought)) ||
      (["pregnancyConfirmedDate", "estimatedCalvingDate", "actualCalvingDate", "calvingStatus", "calfTag", "heatMonitoring2ndNotification"].includes(field.name) && formData["pregnancyStatus"] !== "Positive") ||
      (field.name === "heatMonitoring1stNotification" && !["Positive", "Negative"].includes(formData["pregnancyStatus"]))
        ? "bg-slate-50 border-slate-100 cursor-not-allowed text-slate-500 font-semibold" 
        : "bg-white text-black border-slate-200"
    }`}


    onChange={(e) => {
    handleChange(e);

    if (field.name === "tag") {
      const shedValue = getShedFromLivestock(e.target.value);

      if (shedValue) {
        setFormData(prev => ({
          ...prev,
          oldShed: shedValue   // AUTO FILL
        }));
      }

      // Check tag existence for Live Stock module registration
      if (title?.toLowerCase().includes('live stock')) {
        const val = e.target.value;
        if (val.trim() !== "") {
          const exists = (existingRecords || []).some(r => {
            const rTag = r.tag || r.tag_id || r.tagId;
            if (!rTag) return false;
            if (String(rTag).trim().toLowerCase() === val.trim().toLowerCase()) {
              if (initialData?.id && r.id === initialData.id) return false;
              if (initialData?._id && r._id === initialData._id) return false;
              return true;
            }
            return false;
          });
          if (exists) {
            setTagError("Tag ID already exists");
          } else {
            setTagError("");
          }
        } else {
          setTagError("");
        }
      }

      // Check tag existence for Purchase module registration (Real-time duplicate check)
      if (title?.toLowerCase().includes('purchase')) {
        const val = e.target.value;
        if (val.trim() !== "") {
          const oldTag = initialData?.tag || initialData?.tag_id || initialData?.tagId || '';
          if (String(oldTag).trim().toLowerCase() === val.trim().toLowerCase()) {
            setTagError("");
          } else {
            const exists = checkTagExistsInLivestock(val);
            if (exists) {
              setTagError("Tag ID already exists");
            } else {
              setTagError("");
            }
          }
        } else {
          setTagError("");
        }
      }
    }

    if (field.name === "userId") {
      if (existingRecords && existingRecords.length > 0) {
        const value = e.target.value;
        if (value.trim() !== "") {
          const exists = existingRecords.some(r => {
            if (!r.userId) return false;
            if (r.userId.toLowerCase() !== value.trim().toLowerCase()) return false;
            if (initialData?.id && r.id === initialData.id) return false;
            if (initialData?._id && r._id === initialData._id) return false;
            return true;
          });
          if (exists) {
            setUserIdError("User ID already exists");
          } else {
            setUserIdError("");
          }
        } else {
          setUserIdError("");
        }
      }
    }
  }}
  />

  {field.name === "dob" && dobError && (
        <p className="text-red-500 text-xs mt-1">{dobError}</p>
      )}
  {field.name === "userId" && userIdError && (
        <p className="text-red-500 text-xs mt-1">{userIdError}</p>
      )}
  {field.name === "tag" && tagError && (
        <p className="text-red-500 text-xs mt-1">{tagError}</p>
      )}
    </>

      )}
                </div>
              );
            })}


            <div className="flex gap-3 mt-7">
              {/* <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-lg">Save</button>
              <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg">Cancel</button> */}
              {/* <button
    type="submit"
    className="flex-1 bg-green-600 text-white py-2 rounded-lg
    transition-all duration-200 ease-out
    hover:bg-green-700 hover:shadow-md hover:-translate-y-[1px]"
  >
    Save
  </button> */}



  <button
    type="submit"
    disabled={tagError !== "" || dobError !== "" || userIdError !== ""}
    className={`flex-1 py-3 rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2
    ${(tagError || dobError || userIdError)
      ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-100" 
      : "bg-[#16223F] hover:bg-[#2a3f75] text-white hover:-translate-y-0.5 active:scale-95"
    }`}
  >
    Save
  </button>

  <button
    type="button"
    onClick={onClose}
    className="flex-1 bg-slate-100 text-slate-600 hover:bg-slate-200 py-3 rounded-xl font-bold shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all border border-slate-200"
  >
    Cancel
  </button>

  {onDelete && (
    <button
      type="button"
      onClick={onDelete}
      className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 py-3 rounded-xl font-bold shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all border border-red-100"
    >
      Delete
    </button>
  )}
            </div>
          </form>
        </div>
      </div>
    );
  };

  export default LogForm;
