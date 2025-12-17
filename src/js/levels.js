/**
 * CCBalance - 关卡数据模块
 * 包含所有高中化学方程式关卡
 */

const LevelData = {
    // 关卡分类
    categories: {
        ionic: {
            name: '离子反应',
            icon: 'fa-bolt',
            description: '离子交换与沉淀反应',
            color: '#00d4ff'
        },
        redox: {
            name: '氧化还原',
            icon: 'fa-exchange-alt',
            description: '电子转移反应',
            color: '#ff00aa'
        },
        dissolution: {
            name: '溶解平衡',
            icon: 'fa-tint',
            description: '沉淀溶解平衡',
            color: '#ffaa00'
        },
        ionization: {
            name: '电离水解',
            icon: 'fa-water',
            description: '弱电解质电离与盐类水解',
            color: '#00ff88'
        },
        complex: {
            name: '综合反应',
            icon: 'fa-puzzle-piece',
            description: '复杂化学平衡',
            color: '#7b2dff'
        },
        custom: {
            name: '自定义',
            icon: 'fa-wrench',
            description: '创意工坊自定义关卡',
            color: '#00d4ff'
        }
    },

    /**
     * 调整初始浓度使Q=K
     */
    adjustInitialConcentrations(level, temperature = null) {
        const T = temperature ?? level.initialTemp ?? 298;
        const KRaw = (typeof ChemistryEngine !== 'undefined' && ChemistryEngine.calculateK)
            ? ChemistryEngine.calculateK(level, T)
            : (level.equilibriumConstant ?? 1);

        const K = (Number.isFinite(KRaw) && KRaw > 0) ? KRaw : 1;
        const reactants = level.reactants || [];
        const products = level.products || [];
        const coef = level.coefficients || {};

        // Q = Π[prod]^ν / Π[react]^ν
        // 令所有产物浓度 = 10^a，所有反应物浓度 = 10^b
        // 则 log10(Q) = a*P - b*R，取 a = logK/(P+R), b = -logK/(P+R) 可保证 Q=K 且两边“对称”
        const sumPower = (list) => list.reduce((acc, s) => acc + (coef[s] ?? 1), 0);
        const R = sumPower(reactants);
        const P = sumPower(products);

        if (R <= 0 || P <= 0) {
            return { ...(level.initialConcentrations || {}) };
        }

        const logK = Math.log10(K);
        const denom = P + R;
        const a = logK / denom;
        const b = -logK / denom;

        const prodConc = Math.pow(10, a);
        const reacConc = Math.pow(10, b);

        const newConc = {};
        for (const r of reactants) newConc[r] = reacConc;
        for (const p of products) newConc[p] = prodConc;

        // 补齐可能存在但未出现在方程式列表里的物种（兜底）
        if (level.initialConcentrations) {
            for (const [k, v] of Object.entries(level.initialConcentrations)) {
                if (newConc[k] === undefined) newConc[k] = v;
            }
        }

        // 保证数值合法
        for (const key of Object.keys(newConc)) {
            const v = newConc[key];
            if (!Number.isFinite(v) || v <= 0) newConc[key] = 1;
        }

        return newConc;
    },

    // 关卡列表
    levels: [
        // ===== 离子反应 (1-20) =====
        {
            id: 1,
            category: 'ionic',
            equation: 'H+ + OH- = H2O',
            displayEquation: 'H<sup>+</sup> + OH<sup>-</sup> ⇌ H<sub>2</sub>O',
            name: '酸碱中和',
            description: '最基本的中和反应',
            reactants: ['H+', 'OH-'],
            products: ['H2O'],
            coefficients: { 'H+': 1, 'OH-': 1, 'H2O': 1 },
            initialConcentrations: { 'H+': 1, 'OH-': 1, 'H2O': 1 },
            equilibriumConstant: 1e14,
            deltaH: -57.3,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            containerType: 'flexible',
            difficulty: 1
        },
        {
            id: 2,
            category: 'ionic',
            equation: 'Ba2+ + SO42- = BaSO4',
            displayEquation: 'Ba<sup>2+</sup> + SO<sub>4</sub><sup>2-</sup> ⇌ BaSO<sub>4</sub>↓',
            name: '硫酸钡沉淀',
            description: '难溶盐沉淀反应',
            reactants: ['Ba2+', 'SO42-'],
            products: ['BaSO4'],
            coefficients: { 'Ba2+': 1, 'SO42-': 1, 'BaSO4': 1 },
            initialConcentrations: { 'Ba2+': 0.5, 'SO42-': 0.5, 'BaSO4': 0.01 },
            equilibriumConstant: 1e10,
            deltaH: -20,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            containerType: 'flexible',
            difficulty: 1
        },
        {
            id: 3,
            category: 'ionic',
            equation: 'Ag+ + Cl- = AgCl',
            displayEquation: 'Ag<sup>+</sup> + Cl<sup>-</sup> ⇌ AgCl↓',
            name: '氯化银沉淀',
            description: '卤化银沉淀反应',
            reactants: ['Ag+', 'Cl-'],
            products: ['AgCl'],
            coefficients: { 'Ag+': 1, 'Cl-': 1, 'AgCl': 1 },
            initialConcentrations: { 'Ag+': 0.5, 'Cl-': 0.5, 'AgCl': 0.01 },
            equilibriumConstant: 1e10,
            deltaH: -65,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            containerType: 'flexible',
            difficulty: 1
        },
        {
            id: 4,
            category: 'ionic',
            equation: 'Ca2+ + CO32- = CaCO3',
            displayEquation: 'Ca<sup>2+</sup> + CO<sub>3</sub><sup>2-</sup> ⇌ CaCO<sub>3</sub>↓',
            name: '碳酸钙沉淀',
            description: '碳酸盐沉淀反应',
            reactants: ['Ca2+', 'CO32-'],
            products: ['CaCO3'],
            coefficients: { 'Ca2+': 1, 'CO32-': 1, 'CaCO3': 1 },
            initialConcentrations: { 'Ca2+': 0.5, 'CO32-': 0.5, 'CaCO3': 0.01 },
            equilibriumConstant: 1e8,
            deltaH: -13,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            containerType: 'flexible',
            difficulty: 1
        },
        {
            id: 5,
            category: 'ionic',
            equation: 'Fe3+ + 3OH- = Fe(OH)3',
            displayEquation: 'Fe<sup>3+</sup> + 3OH<sup>-</sup> ⇌ Fe(OH)<sub>3</sub>↓',
            name: '氢氧化铁沉淀',
            description: '氢氧化物沉淀反应',
            reactants: ['Fe3+', 'OH-'],
            products: ['Fe(OH)3'],
            coefficients: { 'Fe3+': 1, 'OH-': 3, 'Fe(OH)3': 1 },
            initialConcentrations: { 'Fe3+': 0.3, 'OH-': 0.5, 'Fe(OH)3': 0.01 },
            equilibriumConstant: 1e38,
            deltaH: -100,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            difficulty: 2
        },
        {
            id: 6,
            category: 'ionic',
            equation: 'Cu2+ + 2OH- = Cu(OH)2',
            displayEquation: 'Cu<sup>2+</sup> + 2OH<sup>-</sup> ⇌ Cu(OH)<sub>2</sub>↓',
            name: '氢氧化铜沉淀',
            description: '蓝色氢氧化物沉淀',
            reactants: ['Cu2+', 'OH-'],
            products: ['Cu(OH)2'],
            coefficients: { 'Cu2+': 1, 'OH-': 2, 'Cu(OH)2': 1 },
            initialConcentrations: { 'Cu2+': 0.4, 'OH-': 0.6, 'Cu(OH)2': 0.01 },
            equilibriumConstant: 1e19,
            deltaH: -50,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            difficulty: 2
        },
        {
            id: 7,
            category: 'ionic',
            equation: 'Mg2+ + 2OH- = Mg(OH)2',
            displayEquation: 'Mg<sup>2+</sup> + 2OH<sup>-</sup> ⇌ Mg(OH)<sub>2</sub>↓',
            name: '氢氧化镁沉淀',
            description: '白色氢氧化物沉淀',
            reactants: ['Mg2+', 'OH-'],
            products: ['Mg(OH)2'],
            coefficients: { 'Mg2+': 1, 'OH-': 2, 'Mg(OH)2': 1 },
            initialConcentrations: { 'Mg2+': 0.4, 'OH-': 0.6, 'Mg(OH)2': 0.01 },
            equilibriumConstant: 1e11,
            deltaH: -40,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            difficulty: 2
        },
        {
            id: 8,
            category: 'ionic',
            equation: 'CO32- + 2H+ = H2O + CO2',
            displayEquation: 'CO<sub>3</sub><sup>2-</sup> + 2H<sup>+</sup> ⇌ H<sub>2</sub>O + CO<sub>2</sub>↑',
            name: '碳酸盐与酸反应',
            description: '产生二氧化碳气体',
            reactants: ['CO32-', 'H+'],
            products: ['H2O', 'CO2'],
            coefficients: { 'CO32-': 1, 'H+': 2, 'H2O': 1, 'CO2': 1 },
            initialConcentrations: { 'CO32-': 0.5, 'H+': 0.8, 'H2O': 1, 'CO2': 0.1 },
            equilibriumConstant: 1e16,
            deltaH: -30,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: true,
            gasSpecies: ['CO2'],
            difficulty: 2
        },
        {
            id: 9,
            category: 'ionic',
            equation: 'S2- + 2H+ = H2S',
            displayEquation: 'S<sup>2-</sup> + 2H<sup>+</sup> ⇌ H<sub>2</sub>S↑',
            name: '硫化物与酸反应',
            description: '产生硫化氢气体',
            reactants: ['S2-', 'H+'],
            products: ['H2S'],
            coefficients: { 'S2-': 1, 'H+': 2, 'H2S': 1 },
            initialConcentrations: { 'S2-': 0.4, 'H+': 0.6, 'H2S': 0.1 },
            equilibriumConstant: 1e20,
            deltaH: -20,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: true,
            gasSpecies: ['H2S'],
            difficulty: 2
        },
        {
            id: 10,
            category: 'ionic',
            equation: 'NH4+ + OH- = NH3·H2O',
            displayEquation: 'NH<sub>4</sub><sup>+</sup> + OH<sup>-</sup> ⇌ NH<sub>3</sub>·H<sub>2</sub>O',
            name: '铵盐与碱反应',
            description: '生成一水合氨',
            reactants: ['NH4+', 'OH-'],
            products: ['NH3·H2O'],
            coefficients: { 'NH4+': 1, 'OH-': 1, 'NH3·H2O': 1 },
            initialConcentrations: { 'NH4+': 0.5, 'OH-': 0.5, 'NH3·H2O': 0.1 },
            equilibriumConstant: 1e9,
            deltaH: -35,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            difficulty: 2
        },

        // ===== 离子反应补齐 (11-20) =====
        {
            id: 11,
            category: 'ionic',
            equation: 'Pb2+ + 2I- = PbI2',
            displayEquation: 'Pb<sup>2+</sup> + 2I<sup>-</sup> ⇌ PbI<sub>2</sub>↓',
            name: '碘化铅沉淀',
            description: '黄色沉淀生成',
            reactants: ['Pb2+', 'I-'],
            products: ['PbI2'],
            coefficients: { 'Pb2+': 1, 'I-': 2, 'PbI2': 1 },
            initialConcentrations: { 'Pb2+': 0.3, 'I-': 0.8, 'PbI2': 0.01 },
            equilibriumConstant: 1e12,
            deltaH: -30,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            containerType: 'flexible',
            difficulty: 2
        },
        {
            id: 12,
            category: 'ionic',
            equation: 'Cu2+ + CO32- = CuCO3',
            displayEquation: 'Cu<sup>2+</sup> + CO<sub>3</sub><sup>2-</sup> ⇌ CuCO<sub>3</sub>↓',
            name: '碳酸铜沉淀',
            description: '生成碱式碳酸盐沉淀的简化模型',
            reactants: ['Cu2+', 'CO32-'],
            products: ['CuCO3'],
            coefficients: { 'Cu2+': 1, 'CO32-': 1, 'CuCO3': 1 },
            initialConcentrations: { 'Cu2+': 0.4, 'CO32-': 0.4, 'CuCO3': 0.01 },
            equilibriumConstant: 1e9,
            deltaH: -25,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            containerType: 'flexible',
            difficulty: 2
        },
        {
            id: 13,
            category: 'ionic',
            equation: 'Al3+ + 3OH- = Al(OH)3',
            displayEquation: 'Al<sup>3+</sup> + 3OH<sup>-</sup> ⇌ Al(OH)<sub>3</sub>↓',
            name: '氢氧化铝沉淀',
            description: '两性氢氧化物沉淀（简化为沉淀生成）',
            reactants: ['Al3+', 'OH-'],
            products: ['Al(OH)3'],
            coefficients: { 'Al3+': 1, 'OH-': 3, 'Al(OH)3': 1 },
            initialConcentrations: { 'Al3+': 0.2, 'OH-': 0.9, 'Al(OH)3': 0.01 },
            equilibriumConstant: 1e30,
            deltaH: -40,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            containerType: 'flexible',
            difficulty: 2
        },
        {
            id: 14,
            category: 'ionic',
            equation: 'Fe2+ + 2OH- = Fe(OH)2',
            displayEquation: 'Fe<sup>2+</sup> + 2OH<sup>-</sup> ⇌ Fe(OH)<sub>2</sub>↓',
            name: '氢氧化亚铁沉淀',
            description: '浅绿色沉淀（简化模型）',
            reactants: ['Fe2+', 'OH-'],
            products: ['Fe(OH)2'],
            coefficients: { 'Fe2+': 1, 'OH-': 2, 'Fe(OH)2': 1 },
            initialConcentrations: { 'Fe2+': 0.3, 'OH-': 0.6, 'Fe(OH)2': 0.01 },
            equilibriumConstant: 1e14,
            deltaH: -35,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            containerType: 'flexible',
            difficulty: 2
        },
        {
            id: 15,
            category: 'ionic',
            equation: 'Zn2+ + S2- = ZnS',
            displayEquation: 'Zn<sup>2+</sup> + S<sup>2-</sup> ⇌ ZnS↓',
            name: '硫化锌沉淀',
            description: '难溶硫化物沉淀',
            reactants: ['Zn2+', 'S2-'],
            products: ['ZnS'],
            coefficients: { 'Zn2+': 1, 'S2-': 1, 'ZnS': 1 },
            initialConcentrations: { 'Zn2+': 0.4, 'S2-': 0.4, 'ZnS': 0.01 },
            equilibriumConstant: 1e22,
            deltaH: -20,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            containerType: 'flexible',
            difficulty: 2
        },
        {
            id: 16,
            category: 'ionic',
            equation: 'Ca2+ + 2F- = CaF2',
            displayEquation: 'Ca<sup>2+</sup> + 2F<sup>-</sup> ⇌ CaF<sub>2</sub>↓',
            name: '氟化钙沉淀',
            description: '难溶盐沉淀反应',
            reactants: ['Ca2+', 'F-'],
            products: ['CaF2'],
            coefficients: { 'Ca2+': 1, 'F-': 2, 'CaF2': 1 },
            initialConcentrations: { 'Ca2+': 0.25, 'F-': 0.8, 'CaF2': 0.01 },
            equilibriumConstant: 1e10,
            deltaH: -18,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            containerType: 'flexible',
            difficulty: 3
        },
        {
            id: 17,
            category: 'ionic',
            equation: '2H+ + SO32- = H2O + SO2',
            displayEquation: '2H<sup>+</sup> + SO<sub>3</sub><sup>2-</sup> ⇌ H<sub>2</sub>O + SO<sub>2</sub>↑',
            name: '亚硫酸盐与酸反应',
            description: '放出二氧化硫气体',
            reactants: ['H+', 'SO32-'],
            products: ['H2O', 'SO2'],
            coefficients: { 'H+': 2, 'SO32-': 1, 'H2O': 1, 'SO2': 1 },
            initialConcentrations: { 'H+': 0.8, 'SO32-': 0.4, 'H2O': 1, 'SO2': 0.1 },
            equilibriumConstant: 1e14,
            deltaH: -35,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: true,
            gasSpecies: ['SO2'],
            containerType: 'flexible',
            difficulty: 3
        },
        {
            id: 18,
            category: 'ionic',
            equation: 'HCO3- + H+ = H2O + CO2',
            displayEquation: 'HCO<sub>3</sub><sup>-</sup> + H<sup>+</sup> ⇌ H<sub>2</sub>O + CO<sub>2</sub>↑',
            name: '碳酸氢盐与酸反应',
            description: '产生二氧化碳气体',
            reactants: ['HCO3-', 'H+'],
            products: ['H2O', 'CO2'],
            coefficients: { 'HCO3-': 1, 'H+': 1, 'H2O': 1, 'CO2': 1 },
            initialConcentrations: { 'HCO3-': 0.6, 'H+': 0.6, 'H2O': 1, 'CO2': 0.1 },
            equilibriumConstant: 1e12,
            deltaH: -25,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: true,
            gasSpecies: ['CO2'],
            containerType: 'flexible',
            difficulty: 3
        },
        {
            id: 19,
            category: 'ionic',
            equation: 'Mg2+ + 2Cl- = MgCl2',
            displayEquation: 'Mg<sup>2+</sup> + 2Cl<sup>-</sup> ⇌ MgCl<sub>2</sub>',
            name: '离子缔合（示例）',
            description: '用于练习系数与Q/K（简化为缔合）',
            reactants: ['Mg2+', 'Cl-'],
            products: ['MgCl2'],
            coefficients: { 'Mg2+': 1, 'Cl-': 2, 'MgCl2': 1 },
            initialConcentrations: { 'Mg2+': 0.4, 'Cl-': 0.8, 'MgCl2': 0.1 },
            equilibriumConstant: 1e4,
            deltaH: -10,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            containerType: 'flexible',
            difficulty: 3
        },
        {
            id: 20,
            category: 'ionic',
            equation: 'H+ + CH3COO- = CH3COOH',
            displayEquation: 'H<sup>+</sup> + CH<sub>3</sub>COO<sup>-</sup> ⇌ CH<sub>3</sub>COOH',
            name: '乙酸根酸化',
            description: '弱酸共轭碱的质子化（简化模型）',
            reactants: ['H+', 'CH3COO-'],
            products: ['CH3COOH'],
            coefficients: { 'H+': 1, 'CH3COO-': 1, 'CH3COOH': 1 },
            initialConcentrations: { 'H+': 0.4, 'CH3COO-': 0.6, 'CH3COOH': 0.2 },
            equilibriumConstant: 1e5,
            deltaH: -15,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            containerType: 'flexible',
            difficulty: 3
        },

        // ===== 氧化还原 (21-40) =====
        {
            id: 21,
            category: 'redox',
            equation: '2Fe3+ + Fe = 3Fe2+',
            displayEquation: '2Fe<sup>3+</sup> + Fe ⇌ 3Fe<sup>2+</sup>',
            name: '铁的歧化',
            description: '铁离子与铁反应',
            reactants: ['Fe3+', 'Fe'],
            products: ['Fe2+'],
            coefficients: { 'Fe3+': 2, 'Fe': 1, 'Fe2+': 3 },
            initialConcentrations: { 'Fe3+': 0.4, 'Fe': 1, 'Fe2+': 0.2 },
            equilibriumConstant: 1e6,
            deltaH: -45,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            difficulty: 2
        },
        {
            id: 22,
            category: 'redox',
            equation: 'Zn + Cu2+ = Zn2+ + Cu',
            displayEquation: 'Zn + Cu<sup>2+</sup> ⇌ Zn<sup>2+</sup> + Cu',
            name: '锌置换铜',
            description: '金属置换反应',
            reactants: ['Zn', 'Cu2+'],
            products: ['Zn2+', 'Cu'],
            coefficients: { 'Zn': 1, 'Cu2+': 1, 'Zn2+': 1, 'Cu': 1 },
            initialConcentrations: { 'Zn': 1, 'Cu2+': 0.5, 'Zn2+': 0.1, 'Cu': 0.1 },
            equilibriumConstant: 1e37,
            deltaH: -210,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            difficulty: 2
        },
        {
            id: 23,
            category: 'redox',
            equation: 'Cl2 + 2Br- = 2Cl- + Br2',
            displayEquation: 'Cl<sub>2</sub> + 2Br<sup>-</sup> ⇌ 2Cl<sup>-</sup> + Br<sub>2</sub>',
            name: '氯气氧化溴离子',
            description: '卤素置换反应',
            reactants: ['Cl2', 'Br-'],
            products: ['Cl-', 'Br2'],
            coefficients: { 'Cl2': 1, 'Br-': 2, 'Cl-': 2, 'Br2': 1 },
            initialConcentrations: { 'Cl2': 0.3, 'Br-': 0.6, 'Cl-': 0.1, 'Br2': 0.1 },
            equilibriumConstant: 1e10,
            deltaH: -90,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: true,
            gasSpecies: ['Cl2'],
            difficulty: 2
        },
        {
            id: 24,
            category: 'redox',
            equation: '2Fe2+ + Cl2 = 2Fe3+ + 2Cl-',
            displayEquation: '2Fe<sup>2+</sup> + Cl<sub>2</sub> ⇌ 2Fe<sup>3+</sup> + 2Cl<sup>-</sup>',
            name: '氯气氧化亚铁',
            description: '氯气的氧化性',
            reactants: ['Fe2+', 'Cl2'],
            products: ['Fe3+', 'Cl-'],
            coefficients: { 'Fe2+': 2, 'Cl2': 1, 'Fe3+': 2, 'Cl-': 2 },
            initialConcentrations: { 'Fe2+': 0.5, 'Cl2': 0.25, 'Fe3+': 0.1, 'Cl-': 0.2 },
            equilibriumConstant: 1e12,
            deltaH: -100,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: true,
            gasSpecies: ['Cl2'],
            difficulty: 3
        },
        {
            id: 25,
            category: 'redox',
            equation: 'MnO4- + 5Fe2+ + 8H+ = Mn2+ + 5Fe3+ + 4H2O',
            displayEquation: 'MnO<sub>4</sub><sup>-</sup> + 5Fe<sup>2+</sup> + 8H<sup>+</sup> ⇌ Mn<sup>2+</sup> + 5Fe<sup>3+</sup> + 4H<sub>2</sub>O',
            name: '高锰酸钾氧化亚铁',
            description: '经典氧化还原滴定',
            reactants: ['MnO4-', 'Fe2+', 'H+'],
            products: ['Mn2+', 'Fe3+', 'H2O'],
            coefficients: { 'MnO4-': 1, 'Fe2+': 5, 'H+': 8, 'Mn2+': 1, 'Fe3+': 5, 'H2O': 4 },
            initialConcentrations: { 'MnO4-': 0.2, 'Fe2+': 0.6, 'H+': 1, 'Mn2+': 0.05, 'Fe3+': 0.1, 'H2O': 1 },
            equilibriumConstant: 1e60,
            deltaH: -500,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            difficulty: 4
        },

        // ===== 溶解平衡 (41-60) =====
        {
            id: 41,
            category: 'dissolution',
            equation: 'AgCl(s) = Ag+ + Cl-',
            displayEquation: 'AgCl(s) ⇌ Ag<sup>+</sup> + Cl<sup>-</sup>',
            name: '氯化银溶解',
            description: 'Ksp = 1.8×10^-10',
            reactants: ['AgCl'],
            products: ['Ag+', 'Cl-'],
            coefficients: { 'AgCl': 1, 'Ag+': 1, 'Cl-': 1 },
            initialConcentrations: { 'AgCl': 1, 'Ag+': 1e-5, 'Cl-': 1e-5 },
            equilibriumConstant: 1.8e-10,
            deltaH: 65,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            difficulty: 2
        },
        {
            id: 42,
            category: 'dissolution',
            equation: 'CaCO3(s) = Ca2+ + CO32-',
            displayEquation: 'CaCO<sub>3</sub>(s) ⇌ Ca<sup>2+</sup> + CO<sub>3</sub><sup>2-</sup>',
            name: '碳酸钙溶解',
            description: 'Ksp = 2.8×10^-9',
            reactants: ['CaCO3'],
            products: ['Ca2+', 'CO32-'],
            coefficients: { 'CaCO3': 1, 'Ca2+': 1, 'CO32-': 1 },
            initialConcentrations: { 'CaCO3': 1, 'Ca2+': 5e-5, 'CO32-': 5e-5 },
            equilibriumConstant: 2.8e-9,
            deltaH: 13,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            difficulty: 2
        },
        {
            id: 43,
            category: 'dissolution',
            equation: 'BaSO4(s) = Ba2+ + SO42-',
            displayEquation: 'BaSO<sub>4</sub>(s) ⇌ Ba<sup>2+</sup> + SO<sub>4</sub><sup>2-</sup>',
            name: '硫酸钡溶解',
            description: 'Ksp = 1.1×10^-10',
            reactants: ['BaSO4'],
            products: ['Ba2+', 'SO42-'],
            coefficients: { 'BaSO4': 1, 'Ba2+': 1, 'SO42-': 1 },
            initialConcentrations: { 'BaSO4': 1, 'Ba2+': 1e-5, 'SO42-': 1e-5 },
            equilibriumConstant: 1.1e-10,
            deltaH: 20,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            difficulty: 2
        },
        {
            id: 44,
            category: 'dissolution',
            equation: 'Fe(OH)3(s) = Fe3+ + 3OH-',
            displayEquation: 'Fe(OH)<sub>3</sub>(s) ⇌ Fe<sup>3+</sup> + 3OH<sup>-</sup>',
            name: '氢氧化铁溶解',
            description: 'Ksp = 2.8×10^-39',
            reactants: ['Fe(OH)3'],
            products: ['Fe3+', 'OH-'],
            coefficients: { 'Fe(OH)3': 1, 'Fe3+': 1, 'OH-': 3 },
            initialConcentrations: { 'Fe(OH)3': 1, 'Fe3+': 1e-10, 'OH-': 1e-10 },
            equilibriumConstant: 2.8e-39,
            deltaH: 100,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            difficulty: 3
        },
        {
            id: 45,
            category: 'dissolution',
            equation: 'Mg(OH)2(s) = Mg2+ + 2OH-',
            displayEquation: 'Mg(OH)<sub>2</sub>(s) ⇌ Mg<sup>2+</sup> + 2OH<sup>-</sup>',
            name: '氢氧化镁溶解',
            description: 'Ksp = 5.6×10^-12',
            reactants: ['Mg(OH)2'],
            products: ['Mg2+', 'OH-'],
            coefficients: { 'Mg(OH)2': 1, 'Mg2+': 1, 'OH-': 2 },
            initialConcentrations: { 'Mg(OH)2': 1, 'Mg2+': 1e-4, 'OH-': 2e-4 },
            equilibriumConstant: 5.6e-12,
            deltaH: 40,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            difficulty: 2
        },

        // ===== 电离水解 (61-80) =====
        {
            id: 61,
            category: 'ionization',
            equation: 'CH3COOH = CH3COO- + H+',
            displayEquation: 'CH<sub>3</sub>COOH ⇌ CH<sub>3</sub>COO<sup>-</sup> + H<sup>+</sup>',
            name: '醋酸电离',
            description: 'Ka = 1.8×10^-5',
            reactants: ['CH3COOH'],
            products: ['CH3COO-', 'H+'],
            coefficients: { 'CH3COOH': 1, 'CH3COO-': 1, 'H+': 1 },
            initialConcentrations: { 'CH3COOH': 0.1, 'CH3COO-': 0.001, 'H+': 0.001 },
            equilibriumConstant: 1.8e-5,
            deltaH: -0.4,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            difficulty: 2
        },
        {
            id: 62,
            category: 'ionization',
            equation: 'NH3·H2O = NH4+ + OH-',
            displayEquation: 'NH<sub>3</sub>·H<sub>2</sub>O ⇌ NH<sub>4</sub><sup>+</sup> + OH<sup>-</sup>',
            name: '氨水电离',
            description: 'Kb = 1.8×10^-5',
            reactants: ['NH3·H2O'],
            products: ['NH4+', 'OH-'],
            coefficients: { 'NH3·H2O': 1, 'NH4+': 1, 'OH-': 1 },
            initialConcentrations: { 'NH3·H2O': 0.1, 'NH4+': 0.001, 'OH-': 0.001 },
            equilibriumConstant: 1.8e-5,
            deltaH: 35,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            difficulty: 2
        },
        {
            id: 63,
            category: 'ionization',
            equation: 'H2CO3 = HCO3- + H+',
            displayEquation: 'H<sub>2</sub>CO<sub>3</sub> ⇌ HCO<sub>3</sub><sup>-</sup> + H<sup>+</sup>',
            name: '碳酸一级电离',
            description: 'Ka1 = 4.3×10^-7',
            reactants: ['H2CO3'],
            products: ['HCO3-', 'H+'],
            coefficients: { 'H2CO3': 1, 'HCO3-': 1, 'H+': 1 },
            initialConcentrations: { 'H2CO3': 0.1, 'HCO3-': 0.001, 'H+': 0.001 },
            equilibriumConstant: 4.3e-7,
            deltaH: 7,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            difficulty: 2
        },
        {
            id: 64,
            category: 'ionization',
            equation: 'HCO3- = CO32- + H+',
            displayEquation: 'HCO<sub>3</sub><sup>-</sup> ⇌ CO<sub>3</sub><sup>2-</sup> + H<sup>+</sup>',
            name: '碳酸二级电离',
            description: 'Ka2 = 5.6×10^-11',
            reactants: ['HCO3-'],
            products: ['CO32-', 'H+'],
            coefficients: { 'HCO3-': 1, 'CO32-': 1, 'H+': 1 },
            initialConcentrations: { 'HCO3-': 0.1, 'CO32-': 0.0001, 'H+': 0.0001 },
            equilibriumConstant: 5.6e-11,
            deltaH: 15,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            difficulty: 3
        },
        {
            id: 65,
            category: 'ionization',
            equation: 'CH3COO- + H2O = CH3COOH + OH-',
            displayEquation: 'CH<sub>3</sub>COO<sup>-</sup> + H<sub>2</sub>O ⇌ CH<sub>3</sub>COOH + OH<sup>-</sup>',
            name: '醋酸根水解',
            description: '弱酸强碱盐水解',
            reactants: ['CH3COO-', 'H2O'],
            products: ['CH3COOH', 'OH-'],
            coefficients: { 'CH3COO-': 1, 'H2O': 1, 'CH3COOH': 1, 'OH-': 1 },
            initialConcentrations: { 'CH3COO-': 0.1, 'H2O': 1, 'CH3COOH': 0.001, 'OH-': 0.001 },
            equilibriumConstant: 5.6e-10,
            deltaH: 50,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            difficulty: 3
        },
        {
            id: 66,
            category: 'ionization',
            equation: 'NH4+ + H2O = NH3·H2O + H+',
            displayEquation: 'NH<sub>4</sub><sup>+</sup> + H<sub>2</sub>O ⇌ NH<sub>3</sub>·H<sub>2</sub>O + H<sup>+</sup>',
            name: '铵根水解',
            description: '强酸弱碱盐水解',
            reactants: ['NH4+', 'H2O'],
            products: ['NH3·H2O', 'H+'],
            coefficients: { 'NH4+': 1, 'H2O': 1, 'NH3·H2O': 1, 'H+': 1 },
            initialConcentrations: { 'NH4+': 0.1, 'H2O': 1, 'NH3·H2O': 0.001, 'H+': 0.001 },
            equilibriumConstant: 5.6e-10,
            deltaH: 52,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: false,
            difficulty: 3
        },

        // ===== 综合反应 (81-100) =====
        {
            id: 81,
            category: 'complex',
            equation: 'N2 + 3H2 = 2NH3',
            displayEquation: 'N<sub>2</sub> + 3H<sub>2</sub> ⇌ 2NH<sub>3</sub>',
            name: '合成氨',
            description: '哈伯法工业合成氨',
            reactants: ['N2', 'H2'],
            products: ['NH3'],
            coefficients: { 'N2': 1, 'H2': 3, 'NH3': 2 },
            initialConcentrations: { 'N2': 1, 'H2': 3, 'NH3': 0.1 },
            equilibriumConstant: 0.5,
            deltaH: -92,
            initialTemp: 723,
            initialPressure: 200,
            hasGas: true,
            gasSpecies: ['N2', 'H2', 'NH3'],
            difficulty: 3
        },
        {
            id: 82,
            category: 'complex',
            equation: '2SO2 + O2 = 2SO3',
            displayEquation: '2SO<sub>2</sub> + O<sub>2</sub> ⇌ 2SO<sub>3</sub>',
            name: '二氧化硫氧化',
            description: '接触法制硫酸',
            reactants: ['SO2', 'O2'],
            products: ['SO3'],
            coefficients: { 'SO2': 2, 'O2': 1, 'SO3': 2 },
            initialConcentrations: { 'SO2': 0.5, 'O2': 0.5, 'SO3': 0.1 },
            equilibriumConstant: 5e5,
            deltaH: -198,
            initialTemp: 673,
            initialPressure: 101,
            hasGas: true,
            gasSpecies: ['SO2', 'O2', 'SO3'],
            difficulty: 3
        },
        {
            id: 83,
            category: 'complex',
            equation: 'CO + H2O = CO2 + H2',
            displayEquation: 'CO + H<sub>2</sub>O ⇌ CO<sub>2</sub> + H<sub>2</sub>',
            name: '水煤气变换',
            description: '制取氢气',
            reactants: ['CO', 'H2O'],
            products: ['CO2', 'H2'],
            coefficients: { 'CO': 1, 'H2O': 1, 'CO2': 1, 'H2': 1 },
            initialConcentrations: { 'CO': 0.5, 'H2O': 0.5, 'CO2': 0.1, 'H2': 0.1 },
            equilibriumConstant: 1.0,
            deltaH: -41,
            initialTemp: 673,
            initialPressure: 101,
            hasGas: true,
            gasSpecies: ['CO', 'H2O', 'CO2', 'H2'],
            difficulty: 3
        },
        {
            id: 84,
            category: 'complex',
            equation: 'PCl5 = PCl3 + Cl2',
            displayEquation: 'PCl<sub>5</sub> ⇌ PCl<sub>3</sub> + Cl<sub>2</sub>',
            name: '五氯化磷分解',
            description: '气相分解平衡',
            reactants: ['PCl5'],
            products: ['PCl3', 'Cl2'],
            coefficients: { 'PCl5': 1, 'PCl3': 1, 'Cl2': 1 },
            initialConcentrations: { 'PCl5': 0.5, 'PCl3': 0.1, 'Cl2': 0.1 },
            equilibriumConstant: 0.04,
            deltaH: 93,
            initialTemp: 523,
            initialPressure: 101,
            hasGas: true,
            gasSpecies: ['PCl5', 'PCl3', 'Cl2'],
            difficulty: 3
        },
        {
            id: 85,
            category: 'complex',
            equation: '2NO2 = N2O4',
            displayEquation: '2NO<sub>2</sub> ⇌ N<sub>2</sub>O<sub>4</sub>',
            name: '二氧化氮二聚',
            description: '颜色变化平衡',
            reactants: ['NO2'],
            products: ['N2O4'],
            coefficients: { 'NO2': 2, 'N2O4': 1 },
            initialConcentrations: { 'NO2': 0.5, 'N2O4': 0.1 },
            equilibriumConstant: 6.8,
            deltaH: -57,
            initialTemp: 298,
            initialPressure: 101,
            hasGas: true,
            gasSpecies: ['NO2', 'N2O4'],
            difficulty: 2
        },
        {
            id: 86,
            category: 'complex',
            equation: 'H2 + I2 = 2HI',
            displayEquation: 'H<sub>2</sub> + I<sub>2</sub> ⇌ 2HI',
            name: '碘化氢合成',
            description: '经典气相平衡',
            reactants: ['H2', 'I2'],
            products: ['HI'],
            coefficients: { 'H2': 1, 'I2': 1, 'HI': 2 },
            initialConcentrations: { 'H2': 0.5, 'I2': 0.5, 'HI': 0.1 },
            equilibriumConstant: 50,
            deltaH: -10,
            initialTemp: 698,
            initialPressure: 101,
            hasGas: true,
            gasSpecies: ['H2', 'I2', 'HI'],
            difficulty: 2
        },
        {
            id: 87,
            category: 'complex',
            equation: 'C + CO2 = 2CO',
            displayEquation: 'C + CO<sub>2</sub> ⇌ 2CO',
            name: '碳还原二氧化碳',
            description: '布多尔反应',
            reactants: ['C', 'CO2'],
            products: ['CO'],
            coefficients: { 'C': 1, 'CO2': 1, 'CO': 2 },
            initialConcentrations: { 'C': 1, 'CO2': 0.5, 'CO': 0.1 },
            equilibriumConstant: 1e-3,
            deltaH: 172,
            initialTemp: 1000,
            initialPressure: 101,
            hasGas: true,
            gasSpecies: ['CO2', 'CO'],
            difficulty: 3
        },
        {
            id: 88,
            category: 'complex',
            equation: 'CH4 + H2O = CO + 3H2',
            displayEquation: 'CH<sub>4</sub> + H<sub>2</sub>O ⇌ CO + 3H<sub>2</sub>',
            name: '甲烷蒸汽重整',
            description: '工业制氢',
            reactants: ['CH4', 'H2O'],
            products: ['CO', 'H2'],
            coefficients: { 'CH4': 1, 'H2O': 1, 'CO': 1, 'H2': 3 },
            initialConcentrations: { 'CH4': 0.5, 'H2O': 0.5, 'CO': 0.1, 'H2': 0.3 },
            equilibriumConstant: 2e-4,
            deltaH: 206,
            initialTemp: 1073,
            initialPressure: 200,
            hasGas: true,
            gasSpecies: ['CH4', 'H2O', 'CO', 'H2'],
            difficulty: 4
        },
        {
            id: 89,
            category: 'complex',
            equation: 'CaCO3 = CaO + CO2',
            displayEquation: 'CaCO<sub>3</sub> ⇌ CaO + CO<sub>2</sub>',
            name: '碳酸钙分解',
            description: '石灰石煅烧',
            reactants: ['CaCO3'],
            products: ['CaO', 'CO2'],
            coefficients: { 'CaCO3': 1, 'CaO': 1, 'CO2': 1 },
            initialConcentrations: { 'CaCO3': 1, 'CaO': 0.1, 'CO2': 0.1 },
            equilibriumConstant: 0.04,
            deltaH: 178,
            initialTemp: 1100,
            initialPressure: 101,
            hasGas: true,
            gasSpecies: ['CO2'],
            difficulty: 2
        },
        {
            id: 90,
            category: 'complex',
            equation: 'Fe2O3 + 3CO = 2Fe + 3CO2',
            displayEquation: 'Fe<sub>2</sub>O<sub>3</sub> + 3CO ⇌ 2Fe + 3CO<sub>2</sub>',
            name: '炼铁反应',
            description: '高炉炼铁',
            reactants: ['Fe2O3', 'CO'],
            products: ['Fe', 'CO2'],
            coefficients: { 'Fe2O3': 1, 'CO': 3, 'Fe': 2, 'CO2': 3 },
            initialConcentrations: { 'Fe2O3': 1, 'CO': 0.5, 'Fe': 0.1, 'CO2': 0.1 },
            equilibriumConstant: 100,
            deltaH: -25,
            initialTemp: 1200,
            initialPressure: 101,
            hasGas: true,
            gasSpecies: ['CO', 'CO2'],
            difficulty: 3
        }
    ],

    /**
     * 获取分类下的关卡
     */
    getLevelsByCategory(category) {
        return this.levels.filter(level => level.category === category);
    },

    /**
     * 获取指定关卡
     */
    getLevel(id) {
        return this.levels.find(level => level.id === id);
    },

    /**
     * 通过ID获取关卡（别名）
     */
    getLevelById(id) {
        return this.getLevel(id);
    },

    /**
     * 获取下一关
     */
    getNextLevel(currentId) {
        const currentIndex = this.levels.findIndex(level => level.id === currentId);
        if (currentIndex < this.levels.length - 1) {
            return this.levels[currentIndex + 1];
        }
        return null;
    },

    /**
     * 获取总关卡数
     */
    getTotalLevels() {
        return this.levels.length;
    }
};

// 导出
window.LevelData = LevelData;
