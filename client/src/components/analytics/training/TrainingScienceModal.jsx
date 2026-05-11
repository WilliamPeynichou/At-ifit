import React from 'react';
import { TrendingUp, Heart, PieChart, HeartPulse } from 'lucide-react';
import FullscreenModal from '../../ui/FullscreenModal';
import ModalTabs from '../../ui/ModalTabs';
import FormCurve from './FormCurve';
import TimeInZones from './TimeInZones';
import Distribution from './Distribution';
import CardioFin from './CardioFin';

const TrainingScienceModal = ({ isOpen, onClose, activities }) => {
  const tabs = [
    { label: 'Form Curve', icon: <TrendingUp size={16} />, content: <FormCurve activities={activities} /> },
    { label: 'Zones HR', icon: <Heart size={16} />, content: <TimeInZones activities={activities} /> },
    { label: 'Distribution', icon: <PieChart size={16} />, content: <Distribution activities={activities} /> },
    { label: 'Cardio fin', icon: <HeartPulse size={16} />, content: <CardioFin activities={activities} /> },
  ];

  return (
    <FullscreenModal isOpen={isOpen} onClose={onClose} title="TRAINING SCIENCE" accent="#0055ff">
      <ModalTabs tabs={tabs} accent="#0055ff" />
    </FullscreenModal>
  );
};

export default TrainingScienceModal;
