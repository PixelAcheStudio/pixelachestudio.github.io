const ADMIN_PASSWORD_HASH = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';

const STORAGE_KEYS = {
    ADMIN_SESSION: 'portfolio_admin_session'
};

const SNS_ICONS = [
    { name: 'Twitter / X', icon: 'fab fa-x-twitter', color: '#000000' },
    { name: 'Instagram', icon: 'fab fa-instagram', color: '#E4405F' },
    { name: 'Facebook', icon: 'fab fa-facebook', color: '#1877F2' },
    { name: 'YouTube', icon: 'fab fa-youtube', color: '#FF0000' },
    { name: 'GitHub', icon: 'fab fa-github', color: '#181717' },
    { name: 'LinkedIn', icon: 'fab fa-linkedin', color: '#0A66C2' },
    { name: 'Discord', icon: 'fab fa-discord', color: '#5865F2' },
    { name: 'Twitch', icon: 'fab fa-twitch', color: '#9146FF' },
    { name: 'TikTok', icon: 'fab fa-tiktok', color: '#000000' },
    { name: 'Reddit', icon: 'fab fa-reddit', color: '#FF4500' },
    { name: 'Telegram', icon: 'fab fa-telegram', color: '#26A5E4' },
    { name: 'WhatsApp', icon: 'fab fa-whatsapp', color: '#25D366' },
    { name: 'Bluesky', icon: 'fas fa-cloud', color: '#0085FF' },
    { name: 'Steam', icon: 'fab fa-steam', color: '#000000' },
    { name: 'Itch.io', icon: 'fab fa-itch-io', color: '#FA5C5C' },
    { name: 'Unity', icon: 'fab fa-unity', color: '#000000' },
    { name: '이메일', icon: 'fas fa-envelope', color: '#EA4335' },
    { name: '블로그', icon: 'fas fa-blog', color: '#21759B' },
    { name: '웹사이트', icon: 'fas fa-globe', color: '#4285F4' },
    { name: '링크', icon: 'fas fa-link', color: '#666666' }
];

const AdminPanel = (function() {
    let portfolioData = null;
    let currentIconSelectCallback = null;
    let draggedElement = null;
    let draggedIndex = null;
    let openProjects = new Set();

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.toggle('hidden', !show);
        }
    }

    function showError(title, message) {
        alert(`${title}\n\n${message || ''}`);
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async function hashPassword(password) {
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function checkSession() {
        const session = sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION);
        return session === 'authenticated';
    }

    function setSession() {
        sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, 'authenticated');
    }

    function clearSession() {
        sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
    }

    async function handleLogin(event) {
        event.preventDefault();

        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('login-error');

        try {
            const hash = await hashPassword(password);

            if (hash === ADMIN_PASSWORD_HASH) {
                setSession();
                showDashboard();
                await loadData();
                errorElement.classList.add('hidden');
            } else {
                errorElement.textContent = '비밀번호가 올바르지 않습니다.';
                errorElement.classList.remove('hidden');
            }
        } catch (error) {
            errorElement.textContent = '로그인 중 오류가 발생했습니다.';
            errorElement.classList.remove('hidden');
            console.error('Login error:', error);
        }
    }

    function handleLogout() {
        if (confirm('로그아웃하시겠습니까? 저장하지 않은 변경사항은 손실됩니다.')) {
            clearSession();
            showLogin();
        }
    }

    function showLogin() {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('admin-dashboard').classList.add('hidden');
    }

    function showDashboard() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('admin-dashboard').classList.remove('hidden');
    }

    async function loadData() {
        showLoading(true);

        try {
            const response = await fetch('data/portfolio.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            portfolioData = await response.json();
            populateForm();
            updateJSONEditor();

        } catch (error) {
            console.error('Error loading data:', error);
            showError('데이터를 불러오는데 실패했습니다', error.message);
        } finally {
            showLoading(false);
        }
    }

    function populateForm() {
        if (!portfolioData) return;

        if (portfolioData.settings) {
            const settings = portfolioData.settings;

            renderCustomFonts();

            const fontInput = document.getElementById('settings-font');
            if (fontInput) {
                fontInput.value = settings.font || 'Galmuri9';
            }

            if (settings.colors) {
                setColorInputs('primary', settings.colors.primary || '#00FF00');
                setColorInputs('secondary', settings.colors.secondary || '#00FFFF');
                setColorInputs('background', settings.colors.background || '#0A0A0F');
                setColorInputs('text', settings.colors.text || '#FFFFFF');
                setColorInputs('accent', settings.colors.accent || '#B100FF');
            }

            const emailInput = document.getElementById('settings-email');
            if (emailInput) {
                emailInput.value = settings.email || '';
            }

            const twitterInput = document.getElementById('settings-twitter');
            if (twitterInput) {
                twitterInput.value = settings.twitterHandle || '';
            }
        }

        renderSocialLinks();

        renderPortfolio();

        populateMeta();

        populateTranslations();

        updateJSONEditor();
    }

    function populateMeta() {
        if (!portfolioData.settings?.meta) return;

        const meta = portfolioData.settings.meta;

        const ogImageInput = document.getElementById('meta-og-image');
        if (ogImageInput) {
            ogImageInput.value = portfolioData.settings.ogImage || '';
        }

        populateMetaLanguageTabs(meta);
    }

    function populateMetaLanguageTabs(meta) {
        const tabsContainer = document.getElementById('meta-lang-tabs');
        const contentsContainer = document.getElementById('meta-lang-contents');
        if (!tabsContainer || !contentsContainer) return;

        tabsContainer.innerHTML = '';
        contentsContainer.innerHTML = '';

        const languages = Object.keys(meta);

        languages.forEach((lang, idx) => {
            const tabBtn = document.createElement('button');
            tabBtn.type = 'button';
            tabBtn.className = `lang-tab-btn${idx === 0 ? ' active' : ''}`;
            tabBtn.dataset.lang = lang;
            tabBtn.dataset.target = 'meta';
            tabBtn.innerHTML = `
                ${getLanguageDisplayName(lang)}
                <span class="tab-delete" data-lang="${lang}" title="삭제">&times;</span>
            `;
            tabBtn.onclick = (e) => {
                if (!e.target.classList.contains('tab-delete')) {
                    switchMetaLangTab(lang);
                }
            };
            tabsContainer.appendChild(tabBtn);

            const data = meta[lang] || {};

            const tabContent = document.createElement('div');
            tabContent.className = `lang-tab-content${idx === 0 ? ' active' : ''}`;
            tabContent.dataset.lang = lang;
            tabContent.dataset.target = 'meta';
            tabContent.innerHTML = `
                <div class="form-group">
                    <label for="meta-${lang}-title">사이트 제목</label>
                    <input type="text" id="meta-${lang}-title" class="form-input" placeholder="Pixel Ache Studio" value="${escapeHtml(data.title || '')}">
                </div>
                <div class="form-group">
                    <label for="meta-${lang}-description">사이트 설명</label>
                    <textarea id="meta-${lang}-description" class="form-textarea" rows="3" placeholder="${getDescriptionPlaceholder(lang)}">${escapeHtml(data.description || '')}</textarea>
                </div>
            `;
            contentsContainer.appendChild(tabContent);
        });

        document.querySelectorAll('#meta-lang-tabs .tab-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const lang = e.target.dataset.lang;
                if (confirm(`'${getLanguageDisplayName(lang)}' 언어를 삭제하시겠습니까?`)) {
                    removeLanguage(lang);
                }
            });
        });
    }

    function switchMetaLangTab(lang) {
        document.querySelectorAll('#meta-lang-tabs .lang-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });

        document.querySelectorAll('#meta-lang-contents .lang-tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.lang === lang);
        });
    }

    function getLanguageDisplayName(lang) {
        const names = {
            'ko': '한국어',
            'en': '영어',
            'ja': '日本語',
            'zh': '中文',
            'es': 'Español',
            'fr': 'Français',
            'de': 'Deutsch'
        };
        return names[lang] || lang.toUpperCase();
    }

    function getDescriptionPlaceholder(lang) {
        const placeholders = {
            'ko': '픽셀 아트 기반 인디 게임 개발 스튜디오',
            'en': 'Pixel art based indie game development studio',
            'ja': 'ピクセルアートベースのインディーゲーム開発スタジオ'
        };
        return placeholders[lang] || '';
    }

    function addLanguage(lang) {
        if (!portfolioData.settings.meta) {
            portfolioData.settings.meta = {};
        }
        if (!portfolioData.settings.meta[lang]) {
            portfolioData.settings.meta[lang] = { title: '', description: '' };
        }
        if (!portfolioData.settings.translations) {
            portfolioData.settings.translations = {};
        }
        if (!portfolioData.settings.translations[lang]) {
            portfolioData.settings.translations[lang] = {};
        }

        if (portfolioData.portfolio) {
            portfolioData.portfolio.forEach(item => {
                if (!item.content[lang]) {
                    item.content[lang] = { title: '', description: '', tags: [] };
                }
            });
        }

        populateMeta();
        populateTranslations();
        updateJSONEditor();
    }

    function removeLanguage(lang) {
        if (portfolioData.settings?.meta && portfolioData.settings.meta[lang]) {
            delete portfolioData.settings.meta[lang];
            populateMeta();
        }
        if (portfolioData.settings?.translations && portfolioData.settings.translations[lang]) {
            delete portfolioData.settings.translations[lang];
            populateTranslations();
        }
    }

    const TRANSLATION_KEYS = [
        { key: 'nav.home', label: '네비게이션 - 홈', placeholder: '홈' },
        { key: 'nav.news', label: '네비게이션 - 소식', placeholder: '소식' },
        { key: 'home.title', label: '메인 타이틀', placeholder: 'PIXEL ACHE STUDIO' },
        { key: 'readMore', label: '더 보기 버튼', placeholder: '자세히 보기' },
        { key: 'loading', label: '로딩 텍스트', placeholder: '로딩 중' },
        { key: 'error', label: '에러 메시지', placeholder: '데이터를 불러올 수 없습니다.' },
        { key: 'empty', label: '빈 목록 메시지', placeholder: '아직 소식이 없습니다.' },
        { key: 'email', label: '이메일 라벨', placeholder: '이메일' }
    ];

    function populateTranslations() {
        const tabsContainer = document.getElementById('translations-lang-tabs');
        const contentsContainer = document.getElementById('translations-lang-contents');
        if (!tabsContainer || !contentsContainer) return;

        tabsContainer.innerHTML = '';
        contentsContainer.innerHTML = '';

        if (!portfolioData.settings.translations) {
            portfolioData.settings.translations = {};
        }

        const languages = portfolioData.settings.meta ? Object.keys(portfolioData.settings.meta) : ['ko', 'en', 'ja'];

        languages.forEach((lang, idx) => {
            const tabBtn = document.createElement('button');
            tabBtn.type = 'button';
            tabBtn.className = `lang-tab-btn${idx === 0 ? ' active' : ''}`;
            tabBtn.dataset.lang = lang;
            tabBtn.dataset.target = 'translations';
            tabBtn.textContent = getLanguageDisplayName(lang);
            tabBtn.onclick = () => switchTranslationsLangTab(lang);
            tabsContainer.appendChild(tabBtn);

            if (!portfolioData.settings.translations[lang]) {
                portfolioData.settings.translations[lang] = {};
            }

            const trans = portfolioData.settings.translations[lang];

            const tabContent = document.createElement('div');
            tabContent.className = `lang-tab-content${idx === 0 ? ' active' : ''}`;
            tabContent.dataset.lang = lang;
            tabContent.dataset.target = 'translations';

            let fieldsHtml = '';
            TRANSLATION_KEYS.forEach(item => {
                fieldsHtml += `
                    <div class="form-group">
                        <label for="trans-${lang}-${item.key}">${item.label}</label>
                        <input type="text" id="trans-${lang}-${item.key}" class="form-input"
                               placeholder="${item.placeholder}"
                               value="${escapeHtml(trans[item.key] || '')}">
                    </div>
                `;
            });

            tabContent.innerHTML = fieldsHtml;
            contentsContainer.appendChild(tabContent);
        });
    }

    function switchTranslationsLangTab(lang) {
        document.querySelectorAll('#translations-lang-tabs .lang-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });

        document.querySelectorAll('#translations-lang-contents .lang-tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.lang === lang);
        });
    }

    function collectTranslations() {
        const translations = {};
        const languages = portfolioData.settings.meta ? Object.keys(portfolioData.settings.meta) : ['ko', 'en', 'ja'];

        languages.forEach(lang => {
            translations[lang] = {};
            TRANSLATION_KEYS.forEach(item => {
                const input = document.getElementById(`trans-${lang}-${item.key}`);
                if (input && input.value.trim()) {
                    translations[lang][item.key] = input.value.trim();
                }
            });
        });

        return translations;
    }

    function setColorInputs(type, color) {
        const colorPicker = document.getElementById(`color-${type}`);
        const colorText = document.getElementById(`color-${type}-text`);
        if (colorPicker) colorPicker.value = color;
        if (colorText) colorText.value = color;
    }

    function renderCustomFonts() {
        const container = document.getElementById('custom-fonts-list');

        if (!container) return;

        if (!portfolioData.settings.customFonts) {
            portfolioData.settings.customFonts = [];
        }

        container.innerHTML = '';

        if (portfolioData.settings.customFonts.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); padding: 1rem; text-align: center;">등록된 커스텀 폰트가 없습니다.</p>';
        } else {
            portfolioData.settings.customFonts.forEach((font, index) => {
                const item = document.createElement('div');
                item.className = 'font-item';
                item.innerHTML = `
                    <div class="font-item-info">
                        <span class="font-item-name">${escapeHtml(font.name)}</span>
                        <span class="font-item-preview" style="font-family: ${escapeHtml(font.family)};">가나다 ABC 123</span>
                    </div>
                    <div class="font-item-actions">
                        <button class="btn btn-danger btn-sm" onclick="AdminPanel.removeCustomFont(${index})" type="button">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                container.appendChild(item);

                loadFontCSS(font.url, font.name);
            });
        }

        updateFontSelectOptions();
    }

    function updateFontSelectOptions() {
        const fontSelect = document.getElementById('settings-font');
        if (!fontSelect) return;

        const defaultFonts = ['Galmuri9', 'Galmuri11', 'Galmuri7'];

        Array.from(fontSelect.options).forEach(option => {
            if (!defaultFonts.includes(option.value)) {
                option.remove();
            }
        });

        if (portfolioData.settings.customFonts) {
            portfolioData.settings.customFonts.forEach(font => {
                const option = document.createElement('option');
                option.value = font.family;
                option.textContent = `${font.name} (커스텀)`;
                fontSelect.appendChild(option);
            });
        }

        if (portfolioData.settings.font) {
            fontSelect.value = portfolioData.settings.font;
        }
    }

    function loadFontCSS(url, fontName) {
        const existingLink = document.querySelector(`link[data-font="${fontName}"]`);
        if (existingLink) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        link.setAttribute('data-font', fontName);
        document.head.appendChild(link);
    }

    function addCustomFont(name, url, family) {
        if (!portfolioData.settings.customFonts) {
            portfolioData.settings.customFonts = [];
        }

        portfolioData.settings.customFonts.push({
            name: name,
            url: url,
            family: family
        });

        renderCustomFonts();
        updateJSONEditor();
    }

    function removeCustomFont(index) {
        if (confirm('이 폰트를 삭제하시겠습니까?')) {
            const font = portfolioData.settings.customFonts[index];

            portfolioData.settings.customFonts.splice(index, 1);

            const link = document.querySelector(`link[data-font="${font.name}"]`);
            if (link) link.remove();

            if (portfolioData.settings.font === font.family) {
                portfolioData.settings.font = 'Galmuri9';
                document.getElementById('settings-font').value = 'Galmuri9';
            }

            renderCustomFonts();
            updateJSONEditor();
        }
    }

    function showAddFontForm() {
        document.getElementById('add-font-form').classList.remove('hidden');
        document.getElementById('new-font-name').value = '';
        document.getElementById('new-font-url').value = '';
        document.getElementById('new-font-family').value = '';
        document.getElementById('new-font-name').focus();
    }

    function hideAddFontForm() {
        document.getElementById('add-font-form').classList.add('hidden');
    }

    function saveNewFont() {
        const name = document.getElementById('new-font-name').value.trim();
        const url = document.getElementById('new-font-url').value.trim();
        const family = document.getElementById('new-font-family').value.trim();

        if (!name) {
            alert('폰트 이름을 입력해주세요.');
            return;
        }
        if (!url) {
            alert('폰트 URL을 입력해주세요.');
            return;
        }
        if (!family) {
            alert('CSS font-family 값을 입력해주세요.');
            return;
        }

        addCustomFont(name, url, family);
        hideAddFontForm();
    }

    function collectFormData() {
        const fontInput = document.getElementById('settings-font');
        const emailInput = document.getElementById('settings-email');
        const twitterInput = document.getElementById('settings-twitter');
        const ogImageInput = document.getElementById('meta-og-image');

        const data = {
            settings: {
                font: fontInput ? fontInput.value : 'Galmuri9',
                colors: {
                    primary: getColorValue('primary'),
                    secondary: getColorValue('secondary'),
                    background: getColorValue('background'),
                    text: getColorValue('text'),
                    accent: getColorValue('accent')
                },
                socialLinks: collectSocialLinks(),
                email: emailInput ? emailInput.value : '',
                twitterHandle: twitterInput ? twitterInput.value.trim() : '',
                meta: collectMeta(),
                translations: collectTranslations(),
                ogImage: ogImageInput ? ogImageInput.value.trim() : '',
                customFonts: portfolioData.settings?.customFonts || []
            },
            portfolio: collectPortfolio()
        };

        return data;
    }

    function collectMeta() {
        const meta = {};

        const titleInputs = document.querySelectorAll('[id^="meta-"][id$="-title"]');
        const descInputs = document.querySelectorAll('[id^="meta-"][id$="-description"]');

        titleInputs.forEach(input => {
            const lang = input.id.replace('meta-', '').replace('-title', '');
            if (!meta[lang]) meta[lang] = {};
            meta[lang].title = input.value || '';
        });

        descInputs.forEach(input => {
            const lang = input.id.replace('meta-', '').replace('-description', '');
            if (!meta[lang]) meta[lang] = {};
            meta[lang].description = input.value || '';
        });

        return meta;
    }

    function getColorValue(type) {
        const input = document.getElementById(`color-${type}-text`);
        return input ? input.value : '#000000';
    }

    function renderSocialLinks() {
        const container = document.getElementById('social-links-container');
        if (!container || !portfolioData.settings?.socialLinks) return;

        container.innerHTML = '';

        portfolioData.settings.socialLinks.forEach((social, index) => {
            const item = document.createElement('div');
            item.className = 'social-link-item';
            item.innerHTML = `
                <div class="form-group" style="margin: 0;">
                    <label>플랫폼</label>
                    <input type="text" class="form-input" value="${escapeHtml(social.platform)}" data-index="${index}" data-field="platform" placeholder="twitter">
                    <small class="form-help">예: twitter, instagram, youtube, bluesky</small>
                </div>
                <div class="form-group" style="margin: 0;">
                    <label>URL</label>
                    <input type="text" class="form-input" value="${escapeHtml(social.url)}" data-index="${index}" data-field="url" placeholder="https://twitter.com/username">
                </div>
                <div class="form-group" style="margin: 0;">
                    <label>아이콘 클래스</label>
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="text" class="form-input" value="${escapeHtml(social.icon)}" data-index="${index}" data-field="icon" id="icon-input-${index}" readonly style="flex: 1;">
                        <button class="btn btn-secondary" onclick="AdminPanel.openIconPicker(${index})" type="button" style="white-space: nowrap;">
                            <i class="${escapeHtml(social.icon)}"></i>
                            선택
                        </button>
                    </div>
                    <small class="form-help">Font Awesome 아이콘 클래스</small>
                </div>
                <button class="btn btn-danger" onclick="AdminPanel.removeSocialLink(${index})" type="button" title="삭제">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            container.appendChild(item);
        });
    }

    function addSocialLink() {
        if (!portfolioData.settings.socialLinks) {
            portfolioData.settings.socialLinks = [];
        }
        portfolioData.settings.socialLinks.push({
            platform: 'new-platform',
            url: 'https://',
            icon: 'fas fa-link'
        });
        renderSocialLinks();
    }

    function removeSocialLink(index) {
        if (confirm('이 SNS 링크를 삭제하시겠습니까?')) {
            portfolioData.settings.socialLinks.splice(index, 1);
            renderSocialLinks();
        }
    }

    function collectSocialLinks() {
        const inputs = document.querySelectorAll('#social-links-container input');
        const social = [];
        const tempMap = {};

        inputs.forEach(input => {
            const index = input.dataset.index;
            const field = input.dataset.field;

            if (!tempMap[index]) {
                tempMap[index] = {};
            }
            tempMap[index][field] = input.value;
        });

        Object.values(tempMap).forEach(item => {
            if (item.platform && item.url) {
                social.push(item);
            }
        });

        return social;
    }

    function openIconPicker(socialIndex) {
        currentIconSelectCallback = (iconClass, iconName) => {
            const input = document.getElementById(`icon-input-${socialIndex}`);
            if (input) {
                input.value = iconClass;
                portfolioData.settings.socialLinks[socialIndex].icon = iconClass;
                renderSocialLinks();
            }
        };

        renderIconGrid();
        const modal = document.getElementById('icon-picker-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    function closeIconPicker() {
        const modal = document.getElementById('icon-picker-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        currentIconSelectCallback = null;
    }

    function renderIconGrid(searchQuery = '') {
        const grid = document.getElementById('icon-grid');
        if (!grid) return;

        grid.innerHTML = '';

        const filteredIcons = SNS_ICONS.filter(icon =>
            icon.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        filteredIcons.forEach(icon => {
            const item = document.createElement('div');
            item.className = 'icon-item';
            item.innerHTML = `
                <div class="icon-preview" style="background-color: ${icon.color}15;">
                    <i class="${icon.icon}" style="color: ${icon.color};"></i>
                </div>
                <div class="icon-name">${escapeHtml(icon.name)}</div>
            `;
            item.onclick = () => selectIcon(icon.icon, icon.name);
            grid.appendChild(item);
        });

        if (filteredIcons.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">검색 결과가 없습니다.</p>';
        }
    }

    function selectIcon(iconClass, iconName) {
        if (currentIconSelectCallback) {
            currentIconSelectCallback(iconClass, iconName);
        }
        closeIconPicker();
    }

    function renderPortfolio() {
        const container = document.getElementById('portfolio-container');
        if (!container || !portfolioData.portfolio) return;

        container.innerHTML = '';

        portfolioData.portfolio.forEach((item, index) => {
            const portfolioItem = createPortfolioItem(item, index);
            container.appendChild(portfolioItem);
        });

        if (portfolioData.portfolio.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">포트폴리오 항목이 없습니다. 새 항목을 추가해주세요.</p>';
        }

        setupDragAndDrop();
    }

    function createPortfolioItem(item, index) {
        const div = document.createElement('div');
        div.className = 'portfolio-item';
        div.setAttribute('data-index', index);

        const titleKo = item.content?.ko?.title || '제목 없음';

        div.innerHTML = `
            <div class="portfolio-item-header">
                <div class="drag-handle" title="드래그하여 순서 변경">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <div class="order-buttons">
                    <button class="btn btn-icon btn-sm move-up-btn" data-index="${index}" type="button" title="위로 이동">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                    <button class="btn btn-icon btn-sm move-down-btn" data-index="${index}" type="button" title="아래로 이동">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                <span class="portfolio-title-display">${escapeHtml(titleKo)}</span>
                <div class="portfolio-badges">
                    ${item.featured ? '<span class="badge badge-featured">대표</span>' : ''}
                </div>
                <div class="portfolio-actions">
                    <button class="btn btn-primary btn-sm edit-portfolio-btn" data-index="${index}" type="button">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm delete-portfolio-btn" data-index="${index}" type="button">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        const editBtn = div.querySelector('.edit-portfolio-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            openEditPortfolioModal(index);
        });

        const deleteBtn = div.querySelector('.delete-portfolio-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            removePortfolio(index);
        });

        const moveUpBtn = div.querySelector('.move-up-btn');
        moveUpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            movePortfolioItem(index, -1);
        });

        const moveDownBtn = div.querySelector('.move-down-btn');
        moveDownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            movePortfolioItem(index, 1);
        });

        return div;
    }

    function movePortfolioItem(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= portfolioData.portfolio.length) return;

        const item = portfolioData.portfolio.splice(index, 1)[0];
        portfolioData.portfolio.splice(newIndex, 0, item);
        renderPortfolio();
        updateJSONEditor();
    }

    function addPortfolio() {
        const newItem = {
            id: String(Date.now()),
            featured: false,
            content: {
                ko: { title: '새 포트폴리오', description: '', tags: [] },
                en: { title: 'New Portfolio', description: '', tags: [] },
                ja: { title: '新しいポートフォリオ', description: '', tags: [] }
            },
            link: '',
            linkType: 'auto',
            youtubeUrl: '',
            imageUrl: '',
            socialCard: {
                title: '',
                description: '',
                image: ''
            },
            createdAt: new Date().toISOString()
        };
        portfolioData.portfolio.push(newItem);
        renderPortfolio();
    }

    function removePortfolio(index) {
        if (confirm('이 포트폴리오 항목을 삭제하시겠습니까?')) {
            portfolioData.portfolio.splice(index, 1);
            renderPortfolio();
        }
    }

    function togglePortfolioContent(index) {
        const items = document.querySelectorAll('.portfolio-item');
        const targetItem = items[index];

        if (!targetItem) return;

        const content = targetItem.querySelector('.portfolio-content');
        const toggleBtn = targetItem.querySelector('.toggle-btn i');

        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggleBtn.classList.remove('fa-chevron-down');
            toggleBtn.classList.add('fa-chevron-up');
            openProjects.add(index);
        } else {
            content.style.display = 'none';
            toggleBtn.classList.remove('fa-chevron-up');
            toggleBtn.classList.add('fa-chevron-down');
            openProjects.delete(index);
        }
    }

    function openPortfolioModal() {
        populatePortfolio();
        const modal = document.getElementById('portfolio-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    function closePortfolioModal() {
        const modal = document.getElementById('portfolio-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    function openEditPortfolioModal(index = null) {
        const modal = document.getElementById('edit-portfolio-modal');
        if (modal) {
            modal.classList.remove('hidden');
            populateEditPortfolioModal(index);
        }
    }

    function closeEditPortfolioModal() {
        const modal = document.getElementById('edit-portfolio-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    function populateEditPortfolioModal(index) {
        const isEdit = index !== null && index !== 'null';
        const item = isEdit ? portfolioData.portfolio[index] : null;

        document.getElementById('edit-portfolio-modal').dataset.editIndex = index;

        document.getElementById('edit-modal-title').textContent = isEdit ? '소식 편집' : '새 소식 추가';

        document.getElementById('edit-portfolio-featured').checked = item?.featured || false;
        document.getElementById('edit-portfolio-image').value = item?.imageUrl || '';
        document.getElementById('edit-portfolio-youtube').value = item?.youtubeUrl || '';
        document.getElementById('edit-portfolio-link').value = item?.link || '';
        document.getElementById('edit-portfolio-linktype').value = item?.linkType || 'auto';

        populateEditPortfolioLanguageTabs(item);
    }

    function populateEditPortfolioLanguageTabs(item) {
        const tabsContainer = document.getElementById('edit-lang-tabs');
        const contentsContainer = document.getElementById('edit-lang-contents');
        if (!tabsContainer || !contentsContainer) return;

        tabsContainer.innerHTML = '';
        contentsContainer.innerHTML = '';

        const languages = portfolioData.settings?.meta ? Object.keys(portfolioData.settings.meta) : ['ko', 'en', 'ja'];

        languages.forEach((lang, idx) => {
            const tabBtn = document.createElement('button');
            tabBtn.type = 'button';
            tabBtn.className = `lang-tab-btn${idx === 0 ? ' active' : ''}`;
            tabBtn.dataset.lang = lang;
            tabBtn.textContent = getLanguageDisplayName(lang);
            tabBtn.onclick = () => switchLangTab(lang);
            tabsContainer.appendChild(tabBtn);

            const content = item?.content?.[lang] || {};
            const tagsStr = (content.tags || []).join(', ');

            const tabContent = document.createElement('div');
            tabContent.className = `lang-tab-content${idx === 0 ? ' active' : ''}`;
            tabContent.dataset.lang = lang;
            tabContent.innerHTML = `
                <div class="form-group">
                    <label for="edit-portfolio-title-${lang}">제목</label>
                    <input type="text" id="edit-portfolio-title-${lang}" class="form-input" placeholder="제목을 입력하세요" value="${escapeHtml(content.title || '')}">
                </div>
                <div class="form-group">
                    <label for="edit-portfolio-desc-${lang}">설명</label>
                    <textarea id="edit-portfolio-desc-${lang}" class="form-textarea" rows="4" placeholder="설명을 입력하세요">${escapeHtml(content.description || '')}</textarea>
                </div>
                <div class="form-group">
                    <label for="edit-portfolio-tags-${lang}">태그 (쉼표로 구분)</label>
                    <input type="text" id="edit-portfolio-tags-${lang}" class="form-input" placeholder="태그1, 태그2, 태그3" value="${escapeHtml(tagsStr)}">
                </div>
            `;
            contentsContainer.appendChild(tabContent);
        });
    }

    function switchLangTab(lang) {
        document.querySelectorAll('.lang-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });

        document.querySelectorAll('.lang-tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.lang === lang);
        });
    }

    function saveEditPortfolioModal() {
        const index = document.getElementById('edit-portfolio-modal').dataset.editIndex;
        const isEdit = index !== null && index !== 'null' && index !== undefined;

        const featured = document.getElementById('edit-portfolio-featured').checked;
        const imageUrl = document.getElementById('edit-portfolio-image').value.trim();
        const youtubeUrl = document.getElementById('edit-portfolio-youtube').value.trim();
        const link = document.getElementById('edit-portfolio-link').value.trim();
        const linkType = document.getElementById('edit-portfolio-linktype').value;

        const item = {
            id: isEdit ? portfolioData.portfolio[index].id : String(Date.now()),
            featured: featured,
            content: {},
            link: link,
            linkType: linkType,
            youtubeUrl: youtubeUrl,
            imageUrl: imageUrl,
            socialCard: isEdit ? portfolioData.portfolio[index].socialCard : {
                title: '',
                description: '',
                image: ''
            },
            createdAt: isEdit ? portfolioData.portfolio[index].createdAt : new Date().toISOString()
        };

        const languages = portfolioData.settings?.meta ? Object.keys(portfolioData.settings.meta) : ['ko', 'en', 'ja'];
        languages.forEach(lang => {
            const titleEl = document.getElementById(`edit-portfolio-title-${lang}`);
            const descEl = document.getElementById(`edit-portfolio-desc-${lang}`);
            const tagsEl = document.getElementById(`edit-portfolio-tags-${lang}`);

            item.content[lang] = {
                title: titleEl ? titleEl.value.trim() : '',
                description: descEl ? descEl.value.trim() : '',
                tags: tagsEl ? tagsEl.value.split(',').map(t => t.trim()).filter(t => t) : []
            };
        });

        if (isEdit) {
            portfolioData.portfolio[index] = item;
        } else {
            portfolioData.portfolio.push(item);
        }

        renderPortfolio();
        updateJSONEditor();
        closeEditPortfolioModal();
    }

    function populatePortfolio() {
        if (!portfolioData.portfolio) return;

        const container = document.getElementById('portfolio-container');
        if (!container) return;

        container.innerHTML = '';

        portfolioData.portfolio.forEach((item, index) => {
            const itemElement = createPortfolioItem(item, index);
            container.appendChild(itemElement);
        });
    }

    function collectPortfolio() {
        return portfolioData.portfolio || [];
    }

    function setupDragAndDrop() {
        const container = document.getElementById('portfolio-container');
        if (!container) return;

        const items = container.querySelectorAll('.portfolio-item');

        items.forEach(item => {
            const handle = item.querySelector('.drag-handle');
            if (handle) {
                handle.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    item.setAttribute('draggable', 'true');
                });
            }

            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('dragleave', handleDragLeave);
            item.addEventListener('drop', handleDrop);
            item.addEventListener('dragend', handleDragEnd);
        });

        document.addEventListener('mouseup', () => {
            items.forEach(item => {
                item.setAttribute('draggable', 'false');
            });
        });
    }

    function handleDragStart(e) {
        if (e.currentTarget.getAttribute('draggable') !== 'true') {
            e.preventDefault();
            return;
        }
        draggedElement = e.currentTarget;
        draggedIndex = parseInt(draggedElement.getAttribute('data-index'));
        draggedElement.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(draggedIndex));

        const emptyImg = new Image();
        emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(emptyImg, 0, 0);
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const target = e.currentTarget;
        if (target && target !== draggedElement && target.classList.contains('portfolio-item')) {
            target.classList.add('drag-over');
        }

        return false;
    }

    function handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.stopPropagation();
        e.preventDefault();

        const target = e.currentTarget;
        target.classList.remove('drag-over');

        if (draggedElement && draggedElement !== target) {
            const targetIndex = parseInt(target.getAttribute('data-index'));

            if (!isNaN(draggedIndex) && !isNaN(targetIndex)) {
                const movedItem = portfolioData.portfolio.splice(draggedIndex, 1)[0];
                portfolioData.portfolio.splice(targetIndex, 0, movedItem);
                renderPortfolio();
                updateJSONEditor();
            }
        }

        return false;
    }

    function handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        e.currentTarget.setAttribute('draggable', 'false');

        document.querySelectorAll('.portfolio-item').forEach(item => {
            item.classList.remove('drag-over');
            item.classList.remove('dragging');
        });

        draggedElement = null;
        draggedIndex = null;
    }

    function updateJSONEditor() {
        const editor = document.getElementById('json-editor');
        if (editor && portfolioData) {
            editor.value = JSON.stringify(portfolioData, null, 2);
        }
    }

    function loadFromJSONEditor() {
        try {
            const jsonText = document.getElementById('json-editor').value;
            portfolioData = JSON.parse(jsonText);
            return true;
        } catch (error) {
            return false;
        }
    }

    function validateJSON() {
        const messageElement = document.getElementById('json-validation-message');

        try {
            const jsonText = document.getElementById('json-editor').value;
            JSON.parse(jsonText);
            if (messageElement) {
                messageElement.textContent = '✓ JSON이 유효합니다.';
                messageElement.className = 'validation-message success';
            }
            return true;
        } catch (error) {
            if (messageElement) {
                messageElement.textContent = `✗ JSON 오류: ${error.message}`;
                messageElement.className = 'validation-message error';
            }
            return false;
        }
    }

    function formatJSON() {
        try {
            const jsonText = document.getElementById('json-editor').value;
            const parsed = JSON.parse(jsonText);
            document.getElementById('json-editor').value = JSON.stringify(parsed, null, 2);
            alert('JSON이 자동으로 포맷되었습니다.');
        } catch (error) {
            alert('JSON 문법 오류가 있어 포맷할 수 없습니다.');
        }
    }

    function setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;

                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                btn.classList.add('active');
                const targetContent = document.getElementById(`tab-${targetTab}`);
                if (targetContent) {
                    targetContent.classList.add('active');

                    if (targetTab === 'portfolio') {
                        populatePortfolio();
                    } else if (targetTab === 'meta') {
                        populateMeta();
                    }
                }
            });
        });
    }

    function syncColorPicker(type) {
        const colorPicker = document.getElementById(`color-${type}`);
        const textInput = document.getElementById(`color-${type}-text`);
        if (colorPicker && textInput) {
            colorPicker.value = textInput.value;
        }
    }

    function syncColorText(type) {
        const colorPicker = document.getElementById(`color-${type}`);
        const textInput = document.getElementById(`color-${type}-text`);
        if (colorPicker && textInput) {
            textInput.value = colorPicker.value;
        }
    }

    function downloadJSON(data) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'portfolio.json';

        link.addEventListener('click', () => {
            setTimeout(() => {
                URL.revokeObjectURL(url);
                if (document.body.contains(link)) {
                    document.body.removeChild(link);
                }
            }, 100);
        });

        document.body.appendChild(link);
        link.click();
    }

    async function saveChanges() {
        showLoading(true);

        try {
            const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;

            if (activeTab === 'json') {
                if (!loadFromJSONEditor()) {
                    showError('JSON 문법 오류', '먼저 JSON을 검증해주세요.');
                    showLoading(false);
                    return;
                }
            } else {
                portfolioData = collectFormData();
            }

            if (!portfolioData.settings || !portfolioData.portfolio) {
                throw new Error('데이터가 올바르지 않습니다.');
            }

            downloadJSON(portfolioData);

            alert('portfolio.json 파일이 다운로드되었습니다!\n\n다음 단계:\n1. 다운로드된 파일을 프로젝트의 data/ 폴더에 복사\n2. Git 커밋 및 푸시\n3. 몇 분 후 GitHub Pages에 자동 배포됩니다.');

            updateJSONEditor();

        } catch (error) {
            console.error('Save error:', error);
            showError('저장 중 오류가 발생했습니다', error.message);
        } finally {
            showLoading(false);
        }
    }

    function previewSite() {
        window.open('index.html', '_blank');
    }

    function init() {
        if (checkSession()) {
            showDashboard();
            loadData();
        } else {
            showLogin();
        }

        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        const addSocialBtn = document.getElementById('add-social-link');
        if (addSocialBtn) {
            addSocialBtn.addEventListener('click', addSocialLink);
        }

        const addPortfolioBtn = document.getElementById('add-portfolio');
        if (addPortfolioBtn) {
            addPortfolioBtn.addEventListener('click', () => openEditPortfolioModal(null));
        }

        const validateBtn = document.getElementById('validate-json');
        if (validateBtn) {
            validateBtn.addEventListener('click', validateJSON);
        }

        const formatBtn = document.getElementById('format-json');
        if (formatBtn) {
            formatBtn.addEventListener('click', formatJSON);
        }

        const saveBtn = document.getElementById('save-changes');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveChanges);
        }

        const previewBtn = document.getElementById('preview-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', previewSite);
        }

        const openPortfolioModalBtn = document.getElementById('open-portfolio-modal');
        if (openPortfolioModalBtn) {
            openPortfolioModalBtn.addEventListener('click', openPortfolioModal);
        }

        const closePortfolioModalBtn = document.getElementById('close-portfolio-modal');
        if (closePortfolioModalBtn) {
            closePortfolioModalBtn.addEventListener('click', closePortfolioModal);
        }

        const cancelPortfolioModalBtn = document.getElementById('cancel-portfolio-modal');
        if (cancelPortfolioModalBtn) {
            cancelPortfolioModalBtn.addEventListener('click', closePortfolioModal);
        }

        const closeEditPortfolioModalBtn = document.getElementById('close-edit-portfolio-modal');
        if (closeEditPortfolioModalBtn) {
            closeEditPortfolioModalBtn.addEventListener('click', closeEditPortfolioModal);
        }

        const cancelEditPortfolioModalBtn = document.getElementById('cancel-edit-portfolio-modal');
        if (cancelEditPortfolioModalBtn) {
            cancelEditPortfolioModalBtn.addEventListener('click', closeEditPortfolioModal);
        }

        const saveEditPortfolioModalBtn = document.getElementById('save-edit-portfolio-modal');
        if (saveEditPortfolioModalBtn) {
            saveEditPortfolioModalBtn.addEventListener('click', saveEditPortfolioModal);
        }

        const addLanguageBtn = document.getElementById('add-language-btn');
        if (addLanguageBtn) {
            addLanguageBtn.addEventListener('click', () => {
                const lang = prompt('추가할 언어 코드를 입력하세요 (예: fr, de, es):');
                if (lang && lang.trim()) {
                    addLanguage(lang.trim().toLowerCase());
                }
            });
        }

        const addTranslationLanguageBtn = document.getElementById('add-translation-language-btn');
        if (addTranslationLanguageBtn) {
            addTranslationLanguageBtn.addEventListener('click', () => {
                const lang = prompt('추가할 언어 코드를 입력하세요 (예: fr, de, es):');
                if (lang && lang.trim()) {
                    addLanguage(lang.trim().toLowerCase());
                }
            });
        }

        const addCustomFontBtn = document.getElementById('add-custom-font-btn');
        if (addCustomFontBtn) {
            addCustomFontBtn.addEventListener('click', showAddFontForm);
        }

        const cancelAddFontBtn = document.getElementById('cancel-add-font');
        if (cancelAddFontBtn) {
            cancelAddFontBtn.addEventListener('click', hideAddFontForm);
        }

        const saveAddFontBtn = document.getElementById('save-add-font');
        if (saveAddFontBtn) {
            saveAddFontBtn.addEventListener('click', saveNewFont);
        }

        setupTabs();

        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            const targetTab = activeTab.dataset.tab;
            if (targetTab === 'portfolio') {
                populatePortfolio();
            } else if (targetTab === 'meta') {
                populateMeta();
            }
        }

        const iconSearch = document.getElementById('icon-search');
        if (iconSearch) {
            iconSearch.addEventListener('input', debounce((e) => {
                renderIconGrid(e.target.value);
            }, 300));
        }

        const modalBackdrop = document.querySelector('#icon-picker-modal .modal-backdrop');
        if (modalBackdrop) {
            modalBackdrop.addEventListener('click', closeIconPicker);
        }

        ['primary', 'secondary', 'background', 'text', 'accent'].forEach(type => {
            const colorPicker = document.getElementById(`color-${type}`);
            const colorText = document.getElementById(`color-${type}-text`);

            if (colorPicker) {
                colorPicker.addEventListener('input', () => syncColorText(type));
            }

            if (colorText) {
                colorText.addEventListener('input', () => syncColorPicker(type));
            }
        });
    }

    return {
        init,
        openIconPicker,
        closeIconPicker,
        removeSocialLink,
        removePortfolio,
        togglePortfolioContent,
        openPortfolioModal,
        closePortfolioModal,
        openEditPortfolioModal,
        closeEditPortfolioModal,
        saveEditPortfolioModal,
        removeCustomFont
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    AdminPanel.init();
});
