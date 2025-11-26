import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Composant pour afficher un modèle 3D de cycliste avec mise en évidence des muscles
 * 
 * Ressources pour trouver des modèles :
 * - Sketchfab: https://sketchfab.com (rechercher "cyclist", "bike rider")
 * - TurboSquid: https://www.turbosquid.com
 * - Free3D: https://free3d.com
 * - Mixamo: https://www.mixamo.com (modèles humains animés)
 * 
 * Format recommandé: GLTF/GLB pour de meilleures performances
 */
const CyclistMuscleViewer = ({ modelPath, highlightedMuscles = [] }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [muscleGroups, setMuscleGroups] = useState({
    quadriceps: { name: 'Quadriceps', color: '#ff0000', active: false },
    hamstrings: { name: 'Ischio-jambiers', color: '#00ff00', active: false },
    calves: { name: 'Mollets', color: '#0000ff', active: false },
    glutes: { name: 'Fessiers', color: '#ffff00', active: false },
    core: { name: 'Abdominaux', color: '#ff00ff', active: false },
    back: { name: 'Dorsaux', color: '#00ffff', active: false },
    shoulders: { name: 'Épaules', color: '#ff8800', active: false },
    arms: { name: 'Bras', color: '#8800ff', active: false }
  });

  useEffect(() => {
    if (!mountRef.current) return;

    // Configuration de la scène
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Caméra
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 3);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Contrôles de la caméra
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 10;
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    // Éclairage
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Chargement du modèle 3D
    if (modelPath) {
      const loader = new GLTFLoader();
      loader.load(
        modelPath,
        (gltf) => {
          const model = gltf.scene;
          
          // Ajuster la taille et position du modèle
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 1.8 / maxDim;
          
          model.scale.multiplyScalar(scale);
          model.position.sub(center.multiplyScalar(scale));
          model.position.y = 0;
          
          // Activer les ombres
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          
          scene.add(model);
          setLoading(false);
        },
        (progress) => {
          // Progression du chargement
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`Chargement: ${percent.toFixed(0)}%`);
        },
        (err) => {
          console.error('Erreur lors du chargement du modèle:', err);
          setError('Impossible de charger le modèle 3D');
          setLoading(false);
        }
      );
    } else {
      // Créer un modèle de base (sphère) si aucun modèle n'est fourni
      const geometry = new THREE.SphereGeometry(0.5, 32, 32);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x00ff00,
        metalness: 0.3,
        roughness: 0.7
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.y = 1;
      sphere.castShadow = true;
      scene.add(sphere);
      setLoading(false);
    }

    // Plan de sol
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      metalness: 0.1,
      roughness: 0.8
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0;
    plane.receiveShadow = true;
    scene.add(plane);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Gestion du redimensionnement
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Nettoyage
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, [modelPath]);

  const toggleMuscle = (muscleKey) => {
    setMuscleGroups(prev => ({
      ...prev,
      [muscleKey]: {
        ...prev[muscleKey],
        active: !prev[muscleKey].active
      }
    }));
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div 
        ref={mountRef} 
        className="flex-1 bg-black rounded-lg overflow-hidden"
        style={{ minHeight: '500px' }}
      />
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-slate-200">Chargement du modèle 3D...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-900 bg-opacity-50 border border-red-500 rounded-lg mt-4">
          <p className="text-red-200">{error}</p>
          <p className="text-sm text-red-300 mt-2">
            Assurez-vous que le fichier modèle est dans le dossier public/models/
          </p>
        </div>
      )}

      {/* Contrôles des muscles */}
      <div className="mt-4 p-4 bg-slate-900 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-slate-200">
          Groupes musculaires
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(muscleGroups).map(([key, muscle]) => (
            <button
              key={key}
              onClick={() => toggleMuscle(key)}
              className={`p-2 rounded border transition-all ${
                muscle.active
                  ? 'bg-green-500 border-green-400 text-black'
                  : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-slate-600'
              }`}
              style={{
                borderColor: muscle.active ? muscle.color : undefined
              }}
            >
              <div 
                className="w-4 h-4 rounded-full mx-auto mb-1"
                style={{ backgroundColor: muscle.color }}
              />
              <span className="text-xs">{muscle.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-4 bg-slate-800 rounded-lg text-sm text-slate-400">
        <p className="mb-2">
          <strong className="text-slate-200">Instructions:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Faites glisser pour faire tourner le modèle</li>
          <li>Utilisez la molette pour zoomer</li>
          <li>Cliquez sur les groupes musculaires pour les mettre en évidence</li>
        </ul>
      </div>
    </div>
  );
};

export default CyclistMuscleViewer;


