import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { JobProvider } from '@/store/job-context';
import { DynamicBackground } from '@/backgrounds/dynamic-background';
import { ImmersiveFullscreenNav } from '@/components/ui/immersive-full-screen-nav';
import { Dashboard } from '@/pages/Dashboard';
import { CreatePage } from '@/pages/CreatePage';
import { JobPage } from '@/pages/JobPage';
import { ResultPage } from '@/pages/ResultPage';
import { BatchPage } from '@/pages/BatchPage';
import { LibraryPage } from '@/pages/LibraryPage';
import { FeedPage } from '@/pages/FeedPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { CommandCenterPage } from '@/pages/CommandCenterPage';
import { UniversePage } from '@/pages/UniversePage';
import { ApiConfigurationPage } from '@/pages/ApiConfigurationPage';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

function Pg({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Pg><Dashboard /></Pg>} />
        <Route path="/create" element={<Pg><CreatePage /></Pg>} />
        <Route path="/command-center" element={<Pg><CommandCenterPage /></Pg>} />
        <Route path="/analytics" element={<Pg><AnalyticsPage /></Pg>} />
        <Route path="/job/:id" element={<Pg><JobPage /></Pg>} />
        <Route path="/result/:id" element={<Pg><ResultPage /></Pg>} />
        <Route path="/batch" element={<Pg><BatchPage /></Pg>} />
        <Route path="/library" element={<Pg><LibraryPage /></Pg>} />
        <Route path="/feed" element={<Pg><FeedPage /></Pg>} />
        <Route path="/universe/:id" element={<Pg><UniversePage /></Pg>} />
        <Route path="/api-configuration" element={<Pg><ApiConfigurationPage /></Pg>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <JobProvider>
      <BrowserRouter>
        <DynamicBackground />
        <ImmersiveFullscreenNav />
        <main className="min-h-screen">
          <AnimatedRoutes />
        </main>
      </BrowserRouter>
    </JobProvider>
  );
}
