(()=>{'use strict';
 const key='mt56251-color-theme';
 const root=document.documentElement;
 const systemDark=()=>window.matchMedia?.('(prefers-color-scheme: dark)').matches||false;
 const saved=()=>{try{return localStorage.getItem(key)||'system'}catch{return 'system'}};
 const apply=()=>{const pref=saved();const dark=pref==='dark'||(pref==='system'&&systemDark());root.dataset.theme=dark?'dark':'light';document.querySelectorAll('.mt-theme-toggle').forEach(b=>{b.textContent=dark?'☀ Light mode':'☾ Dark mode';b.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');b.setAttribute('aria-pressed',String(dark));});};
 const toggle=()=>{try{localStorage.setItem(key,root.dataset.theme==='dark'?'light':'dark')}catch{}apply()};
 function init(){const header=document.querySelector('header');if(!header)return;const b=document.createElement('button');b.type='button';b.className='mt-theme-toggle';b.addEventListener('click',toggle);header.appendChild(b);apply();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
 window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(saved()==='system')apply()});
})();
