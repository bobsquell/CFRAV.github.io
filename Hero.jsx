// Hero.jsx
import "./Hero.css";
import { useNavigate } from "react-router-dom";
import sweatMockup from "./sweat-mockupdevant.png";
import real1 from "./real1.png";
import real2 from "./real2.png";
import real3 from "./real3.png";

export default function Hero() {
  const navigate = useNavigate();

  return (
    <section className="hero">
      <h1 className="titredusite">
          Sweats personnalisables <br />
          pour classes et promos
        </h1>
      {/* Image flottante à droite pour shape-outside */}
      <div className="hero-right">
        <img className="hero-image" src={sweatMockup} alt="Sweat" />
      </div>

      {/* Bloc texte qui s’enroule autour de l’image */}
      <div className="hero-left">
        <p className="hero-subtitle">
          Grand logo de classe à l&apos;arrière, brodé ou floqué, même prix
          pour toutes les tailles. Une offre claire, pensée pour les groupes.
        </p>

        <div className="offer-prices">
          <div className="offer-priceCard">
            <div className="offer-priceTitle">Brodé</div>
            <div className="offer-priceValue">25 €</div>
          </div>

          <div className="offer-priceCard">
            <div className="offer-priceTitle">Floqué</div>
            <div className="offer-priceValue">20 €</div>
          </div>
        </div>

        <button
          className="offer-cta"
          type="button"
          onClick={() => navigate("/simulateur")}
        >
          Simule en 5 étapes ton pull   <span>&gt;</span>
        </button>
      </div>

      {/* Thumbnails en dessous du bloc principal */}
      <div className="hero-thumbnails">
        <div className="thumb-list">
          <div className="thumb-card">
            <img src={real1} alt="MP*1 - pull dos" />
          </div>
          <div className="thumb-card">
            <img src={real2} alt="Pull marine forêt" />
          </div>
          <div className="thumb-card">
            <img src={real3} alt="XMP*1 - pull bleu dos" />
          </div>
        </div>
        <div className="thumb-cta-wrapper">
          <button
            className="thumb-cta"
            type="button"
            onClick={() => window.open("https://www.instagram.com/cfrav_pulls/", "_blank")}
          >
            Nos réalisations
          </button>
        </div>
      </div>
    </section>
  );
}
