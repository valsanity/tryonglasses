import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import VirtualTryOn from "@/pages/VirtualTryOn";
import Admin from "@/pages/Admin";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import Admin from '@/pages/Admin'; // Import view component

// Inside your <Routes> tree component logic, register the node:
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/admin" element={<Admin />} />
</Routes>

// // One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
// export default function App() {
//   return (
//     <>
//       <Routes>
//         <Route path="/" element={<Home />} />
//         <Route path="/coba" element={<VirtualTryOn />} />
//         <Route path="/admin" element={<Admin />} />
//       </Routes>
//       <Toaster position="top-center" richColors />
//     </>
//   );
// }
