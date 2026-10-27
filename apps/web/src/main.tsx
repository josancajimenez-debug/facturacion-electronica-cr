import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LimiteErrores } from './components/ui';
import { AppProvider } from './estado';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Último recurso: un error fuera de las páginas (ingreso, arranque) tampoco deja la pantalla en blanco. */}
    <LimiteErrores pantallaCompleta>
      <AppProvider>
        <App />
      </AppProvider>
    </LimiteErrores>
  </StrictMode>,
);
