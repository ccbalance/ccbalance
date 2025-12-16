/**
 * CCBalance - 音频管理模块
 * 统一管理背景音乐(BGM)与音效(SFX)，支持音量设置与渐入渐出。
 */

const AudioManager = {
    // 音量（0-1）
    _sfxVolume: 0.8,
    _bgmVolume: 0.6,

    // BGM
    _currentBgm: null,
    _currentBgmSrc: null,
    _fadeTimer: null,
    _desiredBgmSrc: null,

    // in-game 曲目避免重复
    _lastInGameTrack: null,

    // SFX 预加载缓存
    _sfxCache: new Map(),

    // 产气体音效：需要可中断
    _steamAudio: null,

    // 防止计时器提示音重复
    _timerCountdownPlayed: false,

    // 资源清单
    SFX: {
        button: 'assets/audio-assets/efforts/any-button-press.mp3',
        gameWin: 'assets/audio-assets/efforts/game-win.mp3',
        gameLose: 'assets/audio-assets/efforts/game-lose.mp3',
        turnStart: 'assets/audio-assets/efforts/turn-start.mp3',
        turnWin: 'assets/audio-assets/efforts/turn-win.mp3',
        turnLose: 'assets/audio-assets/efforts/turn-lose.mp3',
        turnCountdown: 'assets/audio-assets/efforts/turn-countdown.mp3',
        steamProducing: 'assets/audio-assets/efforts/steam-producing.mp3'
    },

    BGM: {
        main: 'assets/audio-assets/backgrounds/main/between-sky-and-water.mp3',
        inGameTracks: [
            'assets/audio-assets/backgrounds/in-game/a-quiet-joy-stevekaldes-piano.mp3',
            'assets/audio-assets/backgrounds/in-game/april.mp3',
            'assets/audio-assets/backgrounds/in-game/calm-heavenly-raindrops.mp3',
            'assets/audio-assets/backgrounds/in-game/coniferous-forest.mp3',
            'assets/audio-assets/backgrounds/in-game/cozy-morning-instrumental.mp3',
            'assets/audio-assets/backgrounds/in-game/perfect-beauty.mp3',
            'assets/audio-assets/backgrounds/in-game/plea-for-forgiveness-stevekaldes-piano-art-ayla-heefner.mp3',
            'assets/audio-assets/backgrounds/in-game/snow-stevekaldes-piano.mp3'
        ]
    },

    init() {
        // 绑定一次即可（全局按钮点击音效）
        this._bindGlobalButtonClickSfx();

        // 尝试在首次用户交互时解锁自动播放
        const unlock = () => {
            this._tryPlayDesiredBgm();
        };
        window.addEventListener('pointerdown', unlock, { once: true, capture: true });
        window.addEventListener('keydown', unlock, { once: true, capture: true });

        // 初始化音量
        const settings = window.StorageManager?.getSettings?.();
        if (settings) {
            this.setSfxVolume(settings.sfxVolume);
            this.setBgmVolume(settings.bgmVolume);
        }
    },

    applySettings(settings) {
        if (!settings) return;
        this.setSfxVolume(settings.sfxVolume);
        this.setBgmVolume(settings.bgmVolume);
    },

    setSfxVolume(volume0to100) {
        const v = Number(volume0to100);
        if (!Number.isFinite(v)) return;
        this._sfxVolume = Math.max(0, Math.min(1, v / 100));
    },

    setBgmVolume(volume0to100) {
        const v = Number(volume0to100);
        if (!Number.isFinite(v)) return;
        this._bgmVolume = Math.max(0, Math.min(1, v / 100));
        if (this._currentBgm) {
            // 维持当前相对音量：直接设置到目标音量
            this._currentBgm.volume = this._bgmVolume;
        }
    },

    /**
     * 播放音效（短音）
     */
    playSfx(src, { volume = 1.0 } = {}) {
        if (!src) return;
        if (this._sfxVolume <= 0) return;

        // 允许重叠播放：克隆缓存 Audio
        const base = this._getOrCreateSfx(src);
        const audio = base.cloneNode(true);
        audio.volume = Math.max(0, Math.min(1, volume)) * this._sfxVolume;
        audio.play().catch(() => {
            // 忽略自动播放限制等错误
        });
    },

    playButtonClick() {
        this.playSfx(this.SFX.button, { volume: 1.0 });
    },

    playTurnStart() {
        this.playSfx(this.SFX.turnStart, { volume: 1.0 });
        this._timerCountdownPlayed = false;
    },

    playTurnCountdownOnce() {
        if (this._timerCountdownPlayed) return;
        this._timerCountdownPlayed = true;
        this.playSfx(this.SFX.turnCountdown, { volume: 1.0 });
    },

    playTurnResult(playerScore, aiScore) {
        if (playerScore === aiScore) return;
        this.playSfx(playerScore > aiScore ? this.SFX.turnWin : this.SFX.turnLose, { volume: 1.0 });
    },

    playGameResult(playerWins) {
        this.playSfx(playerWins ? this.SFX.gameWin : this.SFX.gameLose, { volume: 1.0 });
    },

    playSteamProducing() {
        if (this._sfxVolume <= 0) return;

        // 先中断旧的
        this.stopSteamProducing();

        const audio = new Audio(this.SFX.steamProducing);
        audio.volume = 0.9 * this._sfxVolume;
        audio.play().catch(() => {
            // ignore
        });

        this._steamAudio = audio;
    },

    stopSteamProducing() {
        if (!this._steamAudio) return;
        try {
            this._steamAudio.pause();
            this._steamAudio.currentTime = 0;
        } catch {
            // ignore
        }
        this._steamAudio = null;
    },

    /**
     * 播放主页 BGM（循环）
     */
    playMainMenuBgm({ fadeMs = 800 } = {}) {
        this._playBgm(this.BGM.main, { loop: true, fadeMs });
    },

    /**
     * 播放关卡 BGM：in-game 随机单曲循环，避免与上一次重复
     */
    playInGameBgm({ fadeMs = 800 } = {}) {
        const tracks = this.BGM.inGameTracks;
        if (!tracks.length) return;

        let pick = tracks[Math.floor(Math.random() * tracks.length)];
        if (tracks.length > 1 && pick === this._lastInGameTrack) {
            const alt = tracks.filter(t => t !== this._lastInGameTrack);
            pick = alt[Math.floor(Math.random() * alt.length)];
        }
        this._lastInGameTrack = pick;
        this._playBgm(pick, { loop: true, fadeMs });
    },

    stopBgm({ fadeMs = 500 } = {}) {
        if (!this._currentBgm) return;
        this._playBgm(null, { fadeMs });
    },

    /**
     * 内部：切换 BGM，并执行渐入渐出。
     */
    _playBgm(nextSrc, { loop = true, fadeMs = 800 } = {}) {
        if (nextSrc && nextSrc === this._currentBgmSrc && this._currentBgm && !this._currentBgm.paused) {
            // 已在播放同一首
            return;
        }

        // 若当前环境禁止自动播放，先记录期望曲目，等用户交互再试
        this._desiredBgmSrc = nextSrc;

        // 立即停止任何正在进行的淡入淡出
        if (this._fadeTimer) {
            clearInterval(this._fadeTimer);
            this._fadeTimer = null;
        }

        const oldAudio = this._currentBgm;
        const oldSrc = this._currentBgmSrc;

        if (!nextSrc) {
            // 仅淡出并停止
            if (!oldAudio) return;
            this._fadeTimer = this._fadeOutAndStop(oldAudio, fadeMs, () => {
                if (this._currentBgm === oldAudio) {
                    this._currentBgm = null;
                    this._currentBgmSrc = null;
                }
                this._fadeTimer = null;
            });
            return;
        }

        const nextAudio = new Audio(nextSrc);
        nextAudio.loop = !!loop;
        nextAudio.volume = 0;

        const startNext = () => {
            const playPromise = nextAudio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {
                    // 自动播放受限：保持 desired，不打断 UI
                });
            }
        };

        startNext();

        this._currentBgm = nextAudio;
        this._currentBgmSrc = nextSrc;

        // 同时淡出旧、淡入新
        const steps = Math.max(1, Math.floor(fadeMs / 30));
        let i = 0;

        this._fadeTimer = setInterval(() => {
            i++;
            const t = Math.min(1, i / steps);
            nextAudio.volume = this._bgmVolume * t;

            if (oldAudio && oldSrc) {
                oldAudio.volume = this._bgmVolume * (1 - t);
            }

            if (t >= 1) {
                clearInterval(this._fadeTimer);
                this._fadeTimer = null;

                if (oldAudio && oldSrc) {
                    try { oldAudio.pause(); } catch { /* ignore */ }
                    oldAudio.currentTime = 0;
                }

                nextAudio.volume = this._bgmVolume;
                this._desiredBgmSrc = null;
            }
        }, 30);
    },

    _fadeOutAndStop(audio, fadeMs, onDone) {
        const steps = Math.max(1, Math.floor(fadeMs / 30));
        let i = 0;
        const startVol = audio.volume;

        const intervalId = setInterval(() => {
            i++;
            const t = Math.min(1, i / steps);
            audio.volume = startVol * (1 - t);
            if (t >= 1) {
                try { audio.pause(); } catch { /* ignore */ }
                audio.currentTime = 0;
                clearInterval(intervalId);
                onDone?.();
            }
        }, 30);

        return intervalId;
    },

    _tryPlayDesiredBgm() {
        if (!this._desiredBgmSrc) return;
        // 触发一次重新切换即可
        const src = this._desiredBgmSrc;
        this._playBgm(src, { loop: true, fadeMs: 0 });
        this._desiredBgmSrc = null;
    },

    _getOrCreateSfx(src) {
        const cached = this._sfxCache.get(src);
        if (cached) return cached;

        const audio = new Audio(src);
        audio.preload = 'auto';
        this._sfxCache.set(src, audio);
        return audio;
    },

    _bindGlobalButtonClickSfx() {
        // 捕获阶段，确保任何按钮都能触发（即使 stopPropagation）
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (!(target instanceof Element)) return;

            // 排除范围滑块/输入框等
            const ignore = target.closest('input[type="range"], input[type="checkbox"], input[type="text"], textarea, select');
            if (ignore) return;

            const clickable = target.closest(
                'button, a, [role="button"], .menu-btn, .action-btn, .back-btn, .filter-btn, .diff-btn, .category-tab, .ability-card, .title-btn'
            );
            if (!clickable) return;

            // disabled 状态不播放
            if (clickable instanceof HTMLButtonElement && clickable.disabled) return;
            if (clickable.classList.contains('disabled')) return;

            this.playButtonClick();
        }, true);
    }
};

window.AudioManager = AudioManager;
