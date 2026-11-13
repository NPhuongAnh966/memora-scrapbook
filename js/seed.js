/* ==========================================================================
   PTB Online – Rich Initial Sample Albums (Seed Data)
   ========================================================================== */

(function (global) {
  const PTB = (global.PTB = global.PTB || {});

  function makePhotoSlot(src, caption = '', frame = 'polaroid', rotation = 0) {
    return {
      id: PTB.Storage.uid('slot'),
      src,
      caption,
      frame,
      zoom: 1,
      panX: 0,
      panY: 0,
      imgRotate: 0,
      frameRotate: rotation,
    };
  }

  function makeSticker(stickerId, x, y, scale = 1, rotate = 0) {
    return {
      id: PTB.Storage.uid('decor'),
      type: 'sticker',
      stickerId,
      x,
      y,
      scale,
      rotate,
    };
  }

  function makeFreeNote(text, x, y, rotate = -2, bg = '#FCF3D9') {
    return {
      id: PTB.Storage.uid('note'),
      type: 'note',
      text,
      x,
      y,
      scale: 1,
      rotate,
      bg,
    };
  }

  function makeFreePhoto(src, x = 50, y = 50, caption = '', frame = 'polaroid', rotate = -2) {
    return {
      id: PTB.Storage.uid('free_photo'),
      type: 'free-photo',
      src,
      caption,
      frame,
      x,
      y,
      scale: 1,
      rotate,
      zoom: 1,
      panX: 0,
      panY: 0,
      imgRotate: 0,
    };
  }

  function makeFreeText(text = 'Gõ chữ ở đây...', x = 50, y = 50, rotate = 0, font = 'var(--font-hand)', fontSize = 22, color = '#594638', align = 'center', bg = 'transparent') {
    return {
      id: PTB.Storage.uid('free_text'),
      type: 'free-text',
      text,
      x,
      y,
      scale: 1,
      rotate,
      font,
      fontSize,
      color,
      align,
      bg,
    };
  }

  function createSeedAlbums() {
    const art = PTB.Assets.createSampleArtPhoto;
    const now = Date.now();

    const ourMemories = {
      id: 'album_our_memories',
      title: 'Our Memories',
      owner: 'Minh Anh',
      startDate: '2025-05-12',
      endDate: '2026-11-10',
      description: 'Những ngày nắng dịu, buổi chiều bên tách trà ấm và những trang nhật ký không muốn quên.',
      coverTheme: 'leather',
      coverPhoto: art('sunset'),
      coverOrnament: 'dried-lavender',
      privacy: 'public',
      createdAt: now - 86400000 * 12,
      updatedAt: now - 3600000,
      pages: [
        {
          id: 'p_om_1',
          title: 'A Day to Remember',
          date: '14 Tháng 05, 2026',
          tags: ['#dulich', '#kyniem', '#hoanghon'],
          paperTone: 'ivory',
          layout: 'layout-1',
          titleFont: 'var(--font-hand)',
          note: 'Buổi chiều hoàng hôn bên biển, gió mát dịu và bầu trời chuyển hồng như một bức tranh màu nước.',
          noteStyle: { font: 'var(--font-body)', size: 13, color: '#594638', align: 'center' },
          photos: [
            makePhotoSlot(art('sunset'), 'Chiều nắng vàng trên cát ấm', 'polaroid', -1.5),
          ],
          decors: [
            makeSticker('dried-lavender', 8, 66, 0.9, -12),
            makeSticker('washi-pink', 64, 14, 0.95, 14),
            makeSticker('postage-stamp', 76, 72, 0.85, 8),
          ],
        },
        {
          id: 'p_om_2',
          title: 'Morning Coffee & Rain',
          date: '22 Tháng 06, 2026',
          tags: ['#cafe', '#binhyen', '#kyniem'],
          paperTone: 'cream',
          layout: 'layout-2',
          titleFont: 'var(--font-hand)',
          note: 'Ngoài trời mưa lất phất, trong quán nhỏ vang tiếng nhạc dịu nhẹ. Hai tách cà phê ấm cho buổi sáng chậm rãi.',
          noteStyle: { font: 'var(--font-body)', size: 13, color: '#594638', align: 'left' },
          photos: [
            makePhotoSlot(art('coffee'), 'Góc quen bên cửa sổ', 'polaroid', -2.5),
            makePhotoSlot(art('flowers'), 'Bình hoa nhỏ trên bàn gỗ', 'polaroid', 2.2),
          ],
          decors: [
            makeSticker('eucalyptus-leaf', 79, 8, 0.85, 20),
            makeSticker('vintage-heart', 46, 62, 0.78, -6),
          ],
        },
        {
          id: 'p_om_3',
          title: 'Autumn Walk',
          date: '19 Tháng 09, 2026',
          tags: ['#dulich', '#thiennhien', '#muathu'],
          paperTone: 'ivory',
          layout: 'layout-3',
          titleFont: 'var(--font-display)',
          note: '',
          noteStyle: { font: 'var(--font-body)', size: 13, color: '#594638', align: 'left' },
          photos: [
            makePhotoSlot(art('autumn'), 'Con đường lá vàng rơi', 'vintage', 0),
            makePhotoSlot(art('meadow'), 'Đồi cỏ xanh sau cơn mưa', 'taped', 1.8),
            makePhotoSlot(art('mountain'), 'Đỉnh núi mờ sương sớm', 'minimal', -1.5),
          ],
          decors: [
            makeSticker('warm-sun', 76, 6, 0.85, 0),
            makeSticker('date-label', 12, 79, 0.9, -4),
          ],
        },
        {
          id: 'p_om_4',
          title: 'Little Polaroid Collage',
          date: '03 Tháng 10, 2026',
          tags: ['#banbe', '#kyniem', '#thanhxuan'],
          paperTone: 'blush',
          layout: 'layout-4',
          titleFont: 'var(--font-hand)',
          note: '',
          noteStyle: { font: 'var(--font-body)', size: 13, color: '#594638', align: 'left' },
          photos: [
            makePhotoSlot(art('friends'), 'Nụ cười ngày gặp lại', 'taped', -2),
            makePhotoSlot(art('celebration'), 'Chiếc bánh nhỏ xinh', 'polaroid', 2),
            makePhotoSlot(art('coffee'), 'Chiều thứ bảy bình yên', 'collage', 1.2),
            makePhotoSlot(art('flowers'), 'Hương hoa tháng mười', 'vintage', -1.8),
          ],
          decors: [
            makeSticker('doodle-sparkles', 43, 44, 0.95, 6),
            makeSticker('cinema-ticket', 65, 80, 0.85, -7),
          ],
        },
        {
          id: 'p_om_5',
          title: 'Letters From The Hill',
          date: '15 Tháng 10, 2025',
          tags: ['#dulich', '#thiennhien', '#nhatky'],
          paperTone: 'sage',
          layout: 'layout-5',
          titleFont: 'var(--font-script)',
          note: '“Có những ngày ta chỉ muốn cất giữ lại từng tia nắng xuyên qua kẽ lá.\n\nCảm ơn vì đã đồng hành cùng nhau qua thật nhiều mùa hoa nở, để mỗi trang giấy mở ra đều thấy lòng dịu lại.”',
          noteStyle: { font: 'var(--font-body)', size: 13.5, color: '#594638', align: 'left' },
          photos: [
            makePhotoSlot(art('meadow'), 'Nắng trên triền đồi', 'vintage', -1),
          ],
          decors: [
            makeSticker('dried-daisy', 75, 70, 0.95, 12),
            makeSticker('washi-sage', 52, 16, 0.9, -4),
          ],
        },
        {
          id: 'p_om_6',
          title: 'Analog Film Rolls',
          date: '28 Tháng 10, 2026',
          tags: ['#kyniem', '#film', '#dulich'],
          paperTone: 'cream',
          layout: 'layout-6',
          titleFont: 'var(--font-display)',
          note: 'Cuộn phim 35mm ghi lại ba khoảnh khắc ngẫu nhiên nhưng lại khiến mình mỉm cười nhất tháng.',
          noteStyle: { font: 'var(--font-body)', size: 13, color: '#594638', align: 'center' },
          photos: [
            makePhotoSlot(art('sunset'), 'FRAME 01', 'film', -2),
            makePhotoSlot(art('autumn'), 'FRAME 02', 'film', 1.5),
            makePhotoSlot(art('mountain'), 'FRAME 03', 'film', -1.2),
          ],
          decors: [
            makeSticker('gold-star', 8, 72, 0.85, -10),
            makeSticker('soft-cloud', 72, 68, 0.9, 4),
          ],
        },
        {
          id: 'p_om_7',
          title: 'Pages of Gratitude',
          date: '04 Tháng 11, 2026',
          tags: ['#giađinh', '#nhatky', '#binhyen'],
          paperTone: 'ivory',
          layout: 'layout-7',
          titleFont: 'var(--font-hand)',
          note: 'Hôm nay trời se lạnh đầu mùa.\nMình ngồi viết lại vài dòng nhật ký cho năm sau đọc lại.\n\n1. Uống trà hoa cúc mỗi sáng.\n2. Chụp thật nhiều ảnh bầu trời.\n3. Giữ tâm hồn luôn nhẹ nhàng và biết ơn.',
          noteStyle: { font: 'var(--font-hand)', size: 17, color: '#594638', align: 'left' },
          photos: [
            makePhotoSlot(art('flowers'), 'Hoa khô kẹp trang sách', 'taped', 3),
          ],
          decors: [
            makeSticker('eucalyptus-leaf', 8, 68, 0.95, -14),
            makeFreeNote('Always keep smiling ✨', 14, 52, -3, '#F9E6E2'),
          ],
        },
        {
          id: 'p_om_8',
          title: 'Golden Horizon',
          date: '10 Tháng 11, 2026',
          tags: ['#dulich', '#kyniem', '#thiennhien'],
          paperTone: 'ivory',
          layout: 'layout-8',
          titleFont: 'var(--font-display)',
          note: '“Mỗi bức ảnh là một kỷ niệm, mỗi trang giấy là một câu chuyện.”',
          noteStyle: { font: 'var(--font-body)', size: 13.5, color: '#594638', align: 'center' },
          photos: [
            makePhotoSlot(art('mountain'), '', 'minimal', 0),
          ],
          decors: [
            makeSticker('postage-stamp', 74, 14, 0.9, 6),
          ],
        },
      ],
    };

    const travelDiary = {
      id: 'album_travel_diary',
      title: 'Travel Diary',
      owner: 'Minh Anh',
      startDate: '2026-03-04',
      endDate: '2026-04-12',
      description: 'Nhật ký những chuyến đi xa, con dốc mờ sương và tấm vé tàu giữ lại làm kỷ niệm.',
      coverTheme: 'sage',
      coverPhoto: art('mountain'),
      coverOrnament: 'eucalyptus-leaf',
      privacy: 'public',
      createdAt: now - 86400000 * 25,
      updatedAt: now - 86400000 * 4,
      pages: [
        {
          id: 'p_td_1',
          title: 'Misty Morning Trail',
          date: '05 Tháng 03, 2026',
          tags: ['#dulich', '#chuyendi', '#sanmay'],
          paperTone: 'sage',
          layout: 'layout-1',
          titleFont: 'var(--font-hand)',
          note: 'Sương sớm phủ kín triền núi, không khí trong lành đến lạ.',
          noteStyle: { font: 'var(--font-body)', size: 13, color: '#594638', align: 'center' },
          photos: [makePhotoSlot(art('mountain'), 'Săn mây lúc 6 giờ sáng', 'vintage', 0)],
          decors: [makeSticker('soft-cloud', 72, 16, 0.95, 0), makeSticker('cinema-ticket', 10, 74, 0.85, -8)],
        },
        {
          id: 'p_td_2',
          title: 'Roadside Blooms',
          date: '07 Tháng 03, 2026',
          tags: ['#dulich', '#chuyendi', '#thiennhien'],
          paperTone: 'ivory',
          layout: 'layout-5',
          titleFont: 'var(--font-hand)',
          note: 'Dừng chân ở một quán nhỏ ven đường, ngắm đồi cỏ xanh mướt trải dài.',
          noteStyle: { font: 'var(--font-body)', size: 13, color: '#594638', align: 'left' },
          photos: [makePhotoSlot(art('meadow'), 'Đồi cỏ xanh', 'polaroid', -2)],
          decors: [makeSticker('dried-daisy', 74, 70, 0.9, 12)],
        },
      ],
    };

    const littleMoments = {
      id: 'album_little_moments',
      title: 'My Little Moments',
      owner: 'Minh Anh',
      startDate: '2026-01-10',
      endDate: '2026-08-20',
      description: 'Những niềm vui nhỏ bé mỗi ngày: tách trà sáng, bình hoa tươi và trang sách dở.',
      coverTheme: 'cream',
      coverPhoto: art('coffee'),
      coverOrnament: 'dried-daisy',
      privacy: 'private',
      passwordHash: PTB.Storage.hashPassword('1234'),
      createdAt: now - 86400000 * 40,
      updatedAt: now - 86400000 * 9,
      pages: [
        {
          id: 'p_lm_1',
          title: 'Slow Sunday',
          date: '18 Tháng 01, 2026',
          tags: ['#cafe', '#binhyen', '#cuoituan'],
          paperTone: 'cream',
          layout: 'layout-2',
          titleFont: 'var(--font-hand)',
          note: 'Không vội vã, chỉ có ánh nắng sớm và mùi cà phê thơm dịu.',
          noteStyle: { font: 'var(--font-body)', size: 13, color: '#594638', align: 'center' },
          photos: [
            makePhotoSlot(art('coffee'), 'Warm latte', 'taped', -1.8),
            makePhotoSlot(art('flowers'), 'Fresh daisies', 'polaroid', 2.2),
          ],
          decors: [makeSticker('warm-sun', 76, 12, 0.85, 0)],
        },
        {
          id: 'p_lm_2',
          title: 'Quiet Thoughts',
          date: '25 Tháng 02, 2026',
          tags: ['#giađinh', '#nhatky', '#binhyen'],
          paperTone: 'ivory',
          layout: 'layout-7',
          titleFont: 'var(--font-script)',
          note: 'Hạnh phúc đôi khi chỉ là có một nơi thật ấm áp để cất giữ những điều bình dị nhất.',
          noteStyle: { font: 'var(--font-hand)', size: 17, color: '#594638', align: 'left' },
          photos: [makePhotoSlot(art('sunset'), 'Ánh chiều qua rèm cửa', 'minimal', 2)],
          decors: [makeSticker('vintage-heart', 12, 65, 0.85, -8)],
        },
      ],
    };

    const friendsForever = {
      id: 'album_friends_forever',
      title: 'Friends Forever',
      owner: 'Minh Anh & Friends',
      startDate: '2024-09-01',
      endDate: '2026-07-15',
      description: 'Thanh xuân rực rỡ cùng hội bạn thân, những buổi picnic và tiếng cười giòn tan.',
      coverTheme: 'pink',
      coverPhoto: art('friends'),
      coverOrnament: 'vintage-heart',
      privacy: 'public',
      createdAt: now - 86400000 * 60,
      updatedAt: now - 86400000 * 14,
      pages: [
        {
          id: 'p_ff_1',
          title: 'Best Squad',
          date: '15 Tháng 07, 2026',
          tags: ['#banbe', '#thanhxuan', '#kyniem'],
          paperTone: 'blush',
          layout: 'layout-1',
          titleFont: 'var(--font-hand)',
          note: 'Cảm ơn vì đã luôn ở bên nhau qua mọi cột mốc tuổi trẻ!',
          noteStyle: { font: 'var(--font-body)', size: 13, color: '#594638', align: 'center' },
          photos: [makePhotoSlot(art('friends'), 'Tụi mình của năm 2026', 'polaroid', -1.5)],
          decors: [makeSticker('gold-star', 10, 22, 0.85, -10), makeSticker('vintage-heart', 78, 72, 0.9, 8)],
        },
        {
          id: 'p_ff_2',
          title: 'Picnic Afternoon',
          date: '16 Tháng 09, 2024',
          tags: ['#banbe', '#picnic', '#thanhxuan'],
          paperTone: 'ivory',
          layout: 'layout-3',
          titleFont: 'var(--font-hand)',
          note: '',
          noteStyle: { font: 'var(--font-body)', size: 13, color: '#594638', align: 'left' },
          photos: [
            makePhotoSlot(art('meadow'), 'Bãi cỏ ngày hè', 'taped', 0),
            makePhotoSlot(art('celebration'), 'Bánh kem tự làm', 'polaroid', 2),
            makePhotoSlot(art('sunset'), 'Chiều muộn vẫn chưa muốn về', 'film', -2),
          ],
          decors: [makeSticker('washi-pink', 48, 12, 0.9, 6)],
        },
      ],
    };

    const specialDays = {
      id: 'album_special_days',
      title: 'Special Days',
      owner: 'Minh Anh',
      startDate: '2025-12-24',
      endDate: '2026-10-20',
      description: 'Sinh nhật, ngày lễ ấm áp và những cái ôm đáng nhớ dưới ánh nến lung linh.',
      coverTheme: 'espresso',
      coverPhoto: art('celebration'),
      coverOrnament: 'gold-star',
      privacy: 'private',
      passwordHash: PTB.Storage.hashPassword('1234'),
      createdAt: now - 86400000 * 75,
      updatedAt: now - 86400000 * 18,
      pages: [
        {
          id: 'p_sd_1',
          title: 'Make a Wish',
          date: '20 Tháng 10, 2026',
          tags: ['#giađinh', '#sinhnhat', '#kyniem'],
          paperTone: 'cream',
          layout: 'layout-1',
          titleFont: 'var(--font-display)',
          note: 'Ánh nến ấm áp, lời chúc chân thành và một năm mới thật dịu dàng.',
          noteStyle: { font: 'var(--font-body)', size: 13, color: '#594638', align: 'center' },
          photos: [makePhotoSlot(art('celebration'), 'Happy Moments ✨', 'vintage', 0)],
          decors: [makeSticker('doodle-sparkles', 12, 20, 1, -8), makeSticker('date-label', 66, 78, 0.9, 4)],
        },
        {
          id: 'p_sd_2',
          title: 'Bouquet of Wishes',
          date: '21 Tháng 10, 2026',
          tags: ['#giađinh', '#sinhnhat', '#kyniem'],
          paperTone: 'ivory',
          layout: 'layout-5',
          titleFont: 'var(--font-hand)',
          note: 'Gói hoa khô vẫn thơm thoảng trên bàn làm việc như nhắc nhớ về ngày đặc biệt ấy.',
          noteStyle: { font: 'var(--font-body)', size: 13, color: '#594638', align: 'left' },
          photos: [makePhotoSlot(art('flowers'), 'Bó hoa cúc trắng', 'polaroid', -2)],
          decors: [makeSticker('dried-lavender', 74, 64, 0.95, 10)],
        },
      ],
    };

    return [ourMemories, travelDiary, littleMoments, friendsForever, specialDays];
  }

  PTB.Seed = {
    createSeedAlbums,
    makePhotoSlot,
    makeSticker,
    makeFreeNote,
    makeFreePhoto,
    makeFreeText,
  };
})(window);
