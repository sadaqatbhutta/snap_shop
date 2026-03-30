import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './firebase';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, '_health', 'check'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error('Firestore offline — check your Firebase config.');
    }
  }
}

if (import.meta.env.DEV) {
  testFirestoreConnection();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
