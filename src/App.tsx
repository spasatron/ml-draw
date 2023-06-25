import GridWrapper from "./components/GridWrapper";
import Banner from "./components/Banner";
import "./App.css";

function App() {
  return (
    <div className="main-background">
      <Banner>
        <div>Doodle Detective</div>
        <img src="./assets/doodle_detective.svg" className="logo" />
      </Banner>

      <GridWrapper />

      <Banner className="banner-bottom">
        <div className="spas-text">
          Spas Angelov
          <a href="https://www.linkedin.com/in/spas-angelov-58182a1a2/">
            <img src="./assets/linkedin.svg" className="linkedin" />
          </a>
          <a href="https://github.com/spasatron/ml-draw">
            <img src="./assets/github-mark-white.svg" className="github" />
          </a>
        </div>
      </Banner>
    </div>
  );
}

export default App;
