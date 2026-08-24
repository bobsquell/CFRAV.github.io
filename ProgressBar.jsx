import { useNavigate } from 'react-router-dom';
import './ProgressBar.css';

// Déclaration sous forme de fonction standard
function ProgressBar({ step, setStep, totalSteps }) {
  const navigate = useNavigate();
  const progress = (step / totalSteps) * 100;

  return (
    <div className="pg-container">
      <div className="pg-header">
        <span
          className="pg-arrow"
          onClick={() => navigate('/')}
          title="Accueil"
        >
          ‹
        </span>
        <span className="pg-text">Étape {step} sur {totalSteps}</span>
      </div>

      <div className="pg-track">
        <div className="pg-bar" style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
}

export default ProgressBar;