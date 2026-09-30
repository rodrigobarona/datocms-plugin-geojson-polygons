import type { ReactNode } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const container = document.getElementById('root');

if (!container) {
  throw new Error('The plugin root element is missing.');
}

const root = createRoot(container);

export function render(component: ReactNode): void {
  root.render(<StrictMode>{component}</StrictMode>);
}
