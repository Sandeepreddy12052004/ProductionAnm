import Swal from 'sweetalert2';

// Standardized SweetAlert instance with project colors
const swalInstance = Swal.mixin({
  confirmButtonColor: '#16223F',
  cancelButtonColor: '#e11d48',
  customClass: {
    popup: 'rounded-2xl shadow-xl border border-gray-100',
    confirmButton: 'bg-[#16223F] hover:bg-[#2a3f75] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2 mx-2',
    cancelButton: 'bg-red-50 text-red-600 hover:bg-red-100 px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all mx-2',
    title: 'text-[#16223F] font-black',
  },
  buttonsStyling: false
});

export const swalSuccess = (title, text = "") => {
  return swalInstance.fire({
    icon: 'success',
    title: title,
    text: text,
    timer: 2000,
    showConfirmButton: false
  });
};

export const swalError = (title, text = "") => {
  return swalInstance.fire({
    icon: 'error',
    title: title,
    text: text,
  });
};

export const swalConfirm = async (title, text = "You won't be able to revert this!") => {
  const result = await swalInstance.fire({
    title: title,
    text: text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, proceed',
    cancelButtonText: 'Cancel'
  });
  return result.isConfirmed;
};

export default swalInstance;
