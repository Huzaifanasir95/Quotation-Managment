export default function Icon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect width="32" height="32" rx="6" fill="#56425b" />
      
      {/* Q Letter */}
      <text
        x="16"
        y="22"
        fontFamily="Arial, sans-serif"
        fontSize="18"
        fontWeight="bold"
        fill="white"
        textAnchor="middle"
      >
        Q
      </text>
      
      {/* Accent dot */}
      <circle cx="16" cy="8" r="2" fill="#8B5FBF" />
    </svg>
  );
}
