// Splash 配置（渲染进程脚本）
// - 所有可自定义字段、以及 assets/image-assets 下的图片文件名，都集中在这里声明。
// - 版本号从 package.json 动态读取，禁止硬编码。

const pkg = require('./package.json');

const imageAssets = {
    ccZero: 'cc-zero.png',
    splashBackground: 'splash/v0-1-4-splash.png'
};

const splashConfig = {
    // 左侧文本
    mainTitle: 'CCBalance',
    subTitle: 'Chemistry Educational Game',
    version: `V ${pkg.version}`,

    // license 图像（替换原来的文本 'CC0 Protocol'）
    licenseImageFileName: imageAssets.ccZero,
    licenseImageSource: `./assets/image-assets/${imageAssets.ccZero}`,

    // 右上角文本
    topRightText: 'Merry Christmas!',

    // 背景图像（用于渐变白色区域填充）
    splashBackgroundFileName: imageAssets.splashBackground,
    splashBackgroundImage: `url('./assets/image-assets/${imageAssets.splashBackground}')`
};
