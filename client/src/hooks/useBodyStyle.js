import { useEffect } from 'react';

// A few original pages (login, checkout) set their own <body> background.
// This sets it while the page is shown and restores it on leave.
export default function useBodyStyle(backgroundColor) {
  useEffect(() => {
    const previous = document.body.style.backgroundColor;
    document.body.style.backgroundColor = backgroundColor;
    return () => {
      document.body.style.backgroundColor = previous;
    };
  }, [backgroundColor]);
}
