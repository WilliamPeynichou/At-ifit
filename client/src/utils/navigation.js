/**
 * Utilitaire de redirection robuste
 * Gère les redirections avec fallback si React Router échoue
 */

export const safeNavigate = (navigate, path, options = {}) => {
  try {
    console.log(`🔄 Navigating to: ${path}`);
    navigate(path, { replace: true, ...options });
    
    // Fallback: vérifier après 1 seconde si la navigation a réussi
    setTimeout(() => {
      const currentPath = window.location.pathname;
      const targetPath = path.startsWith('/') ? path : `/${path}`;
      
      if (currentPath !== targetPath && currentPath !== `${targetPath}/`) {
        console.log(`⚠️ Navigation to ${path} failed, forcing reload...`);
        window.location.href = path;
      }
    }, 1000);
  } catch (error) {
    console.error('Navigation error:', error);
    window.location.href = path;
  }
};

export default safeNavigate;

