  import React, { useState } from 'react';

  const LogForm = ({ title, fields, onSubmit, onClose, initialData = {}, existingRecords = [] }) => {

    const formatInitialData = (data, fields) => {
      const formatted = { ...data };
      fields.forEach(field => {
        if (field.type === 'date' && formatted[field.name]) {
          formatted[field.name] = formatted[field.name].split('T')[0];
        }
      });
      return formatted;
    };

    const [formData, setFormData] = useState(() => formatInitialData(initialData, fields));
    const [tagError, setTagError] = useState("");
    const [dobError, setDobError] = useState("");
    const [userIdError, setUserIdError] = useState("");


  const getShedFromLivestock = (tagValue) => {
    const livestock = JSON.parse(localStorage.getItem("global_livestock_logs")) || [];
    const found = livestock.find(item => item.tag === tagValue);
    return found ? found.shed : "";
  };


    const handleChange = (e) => {
    const { name, value, type } = e.target;

    setFormData(prev => {
      const updated = { ...prev, [name]: value };


      if (name === "crossingDate") {
        if (value) {
          const baseDate = new Date(value);
          
          // --- PD Date (3 Months) ---
          const pdDate = new Date(baseDate);
          pdDate.setMonth(pdDate.getMonth() + 3);
          updated["PD date"] = pdDate.toISOString().split('T')[0];

          // --- Estimated Calving Date (10 Months) ---
          const estCalving = new Date(baseDate);
          estCalving.setMonth(estCalving.getMonth() + 10);
          updated["estimated calving date"] = estCalving.toISOString().split('T')[0];
        } else {
          updated["PD date"] = "";
          updated["estimated calving date"] = "";
        }
      }

      if (name === "dateOfBirth") {
        if (value) {
          const dob = new Date(value);
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
        } else {
          updated.age = "";
        }
      }


      if (type === 'number' && (name === 'attemptNo' || name === 'shed')) {
        updated[name] = value.replace(/[^0-9]/g, '');
      }

      if (name === "actual calving date" && value) {
        const calvingDate = new Date(value);
        // Add 45 days
        calvingDate.setDate(calvingDate.getDate() + 45);
        
        const heatDateFormatted = calvingDate.toISOString().split('T')[0];
        updated["heat monitoring 1st notification"] = heatDateFormatted;
      }


      if (name === "pregnancy status" && value === "Positive") {
    //  ADD THIS: Auto-calculate Est. Calving if CrossingDate exists
    if (updated["crossingDate"]) {
      const baseDate = new Date(updated["crossingDate"]);
      const estCalving = new Date(baseDate);
      estCalving.setMonth(estCalving.getMonth() + 10);
      updated["estimated calving date"] = estCalving.toISOString().split('T')[0];
    }
  }

    if (name === "pregnancy status" && value === "Negative") {
      updated["pregnancy confirmed date"] = "";
      updated["estimated calving date"] = "";
      updated["actual calving date"] = "";
      updated["calf tag"] = "";
      updated["breedType"] = "";
      updated["heat monitoring 2nd notification"] = ""; 

      const pdDateValue = updated["PD date"];
      if (pdDateValue) {
          const hDate = new Date(pdDateValue);
          hDate.setDate(hDate.getDate() + 21);
          updated["heat monitoring 1st notification"] = hDate.toISOString().split('T')[0];
      }
  }


      if (name === "pregnancy status" && value == "Pending") {
    updated["pregnancy confirmed date"] = "";
    updated["estimated calving date"] = "";
    updated["actual calving date"] = "";
    updated["calf tag"] = "";
    updated["breedType"] = "";
    updated["heat monitoring 1st notification"] = "";
    updated["heat monitoring 2nd notification"] = "";
  }


      if (name === "farmBorn" && value === "Yes") {
        updated.purchaseDate = "";
      }


    // NEW: AUTO-CALCULATE PREGNANT AGE (Y M D Format)
      if ((name === "pregnancy status" && value === "Positive") || (name === "crossingDate" && updated["pregnancy status"] === "Positive")) {
        const cDateVal = name === "crossingDate" ? value : updated["crossingDate"];
        
        if (cDateVal) {
          const start = new Date(cDateVal);
          const today = new Date();
          
          if (start <= today) {
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
            
            updated["Pregnant age"] = pAgeText;
          } else {
            updated["Pregnant age"] = "Invalid Date";
          }
        }
      }

      // NEW: Clear Pregnant Age if status is no longer Positive
      if (name === "pregnancy status" && value !== "Positive") {
        updated["Pregnant age"] = "";
      }


  // AUTO CALCULATE AGE WHEN DOB
  if (name === "dob") {
    if (value) {
      const birth = new Date(value);
      const today = new Date();

      if (birth > today) {
        updated.age = "Invalid Date";
        setDobError("Future date not allowed");
        return updated;
      } else {
        setDobError("");
      }

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
    "actual calving date",
    "saleDate",
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
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {fields.map((field) => (
              <div key={field.name}>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-0.5">{field.label}</label>
                {field.type === "select" ? (
      <select
        name={field.name}
        value={formData[field.name] || ""}
        required={!field.optional && field.name !== "age"}
        className="mt-1 block w-full border border-slate-200 rounded-xl p-2.5 bg-white text-black focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200"
        onChange={handleChange}
      >
        <option value="">Select {field.label}</option>
        {field.options?.map((opt) => {
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
) : field.name === "tag"  ? (
  <>
    <input
      type="text"
      // name="tag"
      name={field.name}
      list="tag-options"
      // value={formData.tag || ""}
      value={formData[field.name] || ""}
      className="mt-1 block w-full border border-slate-200 rounded-xl p-2.5 text-black focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200"
      onChange={(e) => {
        handleChange(e);
        const value = e.target.value;
        const livestock = JSON.parse(localStorage.getItem("global_livestock_logs") || "[]");
        const found = livestock.find(item => item.tag === value);
        const exists = !!found;
        // const exists = livestock.some(item => item.tag === value);



         // PURCHASE VALIDATION (REAL-TIME BLOCK)
         if (title.includes("Purchase")) {
          const livestock = JSON.parse(localStorage.getItem("global_livestock_logs") || "[]");
          const exists = livestock.some(item => item.tag === value);

          if (exists) {
            setTagError("Tag already exists in Livestock");
          } else {
            setTagError("");
          }
}

        
       else if (title.includes("Sale")) {
          if (!exists && value !== "") {
            setTagError("Invalid Tag");
          }else if (exists && found.status === "Sold") {
            setTagError("Animal has already been sold");
          }
          else {
            setTagError("");
          }
        } else if (title.includes("Crossing")) {
          if (!found && value.trim() !== "") {
            setTagError("Tag not found in Livestock");
          }else if (found && found.status === "Sold") {
            setTagError("Animal is Sold");   
          }else if (found && found.status && found.status !== "Active") {
            setTagError("Animal is not Active");
          }else if (found && found.gender !== "Female") {
            setTagError("Only Female animals allowed");   
            } 
          else {
            setTagError("");
          }
        }

        const shedValue = getShedFromLivestock(e.target.value);
        if (shedValue) {
          setFormData(prev => ({
            ...prev,
            oldShed: shedValue
          }));
        }
      }}
    />
    {tagError && (
      <p className="text-red-500 text-xs mt-1">{tagError}</p>
    )}


    <datalist id="tag-options">
      {(JSON.parse(localStorage.getItem("global_livestock_logs") || "[]"))
        .filter(item => 
          item.status === "Active" &&
          item.gender?.toLowerCase() === "female"
        )
        .map(item => (
          <option key={item.tag} value={item.tag}>
            {item.tag} ({item.breed || "-"})
          </option>
        ))}
    </datalist>

  </>
    
    
      ):(
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
      field.name === "Pregnant age" && formData["pregnancy status"] !== "Positive"
        ? "-"
        : (["pregnancy confirmed date", "estimated calving date", "actual calving date", "calf tag", "heat monitoring 2nd notification"].includes(field.name) && formData["pregnancy status"] !== "Positive") ||
          (field.name === "heat monitoring 1st notification" && !["Positive", "Negative"].includes(formData["pregnancy status"])) ||
          (field.name === "purchaseDate" && formData.farmBorn === "Yes")
        ? "-" 
        : formData[field.name] || ""
    }
    /*  Required Logic */
  

     required={
  !field.optional && (
    field.name === "breedType"
      ? !!formData["actual calving date"]
    : ["pregnancy confirmed date", "estimated calving date"].includes(field.name) 
      ? formData["pregnancy status"] === "Positive"
    : ["calf tag", "heat monitoring 1st notification"].includes(field.name)
      ? !!formData["actual calving date"] 
    : field.name === "purchaseDate" 
      ? formData.farmBorn === "No"
    : field.name !== "age" && 
      !["actual calving date", "remarks", "heat monitoring 2nd notification"].includes(field.name)
  )
}


    /*  Updated Disabled Logic: 1st Notification remains enabled if status is Negative */
  disabled={
      (field.name === "Pregnant age" && formData["pregnancy status"] !== "Positive") ||
      (["pregnancy confirmed date", "estimated calving date", "actual calving date", "calf tag", "heat monitoring 2nd notification"].includes(field.name) && formData["pregnancy status"] !== "Positive") ||
      (field.name === "heat monitoring 1st notification" && !["Positive", "Negative"].includes(formData["pregnancy status"])) ||
      (field.name === "purchaseDate" && formData.farmBorn === "Yes") ||
      field.name === "age" || 
      field.name === "Pregnant age"
    }

    /*  Added Whole Number protection */
    min={field.type === "number" ? "0" : undefined}
    step={field.type === "number" ? "1" : undefined}
    
    readOnly={field.name === "age" || field.name === "Pregnant age"}
    
    className={`mt-1 block w-full border rounded-xl p-2.5 focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200 ${
      field.name === "age" || 
      field.name === "Pregnant age" || 
      (field.name === "purchaseDate" && formData.farmBorn === "Yes") ||
      (["pregnancy confirmed date", "estimated calving date", "actual calving date", "calf tag", "heat monitoring 2nd notification"].includes(field.name) && formData["pregnancy status"] !== "Positive") ||
      (field.name === "heat monitoring 1st notification" && !["Positive", "Negative"].includes(formData["pregnancy status"]))
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
    </>

      )}
              </div>
            ))}
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
    className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 py-3 rounded-xl font-bold shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all border border-red-100"
  >
    Cancel
  </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  export default LogForm;
