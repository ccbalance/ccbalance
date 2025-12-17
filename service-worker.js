/**
 * CCBalance - Service Worker
 * PWA 离线缓存和版本管理
 */

const CACHE_PREFIX = 'ccbalance-';

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

const CACHE_NAME_PROMISE = (async () => {
    const v = await getAppVersion();
    return `${CACHE_PREFIX}v${v}`;
})();
const CACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/service-worker.js',
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
                return cache.addAll(CACHE_ASSETS);
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
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 成功获取网络资源,更新缓存
                const responseClone = response.clone();
                CACHE_NAME_PROMISE
                    .then((cacheName) => caches.open(cacheName))
                    .then((cache) => cache.put(event.request, responseClone));
                return response;
            })
            .catch(() => {
                // 网络失败,使用缓存
                return caches.match(event.request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // 缓存也没有,返回离线页面
                        return new Response('离线模式：资源不可用', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
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
        event.ports[0].postMessage({ version: CACHE_VERSION });
    }
});
