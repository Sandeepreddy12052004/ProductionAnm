  import React, { useState } from 'react';
  import LivestockTagInput from './LivestockTagInput';

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

    React.useEffect(() => {
      const hasShedField = (fields || []).some(f => ['shed', 'oldShed', 'newShed'].includes(f.name));
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


    const handleChange = (e) => {
    const { name, value, type } = e.target;

    setFormData(prev => {
      const updated = { ...prev, [name]: value };

      if (name === "farmId") {
        updated["shed"] = ""; // Clear selected shed when farm changes
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
    updated["calfTag"] = "";
    updated["breedType"] = "";
    updated["heatMonitoring1stNotification"] = "";
    updated["heatMonitoring2ndNotification"] = "";
  }


      if (name === "farmBorn" && value === "Yes") {
        updated.purchaseDate = "";
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
    "crossingDate",
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
              onSubmit(formData); 
            }} 
            className="space-y-4 overflow-y-auto pr-2 custom-scrollbar"
          >
            {fields.map((field) => {
              // Dynamic conditional fields for Crossing Log (Natural vs Artificial)
              const cType = formData.crossingType || 'Natural';
              if (field.name === 'maleTag' && cType === 'Artificial') return null;
              if (field.name === 'batchNumber' && cType === 'Natural') return null;

              return (
                <div key={field.name}>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-0.5">{field.label}</label>
                {field.type === "select" ? (
                  field.name === "role" && title?.includes("User") ? (
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
                      let selectOptions = field.options || [];
                      if (['shed', 'oldShed', 'newShed'].includes(field.name) && allShedsList.length > 0) {
                        if (field.name === 'shed') {
                          const selectedFarmId = formData.farmId;
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
                            selectOptions = ['-'];
                          }
                        } else {
                          // Show all sheds across all farms for oldShed / newShed
                          selectOptions = allShedsList.map(s => s.name || s.code);
                          if (!selectOptions.includes('-')) {
                            selectOptions.push('-');
                          }
                        }
                      }

                      return (
                        <select
                          name={field.name}
                          value={formData[field.name] || ""}
                          required={!field.optional && field.name !== "age" && field.name !== "oldShed"}
                          disabled={field.name === "oldShed"}
                          className={`mt-1 block w-full border rounded-xl p-2.5 outline-none transition-all duration-200 focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 ${
                            field.name === 'oldShed'
                              ? 'bg-slate-50 border-slate-100 cursor-not-allowed text-slate-400 font-semibold'
                              : 'bg-white text-black border-slate-200'
                          }`}
                          onChange={handleChange}
                        >
                          <option value="">Select {field.label}</option>
                          {selectOptions.map((opt) => {
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
) : (field.name === 'tag' || field.name === 'tagId' || field.name === 'animalId' || field.name === 'maleTag') && !title?.toLowerCase().includes('live stock') ? (
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
        let shedValue = "";
        if (animalRecord) {
          shedValue = animalRecord.shed || animalRecord.shedId || "";
        } else {
          shedValue = getShedFromLivestock(tagValue);
        }
        if (shedValue) {
          updated.oldShed = shedValue;
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
        : (["pregnancyConfirmedDate", "estimatedCalvingDate", "actualCalvingDate", "calfTag", "heatMonitoring2ndNotification"].includes(field.name) && formData["pregnancyStatus"] !== "Positive") ||
          (field.name === "heatMonitoring1stNotification" && !["Positive", "Negative"].includes(formData["pregnancyStatus"])) ||
          (field.name === "purchaseDate" && formData.farmBorn === "Yes")
        ? "-" 
        : formData[field.name] || ""
    }
    /*  Required Logic */
  

     required={
  !field.optional && (
    field.name === "breedType"
      ? !!formData["actualCalvingDate"]
    : ["pregnancyConfirmedDate", "estimatedCalvingDate"].includes(field.name) 
      ? formData["pregnancyStatus"] === "Positive"
    : ["calfTag", "heatMonitoring1stNotification"].includes(field.name)
      ? !!formData["actualCalvingDate"] 
    : field.name === "purchaseDate" 
      ? formData.farmBorn === "No"
    : field.name !== "age" && 
      !["actualCalvingDate", "remarks", "heatMonitoring2ndNotification"].includes(field.name)
  )
}


    /*  Updated Disabled Logic: 1st Notification remains enabled if status is Negative */
  disabled={
      (field.name === "pregnantAge" && formData["pregnancyStatus"] !== "Positive") ||
      (["pregnancyConfirmedDate", "estimatedCalvingDate", "actualCalvingDate", "calfTag", "heatMonitoring2ndNotification"].includes(field.name) && formData["pregnancyStatus"] !== "Positive") ||
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
      field.name === "age" || 
      field.name === "pregnantAge" || 
      (field.name === "purchaseDate" && formData.farmBorn === "Yes") ||
      (["pregnancyConfirmedDate", "estimatedCalvingDate", "actualCalvingDate", "calfTag", "heatMonitoring2ndNotification"].includes(field.name) && formData["pregnancyStatus"] !== "Positive") ||
      (field.name === "heatMonitoring1stNotification" && !["Positive", "Negative"].includes(formData["pregnancyStatus"]))
        ? "bg-slate-50 border-slate-100 cursor-not-allowed text-slate-400" 
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
