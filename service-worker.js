/**
 * CCBalance - Service Worker
 * PWA 离线缓存和版本管理
 */

const CACHE_PREFIX = 'ccbalance-';

const APP_VERSION_URL = '/app-version.json';

async function getAppVersion() {
    try {
        const resp = await fetch(APP_VERSION_URL, { cache: 'no-store' });
        if (!resp.ok) return 'dev';
        const data = await resp.json();
        return (data && data.version) ? String(data.version) : 'dev';
    } catch {
        return 'dev';
    }
}

const APP_VERSION_PROMISE = getAppVersion();

const CACHE_NAME_PROMISE = (async () => {
    const v = await APP_VERSION_PROMISE;
    return `${CACHE_PREFIX}v${v}`;
})();

const OFFLINE_FALLBACK_URL = '/index.html';
const CACHE_ASSETS = [
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
    '/src/js/app.js',
    '/assets/image-assets/cc-zero.png',
    '/assets/image-assets/icon-192.png',
    '/assets/image-assets/icon-512.png',
    '/assets/image-assets/v0-1-splash.png',
        '/assets/font-assets/LXGW/LXGWZhenKaiGB-Regular.ttf',
        '/assets/font-assets/texgyreheros/texgyreheros-regular.otf',
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
        '/assets/audio-assets-low/backgrounds/in-game/snow-stevekaldes-piano.mp3',
    '/fontawesome/css/all.min.css',
    '/fontawesome/webfonts/fa-solid-900.woff2',
    '/fontawesome/webfonts/fa-regular-400.woff2',
    '/fontawesome/webfonts/fa-brands-400.woff2'
];

// 安装事件 - 缓存资源
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        CACHE_NAME_PROMISE.then((cacheName) => caches.open(cacheName))
            .then((cache) => {
                console.log('[Service Worker] Caching app assets');
                // 不让单个资源失败导致整个 SW 安装失败（避免反复安装重试）
                return Promise.allSettled(
                    CACHE_ASSETS.map((url) => cache.add(url))
                );
            })
            .then(() => {
                console.log('[Service Worker] Installed successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[Service Worker] Installation failed:', error);
            })
    );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        Promise.all([caches.keys(), CACHE_NAME_PROMISE]).then(([cacheNames, activeName]) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName.startsWith(CACHE_PREFIX) && cacheName !== activeName) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
            .then(() => {
                console.log('[Service Worker] Activated');
                return self.clients.claim();
            })
    );
});

// Fetch 事件 - 网络优先,降级到缓存
self.addEventListener('fetch', (event) => {
    const req = event.request;

    // 只处理 GET
    if (req.method !== 'GET') {
        return;
    }

    let url;
    try {
        url = new URL(req.url);
    } catch {
        return;
    }

    // 跳过非 http(s) 与非同源请求（避免 chrome-extension:// 等导致 cache.put 报错）
    if (!['http:', 'https:'].includes(url.protocol)) {
        return;
    }
    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        (async () => {
            const rangeHeader = req.headers?.get?.('range');

            // Range 请求：优先从缓存返回 206（用于离线音频）
            if (rangeHeader) {
                const cached = await caches.match(url.pathname);
                if (cached) {
                    try {
                        const buf = await cached.clone().arrayBuffer();
                        const total = buf.byteLength;
                        const m = /^bytes=(\d+)-(\d+)?$/i.exec(rangeHeader);
                        if (!m) return cached;
                        const start = Number(m[1]);
                        const end = m[2] ? Number(m[2]) : total - 1;
                        if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return cached;
                        const safeEnd = Math.min(end, total - 1);
                        const chunk = buf.slice(start, safeEnd + 1);

                        const headers = new Headers(cached.headers);
                        headers.set('Content-Range', `bytes ${start}-${safeEnd}/${total}`);
                        headers.set('Accept-Ranges', 'bytes');
                        headers.set('Content-Length', String(chunk.byteLength));
                        if (!headers.get('Content-Type')) {
                            headers.set('Content-Type', 'audio/mpeg');
                        }

                        return new Response(chunk, { status: 206, statusText: 'Partial Content', headers });
                    } catch {
                        // fall back to network
                    }
                }

                // 缓存没有：走网络（不缓存 206），同时后台尝试拉全量并写缓存
                event.waitUntil(
                    (async () => {
                        try {
                            const fullResp = await fetch(url.pathname);
                            if (fullResp && fullResp.ok && fullResp.status === 200 && fullResp.type !== 'opaque') {
                                const cacheName = await CACHE_NAME_PROMISE;
                                const cache = await caches.open(cacheName);
                                await cache.put(url.pathname, fullResp.clone());
                            }
                        } catch {
                            // ignore
                        }
                    })()
                );

                return fetch(req);
            }

            // 非 Range：网络优先
            // 字体资源：cache-first（命中缓存就不再走网络，避免每次启动都重复下载字体）
            const isFontReq =
                req.destination === 'font' ||
                /\.(?:ttf|otf|woff2?|eot)$/i.test(url.pathname) ||
                url.pathname.includes('/font-assets/') ||
                url.pathname.includes('/webfonts/');

            if (isFontReq) {
                const cachedFont = await caches.match(req);
                if (cachedFont) return cachedFont;

                try {
                    const resp = await fetch(req);
                    if (resp && resp.ok && resp.status === 200 && resp.type !== 'opaque') {
                        const clone = resp.clone();
                        CACHE_NAME_PROMISE
                            .then((cacheName) => caches.open(cacheName))
                            .then((cache) => cache.put(req, clone))
                            .catch(() => { });
                    }
                    return resp;
                } catch {
                    // 最后兜底
                    const fallback = await caches.match(req);
                    if (fallback) return fallback;
                    return new Response('离线模式：字体不可用', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({ 'Content-Type': 'text/plain' })
                    });
                }
            }

            try {
                const response = await fetch(req);

                // 只缓存完整、可缓存的成功响应
                if (response && response.ok && response.status === 200 && response.type !== 'opaque') {
                    const responseClone = response.clone();
                    CACHE_NAME_PROMISE
                        .then((cacheName) => caches.open(cacheName))
                        .then((cache) => cache.put(req, responseClone))
                        .catch(() => {
                            // 忽略缓存写入失败
                        });
                }

                return response;
            } catch {
                const cached = await caches.match(req);
                if (cached) return cached;

                if (req.mode === 'navigate') {
                    const fallback = await caches.match(OFFLINE_FALLBACK_URL);
                    if (fallback) return fallback;
                }

                return new Response('离线模式：资源不可用', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({
                        'Content-Type': 'text/plain'
                    })
                });
            }
        })()
    );
});

// 消息事件 - 支持手动更新缓存
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys()
                .then((cacheNames) => {
                    return Promise.all(
                        cacheNames.map((cacheName) => caches.delete(cacheName))
                    );
                })
                .then(() => {
                    event.ports[0].postMessage({ success: true });
                })
        );
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.waitUntil(
            APP_VERSION_PROMISE.then((v) => {
                event.ports?.[0]?.postMessage?.({ version: v });
            })
        );
    }
});
