/**
 * CCBalance - 创意工坊管理器
 * 处理自定义关卡的导入、导出、验证和管理
 */

const WorkshopManager = {
    // CCB 文件格式版本
    CCB_FORMAT_VERSION: '1.0.0',
    
    // 存储键
    STORAGE_KEY: 'ccbalance_workshop_levels',
    
    /**
     * 获取所有创意工坊关卡
     */
    getAllLevels() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('读取创意工坊关卡失败:', e);
            return [];
        }
    },
    
    /**
     * 保存创意工坊关卡列表
     */
    saveLevels(levels) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(levels));
            return true;
        } catch (e) {
            console.error('保存创意工坊关卡失败:', e);
            return false;
        }
    },
    
    /**
     * 添加关卡到创意工坊
     */
    addLevel(levelData) {
        const levels = this.getAllLevels();
        
        // 检查是否已存在相同 ID
        const existing = levels.findIndex(l => l.metadata.id === levelData.metadata.id);
        if (existing >= 0) {
            // 更新现有关卡
            levels[existing] = levelData;
        } else {
            // 添加新关卡
            levels.push(levelData);
        }
        
        return this.saveLevels(levels);
    },
    
    /**
     * 删除关卡
     */
    deleteLevel(levelId) {
        const levels = this.getAllLevels();
        const filtered = levels.filter(l => l.metadata.id !== levelId);
        return this.saveLevels(filtered);
    },
    
    /**
     * 获取单个关卡
     */
    getLevel(levelId) {
        const levels = this.getAllLevels();
        return levels.find(l => l.metadata.id === levelId);
    },
    
    /**
     * 验证 CCB 文件数据
     */
    validateCCBData(data) {
        const errors = [];
        
        // 检查基本结构
        if (!data || typeof data !== 'object') {
            errors.push('无效的数据格式');
            return { valid: false, errors };
        }
        
        // 检查版本
        if (!data.version) {
            errors.push('缺少版本号');
        } else if (!this.isVersionSupported(data.version)) {
            errors.push(`不支持的版本: ${data.version}（当前支持最高版本: ${this.CCB_FORMAT_VERSION}）`);
        }
        
        // 检查 metadata
        if (!data.metadata) {
            errors.push('缺少 metadata 字段');
        } else {
            if (!data.metadata.id) errors.push('缺少 metadata.id');
            if (!data.metadata.name) errors.push('缺少 metadata.name');
        }
        
        // 检查 reaction
        if (!data.reaction) {
            errors.push('缺少 reaction 字段');
        } else {
            const r = data.reaction;
            if (!r.id) errors.push('缺少 reaction.id');
            if (!r.displayEquation) errors.push('缺少 reaction.displayEquation');
            if (typeof r.equilibriumConstant !== 'number' || !(r.equilibriumConstant > 0)) {
                errors.push('缺少 reaction.equilibriumConstant 或数值不合法');
            }
            if (!Array.isArray(r.reactants) || r.reactants.length === 0) {
                errors.push('反应物列表无效');
            }
            if (!Array.isArray(r.products) || r.products.length === 0) {
                errors.push('生成物列表无效');
            }
            if (!r.coefficients || typeof r.coefficients !== 'object') {
                errors.push('缺少化学计量数');
            }
            if (typeof r.deltaH !== 'number') {
                errors.push('反应热必须是数值');
            }
            if (typeof r.hasGas !== 'boolean') {
                errors.push('hasGas 必须是布尔值');
            }
            if (!r.containerType || !['rigid', 'flexible'].includes(r.containerType)) {
                errors.push('容器类型必须是 rigid 或 flexible');
            }
            const initTemp = (r.initialTemp ?? r.initialTemperature);
            if (typeof initTemp !== 'number' || initTemp <= 0) {
                errors.push('初始温度必须是正数');
            }
            if (typeof r.initialPressure !== 'number' || r.initialPressure <= 0) {
                errors.push('初始压强必须是正数');
            }
            if (!r.initialConcentrations || typeof r.initialConcentrations !== 'object') {
                errors.push('缺少初始浓度');
            } else {
                // 检查浓度非负
                for (const [species, conc] of Object.entries(r.initialConcentrations)) {
                    if (typeof conc !== 'number' || conc < 0) {
                        errors.push(`${species} 的浓度必须是非负数`);
                    }
                }
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    },
    
    /**
     * 检查版本是否支持
     */
    isVersionSupported(version) {
        // 简单的版本比较（语义化版本）
        const current = this.CCB_FORMAT_VERSION.split('.').map(Number);
        const target = version.split('.').map(Number);
        
        // 主版本号必须相同
        if (current[0] !== target[0]) return false;
        
        // 次版本号：当前版本必须 >= 目标版本
        if (current[1] < target[1]) return false;
        if (current[1] > target[1]) return true;
        
        // 修订号：当前版本必须 >= 目标版本
        return current[2] >= target[2];
    },
    
    /**
     * 版本升级转换（占位）
     */
    upgradeCCBVersion(data, fromVersion, toVersion) {
        // 占位实现：未来版本迭代时在此添加转换逻辑
        // 例如：
        // if (fromVersion === "1.0.0" && toVersion === "1.1.0") {
        //   // 添加新字段、重命名字段等
        //   data.newField = defaultValue;
        // }
        
        console.log(`CCB 版本升级: ${fromVersion} -> ${toVersion}`);
        return data;
    },
    
    /**
     * 从文件路径加载 CCB
     */
    async loadFromFile(filePath) {
        try {
            const fs = require('fs').promises;
            const content = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(content);
            
            const validation = this.validateCCBData(data);
            if (!validation.valid) {
                return {
                    success: false,
                    errors: validation.errors
                };
            }
            
            // 如果版本较低，尝试升级
            if (data.version !== this.CCB_FORMAT_VERSION) {
                data = this.upgradeCCBVersion(data, data.version, this.CCB_FORMAT_VERSION);
                data.version = this.CCB_FORMAT_VERSION;
            }
            
            return {
                success: true,
                data
            };
        } catch (e) {
            return {
                success: false,
                errors: [`文件读取失败: ${e.message}`]
            };
        }
    },
    
    /**
     * 从 URL 下载 CCB
     */
    async downloadFromURL(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                return {
                    success: false,
                    errors: [`下载失败: HTTP ${response.status}`]
                };
            }
            
            const data = await response.json();
            
            const validation = this.validateCCBData(data);
            if (!validation.valid) {
                return {
                    success: false,
                    errors: validation.errors
                };
            }
            
            // 如果版本较低，尝试升级
            if (data.version !== this.CCB_FORMAT_VERSION) {
                data = this.upgradeCCBVersion(data, data.version, this.CCB_FORMAT_VERSION);
                data.version = this.CCB_FORMAT_VERSION;
            }
            
            return {
                success: true,
                data
            };
        } catch (e) {
            return {
                success: false,
                errors: [`下载失败: ${e.message}`]
            };
        }
    },
    
    /**
     * 导出关卡到文件
     */
    async exportToFile(levelId, savePath) {
        try {
            const level = this.getLevel(levelId);
            if (!level) {
                return {
                    success: false,
                    error: '关卡不存在'
                };
            }
            
            const fs = require('fs').promises;
            const content = JSON.stringify(level, null, 2);
            await fs.writeFile(savePath, content, 'utf8');
            
            return {
                success: true
            };
        } catch (e) {
            return {
                success: false,
                error: `导出失败: ${e.message}`
            };
        }
    },
    
    /**
     * 创建新的空白关卡模板
     */
    createTemplate() {
        return {
            version: this.CCB_FORMAT_VERSION,
            metadata: {
                id: `custom-${Date.now()}`,
                name: '新关卡',
                description: '',
                author: '',
                createdAt: Date.now(),
                tags: []
            },
            reaction: {
                id: `reaction-${Date.now()}`,
                displayEquation: 'A + B ⇌ C',
                equilibriumConstant: 10,
                reactants: ['A', 'B'],
                products: ['C'],
                coefficients: {
                    A: 1,
                    B: 1,
                    C: 1
                },
                deltaH: 0,
                temperatureSensitivity: 1,
                hasGas: false,
                gasSpecies: [],
                containerType: 'rigid',
                initialTemp: 298,
                initialPressure: 101.325,
                initialConcentrations: {
                    A: 1.0,
                    B: 1.0,
                    C: 0.0
                }
            },
            difficulty: {
                aiLevel: 2,
                maxRounds: null,
                turnTime: null
            }
        };
    },
    
    /**
     * 清空所有创意工坊关卡
     */
    clearAll() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            return true;
        } catch (e) {
            console.error('清空创意工坊失败:', e);
            return false;
        }
    }
};

// 导出
window.WorkshopManager = WorkshopManager;
