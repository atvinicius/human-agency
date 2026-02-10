import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useThemeStore } from './stores/themeStore';
import Landing from './pages/Landing';
import Demo from './pages/Demo';

function App() {
  const initTheme = useThemeStore((state) => state.initTheme);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/demo" element={<Demo />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
