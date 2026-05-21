// // import "@/styles/globals.css";

// // export default function App({ Component, pageProps }) {
// //   return <Component {...pageProps} />;
// // }



// import '@/styles/globals.css';
// import Layout from '@/components/Layout';
// import { useRouter } from 'next/router';

// export default function App({ Component, pageProps }) {
//   const router = useRouter();

//   // Pages WITHOUT layout
//   const noLayoutRoutes = ['/login'];

//   const isNoLayout = noLayoutRoutes.includes(router.pathname);

//   if (isNoLayout) {
//     return <Component {...pageProps} />;
//   }

//   return (
//     <Layout>
//       <Component {...pageProps} />
//     </Layout>
//   );
// }





import '@/styles/globals.css';
import Layout from '@/components/Layout';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // Pages WITHOUT layout
  const noLayoutRoutes = ['/login'];

  const isNoLayout = noLayoutRoutes.includes(router.pathname);

  // ✅ FORCE WHITE BACKGROUND HERE
  if (isNoLayout) {
    return (
      <div className="bg-white text-black min-h-screen">
        <Component {...pageProps} />
      </div>
    );
  }

  return (
    <div className="bg-white text-black min-h-screen">
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </div>
  );
}