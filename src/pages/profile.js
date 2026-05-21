import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Profile from '../components/profilepg';

export default function ProfilePage() {
  const router = useRouter();
  const contentRef = useRef(null);
  const [disableScroll, setDisableScroll] = useState(false);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");

    if (isLoggedIn !== "true") {
      router.replace("/login");
      return;
    }
    window.scrollTo(-1, -1); // Scroll to top-left corner on mount

    const checkHeight = () => {
      const contentHeight = contentRef.current?.offsetHeight || 0;
      const screenHeight = window.innerHeight;

      // If content fits → disable scroll
      if (contentHeight <= screenHeight) {
        document.body.style.overflow = 'hidden';
        setDisableScroll(true);
      } else {
        document.body.style.overflow = 'auto';
        setDisableScroll(false);
      }
    };

    checkHeight();
    window.addEventListener('resize', checkHeight);

    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('resize', checkHeight);
    };
  }, [router]);

  return (
    // <div
    //   className={`
    //     bg-white 
    //     min-h-[100dvh]
    //     flex 
    //     justify-center 
    //     ${disableScroll ? 'items-center' : 'items-start md:items-center'}
    //     px-4 md:px-6
    //   `}
    // >
    <div
  className={`
    bg-white 
    min-h-[100dvh]
    flex 
    justify-center 
    ${disableScroll 
      ? 'items-center -translate-y-10 md:translate-y-0' 
      : 'items-start md:items-center'
    }
    px-4 md:px-6
  `}
>
      <div
        ref={contentRef}
        className="
          w-full
          max-w-md
          sm:max-w-lg
          md:max-w-xl
          lg:max-w-2xl
          py-6
        "
      >
        <Profile />
      </div>
    </div>
  );
}