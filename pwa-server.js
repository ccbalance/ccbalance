/**
 * CCBalance - PWA 服务器
 * 使用 Express 托管应用，支持 PWA 离线访问
 */

const express = require('express');
const path = require('path');
const http = require('http');
const fs = require('fs');

class PWAServer {
    constructor() {
        this.app = null;
        this.server = null;
        this.port = 3000;
        this.isRunning = false;
    }

    /**
     * 初始化服务器
     */
    init(port = 3000) {
        this.port = port;
        this.app = express();

        // 静态文件托管
        this.app.use(express.static(path.join(__dirname)));

        // Service Worker 支持
        this.app.get('/service-worker.js', (req, res) => {
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Service-Worker-Allowed', '/');
            res.sendFile(path.join(__dirname, 'service-worker.js'));
        });

        // Manifest 文件
        this.app.get('/manifest.json', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.sendFile(path.join(__dirname, 'manifest.json'));
        });

        // 版本信息（用于 Service Worker 缓存版本与 package.json 同步）
        this.app.get('/app-version.json', (req, res) => {
            try {
                const pkgPath = path.join(__dirname, 'package.json');
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'no-store');
                res.json({
                    version: pkg?.version || '0.0.0',
                    name: pkg?.name || 'CCBalance'
                });
            } catch (e) {
                res.status(200).json({ version: '0.0.0', name: 'CCBalance' });
            }
        });

        // 根路由
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });

        // 404 处理
        this.app.use((req, res) => {
            res.status(404).send('404 - 页面未找到');
        });

        // 错误处理
        this.app.use((err, req, res, next) => {
            console.error('Server error:', err);
            res.status(500).send('500 - 服务器错误');
        });
    }

    /**
     * 启动服务器
     */
    start() {
        return new Promise((resolve, reject) => {
            if (this.isRunning) {
                reject(new Error('服务器已在运行'));
                return;
            }

            if (!this.app) {
                this.init(this.port);
            }

            this.server = this.app.listen(this.port, () => {
                this.isRunning = true;
                console.log(`PWA Server running at http://localhost:${this.port}`);
                resolve({
                    success: true,
                    port: this.port,
                    url: `http://localhost:${this.port}`
                });
            });

            this.server.on('error', (error) => {
                this.isRunning = false;
                if (error.code === 'EADDRINUSE') {
                    console.error(`端口 ${this.port} 已被占用`);
                    reject(new Error(`端口 ${this.port} 已被占用`));
                } else {
                    console.error('Server error:', error);
                    reject(error);
                }
            });
        });
    }

    /**
     * 停止服务器
     */
    stop() {
        return new Promise((resolve, reject) => {
            if (!this.isRunning || !this.server) {
                reject(new Error('服务器未运行'));
                return;
            }

            this.server.close((err) => {
                if (err) {
                    console.error('Failed to stop server:', err);
                    reject(err);
                } else {
                    this.isRunning = false;
                    this.server = null;
                    console.log('PWA Server stopped');
                    resolve({ success: true });
                }
            });
        });
    }

    /**
     * 获取服务器状态
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            port: this.port,
            url: this.isRunning ? `http://localhost:${this.port}` : null
        };
    }

    /**
     * 更改端口(需要重启)
     */
    async changePort(newPort) {
        const wasRunning = this.isRunning;
        
        if (wasRunning) {
            await this.stop();
        }

        this.port = newPort;
        this.app = null;

        if (wasRunning) {
            await this.start();
        }

        return { success: true, port: this.port };
    }
}

// 导出单例
const pwaServer = new PWAServer();

module.exports = pwaServer;
