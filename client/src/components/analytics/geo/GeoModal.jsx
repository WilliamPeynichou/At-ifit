import React from 'react';
import { Map, Route, Mountain, Compass } from 'lucide-react';
import FullscreenModal from '../../ui/FullscreenModal';
import ModalTabs from '../../ui/ModalTabs';
import GPSHeatmap from './GPSHeatmap';
import TopRoutes from './TopRoutes';
import ClimbingProfile from './ClimbingProfile';
import ContextStats from './ContextStats';

const GeoModal = ({ isOpen, onClose, activities }) => {
  const tabs = [
    { label: 'Heatmap GPS', icon: <Map size={16} />, content: <GPSHeatmap activities={activities} /> },
    { label: 'Itinéraires', icon: <Route size={16} />, content: <TopRoutes activities={activities} /> },
    { label: 'Climbing', icon: <Mountain size={16} />, content: <ClimbingProfile activities={activities} /> },
    { label: 'Contexte', icon: <Compass size={16} />, content: <ContextStats activities={activities} /> },
  ];

  return (
    <FullscreenModal isOpen={isOpen} onClose={onClose} title="GÉOGRAPHIE" accent="#22c55e">
      <ModalTabs tabs={tabs} accent="#22c55e" />
    </FullscreenModal>
  );
};

export default GeoModal;
