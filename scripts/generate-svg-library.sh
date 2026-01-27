#!/bin/bash

# Script to generate SVG library icons
SVG_DIR="/Users/rohanjasani/Desktop/Projects/AstroWeb/public/svg-library"

# Icons
cat > "$SVG_DIR/icons/users.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <circle cx="18" cy="14" r="6" stroke="#333" stroke-width="2" fill="none"/>
  <circle cx="32" cy="14" r="6" stroke="#333" stroke-width="2" fill="none"/>
  <path d="M6 38c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#333" stroke-width="2" fill="none"/>
  <path d="M20 38c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#333" stroke-width="2" fill="none"/>
</svg>
EOF

cat > "$SVG_DIR/icons/database.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <ellipse cx="24" cy="12" rx="14" ry="6" stroke="#333" stroke-width="2" fill="none"/>
  <path d="M10 12v24c0 3.314 6.268 6 14 6s14-2.686 14-6V12" stroke="#333" stroke-width="2" fill="none"/>
  <ellipse cx="24" cy="24" rx="14" ry="6" stroke="#333" stroke-width="2" fill="none"/>
</svg>
EOF

cat > "$SVG_DIR/icons/cloud.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M36 32c4.418 0 8-3.582 8-8s-3.582-8-8-8c-0.277 0-0.549 0.014-0.816 0.041C34.424 11.186 29.744 8 24 8c-6.627 0-12 5.373-12 12 0 0.337 0.014 0.671 0.041 1C7.82 21.465 4 25.577 4 30.5 4 35.746 8.254 40 13.5 40H36z" stroke="#333" stroke-width="2" fill="none"/>
</svg>
EOF

cat > "$SVG_DIR/icons/server.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="8" y="10" width="32" height="10" rx="2" stroke="#333" stroke-width="2" fill="none"/>
  <rect x="8" y="24" width="32" height="10" rx="2" stroke="#333" stroke-width="2" fill="none"/>
  <rect x="8" y="38" width="32" height="10" rx="2" stroke="#333" stroke-width="2" fill="none"/>
  <circle cx="14" cy="15" r="1.5" fill="#333"/>
  <circle cx="14" cy="29" r="1.5" fill="#333"/>
  <circle cx="14" cy="43" r="1.5" fill="#333"/>
</svg>
EOF

cat > "$SVG_DIR/icons/api.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="6" y="18" width="14" height="12" rx="2" stroke="#333" stroke-width="2" fill="none"/>
  <rect x="28" y="18" width="14" height="12" rx="2" stroke="#333" stroke-width="2" fill="none"/>
  <path d="M20 24h8M24 20v8" stroke="#333" stroke-width="2"/>
</svg>
EOF

cat > "$SVG_DIR/icons/mobile.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="14" y="6" width="20" height="36" rx="3" stroke="#333" stroke-width="2" fill="none"/>
  <circle cx="24" cy="38" r="1.5" fill="#333"/>
</svg>
EOF

cat > "$SVG_DIR/icons/desktop.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="6" y="8" width="36" height="24" rx="2" stroke="#333" stroke-width="2" fill="none"/>
  <path d="M18 40h12M24 32v8" stroke="#333" stroke-width="2"/>
</svg>
EOF

cat > "$SVG_DIR/icons/settings.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <circle cx="24" cy="24" r="6" stroke="#333" stroke-width="2" fill="none"/>
  <path d="M24 6v4m0 28v4m12.728-30.728l-2.828 2.828m-19.8 19.8l-2.828 2.828m28.456 0l-2.828-2.828m-19.8-19.8L14.272 11.272M42 24h-4M10 24H6" stroke="#333" stroke-width="2"/>
</svg>
EOF

cat > "$SVG_DIR/icons/lock.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="12" y="22" width="24" height="18" rx="2" stroke="#333" stroke-width="2" fill="none"/>
  <path d="M16 22v-6c0-4.418 3.582-8 8-8s8 3.582 8 8v6" stroke="#333" stroke-width="2" fill="none"/>
  <circle cx="24" cy="32" r="2" fill="#333"/>
</svg>
EOF

cat > "$SVG_DIR/icons/key.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <circle cx="16" cy="32" r="8" stroke="#333" stroke-width="2" fill="none"/>
  <path d="M22.828 25.172L38 10m-4 0v4m0-4h4" stroke="#333" stroke-width="2"/>
</svg>
EOF

cat > "$SVG_DIR/icons/bell.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M20 40c0 2.209 1.791 4 4 4s4-1.791 4-4m-16-4h24l-2-16c0-5.523-4.477-10-10-10s-10 4.477-10 10l-2 16z" stroke="#333" stroke-width="2" fill="none"/>
</svg>
EOF

# Business
cat > "$SVG_DIR/business/bar-chart.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="8" y="28" width="6" height="12" stroke="#333" stroke-width="2" fill="none"/>
  <rect x="18" y="20" width="6" height="20" stroke="#333" stroke-width="2" fill="none"/>
  <rect x="28" y="14" width="6" height="26" stroke="#333" stroke-width="2" fill="none"/>
  <rect x="38" y="22" width="6" height="18" stroke="#333" stroke-width="2" fill="none"/>
</svg>
EOF

cat > "$SVG_DIR/business/line-chart.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <polyline points="6,36 14,28 22,32 30,18 38,24 42,20" stroke="#333" stroke-width="2" fill="none"/>
  <circle cx="6" cy="36" r="2" fill="#333"/>
  <circle cx="14" cy="28" r="2" fill="#333"/>
  <circle cx="22" cy="32" r="2" fill="#333"/>
  <circle cx="30" cy="18" r="2" fill="#333"/>
  <circle cx="38" cy="24" r="2" fill="#333"/>
  <circle cx="42" cy="20" r="2" fill="#333"/>
</svg>
EOF

cat > "$SVG_DIR/business/pie-chart.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <circle cx="24" cy="24" r="16" stroke="#333" stroke-width="2" fill="none"/>
  <path d="M24 8v16h16" stroke="#333" stroke-width="2"/>
  <path d="M24 24L36.124 36.124" stroke="#333" stroke-width="2"/>
</svg>
EOF

cat > "$SVG_DIR/business/dashboard.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="6" y="6" width="16" height="14" rx="2" stroke="#333" stroke-width="2" fill="none"/>
  <rect x="26" y="6" width="16" height="14" rx="2" stroke="#333" stroke-width="2" fill="none"/>
  <rect x="6" y="24" width="16" height="18" rx="2" stroke="#333" stroke-width="2" fill="none"/>
  <rect x="26" y="24" width="16" height="18" rx="2" stroke="#333" stroke-width="2" fill="none"/>
</svg>
EOF

cat > "$SVG_DIR/business/report.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="12" y="6" width="24" height="36" rx="2" stroke="#333" stroke-width="2" fill="none"/>
  <path d="M18 16h12M18 24h12M18 32h8" stroke="#333" stroke-width="2"/>
</svg>
EOF

cat > "$SVG_DIR/business/target.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <circle cx="24" cy="24" r="4" stroke="#333" stroke-width="2" fill="none"/>
  <circle cx="24" cy="24" r="10" stroke="#333" stroke-width="2" fill="none"/>
  <circle cx="24" cy="24" r="16" stroke="#333" stroke-width="2" fill="none"/>
</svg>
EOF

cat > "$SVG_DIR/business/growth.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <polyline points="8,36 16,28 24,32 32,20 40,12" stroke="#333" stroke-width="2" fill="none"/>
  <polyline points="32,12 40,12 40,20" stroke="#333" stroke-width="2" fill="none"/>
</svg>
EOF

cat > "$SVG_DIR/business/money.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <circle cx="24" cy="24" r="16" stroke="#333" stroke-width="2" fill="none"/>
  <path d="M26 16h-4c-2.209 0-4 1.791-4 4s1.791 4 4 4h4c2.209 0 4 1.791 4 4s-1.791 4-4 4h-4M24 12v6m0 12v6" stroke="#333" stroke-width="2"/>
</svg>
EOF

# Arrows
cat > "$SVG_DIR/arrows/arrow-right.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M8 24h32m-8-8l8 8-8 8" stroke="#333" stroke-width="2"/>
</svg>
EOF

cat > "$SVG_DIR/arrows/arrow-left.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M40 24H8m8 8l-8-8 8-8" stroke="#333" stroke-width="2"/>
</svg>
EOF

cat > "$SVG_DIR/arrows/arrow-up.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M24 40V8m8 8l-8-8-8 8" stroke="#333" stroke-width="2"/>
</svg>
EOF

cat > "$SVG_DIR/arrows/arrow-down.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M24 8v32m-8-8l8 8 8-8" stroke="#333" stroke-width="2"/>
</svg>
EOF

cat > "$SVG_DIR/arrows/arrow-curved-right.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M8 12h20c6.627 0 12 5.373 12 12v8m-8-6l8 8-8 8" stroke="#333" stroke-width="2" fill="none"/>
</svg>
EOF

cat > "$SVG_DIR/arrows/arrow-bidirectional.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M8 24h32m-32 0l6-6m-6 6l6 6m20-6l-6-6m6 6l-6 6" stroke="#333" stroke-width="2"/>
</svg>
EOF

cat > "$SVG_DIR/arrows/arrow-circle.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M40 24c0 8.837-7.163 16-16 16S8 32.837 8 24 15.163 8 24 8c6.627 0 12.36 4.028 14.835 9.765M40 8v10h-10" stroke="#333" stroke-width="2" fill="none"/>
</svg>
EOF

cat > "$SVG_DIR/arrows/arrow-branch.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M8 24h16m0 0l8-12m-8 12l8 12" stroke="#333" stroke-width="2"/>
</svg>
EOF

# Shapes
cat > "$SVG_DIR/shapes/shape-process.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="8" y="14" width="32" height="20" rx="2" stroke="#333" stroke-width="2" fill="none"/>
</svg>
EOF

cat > "$SVG_DIR/shapes/shape-decision.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M24 8L40 24 24 40 8 24z" stroke="#333" stroke-width="2" fill="none"/>
</svg>
EOF

cat > "$SVG_DIR/shapes/shape-data.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M12 14L38 14 42 34 6 34z" stroke="#333" stroke-width="2" fill="none"/>
</svg>
EOF

cat > "$SVG_DIR/shapes/shape-terminal.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="8" y="16" width="32" height="16" rx="8" stroke="#333" stroke-width="2" fill="none"/>
</svg>
EOF

cat > "$SVG_DIR/shapes/shape-document.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M12 8h18l6 6v28H12V8z" stroke="#333" stroke-width="2" fill="none"/>
  <path d="M30 8v6h6" stroke="#333" stroke-width="2" fill="none"/>
</svg>
EOF

cat > "$SVG_DIR/shapes/shape-cylinder.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <ellipse cx="24" cy="14" rx="12" ry="6" stroke="#333" stroke-width="2" fill="none"/>
  <path d="M12 14v20c0 3.314 5.373 6 12 6s12-2.686 12-6V14" stroke="#333" stroke-width="2" fill="none"/>
</svg>
EOF

cat > "$SVG_DIR/shapes/shape-cloud.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M34 26c3.314 0 6-2.686 6-6s-2.686-6-6-6c-0.277 0-0.549 0.014-0.816 0.041C32.424 10.186 28.744 8 24 8c-5.523 0-10 4.477-10 10 0 0.337 0.014 0.671 0.041 1C10.82 19.465 8 22.577 8 26.5 8 30.746 11.254 34 15.5 34H34z" stroke="#333" stroke-width="2" fill="none"/>
</svg>
EOF

cat > "$SVG_DIR/shapes/shape-hexagon.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M24 8L36 16v16L24 40 12 32V16z" stroke="#333" stroke-width="2" fill="none"/>
</svg>
EOF

echo "✅ All SVG files generated successfully!"
