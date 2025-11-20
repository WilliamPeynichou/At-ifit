import React, { useState, useEffect } from 'react';
import cyclistSide from '../assets/cyclist_angle_side.png';
import cyclist45 from '../assets/cyclist_angle_45.png';
import cyclistFront from '../assets/cyclist_angle_front.png';
import { Rotate3d, Zap, Activity, Info, Maximize2, Minimize2 } from 'lucide-react';

const Muscles = () => {
  const [intensity, setIntensity] = useState(0); // 0 to 100
  const [rotation, setRotation] = useState(50); // 0 to 100 (mapped to angles)
  const [currentImage, setCurrentImage] = useState(cyclistSide);
  const [activeMuscle, setActiveMuscle] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  // Map rotation slider to images
  useEffect(() => {
    if (rotation < 33) {
      setCurrentImage(cyclistFront);
    } else if (rotation < 66) {
      setCurrentImage(cyclist45);
    } else {
      setCurrentImage(cyclistSide);
    }
  }, [rotation]);

  // Muscle data with detailed French descriptions
  const muscles = [
    {
      id: 'quads',
      name: 'Quadriceps',
      role: 'Extension Puissante',
      description: 'Le groupe musculaire dominant (Vaste externe, interne, intermédiaire et droit fémoral). Ils génèrent la puissance explosive lors de la phase de poussée (12h à 5h). Indispensables pour les attaques et le contre-la-montre.',
      activePhase: 'Poussée (12h-5h)',
      color: 'text-red-500'
    },
    {
      id: 'hamstrings',
      name: 'Ischio-jambiers',
      role: 'Flexion & Transition',
      description: 'Biceps fémoral et semi-tendineux. Ils agissent en synergie pour la flexion du genou et l\'extension de la hanche. Cruciaux pour la phase de remontée (6h à 9h) et pour "gratter" la pédale au point mort bas.',
      activePhase: 'Traction (6h-9h)',
      color: 'text-orange-500'
    },
    {
      id: 'glutes',
      name: 'Fessiers',
      role: 'Moteur Principal',
      description: 'Le grand fessier est le moteur principal de l\'extension de la hanche. Il délivre la puissance maximale au démarrage du coup de pédale (point mort haut). C\'est la véritable centrale électrique du cycliste.',
      activePhase: 'Poussée (12h-3h)',
      color: 'text-purple-500'
    },
    {
      id: 'calves',
      name: 'Mollets',
      role: 'Transfert de Force',
      description: 'Gastrocnémien et soléaire. Ils ne produisent pas énormément de puissance brute mais transfèrent l\'énergie cinétique de la cuisse vers la pédale. Ils stabilisent la cheville pour éviter toute déperdition d\'énergie.',
      activePhase: 'Transfert (5h-7h)',
      color: 'text-yellow-500'
    },
    {
      id: 'abs',
      name: 'Abdominaux',
      role: 'Gainage & Stabilité',
      description: 'Grand droit et obliques. Ils verrouillent le bassin et le buste. Un tronc solide permet aux jambes de pousser contre une plateforme stable, évitant le déhanchement et la perte d\'énergie latérale lors des efforts intenses.',
      activePhase: 'Continu',
      color: 'text-blue-500'
    },
    {
      id: 'back',
      name: 'Lombaires',
      role: 'Posture & Soutien',
      description: 'Erecteurs du rachis. Ils maintiennent la position aérodynamique courbée pendant des heures. Ils contrebalancent la force des jambes pour protéger la colonne vertébrale et assurer une transmission de force linéaire sans affaissement.',
      activePhase: 'Continu',
      color: 'text-indigo-500'
    }
  ];

  return (
    <div className="h-screen bg-black flex flex-col md:flex-row relative overflow-hidden font-sans">
      
      {/* Background Grid/Tech Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-10 z-0" 
           style={{ 
             backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
             backgroundSize: '50px 50px'
           }}>
      </div>

      {/* LEFT PANEL: Controls & Stats - Fixed Width on Desktop */}
      <div className="w-full md:w-80 flex-shrink-0 p-6 flex flex-col z-20 bg-black/80 backdrop-blur-md border-r border-white/5 h-auto md:h-full overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tighter italic uppercase leading-none">
            Nano<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Banana</span>
          </h1>
          <p className="text-slate-400 text-xs uppercase tracking-[0.3em] border-l-2 border-red-500 pl-3 ml-1">
            Biomécanique
          </p>
        </div>

        {/* Controls Container */}
        <div className="space-y-8 flex-1">
          
          {/* Intensity Control */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="flex justify-between items-center mb-3">
              <label htmlFor="intensity-slider" className="flex items-center gap-2 text-slate-200 font-bold text-sm uppercase tracking-wider">
                <Zap size={16} className="text-yellow-400" />
                Intensité
              </label>
              <span className="text-yellow-400 font-mono">{intensity}%</span>
            </div>
            <input
              id="intensity-slider"
              type="range"
              min="0"
              max="100"
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-500 hover:accent-yellow-400 transition-all focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
              aria-label="Contrôle de l'intensité de l'effort"
            />
          </div>

          {/* Rotation Control */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="flex justify-between items-center mb-3">
              <label htmlFor="rotation-slider" className="flex items-center gap-2 text-slate-200 font-bold text-sm uppercase tracking-wider">
                <Rotate3d size={16} className="text-blue-400" />
                Rotation 3D
              </label>
              <span className="text-blue-400 font-mono">{Math.floor(rotation * 1.8)}°</span>
            </div>
            <input
              id="rotation-slider"
              type="range"
              min="0"
              max="100"
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              aria-label="Contrôle de la rotation 3D du cycliste"
            />
            <div className="flex justify-between text-[10px] text-slate-500 uppercase mt-2 font-mono">
              <span>Face</span>
              <span>3/4</span>
              <span>Profil</span>
            </div>
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-black/60 p-3 rounded-lg border border-white/10">
                <span className="block text-2xl font-bold text-white tabular-nums">{Math.floor(intensity * 1.2 + (intensity > 0 ? 60 : 0))}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">RPM</span>
             </div>
             <div className="bg-black/60 p-3 rounded-lg border border-white/10">
                <span className="block text-2xl font-bold text-red-500 tabular-nums">{Math.floor(intensity * 4.5 + (intensity > 0 ? 100 : 0))}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Watts</span>
             </div>
          </div>
        </div>
      </div>

      {/* CENTER: Visualization - Takes remaining space */}
      <div className="flex-1 relative flex items-center justify-center bg-gradient-to-b from-black via-gray-900/20 to-black overflow-hidden">
        
        {/* Ambient Glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div className="w-[60vw] h-[60vw] bg-red-600/20 blur-[150px] rounded-full transition-opacity duration-1000"
                style={{ opacity: intensity / 150 }}></div>
        </div>

        {/* Main Image Container - Clickable for Zoom */}
        <div 
          className="relative w-full h-full max-w-5xl max-h-[90vh] p-4 flex items-center justify-center cursor-zoom-in group"
          onClick={() => setIsZoomed(true)}
        >
           {/* Hover Hint */}
           <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
             <span className="text-[10px] text-white uppercase tracking-wider flex items-center gap-2">
               <Maximize2 size={12} /> Agrandir
             </span>
           </div>

           {/* Single Image with Dynamic Filters */}
           <img
             src={currentImage}
             alt="Visualisation anatomique du cycliste"
             className="w-full h-full object-contain transition-transform duration-300 ease-out drop-shadow-2xl"
             style={{ 
               transform: `scale(${1 + intensity/800})`,
               filter: `
                 grayscale(${100 - intensity}%) 
                 brightness(${100 + intensity/2}%) 
                 contrast(${100 + intensity/4}%)
                 drop-shadow(0 0 ${intensity/3}px rgba(220, 38, 38, ${intensity/100}))
               `
             }}
           />
        </div>
        
        {/* Zoom Modal Overlay */}
        {isZoomed && (
          <div 
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
            onClick={() => setIsZoomed(false)}
          >
            <div className="relative w-full h-full max-w-7xl flex items-center justify-center">
              <img
                src={currentImage}
                alt="Visualisation anatomique du cycliste (Zoom)"
                className="w-full h-full object-contain"
                style={{ 
                  filter: `
                    grayscale(${100 - intensity}%) 
                    brightness(${100 + intensity/2}%) 
                    contrast(${100 + intensity/4}%)
                    drop-shadow(0 0 ${intensity/2}px rgba(220, 38, 38, ${intensity/100}))
                  `
                }}
              />
              <div className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors">
                <Minimize2 size={32} />
              </div>
            </div>
          </div>
        )}

        {/* Overlay Info for Mobile (hidden on desktop) */}
        <div className="absolute bottom-4 left-0 right-0 text-center md:hidden pointer-events-none">
          <p className="text-slate-500 text-xs uppercase tracking-widest">Toucher pour agrandir</p>
        </div>
      </div>

      {/* RIGHT PANEL: Muscle Details - Fixed Width on Desktop */}
      <div className="w-full md:w-96 flex-shrink-0 bg-black/80 backdrop-blur-md border-l border-white/5 h-auto md:h-full overflow-y-auto custom-scrollbar">
        <div className="p-6 sticky top-0 bg-black/90 z-10 border-b border-white/5 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="text-red-500" size={20} />
            Groupes Musculaires
          </h2>
        </div>
        
        <div className="p-6 space-y-4">
          {muscles.map((muscle) => (
            <div 
              key={muscle.id}
              onMouseEnter={() => setActiveMuscle(muscle.id)}
              onMouseLeave={() => setActiveMuscle(null)}
              className={`
                group relative p-4 rounded-xl border transition-all duration-300 cursor-default
                ${activeMuscle === muscle.id ? 'bg-white/10 border-red-500/50 translate-x-1' : 'bg-white/5 border-white/5 hover:bg-white/10'}
              `}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className={`text-base font-bold transition-colors ${muscle.color} group-hover:brightness-125`}>
                  {muscle.name}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/50 text-slate-300 border border-white/5 self-start">
                  {muscle.activePhase}
                </span>
              </div>
              
              <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">
                {muscle.role}
              </p>
              
              <p className="text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-2 mt-2">
                {muscle.description}
              </p>

              {/* Activity Bar */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 bg-black/50 h-1 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${muscle.color.replace('text-', 'bg-')} transition-all duration-500`}
                    style={{ 
                      width: `${(intensity * 0.8) + 20}%`,
                      opacity: intensity > 0 ? 1 : 0.3
                    }} 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default Muscles;
