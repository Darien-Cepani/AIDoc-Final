import * as React from "react"

const MOBILE_BREAKPOINT = 768 // md breakpoint in Tailwind is 768px

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false); // Default to false for SSR and initial client render

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    // Function to update state based on media query
    const handleResize = () => {
      setIsMobile(mql.matches);
    };
    
    // Set the initial state correctly on the client after mount
    handleResize(); 
    
    // Add event listener for future changes
    mql.addEventListener("change", handleResize);
    
    // Clean up event listener on unmount
    return () => {
      mql.removeEventListener("change", handleResize);
    };
  }, []); // Empty dependency array ensures this runs only once on mount and unmount

  return isMobile;
}
