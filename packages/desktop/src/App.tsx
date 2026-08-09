import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.js';
import Dashboard from './pages/Dashboard.js';
import Agents from './pages/Agents.js';
import Skills from './pages/Skills.js';
import Mcps from './pages/Mcps.js';
import Providers from './pages/Providers.js';
import Settings from './pages/Settings.js';
import Projects from './pages/Projects.js';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="agents" element={<Agents />} />
        <Route path="skills" element={<Skills />} />
        <Route path="mcps" element={<Mcps />} />
        <Route path="providers" element={<Providers />} />
        <Route path="projects" element={<Projects />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
