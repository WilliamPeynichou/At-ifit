import React from 'react';
import { Sparkles, Calendar, Trophy, BookOpen, Image } from 'lucide-react';
import FullscreenModal from '../../ui/FullscreenModal';
import ModalTabs from '../../ui/ModalTabs';
import HeroRecap from './HeroRecap';
import CalendarHeatmap from './CalendarHeatmap';
import WallOfRecords from './WallOfRecords';
import Story from './Story';
import Poster from './Poster';

const YearInSportModal = ({ isOpen, onClose, activities }) => {
  const tabs = [
    { label: 'Recap', icon: <Sparkles size={16} />, content: <HeroRecap activities={activities} /> },
    { label: 'Calendrier', icon: <Calendar size={16} />, content: <CalendarHeatmap activities={activities} /> },
    { label: 'Records', icon: <Trophy size={16} />, content: <WallOfRecords activities={activities} /> },
    { label: 'Story', icon: <BookOpen size={16} />, content: <Story activities={activities} /> },
    { label: 'Poster', icon: <Image size={16} />, content: <Poster activities={activities} /> },
  ];

  return (
    <FullscreenModal isOpen={isOpen} onClose={onClose} title="YEAR IN SPORT" accent="#fc4c02">
      <ModalTabs tabs={tabs} accent="#fc4c02" />
    </FullscreenModal>
  );
};

export default YearInSportModal;
