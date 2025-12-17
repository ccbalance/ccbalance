/**
 * CCBalance - 游戏操作管理
 * 管理所有游戏操作、冷却时间和执行
 */

const GameActions = {
    // 操作冷却时间配置（毫秒）
    cooldowns: {
        concentration: 3000,  // 投料3秒
        heat: 5000,          // 升温5秒
        cool: 5000,          // 降温5秒
        pressurize: 5000,    // 加压5秒
        depressurize: 5000   // 减压5秒
    },

    // 当前冷却状态（玩家/AI分离）
    activeCooldowns: {
        player: {},
        ai: {}
    },

    // 操作参数
    params: {
        concentrationDelta: 0.5,  // 兜底值（将按基准初始量的5%动态计算）
        temperatureDelta: 20,     // 每次温度变化20K
        pressureDelta: 50         // 每次压强变化50kPa
    },

    /**
     * 初始化
     */
    init() {
        this.activeCooldowns = { player: {}, ai: {} };
    },

    /**
     * 计算容器类型对体积/压强的影响
     * @param {string} species - 投入的物种
     * @param {number} delta - 浓度增量
     * @returns {object} - { volumeChange, pressureChange }
     */
    calculateContainerEffect(species, delta) {
        const level = Game.state.levelData;
        const containerType = level?.containerType || (level?.hasGas ? 'rigid' : 'flexible');
        
        let volumeChange = 0;
        let pressureChange = 0;
        
        // 判断是否为液体投料
        const isLiquid = !level?.gasSpecies?.includes(species);
        
        if (containerType === 'flexible' && isLiquid) {
            // 柔性容器：液体投料增加体积
            // 简化模型：假设 1 mol/L 浓度增加对应 0.018 L 体积增加(水的摩尔体积)
            volumeChange = delta * 0.018;
        } else if (containerType === 'rigid' && level?.hasGas) {
            // 刚性容器：气体反应投料增加压强
            // 使用理想气体定律: ΔP = (Δn * R * T) / V
            // 简化：每增加 0.1 mol/L 浓度，压强增加约 2.5 kPa
            const gasEffect = level?.gasSpecies?.includes(species) ? 1 : 0;
            pressureChange = gasEffect * delta * 25;  // 简化系数
        }
        
        return { volumeChange, pressureChange };
    },

    /**
     * 执行投料操作
     * @param {string} species - 物种名称
     * @param {boolean} isAI - 是否为AI操作
     */
    addSpecies(species, isAI = false) {
        if (this.isOnCooldown('concentration_' + species, isAI)) {
            return { success: false, reason: '冷却中' };
        }

        const base = Game.state.baseConcentrations?.[species]
            ?? Game.state.levelData?.initialConcentrations?.[species]
            ?? 1;
        const delta = Math.max(0, base * 0.05);

        const currentConc = Game.state.concentrations[species] || 0;
        const newConc = currentConc + (delta || this.params.concentrationDelta);
        
        Game.state.concentrations[species] = newConc;
        
        // 计算容器效应
        const { volumeChange, pressureChange } = this.calculateContainerEffect(species, delta);
        
        // 应用容器效应
        if (volumeChange > 0) {
            // 柔性容器：体积增加导致所有浓度按比例稀释
            const oldVolume = Game.state.volume || 1;
            const newVolume = oldVolume + volumeChange;
            const dilutionFactor = oldVolume / newVolume;
            
            for (const [s, conc] of Object.entries(Game.state.concentrations)) {
                if (s !== species) {
                    Game.state.concentrations[s] = conc * dilutionFactor;
                }
            }
            
            Game.state.volume = newVolume;
        }
        
        if (pressureChange > 0) {
            // 刚性容器：气体投料增加压强
            Game.state.pressure = (Game.state.pressure || 101) + pressureChange;
        }
        
        this.startCooldown('concentration_' + species, this.cooldowns.concentration, isAI);
        
        Game.updateState();
        UIManager.updateInfoPanel({
            K: Game.state.equilibriumConstant,
            Q: Game.state.reactionQuotient,
            concentrations: Game.state.concentrations,
            temperature: Game.state.temperature,
            pressure: Game.state.pressure
        });

        if (Game.particleSystem) {
            Game.particleSystem.createReactantFlow(species, 'left');
        }

        if (isAI) {
            UIManager.pulseAIAction?.();
        }

        const prefix = isAI ? 'AI ' : '';
        Utils.showToast(`${prefix}投入 ${species}`, isAI ? 'warning' : 'success');
        return { success: true };
    },

    /**
     * 执行升温操作
     * @param {boolean} isAI - 是否为AI操作
     */
    heat(isAI = false) {
        if (this.isOnCooldown('heat', isAI)) {
            return { success: false, reason: '冷却中' };
        }

        const newTemp = Math.min(Game.state.temperature + this.params.temperatureDelta, 500);
        Game.state.temperature = newTemp;
        this.startCooldown('heat', this.cooldowns.heat, isAI);
                if (isAI) {
                    UIManager.pulseAIAction?.();
                }
        
        Game.updateState();
        UIManager.updateInfoPanel({
            K: Game.state.equilibriumConstant,
            Q: Game.state.reactionQuotient,
            concentrations: Game.state.concentrations,
            temperature: Game.state.temperature,
            pressure: Game.state.pressure
        });

        const prefix = isAI ? 'AI ' : '';
        Utils.showToast(`${prefix}升温至 ${newTemp}K`, isAI ? 'warning' : 'success');
        return { success: true };
    },

    /**
     * 执行降温操作
     * @param {boolean} isAI - 是否为AI操作
     */
    cool(isAI = false) {
        if (this.isOnCooldown('cool', isAI)) {
            return { success: false, reason: '冷却中' };
        }

        const newTemp = Math.max(Game.state.temperature - this.params.temperatureDelta, 200);
        Game.state.temperature = newTemp;
        this.startCooldown('cool', this.cooldowns.cool, isAI);
                if (isAI) {
                    UIManager.pulseAIAction?.();
                }
        
        Game.updateState();
        UIManager.updateInfoPanel({
            K: Game.state.equilibriumConstant,
            Q: Game.state.reactionQuotient,
            concentrations: Game.state.concentrations,
            temperature: Game.state.temperature,
            pressure: Game.state.pressure
        });

        const prefix = isAI ? 'AI ' : '';
        Utils.showToast(`${prefix}降温至 ${newTemp}K`, isAI ? 'warning' : 'success');
        return { success: true };
    },

    /**
     * 执行加压操作
     * @param {boolean} isAI - 是否为AI操作
     */
    pressurize(isAI = false) {
        if (this.isOnCooldown('pressurize', isAI)) {
            return { success: false, reason: '冷却中' };
        }

        const oldPress = Game.state.pressure || 101.325;
        const newPress = Math.min(oldPress + this.params.pressureDelta, 500);
        Game.state.pressure = newPress;

        // 压强变化影响气体物种浓度（按比例缩放）
        const level = Game.state.levelData;
        if (level?.hasGas && Array.isArray(level?.gasSpecies) && oldPress > 0) {
            const ratio = newPress / oldPress;
            for (const s of level.gasSpecies) {
                if (s in Game.state.concentrations) {
                    Game.state.concentrations[s] *= ratio;
                }
            }
        }
        this.startCooldown('pressurize', this.cooldowns.pressurize, isAI);
                if (isAI) {
                    UIManager.pulseAIAction?.();
                }
        
        Game.updateState();
        UIManager.updateInfoPanel({
            K: Game.state.equilibriumConstant,
            Q: Game.state.reactionQuotient,
            concentrations: Game.state.concentrations,
            temperature: Game.state.temperature,
            pressure: Game.state.pressure
        });

        if (!isAI && level?.hasGas) {
            AudioManager?.playSteamProducing?.();
        }

        const prefix = isAI ? 'AI ' : '';
        Utils.showToast(`${prefix}加压至 ${newPress}kPa`, isAI ? 'warning' : 'success');
        return { success: true };
    },

    /**
     * 执行减压操作
     * @param {boolean} isAI - 是否为AI操作
     */
    depressurize(isAI = false) {
        if (this.isOnCooldown('depressurize', isAI)) {
            return { success: false, reason: '冷却中' };
        }

        const oldPress = Game.state.pressure || 101.325;
        const newPress = Math.max(oldPress - this.params.pressureDelta, 10);
        Game.state.pressure = newPress;

        // 压强变化影响气体物种浓度（按比例缩放）
        const level = Game.state.levelData;
        if (level?.hasGas && Array.isArray(level?.gasSpecies) && oldPress > 0) {
            const ratio = newPress / oldPress;
            for (const s of level.gasSpecies) {
                if (s in Game.state.concentrations) {
                    Game.state.concentrations[s] *= ratio;
                }
            }
        }
        this.startCooldown('depressurize', this.cooldowns.depressurize, isAI);
                if (isAI) {
                    UIManager.pulseAIAction?.();
                }
        
        Game.updateState();
        UIManager.updateInfoPanel({
            K: Game.state.equilibriumConstant,
            Q: Game.state.reactionQuotient,
            concentrations: Game.state.concentrations,
            temperature: Game.state.temperature,
            pressure: Game.state.pressure
        });

        if (!isAI && level?.hasGas) {
            AudioManager?.playSteamProducing?.();
        }

        const prefix = isAI ? 'AI ' : '';
        Utils.showToast(`${prefix}减压至 ${newPress}kPa`, isAI ? 'warning' : 'success');
        return { success: true };
    },

    /**
     * 开始冷却
     */
    startCooldown(actionId, duration, isAI = false) {
        const bucket = isAI ? this.activeCooldowns.ai : this.activeCooldowns.player;

        // AI冷却随难度缩放：高难度更频繁行动
        let effectiveDuration = duration;
        if (isAI) {
            const settings = StorageManager?.getSettings?.() || {};
            const difficulty = settings.difficulty || 2;
            // 按难度固定倍率：Easy 5x，Medium 3x，Hard 1x，Expert 0.5x
            const factor = difficulty >= 4 ? 0.5 : (difficulty === 3 ? 1.0 : (difficulty === 2 ? 3.0 : 5.0));
            effectiveDuration = Math.max(250, Math.floor(duration * factor));
        }

        bucket[actionId] = {
            startTime: Date.now(),
            duration: effectiveDuration
        };

        // 仅玩家冷却影响按钮可用性
        let btn = null;
        if (!isAI) {
            const btnId = this.getButtonId(actionId);
            btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = true;
                btn.classList.add('cooling');
                const cooldownEl = btn.querySelector('.btn-cooldown');
                if (cooldownEl) {
                    cooldownEl.style.animation = `cooldown-progress ${duration}ms linear forwards`;
                }
            }
        }

        // 设置定时器清除冷却
        setTimeout(() => {
            delete bucket[actionId];
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('cooling');
                const cooldownEl = btn.querySelector('.btn-cooldown');
                if (cooldownEl) {
                    cooldownEl.style.animation = '';
                }
            }
        }, effectiveDuration);
    },

    /**
     * 检查是否在冷却中
     */
    isOnCooldown(actionId, isAI = false) {
        const bucket = isAI ? this.activeCooldowns.ai : this.activeCooldowns.player;
        const cooldown = bucket[actionId];
        if (!cooldown) return false;
        
        const elapsed = Date.now() - cooldown.startTime;
        return elapsed < cooldown.duration;
    },

    /**
     * 获取按钮ID
     */
    getButtonId(actionId) {
        if (actionId.startsWith('concentration_')) {
            return 'btn-species-' + actionId.replace('concentration_', '');
        }
        return 'btn-' + actionId;
    },

    /**
     * 重置所有冷却
     */
    resetCooldowns(isAI = false) {
        const bucket = isAI ? this.activeCooldowns.ai : this.activeCooldowns.player;
        for (const actionId in bucket) {
            const btnId = this.getButtonId(actionId);
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('cooling');
                const cooldownEl = btn.querySelector('.btn-cooldown');
                if (cooldownEl) {
                    cooldownEl.style.animation = '';
                }
            }
        }
        if (isAI) {
            this.activeCooldowns.ai = {};
        } else {
            this.activeCooldowns.player = {};
        }
    }
};

// 导出
window.GameActions = GameActions;
