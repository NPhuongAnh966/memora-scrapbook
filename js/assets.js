/* ==========================================================================
   PTB Online – SVG Sticker Library, 8 Layouts, 6 Frame Styles & Sample Art
   ========================================================================== */

(function (global) {
  const PTB = (global.PTB = global.PTB || {});

  const STICKERS = [
    {
      id: 'dried-lavender',
      label: 'Hoa oải hương',
      width: 74,
      svg: `<svg viewBox="0 0 80 110" xmlns="http://www.w3.org/2000/svg">
        <path d="M40 102 Q38 64 42 18" stroke="#6E7F61" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <path d="M40 78 Q26 70 23 58" stroke="#7E9170" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M41 72 Q54 64 58 53" stroke="#7E9170" stroke-width="2" fill="none" stroke-linecap="round"/>
        <g fill="#9E87AE">
          <ellipse cx="42" cy="18" rx="4.5" ry="7" transform="rotate(-12 42 18)"/>
          <ellipse cx="36" cy="27" rx="4.5" ry="6.5" transform="rotate(-24 36 27)"/>
          <ellipse cx="47" cy="27" rx="4.5" ry="6.5" transform="rotate(24 47 27)"/>
          <ellipse cx="35" cy="38" rx="4.5" ry="6.5" transform="rotate(-24 35 38)"/>
          <ellipse cx="47" cy="38" rx="4.5" ry="6.5" transform="rotate(22 47 38)"/>
          <ellipse cx="36" cy="49" rx="4" ry="6" transform="rotate(-20 36 49)"/>
          <ellipse cx="46" cy="50" rx="4" ry="6" transform="rotate(20 46 50)"/>
        </g>
        <circle cx="42" cy="22" r="2.2" fill="#C4B0D1"/>
      </svg>`,
    },
    {
      id: 'dried-daisy',
      label: 'Hoa cúc ép',
      width: 72,
      svg: `<svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
        <path d="M45 50 Q44 72 47 86" stroke="#7C8E6D" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <g transform="translate(45,42)">
          <g fill="#FFFDF7" stroke="#D9CCB6" stroke-width="0.9">
            <ellipse rx="5.5" ry="16" transform="rotate(0) translate(0,-14)"/>
            <ellipse rx="5.5" ry="16" transform="rotate(36) translate(0,-14)"/>
            <ellipse rx="5.5" ry="16" transform="rotate(72) translate(0,-14)"/>
            <ellipse rx="5.5" ry="16" transform="rotate(108) translate(0,-14)"/>
            <ellipse rx="5.5" ry="16" transform="rotate(144) translate(0,-14)"/>
            <ellipse rx="5.5" ry="16" transform="rotate(180) translate(0,-14)"/>
            <ellipse rx="5.5" ry="16" transform="rotate(216) translate(0,-14)"/>
            <ellipse rx="5.5" ry="16" transform="rotate(252) translate(0,-14)"/>
            <ellipse rx="5.5" ry="16" transform="rotate(288) translate(0,-14)"/>
            <ellipse rx="5.5" ry="16" transform="rotate(324) translate(0,-14)"/>
          </g>
          <circle r="8.5" fill="#DFAD5A"/>
          <circle r="5" fill="#C8913D" opacity="0.5"/>
        </g>
      </svg>`,
    },
    {
      id: 'eucalyptus-leaf',
      label: 'Lá bạch đàn',
      width: 78,
      svg: `<svg viewBox="0 0 90 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M44 92 Q42 52 46 12" stroke="#6E8264" stroke-width="2.2" fill="none"/>
        <g fill="#B6C6AA" stroke="#7E9272" stroke-width="1">
          <ellipse cx="32" cy="70" rx="11" ry="7" transform="rotate(-24 32 70)"/>
          <ellipse cx="56" cy="64" rx="11" ry="7" transform="rotate(24 56 64)"/>
          <ellipse cx="32" cy="48" rx="10" ry="6.5" transform="rotate(-26 32 48)"/>
          <ellipse cx="56" cy="42" rx="10" ry="6.5" transform="rotate(22 56 42)"/>
          <ellipse cx="35" cy="28" rx="8.5" ry="5.5" transform="rotate(-20 35 28)"/>
          <ellipse cx="53" cy="24" rx="8" ry="5.5" transform="rotate(20 53 24)"/>
          <ellipse cx="46" cy="12" rx="6.5" ry="5"/>
        </g>
      </svg>`,
    },
    {
      id: 'vintage-heart',
      label: 'Trái tim',
      width: 56,
      svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
        <path d="M40 67 C18 52 10 38 10 25 C10 15 18 9 27 9 C33 9 37 12 40 17 C43 12 47 9 53 9 C62 9 70 15 70 25 C70 38 62 52 40 67 Z" fill="#E6A9A4" stroke="#B67670" stroke-width="2"/>
        <path d="M23 20 Q28 15 34 18" stroke="#FFFDF7" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.7"/>
      </svg>`,
    },
    {
      id: 'gold-star',
      label: 'Ngôi sao',
      width: 54,
      svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
        <polygon points="40,8 49,29 72,31 54,46 60,68 40,56 20,68 26,46 8,31 31,29" fill="#E9C87B" stroke="#B78F42" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    },
    {
      id: 'soft-cloud',
      label: 'Đám mây',
      width: 78,
      svg: `<svg viewBox="0 0 110 70" xmlns="http://www.w3.org/2000/svg">
        <path d="M28 54 H84 C93 54 99 47 99 39 C99 31 93 25 85 25 C83 14 73 8 62 10 C55 4 42 5 36 14 C25 14 16 22 16 33 C11 35 8 40 10 46 C12 51 19 54 28 54 Z" fill="#FFFDF7" stroke="#B89B7B" stroke-width="2"/>
      </svg>`,
    },
    {
      id: 'washi-sage',
      label: 'Băng keo Sage',
      width: 105,
      svg: `<svg viewBox="0 0 140 36" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4 L136 2 L132 10 L137 18 L133 26 L136 33 L5 34 L8 25 L3 17 L7 10 Z" fill="#C8D2C0" fill-opacity="0.88"/>
        <line x1="18" y1="4" x2="18" y2="33" stroke="#FFFDF7" stroke-width="2" opacity="0.5"/>
        <line x1="38" y1="4" x2="38" y2="33" stroke="#FFFDF7" stroke-width="2" opacity="0.5"/>
        <line x1="58" y1="4" x2="58" y2="33" stroke="#FFFDF7" stroke-width="2" opacity="0.5"/>
        <line x1="78" y1="3" x2="78" y2="33" stroke="#FFFDF7" stroke-width="2" opacity="0.5"/>
        <line x1="98" y1="3" x2="98" y2="33" stroke="#FFFDF7" stroke-width="2" opacity="0.5"/>
        <line x1="118" y1="3" x2="118" y2="33" stroke="#FFFDF7" stroke-width="2" opacity="0.5"/>
      </svg>`,
    },
    {
      id: 'washi-pink',
      label: 'Băng keo Hồng',
      width: 105,
      svg: `<svg viewBox="0 0 140 36" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 3 L135 4 L131 12 L136 20 L132 28 L135 33 L4 32 L7 24 L2 16 L6 9 Z" fill="#EBCFCB" fill-opacity="0.9"/>
        <circle cx="24" cy="18" r="3.5" fill="#FFFDF7" opacity="0.7"/>
        <circle cx="48" cy="18" r="3.5" fill="#FFFDF7" opacity="0.7"/>
        <circle cx="72" cy="18" r="3.5" fill="#FFFDF7" opacity="0.7"/>
        <circle cx="96" cy="18" r="3.5" fill="#FFFDF7" opacity="0.7"/>
        <circle cx="118" cy="18" r="3.5" fill="#FFFDF7" opacity="0.7"/>
      </svg>`,
    },
    {
      id: 'postage-stamp',
      label: 'Tem thư',
      width: 74,
      svg: `<svg viewBox="0 0 90 106" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="6" width="78" height="94" rx="3" fill="#FFFDF7" stroke="#B89B7B" stroke-width="2" stroke-dasharray="4 3"/>
        <rect x="14" y="14" width="62" height="78" fill="#EBCFCB" fill-opacity="0.55" stroke="#8C6E58" stroke-width="1"/>
        <circle cx="45" cy="48" r="16" fill="#C8D2C0" stroke="#594638" stroke-width="1.2"/>
        <path d="M35 52 Q45 36 55 52" fill="#FFFDF7" opacity="0.7"/>
        <text x="45" y="84" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="#594638" letter-spacing="1.5">MEMORIES</text>
      </svg>`,
    },
    {
      id: 'cinema-ticket',
      label: 'Vé kỷ niệm',
      width: 98,
      svg: `<svg viewBox="0 0 130 62" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 6 H122 V22 A7 7 0 0 0 122 38 V56 H8 V38 A7 7 0 0 0 8 22 Z" fill="#F4DFC8" stroke="#9B7D5E" stroke-width="2"/>
        <line x1="34" y1="8" x2="34" y2="54" stroke="#9B7D5E" stroke-width="1.5" stroke-dasharray="3 3"/>
        <rect x="42" y="13" width="72" height="36" fill="none" stroke="#9B7D5E" stroke-width="1"/>
        <text x="78" y="30" text-anchor="middle" font-family="Georgia,serif" font-size="10" font-weight="bold" fill="#594638">ADMIT ONE</text>
        <text x="78" y="42" text-anchor="middle" font-family="monospace" font-size="7.5" fill="#846E5C">NO. 04291</text>
      </svg>`,
    },
    {
      id: 'warm-sun',
      label: 'Mặt trời',
      width: 64,
      svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="16" fill="#F2C879" stroke="#C59342" stroke-width="1.8"/>
        <g stroke="#C59342" stroke-width="2.2" stroke-linecap="round">
          <line x1="40" y1="10" x2="40" y2="18"/>
          <line x1="40" y1="62" x2="40" y2="70"/>
          <line x1="10" y1="40" x2="18" y2="40"/>
          <line x1="62" y1="40" x2="70" y2="40"/>
          <line x1="19" y1="19" x2="25" y2="25"/>
          <line x1="55" y1="55" x2="61" y2="61"/>
          <line x1="61" y1="19" x2="55" y2="25"/>
          <line x1="25" y1="55" x2="19" y2="61"/>
        </g>
      </svg>`,
    },
    {
      id: 'doodle-sparkles',
      label: 'Doodle lấp lánh',
      width: 68,
      svg: `<svg viewBox="0 0 90 80" xmlns="http://www.w3.org/2000/svg">
        <path d="M36 12 Q38 30 56 32 Q38 34 36 52 Q34 34 16 32 Q34 30 36 12 Z" fill="none" stroke="#8C6D54" stroke-width="2" stroke-linejoin="round"/>
        <path d="M68 42 Q69 52 78 53 Q69 54 68 64 Q67 54 58 53 Q67 52 68 42 Z" fill="none" stroke="#8C6D54" stroke-width="1.8" stroke-linejoin="round"/>
        <circle cx="22" cy="58" r="2.5" fill="#B89B7B"/>
      </svg>`,
    },
    {
      id: 'date-label',
      label: 'Nhãn ngày',
      width: 96,
      svg: `<svg viewBox="0 0 130 48" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="6" width="122" height="36" rx="18" fill="#FFFDF7" stroke="#B89B7B" stroke-width="2"/>
        <rect x="9" y="11" width="112" height="26" rx="13" fill="none" stroke="#EBCFCB" stroke-width="1.5" stroke-dasharray="3 2"/>
        <text x="65" y="28" text-anchor="middle" font-family="Georgia,serif" font-size="11" fill="#594638">★ REMEMBER ★</text>
      </svg>`,
    },
  ];

  const FRAME_STYLES = [
    { id: 'polaroid', label: 'Polaroid' },
    { id: 'vintage', label: 'Vintage' },
    { id: 'minimal', label: 'Bo góc' },
    { id: 'film', label: 'Cuộn phim' },
    { id: 'taped', label: 'Ảnh dán' },
    { id: 'collage', label: 'Collage' },
  ];

  const LAYOUTS = [
    {
      id: 'layout-1',
      name: '1 Ảnh Lớn',
      slots: 1,
      hasNote: true,
      defaultFrame: 'polaroid',
      iconSvg: `<svg viewBox="0 0 36 46" width="28"><rect x="6" y="7" width="24" height="24" rx="2" fill="#B89B7B" opacity=".55"/><line x1="8" y1="37" x2="28" y2="37" stroke="#846E5C" stroke-width="2"/></svg>`,
    },
    {
      id: 'layout-2',
      name: '2 Polaroid',
      slots: 2,
      hasNote: true,
      defaultFrame: 'polaroid',
      iconSvg: `<svg viewBox="0 0 36 46" width="28"><rect x="3" y="9" width="13" height="19" rx="1.5" fill="#B89B7B" opacity=".6"/><rect x="20" y="11" width="13" height="19" rx="1.5" fill="#B89B7B" opacity=".6"/><line x1="7" y1="37" x2="29" y2="37" stroke="#846E5C" stroke-width="2"/></svg>`,
    },
    {
      id: 'layout-3',
      name: '1 Lớn 2 Nhỏ',
      slots: 3,
      hasNote: false,
      defaultFrame: 'vintage',
      iconSvg: `<svg viewBox="0 0 36 46" width="28"><rect x="3" y="7" width="17" height="32" rx="1.5" fill="#B89B7B" opacity=".6"/><rect x="22" y="7" width="11" height="14" rx="1.5" fill="#C8D2C0"/><rect x="22" y="25" width="11" height="14" rx="1.5" fill="#EBCFCB"/></svg>`,
    },
    {
      id: 'layout-4',
      name: '4 Collage',
      slots: 4,
      hasNote: false,
      defaultFrame: 'taped',
      iconSvg: `<svg viewBox="0 0 36 46" width="28"><rect x="4" y="7" width="13" height="15" rx="1.5" fill="#B89B7B" opacity=".6"/><rect x="19" y="8" width="13" height="15" rx="1.5" fill="#EBCFCB"/><rect x="4" y="25" width="13" height="15" rx="1.5" fill="#C8D2C0"/><rect x="19" y="24" width="13" height="15" rx="1.5" fill="#B89B7B" opacity=".6"/></svg>`,
    },
    {
      id: 'layout-5',
      name: 'Ảnh + Nhật Ký',
      slots: 1,
      hasNote: true,
      defaultFrame: 'minimal',
      iconSvg: `<svg viewBox="0 0 36 46" width="28"><rect x="3" y="10" width="15" height="25" rx="2" fill="#B89B7B" opacity=".6"/><line x1="21" y1="14" x2="33" y2="14" stroke="#846E5C" stroke-width="2"/><line x1="21" y1="21" x2="33" y2="21" stroke="#846E5C" stroke-width="2"/><line x1="21" y1="28" x2="30" y2="28" stroke="#846E5C" stroke-width="2"/></svg>`,
    },
    {
      id: 'layout-6',
      name: '3 Ảnh Sticker',
      slots: 3,
      hasNote: true,
      defaultFrame: 'film',
      iconSvg: `<svg viewBox="0 0 36 46" width="28"><rect x="3" y="9" width="9" height="16" rx="1" fill="#594638" opacity=".65"/><rect x="14" y="12" width="9" height="16" rx="1" fill="#594638" opacity=".65"/><rect x="25" y="9" width="9" height="16" rx="1" fill="#594638" opacity=".65"/><line x1="7" y1="36" x2="29" y2="36" stroke="#846E5C" stroke-width="2"/></svg>`,
    },
    {
      id: 'layout-7',
      name: 'Trang Nhật Ký',
      slots: 1,
      hasNote: true,
      defaultFrame: 'taped',
      iconSvg: `<svg viewBox="0 0 36 46" width="28"><line x1="5" y1="11" x2="30" y2="11" stroke="#B89B7B" stroke-width="1.5"/><line x1="5" y1="18" x2="30" y2="18" stroke="#B89B7B" stroke-width="1.5"/><line x1="5" y1="25" x2="18" y2="25" stroke="#B89B7B" stroke-width="1.5"/><rect x="19" y="23" width="13" height="16" rx="1.5" fill="#EBCFCB"/></svg>`,
    },
    {
      id: 'layout-8',
      name: 'Ảnh Toàn Khổ',
      slots: 1,
      hasNote: true,
      defaultFrame: 'minimal',
      iconSvg: `<svg viewBox="0 0 36 46" width="28"><rect x="3" y="5" width="30" height="36" rx="2" fill="#C8D2C0"/><rect x="6" y="31" width="24" height="6" rx="1" fill="#FFFDF7"/></svg>`,
    },
    {
      id: 'layout-free',
      name: 'Trang Trống Tự Do',
      slots: 0,
      hasNote: false,
      defaultFrame: 'polaroid',
      iconSvg: `<svg viewBox="0 0 36 46" width="28"><rect x="3" y="5" width="30" height="36" rx="2" fill="none" stroke="#B89B7B" stroke-width="1.5" stroke-dasharray="3 2"/><path d="M18 16 V28 M12 22 H24" stroke="#846E5C" stroke-width="2" stroke-linecap="round"/></svg>`,
    },
  ];

  /**
   * Generates crisp artistic sample photography SVG DataURLs (zero broken external links!)
   */
  function createSampleArtPhoto(scene) {
    const scenes = {
      sunset: `
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#F6D5C1"/><stop offset="55%" stop-color="#E8A598"/><stop offset="100%" stop-color="#8FA4A8"/>
          </linearGradient>
        </defs>
        <rect width="600" height="450" fill="url(#g)"/>
        <circle cx="300" cy="210" r="68" fill="#FFF1C9" opacity="0.9"/>
        <path d="M0 285 Q180 260 360 285 T600 280 V450 H0 Z" fill="#6F8A8E"/>
        <ellipse cx="300" cy="310" rx="95" ry="12" fill="#FFE6B3" opacity="0.55"/>
        <path d="M0 355 Q190 330 410 360 T600 350 V450 H0 Z" fill="#C9A889"/>
      `,
      coffee: `
        <rect width="600" height="450" fill="#EAE0D0"/>
        <rect x="40" y="35" width="240" height="290" fill="#F9F4EB" stroke="#C5B096" stroke-width="6"/>
        <path d="M40 180 L280 180 M160 35 L160 325" stroke="#C5B096" stroke-width="5"/>
        <ellipse cx="380" cy="340" rx="135" ry="42" fill="#D5C2A9"/>
        <ellipse cx="380" cy="330" rx="108" ry="30" fill="#FFFDF7" stroke="#B89B7B" stroke-width="3"/>
        <path d="M300 245 Q300 325 380 325 Q460 325 460 245 Z" fill="#FFFDF7" stroke="#B89B7B" stroke-width="3"/>
        <ellipse cx="380" cy="245" rx="80" ry="20" fill="#8B6347"/>
        <path d="M355 245 Q380 232 405 245 Q380 258 355 245" fill="#E8D7C3"/>
        <path d="M355 205 Q345 180 365 155 M395 200 Q408 175 388 150" stroke="#FFFDF7" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.7"/>
      `,
      meadow: `
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#D7E3D2"/><stop offset="100%" stop-color="#F7EFE2"/>
          </linearGradient>
        </defs>
        <rect width="600" height="450" fill="url(#sky)"/>
        <circle cx="470" cy="100" r="46" fill="#F6DBA6"/>
        <path d="M0 270 Q160 215 330 265 T600 245 V450 H0 Z" fill="#A9BC9B"/>
        <path d="M0 320 Q220 275 420 330 T600 315 V450 H0 Z" fill="#8BA17D"/>
        <circle cx="140" cy="355" r="8" fill="#FFFDF7"/><circle cx="195" cy="378" r="7" fill="#EBCFCB"/>
        <circle cx="290" cy="360" r="8" fill="#FFFDF7"/><circle cx="430" cy="382" r="9" fill="#EBCFCB"/>
      `,
      autumn: `
        <rect width="600" height="450" fill="#F1DFCE"/>
        <path d="M230 450 L280 240 L320 240 L370 450 Z" fill="#B89B7B"/>
        <circle cx="140" cy="175" r="95" fill="#D5956B" opacity="0.88"/>
        <circle cx="460" cy="165" r="100" fill="#C97F5D" opacity="0.85"/>
        <circle cx="220" cy="145" r="75" fill="#E5B67C" opacity="0.82"/>
        <circle cx="385" cy="145" r="80" fill="#DCA168" opacity="0.85"/>
        <rect x="132" y="230" width="16" height="170" fill="#6E523F"/>
        <rect x="452" y="230" width="16" height="170" fill="#6E523F"/>
      `,
      flowers: `
        <rect width="600" height="450" fill="#F5EAE4"/>
        <rect x="225" y="255" width="150" height="145" rx="18" fill="#D8C3AD" opacity="0.85"/>
        <path d="M300 260 L255 135 M300 260 L300 105 M300 260 L345 140" stroke="#7A8F6B" stroke-width="5"/>
        <circle cx="255" cy="130" r="34" fill="#E6A9A4"/>
        <circle cx="300" cy="105" r="38" fill="#FFFDF7" stroke="#E0C9B2" stroke-width="3"/>
        <circle cx="300" cy="105" r="14" fill="#E3B35E"/>
        <circle cx="348" cy="138" r="32" fill="#D2B4C8"/>
      `,
      mountain: `
        <defs>
          <linearGradient id="m" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#D2DCE2"/><stop offset="100%" stop-color="#F6EDE2"/>
          </linearGradient>
        </defs>
        <rect width="600" height="450" fill="url(#m)"/>
        <polygon points="40,360 210,130 390,360" fill="#8C9E9A"/>
        <polygon points="210,130 164,195 210,185 256,195" fill="#FFFDF7"/>
        <polygon points="240,360 410,155 580,360" fill="#70827D"/>
        <polygon points="410,155 372,202 410,192 448,202" fill="#FFFDF7"/>
        <rect x="0" y="340" width="600" height="110" fill="#C8D2C0"/>
      `,
      friends: `
        <rect width="600" height="450" fill="#F7E8DE"/>
        <circle cx="205" cy="195" r="46" fill="#E6C2A8"/>
        <circle cx="300" cy="182" r="48" fill="#DEB397"/>
        <circle cx="395" cy="195" r="46" fill="#EBC5B0"/>
        <path d="M140 365 Q205 265 268 365" fill="#C8D2C0"/>
        <path d="M235 365 Q300 250 365 365" fill="#EBCFCB"/>
        <path d="M332 365 Q395 265 460 365" fill="#B89B7B"/>
        <path d="M280 96 C265 82 285 66 300 80 C315 66 335 82 320 96 L300 114 Z" fill="#E39A94"/>
      `,
      celebration: `
        <rect width="600" height="450" fill="#F6ECE4"/>
        <rect x="200" y="245" width="200" height="115" rx="14" fill="#FFFDF7" stroke="#D8BFA5" stroke-width="4"/>
        <path d="M200 278 Q225 296 250 278 T300 278 T350 278 T400 278 V245 H200 Z" fill="#EBCFCB"/>
        <rect x="260" y="175" width="12" height="70" rx="4" fill="#C8D2C0"/>
        <rect x="294" y="162" width="12" height="83" rx="4" fill="#E6B2AC"/>
        <rect x="328" y="175" width="12" height="70" rx="4" fill="#D5B895"/>
        <ellipse cx="266" cy="160" rx="7" ry="12" fill="#F2B857"/>
        <ellipse cx="300" cy="147" rx="7" ry="12" fill="#F2B857"/>
        <ellipse cx="334" cy="160" rx="7" ry="12" fill="#F2B857"/>
      `,
    };
    const body = scenes[scene] || scenes.sunset;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">${body}</svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  PTB.Assets = {
    STICKERS,
    FRAME_STYLES,
    LAYOUTS,
    createSampleArtPhoto,
    getStickerById(id) {
      return STICKERS.find((s) => s.id === id);
    },
    getLayoutById(id) {
      return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
    },
  };
})(window);
