import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

const GA_ID = import.meta.env.VITE_GA_ID;
if (GA_ID && GA_ID !== 'G-TEMP-HOLDER') {
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', GA_ID);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
