import React from 'react';
import { Footprints, Bike, Trophy, Waves } from 'lucide-react';
import FullscreenModal from '../../ui/FullscreenModal';
import ModalTabs from '../../ui/ModalTabs';
import RunningPerf from './RunningPerf';
import CyclingPerf from './CyclingPerf';
import PRTable from './PRTable';
import SwimmingPerf from './SwimmingPerf';

const PerformanceModal = ({ isOpen, onClose, activities }) => {
  const tabs = [
    { label: 'Course', icon: <Footprints size={16} />, content: <RunningPerf activities={activities} /> },
    { label: 'Vélo', icon: <Bike size={16} />, content: <CyclingPerf activities={activities} /> },
    { label: 'Records', icon: <Trophy size={16} />, content: <PRTable activities={activities} /> },
    { label: 'Natation', icon: <Waves size={16} />, content: <SwimmingPerf activities={activities} /> },
  ];

  return (
    <FullscreenModal isOpen={isOpen} onClose={onClose} title="PERFORMANCE" accent="#a855f7">
      <ModalTabs tabs={tabs} accent="#a855f7" />
    </FullscreenModal>
  );
};

export default PerformanceModal;
