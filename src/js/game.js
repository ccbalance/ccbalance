/**
 * CCBalance - 主游戏模块
 * 游戏主循环和状态管理
 */

const Game = {
    // 游戏状态
    state: {
        currentLevel: null,
        levelData: null,
        round: 0,
        maxRounds: 10,
        isRunning: false,
        isPaused: false,
        gameMode: 'pvai',
        
        // 化学状态
        temperature: 298, // K
        pressure: 101.325, // kPa
        concentrations: {},
        baseConcentrations: {},
        equilibriumConstant: 1,
        reactionQuotient: 1,
        
        // 目标
        playerGoal: 'forward', // 'forward' 或 'reverse'
        aiGoal: 'reverse',

        // 计分
        playerTotalScore: 0,
        aiTotalScore: 0,
        
        // 历史记录
        history: []
    },

    // 待确认的改变
    pendingChanges: {},

    // 计时器
    timer: null,
    turnTimeLeft: 30,
    
    // 粒子系统
    particleSystem: null,

    /**
     * 初始化游戏
     */
    init() {
        this.reset();
    },

    /**
     * 重置游戏状态
     */
    reset() {
        this.state = {
            currentLevel: null,
            levelData: null,
            round: 0,
            maxRounds: 10,
            isRunning: false,
            isPaused: false,
            gameMode: 'pvai',
            temperature: 298,
            pressure: 101.325,
            concentrations: {},
            baseConcentrations: {},
            equilibriumConstant: 1,
            reactionQuotient: 1,
            playerGoal: 'forward',
            aiGoal: 'reverse',
            playerTotalScore: 0,
            aiTotalScore: 0,
            history: []
        };
        this.pendingChanges = {};
        this.stopTimer();
        this.stopAIRealtime(); // 停止AI实时决策
        // 停止所有正在播放的短音效，防止退出/重置后音效残留
        AudioManager?.stopAllSfx?.();
    },

    /**
     * 开始关卡
     */
    startLevel(levelId) {
        this.reset();
        
        const level = LevelData.getLevelById(levelId);
        if (!level) {
            Utils.showToast('关卡不存在', 'error');
            return false;
        }

        this.state.currentLevel = levelId;
        this.state.levelData = level;
        const settings = StorageManager.getSettings();
        const settingsRounds = Number.isFinite(settings.roundsPerLevel) ? settings.roundsPerLevel : 10;
        this.state.maxRounds = level.maxRounds ?? settingsRounds;

        // 初始化化学状态
        this.state.temperature = level.initialTemperature || level.initialTemp || 298;
        this.state.pressure = level.initialPressure || 101.325;
        this.state.volume = level.initialVolume || 1.0;  // 初始体积1L

        // 计算当前温度下的K，并生成满足 Q=K 的基准初始浓度
        this.state.equilibriumConstant = ChemistryEngine.calculateK(level, this.state.temperature);
        this.state.baseConcentrations = LevelData.adjustInitialConcentrations(level, this.state.temperature);
        this.state.concentrations = { ...this.state.baseConcentrations };

        // 初始化计分
        this.state.playerTotalScore = 0;
        this.state.aiTotalScore = 0;

        // 随机分配目标
        this.assignGoals();

        // 与普通关卡保持一致：能力卡/AI分析依赖 AISystem.goal
        AISystem.setGoal?.(this.state.aiGoal);

        // 关键：能力卡（如热交换）会读取 AISystem.goal，必须与 aiGoal 同步
        AISystem.setGoal?.(this.state.aiGoal);

        // 设置UI
        UIManager.setupGameUI(level, this.state.playerGoal, this.state.aiGoal);
        UIManager.updateRoundInfo(1, this.state.maxRounds);

        // 初始化图表
        const allSpecies = [...level.reactants, ...level.products];
        ChartRenderer.reset(allSpecies);
        
        // 初始化粒子系统
        this.initParticleSystem();

        // 初始化AI
        AISystem.init(level);
        AISystem.setGoal?.(this.state.aiGoal);

        // 关卡背景音乐：随机一首 in-game 单曲循环
        AudioManager?.playInGameBgm?.({ fadeMs: 800 });

        // 重置卡牌系统
        CardSystem.reset();

        // 重置键盘处理
        KeyboardHandler.reset();

        // 开始游戏
        this.state.isRunning = true;
        this.state.round = 1;

        // 更新初始状态
        this.updateState();
        this.startTurn();

        return true;
    },

    /**
     * 试玩/游玩自定义关卡（来自创意工坊 .ccb）
     */
    startCustomLevel(level) {
        this.reset();

        if (!level || typeof level !== 'object') {
            Utils.showToast('关卡数据无效', 'error');
            return false;
        }

        this.state.currentLevel = level.id || 'custom';
        this.state.levelData = level;

        const settings = StorageManager.getSettings();
        const settingsRounds = Number.isFinite(settings.roundsPerLevel) ? settings.roundsPerLevel : 10;
        this.state.maxRounds = level.maxRounds ?? settingsRounds;

        this.state.temperature = level.initialTemperature || level.initialTemp || 298;
        this.state.pressure = level.initialPressure || 101.325;
        this.state.volume = level.initialVolume || 1.0;

        this.state.equilibriumConstant = ChemistryEngine.calculateK(level, this.state.temperature);
        this.state.baseConcentrations = LevelData.adjustInitialConcentrations(level, this.state.temperature);
        this.state.concentrations = { ...this.state.baseConcentrations };

        this.state.playerTotalScore = 0;
        this.state.aiTotalScore = 0;

        this.assignGoals();

        UIManager.setupGameUI(level, this.state.playerGoal, this.state.aiGoal);
        UIManager.updateRoundInfo(1, this.state.maxRounds);

        const allSpecies = [...(level.reactants || []), ...(level.products || [])];
        ChartRenderer.reset(allSpecies);

        this.initParticleSystem();

        AISystem.init(level);
        AISystem.setGoal?.(this.state.aiGoal);
        AudioManager?.playInGameBgm?.({ fadeMs: 800 });
        CardSystem.reset();
        KeyboardHandler.reset();

        this.state.isRunning = true;
        this.state.round = 1;

        this.updateState();
        this.startTurn();

        return true;
    },

    /**
     * 分配目标
     */
    assignGoals() {
        // 随机决定玩家目标
        if (Math.random() < 0.5) {
            this.state.playerGoal = 'forward';
            this.state.aiGoal = 'reverse';
        } else {
            this.state.playerGoal = 'reverse';
            this.state.aiGoal = 'forward';
        }
    },

    /**
     * 开始回合（实时模式）
     */
    startTurn() {
        if (!this.state.isRunning) return;

        UIManager.updateCardStatus();

        // 实时模式：启动回合计时器，玩家和AI同时行动
        const settings = StorageManager.getSettings();
        this.turnTimeLeft = settings.turnTime || 30;
        this.startTimer();
        
        // 启动AI实时决策
        this.startAIRealtime();
        
        // 播放提示音效
        AudioManager?.playTurnStart?.();
        Utils.showToast('回合开始 - 与AI实时对战！', 'info');
    },
    
    /**
     * 开始计时器
     */
    startTimer() {
        this.stopTimer();
        
        this.timer = setInterval(() => {
            this.turnTimeLeft--;
            UIManager.updateTimer(this.turnTimeLeft);
            
            if (this.turnTimeLeft <= 0) {
                this.endRound(); // 超时自动结束回合
            }
        }, 1000);
    },

    /**
     * 停止计时器
     */
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    },

    /**
     * 启动AI实时决策系统
     */
    startAIRealtime() {
        this.stopAIRealtime();

        const settings = StorageManager.getSettings();
        const difficulty = settings.difficulty || 2;
        const intervalMs = difficulty >= 4 ? 260 : (difficulty === 3 ? 420 : (difficulty === 2 ? 650 : 1200));
        
        // AI按难度定频检查是否可以执行操作
        this.aiTimer = setInterval(() => {
            if (!this.state.isRunning || this.state.isPaused) return;
            
            this.executeAIAction();
        }, intervalMs);
    },

    /**
     * 停止AI实时决策
     */
    stopAIRealtime() {
        if (this.aiTimer) {
            clearInterval(this.aiTimer);
            this.aiTimer = null;
        }
    },

    /**
     * 执行AI操作（实时模式）
     */
    executeAIAction() {
        const level = this.state.levelData;
        const settings = StorageManager.getSettings();
        const difficulty = settings.difficulty || 2;

        // 持续同步，避免中途状态不一致导致卡牌方向反了
        AISystem.setGoal?.(this.state.aiGoal);
        
        // AI分析当前状态
        const gameState = {
            concentrations: this.state.concentrations,
            baseConcentrations: this.state.baseConcentrations,
            temperature: this.state.temperature,
            pressure: this.state.pressure,
            equilibriumConstant: this.state.equilibriumConstant,
            reactionQuotient: this.state.reactionQuotient,
            goal: this.state.aiGoal,
            round: this.state.round,
            maxRounds: this.state.maxRounds,
            aiAbilities: this.state.aiAbilities
        };
        
        const action = AISystem.selectBestAction(gameState, level, difficulty);
        
        if (!action) return;
        
        // 使用GameActions执行操作（受CD限制）
        switch (action.type) {
            case 'addSpecies':
                if (action.species) {
                    GameActions.addSpecies(action.species, true); // true表示AI操作
                }
                break;
            case 'heat':
                GameActions.heat(true);
                break;
            case 'cool':
                GameActions.cool(true);
                break;
            case 'pressurize':
                GameActions.pressurize(true);
                break;
            case 'depressurize':
                GameActions.depressurize(true);
                break;
            case 'card':
                if (action.cardId) {
                    this.useAbilityCard(action.cardId, 'ai');
                }
                break;
        }
    },

    /**
     * 确认回合（已废弃 - 实时模式不需要）
     */
    confirmTurn() {
        // 实时模式下不需要确认回合
        return;
    },

    /**
     * 重置回合（已废弃 - 实时模式不需要）
     */
    resetTurn() {
        // 实时模式下不需要重置回合
        return;
    },

    /**
     * 执行AI回合（已废弃 - 实时模式改用executeAIAction）
     */
    executeAITurn() {
        // 已废弃，改用实时AI决策
        return;
    },

    /**
     * 执行AI操作（已废弃 - 实时模式改用executeAIAction）
     */
    executeAIActions() {
        // 已废弃，改用实时AI决策
        return;
    },

    /**
     * 结束回合（实时模式：只在计时器到时调用）
     */
    endRound() {
        if (!this.state.isRunning) return;
        
        // 停止计时器和AI决策
        this.stopTimer();
        this.stopAIRealtime();
        
        // 直接结算回合
        this.settleRound();
    },

    /**
     * 结算回合
     */
    settleRound() {
        // 回合结束：若仍在播放产气体音效则中断
        AudioManager?.stopSteamProducing?.();

        // 计算平衡偏移
        const K = this.state.equilibriumConstant;
        const Q = this.state.reactionQuotient;
        const shift = ChemistryEngine.calculateShift(K, Q);
        
        // 根据偏移计分
        const playerScore = this.calculateRoundScore(shift, this.state.playerGoal);
        const aiScore = this.calculateRoundScore(shift, this.state.aiGoal);

        this.state.playerTotalScore += playerScore;
        this.state.aiTotalScore += aiScore;
        
        // 显示回合结算
        this.showRoundResult(playerScore, aiScore, shift);

        // 回合胜负音效
        AudioManager?.playTurnResult?.(playerScore, aiScore);
        
        // 下一回合
        setTimeout(() => {
            this.nextRound();
        }, 2000);
    },

    /**
     * 计算回合得分
     */
    calculateRoundScore(shift, goal) {
        if (shift === 0) return 5; // 平衡状态，双方都得基础分
        
        const shiftDir = shift > 0 ? 'forward' : 'reverse';
        if (shiftDir === goal) {
            // 朝向目标方向，得分
            return 10 + Math.min(Math.abs(shift) * 10, 20);
        } else {
            // 反方向，失分
            return Math.max(0, 5 - Math.abs(shift) * 5);
        }
    },

    /**
     * 显示回合结算
     */
    showRoundResult(playerScore, aiScore, shift) {
        const overlay = document.createElement('div');
        overlay.className = 'round-result-overlay';
        overlay.innerHTML = `
            <div class="round-result-box">
                <h2>回合 ${this.state.round} 结算</h2>
                <div class="round-scores">
                    <div class="score-item player">
                        <div class="score-label">玩家得分</div>
                        <div class="score-value">+${playerScore.toFixed(0)}</div>
                    </div>
                    <div class="score-item ai">
                        <div class="score-label">AI得分</div>
                        <div class="score-value">+${aiScore.toFixed(0)}</div>
                    </div>
                </div>
                <div class="round-scores" style="margin-top: 14px;">
                    <div class="score-item player">
                        <div class="score-label">玩家总分</div>
                        <div class="score-value">${this.state.playerTotalScore.toFixed(0)}</div>
                    </div>
                    <div class="score-item ai">
                        <div class="score-label">AI总分</div>
                        <div class="score-value">${this.state.aiTotalScore.toFixed(0)}</div>
                    </div>
                </div>
                <div class="shift-indicator">
                    <div class="shift-label">平衡偏移</div>
                    <div class="shift-value ${shift > 0 ? 'forward' : shift < 0 ? 'reverse' : 'equilibrium'}">
                        ${shift > 0 ? '正向 ►' : shift < 0 ? '◄ 逆向' : '⚖ 平衡'}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            overlay.remove();
        }, 1800);
    },

    /**
     * 应用改变
     */
    applyChanges(changes) {
        if (changes.temperature !== undefined) {
            this.state.temperature = changes.temperature;
        }
        if (changes.pressure !== undefined) {
            this.state.pressure = changes.pressure;
        }
        if (changes.concentrations) {
            Object.assign(this.state.concentrations, changes.concentrations);
        }

        // 记录历史
        this.state.history.push({
            round: this.state.round,
            actor: changes?._actor || 'player',
            changes: { ...changes },
            timestamp: Date.now()
        });
    },

    /**
     * 更新状态
     */
    updateState() {
        const level = this.state.levelData;
        if (!level) return;

        // 重新计算平衡常数(温度依赖)
        this.state.equilibriumConstant = ChemistryEngine.calculateK(
            level, 
            this.state.temperature
        );

        // 计算反应商
        this.state.reactionQuotient = ChemistryEngine.calculateQ(
            level,
            this.state.concentrations
        );

        // 计算平衡移动方向和幅度
        const shift = ChemistryEngine.calculateShift(
            this.state.equilibriumConstant,
            this.state.reactionQuotient
        );

        // 更新UI
        UIManager.updateBalanceIndicator(shift);
        UIManager.updateInfoPanel({
            K: this.state.equilibriumConstant,
            Q: this.state.reactionQuotient,
            concentrations: this.state.concentrations,
            temperature: this.state.temperature,
            pressure: this.state.pressure
        });

        // 更新图表
        ChartRenderer.addDataPoint(
            this.state.concentrations,
            Math.abs(shift) < 0.1
        );

        // 应用催化剂效果
        CardSystem.applyActiveEffects(this.state);
    },

    /**
     * 下一回合
     */
    nextRound() {
        this.state.round++;

        // 检查是否达到最大回合（先判断，避免更新 UI 到不存在的回合）
        if (this.state.round > this.state.maxRounds) {
            this.endGame();
            return;
        }

        UIManager.updateRoundInfo(this.state.round, this.state.maxRounds);

        const level = this.state.levelData;

        // 重置状态到初始值（每回合都按当前温度下的K生成基准初始浓度）
        this.state.temperature = level.initialTemperature || level.initialTemp || 298;
        this.state.pressure = level.initialPressure || 101.325;

        this.state.equilibriumConstant = ChemistryEngine.calculateK(level, this.state.temperature);
        this.state.baseConcentrations = LevelData.adjustInitialConcentrations(level, this.state.temperature);
        this.state.concentrations = { ...this.state.baseConcentrations };

        // 重新计算平衡
        this.updateState();

        // 重置操作冷却（仅玩家）
        GameActions.resetCooldowns(false);
        
        // 更新UI显示
        UIManager.updateInfoPanel({
            K: this.state.equilibriumConstant,
            Q: this.state.reactionQuotient,
            concentrations: this.state.concentrations,
            temperature: this.state.temperature,
            pressure: this.state.pressure
        });
        
        const tempValueEl = document.getElementById('temp-value');
        const pressureValueEl = document.getElementById('pressure-value');
        if (tempValueEl) tempValueEl.textContent = Math.round(this.state.temperature);
        if (pressureValueEl) pressureValueEl.textContent = Math.round(this.state.pressure);

        // 更新卡牌冷却
        CardSystem.reduceCooldowns();

        this.startTurn();
    },

    /**
     * 结束游戏
     */
    endGame(playerWins = null) {
        // 游戏结束：中断持续类音效并停止所有短音效
        AudioManager?.stopSteamProducing?.();
        AudioManager?.stopAllSfx?.();

        this.state.isRunning = false;
        this.stopTimer();
        this.stopAIRealtime();

        // 如果没有指定,根据总分判断
        if (playerWins === null) {
            playerWins = this.state.playerTotalScore >= this.state.aiTotalScore;
        }

        // 计算星级
        const stars = this.calculateStars(playerWins);

        // 保存进度
        if (playerWins) {
            StorageManager.completeLevel(this.state.currentLevel, stars);
            StorageManager.unlockEquation(this.state.currentLevel);
            
            // 解锁下一关
            const nextLevel = this.state.currentLevel + 1;
            if (LevelData.getLevelById(nextLevel)) {
                StorageManager.unlockLevel(nextLevel);
            }
        }

        // 显示结果
        const maxPerRound = 30;
        const maxScore = Math.max(1, this.state.maxRounds * maxPerRound);
        const achievement = playerWins
            ? Math.min(100, (this.state.playerTotalScore / maxScore) * 100)
            : Math.min(100, (this.state.aiTotalScore / maxScore) * 100);

        const result = {
            victory: playerWins,
            achievement,
            rounds: this.state.maxRounds,
            stars: stars,
            level: this.state.levelData,
            score: {
                player: this.state.playerTotalScore,
                ai: this.state.aiTotalScore
            }
        };

        UIManager.showResult(result);

        // 播放胜负音效
        AudioManager?.playGameResult?.(playerWins);
    },

    /**
     * 计算星级
     */
    calculateStars(victory) {
        if (!victory) return 0;

        let stars = 1; // 基础1星

        const diff = this.state.playerTotalScore - this.state.aiTotalScore;
        if (diff >= 10) stars++;
        if (diff >= 30) stars++;

        return Math.min(3, stars);
    },

    /**
     * 使用能力
     */
    useAbility(ability) {
        if (!this.state.isRunning || this.state.isPaused) return;

        const success = CardSystem.useCard(ability, 'player', this.state);
        
        if (success) {
            UIManager.updateCardStatus();
            this.updateState();
            Utils.showToast(`使用了 ${CardSystem.cards[ability].name}`, 'success');
        }
    },

    /**
     * 切换暂停
     */
    togglePause() {
        if (!this.state.isRunning) return;

        this.state.isPaused = !this.state.isPaused;

        if (this.state.isPaused) {
            this.stopTimer();
            this.stopAIRealtime();
            UIManager.showPauseMenu();
        } else {
            UIManager.hidePauseMenu();
            this.startTimer();
            this.startAIRealtime();
        }
    },

    /**
     * 重新开始
     */
    restart() {
        UIManager.hidePauseMenu();
        this.startLevel(this.state.currentLevel);
        UIManager.showScreen('gameScreen');
    },

    /**
     * 退出游戏
     */
    quit() {
        this.state.isRunning = false;
        this.stopTimer();
        // 退出/返回菜单时也确保关闭所有音效
        AudioManager?.stopSteamProducing?.();
        AudioManager?.stopAllSfx?.();
        UIManager.hidePauseMenu();
    },

    /**
     * 下一关
     */
    nextLevel() {
        const nextLevelId = this.state.currentLevel + 1;
        const nextLevel = LevelData.getLevelById(nextLevelId);
        
        if (nextLevel) {
            this.startLevel(nextLevelId);
            UIManager.showScreen('gameScreen');
        } else {
            Utils.showToast('已完成所有关卡', 'success');
            UIManager.showScreen('mainMenu');
        }
    },

    /**
     * 初始化粒子系统
     */
    initParticleSystem() {
        const canvas = document.getElementById('game-particles');
        if (!canvas) {
            console.warn('游戏粒子画布未找到');
            return;
        }
        
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        
        this.particleSystem = new ParticleSystem(canvas);
        
        // 应用保存的粒子皮肤
        const settings = StorageManager.getSettings();
        if (settings.particleSkin) {
            this.particleSystem.setSkin(settings.particleSkin);
        }
        
        // 创建初始反应物和产物流
        if (this.state.levelData) {
            const reactants = this.state.levelData.reactants || [];
            const products = this.state.levelData.products || [];
            
            reactants.forEach(r => {
                this.particleSystem.createReactantFlow(r, 'left');
            });
            
            products.forEach(p => {
                this.particleSystem.createProductFlow(p, 'right');
            });
        }
    },

    // 便捷属性访问器
    get isPaused() { return this.state.isPaused; },
    get isRunning() { return this.state.isRunning; }
};

// 导出
window.Game = Game;
