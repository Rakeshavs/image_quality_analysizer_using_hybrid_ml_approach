import { useState } from 'react';
import './index.css';
import Background3D from './components/Background3D';
import Navbar from './components/Navbar';
import InspectorPage from './pages/InspectorPage';
import HistoryPage from './pages/HistoryPage';
import MetricsPage from './pages/MetricsPage';

export default function App() {
  const [activePage, setActivePage] = useState('inspector');

  return (
    <>
      {/* Three.js Interactive 3D Background */}
      <Background3D />

      {/* Floating 3D Navigation Header */}
      <Navbar activePage={activePage} setActivePage={setActivePage} />

      {/* Main Studio View */}
      <main>
        {activePage === 'inspector' && <InspectorPage />}
        {activePage === 'history' && <HistoryPage />}
        {activePage === 'metrics' && <MetricsPage />}
      </main>
    </>
  );
}
