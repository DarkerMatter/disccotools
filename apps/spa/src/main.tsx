import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Editor } from './editor/Editor.js';
import { IconsPage } from './icons/IconsPage.js';
import { ImagesPage } from './images/ImagesPage.js';
import { ThemeProvider } from './theme/ThemeContext.js';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('root element missing');

createRoot(rootEl).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Editor />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/editor/:id" element={<Editor />} />
          <Route path="/icons" element={<IconsPage />} />
          <Route path="/images" element={<ImagesPage />} />
          <Route path="/saves" element={<Navigate to="/icons" replace />} />
          <Route path="/assets" element={<Navigate to="/icons" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
