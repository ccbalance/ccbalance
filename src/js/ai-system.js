/**
 * CCBalance - AI系统模块
 * 处理AI对手的决策逻辑
 */

const AISystem = {
    // AI的当前目标
    goal: 'reverse', // 'forward' 或 'reverse'
    
    // 当前关卡
    currentLevel: null,
    
    // 难度级别
    DIFFICULTY: {
        EASY: 1,
        MEDIUM: 2,
        HARD: 3,
        EXPERT: 4
    },

    // 当前难度
    currentDifficulty: 1,

    // 决策权重
    weights: {
        concentration: 0.4,
        temperature: 0.3,
        pressure: 0.3
    },

    /**
     * 初始化AI
     */
    init(level, difficulty = 2) {
        this.currentLevel = level;
        // 兼容旧逻辑（文件下半段曾使用 this.level）
        this.level = level;
        this.currentDifficulty = difficulty;
        // 设置AI目标（与玩家相反）
        return this;
    },

    /**
     * 将 shift 转为得分（与 Game.calculateRoundScore 保持一致）
     */
    calculateRoundScore(shift, goal) {
        if (!goal) return 0;
        if (shift === 0) return 5;

        const shiftDir = shift > 0 ? 'forward' : 'reverse';
        if (shiftDir === goal) {
            return 10 + Math.min(Math.abs(shift) * 10, 20);
        }
        return Math.max(0, 5 - Math.abs(shift) * 5);
    },

    /**
     * 难度参数：越高越少随机、动作更频繁
     */
    getDifficultyProfile(difficulty) {
        const d = Utils?.clamp ? Utils.clamp(difficulty || 2, 1, 4) : (difficulty || 2);
        switch (d) {
            case 1:
                // Easy：低频出手 + 高随机性 + 只能投料（像新手）
                return {
                    randomness: 0.85,
                    topK: 5,
                    actChance: 0.2,
                    allowConcentration: true,
                    allowTemperature: false,
                    allowPressure: false
                };
            case 2:
                // Medium：中频出手，会投料和调温
                return {
                    randomness: 0.4,
                    topK: 3,
                    actChance: 0.55,
                    allowConcentration: true,
                    allowTemperature: true,
                    allowPressure: false
                };
            case 3:
                // Hard：高频出手，三类因素都能用
                return {
                    randomness: 0.1,
                    topK: 2,
                    actChance: 0.95,
                    allowConcentration: true,
                    allowTemperature: true,
                    allowPressure: true
                };
            case 4:
            default:
                // Expert：几乎不随机，持续施压
                return {
                    randomness: 0.02,
                    topK: 1,
                    actChance: 1.0,
                    allowConcentration: true,
                    allowTemperature: true,
                    allowPressure: true
                };
        }
    },

    /**
     * 对动作做一个“轻量模拟”，用来评估该动作对shift/得分的影响
     */
    simulateAction(gameState, level, action) {
        const next = {
            temperature: gameState.temperature,
            pressure: gameState.pressure,
            concentrations: { ...(gameState.concentrations || {}) }
        };

        // 与 GameActions.params 保持一致
        const temperatureDelta = 20;
        const pressureDelta = 50;

        if (action.type === 'addSpecies' && action.species) {
            const base = gameState.baseConcentrations?.[action.species]
                ?? level?.initialConcentrations?.[action.species]
                ?? 1;
            const delta = Math.max(0, base * 0.05);
            const cur = next.concentrations[action.species] || 0;
            next.concentrations[action.species] = cur + (delta || 0);
        }

        if (action.type === 'heat') {
            next.temperature = Math.min((next.temperature || 298) + temperatureDelta, 500);
        }
        if (action.type === 'cool') {
            next.temperature = Math.max((next.temperature || 298) - temperatureDelta, 200);
        }

        if (action.type === 'pressurize' || action.type === 'depressurize') {
            const oldP = next.pressure || 101.325;
            const newP = action.type === 'pressurize'
                ? Math.min(oldP + pressureDelta, 500)
                : Math.max(oldP - pressureDelta, 10);

            next.pressure = newP;

            // 仅在气体反应时，压强影响气体“有效浓度”（按比例缩放）
            if (level?.hasGas && Array.isArray(level?.gasSpecies) && oldP > 0) {
                const ratio = newP / oldP;
                for (const s of level.gasSpecies) {
                    if (s in next.concentrations) {
                        next.concentrations[s] *= ratio;
                    }
                }
            }
        }

        const K = ChemistryEngine.calculateK(level, next.temperature);
        const Q = ChemistryEngine.calculateQ(level, next.concentrations);
        const shift = ChemistryEngine.calculateShift(K, Q);

        return { K, Q, shift };
    },

    /**
     * 供实时模式调用：选择当前最优动作
     * @param {object} gameState - game.js 传入的状态快照
     * @param {object} level - 当前关卡数据
     * @param {number} difficulty - 1-4
     */
    selectBestAction(gameState, level, difficulty = 2) {
        // 兜底：兼容旧字段
        this.currentLevel = level || this.currentLevel;
        this.level = level || this.level;
        this.currentDifficulty = difficulty || this.currentDifficulty;

        if (!level || !gameState) return null;

        const goal = gameState.goal || this.goal || 'reverse';
        const profile = this.getDifficultyProfile(difficulty);

        // 低难度：并非每次轮询都出手
        if (profile.actChance !== undefined && Math.random() > profile.actChance) {
            return null;
        }

        // 冷却过滤：避免选到肯定执行不了的动作
        const isOnCd = (action) => {
            if (typeof GameActions === 'undefined' || !GameActions?.isOnCooldown) return false;
            switch (action.type) {
                case 'addSpecies':
                    return GameActions.isOnCooldown('concentration_' + action.species, true);
                case 'heat':
                    return GameActions.isOnCooldown('heat', true);
                case 'cool':
                    return GameActions.isOnCooldown('cool', true);
                case 'pressurize':
                    return GameActions.isOnCooldown('pressurize', true);
                case 'depressurize':
                    return GameActions.isOnCooldown('depressurize', true);
                default:
                    return false;
            }
        };

        const candidates = [];

        // 投料候选：AI目标 forward => 加反应物(降低Q)；目标 reverse => 加产物(提高Q)
        if (profile.allowConcentration !== false) {
            const preferredSpecies = goal === 'forward' ? level?.reactants : level?.products;
            if (Array.isArray(preferredSpecies)) {
                for (const species of preferredSpecies) {
                    candidates.push({ type: 'addSpecies', species });
                }
            }
        }

        // 温度候选
        if (profile.allowTemperature !== false) {
            candidates.push({ type: 'heat' }, { type: 'cool' });
        }

        // 压强候选（仅有气体时才有意义）
        if (
            profile.allowPressure === true &&
            level?.hasGas &&
            Array.isArray(level?.gasSpecies) &&
            level.gasSpecies.length > 0
        ) {
            candidates.push({ type: 'pressurize' }, { type: 'depressurize' });
        }

        // 能力卡候选（中高难度）
        if (difficulty >= 2 && gameState.aiAbilities) {
            for (const [cardId, cardState] of Object.entries(gameState.aiAbilities)) {
                if (cardState.available && !isOnCd({ type: 'card', cardId })) {
                    candidates.push({ type: 'card', cardId });
                }
            }
        }

        const scored = [];
        for (const action of candidates) {
            if (action.type === 'addSpecies' && !action.species) continue;
            if (isOnCd(action)) continue;

            let sim, aiScore;
            if (action.type === 'card') {
                // 评估能力卡收益
                aiScore = this.evaluateCardBenefit(action.cardId, gameState, level, goal);
            } else {
                sim = this.simulateAction(gameState, level, action);
                aiScore = this.calculateRoundScore(sim.shift, goal);
            }
            
            // tie-break：同分时更倾向更"极端"的shift（卡牌默认0）
            scored.push({ action, aiScore, shiftAbs: sim ? Math.abs(sim.shift) : 0 });
        }

        if (scored.length === 0) return null;

        scored.sort((a, b) => (b.aiScore - a.aiScore) || (b.shiftAbs - a.shiftAbs));

        // 难度随机性：从TopK中随机抽，避免看起来“机械”
        const topK = Math.max(1, Math.min(profile.topK, scored.length));
        const pickPool = scored.slice(0, topK);
        if (profile.randomness > 0 && Math.random() < profile.randomness) {
            return pickPool[Math.floor(Math.random() * pickPool.length)].action;
        }

        return scored[0].action;
    },

    /**
     * 评估能力卡收益（用于实时模式选择）
     */
    evaluateCardBenefit(cardId, gameState, level, goal) {
        const analysis = this.analyzeState(gameState, level);
        
        switch (cardId) {
            case 'catalyst':
                // 催化剂：距离目标越远收益越高
                return analysis.distanceToGoal * 0.8;
                
            case 'buffer':
                // 缓冲液：领先时保护优势
                return analysis.isWinning ? 0.6 : 0.1;
                
            case 'heatexchange':
                // 热交换：温度影响大时收益高
                const tempMag = analysis.tempEffect?.magnitude || 0;
                return tempMag > 0.3 ? 0.7 : 0.2;
                
            case 'quantum':
                // 量子跃迁：劣势时逆转，优势时避免
                return !analysis.isWinning && analysis.distanceToGoal > 0.7 ? 0.9 : 0.05;
                
            default:
                return 0.3;
        }
    },

    /**
     * 设置难度
     */
    setDifficulty(level) {
        this.currentDifficulty = Utils.clamp(level, 1, 4);
    },

    /**
     * 设置AI目标
     */
    setGoal(goal) {
        this.goal = goal;
    },

    /**
     * 生成AI决策
     */
    makeDecision(gameState, reaction) {
        const difficulty = this.currentDifficulty;
        
        // 根据难度添加随机性
        const randomFactor = (5 - difficulty) * 0.1; // 难度越高，随机性越低
        
        // 分析当前状态
        const analysis = this.analyzeState(gameState, reaction);
        
        // 生成决策
        const decision = {
            action: null,
            parameter: null,
            value: null,
            useAbility: null
        };

        // 根据难度选择策略
        switch (difficulty) {
            case 1:
                this.easyStrategy(decision, analysis, gameState, reaction, randomFactor);
                break;
            case 2:
                this.mediumStrategy(decision, analysis, gameState, reaction, randomFactor);
                break;
            case 3:
                this.hardStrategy(decision, analysis, gameState, reaction, randomFactor);
                break;
            case 4:
                this.expertStrategy(decision, analysis, gameState, reaction, randomFactor);
                break;
        }

        return decision;
    },

    /**
     * 分析当前状态
     */
    analyzeState(gameState, reaction) {
        const state = ChemistryEngine.getState();
        if (!state) return {};

        const balance = state.balance;
        const isWinning = (this.goal === 'forward' && balance > 0) || 
                         (this.goal === 'reverse' && balance < 0);
        const distanceToGoal = this.goal === 'forward' ? (1 - balance) : (balance + 1);

        // 分析温度影响
        const tempEffect = this.analyzeTemperatureEffect(reaction);
        
        // 分析压强影响
        const pressureEffect = this.analyzePressureEffect(reaction);
        
        // 分析浓度影响
        const concentrationEffect = this.analyzeConcentrationEffect(reaction);

        return {
            balance,
            isWinning,
            distanceToGoal,
            tempEffect,
            pressureEffect,
            concentrationEffect,
            state
        };
    },

    /**
     * 分析温度影响
     */
    analyzeTemperatureEffect(reaction) {
        if (!reaction) return { direction: 0, magnitude: 0 };
        
        // 吸热反应：升温促进正向
        // 放热反应：降温促进正向
        const deltaH = reaction.deltaH || 0;
        
        return {
            direction: deltaH > 0 ? 1 : -1, // 正数表示升温促进正向
            magnitude: Math.abs(deltaH) / 100 // 归一化
        };
    },

    /**
     * 分析压强影响
     */
    analyzePressureEffect(reaction) {
        if (!reaction || !reaction.hasGas) return { direction: 0, magnitude: 0 };
        
        const { coefficients, reactants, products, gasSpecies } = reaction;
        
        // 计算气体系数之和
        let reactantGasCoef = 0;
        let productGasCoef = 0;
        
        if (gasSpecies) {
            for (const species of gasSpecies) {
                if (reactants.includes(species)) {
                    reactantGasCoef += coefficients[species] || 1;
                }
                if (products.includes(species)) {
                    productGasCoef += coefficients[species] || 1;
                }
            }
        }
        
        // 增压促进气体系数小的一方
        const diff = reactantGasCoef - productGasCoef;
        
        return {
            direction: diff > 0 ? 1 : (diff < 0 ? -1 : 0), // 正数表示增压促进正向
            magnitude: Math.abs(diff) / 4
        };
    },

    /**
     * 分析浓度影响
     */
    analyzeConcentrationEffect(reaction) {
        if (!reaction) return [];
        
        const effects = [];
        const { reactants, products } = reaction;
        
        // 增加反应物浓度促进正向
        for (const r of reactants) {
            effects.push({
                species: r,
                direction: 1, // 增加促进正向
                type: 'reactant'
            });
        }
        
        // 增加产物浓度促进逆向
        for (const p of products) {
            effects.push({
                species: p,
                direction: -1, // 增加促进逆向
                type: 'product'
            });
        }
        
        return effects;
    },

    /**
     * 简单策略
     */
    easyStrategy(decision, analysis, gameState, reaction, randomFactor) {
        // 随机选择一个参数调整
        const rand = Math.random();
        
        if (rand < 0.4) {
            // 调整浓度
            this.decideConcentration(decision, analysis, reaction, randomFactor * 2);
        } else if (rand < 0.7) {
            // 调整温度
            this.decideTemperature(decision, analysis, reaction, randomFactor * 2);
        } else {
            // 调整压强
            this.decidePressure(decision, analysis, reaction, randomFactor * 2);
        }

        // 低概率使用能力
        if (Math.random() < 0.1 && gameState.aiAbilities) {
            decision.useAbility = this.selectAbility(gameState.aiAbilities, analysis);
        }
    },

    /**
     * 中等策略
     */
    mediumStrategy(decision, analysis, gameState, reaction, randomFactor) {
        // 根据状态选择最佳参数
        const options = this.rankOptions(analysis, reaction);
        
        if (options.length > 0) {
            // 选择排名靠前的选项（有一定随机性）
            const index = Math.min(Math.floor(Math.random() * 2), options.length - 1);
            const selected = options[index];
            
            this.applyOption(decision, selected, analysis, reaction, randomFactor);
        }

        // 中等概率使用能力
        if (Math.random() < 0.2 && gameState.aiAbilities) {
            decision.useAbility = this.selectAbility(gameState.aiAbilities, analysis);
        }
    },

    /**
     * 困难策略
     */
    hardStrategy(decision, analysis, gameState, reaction, randomFactor) {
        // 精确计算最佳操作
        const options = this.rankOptions(analysis, reaction);
        
        if (options.length > 0) {
            // 大概率选择最优选项
            const index = Math.random() < 0.8 ? 0 : Math.min(1, options.length - 1);
            const selected = options[index];
            
            this.applyOption(decision, selected, analysis, reaction, randomFactor * 0.5);
        }

        // 智能使用能力
        if (gameState.aiAbilities && this.shouldUseAbility(analysis)) {
            decision.useAbility = this.selectBestAbility(gameState.aiAbilities, analysis, reaction);
        }
    },

    /**
     * C·C 策略（专家级）
     */
    expertStrategy(decision, analysis, gameState, reaction, randomFactor) {
        // 最优决策
        const options = this.rankOptions(analysis, reaction);
        
        if (options.length > 0) {
            // 总是选择最优
            const selected = options[0];
            this.applyOption(decision, selected, analysis, reaction, 0);
        }

        // 战略性使用能力
        if (gameState.aiAbilities) {
            const bestAbility = this.selectBestAbility(gameState.aiAbilities, analysis, reaction);
            if (bestAbility && this.isAbilityWorthUsing(bestAbility, analysis)) {
                decision.useAbility = bestAbility;
            }
        }
    },

    /**
     * 排序选项
     */
    rankOptions(analysis, reaction) {
        const options = [];
        
        // 温度选项
        if (analysis.tempEffect && analysis.tempEffect.magnitude > 0) {
            const tempDirection = this.goal === 'forward' ? 
                analysis.tempEffect.direction : -analysis.tempEffect.direction;
            options.push({
                type: 'temperature',
                direction: tempDirection,
                score: analysis.tempEffect.magnitude * this.weights.temperature
            });
        }
        
        // 压强选项
        if (analysis.pressureEffect && analysis.pressureEffect.magnitude > 0) {
            const pressDirection = this.goal === 'forward' ? 
                analysis.pressureEffect.direction : -analysis.pressureEffect.direction;
            options.push({
                type: 'pressure',
                direction: pressDirection,
                score: analysis.pressureEffect.magnitude * this.weights.pressure
            });
        }
        
        // 浓度选项
        if (analysis.concentrationEffect && Array.isArray(analysis.concentrationEffect)) {
            for (const effect of analysis.concentrationEffect) {
                const concDirection = this.goal === 'forward' ? 
                    effect.direction : -effect.direction;
                options.push({
                    type: 'concentration',
                    species: effect.species,
                    direction: concDirection,
                    score: 0.5 * this.weights.concentration
                });
            }
        }
        
        // 按分数排序
        options.sort((a, b) => b.score - a.score);
        
        return options;
    },

    /**
     * 应用选项
     */
    applyOption(decision, option, analysis, reaction, randomFactor) {
        decision.action = option.type;
        
        switch (option.type) {
            case 'temperature':
                decision.parameter = 'temperature';
                // 根据方向调整温度
                const tempChange = option.direction * Utils.random(20, 50) * (1 - randomFactor);
                decision.value = Utils.clamp(
                    analysis.state.temperature + tempChange,
                    200, 500
                );
                break;
                
            case 'pressure':
                decision.parameter = 'pressure';
                const pressChange = option.direction * Utils.random(20, 50) * (1 - randomFactor);
                decision.value = Utils.clamp(
                    analysis.state.pressure + pressChange,
                    10, 500
                );
                break;
                
            case 'concentration':
                decision.parameter = 'concentration';
                decision.species = option.species;
                const currentConc = analysis.state.concentrations[option.species] || 0.5;
                const concChange = option.direction * Utils.random(0.1, 0.3) * (1 - randomFactor);
                decision.value = Utils.clamp(currentConc + concChange, 0.1, 2);
                break;
        }
    },

    /**
     * 决定浓度调整
     */
    decideConcentration(decision, analysis, reaction, randomFactor) {
        const effects = analysis.concentrationEffect;
        if (effects.length === 0) return;
        
        // 随机选择一个物种
        const effect = Utils.randomChoice(effects);
        const direction = this.goal === 'forward' ? effect.direction : -effect.direction;
        
        decision.action = 'concentration';
        decision.parameter = 'concentration';
        decision.species = effect.species;
        
        const currentConc = analysis.state.concentrations[effect.species] || 0.5;
        const change = direction * Utils.random(0.05, 0.2) * (1 + randomFactor);
        decision.value = Utils.clamp(currentConc + change, 0.1, 2);
    },

    /**
     * 决定温度调整
     */
    decideTemperature(decision, analysis, reaction, randomFactor) {
        const tempEffect = analysis.tempEffect;
        const direction = this.goal === 'forward' ? 
            tempEffect.direction : -tempEffect.direction;
        
        decision.action = 'temperature';
        decision.parameter = 'temperature';
        
        const change = direction * Utils.random(10, 30) * (1 + randomFactor);
        decision.value = Utils.clamp(analysis.state.temperature + change, 200, 500);
    },

    /**
     * 决定压强调整
     */
    decidePressure(decision, analysis, reaction, randomFactor) {
        if (!reaction.hasGas) return;
        
        const pressEffect = analysis.pressureEffect;
        const direction = this.goal === 'forward' ? 
            pressEffect.direction : -pressEffect.direction;
        
        decision.action = 'pressure';
        decision.parameter = 'pressure';
        
        const change = direction * Utils.random(10, 30) * (1 + randomFactor);
        decision.value = Utils.clamp(analysis.state.pressure + change, 10, 500);
    },

    /**
     * 选择能力
     */
    selectAbility(abilities, analysis) {
        const available = Object.entries(abilities)
            .filter(([key, value]) => value.available)
            .map(([key]) => key);
        
        if (available.length === 0) return null;
        return Utils.randomChoice(available);
    },

    /**
     * 选择最佳能力
     */
    selectBestAbility(abilities, analysis, reaction) {
        const available = Object.entries(abilities)
            .filter(([key, value]) => value.available);
        
        if (available.length === 0) return null;
        
        // 根据状态选择最佳能力
        if (!analysis.isWinning && available.some(([k]) => k === 'quantum')) {
            return 'quantum';
        }
        
        if (analysis.distanceToGoal > 1 && available.some(([k]) => k === 'catalyst')) {
            return 'catalyst';
        }
        
        if (available.some(([k]) => k === 'heatexchange') && 
            Math.abs(analysis.tempEffect.magnitude) > 0.3) {
            return 'heatexchange';
        }
        
        return available[0][0];
    },

    /**
     * 判断是否应该使用能力
     */
    shouldUseAbility(analysis) {
        // 落后时更倾向使用能力
        return !analysis.isWinning || analysis.distanceToGoal > 0.5;
    },

    /**
     * 判断能力是否值得使用
     */
    isAbilityWorthUsing(ability, analysis) {
        switch (ability) {
            case 'catalyst':
                return analysis.distanceToGoal > 0.3;
            case 'buffer':
                return analysis.isWinning;
            case 'heatexchange':
                return Math.abs(analysis.tempEffect.magnitude) > 0.2;
            case 'quantum':
                return !analysis.isWinning && analysis.distanceToGoal > 0.7;
            default:
                return true;
        }
    },

    /**
     * 规划AI操作
     */
    planActions(gameState) {
        const actions = [];
        const analysis = this.analyzeGameState(gameState);
        
        // 根据难度和策略决定操作数量
        const maxActions = Math.floor(this.currentDifficulty * 1.5);
        const actionCount = Math.floor(Math.random() * maxActions) + 1;
        
        for (let i = 0; i < actionCount; i++) {
            const action = this.selectBestAction(gameState, this.level || this.currentLevel, this.currentDifficulty);
            if (action) {
                actions.push(action);
            }
        }
        
        return actions;
    },

    /**
     * 选择最佳操作
     */
    // 旧的 selectBestAction 逻辑已合并到上方新的 selectBestAction(gameState, level, difficulty)

    /**
     * 分析游戏状态
     */
    analyzeGameState(gameState) {
        const K = gameState.equilibriumConstant;
        const Q = gameState.reactionQuotient;
        const shift = Q < K ? 'forward' : (Q > K ? 'reverse' : 'equilibrium');
        
        // 计算距离目标的距离
        const isWinning = (this.goal === 'forward' && shift === 'forward') || 
                         (this.goal === 'reverse' && shift === 'reverse');
        const distanceToGoal = Math.abs(Math.log(Q / K));
        
        // 温度效果
        const tempEffect = this.level?.deltaH ? {
            magnitude: Math.abs(this.level.deltaH),
            direction: this.level.deltaH > 0 ? 'endothermic' : 'exothermic'
        } : null;
        
        return {
            shift,
            isWinning,
            distanceToGoal,
            tempEffect,
            aiProgress: gameState.aiProgress || 0,
            playerProgress: gameState.playerProgress || 0
        };
    },

    /**     * 决定是否使用能力卡
     */
    decideAbilityUse(gameState) {
        // 根据难度决定是否使用能力
        const useAbilityChance = this.currentDifficulty * 0.2;
        if (Math.random() > useAbilityChance) return null;

        // 可用的能力
        const abilities = ['catalyst', 'buffer', 'heatexchange', 'quantum'];
        const availableAbilities = abilities.filter(ability => 
            CardSystem.isCardAvailable(ability, 'ai')
        );

        if (availableAbilities.length === 0) return null;

        // 根据当前状态选择最佳能力
        const analysis = this.analyzeGameState(gameState);
        
        if (analysis.distanceToGoal > 0.5 && availableAbilities.includes('catalyst')) {
            return 'catalyst';
        }
        if (analysis.isWinning && availableAbilities.includes('buffer')) {
            return 'buffer';
        }
        if (Math.abs(analysis.tempEffect?.magnitude || 0) > 0.3 && availableAbilities.includes('heatexchange')) {
            return 'heatexchange';
        }
        if (!analysis.isWinning && availableAbilities.includes('quantum')) {
            return 'quantum';
        }

        // 随机选择
        return availableAbilities[Math.floor(Math.random() * availableAbilities.length)];
    },

    /**
     * 获取AI描述
     */
    getAIDescription() {
        const descriptions = {
            1: '初级AI：随机决策，反应较慢',
            2: '中级AI：基础策略，有一定智能',
            3: '高级AI：精确计算，策略性强',
            4: 'C·C AI：最优决策，难以战胜'
        };
        return descriptions[this.currentDifficulty] || descriptions[1];
    }
};

// 导出
window.AISystem = AISystem;
