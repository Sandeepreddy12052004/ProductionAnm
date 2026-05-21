// import { useState } from "react";

// export default function LoginForm({ onLogin }) {

//   const [email,setEmail] = useState("");
//   const [password,setPassword] = useState("");
//   const [showPassword,setShowPassword] = useState(false);

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     onLogin(email,password);
//   }

//   return (
//     <form onSubmit={handleSubmit} className="space-y-4">

//       {/* EMAIL */}
//       <div>
//         <label className="block text-sm font-medium text-gray-700 mb-1">
//           User Id
//         </label>
//         <input
//           type="email"
//           value={email}
//           onChange={(e)=>setEmail(e.target.value)}
//           className="w-full border p-3 rounded text-black bg-white"
//           required
//         />
//       </div>

//       {/* PASSWORD */}
//       <div>
//         <label className="block text-sm font-medium text-gray-700 mb-1">
//           Password
//         </label>

//         <div className="relative">
//           <input
//             type={showPassword ? "text" : "password"}
//             value={password}
//             onChange={(e)=>setPassword(e.target.value)}
//             className="w-full border p-3 rounded pr-10 text-black bg-white"
//             required
//           />

//           <button
//             type="button"
//             onClick={()=>setShowPassword(!showPassword)}
//             className="absolute right-3 top-3 text-gray-500 cursor-pointer"
//           >
//             👁
//           </button>
//         </div>
//       </div>

//       {/* BUTTON */}
//       <button
//         type="submit"
//         className="w-full bg-green-600 text-white p-3 rounded cursor-pointer hover:bg-green-700 transition"
//       >
//         Login
//       </button>

//     </form>
//   );
// }