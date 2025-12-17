/**
 * CCBalance - 化学引擎模块
 * 处理化学反应平衡计算
 */

const ChemistryEngine = {
    // 气体常数 R = 8.314 J/(mol·K)
    R: 8.314,
    
    // 当前反应状态
    currentReaction: null,
    
    // 反应类型
    REACTION_TYPES: {
        IONIC: 'ionic',
        REDOX: 'redox',
        DISSOLUTION: 'dissolution',
        IONIZATION: 'ionization',
        COMPLEX: 'complex'
    },

    /**
     * 初始化反应
     */
    initReaction(reactionData) {
        this.currentReaction = {
            ...reactionData,
            state: {
                temperature: reactionData.initialTemp || 298,
                pressure: reactionData.initialPressure || 101,
                concentrations: { ...reactionData.initialConcentrations },
                Q: 1,
                K: reactionData.equilibriumConstant || 1,
                balance: 0 // -1 到 1，表示平衡偏向
            }
        };
        
        this.calculateEquilibrium();
        return this.currentReaction;
    },

    /**
     * 计算反应商Q（支持传入参数）
     */
    calculateQ(level, concentrations) {
        const EPS = 1e-30;
        // 如果传入参数，使用传入的数据
        if (level && concentrations) {
            const { reactants, products, coefficients } = level;
            
            let numerator = 1;
            let denominator = 1;
            
            for (const product of products) {
                const conc = (concentrations[product] ?? EPS) || EPS;
                const coef = coefficients[product] || 1;
                numerator *= Math.pow(conc, coef);
            }
            
            for (const reactant of reactants) {
                const conc = (concentrations[reactant] ?? EPS) || EPS;
                const coef = coefficients[reactant] || 1;
                denominator *= Math.pow(conc, coef);
            }
            
            return denominator === 0 ? Infinity : numerator / denominator;
        }
        
        // 否则使用当前反应
        if (!this.currentReaction) return 1;
        
        const state = this.currentReaction.state;
        const { reactants, products, coefficients } = this.currentReaction;
        
        let numerator = 1;
        let denominator = 1;
        
        // 产物浓度的幂次方积
        for (const product of products) {
            const conc = (state.concentrations[product] ?? EPS) || EPS;
            const coef = coefficients[product] || 1;
            numerator *= Math.pow(conc, coef);
        }
        
        // 反应物浓度的幂次方积
        for (const reactant of reactants) {
            const conc = (state.concentrations[reactant] ?? EPS) || EPS;
            const coef = coefficients[reactant] || 1;
            denominator *= Math.pow(conc, coef);
        }
        
        return denominator === 0 ? Infinity : numerator / denominator;
    },

    /**
     * 计算平衡常数K随温度变化（支持传入参数）
     * 使用范特霍夫方程
     */
    calculateK(levelOrTemp, temperature) {
        const MIN_K = 1e-300;
        const MAX_K = 1e300;

        // 如果传入level对象和温度
        if (typeof levelOrTemp === 'object' && temperature !== undefined) {
            const level = levelOrTemp;
            const K0 = (Number.isFinite(level.equilibriumConstant) && level.equilibriumConstant > 0)
                ? level.equilibriumConstant
                : 1;
            const T0 = level.initialTemp || 298;
            const T = temperature;
            const dH = level.deltaH || 0;

            const sensitivity = Number.isFinite(level.temperatureSensitivity)
                ? level.temperatureSensitivity
                : 1;

            const lnRatio = (-(dH * 1000) / this.R * (1/T - 1/T0)) * sensitivity;
            let K = K0 * Math.exp(lnRatio);
            if (!Number.isFinite(K)) K = lnRatio > 0 ? MAX_K : MIN_K;
            if (K <= 0) K = MIN_K;
            return Utils?.clamp ? Utils.clamp(K, MIN_K, MAX_K) : Math.min(MAX_K, Math.max(MIN_K, K));
        }
        
        // 否则使用当前反应
        const temp = levelOrTemp; // 第一个参数是温度
        if (!this.currentReaction) return 1;
        
        const { equilibriumConstant, deltaH, initialTemp } = this.currentReaction;
        const K0 = (Number.isFinite(equilibriumConstant) && equilibriumConstant > 0)
            ? equilibriumConstant
            : 1;
        const T0 = initialTemp || 298;
        const T = temperature;
        const dH = deltaH || 0; // kJ/mol
        
        // ln(K2/K1) = -ΔH/R * (1/T2 - 1/T1)
        const sensitivity = Number.isFinite(this.currentReaction.temperatureSensitivity)
            ? this.currentReaction.temperatureSensitivity
            : 1;

        const lnRatio = (-(dH * 1000) / this.R * (1/temp - 1/T0)) * sensitivity;
        let K = K0 * Math.exp(lnRatio);
        if (!Number.isFinite(K)) K = lnRatio > 0 ? MAX_K : MIN_K;
        if (K <= 0) K = MIN_K;
        return Utils?.clamp ? Utils.clamp(K, MIN_K, MAX_K) : Math.min(MAX_K, Math.max(MIN_K, K));
    },

    /**
     * 计算平衡移动方向和幅度
     */
    calculateShift(K, Q) {
        if (K === 0 || Q === 0) return 0;
        
        // 计算平衡偏移量
        // Q < K: 正向反应，返回正值
        // Q > K: 逆向反应，返回负值
        const ratio = Math.log(Q / K);
        
        // 归一化到 -1 到 1
        return -Math.tanh(ratio);
    },

    /**
     * 获取当前状态
     */
    getState() {
        if (!this.currentReaction) return null;
        return this.currentReaction.state;
    },

    /**
     * 应用催化剂效果
     */
    applyCatalyst() {
        // 催化剂不改变平衡，只加速反应
        // 返回当前状态即可
        return this.getState();
    },

    /**
     * 计算平衡状态
     */
    calculateEquilibrium() {
        if (!this.currentReaction) return;
        
        const state = this.currentReaction.state;
        
        // 更新K值（温度影响）
        state.K = this.calculateK(state.temperature);
        
        // 计算Q值
        state.Q = this.calculateQ();
        
        // 计算平衡偏向
        // balance > 0: 正向反应优势，Q < K
        // balance < 0: 逆向反应优势，Q > K
        // balance = 0: 平衡状态，Q = K
        if (state.Q === 0 || state.K === 0) {
            state.balance = 0;
        } else {
            const ratio = Math.log10(state.Q / state.K);
            state.balance = Utils.clamp(-ratio / 2, -1, 1);
        }
        
        return state;
    },

    /**
     * 调整浓度
     */
    adjustConcentration(species, delta) {
        if (!this.currentReaction) return;
        
        const state = this.currentReaction.state;
        const currentConc = state.concentrations[species] || 0.1;
        const newConc = Utils.clamp(currentConc + delta, 0.001, 10);
        
        state.concentrations[species] = newConc;
        this.calculateEquilibrium();
        
        return state;
    },

    /**
     * 设置浓度
     */
    setConcentration(species, value) {
        if (!this.currentReaction) return;
        
        const state = this.currentReaction.state;
        state.concentrations[species] = Utils.clamp(value, 0.001, 10);
        this.calculateEquilibrium();
        
        return state;
    },

    /**
     * 调整温度
     */
    adjustTemperature(delta) {
        if (!this.currentReaction) return;
        
        const state = this.currentReaction.state;
        state.temperature = Utils.clamp(state.temperature + delta, 200, 500);
        this.calculateEquilibrium();
        
        return state;
    },

    /**
     * 设置温度
     */
    setTemperature(value) {
        if (!this.currentReaction) return;
        
        const state = this.currentReaction.state;
        state.temperature = Utils.clamp(value, 200, 500);
        this.calculateEquilibrium();
        
        return state;
    },

    /**
     * 调整压强（仅对气体反应有效）
     */
    adjustPressure(delta) {
        if (!this.currentReaction) return;
        if (!this.currentReaction.hasGas) return this.currentReaction.state;
        
        const state = this.currentReaction.state;
        state.pressure = Utils.clamp(state.pressure + delta, 10, 500);
        
        // 压强变化影响气体浓度
        const { gasSpecies, coefficients } = this.currentReaction;
        const pressureRatio = state.pressure / 101; // 相对于标准大气压
        
        if (gasSpecies) {
            for (const species of gasSpecies) {
                const baseConc = this.currentReaction.initialConcentrations[species];
                state.concentrations[species] = baseConc * pressureRatio;
            }
        }
        
        this.calculateEquilibrium();
        return state;
    },

    /**
     * 设置压强
     */
    setPressure(value) {
        if (!this.currentReaction) return;
        if (!this.currentReaction.hasGas) return this.currentReaction.state;
        
        const state = this.currentReaction.state;
        const oldPressure = state.pressure;
        state.pressure = Utils.clamp(value, 10, 500);
        
        const pressureRatio = state.pressure / oldPressure;
        const { gasSpecies } = this.currentReaction;
        
        if (gasSpecies) {
            for (const species of gasSpecies) {
                state.concentrations[species] *= pressureRatio;
            }
        }
        
        this.calculateEquilibrium();
        return state;
    },

    /**
     * 应用催化剂效果
     * 催化剂加速达到平衡，但不改变平衡位置
     */
    applyCatalyst() {
        if (!this.currentReaction) return;
        
        // 催化剂效果：快速接近平衡
        const state = this.currentReaction.state;
        const targetQ = state.K;
        const currentQ = state.Q;
        
        // 逐步调整浓度接近平衡
        const adjustmentFactor = 0.3;
        const { reactants, products, coefficients } = this.currentReaction;
        
        if (currentQ < targetQ) {
            // 正向反应，减少反应物，增加产物
            for (const reactant of reactants) {
                state.concentrations[reactant] *= (1 - adjustmentFactor * 0.1);
            }
            for (const product of products) {
                state.concentrations[product] *= (1 + adjustmentFactor * 0.1);
            }
        } else if (currentQ > targetQ) {
            // 逆向反应
            for (const reactant of reactants) {
                state.concentrations[reactant] *= (1 + adjustmentFactor * 0.1);
            }
            for (const product of products) {
                state.concentrations[product] *= (1 - adjustmentFactor * 0.1);
            }
        }
        
        this.calculateEquilibrium();
        return state;
    },

    /**
     * 应用缓冲效果
     * 减缓浓度变化
     */
    applyBuffer() {
        if (!this.currentReaction) return;
        // 缓冲效果在下一次调整时生效
        this.currentReaction.bufferActive = true;
        return this.currentReaction.state;
    },

    /**
     * 热交换效果
     * 快速改变温度
     */
    applyHeatExchange(targetTemp) {
        if (!this.currentReaction) return;
        
        const state = this.currentReaction.state;
        state.temperature = targetTemp;
        this.calculateEquilibrium();
        
        return state;
    },

    /**
     * 获取反应状态
     */
    getState() {
        return this.currentReaction?.state || null;
    },

    /**
     * 获取平衡偏向
     */
    getBalance() {
        return this.currentReaction?.state.balance || 0;
    },

    /**
     * 计算目标达成度
     * @param {string} goal - 'forward' 或 'reverse'
     */
    calculateAchievement(goal) {
        if (!this.currentReaction) return 0;
        
        const balance = this.currentReaction.state.balance;
        
        if (goal === 'forward') {
            // 目标是正向反应，balance > 0 越高越好
            return Utils.clamp((balance + 1) / 2 * 100, 0, 100);
        } else {
            // 目标是逆向反应，balance < 0 越低越好
            return Utils.clamp((-balance + 1) / 2 * 100, 0, 100);
        }
    },

    /**
     * 模拟时间推进（自动趋向平衡）
     */
    simulateTimeStep(dt = 1) {
        if (!this.currentReaction) return;
        
        const state = this.currentReaction.state;
        const K = state.K;
        const Q = state.Q;
        
        // 反应速率（简化模型）
        const rate = 0.1 * dt;
        
        if (Math.abs(Q - K) > 0.001) {
            const { reactants, products } = this.currentReaction;
            
            if (Q < K) {
                // 正向反应
                for (const r of reactants) {
                    state.concentrations[r] = Math.max(0.001, state.concentrations[r] - rate * 0.1);
                }
                for (const p of products) {
                    state.concentrations[p] += rate * 0.1;
                }
            } else {
                // 逆向反应
                for (const r of reactants) {
                    state.concentrations[r] += rate * 0.1;
                }
                for (const p of products) {
                    state.concentrations[p] = Math.max(0.001, state.concentrations[p] - rate * 0.1);
                }
            }
        }
        
        this.calculateEquilibrium();
        return state;
    },

    /**
     * 重置反应状态
     */
    reset() {
        if (!this.currentReaction) return;
        
        this.currentReaction.state = {
            temperature: this.currentReaction.initialTemp || 298,
            pressure: this.currentReaction.initialPressure || 101,
            concentrations: { ...this.currentReaction.initialConcentrations },
            Q: 1,
            K: this.currentReaction.equilibriumConstant || 1,
            balance: 0
        };
        
        this.calculateEquilibrium();
        return this.currentReaction.state;
    },

    /**
     * 生成反应信息文本
     */
    getReactionInfo() {
        if (!this.currentReaction) return null;
        
        const state = this.currentReaction.state;
        
        return {
            equation: this.currentReaction.equation,
            K: Utils.formatNumber(state.K, 3),
            Q: Utils.formatNumber(state.Q, 3),
            temperature: Math.round(state.temperature),
            pressure: Math.round(state.pressure),
            balance: state.balance,
            concentrations: Object.fromEntries(
                Object.entries(state.concentrations).map(([k, v]) => [k, Utils.formatNumber(v, 3)])
            )
        };
    }
};

// 导出
window.ChemistryEngine = ChemistryEngine;
