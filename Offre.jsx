// Offre.jsx
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import "./Offrestyle.css"
function OffrePage() {
  return (
    <div className="page">
      <Navbar />
      <main>
      <h1>CFR AV – Sweat de promo 2025–2026</h1>

      <section>
        <h2>Qui est CFR AV ?</h2>
        <p>
          CFR AV, créé par des étudiants, propose des sweats de promo moins chers
          pour les lycéens et étudiants.
        </p>
      </section>

      <section>
        <h2>Offre de base</h2>
        <ul>
          <li>Sweat 90 % coton, grammage 300 g/m².</li>
          <li>Brodé ou floqué, logo du lycée sur le cœur, logo de classe au dos.</li>
          <li>Tailles XS, S, M, L, XL sans changement de prix.</li>
          <li>30 couleurs disponibles sans surcoût.</li>
          <li>Livraison standard par mer (60 jours).</li>
          <li>Prix : 25 € brodé, 20 € floqué.</li>
        </ul>
      </section>

      <section>
        <h2>Options qui changent le prix</h2>
        <ul>
          <li>100 % coton : +4 € par sweat.</li>
          <li>Changement de grammage possible.</li>
          <li>Livraison terre (30 jours) : +2 €.</li>
          <li>Livraison air (15 jours) : +10 €.</li>
          <li>Réductions possibles pour grosses commandes.</li>
        </ul>
      </section>
        <h2>Couleurs disponibles</h2>
        <p>
          30 couleurs : bleu gris, bleu ciel, bleu denim, bleu émeraude, bleu lac,
          bleu Klein, violet sombre, rouge, vert avocat, noir, blanc, etc.
        </p>
      </main>
      <Footer />
    </div>
  );
}

export default OffrePage;
