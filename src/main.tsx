import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ScanProvider } from './ScanContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ScanProvider>
      <App />
    </ScanProvider>
  </StrictMode>,
);
