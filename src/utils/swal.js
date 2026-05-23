import Swal from 'sweetalert2';

// Standardized SweetAlert instance with project colors
const swalInstance = Swal.mixin({
  confirmButtonColor: '#071437',
  cancelButtonColor: '#e11d48',
  customClass: {
    confirmButton: 'px-5 py-2.5 font-bold rounded-xl shadow-md mx-2',
    cancelButton: 'px-5 py-2.5 font-bold rounded-xl shadow-md mx-2'
  },
  buttonsStyling: true
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
