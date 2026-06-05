const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#004c80" />
      <stop offset="100%" stop-color="#0061a4" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Fundo azul real Ventisol arredondado moderno -->
  <rect width="512" height="512" rx="128" fill="url(#blueGrad)" />
  
  <g transform="translate(10, 10)" filter="url(#shadow)">
    <!-- Circulo interno de destaque sutil -->
    <circle cx="246" cy="246" r="210" stroke="#ffffff" stroke-width="2" stroke-opacity="0.15" fill="none" />
  </g>

  <!-- Caixa de Logística Isométrica e Setas de Fluxo -->
  <g transform="translate(141, 126)">
    <!-- Base e Seta de Fluxo Dinâmico (Amarelo Ventisol #FBC02D para forte contraste e branding) -->
    <!-- Seta circular elegante em volta do fluxo -->
    <path d="M -20,180 C -40,110 0,30 115,20 C 230,10 270,110 240,170" stroke="#fbc02d" stroke-width="12" stroke-linecap="round" fill="none" stroke-dasharray="1 18" />
    <path d="M 240,170 L 255,145 M 240,170 L 215,160" stroke="#fbc02d" stroke-width="12" stroke-linecap="round" fill="none" />

    <!-- Caixa Isométrica Central -->
    <!-- Face Superior da Caixa -->
    <polygon points="115,30 205,75 115,120 25,75" fill="#ffffff" fill-opacity="0.9" stroke="#ffffff" stroke-width="8" stroke-linejoin="round" />
    
    <!-- Linhas de fita adesiva de embalagem para realismo de caixa logística -->
    <polygon points="115,30 145,45 115,60 85,45" fill="#fbc02d" opacity="0.85" />
    <line x1="115" y1="60" x2="115" y2="120" stroke="#fbc02d" stroke-width="6" opacity="0.85" />

    <!-- Face Esquerda da Caixa -->
    <polygon points="25,75 115,120 115,225 25,180" fill="#e1f5fe" stroke="#ffffff" stroke-width="8" stroke-linejoin="round" />
    <!-- Símbolo de Empilhamento (Duas setas para cima na lateral esquerda) -->
    <path d="M 60,150 L 60,125 M 60,125 L 50,135 M 60,125 L 70,135" stroke="#0061a4" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <path d="M 60,165 L 60,155" stroke="#0061a4" stroke-width="5" stroke-linecap="round" fill="none" />

    <!-- Face Direita da Caixa -->
    <polygon points="205,75 115,120 115,225 205,180" fill="#b3e5fc" stroke="#ffffff" stroke-width="8" stroke-linejoin="round" />
    <!-- Desenho de Código de Barras na lateral direita de forma minimalista profissional -->
    <g stroke="#0061a4" stroke-width="4" stroke-linecap="round" opacity="0.75" transform="translate(135, 125)">
      <line x1="0" y1="0" x2="0" y2="35" />
      <line x1="6" y1="0" x2="6" y2="35" stroke-width="2" />
      <line x1="12" y1="0" x2="12" y2="35" stroke-width="5" />
      <line x1="20" y1="0" x2="20" y2="35" stroke-width="2" />
      <line x1="26" y1="0" x2="26" y2="35" stroke-width="6" />
      <line x1="34" y1="0" x2="34" y2="35" />
    </g>
  </g>
</svg>
`;

const publicDir = path.join(__dirname, '../public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Salva o SVG original como arquivo de texto para fins de backup e uso nativo vector
const svgPath = path.join(publicDir, 'app-logo.svg');
fs.writeFileSync(svgPath, svgString.trim());
console.log('✔ Criado app-logo.svg contendo a codificação vetorial do logotipo!');

async function generatePWA() {
  try {
    console.log('Iniciando processamento profissional das imagens do PWA a partir de SVG...');

    const svgBuffer = Buffer.from(svgString);

    // 1. icon-192.png (192x192)
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-192.png'));
    console.log('✔ Criado icon-192.png legítimo.');

    // 2. icon-512.png (512x512)
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-512.png'));
    console.log('✔ Criado icon-512.png legítimo.');

    // 3. maskable-icon.png (512x512 com margem de segurança de 10% para o PWA no Android/Chrome)
    // Para design maskable PWA, o ícone deve estar contido em 80% do espaço central.
    // Reduzimos o tamanho do ícone central para 400x400 e compomos sobre um fundo de cor sólida (azul do app e do theme_color: #004c80).
    const centralIcon = await sharp(svgBuffer)
      .resize(380, 380, { fit: 'inside' })
      .toBuffer();

    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 0, g: 76, b: 128, alpha: 1 } // #004c80
      }
    })
      .composite([{ input: centralIcon, gravity: 'center' }])
      .png()
      .toFile(path.join(publicDir, 'maskable-icon.png'));
    console.log('✔ Criado maskable-icon.png de alta qualidade (com margem segura de 10%).');

    // 4. icon.png (512x512)
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon.png'));
    console.log('✔ Criado icon.png legítimo.');

    // 5. app-logo.png (512x512)
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'app-logo.png'));
    console.log('✔ Criado app-logo.png legítimo.');

    // 6. favicon.ico (32x32 formato ICO ou PNG de baixa resolução)
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon.ico'));
    console.log('✔ Criado favicon.ico legítimo.');

    // 7. screenshot-desktop.png (1280x720) - Mock de visualização para desktop
    const deskIcon = await sharp(svgBuffer)
      .resize(320, 320, { fit: 'inside' })
      .toBuffer();

    await sharp({
      create: {
        width: 1280,
        height: 720,
        channels: 4,
        background: { r: 243, g: 244, b: 246, alpha: 1 } // Cor de fundo claro cinza #f3f4f6
      }
    })
      .composite([{ input: deskIcon, gravity: 'center' }])
      .png()
      .toFile(path.join(publicDir, 'screenshot-desktop.png'));
    console.log('✔ Criado screenshot-desktop.png legítimo.');

    // 8. screenshot-mobile.png (720x1600) - Mock de visualização para celular
    const mobIcon = await sharp(svgBuffer)
      .resize(256, 256, { fit: 'inside' })
      .toBuffer();

    await sharp({
      create: {
        width: 720,
        height: 1600,
        channels: 4,
        background: { r: 243, g: 244, b: 246, alpha: 1 }
      }
    })
      .composite([{ input: mobIcon, gravity: 'center' }])
      .png()
      .toFile(path.join(publicDir, 'screenshot-mobile.png'));
    console.log('✔ Criado screenshot-mobile.png legítimo.');

    console.log('\n🌟 Processamento e geração dos ícones do PWA finalizados com sucesso absoluto!');
  } catch (error) {
    console.error('Falha ao processar imagens:', error);
    process.exit(1);
  }
}

generatePWA();
