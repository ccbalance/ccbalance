/**
 * CCBalance - 本地存储管理模块
 */

const StorageManager = {
    KEYS: {
        GAME_PROGRESS: 'ccbalance_progress',
        SETTINGS: 'ccbalance_settings',
        COLLECTION: 'ccbalance_collection',
        STATISTICS: 'ccbalance_statistics'
    },

    /**
     * 默认设置
     */
    defaultSettings: {
        sfxVolume: 80,
        bgmVolume: 60,
        particleCount: 'medium',
        enableAnimations: true,
        turnTime: 30,
        showHints: true,
        roundsPerLevel: 10,
        particleColor: '#00d4ff'
    },

    /**
     * 默认进度
     */
    defaultProgress: {
        currentLevel: 1,
        unlockedLevels: [1],
        completedLevels: {},
        totalStars: 0,
        titles: []
    },

    /**
     * 默认统计
     */
    defaultStatistics: {
        totalGames: 0,
        totalWins: 0,
        totalLosses: 0,
        totalRounds: 0,
        favoriteReaction: null,
        playTime: 0
    },

    /**
     * 初始化存储
     */
    init() {
        // 确保所有必要的存储键都存在
        if (!this.get(this.KEYS.SETTINGS)) {
            this.set(this.KEYS.SETTINGS, this.defaultSettings);
        }
        if (!this.get(this.KEYS.GAME_PROGRESS)) {
            this.set(this.KEYS.GAME_PROGRESS, this.defaultProgress);
        }
        if (!this.get(this.KEYS.COLLECTION)) {
            this.set(this.KEYS.COLLECTION, {});
        }
        if (!this.get(this.KEYS.STATISTICS)) {
            this.set(this.KEYS.STATISTICS, this.defaultStatistics);
        }
    },

    /**
     * 获取数据
     */
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Storage get error:', e);
            return null;
        }
    },

    /**
     * 设置数据
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    },

    /**
     * 删除数据
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    },

    /**
     * 获取设置
     */
    getSettings() {
        return { ...this.defaultSettings, ...this.get(this.KEYS.SETTINGS) };
    },

    /**
     * 保存设置
     */
    saveSettings(settings) {
        const currentSettings = this.getSettings();
        return this.set(this.KEYS.SETTINGS, { ...currentSettings, ...settings });
    },

    /**
     * 获取游戏进度
     */
    getProgress() {
        return { ...this.defaultProgress, ...this.get(this.KEYS.GAME_PROGRESS) };
    },

    /**
     * 保存游戏进度
     */
    saveProgress(progress) {
        const currentProgress = this.getProgress();
        return this.set(this.KEYS.GAME_PROGRESS, { ...currentProgress, ...progress });
    },

    /**
     * 解锁关卡
     */
    unlockLevel(levelId) {
        const progress = this.getProgress();
        if (!progress.unlockedLevels.includes(levelId)) {
            progress.unlockedLevels.push(levelId);
            this.saveProgress(progress);
        }
    },

    /**
     * 完成关卡
     */
    completeLevel(levelId, stars, achievement) {
        const progress = this.getProgress();
        const existingStars = progress.completedLevels[levelId]?.stars || 0;
        
        // 只在获得更多星星时更新
        if (stars > existingStars) {
            progress.totalStars += (stars - existingStars);
        }
        
        progress.completedLevels[levelId] = {
            stars: Math.max(stars, existingStars),
            achievement: Math.max(achievement, progress.completedLevels[levelId]?.achievement || 0),
            completedAt: Date.now()
        };
        
        // 解锁下一关
        const nextLevel = levelId + 1;
        if (!progress.unlockedLevels.includes(nextLevel)) {
            progress.unlockedLevels.push(nextLevel);
        }
        
        this.saveProgress(progress);
    },

    /**
     * 获取关卡状态
     */
    getLevelStatus(levelId) {
        const progress = this.getProgress();
        return {
            unlocked: progress.unlockedLevels.includes(levelId),
            completed: progress.completedLevels[levelId] || null
        };
    },

    /**
     * 添加到收藏
     */
    addToCollection(reactionId, reactionData) {
        const collection = this.get(this.KEYS.COLLECTION) || {};
        if (!collection[reactionId]) {
            collection[reactionId] = {
                ...reactionData,
                unlockedAt: Date.now(),
                viewCount: 0
            };
            this.set(this.KEYS.COLLECTION, collection);
        }
    },

    /**
     * 解锁方程式
     */
    unlockEquation(levelId) {
        this.addToCollection(levelId, { levelId });
    },

    /**
     * 重置进度
     */
    resetProgress() {
        this.set(this.KEYS.GAME_PROGRESS, this.defaultProgress);
        this.set(this.KEYS.COLLECTION, {});
        this.set(this.KEYS.STATISTICS, this.defaultStatistics);
    },

    /**
     * 获取收藏
     */
    getCollection() {
        return this.get(this.KEYS.COLLECTION) || {};
    },

    /**
     * 检查是否收藏
     */
    isInCollection(reactionId) {
        const collection = this.getCollection();
        return !!collection[reactionId];
    },

    /**
     * 更新统计数据
     */
    updateStatistics(stats) {
        const currentStats = this.get(this.KEYS.STATISTICS) || this.defaultStatistics;
        
        if (stats.gameResult === 'win') {
            currentStats.totalWins++;
        } else if (stats.gameResult === 'lose') {
            currentStats.totalLosses++;
        }
        
        currentStats.totalGames++;
        currentStats.totalRounds += stats.rounds || 0;
        currentStats.playTime += stats.playTime || 0;
        
        this.set(this.KEYS.STATISTICS, currentStats);
    },

    /**
     * 获取统计数据
     */
    getStatistics() {
        return { ...this.defaultStatistics, ...this.get(this.KEYS.STATISTICS) };
    },

    /**
     * 重置所有进度
     */
    resetProgress() {
        this.set(this.KEYS.GAME_PROGRESS, this.defaultProgress);
        this.set(this.KEYS.COLLECTION, {});
        this.set(this.KEYS.STATISTICS, this.defaultStatistics);
        return true;
    },

    /**
     * 导出存档
     */
    exportSave() {
        return {
            progress: this.getProgress(),
            settings: this.getSettings(),
            collection: this.getCollection(),
            statistics: this.getStatistics(),
            exportedAt: Date.now()
        };
    },

    /**
     * 导入存档
     */
    importSave(saveData) {
        try {
            if (saveData.progress) this.set(this.KEYS.GAME_PROGRESS, saveData.progress);
            if (saveData.settings) this.set(this.KEYS.SETTINGS, saveData.settings);
            if (saveData.collection) this.set(this.KEYS.COLLECTION, saveData.collection);
            if (saveData.statistics) this.set(this.KEYS.STATISTICS, saveData.statistics);
            return true;
        } catch (e) {
            console.error('Import save error:', e);
            return false;
        }
    },

    /**
     * 获取总进度百分比
     */
    getTotalProgress() {
        const progress = this.getProgress();
        const totalLevels = 100; // 假设总共100关
        const completedCount = Object.keys(progress.completedLevels).length;
        return Utils.percentage(completedCount, totalLevels);
    },

    /**
     * 获取总星星数
     */
    getTotalStars() {
        const progress = this.getProgress();
        return progress.totalStars;
    }
};

// 初始化存储
StorageManager.init();

// 导出
window.StorageManager = StorageManager;
