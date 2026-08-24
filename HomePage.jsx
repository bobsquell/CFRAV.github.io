import Navbar from "./Navbar";
import Hero from "./Hero";
import Footer from "./Footer";

function HomePage() {
  return (
    <div className="app">
      <Navbar />
      <main>
        <Hero />
      </main>
      <Footer />
    </div>
  );
}

export default HomePage;
