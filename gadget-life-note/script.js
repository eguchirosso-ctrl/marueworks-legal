(() => {
  // ストアURLの設定箇所はここだけです。
  const APP_STORE_URL = 'https://apps.apple.com/jp/app/%E3%83%87%E3%82%B8%E3%82%82%E3%81%AE%E6%89%8B%E5%B8%B3/id6802090072';
  // Google Play公開後、正式URLを入れるとGoogle Playボタンが有効になります（空のあいだは「審査中」表示）。
  // 例: 'https://play.google.com/store/apps/details?id=com.marueworks.gadgetlifenote'
  const GOOGLE_PLAY_URL = '';

  const params = new URLSearchParams(location.search);

  // X広告などの計測用に UTM パラメータを保持する。
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const utm = {};
  UTM_KEYS.forEach((key) => {
    const value = params.get(key);
    if (value) utm[key] = value.slice(0, 100);
  });
  if (Object.keys(utm).length) {
    try {
      localStorage.setItem('gadgetLifeNoteUtm', JSON.stringify({
        ...utm,
        landing_path: location.pathname,
        saved_at: new Date().toISOString()
      }));
    } catch (_) {}
  }

  // X広告とLPのメッセージを合わせるための見出しバリエーション（utm_content）。
  // 文言は固定のものだけを使い、URLの値をそのまま画面に出すことはしない。
  const VARIANTS = {
    warranty: {
      title: '<span>保証期限、</span><span>「いつまで？」を</span><br><em><span>すぐ確認。</span></em>',
      lead: '購入日・保証期限・レシートを、デジものごとにひとまとめ。期限が近づいたら通知でお知らせ（設定でオン）。あとから探さないための記録アプリです。'
    },
    repair: {
      title: '<span>修理した日も、</span><span>費用も。</span><br><em><span>あとから迷わない。</span></em>',
      lead: '修理・バッテリー交換・メンテナンスを、1台ごとの履歴として記録。購入日や保証期限、レシートもまとめて残せます。'
    },
    organize: {
      title: '<span>増えたデジものを、</span><br><em><span>すっきり一覧化。</span></em>',
      lead: 'スマホ、パソコン、イヤホン、カメラ、ゲーム機。写真付きでまとめて、検索・並べ替えで必要なときにすぐ見つけられます。'
    }
  };
  const content = (params.get('utm_content') || '').toLowerCase();
  const variant = Object.prototype.hasOwnProperty.call(VARIANTS, content) ? VARIANTS[content] : null;
  const heroTitle = document.getElementById('hero-title');
  const heroLead = document.getElementById('hero-lead');
  if (variant && heroTitle && heroLead) {
    heroTitle.innerHTML = variant.title;
    heroLead.textContent = variant.lead;
    document.documentElement.dataset.variant = content;
  }

  // Google Play には UTM を install referrer として引き継ぐ。
  const googlePlayHref = () => {
    if (!GOOGLE_PLAY_URL) return '';
    const referrer = new URLSearchParams(utm).toString();
    if (!referrer) return GOOGLE_PLAY_URL;
    const url = new URL(GOOGLE_PLAY_URL);
    url.searchParams.set('referrer', referrer);
    return url.toString();
  };

  const isAndroid = /Android/i.test(navigator.userAgent);
  const playHref = googlePlayHref();

  if (playHref) {
    document.querySelectorAll('[data-google-play]').forEach((link) => {
      link.href = playHref;
      link.classList.remove('is-disabled');
      link.removeAttribute('aria-disabled');
      link.textContent = 'Google Playで見る';
      link.target = '_blank';
      link.rel = 'noopener';
    });
    document.querySelectorAll('[data-google-status]').forEach((el) => {
      el.textContent = 'Android版 Google Play 配信中';
    });
    document.querySelectorAll('[data-google-dot]').forEach((el) => el.classList.remove('pending'));
    document.querySelectorAll('[data-faq-android]').forEach((el) => {
      el.textContent = 'あります。Google Play からダウンロードできます。';
    });
  }

  // 主CTA：Android かつ Google Play 公開済みなら Google Play、それ以外は App Store。
  const useGooglePlay = isAndroid && Boolean(playHref);
  document.querySelectorAll('[data-store="smart"]').forEach((link) => {
    link.href = useGooglePlay ? playHref : APP_STORE_URL;
  });
  document.querySelectorAll('[data-app-store]').forEach((link) => {
    link.href = APP_STORE_URL;
  });
  document.querySelectorAll('[data-store-label]').forEach((el) => {
    el.textContent = useGooglePlay ? 'Google Play（Android）' : 'App Store（iPhone）';
  });

  // CTAクリックを端末内に記録（直近20件）。
  document.querySelectorAll('[data-store="smart"], .store-link').forEach((link) => {
    link.addEventListener('click', () => {
      if (!link.href) return;
      try {
        const history = JSON.parse(localStorage.getItem('gadgetLifeNoteCtaClicks') || '[]');
        history.push({ href: link.href, at: new Date().toISOString(), utm });
        localStorage.setItem('gadgetLifeNoteCtaClicks', JSON.stringify(history.slice(-20)));
      } catch (_) {}
    });
  });

  const revealTargets = document.querySelectorAll('.pain-card,.feature-grid li,.story-row,.reassurance-card,.price-card,.faq-list details');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reduceMotion) {
    revealTargets.forEach((el) => el.classList.add('reveal'));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealTargets.forEach((el) => observer.observe(el));
  }

  // スマホではファーストビューを過ぎたら下部にCTAバーを表示する。
  const mobileInstall = document.getElementById('mobile-install');
  const hero = document.querySelector('.hero');
  const mobileQuery = matchMedia('(max-width: 640px)');
  if (mobileInstall && hero && 'IntersectionObserver' in window) {
    const barLink = mobileInstall.querySelector('a');
    let heroVisible = true;
    const update = () => {
      const show = mobileQuery.matches && !heroVisible;
      mobileInstall.classList.toggle('is-visible', show);
      mobileInstall.setAttribute('aria-hidden', String(!show));
      if (barLink) barLink.tabIndex = show ? 0 : -1;
      document.body.classList.toggle('has-mobile-install', show);
    };
    new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      update();
    }, { threshold: 0.2 }).observe(hero);
    if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', update);
  }
})();
