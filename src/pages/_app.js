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

  // Use the layout defined at the page level, if available
  // Otherwise, fallback to the global persistent Layout
  const getLayout = Component.getLayout ?? ((page) => {
    if (isNoLayout) {
      return (
        <div className="bg-white text-black min-h-screen">
          {page}
        </div>
      );
    }
    return (
      <div className="bg-[#f8fafc] text-black min-h-screen">
        <Layout>{page}</Layout>
      </div>
    );
  });

  return getLayout(<Component {...pageProps} />);
}