# CCB 文件格式规范

## 版本历史

### 当前支持版本

- 应用版本：`0.1.1`
- CCB 文件格式版本：`1.0.0`

## 文件结构

CCB 文件（`.ccb`）是 JSON 格式的自定义关卡文件，包含化学平衡反应的完整配置。

### 基本结构

```json
{
  "version": "1.0.0",
  "metadata": {
    "id": "custom-001",
    "name": "自定义关卡名称",
    "description": "关卡描述",
    "author": "作者名",
    "createdAt": 1702800000000,
    "tags": ["tag1", "tag2"]
  },
  "reaction": {
    "id": "reaction-001",
    "displayEquation": "2H₂ + O₂ ⇌ 2H₂O",
    "equilibriumConstant": 100000000000000,
    "reactants": ["H2", "O2"],
    "products": ["H2O"],
    "coefficients": {
      "H2": 2,
      "O2": 1,
      "H2O": 2
    },
    "deltaH": -484,
    "temperatureSensitivity": 1,
    "hasGas": true,
    "gasSpecies": ["H2", "O2"],
    "containerType": "rigid",
    "initialTemp": 298,
    "initialPressure": 101.325,
    "initialConcentrations": {
      "H2": 2.0,
      "O2": 1.0,
      "H2O": 0.0
    }
  },
  "difficulty": {
    "aiLevel": 2,
    "maxRounds": 10,
    "turnTime": 30
  }
}
```

### 字段说明

#### version (必需)

- 类型：`string`
- 说明：CCB 文件格式版本号（语义化版本）
- 示例：`"1.0.0"`

#### metadata (必需)

关卡元数据

- `id` (必需)：关卡唯一标识符
- `name` (必需)：关卡显示名称
- `description` (可选)：关卡描述文本
- `author` (可选)：作者名称
- `createdAt` (可选)：创建时间戳（毫秒）
- `tags` (可选)：标签数组

#### reaction (必需)

化学反应配置

- `id` (必需)：反应唯一标识符
- `displayEquation` (必需)：用于显示的化学方程式
- `equilibriumConstant` (必需)：标准温度下的平衡常数 K（用于温度修正计算）
- `reactants` (必需)：反应物数组
- `products` (必需)：生成物数组
- `coefficients` (必需)：各物质的化学计量数
- `deltaH` (必需)：反应热（kJ/mol），正值吸热，负值放热
- `temperatureSensitivity` (可选)：温度变化率系数（0-1），用于控制 K 随温度变化的幅度
  - `1`：默认强度（完整范特霍夫温度修正）
  - `0`：K 不随温度变化（相当于关闭温度修正）
- `hasGas` (必需)：是否涉及气体
- `gasSpecies` (可选)：气体物质列表
- `containerType` (必需)：容器类型
  - `"rigid"`: 恒容容器
  - `"flexible"`: 可变容积容器
- `initialTemp` (必需)：初始温度（K）
- `initialPressure` (必需)：初始压强（kPa）
- `initialConcentrations` (必需)：初始浓度（mol/L）

#### difficulty (可选)

难度设置

- `aiLevel` (可选)：AI 难度等级（1-4），默认 2
- `maxRounds` (可选)：最大回合数，默认使用用户设置
- `turnTime` (可选)：回合时间（秒），默认使用用户设置

## 版本兼容性

### 加载规则

1. 应用只加载版本号 ≤ 当前支持版本的 CCB 文件
2. 版本号过高的文件将被拒绝并提示用户更新应用
3. 版本号过低的文件将尝试自动升级

### 自动升级机制

应用提供 `upgradeCCBVersion(data, fromVersion, toVersion)` 函数进行版本转换。

当前版本转换函数占位：

```javascript
function upgradeCCBVersion(data, fromVersion, toVersion) {
  // 占位实现：未来版本迭代时在此添加转换逻辑
  // 例如：
  // if (fromVersion === "1.0.0" && toVersion === "1.1.0") {
  //   // 添加新字段、重命名字段等
  //   data.newField = defaultValue;
  // }
  return data;
}
```

### 如何修改支持的最高版本

修改 `src/js/workshop-manager.js` 中的版本常量：

```javascript
const CCB_FORMAT_VERSION = '1.0.0'; // 修改此处
```

修改后需要同步更新：

1. 此文档中的当前支持版本
2. `package.json` 中的应用版本（若格式有重大变更）
3. 实现对应的升级转换函数

## 验证规则

文件加载时将进行以下验证：

1. JSON 格式有效性
2. 必需字段存在性
3. 字段类型正确性
4. 数值范围合理性（温度 > 0，压强 > 0 等）
5. 化学方程式平衡性（系数合理）
6. 浓度非负

验证失败的文件将被拒绝并显示错误信息。

## 示例文件

见 `examples/sample-level.ccb`

## 更新日志

### v1.0.0 (2025-12-17)

- 初始版本规范
- 定义基本字段结构
- 建立版本升级机制
