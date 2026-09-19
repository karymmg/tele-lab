const fs = require('fs');
let css = fs.readFileSync('src/components/cart/CartDrawer.css', 'utf8');

// Replace the mobile media query with an enhanced one
const enhancedMediaQuery = `/* ── Mobile Cart Bottom Sheet (Pop up 70%) ── */
@media (max-width: 768px) {
  .tl-cart-drawer {
    top: auto;
    bottom: 0;
    right: 0;
    left: 0;
    width: 100%;
    max-width: 100%;
    height: 70vh;
    height: 70dvh;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px 24px 0 0;
    transform: translateY(100%);
    
    /* Cool Effect: Glassmorphism & Bouncy Spring */
    background: var(--color-glass);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 -10px 40px rgba(0, 140, 255, 0.15), 0 -4px 12px rgba(0, 0, 0, 0.4);
    transition: transform 0.55s cubic-bezier(0.32, 1.25, 0.32, 1);
    
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  /* Add a modern drag-handle indicator at the top */
  .tl-cart-drawer::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 4px;
    background: var(--color-text-secondary);
    opacity: 0.3;
    border-radius: 4px;
    z-index: 10;
  }

  .tl-cart-drawer.open {
    transform: translateY(0);
  }
}
`;

css = css.replace(/\/\* ── Mobile Cart Bottom Sheet[^]*?\}\n\}/, enhancedMediaQuery);
fs.writeFileSync('src/components/cart/CartDrawer.css', css);
