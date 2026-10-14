function SRSLogo({ dark = false }) {
  return (
    <div className={`srs-logo ${dark ? "srs-logo-dark" : ""}`}>
      <img
        src="/srs-burooj-logo.png"
        alt="SRS Burooj"
      />

      <div className="srs-logo-text">
        <div className="srs-logo-name">SRS BUROOJ</div>
        <div className="srs-logo-tagline">
          Building Dreams, Creating Homes
        </div>
      </div>
    </div>
  );
}

export default SRSLogo;