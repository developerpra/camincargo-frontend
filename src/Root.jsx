import { useEffect, useState } from "react";
import Auth from "./Auth";
import App from "./App";
import { isAuthenticated, clearToken, getDisplayName } from "./api/auth";

export default function Root() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [displayName, setDisplayName] = useState(getDisplayName() || "Guest");

  useEffect(() => {
    function onAuthChanged() {
      setAuthed(isAuthenticated());
      setDisplayName(getDisplayName() || "Guest");
    }
    window.addEventListener("authChanged", onAuthChanged);
    return () => window.removeEventListener("authChanged", onAuthChanged);
  }, []);

  // Allow direct access to products when navigating to /products
  const wantsProducts =
    typeof window !== "undefined" &&
    window.location &&
    window.location.pathname.toLowerCase().includes("/products");
  if (!authed && !wantsProducts)
    return <Auth onAuthenticated={() => setAuthed(true)} />;

  return (
    <App />
    // <div className="min-h-screen">
    //   <div className="sticky top-0 z-50 w-full bg-white border-b border-slate-200">
    //     <div className="max-w-4xl mx-auto px-5 py-2 flex items-center justify-between">
    //       <div className="text-sm text-slate-600">Logged in as {displayName || 'Guest'}</div>
    //       <button onClick={() => { clearToken(); }} className="px-3 py-1.5 rounded text-xs bg-slate-600 text-white hover:bg-slate-700">Logout</button>
    //     </div>
    //   </div>
    //   <App />
    // </div>
  );
}
