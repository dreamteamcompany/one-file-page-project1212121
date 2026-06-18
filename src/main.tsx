import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

document.addEventListener(
  'keydown',
  (e) => {
    if (e.key !== 'Enter' || e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const tag = target.tagName;
    if (tag === 'TEXTAREA' || target.isContentEditable) return;
    if (tag === 'BUTTON' || (tag === 'INPUT' && (target as HTMLInputElement).type === 'submit')) return;
    if (target.closest('form')) {
      e.preventDefault();
    }
  },
  true
);

createRoot(document.getElementById("root")!).render(
  <App />
);