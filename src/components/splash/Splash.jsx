import "./Splash.css";

export default function Splash({ visible }) {
  return (
    <div className={`splash${visible ? "" : " splash--hidden"}`}>
      <span className="splash__title">DoIt</span>

      <div className="splash__logo">
        <span className="splash__tick-red">✓</span>
        <span className="splash__tick-blue">✓</span>
      </div>
      <div className="splash__text">
        <h2>Organize your day.</h2>
        <h3>Get more done.</h3>
      </div>
    </div>
  );
}
