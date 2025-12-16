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
        this.renderAboutCard();
    },

    /**
     * 渲染“关于”信息（自动读取版本，不硬编码）
     */
    async renderAboutCard() {
        const el = document.getElementById('about-info');
        if (!el) return;

        const info = await window.electronAPI?.getAppInfo?.();
        if (!info || info.error) {
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
            settingsScreen: document.getElementById('settings-screen')
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
            resetProgress: document.getElementById('btn-reset-progress')
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
        document.getElementById('toggle-info')?.addEventListener('click', () => {
            this.elements.game.infoPanel?.classList.toggle('collapsed');
        });

        // 侧边栏收起后：点击侧边栏任意位置展开
        this.elements.game.infoPanel?.addEventListener('click', () => {
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

        // 波纹效果
        document.querySelectorAll('.menu-btn, .action-btn, .category-tab').forEach(btn => {
            btn.addEventListener('click', (e) => Utils.createRipple(e, btn));
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

            container.appendChild(card);
        }
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
        this.elements.game.enthalpyBadge.innerHTML = `
            <i class="fas ${isEndothermic ? 'fa-snowflake' : 'fa-fire'}"></i>
            <span>${isEndothermic ? '吸热反应' : '放热反应'}</span>
        `;
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
        
        for (const [species, conc] of Object.entries(state.concentrations)) {
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
    },

    /**
     * 高亮参数组
     */
    highlightParam(param) {
        document.querySelectorAll('.param-group').forEach(group => {
            group.classList.toggle('active', group.dataset.param === param);
        });
        this.focusedParam = param;
    }
};

// 导出
window.UIManager = UIManager;
