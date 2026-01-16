let currentLang = 'ko';
let data = null;

const translations = {
    ko: {
        'nav.home': '홈',
        'nav.news': '소식',
        'home.title': 'PIXEL ACHE STUDIO',
        'readMore': '자세히 보기',
        'loading': '로딩 중',
        'error': '데이터를 불러올 수 없습니다.',
        'empty': '아직 소식이 없습니다.',
        'email': '이메일'
    },
    en: {
        'nav.home': 'Home',
        'nav.news': 'News',
        'home.title': 'PIXEL ACHE STUDIO',
        'readMore': 'Read More',
        'loading': 'Loading',
        'error': 'Failed to load data.',
        'empty': 'No news yet.',
        'email': 'Email'
    },
    ja: {
        'nav.home': 'ホーム',
        'nav.news': 'ニュース',
        'home.title': 'PIXEL ACHE STUDIO',
        'readMore': '詳しく見る',
        'loading': '読み込み中',
        'error': 'データを読み込めませんでした。',
        'empty': 'まだニュースがありません。',
        'email': 'メール'
    }
};

document.addEventListener('DOMContentLoaded', () => {
    let savedLang = localStorage.getItem('language');
    if (!savedLang) {
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('ja')) {
            savedLang = 'ja';
        } else if (browserLang.startsWith('en')) {
            savedLang = 'en';
        } else {
            savedLang = 'ko';
        }
        localStorage.setItem('language', savedLang);
    }
    currentLang = savedLang;
    document.getElementById('languageSelector').value = savedLang;

    loadSettings();

    loadData();

    document.getElementById('languageSelector').addEventListener('change', (e) => {
        currentLang = e.target.value;
        localStorage.setItem('language', currentLang);
        updateLanguage();
        renderContent();
    });

    setupSmoothScroll();
});

function setupSmoothScroll() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');

            if (href && href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');

                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    window.addEventListener('scroll', () => {
        const sections = ['home', 'news'];
        const scrollPosition = window.scrollY + 100;

        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                const sectionTop = section.offsetTop;
                const sectionBottom = sectionTop + section.offsetHeight;

                if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${sectionId}`) {
                            link.classList.add('active');
                        }
                    });
                }
            }
        });
    });
}

function loadSettings() {
    const savedSettings = localStorage.getItem('siteSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        applySettings(settings);
    }
}

function applySettings(settings) {
    if (settings.font) {
        document.documentElement.style.setProperty('--font-family', `'${settings.font}', monospace`);
    }
    if (settings.colors) {
        document.documentElement.style.setProperty('--primary', settings.colors.primary);
        document.documentElement.style.setProperty('--secondary', settings.colors.secondary);
        document.documentElement.style.setProperty('--background', settings.colors.background);
    }
}

async function loadData() {
    try {
        const response = await fetch('./data/portfolio.json');
        if (!response.ok) {
            throw new Error(`Failed to load portfolio data: ${response.status}`);
        }
        data = await response.json();
        renderContent();
    } catch (error) {
        console.error('Error loading portfolio data:', error);
        document.querySelector('#portfolioGrid').innerHTML = `
            <div style="color: var(--primary); padding: 2rem; text-align: center;">
                <p>Failed to load portfolio data. Please check console for details.</p>
            </div>
        `;
    }
}

function updateLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            element.textContent = translations[currentLang][key];
        }
    });

    if (data && data.settings && data.settings.meta) {
        const meta = data.settings.meta[currentLang];
        if (meta) {
            document.title = meta.title;
            document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description);
        }
    }
}

function renderContent() {
    if (!data) return;

    renderSocialLinks();

    renderFooterEmail();

    renderHomePage();

    updateLanguage();
}

function renderSocialLinks() {
    const container = document.getElementById('socialLinks');
    if (!container || !data.settings || !data.settings.socialLinks) return;

    const iconMap = {
        'twitter': 'fab fa-x-twitter',
        'bluesky': 'fas fa-cloud',
        'instagram': 'fab fa-instagram',
        'youtube': 'fab fa-youtube'
    };

    container.innerHTML = data.settings.socialLinks
        .map(link => {
            const iconClass = iconMap[link.platform] || 'fas fa-link';
            return `
                <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="social-link" title="${link.platform}">
                    <i class="${iconClass}"></i>
                </a>
            `;
        })
        .join('');
}

function renderFooterEmail() {
    const emailElement = document.getElementById('footerEmail');
    if (!emailElement || !data.settings) return;

    const emailLabel = translations[currentLang]['email'] || 'Email';
    emailElement.innerHTML = `${emailLabel}: <a href="mailto:${data.settings.email}">${data.settings.email}</a>`;
}

function renderHomePage() {
    const featuredContainer = document.getElementById('featuredPortfolio');
    const portfolioGrid = document.getElementById('portfolioGrid');

    if (!featuredContainer || !portfolioGrid) return;

    const featuredPortfolio = data.portfolio.find(item => item.featured);
    const regularPortfolio = data.portfolio.filter(item => !item.featured);

    if (featuredPortfolio) {
        featuredContainer.innerHTML = renderFeaturedPortfolio(featuredPortfolio);
    } else {
        featuredContainer.style.display = 'none';
    }

    if (regularPortfolio.length > 0) {
        portfolioGrid.innerHTML = regularPortfolio
            .map(item => renderPortfolioCard(item))
            .join('');
    } else {
        portfolioGrid.innerHTML = `<div class="empty">${translations[currentLang]['empty']}</div>`;
    }
}


function renderFeaturedPortfolio(item) {
    const content = item.content[currentLang];
    if (!content) return '';

    const tags = content.tags?.map(tag => `<span class="tag">${tag}</span>`).join('') || '';
    const imageHtml = item.imageUrl ? `<img src="${item.imageUrl}" alt="${content.title}" class="featured-image" onerror="this.style.display='none'">` : '';

    const youtubeHtml = item.youtubeUrl ? `
        <div class="featured-youtube">
            <div class="youtube-embed">
                <iframe src="${getYouTubeEmbedUrl(item.youtubeUrl)}" allowfullscreen></iframe>
            </div>
        </div>
    ` : '';

    let linkHtml = '';
    if (item.link) {
        const linkType = item.linkType || 'auto';

        if (linkType === 'button') {
            linkHtml = `<a href="${item.link}" target="_blank" class="featured-link">${translations[currentLang]['readMore']}</a>`;
        } else if (linkType === 'iframe') {
            linkHtml = `
                <div class="link-embed">
                    <iframe src="${item.link}" frameborder="0" width="100%" height="400" sandbox="allow-scripts allow-same-origin"></iframe>
                </div>
            `;
        } else {
            const steamAppId = getSteamAppId(item.link);
            if (steamAppId) {
                linkHtml = `
                    <div class="steam-widget">
                        <iframe src="https://store.steampowered.com/widget/${steamAppId}/" frameborder="0" width="100%" height="190"></iframe>
                    </div>
                `;
            } else {
                linkHtml = `<a href="${item.link}" target="_blank" class="featured-link">${translations[currentLang]['readMore']}</a>`;
            }
        }
    }

    updateMetaTags(item);

    return `
        <div class="featured-card">
            ${imageHtml}
            <h1 class="featured-title">${content.title}</h1>
            <p class="featured-description">${content.description}</p>
            <div class="featured-tags">${tags}</div>
            ${youtubeHtml}
            ${linkHtml}
        </div>
    `;
}

function getSteamAppId(url) {
    if (!url) return null;
    const match = url.match(/store\.steampowered\.com\/app\/(\d+)/);
    return match ? match[1] : null;
}

function renderPortfolioCard(item) {
    const content = item.content[currentLang];
    if (!content) return '';

    const tags = content.tags?.map(tag => `<span class="portfolio-tag">${tag}</span>`).join('') || '';
    const imageHtml = item.imageUrl ? `<img src="${item.imageUrl}" alt="${content.title}" class="portfolio-image" onerror="this.style.display='none'">` : '';

    const youtubeHtml = item.youtubeUrl ? `<a href="${item.youtubeUrl}" target="_blank" class="portfolio-link"><i class="fab fa-youtube"></i> YouTube</a>` : '';

    let linkHtml = '';
    const steamAppId = item.link ? getSteamAppId(item.link) : null;

    if (item.link) {
        const linkType = item.linkType || 'auto';

        if (linkType === 'button') {
            linkHtml = `<a href="${item.link}" target="_blank" class="portfolio-link"><i class="fas fa-external-link-alt"></i> ${translations[currentLang]['readMore']}</a>`;
        } else if (linkType === 'iframe') {
            linkHtml = `
                <div class="link-embed-small">
                    <iframe src="${item.link}" frameborder="0" width="100%" height="300" sandbox="allow-scripts allow-same-origin"></iframe>
                </div>
            `;
        } else {
            if (steamAppId) {
                linkHtml = `
                    <div class="steam-widget-small">
                        <iframe src="https://store.steampowered.com/widget/${steamAppId}/" frameborder="0" width="100%" height="190"></iframe>
                    </div>
                `;
            } else {
                linkHtml = `<a href="${item.link}" target="_blank" class="portfolio-link"><i class="fas fa-external-link-alt"></i> ${translations[currentLang]['readMore']}</a>`;
            }
        }
    }

    return `
        <div class="portfolio-card">
            <div class="portfolio-card-top">
                ${imageHtml}
                <div class="portfolio-content">
                    <h2 class="portfolio-title">${content.title}</h2>
                    <p class="portfolio-description">${content.description}</p>
                    <div class="portfolio-tags">${tags}</div>
                    <div class="portfolio-links">
                        ${youtubeHtml}
                        ${!steamAppId && item.link ? '' : ''}
                    </div>
                </div>
            </div>
            ${linkHtml}
        </div>
    `;
}

function getYouTubeEmbedUrl(url) {
    if (!url) return '';

    let videoId = '';

    if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('youtube.com/embed/')) {
        return url;
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
}

function showError() {
    const container = document.getElementById('featuredNews');
    if (container) {
        container.innerHTML = `<div class="error">${translations[currentLang]['error']}</div>`;
    }
}

function updateMetaTags(item) {
    if (!item || !item.socialCard) return;

    const updateMeta = (property, content) => {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('property', property);
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
    };

    const updateMetaName = (name, content) => {
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', name);
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
    };

    const toAbsoluteUrl = (url) => {
        if (!url) return url;
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        const baseUrl = window.location.origin.includes('localhost')
            ? 'https://pixelachestudio.github.io'
            : window.location.origin;
        return `${baseUrl}/${url.replace(/^\.\//, '')}`;
    };

    const imageUrl = toAbsoluteUrl(item.socialCard.image);
    const pageUrl = window.location.href;

    updateMeta('og:type', 'article');
    updateMeta('og:site_name', 'Pixel Ache Studio');
    updateMeta('og:title', item.socialCard.title);
    updateMeta('og:description', item.socialCard.description);
    updateMeta('og:image', imageUrl);
    updateMeta('og:image:width', '1200');
    updateMeta('og:image:height', '630');
    updateMeta('og:url', pageUrl);

    updateMetaName('twitter:card', 'summary_large_image');
    updateMetaName('twitter:site', '@PixelAcheStudio');
    updateMetaName('twitter:title', item.socialCard.title);
    updateMetaName('twitter:description', item.socialCard.description);
    updateMetaName('twitter:image', imageUrl);

    document.title = `${item.socialCard.title} - Pixel Ache Studio`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
        metaDescription.setAttribute('content', item.socialCard.description);
    }
}
