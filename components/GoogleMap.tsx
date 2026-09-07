// studio-follow.com のアクセス案内と同じ、店舗ピン付きの Google マップ。
const MAP_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3119.3830631202936!2d139.79571053067073!3d35.65611915200717!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188916df757977%3A0xc0ed0f0da7b275f9!2sfollow%20Pilates%20Yoga%20Studio!5e0!3m2!1sja!2sjp!4v1724666643727!5m2!1sja!2sjp";

export default function GoogleMap() {
  return (
    <iframe
      className="access-map"
      title="follow Pilates Yoga Studioへのアクセス（Google マップ）"
      src={MAP_URL}
      width="1920"
      height="528"
      loading="lazy"
      allowFullScreen
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
