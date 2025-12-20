/**
 * CCBalance - UI管理模块
 * 处理界面渲染和交互
 */

const UIManager = {
    // DOM元素缓存
    elements: {},

    // 当前焦点参数
    focusedParam: null,

    /**
     * 初始化UI
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.updateProgress();
        this.updateStarProgress();
        this.renderAboutCard();

        // Web 版本不显示“PWA 服务器”状态卡片（该功能仅 Electron 内使用）
        if (!window.electronAPI) {
            const pwaGroup = document.getElementById('pwa-server-settings-group');
            if (pwaGroup) pwaGroup.style.display = 'none';
        }

        // 编辑器窗口保存回传（Electron）
        window.electronAPI?.onLevelEdited?.((levelData) => {
            try {
                WorkshopManager?.addLevel?.(levelData);
                this.renderWorkshop();
                this.showMessage('关卡已保存', 'success');
            } catch (e) {
                console.error('Failed to apply edited level:', e);
                this.showMessage('关卡保存回传失败', 'error');
            }
        });
    },

    /**
     * 渲染“关于”信息（自动读取版本，不硬编码）
     */
    async renderAboutCard() {
        const el = document.getElementById('about-info');
        if (!el) return;

        // Electron：从主进程读取
        const info = await window.electronAPI?.getAppInfo?.();
        if (!info || info.error) {
            // Web/PWA：从静态 app-version.json 读取（会被 SW 缓存，离线可用）
            try {
                const resp = await fetch('/app-version.json', { cache: 'no-store' });
                if (resp.ok) {
                    const data = await resp.json();
                    const name = data?.name || 'CCBalance';
                    const version = data?.version || '-';
                    el.innerHTML = `
                        <div><strong style="color: var(--text-primary);">${name}</strong></div>
                        <div>版本：${version}</div>
                    `;
                    return;
                }
            } catch {
                // ignore
            }

            // 最后兜底：读 manifest.json 的 version 字段（若服务器提供）
            try {
                const resp = await fetch('/manifest.json', { cache: 'no-store' });
                if (resp.ok) {
                    const data = await resp.json();
                    const name = data?.name || 'CCBalance';
                    const version = data?.version || '-';
                    el.innerHTML = `
                        <div><strong style="color: var(--text-primary);">${name}</strong></div>
                        <div>版本：${version}</div>
                    `;
                    return;
                }
            } catch {
                // ignore
            }

            el.textContent = '无法读取版本信息';
            return;
        }

        const deps = info.dependencies || {};
        const core = [];
        if (deps.electron) core.push(`electron: ${deps.electron}`);

        const runtime = info.runtime || {};
        const runtimeLine = [
            runtime.electron ? `Electron ${runtime.electron}` : null,
            runtime.chrome ? `Chromium ${runtime.chrome}` : null,
            runtime.node ? `Node ${runtime.node}` : null
        ].filter(Boolean).join(' · ');

        el.innerHTML = `
            <div><strong style="color: var(--text-primary);">${info.name || 'CCBalance'}</strong></div>
            <div>版本：${info.packageVersion || info.appVersion || '-'}</div>
            ${core.length ? `<div>核心依赖：${core.join(' , ')}</div>` : ''}
            ${runtimeLine ? `<div>运行时：${runtimeLine}</div>` : ''}
        `;
    },

    /**
     * 缓存DOM元素
     */
    cacheElements() {
        // 屏幕
        this.elements.screens = {
            mainMenu: document.getElementById('main-menu'),
            levelSelect: document.getElementById('level-select'),
            gameScreen: document.getElementById('game-screen'),
            resultScreen: document.getElementById('result-screen'),
            collectionScreen: document.getElementById('collection-screen'),
            settingsScreen: document.getElementById('settings-screen'),
            workshopScreen: document.getElementById('workshop-screen')
        };

        // 按钮
        this.elements.buttons = {
            startGame: document.getElementById('btn-start-game'),
            levelSelect: document.getElementById('btn-level-select'),
            collection: document.getElementById('btn-collection'),
            settings: document.getElementById('btn-settings'),
            backMenu: document.getElementById('btn-back-menu'),
            backMenu2: document.getElementById('btn-back-menu-2'),
            backMenu3: document.getElementById('btn-back-menu-3'),
            confirm: document.getElementById('btn-confirm'),
            reset: document.getElementById('btn-reset'),
            resume: document.getElementById('btn-resume'),
            restart: document.getElementById('btn-restart'),
            quit: document.getElementById('btn-quit'),
            nextLevel: document.getElementById('btn-next-level'),
            replay: document.getElementById('btn-replay'),
            backLevels: document.getElementById('btn-back-levels'),
            resetProgress: document.getElementById('btn-reset-progress'),
            resetStarRoad: document.getElementById('btn-reset-star-road')
        };

        // 游戏元素
        this.elements.game = {
            equationContainer: document.getElementById('equation-container'),
            reactants: document.getElementById('reactants'),
            products: document.getElementById('products'),
            playerGoalText: document.getElementById('player-goal-text'),
            aiGoalText: document.getElementById('ai-goal-text'),
            currentRound: document.getElementById('current-round'),
            totalRounds: document.getElementById('total-rounds'),
            turnTimer: document.getElementById('turn-timer'),
            balancePointer: document.getElementById('balance-pointer'),
            balanceLeft: document.getElementById('balance-left'),
            balanceRight: document.getElementById('balance-right'),
            tempSlider: document.getElementById('temp-slider'),
            tempValue: document.getElementById('temp-value'),
            pressureSlider: document.getElementById('pressure-slider'),
            pressureValue: document.getElementById('pressure-value'),
            concentrationSliders: document.getElementById('concentration-sliders'),
            equilibriumConstant: document.getElementById('equilibrium-constant'),
            reactionQuotient: document.getElementById('reaction-quotient'),
            concentrationList: document.getElementById('concentration-list'),
            pauseMenu: document.getElementById('pause-menu'),
            infoPanel: document.getElementById('info-panel'),
            reactionTypeBadge: document.getElementById('reaction-type-badge'),
            enthalpyBadge: document.getElementById('enthalpy-badge')
        };

        // 结果元素
        this.elements.result = {
            icon: document.getElementById('result-icon'),
            title: document.getElementById('result-title'),
            subtitle: document.getElementById('result-subtitle'),
            achievement: document.getElementById('stat-achievement'),
            rounds: document.getElementById('stat-rounds'),
            stars: document.getElementById('stat-stars'),
            masteredEquation: document.getElementById('mastered-equation')
        };

        // 信息元素
        this.elements.info = {
            totalProgress: document.getElementById('total-progress'),
            totalStars: document.getElementById('total-stars')
        };

        // 容器
        this.elements.containers = {
            levels: document.getElementById('levels-container'),
            collection: document.getElementById('collection-grid')
        };
    },

    /**
     * 绑定事件
     */
    bindEvents() {
        // 标题栏按钮
        document.getElementById('btn-minimize')?.addEventListener('click', () => {
            window.electronAPI?.minimizeWindow();
        });
        document.getElementById('btn-maximize')?.addEventListener('click', () => {
            window.electronAPI?.maximizeWindow();
        });
        document.getElementById('btn-close')?.addEventListener('click', () => {
            window.electronAPI?.closeWindow();
        });

        // 菜单按钮
        this.elements.buttons.startGame?.addEventListener('click', () => {
            this.showScreen('levelSelect');
        });
        this.elements.buttons.levelSelect?.addEventListener('click', () => {
            this.showScreen('levelSelect', 'slide-right');
        });
        document.getElementById('btn-workshop')?.addEventListener('click', () => {
            this.showScreen('workshopScreen', 'slide-right');
            this.renderWorkshop();
        });
        this.elements.buttons.collection?.addEventListener('click', () => {
            this.showScreen('collectionScreen', 'scale');
            this.renderCollection();
        });
        this.elements.buttons.settings?.addEventListener('click', () => {
            this.showScreen('settingsScreen', 'slide-left');
        });

        // 返回按钮
        this.elements.buttons.backMenu?.addEventListener('click', () => {
            this.showScreen('mainMenu', 'slide-left');
        });
        this.elements.buttons.backMenu2?.addEventListener('click', () => {
            this.showScreen('mainMenu', 'slide-left');
        });
        this.elements.buttons.backMenu3?.addEventListener('click', () => {
            this.showScreen('mainMenu', 'slide-left');
        });
        document.getElementById('btn-back-menu-workshop')?.addEventListener('click', () => {
            this.showScreen('mainMenu', 'slide-left');
        });

        // 游戏控制按钮
        this.elements.buttons.confirm?.addEventListener('click', () => {
            Game.confirmTurn();
        });
        this.elements.buttons.reset?.addEventListener('click', () => {
            Game.resetTurn();
        });

        // 暂停菜单按钮
        this.elements.buttons.resume?.addEventListener('click', () => {
            Game.togglePause();
        });
        this.elements.buttons.restart?.addEventListener('click', () => {
            Game.restart();
        });
        this.elements.buttons.quit?.addEventListener('click', () => {
            Game.quit();
            this.showScreen('mainMenu', 'scale');
        });

        // 结果界面按钮
        this.elements.buttons.nextLevel?.addEventListener('click', () => {
            Game.nextLevel();
        });
        this.elements.buttons.replay?.addEventListener('click', () => {
            Game.restart();
        });
        this.elements.buttons.backLevels?.addEventListener('click', () => {
            this.showScreen('levelSelect', 'slide-right');
        });

        // 分类标签
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.selectCategory(e.target.closest('.category-tab').dataset.category);
            });
        });

        // 难度按钮
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectDifficulty(parseInt(e.target.dataset.diff));
            });
        });

        // 能力卡牌
        document.querySelectorAll('.ability-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const ability = e.target.closest('.ability-card').dataset.ability;
                Game.useAbility(ability);
            });
        });

        // 滑块事件
        this.elements.game.tempSlider?.addEventListener('input', (e) => {
            this.onTemperatureChange(parseFloat(e.target.value));
        });
        this.elements.game.pressureSlider?.addEventListener('input', (e) => {
            this.onPressureChange(parseFloat(e.target.value));
        });

        // 信息面板切换
        document.getElementById('toggle-info')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.elements.game.infoPanel?.classList.toggle('collapsed');
        });

        // 侧边栏收起后：点击侧边栏任意位置展开
        this.elements.game.infoPanel?.addEventListener('click', (e) => {
            const panel = this.elements.game.infoPanel;
            if (!panel) return;
            if (panel.classList.contains('collapsed')) {
                panel.classList.remove('collapsed');
            }
        });

        // 收藏过滤
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.renderCollection(e.target.dataset.filter);
            });
        });

        // 星级进度面板点击事件
        document.getElementById('star-progress-compact')?.addEventListener('click', () => {
            this.showStarRewards();
        });

        // 兜底：事件委托，避免因 DOM 结构调整导致点击失效
        if (!this._starRewardsDelegated) {
            this._starRewardsDelegated = true;
            document.addEventListener('click', (e) => {
                const trigger = e.target?.closest?.('#star-progress-compact, #star-progress-panel');
                if (!trigger) return;
                // 防止被其他 click handler 吞掉
                e.preventDefault?.();
                e.stopPropagation?.();
                this.showStarRewards();
            }, true);
        }

        // 分类栏左右滚动按钮（仅在宽度不足时显示）
        this.bindCategoryTabsScroll();

        // 星级奖励屏幕关闭事件
        document.getElementById('star-rewards-close')?.addEventListener('click', () => {
            const screen = document.getElementById('star-rewards-screen');
            if (!screen) return;
            screen.classList.remove('active');
            // 等待淡出动画结束再隐藏，避免下次打开无过渡
            setTimeout(() => {
                screen.style.display = 'none';
            }, 220);
        });

        // 创意工坊事件
        this.bindWorkshopEvents();

        // 设置控件
        this.bindSettingsEvents();

        // 重置进度按钮
        this.elements.buttons.resetProgress?.addEventListener('click', () => {
            if (confirm('确定要重置所有游戏进度吗？此操作不可撤销。')) {
                StorageManager.resetProgress();
                this.updateProgress();
                Utils.showToast('进度已重置', 'success');
            }
        });

        // 重置摘星之路状态（不清除星星，仅锁回皮肤与领取状态）
        this.elements.buttons.resetStarRoad?.addEventListener('click', () => {
            if (!confirm('重置摘星之路状态（仅锁定皮肤与领奖状态，不会清除星星）？')) return;
            if (!confirm('再次确认：锁定所有皮肤并清空已领取奖励，保留当前星星。继续吗？')) return;

            StorageManager.lockAllSkins?.();
            this.updateStarProgress();
            this.refreshParticleSkinOptions?.();
            App?.applyParticleSkin?.('colorful', { skipSave: true });
            Utils.showToast('摘星之路状态已重置（星数保留，皮肤已锁定）', 'success');
        });

        // 波纹效果
        document.querySelectorAll('.menu-btn, .action-btn, .category-tab').forEach(btn => {
            btn.addEventListener('click', (e) => Utils.createRipple(e, btn));
        });

        // 全局 Esc 键：关闭所有激活的模态（modal-overlay.active）或终端
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape' && e.key !== 'Esc') return;

            // 优先关闭任意激活的 modal-overlay
            const activeModals = document.querySelectorAll('.modal-overlay.active');
            if (activeModals && activeModals.length > 0) {
                activeModals.forEach(modal => {
                    try {
                        modal.classList.remove('active');
                        setTimeout(() => { modal.style.display = 'none'; }, 220);
                    } catch (err) { /* ignore */ }
                });
                e.preventDefault();
                return;
            }

            // 否则尝试关闭终端（若可见）
            const term = document.getElementById('terminal-overlay');
            if (term && !term.classList.contains('hidden')) {
                Terminal?.hide?.();
                e.preventDefault();
            }
        });
    },

    /**
     * 绑定设置事件
     */
    bindSettingsEvents() {
        const settings = StorageManager.getSettings();

        // 音效音量
        const sfxVolume = document.getElementById('sfx-volume');
        if (sfxVolume) {
            sfxVolume.value = settings.sfxVolume;
            sfxVolume.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                StorageManager.saveSettings({ sfxVolume: value });
                AudioManager?.setSfxVolume?.(value);
            });
        }

        // 背景音乐音量
        const bgmVolume = document.getElementById('bgm-volume');
        if (bgmVolume) {
            bgmVolume.value = settings.bgmVolume;
            bgmVolume.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                StorageManager.saveSettings({ bgmVolume: value });
                AudioManager?.setBgmVolume?.(value);
            });
        }

        // 粒子数量
        const particleCount = document.getElementById('particle-count');
        if (particleCount) {
            particleCount.value = settings.particleCount;
            particleCount.addEventListener('change', (e) => {
                StorageManager.saveSettings({ particleCount: e.target.value });
                // 更新粒子系统
                const counts = { low: 50, medium: 200, high: 500 };
                if (window.bgParticles) {
                    window.bgParticles.init(counts[e.target.value] || 200);
                }
            });
        }

        // 粒子颜色
        const particleColor = document.getElementById('particle-color');
        if (particleColor) {
            particleColor.value = settings.particleColor || '#00d4ff';
            particleColor.addEventListener('input', (e) => {
                const value = String(e.target.value || '').trim() || '#00d4ff';
                StorageManager.saveSettings({ particleColor: value });
                window.bgParticles?.setColor?.(value);
            });
        }

        // 粒子皮肤
        const particleSkin = document.getElementById('particle-skin');
        if (particleSkin) {
            const refreshOptions = () => {
                const unlockedSkins = StorageManager.getUnlockedSkins();
                Array.from(particleSkin.options).forEach(option => {
                    const skinId = option.value;
                    option.disabled = (skinId !== 'colorful' && !unlockedSkins.includes(skinId));
                });

                const cur = StorageManager.getSettings().particleSkin || 'colorful';
                particleSkin.value = cur;
            };

            refreshOptions();

            particleSkin.addEventListener('change', (e) => {
                const skinId = String(e.target.value || '').trim() || 'colorful';
                const unlockedSkins = StorageManager.getUnlockedSkins();

                if (skinId !== 'colorful' && !unlockedSkins.includes(skinId)) {
                    refreshOptions();
                    Utils.showToast('该皮肤尚未解锁', 'error');
                    return;
                }

                App?.applyParticleSkin?.(skinId);
                refreshOptions();

                Utils.showToast(`已切换到${e.target.options[e.target.selectedIndex].text}`, 'success');
            });

            // 暴露给其它流程（奖励领取/终端命令）用于刷新
            this.refreshParticleSkinOptions = refreshOptions;
        }

        // 动画效果
        const enableAnimations = document.getElementById('enable-animations');
        if (enableAnimations) {
            enableAnimations.checked = settings.enableAnimations;
            enableAnimations.addEventListener('change', (e) => {
                StorageManager.saveSettings({ enableAnimations: e.target.checked });
            });
        }

        // 回合时间
        const turnTime = document.getElementById('turn-time');
        if (turnTime) {
            turnTime.value = settings.turnTime;
            turnTime.addEventListener('change', (e) => {
                StorageManager.saveSettings({ turnTime: parseInt(e.target.value) });
            });
        }

        // 显示提示
        const showHints = document.getElementById('show-hints');
        if (showHints) {
            showHints.checked = settings.showHints;
            showHints.addEventListener('change', (e) => {
                StorageManager.saveSettings({ showHints: e.target.checked });
            });
        }

        // 关卡回合数
        const roundsPerLevel = document.getElementById('rounds-per-level');
        if (roundsPerLevel) {
            roundsPerLevel.value = String(settings.roundsPerLevel ?? 10);
            roundsPerLevel.addEventListener('change', (e) => {
                const value = parseInt(e.target.value, 10);
                StorageManager.saveSettings({ roundsPerLevel: Number.isFinite(value) ? value : 10 });
            });
        }

        // PWA 服务器控制
        this.bindPWAServerEvents();
    },

    /**
     * 绑定 PWA 服务器事件
     */
    bindPWAServerEvents() {
        if (!window.electronAPI) return;

        const startBtn = document.getElementById('btn-pwa-start');
        const stopBtn = document.getElementById('btn-pwa-stop');
        const openBtn = document.getElementById('btn-pwa-open');
        const portInput = document.getElementById('pwa-port');
        const certSelectBtn = document.getElementById('btn-pwa-cert-select');
        const certClearBtn = document.getElementById('btn-pwa-cert-clear');

        // 初始化服务器状态
        this.updatePWAServerStatus();
        this.updatePWAServerCertStatus();

        startBtn?.addEventListener('click', async () => {
            AudioManager?.playSound?.('click');
            const port = parseInt(portInput?.value || 3000);
            try {
                const result = await window.electronAPI.pwaServerStart(port);
                if (result.success) {
                    this.showMessage('PWA 服务器已启动');
                    this.updatePWAServerStatus();
                } else {
                    this.showMessage('启动失败: ' + (result.error || '未知错误'));
                }
            } catch (error) {
                this.showMessage('启动失败: ' + error.message);
            }
        });

        stopBtn?.addEventListener('click', async () => {
            AudioManager?.playSound?.('click');
            try {
                const result = await window.electronAPI.pwaServerStop();
                if (result.success) {
                    this.showMessage('PWA 服务器已停止');
                    this.updatePWAServerStatus();
                } else {
                    this.showMessage('停止失败: ' + (result.error || '未知错误'));
                }
            } catch (error) {
                this.showMessage('停止失败: ' + error.message);
            }
        });

        openBtn?.addEventListener('click', async () => {
            AudioManager?.playSound?.('click');
            const status = await window.electronAPI.pwaServerStatus();
            if (status.isRunning && status.url) {
                window.electronAPI.openExternal(status.url);
            } else {
                this.showMessage('服务器未运行');
            }
        });

        // 监听服务器状态变化
        window.electronAPI.onPWAServerStatusChanged?.((status) => {
            this.updatePWAServerStatus(status);
        });

        certSelectBtn?.addEventListener('click', async () => {
            try {
                const pick = await window.electronAPI.pwaServerSelectCert?.();
                if (!pick || pick.canceled) return;

                const pwd = await this.promptText({
                    title: 'HTTPS 证书密码（可留空）',
                    label: '如果你的 PFX/P12 没有密码，直接点“确定”即可。',
                    placeholder: 'passphrase（可选）',
                    defaultValue: ''
                });

                const result = await window.electronAPI.pwaServerSetCert?.(pick.filePath, pwd || '');
                if (result?.success) {
                    this.showMessage('证书已设置（服务器会自动切换到 HTTPS）', 'success');
                    await this.updatePWAServerCertStatus();
                    await this.updatePWAServerStatus();
                } else {
                    this.showMessage('证书设置失败: ' + (result?.error || '未知错误'), 'error');
                }
            } catch (e) {
                this.showMessage('证书设置失败: ' + (e?.message || String(e)), 'error');
            }
        });

        certClearBtn?.addEventListener('click', async () => {
            try {
                const result = await window.electronAPI.pwaServerClearCert?.();
                if (result?.success) {
                    this.showMessage('证书已卸除（服务器将使用 HTTP）', 'success');
                    await this.updatePWAServerCertStatus();
                    await this.updatePWAServerStatus();
                } else {
                    this.showMessage('卸除失败: ' + (result?.error || '未知错误'), 'error');
                }
            } catch (e) {
                this.showMessage('卸除失败: ' + (e?.message || String(e)), 'error');
            }
        });
    },

    async updatePWAServerCertStatus() {
        if (!window.electronAPI?.pwaServerCertStatus) return;
        const el = document.getElementById('pwa-cert-status');
        if (!el) return;

        try {
            const st = await window.electronAPI.pwaServerCertStatus();
            if (st?.enabled && st?.filePath) {
                const name = String(st.filePath).split(/[/\\]/).pop();
                el.textContent = `已配置：${name}`;
            } else {
                el.textContent = '未配置（HTTP）';
            }
        } catch {
            el.textContent = '未配置（HTTP）';
        }
    },

    /**
     * 更新 PWA 服务器状态显示
     */
    async updatePWAServerStatus(status) {
        if (!window.electronAPI) return;

        if (!status) {
            status = await window.electronAPI.pwaServerStatus();
        }

        const statusText = document.getElementById('server-status-text');
        const indicator = document.getElementById('server-status-indicator');
        const urlLink = document.getElementById('pwa-server-url');

        if (statusText) {
            statusText.textContent = status.isRunning ? '运行中' : '未运行';
        }

        if (indicator) {
            indicator.classList.toggle('running', status.isRunning);
        }

        if (urlLink) {
            if (status.isRunning && status.url) {
                urlLink.textContent = status.url;
                urlLink.href = status.url;
                urlLink.style.pointerEvents = 'auto';

                // Electron 中点击链接也用系统默认浏览器打开
                urlLink.onclick = (e) => {
                    e.preventDefault();
                    window.electronAPI?.openExternal?.(status.url);
                };
            } else {
                urlLink.textContent = '-';
                urlLink.href = '#';
                urlLink.style.pointerEvents = 'none';
                urlLink.onclick = null;
            }
        }

        // 同步刷新证书状态（尤其是启动/切换协议后）
        this.updatePWAServerCertStatus();
    },

    /**
     * 统一提示（兼容旧代码里的 this.showMessage 调用）
     */
    showMessage(message, type = 'info') {
        if (Utils?.showToast) {
            Utils.showToast(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    },

    /**
     * 代替 prompt()（Electron 环境不支持原生 prompt）
     */
    promptText({ title = '请输入', label = '', placeholder = '', defaultValue = '' } = {}) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close" type="button" aria-label="Close"><i class="fas fa-times"></i></button>
                    </div>
                    ${label ? `<div style="color: var(--text-secondary); font-size: 13px; margin-bottom: 10px;">${label}</div>` : ''}
                    <input class="setting-input" style="width: 100%;" placeholder="${placeholder}" value="${defaultValue}" />
                    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top: 16px;">
                        <button class="toolbar-btn" type="button" data-action="cancel">取消</button>
                        <button class="toolbar-btn primary" type="button" data-action="ok">确定</button>
                    </div>
                </div>
            `;

            const cleanup = () => overlay.remove();
            const closeBtn = overlay.querySelector('.modal-close');
            const input = overlay.querySelector('input');

            const finish = (value) => {
                cleanup();
                resolve(value);
            };

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) finish(null);
            });
            closeBtn?.addEventListener('click', () => finish(null));
            overlay.querySelector('[data-action="cancel"]')?.addEventListener('click', () => finish(null));
            overlay.querySelector('[data-action="ok"]')?.addEventListener('click', () => {
                const v = (input?.value || '').trim();
                finish(v || null);
            });

            input?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const v = (input?.value || '').trim();
                    finish(v || null);
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    finish(null);
                }
            });

            document.body.appendChild(overlay);
            setTimeout(() => input?.focus(), 0);
        });
    },

    /**
     * 切换屏幕
     */
    showScreen(screenName, animation = 'fade') {
        // 主页与游戏间的背景音乐切换（渐入渐出）
        if (screenName === 'mainMenu') {
            AudioManager?.playMainMenuBgm?.({ fadeMs: 800 });
        }

        const screenKey = screenName.replace('-', '');

        const targetScreen = Object.entries(this.elements.screens)
            .find(([key, _screen]) => key === screenKey || key === screenName)?.[1];

        if (!targetScreen) return;

        const currentScreen = Object.values(this.elements.screens)
            .find(screen => screen?.classList?.contains('active'));

        if (currentScreen === targetScreen) return;

        const clearPageAnimClasses = (el) => {
            el.classList.remove(
                'page-enter-fade',
                'page-leave-fade',
                'page-enter-slide-right',
                'page-enter-slide-left',
                'page-leave-slide-left',
                'page-leave-slide-right',
                'page-enter-scale',
                'page-leave-scale'
            );
        };

        const enterAnim = animation === 'slide-right' ? 'page-enter-slide-right' :
            animation === 'slide-left' ? 'page-enter-slide-left' :
                animation === 'scale' ? 'page-enter-scale' : 'page-enter-fade';

        const leaveAnim = animation === 'slide-right' ? 'page-leave-slide-left' :
            animation === 'slide-left' ? 'page-leave-slide-right' :
                animation === 'scale' ? 'page-leave-scale' : 'page-leave-fade';

        // 先显示目标屏幕，避免“空屏”闪烁
        clearPageAnimClasses(targetScreen);
        targetScreen.classList.add('active', enterAnim);

        // 特定屏幕的初始化（尽量在 enter 动画开始后立即做，避免动画结束再重排闪一下）
        if (screenName === 'levelSelect') {
            this.renderLevels();
        }

        // 让旧屏幕播放退出动画，然后再移除 active
        if (currentScreen) {
            clearPageAnimClasses(currentScreen);
            currentScreen.classList.add(leaveAnim);

            setTimeout(() => {
                currentScreen.classList.remove('active');
                clearPageAnimClasses(currentScreen);
            }, 300);
        }

        // 清理目标屏幕进入动画 class
        setTimeout(() => {
            clearPageAnimClasses(targetScreen);
        }, 500);
    },

    /**
     * 选择分类
     */
    selectCategory(category) {
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
        this.renderLevels(category);
    },

    /**
     * 选择难度
     */
    selectDifficulty(difficulty) {
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.diff) === difficulty);
        });
        AISystem.setDifficulty(difficulty);
    },

    /**
     * 渲染关卡列表
     */
    renderLevels(category = 'ionic') {
        const container = this.elements.containers.levels;
        if (!container) return;

        container.innerHTML = '';
        
        const levels = LevelData.getLevelsByCategory(category);
        const progress = StorageManager.getProgress();

        for (const level of levels) {
            const status = StorageManager.getLevelStatus(level.id);
            const card = document.createElement('div');
            card.className = 'level-card';
            
            if (!status.unlocked) {
                card.classList.add('locked');
            } else if (status.completed) {
                card.classList.add('completed');
            }

            const stars = status.completed ? status.completed.stars : 0;
            const starsHtml = Array(3).fill(0).map((_, i) => 
                `<i class="fas fa-star ${i < stars ? 'earned' : ''}"></i>`
            ).join('');

            card.innerHTML = `
                <div class="level-number">Level ${level.id}</div>
                <div class="level-equation">${level.displayEquation}</div>
                <div class="level-stars">${starsHtml}</div>
                <span class="level-badge">${level.name}</span>
                ${!status.unlocked ? '<i class="fas fa-lock level-lock-icon"></i>' : ''}
            `;

            if (status.unlocked) {
                card.addEventListener('click', () => {
                    Game.startLevel(level.id);
                    this.showScreen('gameScreen');
                });
            }

            container.appendChild(card);
        }
    },

    /**
     * 渲染收藏
     */
    renderCollection(filter = 'all') {
        const container = this.elements.containers.collection;
        if (!container) return;

        container.innerHTML = '';
        
        const collection = StorageManager.getCollection();
        const levels = LevelData.levels;

        for (const level of levels) {
            const isUnlocked = collection[level.id];
            
            if (filter === 'unlocked' && !isUnlocked) continue;
            if (filter === 'locked' && isUnlocked) continue;

            const card = document.createElement('div');
            card.className = `collection-card ${isUnlocked ? '' : 'locked'}`;
            
            const categoryInfo = LevelData.categories[level.category];
            
            card.innerHTML = `
                <div class="card-category">
                    <i class="fas ${categoryInfo.icon}"></i>
                    ${categoryInfo.name}
                </div>
                <div class="card-equation">${isUnlocked ? level.displayEquation : '???'}</div>
                <div class="card-info">
                    <span>${level.name}</span>
                    <span>${isUnlocked ? '已解锁' : '未解锁'}</span>
                </div>
            `;

            // Add click handler to show equation details for unlocked levels
            if (isUnlocked) {
                card.style.cursor = 'pointer';
                card.addEventListener('click', () => {
                    this.showEquationDetail(level);
                });
            }

            container.appendChild(card);
        }
    },

    /**
     * Show equation detail modal
     */
    showEquationDetail(level) {
        const modal = document.getElementById('equation-modal');
        if (!modal) return;

        const categoryInfo = LevelData.categories[level.category];
        
        // Fill modal content
        document.getElementById('equation-detail-category-name').textContent = categoryInfo.name;
        document.querySelector('#equation-modal .equation-detail-category i').className = `fas ${categoryInfo.icon}`;
        document.getElementById('equation-detail-name').textContent = level.name;
        document.getElementById('equation-detail-equation').innerHTML = level.displayEquation;
        document.getElementById('equation-detail-description').textContent = level.description;
        document.getElementById('equation-detail-poetic-text').textContent = level.poeticDescription || '暂无诗意描述';
        
        // Fill info
        const deltaH = level.deltaH || 0;
        document.getElementById('equation-detail-enthalpy').textContent = 
            deltaH > 0 ? `+${deltaH} kJ/mol (吸热)` : `${deltaH} kJ/mol (放热)`;
        
        const k = level.equilibriumConstant;
        const kStr = k >= 1000 || k <= 0.001 ? k.toExponential(2) : k.toFixed(3);
        document.getElementById('equation-detail-k').textContent = kStr;
        
        const difficultyMap = { 1: '简单', 2: '中等', 3: '困难', 4: '专家' };
        document.getElementById('equation-detail-difficulty').textContent = difficultyMap[level.difficulty] || '中等';
        
        // Show modal (modal-overlay 依赖 .active 控制可见性)
        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
        
        // Add close handlers
        const closeBtn = document.getElementById('equation-modal-close');
        const closeHandler = () => {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 220);
        };
        
        closeBtn.onclick = closeHandler;
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeHandler();
            }
        };
    },

    /**
     * 更新进度显示
     */
    updateProgress() {
        const progress = StorageManager.getProgress();
        const completed = Object.keys(progress.completedLevels).length;
        const total = LevelData.getTotalLevels();

        if (this.elements.info.totalProgress) {
            this.elements.info.totalProgress.textContent = `${completed}/${total}`;
        }
        if (this.elements.info.totalStars) {
            this.elements.info.totalStars.textContent = progress.totalStars;
        }
    },

    /**
     * 设置游戏界面
     */
    setupGameUI(level, playerGoal, aiGoal) {
        // 设置方程式
        this.renderEquation(level);
        
        // 设置目标
        this.elements.game.playerGoalText.textContent = 
            playerGoal === 'forward' ? '促进正向反应' : '促进逆向反应';
        this.elements.game.aiGoalText.textContent = 
            aiGoal === 'forward' ? '促进正向反应' : '促进逆向反应';

        // 设置反应类型标签
        const categoryInfo = LevelData.categories[level.category];
        this.elements.game.reactionTypeBadge.innerHTML = 
            `<i class="fas ${categoryInfo.icon}"></i> ${categoryInfo.name}`;

        // 设置焓变标签
        const deltaH = level.deltaH || 0;
        const isEndothermic = deltaH > 0;
        const thermoHint = isEndothermic
            ? '吸热反应：升温促进正向，降温促进逆向'
            : '放热反应：升温促进逆向，降温促进正向';
        this.elements.game.enthalpyBadge.innerHTML = `
            <i class="fas ${isEndothermic ? 'fa-snowflake' : 'fa-fire'}"></i>
            <span>${isEndothermic ? '吸热反应' : '放热反应'}</span>
        `;
        this.elements.game.enthalpyBadge.title = thermoHint;
        this.elements.game.enthalpyBadge.classList.toggle('exothermic', !isEndothermic);

        // 设置投料按钮
        this.setupSpeciesButtons(level);

        // 设置操作按钮事件
        this.setupActionButtons();
        
        // 初始化GameActions
        GameActions.init();
    },

    /**
     * 渲染方程式
     */
    renderEquation(level) {
        const reactantsContainer = this.elements.game.reactants;
        const productsContainer = this.elements.game.products;

        reactantsContainer.innerHTML = '';
        productsContainer.innerHTML = '';

        // 渲染反应物
        level.reactants.forEach((species, index) => {
            if (index > 0) {
                const plus = document.createElement('span');
                plus.className = 'plus-sign';
                plus.textContent = '+';
                reactantsContainer.appendChild(plus);
            }
            
            const coef = level.coefficients[species];
            const span = document.createElement('span');
            span.className = 'chemical-species';
            span.innerHTML = (coef > 1 ? coef : '') + Utils.formatChemical(species);
            reactantsContainer.appendChild(span);
        });

        // 渲染产物
        level.products.forEach((species, index) => {
            if (index > 0) {
                const plus = document.createElement('span');
                plus.className = 'plus-sign';
                plus.textContent = '+';
                productsContainer.appendChild(plus);
            }
            
            const coef = level.coefficients[species];
            const span = document.createElement('span');
            span.className = 'chemical-species product';
            span.innerHTML = (coef > 1 ? coef : '') + Utils.formatChemical(species);
            productsContainer.appendChild(span);
        });
    },

    /**
     * 设置物种投料按钮
     */
    setupSpeciesButtons(level) {
        const container = document.getElementById('concentration-buttons');
        if (!container) return;
        
        container.innerHTML = '';

        const allSpecies = [...level.reactants, ...level.products];
        
        for (const species of allSpecies) {
            const btn = document.createElement('button');
            btn.className = 'species-btn';
            btn.id = 'btn-species-' + species;
            btn.dataset.species = species;

            const base = (window.Game?.state?.baseConcentrations?.[species] ?? level.initialConcentrations?.[species] ?? 1);
            const delta = base * 0.05;
            btn.innerHTML = `
                <div>${Utils.formatChemical(species)}</div>
                <div style="font-size: 11px; color: var(--text-muted);">+${Utils.formatNumber(delta, 2)} M (5%)</div>
                <div class="btn-cooldown"></div>
            `;
            
            btn.addEventListener('click', () => {
                GameActions.addSpecies(species);
            });
            
            container.appendChild(btn);
        }
    },

    /**
     * 设置操作按钮事件
     */
    setupActionButtons() {
        // 升温
        document.getElementById('btn-heat')?.addEventListener('click', () => {
            GameActions.heat();
        });

        // 降温
        document.getElementById('btn-cool')?.addEventListener('click', () => {
            GameActions.cool();
        });

        // 加压
        document.getElementById('btn-pressurize')?.addEventListener('click', () => {
            GameActions.pressurize();
        });

        // 减压
        document.getElementById('btn-depressurize')?.addEventListener('click', () => {
            GameActions.depressurize();
        });

        // 实时模式不允许主动结束回合：不绑定 btn-end-round
    },

    /**
     * AI动作脉冲动效
     */
    pulseAIAction() {
        const aiAvatar = document.querySelector('.player-avatar.ai');
        if (!aiAvatar) return;
        aiAvatar.classList.remove('ai-action-pulse');
        // 强制重启动画
        void aiAvatar.offsetWidth;
        aiAvatar.classList.add('ai-action-pulse');
        setTimeout(() => aiAvatar.classList.remove('ai-action-pulse'), 220);
    },

    /**
     * 设置浓度滑块
     */
    setupConcentrationSliders(level) {
        const container = this.elements.game.concentrationSliders;
        container.innerHTML = '';

        const allSpecies = [...level.reactants, ...level.products];
        
        for (const species of allSpecies) {
            const item = document.createElement('div');
            item.className = 'concentration-slider-item';
            
            const initialConc = level.initialConcentrations[species] || 0.5;
            
            item.innerHTML = `
                <span class="species-label">${Utils.formatChemical(species)}</span>
                <input type="range" class="conc-slider" 
                       data-species="${species}" 
                       min="0" max="100" value="${initialConc * 50}">
                <span class="conc-value">${initialConc.toFixed(2)} M</span>
            `;
            
            const slider = item.querySelector('.conc-slider');
            const valueSpan = item.querySelector('.conc-value');
            
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value) / 50;
                valueSpan.textContent = value.toFixed(2) + ' M';
                this.onConcentrationChange(species, value);
            });
            
            container.appendChild(item);
        }
    },

    /**
     * 温度变化处理
     */
    onTemperatureChange(sliderValue) {
        // 滑块值0-100映射到200-500K
        const temp = 200 + (sliderValue / 100) * 300;
        this.elements.game.tempValue.textContent = Math.round(temp);
        
        if (Game.isPlayerTurn) {
            Game.pendingChanges.temperature = temp;
            this.previewChanges();
        }
    },

    /**
     * 压强变化处理
     */
    onPressureChange(sliderValue) {
        // 滑块值0-100映射到10-500kPa
        const pressure = 10 + (sliderValue / 100) * 490;
        this.elements.game.pressureValue.textContent = Math.round(pressure);
        
        if (Game.isPlayerTurn) {
            Game.pendingChanges.pressure = pressure;
            this.previewChanges();
        }
    },

    /**
     * 浓度变化处理
     */
    onConcentrationChange(species, value) {
        if (Game.isPlayerTurn) {
            if (!Game.pendingChanges.concentrations) {
                Game.pendingChanges.concentrations = {};
            }
            Game.pendingChanges.concentrations[species] = value;
            this.previewChanges();
        }
    },

    /**
     * 预览改变效果
     */
    previewChanges() {
        if (!Game.state.levelData || !Game.isPlayerTurn) return;
        
        const level = Game.state.levelData;
        const changes = Game.pendingChanges;
        
        // 计算预览的K和Q
        const previewTemp = changes.temperature || Game.state.temperature;
        const previewConc = { ...Game.state.concentrations, ...changes.concentrations };
        
        const previewK = ChemistryEngine.calculateK(level, previewTemp);
        const previewQ = ChemistryEngine.calculateQ(level, previewConc);
        const previewShift = ChemistryEngine.calculateShift(previewK, previewQ);
        
        // 显示预览信息
        const previewInfo = document.getElementById('preview-info');
        if (previewInfo) {
            const direction = previewShift > 0 ? '正向' : '逆向';
            const magnitude = Math.abs(previewShift * 100).toFixed(1);
            previewInfo.innerHTML = `
                <i class="fas fa-eye"></i>
                预计效果: ${direction} ${magnitude}%
            `;
            previewInfo.style.display = 'block';
        }
    },

    /**
     * 更新回合信息
     */
    updateRoundInfo(current, total) {
        this.elements.game.currentRound.textContent = current;
        this.elements.game.totalRounds.textContent = total;
    },

    /**
     * 更新计时器
     */
    updateTimer(seconds) {
        const timerSpan = this.elements.game.turnTimer.querySelector('span');
        timerSpan.textContent = seconds;
        
        this.elements.game.turnTimer.classList.toggle('warning', seconds <= 10);

        // 倒计时提示音：进入最后 6 秒时仅播放一次
        if (seconds === 6) {
            AudioManager?.playTurnCountdownOnce?.();
        }
    },

    /**
     * 更新平衡指示器
     */
    updateBalanceIndicator(balance) {
        // balance: -1到1，转换为0%到100%
        const position = (balance + 1) / 2 * 100;
        
        AnimationManager.animateBalancePointer(
            this.elements.game.balancePointer, 
            position
        );

        // 更新左右填充
        if (balance < 0) {
            this.elements.game.balanceLeft.style.width = (-balance * 50) + '%';
            this.elements.game.balanceRight.style.width = '0%';
        } else {
            this.elements.game.balanceLeft.style.width = '0%';
            this.elements.game.balanceRight.style.width = (balance * 50) + '%';
        }
    },

    /**
     * 更新信息面板
     */
    updateInfoPanel(state) {
        if (!state) return;

        this.elements.game.equilibriumConstant.textContent = 
            'K = ' + (state.K >= 1000 || state.K <= 0.001 ? state.K.toExponential(2) : Utils.formatNumber(state.K, 3));
        this.elements.game.reactionQuotient.textContent = 
            'Q = ' + (state.Q >= 1000 || state.Q <= 0.001 ? state.Q.toExponential(2) : Utils.formatNumber(state.Q, 3));

        // 更新浓度列表
        const concList = this.elements.game.concentrationList;
        concList.innerHTML = '';

        const level = window.Game?.state?.levelData;
        const preferredSpecies = (level?.reactants && level?.products)
            ? [...level.reactants, ...level.products]
            : null;

        const entries = preferredSpecies
            ? preferredSpecies.map(species => [species, state.concentrations?.[species] ?? 0])
            : Object.entries(state.concentrations || {});

        for (const [species, conc] of entries) {
            const item = document.createElement('div');
            item.className = 'conc-item';
            item.innerHTML = `
                <span class="species">[${Utils.formatChemical(species)}]</span>
                <span class="value">${Utils.formatNumber(conc, 3)} M</span>
            `;
            concList.appendChild(item);
        }
    },

    /**
     * 更新卡牌状态
     */
    updateCardStatus() {
        document.querySelectorAll('.ability-card').forEach(card => {
            const ability = card.dataset.ability;
            const status = CardSystem.getCardStatus(ability, 'player');
            
            card.classList.toggle('on-cooldown', !status.available);
            
            const cooldownEl = card.querySelector('.card-cooldown');
            if (cooldownEl) {
                if (status.currentCooldown > 0) {
                    cooldownEl.style.width = (status.currentCooldown / status.cooldown * 100) + '%';
                } else {
                    cooldownEl.style.width = '0%';
                }
            }
        });
    },

    /**
     * 显示暂停菜单
     */
    showPauseMenu() {
        this.elements.game.pauseMenu.classList.add('active');
    },

    /**
     * 隐藏暂停菜单
     */
    hidePauseMenu() {
        this.elements.game.pauseMenu.classList.remove('active');
    },

    /**
     * 显示结果界面
     */
    showResult(result) {
        this.showScreen('resultScreen');

        const { victory, achievement, rounds, stars, level, score } = result;

        // 设置图标
        this.elements.result.icon.innerHTML = victory ? 
            '<i class="fas fa-trophy"></i>' : '<i class="fas fa-times"></i>';
        this.elements.result.icon.classList.toggle('defeat', !victory);

        // 设置标题
        this.elements.result.title.textContent = victory ? '胜利' : '失败';
        this.elements.result.title.classList.toggle('defeat', !victory);
        
        if (score) {
            this.elements.result.subtitle.textContent = `最终总分：玩家 ${Math.round(score.player)} vs AI ${Math.round(score.ai)}`;
        } else {
            this.elements.result.subtitle.textContent = victory ? 
                '成功控制化学平衡' : '平衡偏向了AI';
        }

        // 设置统计
        this.elements.result.achievement.textContent = Math.round(achievement) + '%';
        this.elements.result.rounds.textContent = rounds;

        // 设置星级
        const starsHtml = Array(3).fill(0).map((_, i) => 
            `<i class="fas fa-star" style="color: ${i < stars ? '#ffaa00' : '#333'}"></i>`
        ).join('');
        this.elements.result.stars.innerHTML = starsHtml;

        // 设置方程式
        this.elements.result.masteredEquation.innerHTML = level.displayEquation;

        // 播放特效
        if (victory) {
            AnimationManager.playVictoryEffect(document.getElementById('result-particles'));
        }

        // 实时更新主菜单的星数显示（摘星之路面板）
        this.updateStarProgressPanel();
    },

    /**
     * 高亮参数组
     */
    highlightParam(param) {
        document.querySelectorAll('.param-group').forEach(group => {
            group.classList.toggle('active', group.dataset.param === param);
        });
        this.focusedParam = param;
    },

    /**
     * 绑定创意工坊事件
     */
    bindWorkshopEvents() {
        const importBtn = document.getElementById('btn-import-level');
        const downloadBtn = document.getElementById('btn-download-level');
        const createBtn = document.getElementById('btn-create-template');
        const clearBtn = document.getElementById('btn-clear-workshop');
        const formatLink = document.getElementById('link-ccb-format');

        importBtn?.addEventListener('click', () => {
            AudioManager?.playSound?.('click');
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.ccb,application/json,.json';
            input.addEventListener('change', async () => {
                const file = input.files?.[0];
                if (!file) return;
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    const validation = WorkshopManager?.validateCCBData?.(data);
                    if (!validation?.valid) {
                        this.showMessage('导入失败: ' + (validation?.errors?.[0] || '格式不合法'), 'error');
                        return;
                    }
                    WorkshopManager.addLevel(data);
                    this.renderWorkshop();
                    this.showMessage('导入成功', 'success');
                } catch (e) {
                    this.showMessage('导入失败: ' + e.message, 'error');
                }
            });
            input.click();
        });

        downloadBtn?.addEventListener('click', () => {
            AudioManager?.playSound?.('click');
            this.promptText({
                title: '从网络下载关卡',
                label: '请输入 .ccb 的 URL（需返回 JSON）',
                placeholder: 'https://example.com/level.ccb'
            }).then((url) => {
                if (url) this.downloadWorkshopLevel(url);
            });
        });

        createBtn?.addEventListener('click', () => {
            AudioManager?.playSound?.('click');
            const template = WorkshopManager.createTemplate();
            WorkshopManager.addLevel(template);
            this.renderWorkshop();
            this.showMessage('已创建空白关卡模板');
        });

        clearBtn?.addEventListener('click', () => {
            AudioManager?.playSound?.('click');
            if (confirm('确定要清空所有创意工坊关卡吗？此操作不可撤销。')) {
                WorkshopManager.clearAll();
                this.renderWorkshop();
                this.showMessage('已清空所有创意工坊关卡');
            }
        });

        formatLink?.addEventListener('click', (e) => {
            e.preventDefault();
            AudioManager?.playSound?.('click');
            // TODO: 打开格式文档(需要 Electron 或 browser API)
            this.showMessage('请查看 docs/CCB_FILE_FORMAT.md 文件');
        });
    },

    /**
     * 渲染创意工坊
     */
    renderWorkshop() {
        const container = document.getElementById('workshop-levels');
        if (!container) return;

        const levels = WorkshopManager.getAllLevels();
        
        if (levels.length === 0) {
            container.innerHTML = `
                <div class="empty-hint">
                    <i class="fas fa-box-open"></i>
                    <p>还没有导入任何关卡</p>
                    <p>点击上方按钮导入或创建关卡</p>
                </div>
            `;
            return;
        }

        container.innerHTML = levels.map(level => this.createWorkshopLevelCard(level)).join('');

        // 绑定卡片事件
        container.querySelectorAll('.workshop-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                const levelId = btn.dataset.levelId;
                this.handleWorkshopAction(action, levelId);
            });
        });
    },

    /**
     * 创建工坊关卡卡片
     */
    createWorkshopLevelCard(level) {
        const aiLevel = Number(level?.difficulty?.aiLevel ?? 2);
        const difficulty = ['简单', '普通', '困难', 'C·C'][aiLevel - 1] || '未知';
        const id = level?.metadata?.id || '';
        const name = level?.metadata?.name || '未命名关卡';
        const author = level?.metadata?.author || '匿名';
        const version = level?.version || '-';
        return `
            <div class="workshop-level-card">
                <div class="workshop-level-icon">
                    <i class="fas fa-flask"></i>
                </div>
                <div class="workshop-level-info">
                    <div class="workshop-level-name">${name}</div>
                    <div class="workshop-level-meta">
                        <span><i class="fas fa-user"></i> ${author}</span>
                        <span><i class="fas fa-signal"></i> ${difficulty}</span>
                        <span><i class="fas fa-tag"></i> v${version}</span>
                        <span><i class="fas fa-fingerprint"></i> ${id}</span>
                    </div>
                </div>
                <div class="workshop-level-actions">
                    <button class="workshop-action-btn" data-action="play" data-level-id="${id}">
                        <i class="fas fa-play"></i> 试玩
                    </button>
                    <button class="workshop-action-btn" data-action="edit" data-level-id="${id}">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button class="workshop-action-btn" data-action="export" data-level-id="${id}">
                        <i class="fas fa-file-export"></i> 导出
                    </button>
                    <button class="workshop-action-btn delete" data-action="delete" data-level-id="${id}">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * 处理工坊操作
     */
    handleWorkshopAction(action, levelId) {
        AudioManager?.playSound?.('click');

        const levelData = WorkshopManager?.getLevel?.(levelId);

        switch (action) {
            case 'play':
                if (!levelData) {
                    this.showMessage('关卡不存在', 'error');
                    return;
                }

                // 将 CCB 结构转换为游戏关卡结构
                const level = {
                    id: levelData.metadata?.id,
                    category: 'custom',
                    name: levelData.metadata?.name || '自定义关卡',
                    description: levelData.metadata?.description || '',
                    equation: levelData.reaction?.displayEquation || '',
                    displayEquation: levelData.reaction?.displayEquation || '',
                    reactants: levelData.reaction?.reactants || [],
                    products: levelData.reaction?.products || [],
                    coefficients: levelData.reaction?.coefficients || {},
                    initialConcentrations: levelData.reaction?.initialConcentrations || {},
                    equilibriumConstant: levelData.reaction?.equilibriumConstant ?? 1,
                    deltaH: levelData.reaction?.deltaH ?? 0,
                    initialTemp: levelData.reaction?.initialTemp ?? levelData.reaction?.initialTemperature ?? 298,
                    initialPressure: levelData.reaction?.initialPressure ?? 101.325,
                    hasGas: !!levelData.reaction?.hasGas,
                    containerType: levelData.reaction?.containerType || 'rigid',
                    maxRounds: levelData.difficulty?.maxRounds ?? null
                };

                this.showScreen('gameScreen');
                Game.startCustomLevel(level);
                break;

            case 'edit':
                if (!levelData) {
                    this.showMessage('关卡不存在', 'error');
                    return;
                }

                if (window.electronAPI?.openLevelEditor) {
                    window.electronAPI.openLevelEditor(levelData);
                } else {
                    try {
                        sessionStorage.setItem('ccbalance_edit_level', JSON.stringify(levelData));
                        window.open('editor.html', '_blank');
                    } catch (e) {
                        this.showMessage('无法打开编辑器: ' + e.message, 'error');
                    }
                }
                break;
                
            case 'export':
                if (!levelData) {
                    this.showMessage('关卡不存在', 'error');
                    return;
                }

                try {
                    const content = JSON.stringify(levelData, null, 2);
                    const blob = new Blob([content], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    const safeName = (levelData.metadata?.name || levelId || 'level')
                        .toString()
                        .replace(/[\\/:*?"<>|]+/g, '_')
                        .slice(0, 80);
                    a.href = url;
                    a.download = `${safeName}.ccb`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                    this.showMessage('已导出 .ccb 文件', 'success');
                } catch (e) {
                    this.showMessage('导出失败: ' + e.message, 'error');
                }
                break;
                
            case 'delete':
                if (confirm('确定要删除这个关卡吗？')) {
                    WorkshopManager.deleteLevel(levelId);
                    this.renderWorkshop();
                    this.showMessage('已删除关卡', 'success');
                }
                break;
        }
    },

    /**
     * 从网络下载关卡
     */
    async downloadWorkshopLevel(url) {
        try {
            this.showMessage('正在下载关卡...');
            const result = await WorkshopManager.downloadFromURL(url);
            if (!result?.success) {
                const err = result?.errors?.join('；') || result?.error || '格式不合法或下载失败';
                this.showMessage('下载失败: ' + err, 'error');
                return;
            }
            WorkshopManager.addLevel(result.data);
            this.renderWorkshop();
            this.showMessage('关卡下载成功！', 'success');
        } catch (error) {
            this.showMessage('下载失败: ' + error.message, 'error');
            console.error('Download failed:', error);
        }
    },

    /**
     * 更新星级进度面板
     */
    updateStarProgress() {
        const totalStars = StorageManager.getTotalStars();
        const starCountDisplay = document.getElementById('star-count-display');
        const nextRewardText = document.getElementById('next-reward-text');
        const rewardBadge = document.getElementById('reward-badge');
        const progressFill = document.getElementById('next-reward-progress-fill');
        
        if (starCountDisplay) {
            starCountDisplay.textContent = totalStars;
        }
        
        // 定义奖励阈值
        const rewards = [
            { stars: 3, name: '绿色粒子' },
            { stars: 20, name: '铜色粒子' },
            { stars: 50, name: '银色粒子' },
            { stars: 90, name: '金色粒子' }
        ];
        
        // 找到下一个未达到的奖励
        let nextReward = null;
        let prevThreshold = 0;
        for (const reward of rewards) {
            if (totalStars < reward.stars) {
                nextReward = reward;
                break;
            }
            prevThreshold = reward.stars;
        }
        
        if (nextReward && nextRewardText) {
            const starsNeeded = nextReward.stars - totalStars;
            nextRewardText.textContent = `${starsNeeded}★ → ${nextReward.name}`;

            if (progressFill) {
                const span = Math.max(1, nextReward.stars - prevThreshold);
                const current = Math.max(0, totalStars - prevThreshold);
                const ratio = Math.max(0, Math.min(1, current / span));
                progressFill.style.width = `${Math.round(ratio * 100)}%`;
            }
        } else if (nextRewardText) {
            nextRewardText.textContent = '已达成所有奖励';

            if (progressFill) {
                progressFill.style.width = '100%';
            }
        }
        
        // 检查是否有可领取的奖励
        const claimedRewards = StorageManager.getClaimedRewards();
        let hasClaimable = false;
        for (const reward of rewards) {
            const rewardId = `reward-${reward.stars}`;
            if (totalStars >= reward.stars && !claimedRewards.includes(rewardId)) {
                hasClaimable = true;
                break;
            }
        }
        
        if (rewardBadge) {
            rewardBadge.style.display = hasClaimable ? 'flex' : 'none';
        }

        // 星级变化后，可能会影响皮肤解锁状态：同步刷新设置项
        this.refreshParticleSkinOptions?.();
    },

    /**
     * 分类栏：左右按钮滚动（隐藏原生滚动条）
     */
    bindCategoryTabsScroll() {
        const tabs = document.getElementById('category-tabs');
        const btnLeft = document.getElementById('btn-category-scroll-left');
        const btnRight = document.getElementById('btn-category-scroll-right');
        if (!tabs || !btnLeft || !btnRight) return;

        const updateButtons = () => {
            const canScroll = tabs.scrollWidth > tabs.clientWidth + 1;
            if (!canScroll) {
                btnLeft.style.display = 'none';
                btnRight.style.display = 'none';
                return;
            }

            const maxScrollLeft = tabs.scrollWidth - tabs.clientWidth;
            const atLeft = tabs.scrollLeft <= 1;
            const atRight = tabs.scrollLeft >= maxScrollLeft - 1;
            btnLeft.style.display = atLeft ? 'none' : 'flex';
            btnRight.style.display = atRight ? 'none' : 'flex';
        };

        const scrollByAmount = (dir) => {
            const amount = Math.max(160, Math.floor(tabs.clientWidth * 0.6));
            tabs.scrollBy({ left: dir * amount, behavior: 'smooth' });
        };

        btnLeft.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollByAmount(-1);
        });
        btnRight.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollByAmount(1);
        });

        tabs.addEventListener('scroll', () => updateButtons(), { passive: true });
        window.addEventListener('resize', () => updateButtons());

        // 初始状态
        updateButtons();
        // 字体加载或布局变化后再兜底刷新一次
        setTimeout(updateButtons, 250);
    },

    /**
     * 显示星级奖励界面
     */
    showStarRewards() {
        try {
            const screen = document.getElementById('star-rewards-screen');
            const timeline = document.getElementById('star-rewards-timeline');
            const countDisplay = document.getElementById('star-rewards-count');

            if (!screen || !timeline) return;

            const totalStars = StorageManager.getTotalStars();
            const claimedRewards = StorageManager.getClaimedRewards();
            const unlockedSkins = StorageManager.getUnlockedSkins();

            if (countDisplay) {
                countDisplay.textContent = totalStars;
            }

            // 定义奖励
            const rewards = [
                { stars: 3, name: '绿色粒子效果', icon: 'fa-star', skin: 'green' },
                { stars: 20, name: '铜色粒子效果', icon: 'fa-star', skin: 'bronze' },
                { stars: 50, name: '银色粒子效果', icon: 'fa-star', skin: 'silver' },
                { stars: 90, name: '金色粒子效果', icon: 'fa-star', skin: 'gold' }
            ];

            // 生成时间轴
            timeline.innerHTML = '';
            rewards.forEach(reward => {
                const rewardId = `reward-${reward.stars}`;
                const isUnlocked = unlockedSkins.includes(reward.skin);
                const isClaimable = totalStars >= reward.stars && !claimedRewards.includes(rewardId);

                let statusClass = 'locked';
                let statusText = '未达成';
                if (isClaimable) {
                    statusClass = 'claimable';
                    statusText = '可领取';
                } else if (isUnlocked) {
                    statusClass = 'unlocked';
                    statusText = '已解锁';
                }

                const milestone = document.createElement('div');
                milestone.className = `reward-milestone ${statusClass}`;
                milestone.innerHTML = `
                    <div class="reward-icon-container">
                        <i class="fas ${reward.icon}"></i>
                    </div>
                    <div class="reward-info">
                        <div class="reward-stars">
                            <i class="fas fa-star"></i>
                            <span>${reward.stars}</span>
                        </div>
                        <div class="reward-name">${reward.name}</div>
                        <div class="reward-status ${statusClass}">${statusText}</div>
                    </div>
                `;

                // 点击领取奖励
                if (isClaimable) {
                    milestone.style.cursor = 'pointer';
                    milestone.addEventListener('click', (ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        StorageManager.claimReward(rewardId);
                        StorageManager.unlockSkin(reward.skin);
                        this.showStarRewards(); // 刷新界面
                        this.updateStarProgress();
                        this.refreshParticleSkinOptions?.();
                        Utils.showToast(`已解锁 ${reward.name}！`, 'success');
                    });
                }

                timeline.appendChild(milestone);
            });

            // 显示界面
            screen.style.display = 'flex';
            // modal-overlay 通过 .active 控制可见性
            requestAnimationFrame(() => {
                screen.classList.add('active');
            });
        } catch (error) {
            console.error('showStarRewards failed:', error);
            Utils.showToast?.('打开摘星之路失败：' + (error?.message || String(error)), 'error');
        }
    }
};

// 导出
window.UIManager = UIManager;
