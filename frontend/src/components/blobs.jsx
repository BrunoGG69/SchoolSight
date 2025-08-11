export default function Blob({ color, position, size = "w-96 h-96 sm:w-48 sm:h-48", delay, className = "" }) {
  return (
    <div
      className={`absolute ${position} ${size} ${color} rounded-full filter blur-3xl animate-blob ${delay} ${className}`}
      style={{ mixBlendMode: "screen" }}
    ></div>
  );
}
