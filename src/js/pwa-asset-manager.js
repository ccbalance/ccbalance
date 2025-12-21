/**
 * PWA Asset Manager
 * - PWA/Web 环境自动下载并缓存全部资源
 * - 提供可拖动状态卡、进度条
 * - 支持强制重下与注销 SW/清缓存
 */

(function () {
    const isPwaWeb = () => !window.electronAPI && location.protocol.startsWith('http');

    const CACHE_PREFIX = 'ccbalance-';

    const ASSETS = [
        '/',
        '/index.html',
        '/manifest.json',
        '/service-worker.js',
        '/app-version.json',

        '/src/styles/main.css',
        '/src/styles/splash.css',
        '/src/styles/particles.css',
        '/src/styles/ui-components.css',
        '/src/styles/animations.css',
        '/src/styles/game-board.css',
        '/src/styles/terminal.css',

        '/src/js/utils.js',
        '/src/js/storage-manager.js',
        '/src/js/audio-manager.js',
        '/src/js/particle-system.js',
        '/src/js/animation-manager.js',
        '/src/js/chemistry-engine.js',
        '/src/js/levels.js',
        '/src/js/workshop-manager.js',
        '/src/js/ai-system.js',
        '/src/js/card-system.js',
        '/src/js/game-actions.js',
        '/src/js/terminal.js',
        '/src/js/ui-manager.js',
        '/src/js/keyboard-handler.js',
        '/src/js/chart-renderer.js',
        '/src/js/game.js',
        '/src/js/pwa-asset-manager.js',
        '/src/js/app.js',

        // images
        '/assets/image-assets/cc-zero.png',
        '/assets/image-assets/icon-192.png',
        '/assets/image-assets/icon-512.png',
        // 注意：PWA 不下载 splash 目录资源（PWA 无 splash 界面）

        // fonts
        '/assets/font-assets/LXGW/LXGWZhenKaiGB-Regular.ttf',
        '/assets/font-assets/texgyreheros/texgyreheros-regular.otf',

        // fontawesome
        '/fontawesome/css/all.min.css',
        '/fontawesome/webfonts/fa-solid-900.woff2',
        '/fontawesome/webfonts/fa-regular-400.woff2',
        '/fontawesome/webfonts/fa-brands-400.woff2',

        // low-quality audio for PWA
        '/assets/audio-assets-low/efforts/any-button-press.mp3',
        '/assets/audio-assets-low/efforts/game-win.mp3',
        '/assets/audio-assets-low/efforts/game-lose.mp3',
        '/assets/audio-assets-low/efforts/turn-start.mp3',
        '/assets/audio-assets-low/efforts/turn-win.mp3',
        '/assets/audio-assets-low/efforts/turn-lose.mp3',
        '/assets/audio-assets-low/efforts/turn-countdown.mp3',
        '/assets/audio-assets-low/efforts/steam-producing.mp3',
        '/assets/audio-assets-low/backgrounds/main/between-sky-and-water.mp3',
        '/assets/audio-assets-low/backgrounds/in-game/a-quiet-joy-stevekaldes-piano.mp3',
        '/assets/audio-assets-low/backgrounds/in-game/april.mp3',
        '/assets/audio-assets-low/backgrounds/in-game/calm-heavenly-raindrops.mp3',
        '/assets/audio-assets-low/backgrounds/in-game/coniferous-forest.mp3',
        '/assets/audio-assets-low/backgrounds/in-game/cozy-morning-instrumental.mp3',
        '/assets/audio-assets-low/backgrounds/in-game/perfect-beauty.mp3',
        '/assets/audio-assets-low/backgrounds/in-game/plea-for-forgiveness-stevekaldes-piano-art-ayla-heefner.mp3',
        '/assets/audio-assets-low/backgrounds/in-game/snow-stevekaldes-piano.mp3'
    ];

    function clamp(n, min, max) {
        return Math.max(min, Math.min(max, n));
    }

    async function getAppVersion() {
        try {
            const resp = await fetch('/app-version.json', { cache: 'no-store' });
            if (!resp.ok) return 'dev';
            const data = await resp.json();
            return (data && data.version) ? String(data.version) : 'dev';
        } catch {
            return 'dev';
        }
    }

    async function getCacheName() {
        const v = await getAppVersion();
        return `${CACHE_PREFIX}v${v}`;
    }

    function createCard() {
        const card = document.createElement('div');
        card.id = 'pwa-download-card';
        card.innerHTML = `
            <div class="pwa-card-header">
                <div class="pwa-card-title">离线资源下载</div>
                <button class="pwa-card-close" type="button" aria-label="close">×</button>
            </div>
            <div class="pwa-card-body">
                <div id="pwa-dl-line" class="pwa-card-line">准备中...</div>
                <div class="pwa-progress">
                    <div id="pwa-dl-bar" class="pwa-progress-bar" style="width:0%"></div>
                </div>
                <div id="pwa-dl-sub" class="pwa-card-sub">0 / 0</div>
            </div>
        `;

        document.body.appendChild(card);

        card.querySelector('.pwa-card-close').addEventListener('click', () => {
            card.style.display = 'none';
        });

        return card;
    }

    function ensureStyles() {
        if (document.getElementById('pwa-download-style')) return;
        const style = document.createElement('style');
        style.id = 'pwa-download-style';
        style.textContent = `
            #pwa-download-card{
                position: fixed;
                right: 16px;
                bottom: 16px;
                width: 320px;
                z-index: 9999;
                background: var(--glass-bg);
                border: 1px solid var(--glass-border);
                border-radius: var(--border-radius);
                backdrop-filter: blur(var(--glass-blur));
                box-shadow: var(--shadow-card);
                color: var(--text-primary);
                user-select: none;
            }
            #pwa-download-card .pwa-card-header{
                display:flex;align-items:center;justify-content:space-between;
                padding: 10px 12px;
                border-bottom: 1px solid var(--glass-border);
                cursor: default;
            }
            #pwa-download-card .pwa-card-title{font-weight:700;font-size:13px;}
            #pwa-download-card .pwa-card-close{border:none;background:transparent;color:var(--text-secondary);cursor:pointer;font-size:18px;line-height:18px;}
            #pwa-download-card .pwa-card-close:hover{color:var(--text-primary);}
            #pwa-download-card .pwa-card-body{padding: 10px 12px;}
            #pwa-download-card .pwa-card-line{font-size:12px;color:var(--text-secondary);margin-bottom:10px;}
            #pwa-download-card .pwa-card-sub{font-size:12px;color:var(--text-muted);margin-top:8px;}
            #pwa-download-card .pwa-progress{height: 10px;background: rgba(255,255,255,0.08);border-radius: 999px;overflow:hidden;border:1px solid var(--glass-border);}
            #pwa-download-card .pwa-progress-bar{height:100%;background: var(--primary-color);transition: width .12s ease-out;}
        `;
        document.head.appendChild(style);
    }

    async function downloadAll({ force = false } = {}) {
        const statusEl = document.getElementById('pwa-assets-status');
        const card = window.__pwaDlCard || createCard();
        window.__pwaDlCard = card;
        card.style.display = 'block';

        const lineEl = document.getElementById('pwa-dl-line');
        const barEl = document.getElementById('pwa-dl-bar');
        const subEl = document.getElementById('pwa-dl-sub');

        const cacheStorage = globalThis.caches;
        if (!cacheStorage) {
            const hint = globalThis.isSecureContext
                ? '离线缓存不可用：当前浏览器不支持 Cache Storage'
                : '离线缓存不可用：需要 HTTPS（或 localhost）';
            if (lineEl) lineEl.textContent = hint;
            if (statusEl) statusEl.textContent = '不可用';
            if (barEl) barEl.style.width = '0%';
            if (subEl) subEl.textContent = '0 / 0';
            return;
        }

        const cacheName = await getCacheName();
        const cache = await cacheStorage.open(cacheName);

        if (force) {
            // 仅清理本应用缓存前缀
            const keys = await cacheStorage.keys();
            await Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX)).map(k => cacheStorage.delete(k)));
        }

        // PWA 无 splash 界面：禁止自动下载 splash 目录资源
        const assetList = ASSETS.filter(u => !String(u).startsWith('/assets/image-assets/splash/'));
        const total = assetList.length;
        let done = 0;

        const update = (text) => {
            const pct = total ? Math.round((done / total) * 100) : 0;
            barEl.style.width = `${pct}%`;
            subEl.textContent = `${done} / ${total} (${pct}%)`;
            if (lineEl) lineEl.textContent = text;
            if (statusEl) statusEl.textContent = pct >= 100 ? '已完成' : `下载中 ${pct}%`;
        };

        update('检查缓存...');

        for (const url of assetList) {
            const existing = await cache.match(url);
            if (existing) {
                done++;
                update(`已缓存：${url}`);
                continue;
            }

            update(`下载：${url}`);
            try {
                const resp = await fetch(url, { cache: 'reload' });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

                // 通过 blob 确保响应完整落盘后再 put
                const blob = await resp.clone().blob();
                const headers = new Headers(resp.headers);
                // 某些环境下 Content-Length 缺失；这里存一个自定义长度方便后续提示
                headers.set('X-CCB-Size', String(blob.size));

                const putResp = new Response(blob, {
                    status: 200,
                    statusText: 'OK',
                    headers
                });

                await cache.put(url, putResp);
            } catch (e) {
                // 不阻断：下次会补全
                console.warn('[PWA assets] download failed:', url, e);
            }

            done++;
            update(`处理完成：${url}`);
        }

        update('资源检查/下载完成');
        // 完成后稍后自动收起
        setTimeout(() => {
            if (card) card.style.display = 'none';
        }, 4000);
    }

    function setupInstallPrompt() {
        const installBtn = document.getElementById('btn-pwa-install');
        if (!installBtn) return;

        let deferredPrompt = null;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installBtn.disabled = false;
        });

        // 默认不可用（需要触发 beforeinstallprompt）
        installBtn.disabled = true;

        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            try {
                await deferredPrompt.userChoice;
            } finally {
                deferredPrompt = null;
                installBtn.disabled = true;
            }
        });
    }

    async function unregisterAndClear() {
        try {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(r => r.unregister()));
        } catch {
            // ignore
        }
        try {
            const cacheStorage = globalThis.caches;
            if (!cacheStorage) return;
            const keys = await cacheStorage.keys();
            await Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX)).map(k => cacheStorage.delete(k)));
        } catch {
            // ignore
        }
    }

    function init() {
        if (!isPwaWeb()) return;

        // 显示设置卡片
        const settingsGroup = document.getElementById('pwa-offline-settings-group');
        if (settingsGroup) settingsGroup.style.display = '';

        ensureStyles();
        setupInstallPrompt();

        // 部署到非 HTTPS 的 http 站点时：Service Worker/Cache Storage/安装都会被浏览器禁用
        const canOffline = !!globalThis.caches;
        if (!canOffline) {
            const statusEl = document.getElementById('pwa-assets-status');
            if (statusEl) {
                statusEl.textContent = globalThis.isSecureContext
                    ? '浏览器不支持离线缓存'
                    : '需要 HTTPS（或 localhost）';
            }
            document.getElementById('btn-pwa-redownload') && (document.getElementById('btn-pwa-redownload').disabled = true);
            document.getElementById('btn-pwa-unregister') && (document.getElementById('btn-pwa-unregister').disabled = true);

            // 仍然弹出状态卡提示原因（避免用户误以为“没运行”）
            const card = window.__pwaDlCard || createCard();
            window.__pwaDlCard = card;
            card.style.display = 'block';
            const lineEl = document.getElementById('pwa-dl-line');
            const barEl = document.getElementById('pwa-dl-bar');
            const subEl = document.getElementById('pwa-dl-sub');
            if (lineEl) {
                lineEl.textContent = globalThis.isSecureContext
                    ? '离线缓存不可用：当前浏览器不支持 Cache Storage'
                    : '离线缓存不可用：需要 HTTPS（或 localhost）';
            }
            if (barEl) barEl.style.width = '0%';
            if (subEl) subEl.textContent = '0 / 0';

            // install 按钮是否可用由 beforeinstallprompt 决定；这里不强行改
            setTimeout(() => {
                if (card) card.style.display = 'none';
            }, 6000);
            return;
        }

        document.getElementById('btn-pwa-redownload')?.addEventListener('click', async () => {
            await downloadAll({ force: true });
        });

        document.getElementById('btn-pwa-unregister')?.addEventListener('click', async () => {
            await unregisterAndClear();
            // 注销后刷新：回到“未安装/未离线”状态
            location.reload();
        });

        // 自动下载：先立即尝试一次（不依赖 SW ready），再在 SW ready 后补一次确保缓存完整
        const go = () => downloadAll({ force: false });
        go();
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(go).catch(() => {
                // ignore
            });
        }
    }

    window.PwaAssetManager = { init, downloadAll };

    document.addEventListener('DOMContentLoaded', init);
})();
