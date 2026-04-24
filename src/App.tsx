import { Navigate, Route, Routes } from 'react-router-dom';

import DomeGalleryPage from '@/pages/DomeGalleryPage';
import HomePage from '@/pages/HomePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/dome-gallery" element={<DomeGalleryPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
